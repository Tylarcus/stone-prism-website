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
// Only actual YouTube video IDs become embedded videos; no arbitrary HTML/URLs.
function youtubeVideoId(input){
 if(typeof input!=='string'||!input.trim())return '';
 try{
  const u=new URL(input.trim());
  if(u.protocol!=='https:')return '';
  const host=u.hostname.toLowerCase();let id='';
  if(host==='youtu.be'||host==='www.youtu.be')id=u.pathname.split('/')[1]||'';
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
   if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
   else {const found=u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);id=found?found[1]:''}
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
 }catch(_){return ''}
}
const normalizedYouTube=input=>{
 const id=youtubeVideoId(input);
 return id?'https://www.youtube.com/watch?v='+id:'';
};
const recordings=[],seen=new Set();
for(const item of loadCollection('recordings')){
 if(item.status!=='published')continue;
 if(!validSlug(item.slug))throw Error(`Invalid recording slug ${item._source}`);
 if(seen.has(item.slug))throw Error(`Duplicate recording slug ${item.slug}`);
 seen.add(item.slug);
 if(!['official','demo'].includes(item.kind))throw Error(`Invalid recording category ${item._source}`);
 const tracks=Array.isArray(item.tracks)?item.tracks:[];
 const filteredTracks=tracks.filter(t=>t&&typeof t.title==='string').map((t,i)=>{
   const audio=normalizePath(t.audio_url);
   return {
    title:t.title.trim().slice(0,200),notes:String(t.notes||'').slice(0,1500),
    // Migrate old CMS data safely: a YouTube link in audio_url is a video, never an audio source.
    audio_url:youtubeVideoId(audio)?'':audio,
    youtube_url:normalizedYouTube(t.youtube_url)||normalizedYouTube(t.audio_url),
    number:i+1
   };
  });
 recordings.push({slug:item.slug,title:String(item.title||'').trim().slice(0,200),kind:item.kind,
  release_type:String(item.release_type||'demo').slice(0,60),date:String(item.date||'').slice(0,30),
  description:String(item.description||'').slice(0,5000),artwork:normalizePath(item.artwork),
  uploaded_artwork:normalizePath(item.artwork),artwork_visual:validSlug(item.artwork_visual)?item.artwork_visual:'',
  artwork_custom:false,
  featured:!!item.featured,order:Number(item.order)||1000,tracks:filteredTracks});
}
recordings.sort((a,b)=>(Number(b.featured)-Number(a.featured))||(a.order-b.order)||(b.date||'').localeCompare(a.date||'')||a.title.localeCompare(b.title));
// Category choices are managed as a Pages CMS collection, making artwork's
// Category field a searchable picker instead of a manually typed ID.
// Keep the original list as a read-only fallback for legacy clones/archives.
const visualCategoryFolder=join('content','visual-category-options');
let visualCategories=fs.existsSync(visualCategoryFolder)
 ?loadCollection('visual-category-options')
 :JSON.parse(fs.readFileSync(join('content/visual-categories.json'),'utf8'));
