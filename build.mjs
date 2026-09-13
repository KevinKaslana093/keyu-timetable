import {build} from 'esbuild';
import {mkdir,cp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
// Resolve only project files; do not scan unrelated parent directories for configs.
const localFiles={name:'project-files',setup(b){b.onResolve({filter:/.*/},args=>{let file;if(args.kind==='entry-point')file=path.resolve(args.path);else if(args.path.startsWith('.'))file=path.resolve(args.resolveDir,args.path);else file=createRequire(path.join(args.resolveDir,'package.json')).resolve(args.path==='fflate'?'fflate/browser':args.path);return {path:file,namespace:'project'};});b.onLoad({filter:/.*/,namespace:'project'},async args=>({contents:await readFile(args.path,'utf8'),loader:args.path.endsWith('.json')?'json':'js',resolveDir:path.dirname(args.path)}));}};
const outputDir=path.resolve('dist');
if(path.dirname(outputDir)!==process.cwd()||path.basename(outputDir)!=='dist')throw Error('Invalid generated output directory');
await rm(outputDir,{recursive:true,force:true});
await mkdir(outputDir,{recursive:true});
await build({entryPoints:['web/app.js'],bundle:true,format:'esm',splitting:true,minify:true,outdir:'dist',target:'es2022',chunkNames:'chunk-[hash]',plugins:[localFiles]});
for(const f of ['index.html','style.css','icon.svg','manifest.json','icon-192.png','icon-512.png'])await cp('web/'+f,'dist/'+f);
await cp('THIRD_PARTY_NOTICES.md','dist/THIRD_PARTY_NOTICES.md');
await cp('licenses','dist/licenses',{recursive:true});
await cp('node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs','dist/pdf.worker.min.mjs');
for(const folder of ['cmaps','standard_fonts'])await cp('node_modules/pdfjs-dist/'+folder,'dist/'+folder,{recursive:true});
async function walk(dir,prefix=''){let out=[];for(const d of await readdir(dir,{withFileTypes:true})){if(d.isDirectory())out.push(...await walk(dir+'/'+d.name,prefix+d.name+'/'));else if(d.name!=='sw.js')out.push('./'+prefix+d.name);}return out;}
const files=await walk('dist');
await writeFile('dist/sw.js',`const CACHE='keyu-1-${Date.now()}';const FILES=${JSON.stringify(files)};self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES))));self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('keyu-')&&k!==CACHE).map(k=>caches.delete(k))))));self.addEventListener('fetch',e=>{if(e.request.method==='GET'&&new URL(e.request.url).origin===self.location.origin)e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});`);
console.log('Built offline app:',files.length,'assets');
