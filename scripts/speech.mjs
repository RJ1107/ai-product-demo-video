import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.cwd();
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8'));
const args=process.argv.slice(2);
if(args.length && !(args.length===2 && args[0]==='--audio-dir'))throw new Error('Use node speech.mjs [--audio-dir DIRECTORY]');
const audioDir=args[0]?path.resolve(args[1]):null;
const key=process.env.DEMO_TTS_API_KEY,model=process.env.DEMO_TTS_MODEL,voice=process.env.DEMO_TTS_VOICE;
const endpoint=process.env.DEMO_TTS_URL||'https://openrouter.ai/api/v1/audio/speech';
if(!audioDir && (!key||!model||!voice))throw new Error('Configure DEMO_TTS_API_KEY, DEMO_TTS_MODEL and DEMO_TTS_VOICE in .env, or use --audio-dir. No paid request was made.');
if(!audioDir && new URL(endpoint).protocol!=='https:')throw new Error('TTS credentials may only be sent to an HTTPS endpoint.');
const dir=path.join(root,'build','speech');fs.mkdirSync(dir,{recursive:true});const clips=[];
for(const scene of plan.scenes){
 if(!/^[a-z0-9-]+$/.test(scene.id))throw new Error('Use lowercase ASCII scene IDs.');
 for(const [index,text] of (scene.sentences||[]).entries()){
  if(typeof text!=='string'||!text.trim())throw new Error('Each narration sentence must contain text.');
  const name=`${scene.id}-${index}`;
  let file;
  if(audioDir){
   const source=['.wav','.mp3','.m4a','.ogg'].map(ext=>path.join(audioDir,name+ext)).find(p=>fs.existsSync(p));
   if(!source)throw new Error(`Missing supplied narration clip: ${name}`);
   file=path.join(dir,name+path.extname(source));if(path.resolve(file)!==path.resolve(source))fs.copyFileSync(source,file);
  }else{
   file=path.join(dir,name+'.mp3');const meta=path.join(dir,name+'.json');
   const hash=createHash('sha256').update(JSON.stringify({endpoint,model,voice,text})).digest('hex');
   const cached=fs.existsSync(meta)&&JSON.parse(fs.readFileSync(meta,'utf8')).hash===hash&&fs.existsSync(file);
   if(!cached){
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,voice,input:text,response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`TTS request failed (HTTP ${response.status}). Check provider access, model and voice. Credentials and response body were not logged.`);
    if(!response.headers.get('content-type')?.startsWith('audio/'))throw new Error('TTS response was not audio.');
    fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));fs.writeFileSync(meta,JSON.stringify({hash,model,voice}));
   }
  }
  clips.push({sceneId:scene.id,index,text,file:path.relative(root,file).replaceAll('\\','/')});
 }
 console.log(`Narration prepared: ${scene.id}`);
}
fs.writeFileSync(path.join(root,'build','speech.json'),JSON.stringify({source:audioDir?'supplied audio':'configured TTS',clips},null,2));