const ids=new Set();visualCategories=visualCategories.filter(x=>{if(!validSlug(x.id)||ids.has(x.id))return false;ids.add(x.id);return true}).map(x=>({id:x.id,label:String(x.label||x.id)}));
const visuals=loadCollection('visuals').filter(x=>x.published===true&&normalizePath(x.image)).map(x=>({
 slug:x.slug,title:String(x.title||'').slice(0,180),description:String(x.description||'').slice(0,1500),
 image:normalizePath(x.image),category:String(x.category||'collage'),order:Number(x.order)||1000,
 featured_home:!!x.featured_home
})).sort((a,b)=>a.order-b.order||a.title.localeCompare(b.title));
for(const v of visuals){if(!ids.has(v.category)){ids.add(v.category);visualCategories.push({id:v.category,label:v.category.replace(/-/g,' ')})}}
// Resolve the recording's optional Visual Archive art only after validating
// that the chosen visual is published and has a safe image. Keep original intact.
for(const rec of recordings){
 const selected=visuals.find(v=>v.slug===rec.artwork_visual);
 if(selected){
  rec.artwork=selected.image;
  rec.artwork_custom=true;
 }
}
// CMS layout defaults are validated to 1–5 per breakpoint. These are site
// defaults, not overrides of an individual visitor's stored grid preference.
const layoutFallback={
 homepage_music:{phone:2,tablet:3,desktop:3},
 homepage_visuals:{phone:3,tablet:4,desktop:5},
 music:{phone:3,tablet:3,desktop:4},
 visuals:{phone:3,tablet:4,desktop:4}
};
const inputLayout=JSON.parse(fs.readFileSync(join('content/layout-defaults.json'),'utf8'));
const layoutDefaults={};
for(const [section,modes] of Object.entries(layoutFallback)){
 layoutDefaults[section]={};
 for(const [mode,fallback] of Object.entries(modes)){
  const value=inputLayout?.[section]?.[mode];
  const number=Number(value);
  layoutDefaults[section][mode]=Number.isInteger(number)&&number>=1&&number<=5?number:fallback;
 }
}
// Ordered homepage music cards edited in Pages CMS. Only published
// recordings and published visuals are allowed into generated public data.
const rawHomeMusic=JSON.parse(fs.readFileSync(join('content/home-music.json'),'utf8'));
if(!Array.isArray(rawHomeMusic))throw Error('Homepage Music must be an array');
const homeMusic=[];
for(const pick of rawHomeMusic){
 if(!pick||typeof pick!=='object'||pick.hidden===true)continue;
 const recordingSlug=typeof pick.recording==='string'?pick.recording.trim():'';
 const visualSlug=typeof pick.visual==='string'?pick.visual.trim():'';
 let kind='',slug='';
 if(recordingSlug&&validSlug(recordingSlug)){
  if(!recordings.some(x=>x.slug===recordingSlug))continue;
  kind='recording';slug=recordingSlug;
 }else if(visualSlug&&validSlug(visualSlug)){
  if(!visuals.some(x=>x.slug===visualSlug))continue;
  kind='visual';slug=visualSlug;
 }else continue;
 // Pages CMS can preserve both a recording and a Visual Archive selection
 // in one card. In that case treat the selected visual as an artwork override
 // (not a second card), unless the explicit override field is populated.
 const coverSelection=typeof pick.artwork_visual_override==='string'&&pick.artwork_visual_override.trim()
  ?pick.artwork_visual_override.trim()
  :kind==='recording'?visualSlug:'';
 homeMusic.push({
  kind,slug,
  artwork_override:visuals.find(v=>v.slug===coverSelection)?.image||'',
  title:String(pick.title||'').slice(0,120).trim(),
  subtitle:String(pick.subtitle||'').slice(0,120).trim()
 });
}
// Ordered HOME visual gallery, independent of the full Visual Archive.
// Bad/draft/missing references never leak into the published homepage.
const rawHomeVisuals=JSON.parse(fs.readFileSync(join('content/home-visuals.json'),'utf8'));
if(!Array.isArray(rawHomeVisuals))throw Error('Homepage Visual Archive must be an array');
const homeVisuals=[],homeVisualSeen=new Set();
for(const pick of rawHomeVisuals){
 if(!pick||pick.hidden===true)continue;
 const slug=typeof pick.visual==='string'?pick.visual.trim():'';
 if(!validSlug(slug)||homeVisualSeen.has(slug))continue;
 const visual=visuals.find(v=>v.slug===slug);
 if(!visual)continue;
 homeVisualSeen.add(slug);
 homeVisuals.push({slug,title:visual.title});
}
// Single-file Pages CMS editor for all general site copy and search metadata.
const siteText=JSON.parse(fs.readFileSync(join('content/site-text.json'),'utf8'));
const content={version:'2.9',recordings,visuals,visualCategories,siteText,homeMusic,homeVisuals,layoutDefaults};
fs.mkdirSync(join('data'),{recursive:true});
const json=JSON.stringify(content).replace(/</g,'\\u003c').replace(/\u2028/g,'\\u2028').replace(/\u2029/g,'\\u2029');
fs.writeFileSync(join('data/site-content.js'),`/* Built from CMS content. Do not hand-edit. */\nwindow.STONE_PRISM_CONTENT=${json};\n`);
console.log(`Stone Prism content: ${recordings.length} published recordings, ${visuals.length} visuals, ${visualCategories.length} categories`);
console.log(`Homepage featured cards: ${homeMusic.length} published selections`);
