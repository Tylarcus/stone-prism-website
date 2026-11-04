/* Stone Prism V2.3 — content and interactions, independent of V2.2 visuals */
(()=>{
'use strict';
const data=window.STONE_PRISM_CONTENT||{recordings:[],visuals:[],visualCategories:[]};
let activeFilter='all', visualFilter='all';
const $=sel=>document.querySelector(sel);
const el=(name,classes,text)=>{const node=document.createElement(name);if(classes)node.className=classes;if(text!==undefined)node.textContent=String(text);return node};
const attr=(node,props)=>{for(const [k,v] of Object.entries(props))node.setAttribute(k,String(v));return node};
const url=src=>typeof src==='string'&&/^(https?:\/\/|assets\/|media\/|audio\/)/i.test(src)?(window.STONE_PRISM_PREVIEW_ASSETS?.[src]||src):'';
const recordingLink=slug=>`recording.html?slug=${encodeURIComponent(slug)}`;
const prettyType=rec=>rec.kind==='demo'?'Website-exclusive demo':({single:'Single',ep:'EP',album:'Album',collection:'Collection',demo:'Demo'}[rec.release_type]||'Official release');
// Website-wide text and contact info from the Pages CMS JSON file.
// textContent (never innerHTML) prevents CMS-provided text from injecting markup.
function cmsText(path){
 let value=data.siteText;
 for(const part of path.split('.')){
  if(!value||typeof value!=='object'||!Object.prototype.hasOwnProperty.call(value,part))return null;
  value=value[part];
 }
 return typeof value==='string'?value:null;
}
function initSiteText(){
 document.querySelectorAll('[data-cms-text]').forEach(node=>{
  const value=cmsText(node.dataset.cmsText||'');
  if(value!==null)node.textContent=value;
 });
 const page=document.body.dataset.cmsPage;
 if(page){
  const title=cmsText('seo.'+page+'.title'),description=cmsText('seo.'+page+'.description');
  if(title)document.title=title;
  const meta=document.querySelector('meta[name="description"]');
  if(meta&&description!==null)meta.setAttribute('content',description);
 }
 const contact=data.siteText?.contact||{};
 const links=[];
 const email=typeof contact.email==='string'?contact.email.trim():'';
 if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))links.push(['Email','mailto:'+encodeURIComponent(email)]);
 for(const [key,label] of [['instagram','Instagram'],['youtube','YouTube'],['bandcamp','Bandcamp']]){
  const raw=contact[key];if(typeof raw!=='string'||!raw.trim())continue;
  try{const dest=new URL(raw.trim());if(dest.protocol==='https:')links.push([label,dest.href])}catch(_){/* Ignore invalid URLs. */}
 }
 document.querySelectorAll('.footer-message').forEach(footer=>{
  let holder=footer.querySelector('.cms-contact-links');
  if(holder)holder.remove();
  if(!links.length)return;
  holder=el('div','cms-contact-links');
  for(const [label,href] of links){
   const anchor=el('a','',label);anchor.href=href;
   if(!href.startsWith('mailto:')){anchor.target='_blank';anchor.rel='noopener noreferrer'}
   holder.append(anchor);
  }
  footer.append(holder);
 });
}
// Render CMS-selected homepage music cards, preserving the original V2.5
// three-across layout. The ordered top-level JSON array controls card order.
function initHomepageMusic(){
 const grid=$('.releases .release-grid');
 if(!grid||!Array.isArray(data.homeMusic))return;
 const items=[];
 for(const pick of data.homeMusic){
  if(!pick||!pick.slug)continue;
  const isRecording=pick.kind==='recording';
  const source=isRecording
   ?data.recordings.find(r=>r.slug===pick.slug)
   :data.visuals.find(v=>v.slug===pick.slug);
  if(!source)continue;
  const title=pick.title||source.title||'Stone Prism';
  const subtitle=pick.subtitle||(isRecording?prettyType(source):'Artwork archive');
  const image=isRecording?source.artwork:source.image;
  const link=el('a','release-card');
  let playable=false;
  if(isRecording){
   const first=(source.tracks||[]).findIndex(t=>url(t.audio_url)&&!/(?:youtube\.com|youtu\.be)\//i.test(t.audio_url));
   playable=first>=0;
   link.href=recordingLink(source.slug);
   if(playable){
    link.dataset.spPlay=source.slug+':'+first;
    link.setAttribute('aria-label','Play '+title+' on Stone Prism');
   }else link.setAttribute('aria-label','Open '+title+' details');
  }else{
   link.href='visuals.html';
   if(url(image)){
    link.dataset.image=url(image);
    link.dataset.title=title+' — artwork';
   }
   link.setAttribute('aria-label','View '+title+' artwork');
  }
  const art=el('div','release-art');
  if(url(image)){
   const pic=el('img');pic.src=url(image);pic.alt=title+' artwork';pic.loading='lazy';
   art.append(pic);
  }else art.append(el('div','recording-cover-placeholder','SP'));
  const foot=el('div','release-foot');
  const text=el('div');text.append(el('div','release-name',title),el('div','release-sub',subtitle));
  const action=el('span','play-circle'+(playable?' sp-home-play':''),playable?'▶':'↗');
  action.setAttribute('aria-hidden','true');
  foot.append(text,action);link.append(art,foot);items.push(link);
 }
 grid.replaceChildren(...items);
}
function initNavigation(){
 const nav=$('#mainNav'),menu=$('#menuBtn');if(!nav||!menu)return;
 menu.onclick=()=>{const o=nav.classList.toggle('open');menu.setAttribute('aria-expanded',String(o))};
 nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{nav.classList.remove('open');menu.setAttribute('aria-expanded','false')}));
}
function initDialog(){
 const dialog=$('#artDialog');if(!dialog)return;
 // Delegate to dynamic CMS items too; no direct download link is created.
 if(!document.body.dataset.spDialogBound){
  document.body.dataset.spDialogBound='true';
  document.addEventListener('click',e=>{
   const target=e.target.closest('[data-image]');if(!target)return;
   const d=$('#artDialog');if(!d)return;
   e.preventDefault();const picture=$('#modalImg'),caption=$('#modalTitle');
   const src=url(target.dataset.image||'');if(!src)return;
   picture.src=src;picture.alt=target.dataset.title||'Stone Prism artwork';
   caption.textContent=target.dataset.title||'Stone Prism artwork';
   d.showModal();
  });
 }
 const close=$('#closeModal');if(close)close.onclick=()=>dialog.close();
 dialog.onclick=e=>{if(e.target===dialog)dialog.close()};
}
function makeVisual(v,mode='gallery'){
 if(mode==='home'){
  const b=el('button','archive-btn');b.type='button';b.dataset.image=v.image;b.dataset.title=v.title;b.setAttribute('aria-label',`Enlarge ${v.title}`);
  const im=el('img');attr(im,{src:url(v.image),alt:v.title,loading:'lazy'});b.append(im);return b;
 }
 const article=el('article','art-entry');article.dataset.category=v.category;
 const b=el('button');b.type='button';b.dataset.image=v.image;b.dataset.title=v.title;b.setAttribute('aria-label',`Enlarge ${v.title}`);
 const box=el('div','art-thumb'),im=el('img');attr(im,{src:url(v.image),alt:v.title,loading:'lazy'});box.append(im);b.append(box,el('h3','',v.title));
 article.append(b,el('p','',v.description));return article;
}
function initVisuals(){
 const filters=$('#visualCategoryFilters'),grid=$('#visualCmsGrid');
 if(filters&&grid&&data.visuals.length){
  filters.replaceChildren();
  for(const c of [{id:'all',label:'All'},...data.visualCategories]){
   const b=el('button','',c.label);b.type='button';b.dataset.filter=c.id;filters.append(b);
  }
  grid.replaceChildren(...data.visuals.map(v=>makeVisual(v)));
 }
 const home=$('[data-cms-featured]');if(home&&data.visuals.length){
  // V2.2 fallback markup remains if CMS contains no featured visual entries.
  const featured=data.visuals.filter(v=>v.featured_home).slice(0,5);
  if(featured.length)home.replaceChildren(...featured.map(v=>makeVisual(v,'home')));
 }
 const buttons=document.querySelectorAll('[data-filter]'),entries=document.querySelectorAll('.art-entry');
 function filter(value){visualFilter=value;buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.filter===value)));
  entries.forEach(entry=>{entry.hidden=value!=='all'&&entry.dataset.category!==value})}
 buttons.forEach(b=>b.onclick=()=>filter(b.dataset.filter));
 if(buttons.length)filter(visualFilter);
}
function cover(src,title){const box=el('div','release-art');const safe=url(src);
 if(safe){const im=el('img');attr(im,{src:safe,alt:`${title} cover art`,loading:'lazy'});box.append(im)}
 else box.append(el('div','recording-cover-placeholder','SP'));
 return box}
