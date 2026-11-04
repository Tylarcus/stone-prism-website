import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const join=(...p)=>path.join(root,...p);
function loadCollection(folder){
 const d=join('content',folder); if(!fs.existsSync(d))return [];
 return fs.readdirSync(d).filter(n=>n.endsWith('.json')).map(name=>{
   const data=JSON.parse(fs.readFileSync(path.join(d,name),'utf8'));
   return {...data,_source:name};
 });
}
function validSlug(s){return typeof s==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s)}
function validUrl(s){return typeof s==='string' && (/^https?:\/\//i.test(s)||/^(assets|media|audio)\/[a-z0-9./_%() -]+$/i.test(s));}
// Strip unsafe/incompatible references. Store images from Pages CMS as a local
// relative URL so GitHub Pages project subpaths and file:// previews both work.
function normalizePath(input){
 if(typeof input!=='string')return '';
 const value=input.trim();
 if(/^\/(assets|media|audio)\//i.test(value))return value.slice(1);
 return validUrl(value)?value:'';
}
const recordings=[],seen=new Set();
for(const item of loadCollection('recordings')){
 if(item.status!=='published')continue;
 if(!validSlug(item.slug))throw Error(`Invalid recording slug ${item._source}`);
 if(seen.has(item.slug))throw Error(`Duplicate recording slug ${item.slug}`);
 seen.add(item.slug);
 if(!['official','demo'].includes(item.kind))throw Error(`Invalid recording category ${item._source}`);
 const tracks=Array.isArray(item.tracks)?item.tracks:[];
 const filteredTracks=tracks.filter(t=>t&&typeof t.title==='string').map((t,i)=>({
   title:t.title.trim().slice(0,200),notes:String(t.notes||'').slice(0,1500),audio_url:normalizePath(t.audio_url),number:i+1
 }));
 recordings.push({slug:item.slug,title:String(item.title||'').trim().slice(0,200),kind:item.kind,
  release_type:String(item.release_type||'demo').slice(0,60),date:String(item.date||'').slice(0,30),
  description:String(item.description||'').slice(0,5000),artwork:normalizePath(item.artwork),
  featured:!!item.featured,order:Number(item.order)||1000,tracks:filteredTracks});
}
recordings.sort((a,b)=>(Number(b.featured)-Number(a.featured))||(a.order-b.order)||(b.date||'').localeCompare(a.date||'')||a.title.localeCompare(b.title));
let visualCategories=JSON.parse(fs.readFileSync(join('content/visual-categories.json'),'utf8'));
const ids=new Set();visualCategories=visualCategories.filter(x=>{if(!validSlug(x.id)||ids.has(x.id))return false;ids.add(x.id);return true}).map(x=>({id:x.id,label:String(x.label||x.id)}));
const visuals=loadCollection('visuals').filter(x=>x.published===true&&normalizePath(x.image)).map(x=>({
 slug:x.slug,title:String(x.title||'').slice(0,180),description:String(x.description||'').slice(0,1500),
 image:normalizePath(x.image),category:String(x.category||'collage'),order:Number(x.order)||1000,
 featured_home:!!x.featured_home
})).sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title));
for(const v of visuals){if(!ids.has(v.category)){ids.add(v.category);visualCategories.push({id:v.category,label:v.category.replace(/-/g,' ')})}}
// Single-file Pages CMS editor for all general site copy and search metadata.
const siteText=JSON.parse(fs.readFileSync(join('content/site-text.json'),'utf8'));
const content={version:'2.3',recordings,visuals,visualCategories,siteText};
fs.mkdirSync(join('data'),{recursive:true});
const json=JSON.stringify(content).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
fs.writeFileSync(join('data/site-content.js'),`/* Built from CMS content. Do not hand-edit. */\nwindow.STONE_PRISM_CONTENT=${json};\n`);
console.log(`Stone Prism content: ${recordings.length} published recordings, ${visuals.length} visuals, ${visualCategories.length} categories`);
