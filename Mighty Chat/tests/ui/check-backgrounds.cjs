const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Runs in a fresh browser profile: no live characters, keys, preferences, or
// native file dialogs are touched. Native import is represented by its callback;
// the macOS URL scheme and image conversion are checked by native verification.
const source = path.resolve(__dirname, '../../Sources');
const output = path.resolve(__dirname, '../../build/background-ui-review');

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({ headless: true, executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const context = await browser.newContext({ viewport: { width: 1220, height: 720 }, deviceScaleFactor: 2 });
  const errors = [];
  try {
    await context.route(/^https?:/, route => route.abort());
    await context.addInitScript(() => {
      window.nativeMessages = [];
      window.webkit = { messageHandlers: { companion: { postMessage: message => nativeMessages.push(message) } } };
    });
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(pathToFileURL(path.join(source, 'index.html')).href);
    await page.waitForFunction(() => typeof window.mightyBackgroundState === 'function');

    const imageLoaded = () => page.waitForFunction(() => {
      const image = document.getElementById('homeBackground');
      return image?.complete && image.naturalWidth > 0;
    });
    const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('mightyHomeBackgroundState')));
    const selection = id => page.locator(`.background-choice[data-background-id="${id}"]`);
    const screenshot = name => page.screenshot({ path: path.join(output, `${name}.png`) });

    await imageLoaded();
    const presets = await page.evaluate(() => window.MIGHTY_BACKGROUNDS);
    assert.equal(presets.length, 6, 'all supplied backgrounds are available');
    assert.equal(await page.locator('#homeView > *').count(), 1, 'Home contains only the background');
    assert.equal(await page.locator('#homeView').innerText(), '', 'Home has no greeting or labels');
    assert.equal(await page.locator('#greeting,#homeHint,#firstCharacter,.home-talk').count(), 0, 'old Home content is removed');
    assert.equal(await page.locator('#conversation > .window-actions').isVisible(), false, 'Home has no floating view controls');
    assert.equal(await page.locator('#conversation > .header-shade').isVisible(), false, 'Home image has no header shade');
    const homeBounds = await page.locator('#homeBackground').boundingBox();
    const mainBounds = await page.locator('#conversation').boundingBox();
    assert.ok(['x', 'y', 'width', 'height'].every(key => Math.abs(homeBounds[key] - mainBounds[key]) <= 1), 'background covers the entire right pane');
    assert.equal(await page.locator('#homeBackground').evaluate(image => getComputedStyle(image).objectFit), 'cover', 'background fills without distortion');
    await screenshot('home-default');

    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.locator('#settingsNav').getByRole('button', { name: 'Background', exact: true }).click();
    assert.equal(await page.locator('#settingsContent h1').innerText(), 'Background');
    assert.equal(await page.locator('.background-choice').count(), presets.length);
    assert.equal(await page.getByRole('button', { name: 'Add background', exact: true }).isVisible(), true);
    await selection(presets[1].id).click();
    assert.equal(await selection(presets[1].id).getAttribute('aria-pressed'), 'true');
    assert.equal((await state()).selectedId, presets[1].id);
    assert.deepEqual(await page.evaluate(() => nativeMessages.filter(message => message.action === 'selectHomeBackground').at(-1)), { action: 'selectHomeBackground', id: presets[1].id });
    await screenshot('settings-background');

    // Reloading the WebView preserves the selected preset before native state arrives.
    await page.reload();
    await imageLoaded();
    assert.equal((await state()).selectedId, presets[1].id);
    assert.ok((await page.locator('#homeBackground').getAttribute('src')).includes(presets[1].id));
    await page.evaluate(() => openSettings('Background'));
    assert.equal(await selection(presets[1].id).getAttribute('aria-pressed'), 'true');
    const beforeCancel = await state();
    await page.getByRole('button', { name: 'Add background', exact: true }).click();
    assert.equal(await page.evaluate(() => nativeMessages.at(-1).action), 'importHomeBackground');
    await page.evaluate(value => mightyBackgroundState(value), beforeCancel);
    assert.deepEqual(await state(), beforeCancel, 'cancelling import keeps the current selection and library');

    const custom = {
      id: 'custom-11111111-2222-4333-8444-555555555555',
      name: "QA's custom & sky",
      url: 'mighty-background://image/custom-11111111-2222-4333-8444-555555555555.jpg',
      thumbnail: 'mighty-background://image/custom-11111111-2222-4333-8444-555555555555-thumb.jpg'
    };
    await page.evaluate(value => mightyBackgroundState(value), { selectedId: custom.id, custom: [custom] });
    assert.equal(await selection(custom.id).getAttribute('aria-pressed'), 'true', 'native import selects the new image');
    assert.equal((await state()).selectedId, custom.id);
    assert.ok((await selection(custom.id).innerText()).includes(custom.name), 'file names remain literal text');
    await selection(presets[2].id).click();
    await selection(custom.id).click();
    assert.equal(await page.evaluate(() => nativeMessages.filter(message => message.action === 'selectHomeBackground').at(-1).id), custom.id, 'custom selection reaches native persistence');
    await page.evaluate(id => removeHomeBackground(id), custom.id);
    assert.deepEqual(await page.evaluate(() => nativeMessages.filter(message => message.action === 'removeHomeBackground').at(-1)), { action: 'removeHomeBackground', id: custom.id });
    await page.evaluate(value => mightyBackgroundState(value), { selectedId: presets[0].id, custom: [] });
    assert.equal(await selection(custom.id).count(), 0);
    assert.equal(await selection(presets[0].id).getAttribute('aria-pressed'), 'true');

    // Background is scoped to Home. Chat drafts, settings, and suggestions continue
    // to use their existing surfaces and keep the selected image for the next visit.
    await page.evaluate(() => {
      contacts = [{ id: 'background-fixture', name: 'QA Companion', color: '#bdd2c8', profile: { speak: false } }];
      saved = {};
      closeCharacterSettings();
      selectChat(0);
      showTextMode();
    });
    assert.equal(await page.locator('#homeView').isVisible(), false);
    assert.equal(await page.locator('#conversation > .window-actions').isVisible(), true, 'chat keeps its existing controls');
    await page.locator('#message').fill('This draft stays in its conversation.');
    await page.locator('#message').dispatchEvent('input');
    await screenshot('chat-no-background');
    await page.evaluate(() => openSettings('Background'));
    await selection(presets[3].id).click();
    await page.evaluate(() => closeCharacterSettings());
    assert.equal(await page.locator('#homeView').isVisible(), false, 'closing settings returns to chat without the image');
    assert.equal(await page.locator('#message').inputValue(), 'This draft stays in its conversation.');
    await page.evaluate(() => showSuggestions());
    assert.equal(await page.locator('#homeView').isVisible(), false, 'suggestions never shows the Home background');
    await page.getByRole('button', { name: 'Home', exact: true }).click();
    await imageLoaded();
    assert.equal(await page.locator('#homeView').isVisible(), true);
    assert.ok((await page.locator('#homeBackground').getAttribute('src')).includes(presets[3].id));

    // Exercise every image and the supported minimum window size; protect the
    // sidebar from cropping/overflow introduced by the new thumbnail grid.
    await page.setViewportSize({ width: 880, height: 600 });
    await page.evaluate(() => openSettings('Background'));
    for (const preset of presets) {
      await selection(preset.id).click();
      await imageLoaded();
      assert.equal(await selection(preset.id).getAttribute('aria-pressed'), 'true');
    }
    const overflow = await page.locator('.background-choice,.settings-content').evaluateAll(elements => elements.filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.left < 0 || rect.right > innerWidth + 1;
    }).map(element => element.className));
    assert.deepEqual(overflow, [], 'Background controls fit the minimum window width');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await screenshot('settings-minimum');
    await page.evaluate(() => { closeCharacterSettings(); showHome(); });
    await screenshot('home-minimum');
    assert.deepEqual(errors, [], 'navigation and removed greeting references produce no JavaScript errors');
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ presets: presets.map(({ id, name }) => ({ id, name })), homeBounds, mainBounds, checks: ['clean edge-to-edge Home', 'preset selection and reload persistence', 'native import callback and cancel', 'custom selection and removal', 'chat/settings/suggestions isolation', 'conversation draft retained', 'all images decode', 'minimum window layout'], errors }, null, 2));
    console.log('PASS: clean Home, six backgrounds, persisted selection, native import/cancel/remove callbacks, Home-only isolation, retained chat draft, image decoding, minimum size, and no runtime errors.');
    console.log('Screenshots and report: ' + output);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