// Keep the Music library visually consistent with the three-across homepage
// release cards: artwork, title, short caption, one circular action.
// Release categories live ON the cover, not in a separate tall text row.
function makeRecording(rec){
 const row=el('article','recording-card');
 const tracks=Array.isArray(rec.tracks)?rec.tracks:[];
 const available=tracks.findIndex(t=>typeof t.audio_url==='string'&&t.audio_url.trim()&&!/(?:youtube\.com|youtu\.be)\//i.test(t.audio_url));
 // A multi-track EP or album should open the track list, not arbitrarily play
 // its first song. One-track audio recordings get genuine one-tap playback.
 const canPlay=available>=0&&tracks.length===1;
 const hit=el(canPlay?'button':'a','sp-recording-hit release-card');
 if(canPlay){
  hit.type='button';
  hit.setAttribute('aria-label','Play '+rec.title+' on Stone Prism');
  hit.onclick=()=>window.STONE_PRISM_PLAYER?.playTrack(rec.slug,available);
 }else{
  hit.href=recordingLink(rec.slug);
  hit.setAttribute('aria-label','Open '+rec.title+' details and tracks');
 }
 const art=cover(rec.artwork,rec.title);
 const format=rec.kind==='demo'?'Demo':({
  single:'Single',ep:'EP',album:'Album',collection:'Collection'
 }[rec.release_type]||'Release');
 art.append(el('span','sp-recording-cover-tag',format));
 const foot=el('div','release-foot');
 const copy=el('div','sp-recording-copy');
 copy.append(el('div','release-name',rec.title));
 const caption=(rec.description||'').trim();
 if(caption)copy.append(el('div','release-sub',caption));
 const circle=el('span','play-circle'+(canPlay?' sp-home-play':''),canPlay?'▶':'↗');
 circle.setAttribute('aria-hidden','true');
 foot.append(copy,circle);
 hit.append(art,foot);row.append(hit);
 return row;
}
function initMusic(){
 const grid=$('#recordingsGrid'),empty=$('#recordingsEmpty');if(!grid||!empty)return;
 const buttons=[...document.querySelectorAll('[data-music-filter]')];
 function render(){
  const visible=data.recordings.filter(x=>activeFilter==='all'||x.kind===activeFilter);
  grid.replaceChildren(...visible.map(makeRecording));
  empty.textContent=visible.length?'':activeFilter==='demo'?(cmsText('music.empty_demo')??'No website-exclusive demos are published yet.'):activeFilter==='official'?(cmsText('music.empty_official')??'No official releases have been published here yet.'):(cmsText('music.empty_all')??'No recordings have been published yet. The original artwork remains below.');
  empty.hidden=visible.length>0;
  buttons.forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.musicFilter===activeFilter)));
 }
 buttons.forEach(b=>b.onclick=()=>{activeFilter=b.dataset.musicFilter;render()});render();
}
function youtubeVideoId(raw){
 if(typeof raw!=='string')return '';
 try{
  const u=new URL(raw);
  if(u.protocol!=='https:')return '';
  const host=u.hostname.toLowerCase();let id='';
  if(host==='youtu.be'||host==='www.youtu.be')id=u.pathname.split('/')[1]||'';
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
   if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
   else {const match=u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);id=match?match[1]:''}
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
 }catch(_){return ''}
}
function createDetail(rec){
 const root=$('#recordingDetail');root.replaceChildren();
 const coverBox=el('div','detail-cover');
 if(url(rec.artwork)){
  const image=el('img');attr(image,{src:url(rec.artwork),alt:rec.title+' cover artwork'});coverBox.append(image);
 }else coverBox.append(el('div','recording-cover-placeholder','SP'));
 const content=el('div','detail-info');
 content.append(el('p','detail-type',prettyType(rec)),el('h2','detail-title',rec.title));
 if(rec.date)content.append(el('p','detail-type',rec.date));
 if(rec.description)content.append(el('p','detail-notes',rec.description));
 const tracks=Array.isArray(rec.tracks)?rec.tracks:[];
 const list=el('ol','track-list');
 if(!tracks.length)content.append(el('p','library-empty','Tracks will appear when this recording is ready.'));
 const video=el('section','sp-video-panel');video.hidden=true;
 const videoTitle=el('p','sp-video-heading','WATCH / STONE PRISM');
 const videoScreen=el('div','sp-video-embed');
 const videoFooter=el('div','sp-video-footer');
 const close=el('button','sp-video-close','Close video');close.type='button';close.onclick=()=>{
  videoScreen.replaceChildren();video.hidden=true;
 };
 videoFooter.append(close);video.append(videoTitle,videoScreen,videoFooter);
 function watch(index){
  const track=tracks[index],id=track&&youtubeVideoId(track.youtube_url||track.audio_url);
  if(!id)return;
  window.STONE_PRISM_PLAYER?.pause();
  videoScreen.replaceChildren();
  const iframe=el('iframe');iframe.title=track.title+' on YouTube';
  iframe.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1';
  iframe.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  iframe.allowFullscreen=true;iframe.referrerPolicy='strict-origin-when-cross-origin';
  const external=el('a','sp-youtube-link','Open on YouTube ↗');
  external.href='https://www.youtube.com/watch?v='+id;
  external.target='_blank';external.rel='noopener noreferrer';
  videoTitle.textContent=track.title+' / WATCH VIDEO';
  videoScreen.append(iframe);videoFooter.replaceChildren(close,external);video.hidden=false;
 }
 tracks.forEach((t,i)=>{
  const row=el('li','track-row'),label=el('div','track-label');
  label.append(el('span','track-number',String(i+1).padStart(2,'0')));
  const name=el('div');name.append(el('span','track-name',t.title));
  if(t.notes)name.append(el('span','track-note',t.notes));
  label.append(name);
  const actions=el('div','sp-track-actions');
  if(t.audio_url&&!youtubeVideoId(t.audio_url)){
   const play=el('button','track-play','▶ Play');play.type='button';
   play.onclick=()=>window.STONE_PRISM_PLAYER?.playTrack(rec.slug,i);
   actions.append(play);
  }
  if(youtubeVideoId(t.youtube_url||t.audio_url)){
   const watchButton=el('button','track-watch','Watch');watchButton.type='button';
   watchButton.onclick=()=>watch(i);actions.append(watchButton);
  }
  if(!actions.childElementCount)actions.append(el('span','sp-track-soon','Coming soon'));
  row.append(label,actions);list.append(row);
 });
 content.append(list,video);root.append(coverBox,content);
}
function initRecording(){
 const root=$('#recordingDetail');if(!root)return;
 const slug=new URLSearchParams(location.search).get('slug')||window.STONE_PRISM_PREVIEW_SLUG||'';
 const rec=data.recordings.find(r=>r.slug===slug);
 if(!rec){root.replaceChildren(el('p','library-empty','This recording is not published yet. Browse the Music page for available tracks.'));return}
 document.title=`${rec.title} | Stone Prism`;createDetail(rec);
}

