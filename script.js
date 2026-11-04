/* Stone Prism V2.3 — content and interactions, independent of V2.2 visuals */
(()=>{
'use strict';
const data=window.STONE_PRISM_CONTENT||{recordings:[],visuals:[],visualCategories:[]};
let activeFilter='all', visualFilter='all';
let audio=null, playingSlug='',playingTrack=-1;
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
function makeRecording(rec){
 const a=el('a','recording-card');a.href=recordingLink(rec.slug);a.append(cover(rec.artwork,rec.title));
 a.append(el('span','recording-card-tag',prettyType(rec)),el('h3','',rec.title));
 if(rec.description)a.append(el('p','',rec.description.length>145?rec.description.slice(0,144)+'…':rec.description));
 a.append(el('span','view-art','Listen / Details ↗'));return a;
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
function formatTime(s){if(!Number.isFinite(s))return '0:00';return `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`}
function stopAudio(){if(audio){audio.pause();audio.removeAttribute('src');audio.load();audio=null}playingTrack=-1;playingSlug=''}
function createDetail(rec){
 const root=$('#recordingDetail');root.replaceChildren();
 const coverBox=el('div','detail-cover');if(url(rec.artwork)){const im=el('img');attr(im,{src:url(rec.artwork),alt:`${rec.title} cover artwork`});coverBox.append(im)}else coverBox.append(el('div','recording-cover-placeholder','SP'));
 const content=el('div','detail-info');content.append(el('p','detail-type',prettyType(rec)),el('h2','detail-title',rec.title));
 if(rec.date)content.append(el('p','detail-type',rec.date));
 if(rec.description)content.append(el('p','detail-notes',rec.description));
 const list=el('ol','track-list');const tracks=rec.tracks||[];
 if(!tracks.length)content.append(el('p','library-empty','Tracks will appear when this recording is ready.'));
 const player=el('section','stream-player');player.id='streamPlayer';player.hidden=true;
 const now=el('p','player-now','');now.id='playerNow';
 const controls=el('div','player-controls'),play=el('button','player-play','Pause');play.type='button';play.id='playerPlay';play.setAttribute('aria-label','Play or pause track');
 const seek=el('input','player-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';seek.id='playerSeek';seek.setAttribute('aria-label','Seek in track');
 const time=el('span','player-time','0:00 / 0:00');time.id='playerTime';
 const message=el('p','player-message','Now playing on Stone Prism.');message.id='playerMessage';
 controls.append(play,seek,time);player.append(now,controls,message);
 function update(){if(!audio)return;const current=audio.currentTime||0,total=Number.isFinite(audio.duration)?audio.duration:0;
  seek.value=total?String(Math.round(current/total*1000)):'0';time.textContent=`${formatTime(current)} / ${formatTime(total)}`;play.textContent=audio.paused?'Play':'Pause'}
 function selectTrack(index){const t=tracks[index];if(!t||!url(t.audio_url))return;
  stopAudio();audio=new Audio();audio.preload='none';audio.src=t.audio_url;
  playingSlug=rec.slug;playingTrack=index;now.textContent=t.title;player.hidden=false;message.textContent='Now playing on Stone Prism.';
  audio.addEventListener('timeupdate',update);audio.addEventListener('loadedmetadata',update);
  audio.addEventListener('pause',update);audio.addEventListener('play',update);
  audio.addEventListener('ended',()=>{const next=tracks.findIndex((u,i)=>i>index&&url(u.audio_url));if(next!==-1)selectTrack(next);else update()});
  audio.addEventListener('error',()=>{message.textContent='Audio could not load. Check the streaming URL.';update()});
  audio.play().catch(()=>{message.textContent='Press Play to start the stream.';update()});update();
  list.querySelectorAll('.track-play').forEach((b,i)=>{b.textContent=i===index?'Playing':'Play';b.setAttribute('aria-current',String(i===index))});
 }
 tracks.forEach((t,i)=>{
  const li=el('li','track-row');const label=el('div','track-label');label.append(el('span','track-number',String(i+1).padStart(2,'0')));
  const name=el('div');name.append(el('span','track-name',t.title));if(t.notes)name.append(el('span','track-note',t.notes));label.append(name);
  const button=el('button','track-play',url(t.audio_url)?'Play':'Soon');button.type='button';button.disabled=!url(t.audio_url);
  button.addEventListener('click',()=>selectTrack(i));li.append(label,button);list.append(li)
 });content.append(list,player);
 root.append(coverBox,content);
 play.onclick=()=>{if(!audio)return;if(audio.paused)audio.play().catch(()=>{message.textContent='Unable to play audio. Check its URL.'});else audio.pause()};
 seek.oninput=()=>{if(audio&&Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)/1000*audio.duration};
}
function initRecording(){
 const root=$('#recordingDetail');if(!root)return;stopAudio();
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

function initPage(){initSiteText();initNavigation();initDialog();initVisuals();initMusic();initRecording();initGridDensity()}
window.STONE_PRISM_APP={init:initPage,stopAudio};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initPage);else initPage();
})();
