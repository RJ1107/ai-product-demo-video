import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {performance} from 'node:perf_hooks';

// Browser recordings do not include the system cursor. This draws one in the page so viewers can follow
// the real pointer; it sits in the top layer so modal dialogs do not cover it.
const pointerOverlay=`(()=>{
 if(window.top!==window)return;
 const add=()=>{
  if(document.getElementById('__demo_pointer'))return;
  const dot=document.createElement('div');dot.id='__demo_pointer';dot.setAttribute('aria-hidden','true');
  Object.assign(dot.style,{position:'fixed',inset:'auto',left:'0',top:'0',width:'22px',height:'22px',margin:'-11px 0 0 -11px',padding:'0',overflow:'visible',borderRadius:'50%',border:'2px solid rgba(255,255,255,.95)',background:'rgba(64,160,255,.35)',boxShadow:'0 0 0 1px rgba(0,0,0,.4),0 2px 12px rgba(0,0,0,.4)',pointerEvents:'none',zIndex:'2147483647',transition:'background .12s,width .12s,height .12s,margin .12s',transform:'translate(-100px,-100px)'});
  document.documentElement.appendChild(dot);
  let modals=-1;
  const lift=()=>{const count=document.querySelectorAll(':modal').length;if(count===modals)return;modals=count;try{dot.popover='manual';if(dot.matches(':popover-open'))dot.hidePopover();dot.showPopover();}catch{}};
  const press=down=>Object.assign(dot.style,down?{background:'rgba(64,160,255,.85)',width:'16px',height:'16px',margin:'-8px 0 0 -8px'}:{background:'rgba(64,160,255,.35)',width:'22px',height:'22px',margin:'-11px 0 0 -11px'});
  addEventListener('mousemove',e=>{dot.style.transform='translate('+e.clientX+'px,'+e.clientY+'px)';lift();},true);
  addEventListener('mousedown',()=>press(true),true);
  addEventListener('mouseup',()=>press(false),true);
  setInterval(lift,150);lift();
 };
 document.readyState==='loading'?addEventListener('DOMContentLoaded',add):add();
})()`;

export async function recordDemo(scenario,{project=process.cwd()}={}){
 const root=path.resolve(project),build=path.join(root,'build');fs.mkdirSync(build,{recursive:true});
 const plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8'));
 const require=createRequire(process.env.PLAYWRIGHT_PACKAGE||path.join(root,'package.json'));
 const {chromium}=require('playwright');
 const viewport=plan.viewport||{width:1920,height:1080};
 const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{})});
 const context=await browser.newContext({viewport,locale:'en-US',recordVideo:{dir:path.join(build,'raw'),size:viewport},...(plan.storageState?{storageState:path.resolve(root,plan.storageState)}:{})});
 if(plan.pointer!==false)await context.addInitScript(pointerOverlay);
 const epoch=performance.now();const page=await context.newPage();const video=page.video();const scenes=[],errors=[];let complete=false;
 page.on('pageerror',e=>errors.push(e.message));
 page.setDefaultTimeout(20000);
 // Glide to a target at a readable speed before acting on it, instead of teleporting the pointer.
 let at={x:viewport.width/2,y:viewport.height/2};
 const pointer={
  async move(target){
   const locator=typeof target==='string'?page.locator(target):target;
   await locator.scrollIntoViewIfNeeded();
   const box=await locator.boundingBox();
   if(!box)throw new Error('Pointer target is not visible.');
   const to={x:box.x+box.width/2,y:box.y+box.height/2};
   const steps=Math.max(12,Math.round(Math.hypot(to.x-at.x,to.y-at.y)/22));
   for(let i=1;i<=steps;i++){const t=i/steps,e=t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2;await page.mouse.move(at.x+(to.x-at.x)*e,at.y+(to.y-at.y)*e);await page.waitForTimeout(14);}
   at=to;await page.waitForTimeout(180);
  },
  async click(target){await pointer.move(target);await page.mouse.down();await page.waitForTimeout(90);await page.mouse.up();await page.waitForTimeout(250);}
 };
 try{
  await page.goto(plan.baseUrl);
  await page.mouse.move(at.x,at.y);
  await page.waitForTimeout(500);
  await scenario({page,context,plan,pointer,async scene(id,action){
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