// V2.5: A per-page 1–5 column control, with independently remembered
// phone / tablet / desktop choices. Works without localStorage as well.
function initGridDensity(){
 const control=$('[data-grid-density]');if(!control)return;
 const kind=control.dataset.gridDensity;
 const grids=[...document.querySelectorAll(`[data-adjustable-grid="${kind}"]`)];
 if(!grids.length)return;
 const buttons=[...control.querySelectorAll('[data-columns]')];
 const status=control.querySelector('.grid-density-current');
 const mem=window.STONE_PRISM_GRID_PREFS||(window.STONE_PRISM_GRID_PREFS={});
 const mode=()=>window.innerWidth<=680?'phone':window.innerWidth<=980?'tablet':'desktop';
 const defaultCount=()=>kind==='music'?(mode()==='desktop'?4:3):(mode()==='phone'?3:4);
 const storageKey=()=>`stoneprism:v25:columns:${kind}:${mode()}`;
 const getSaved=()=>{
  const key=storageKey();let value=mem[key];
  if(value===undefined){try{value=window.localStorage.getItem(key)}catch(_){value=null}}
  const n=Number(value);return Number.isInteger(n)&&n>=1&&n<=5?n:null;
 };
 let selected=null,lastMode='';
 function apply(n){
  selected=n;
  grids.forEach(grid=>{grid.style.setProperty('--sp-selected-columns',String(n));grid.dataset.columns=String(n)});
  buttons.forEach(button=>{const isCurrent=Number(button.dataset.columns)===n;button.setAttribute('aria-pressed',String(isCurrent))});
  if(status)status.textContent=`${n} across`;
 }
 function sync(force=false){
  const current=mode();if(!force&&current===lastMode)return;lastMode=current;
  apply(getSaved()??defaultCount());
 }
 buttons.forEach(button=>button.addEventListener('click',()=>{
  const n=Number(button.dataset.columns);if(!Number.isInteger(n)||n<1||n>5)return;
  const key=storageKey();mem[key]=n;
  try{window.localStorage.setItem(key,String(n))}catch(_){/* Some content:// viewers deny storage. */}
  apply(n);
 }));
 sync(true);
 // The responsive zoom breakpoint can change without a full page load.
 // A persistent listener is installed only once, and always targets the
 // control currently mounted in the single-file preview router.
 if(!window.STONE_PRISM_GRID_RESIZE_BOUND){
  window.STONE_PRISM_GRID_RESIZE_BOUND=true;
  window.addEventListener('resize',()=>{
   const current=document.querySelector('[data-grid-density]');
   if(current&&typeof current._spGridSync==='function')current._spGridSync();
  },{passive:true});
 }
 control._spGridSync=()=>sync();
}

function initPage(){initSiteText();initNavigation();initDialog();initHomepageMusic();initVisuals();initMusic();initRecording();initGridDensity()}
window.STONE_PRISM_APP={init:initPage,stopAudio:()=>window.STONE_PRISM_PLAYER?.stop()};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPage);else initPage();
})();
