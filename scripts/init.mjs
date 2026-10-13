import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const skillRoot=path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args=process.argv.slice(2);
if(args.length!==2||args[0]!=='--out'){console.error('Use: node scripts/init.mjs --out DIRECTORY');process.exit(1);}
const out=path.resolve(args[1]);
if(fs.existsSync(out)&&fs.readdirSync(out).length){console.error('Output directory must be empty. Existing recordings were not changed.');process.exit(1);}
fs.mkdirSync(out,{recursive:true});
for(const file of ['capture.mjs','speech.mjs','compose.py','preview.py'])fs.copyFileSync(path.join(skillRoot,'scripts',file),path.join(out,file));
fs.cpSync(path.join(skillRoot,'assets','recording-template'),out,{recursive:true});
console.log(JSON.stringify({project:out,next:'Inspect the real application, adapt plan.json and record.mjs, then install Playwright if needed.'},null,2));
