const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");

const input = path.resolve(process.argv[2] || "reference.mp4");
const outputDir = path.resolve(process.argv[3] || "frames");

if (!fs.existsSync(input)) {
  throw new Error(`Missing input video: ${input}`);
}

fs.mkdirSync(outputDir, { recursive: true });

function savePng(dataUrl, filePath) {
  const comma = dataUrl.indexOf(",");
  const buffer = Buffer.from(dataUrl.slice(comma + 1), "base64");
  fs.writeFileSync(filePath, buffer);
}

(async () => {
  const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const launchOptions = fs.existsSync(chromePath)
    ? { headless: true, executablePath: chromePath }
    : { headless: true };
  const browser = await chromium.launch(launchOptions);
  const page = await browser.newPage();

  await page.exposeFunction("saveFrame", (index, mediaTime, dataUrl) => {
    const name = `frame_${String(index).padStart(5, "0")}.png`;
    savePng(dataUrl, path.join(outputDir, name));
    if (index % 25 === 0) {
      process.stdout.write(`saved ${index} frames, latest at ${mediaTime.toFixed(3)}s\n`);
    }
  });

  const result = await page.evaluate(async (src) => {
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";
    video.style.display = "none";
    document.body.appendChild(video);

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = resolve;
      video.onerror = () => reject(new Error("Video failed to load"));
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    let index = 0;
    let lastMediaTime = -1;

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("Timed out while extracting frames")), 120000);

      const capture = (_now, metadata) => {
        if (metadata.mediaTime !== lastMediaTime) {
          lastMediaTime = metadata.mediaTime;
          index += 1;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          window.saveFrame(index, metadata.mediaTime, canvas.toDataURL("image/png"));
        }
        if (!video.ended) {
          video.requestVideoFrameCallback(capture);
        }
      };

      video.requestVideoFrameCallback(capture);
      video.onended = () => {
        clearTimeout(timeout);
        resolve();
      };
      video.play().catch(reject);
    });

    return {
      frames: index,
      duration: video.duration,
      width: video.videoWidth,
      height: video.videoHeight,
    };
  }, `file://${input}`);

  await browser.close();
  fs.writeFileSync(path.join(outputDir, "frames_manifest.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
})();
