import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=process.cwd();
if(fs.existsSync(path.join(root,'.env')))process.loadEnvFile(path.join(root,'.env'));
const plan=JSON.parse(fs.readFileSync(path.join(root,'plan.json'),'utf8'));
const args=process.argv.slice(2);
const usage='Use node speech.mjs [--audio-dir DIRECTORY | --system-voice [NAME]]';
if(args.length && !['--audio-dir','--system-voice'].includes(args[0]))throw new Error(usage);
if(args[0]==='--audio-dir'&&args.length!==2||args.length>2)throw new Error(usage);
const audioDir=args[0]==='--audio-dir'?path.resolve(args[1]):null;
const systemVoice=args[0]==='--system-voice'?(args[1]||''):null;
const key=process.env.DEMO_TTS_API_KEY,model=process.env.DEMO_TTS_MODEL,voice=process.env.DEMO_TTS_VOICE;
const endpoint=process.env.DEMO_TTS_URL||'https://openrouter.ai/api/v1/audio/speech';
const online=!audioDir&&systemVoice===null;
if(online && (!key||!model||!voice))throw new Error('Configure DEMO_TTS_API_KEY, DEMO_TTS_MODEL and DEMO_TTS_VOICE in .env, or use --audio-dir or --system-voice. No paid request was made.');
if(online && new URL(endpoint).protocol!=='https:')throw new Error('TTS credentials may only be sent to an HTTPS endpoint.');

// Free, offline narration from the operating system's own voices. Good for drafts; a neural voice sounds more natural.
function speakLocally(text,file){
 const quiet={stdio:['ignore','ignore','pipe']};
 if(process.platform==='win32'){
  const script="Add-Type -AssemblyName System.Speech;$s=New-Object System.Speech.Synthesis.SpeechSynthesizer;if($env:DEMO_VOICE){$s.SelectVoice($env:DEMO_VOICE)};$s.SetOutputToWaveFile($env:DEMO_OUT);$s.Speak($env:DEMO_TEXT);$s.Dispose()";
  execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{...quiet,env:{...process.env,DEMO_VOICE:systemVoice,DEMO_OUT:file,DEMO_TEXT:text}});
 }else if(process.platform==='darwin')execFileSync('say',[...(systemVoice?['-v',systemVoice]:[]),'-o',file,'--',text],quiet);
 else execFileSync('espeak-ng',[...(systemVoice?['-v',systemVoice]:[]),'-w',file,'--',text],quiet);
 if(!fs.existsSync(file)||fs.statSync(file).size<1000)throw new Error('The system voice produced no audio.');
}

const dir=path.join(root,'build','speech');fs.mkdirSync(dir,{recursive:true});const clips=[];
for(const scene of plan.scenes){
 if(!/^[a-z0-9-]+$/.test(scene.id))throw new Error('Use lowercase ASCII scene IDs.');
 for(const [index,text] of (scene.sentences||[]).entries()){
  if(typeof text!=='string'||!text.trim())throw new Error('Each narration sentence must contain text.');
  const name=`${scene.id}-${index}`;
  let file;
  if(audioDir){
   const source=['.wav','.mp3','.m4a','.ogg','.aiff'].map(ext=>path.join(audioDir,name+ext)).find(p=>fs.existsSync(p));
   if(!source)throw new Error(`Missing supplied narration clip: ${name}`);
   file=path.join(dir,name+path.extname(source));if(path.resolve(file)!==path.resolve(source))fs.copyFileSync(source,file);
  }else{
   file=path.join(dir,name+(online?'.mp3':process.platform==='darwin'?'.aiff':'.wav'));const meta=path.join(dir,name+'.json');
   const hash=createHash('sha256').update(JSON.stringify(online?{endpoint,model,voice,text}:{system:process.platform,voice:systemVoice,text})).digest('hex');
   const cached=fs.existsSync(meta)&&JSON.parse(fs.readFileSync(meta,'utf8')).hash===hash&&fs.existsSync(file);
   if(!cached&&online){
    const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${key}`},body:JSON.stringify({model,voice,input:text,response_format:'mp3'}),signal:AbortSignal.timeout(90000)});
    if(!response.ok)throw new Error(`TTS request failed (HTTP ${response.status}). Check provider access, model and voice. Credentials and response body were not logged.`);
    if(!response.headers.get('content-type')?.startsWith('audio/'))throw new Error('TTS response was not audio.');
    fs.writeFileSync(file,Buffer.from(await response.arrayBuffer()));fs.writeFileSync(meta,JSON.stringify({hash,model,voice}));
   }else if(!cached){
    try{speakLocally(text,file);}
    catch(error){throw new Error(`System voice failed: ${String(error.stderr||error.message).trim().split('\n')[0]} Windows uses installed SAPI voices, macOS uses say, Linux needs espeak-ng.`);}
    fs.writeFileSync(meta,JSON.stringify({hash,voice:systemVoice||'default'}));
   }
  }
  clips.push({sceneId:scene.id,index,text,file:path.relative(root,file).replaceAll('\\','/')});
 }
 console.log(`Narration prepared: ${scene.id}`);
}
const source=audioDir?'supplied audio':online?'configured TTS':`system voice (${systemVoice||'default'})`;
fs.writeFileSync(path.join(root,'build','speech.json'),JSON.stringify({source,clips},null,2));
