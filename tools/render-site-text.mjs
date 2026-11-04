// Apply CMS text at build time so page copy and SEO are present without JavaScript.
// Source HTML is never modified; GitHub Actions invokes this on the staged _site.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.resolve(process.argv[2]||path.join(root,'_site'));
const text=JSON.parse(fs.readFileSync(path.join(root,'content/site-text.json'),'utf8'));
const lookup=key=>key.split('.').reduce((v,k)=>v&&typeof v==='object'&&Object.hasOwn(v,k)?v[k]:null,text);
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
for(const [file,page] of [['index.html','home'],['music.html','music'],['visuals.html','visuals'],['recording.html','recording']]){
 const filename=path.join(dir,file);
 let html=fs.readFileSync(filename,'utf8');
 html=html.replace(/(<([a-z][a-z0-9-]*)\b[^>]*\bdata-cms-text="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,(whole,open,tag,key,old,close)=>{
  const value=lookup(key);return typeof value==='string'?open+esc(value)+close:whole;
 });
 const title=lookup(`seo.${page}.title`),description=lookup(`seo.${page}.description`);
 if(typeof title==='string'&&title)html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
 if(typeof description==='string')html=html.replace(/<meta\b[^>]*\bname="description"[^>]*>/i,tag=>tag.replace(/\bcontent="[^"]*"/,`content="${esc(description)}"`));
 fs.writeFileSync(filename,html);
}
console.log('Stone Prism website text and search metadata rendered into static pages');
