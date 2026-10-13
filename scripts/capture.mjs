import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';

export async function recordDemo(scenario,{project=process.cwd()}={}){
 const root=path.resolve(project),build=path.join(root,'build');fs.mkdirSync(build,{recursive:true});
 const plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8'));
 const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||path.join(root,'package.json'));
 const {chromium}=require('playwright');
 const viewport=plan.viewport||{width:1920,height:1080};
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport,locale:'en-US',recordVideo:{dir:path.join(build,'raw'),size:viewport},...(plan.storageState?{storageState:path.resolve(root,plan.storageState)}:{})});
 const epoch=performance.now();const page=await context.newPage();const video=page.video();const scenes=[],errors=[];let complete=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 try{
  await page.goto(plan.baseUrl);
  await page.waitForTimeout(500);
  await scenario({page,context,plan,async scene(id,action){
   const scenePlan=plan.scenes.find(s=>s.id===id);
   if(!scenePlan)throw new Error(`Scene ${id} is missing from plan.json`);
   if(scenes.some(s=>s.id===id))throw new Error(`Scene ${id} was recorded twice.`);
   if(!/^[a-z0-9-]+$/.test(id))throw new Error('Scene IDs must use lowercase ASCII letters, digits and hyphens.');
   const start=(performance.now()-epoch)/1000;
   await page.waitForTimeout(250);
   await action();
   await page.waitForTimeout(600);
   const elapsed=(performance.now()-epoch)/1000-start;
   if(elapsed<(scenePlan.minSeconds||4))await page.waitForTimeout(((scenePlan.minSeconds||4)-elapsed)*1000);
   await page.screenshot({path:path.join(build,`${id}.png`)});
   scenes.push({id,start,duration:(performance.now()-epoch)/1000-start});
  }});
  if(scenes.length!==plan.scenes.length)throw new Error('Not every planned scene was recorded.');
  complete=true;
 }finally{
  await context.close();
  const raw=await video.path();
  fs.writeFileSync(path.join(build,'recording.json'),JSON.stringify({complete,raw,viewport,scenes,pageErrors:errors,disclosures:plan.disclosures||[],recordedAt:new Date().toISOString()},null,2));
  await browser.close();
 }
 if(errors.length)console.warn(`Recorded with ${errors.length} browser error(s); review build/recording.json before delivery.`);
 console.log('Real footage recorded. Inspect the screenshots and recording before composing.');
}
