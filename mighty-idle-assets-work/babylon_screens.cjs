const { chromium }=require('<home>/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--use-gl=angle','--use-angle=swiftshader','--enable-webgl','--ignore-gpu-blocklist']});
 const page=await browser.newPage({viewport:{width:800,height:1000}});
 page.on('console',m=>console.log(m.type(),m.text()));page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
 for(const [suffix,query] of [['default',''],['turned','?turn=1']]){
  await page.goto('http://127.0.0.1:8877/mighty-idle-assets-work/babylon-check.html'+query);
  await page.waitForFunction(()=>window.ready,{timeout:60000});
  await page.screenshot({path:__dirname+'/babylon-hailey-'+suffix+'.png'});
  fs.writeFileSync(__dirname+'/babylon-'+suffix+'-report.json',JSON.stringify(await page.evaluate(()=>window.report),null,2));
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
