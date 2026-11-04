/* Stone Prism V2.3 — content and interactions, independent of V2.2 visuals */
(()=>{
'use strict';
const data=window.STONE_PRISM_CONTENT||{recordings:[],visuals:[],visualCategories:[]};
let activeFilter='all', visualFilter='all';
let audio=null, waveInstance=null, playingSlug='',playingTrack=-1;
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
function formatTime(s){return Number.isFinite(s)&&s>=0?Math.floor(s/60)+':'+String(Math.floor(s%60)).padStart(2,'0'):'0:00'}
function youtubeVideoId(raw){
 if(typeof raw!=='string')return '';
 try{
  const u=new URL(raw);if(u.protocol!=='https:')return '';
  const host=u.hostname.toLowerCase();let id='';
  if(host==='youtu.be'||host==='www.youtu.be')id=u.pathname.split('/')[1]||'';
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com','youtube-nocookie.com','www.youtube-nocookie.com'].includes(host)){
   if(u.pathname==='/watch')id=u.searchParams.get('v')||'';
   else {const m=u.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/);id=m?m[1]:''}
  }
  return /^[A-Za-z0-9_-]{11}$/.test(id)?id:'';
 }catch(_){return ''}
}
const audioSource=t=>t&&url(t.audio_url)&&!youtubeVideoId(t.audio_url)?url(t.audio_url):'';
let waveformLibrary=null;
function loadWaveform(){
 if(window.WaveSurfer)return Promise.resolve(window.WaveSurfer);
 if(!waveformLibrary)waveformLibrary=new Promise((resolve,reject)=>{
  const script=el('script');script.async=true;
  script.src='https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.12/dist/wavesurfer.min.js';
  script.onload=()=>window.WaveSurfer?resolve(window.WaveSurfer):reject(new Error('Waveform library unavailable'));
  script.onerror=()=>reject(new Error('Waveform library could not load'));
  document.head.append(script);
 });
 return waveformLibrary;
}
function stopAudio(){
 if(waveInstance){const old=waveInstance;waveInstance=null;try{old.destroy()}catch(_){}}
 if(audio){const old=audio;audio=null;old.pause();old.removeAttribute('src');old.load()}
 playingTrack=-1;playingSlug='';
}
function createDetail(rec){
 const root=$('#recordingDetail');root.replaceChildren();
 const coverBox=el('div','detail-cover');
 if(url(rec.artwork)){const img=el('img');attr(img,{src:url(rec.artwork),alt:rec.title+' cover artwork'});coverBox.append(img)}
 else coverBox.append(el('div','recording-cover-placeholder','SP'));
 const content=el('div','detail-info');content.append(el('p','detail-type',prettyType(rec)),el('h2','detail-title',rec.title));
 if(rec.date)content.append(el('p','detail-type',rec.date));
 if(rec.description)content.append(el('p','detail-notes',rec.description));
 const tracks=Array.isArray(rec.tracks)?rec.tracks:[];
 const list=el('ol','track-list');
 if(!tracks.length)content.append(el('p','library-empty','Tracks will appear when this recording is ready.'));

 const player=el('section','stream-player sp-player');player.id='streamPlayer';player.hidden=true;
 player.setAttribute('aria-label','Stone Prism audio player');
 const now=el('p','player-now',''),badge=el('span','sp-player-badge','STONE PRISM / AUDIO');
 const header=el('div','sp-player-header');header.append(now,badge);
 const controls=el('div','player-controls sp-controls');
 const play=el('button','player-play','Play');play.type='button';play.setAttribute('aria-label','Play or pause recording');
 const meter=el('div','player-meter');meter.setAttribute('aria-hidden','true');
 for(let n=0;n<5;n++)meter.append(el('span'));
 const wave=el('div','player-wave');wave.hidden=true;wave.setAttribute('aria-label','Seekable audio waveform');
 const seek=el('input','player-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';
 seek.hidden=true;seek.setAttribute('aria-label','Seek within the track');
 const timeline=el('div','sp-timeline');timeline.append(wave,seek);
 const time=el('span','player-time','0:00 / 0:00');
 const message=el('p','player-message','');message.setAttribute('role','status');
 controls.append(play,meter,timeline,time);player.append(header,controls,message);

 const video=el('section','sp-video-panel');video.hidden=true;
 const videoTitle=el('p','sp-video-heading','WATCH / STONE PRISM');
 const videoScreen=el('div','sp-video-embed');
 const videoFooter=el('div','sp-video-footer'),closeVideo=el('button','sp-video-close','Close video');
 closeVideo.type='button';videoFooter.append(closeVideo);
 video.append(videoTitle,videoScreen,videoFooter);
 const clearVideo=()=>{videoScreen.replaceChildren();video.hidden=true};
 closeVideo.onclick=clearVideo;
 let token=0,ready=false;
 function update(){
  const active=waveInstance?waveInstance.isPlaying():!!audio&&!audio.paused;
  const current=waveInstance?waveInstance.getCurrentTime():audio?audio.currentTime||0:0;
  const total=waveInstance?waveInstance.getDuration():audio&&Number.isFinite(audio.duration)?audio.duration:0;
  play.textContent=active?'Pause':'Play';meter.classList.toggle('is-playing',active);
  time.textContent=formatTime(current)+' / '+formatTime(total);
  if(!waveInstance)seek.value=total?String(Math.round(current/total*1000)):'0';
  list.querySelectorAll('.track-play').forEach(b=>{
   const selected=playingSlug===rec.slug&&b.dataset.trackIndex===String(playingTrack);
   b.textContent=selected&&active?'Playing':'Play';b.setAttribute('aria-current',selected?'true':'false');
  });
 }
 function advance(){
  const next=tracks.findIndex((t,i)=>i>playingTrack&&audioSource(t));
  if(next>=0)selectTrack(next);else {message.textContent='Playback finished.';update()}
 }
 function nativeFallback(source,selectToken,reason){
  if(selectToken!==token)return;
  if(waveInstance){const old=waveInstance;waveInstance=null;try{old.destroy()}catch(_){}}
  wave.hidden=true;wave.replaceChildren();seek.hidden=false;ready=false;
  audio=new Audio();audio.preload='metadata';audio.src=source;
  const current=audio;
  ['timeupdate','loadedmetadata','play','pause'].forEach(event=>current.addEventListener(event,()=>{if(audio===current)update()}));
  current.addEventListener('ended',()=>{if(audio===current)advance()});
  current.addEventListener('error',()=>{if(audio===current)message.textContent='Audio could not load. Check the full R2 object URL and file type.'});
  message.textContent=reason||'Streaming on Stone Prism.';
  current.play().catch(()=>{if(audio===current)message.textContent='Tap Play to start this recording.'});
  update();
 }
 function selectTrack(index){
  const t=tracks[index],source=audioSource(t);if(!source)return;
  const selectToken=++token;clearVideo();stopAudio();playingSlug=rec.slug;playingTrack=index;ready=false;
  now.textContent=t.title;player.hidden=false;wave.hidden=true;seek.hidden=true;
  wave.replaceChildren();time.textContent='0:00 / 0:00';message.textContent='Loading your recording…';update();
  loadWaveform().then(WaveSurfer=>{
   if(selectToken!==token)return;
   try{
    const ctx=el('canvas').getContext('2d');let progress='#b9e849';
    if(ctx){
     const gradient=ctx.createLinearGradient(0,0,480,0);
     gradient.addColorStop(0,'#b9e849');gradient.addColorStop(.32,'#e4a34a');
     gradient.addColorStop(.64,'#d76054');gradient.addColorStop(1,'#a078be');
     progress=gradient;
    }
    wave.hidden=false;seek.hidden=true;
    const instance=WaveSurfer.create({container:wave,url:source,
     waveColor:'#766579',progressColor:progress,cursorColor:'#f2e7d5',cursorWidth:1,
     height:66,barWidth:2,barGap:2,barRadius:2,normalize:true,interact:true});
    waveInstance=instance;
    instance.on('ready',()=>{
     if(waveInstance!==instance||selectToken!==token)return;
     ready=true;message.textContent='Streaming on Stone Prism.';update();
     instance.play().catch(()=>{if(waveInstance===instance)message.textContent='Tap Play to start this recording.'});
    });
    ['timeupdate','play','pause'].forEach(event=>instance.on(event,()=>{if(waveInstance===instance)update()}));
    instance.on('finish',()=>{if(waveInstance===instance)advance()});
    instance.on('error',()=>{
     if(waveInstance===instance&&selectToken===token)nativeFallback(source,selectToken,'Waveform unavailable; using backup playback. R2 may need CORS configured.');
    });
   }catch(_){nativeFallback(source,selectToken,'Waveform unavailable; using backup playback.')}
  }).catch(()=>nativeFallback(source,selectToken,'Waveform library unavailable; using backup playback.'));
 }
 function showVideo(index){
  const track=tracks[index],id=track&&youtubeVideoId(track.youtube_url||track.audio_url);
  if(!id)return;
  ++token;stopAudio();player.hidden=true;clearVideo();
  const frame=el('iframe');frame.title=track.title+' on YouTube';
  frame.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&playsinline=1';
  frame.allow='accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture';
  frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';
  const external=el('a','sp-youtube-link','Open on YouTube ↗');
  external.href='https://www.youtube.com/watch?v='+id;external.target='_blank';external.rel='noopener noreferrer';
  videoTitle.textContent=track.title+' / WATCH VIDEO';
  videoScreen.append(frame);videoFooter.replaceChildren(closeVideo,external);video.hidden=false;update();
 }
 tracks.forEach((t,i)=>{
  const row=el('li','track-row'),label=el('div','track-label');
  label.append(el('span','track-number',String(i+1).padStart(2,'0')));
  const name=el('div');name.append(el('span','track-name',t.title));
  if(t.notes)name.append(el('span','track-note',t.notes));
  label.append(name);
  const actions=el('div','sp-track-actions');
  if(audioSource(t)){
   const button=el('button','track-play','Play');button.type='button';button.dataset.trackIndex=String(i);
   button.addEventListener('click',()=>selectTrack(i));actions.append(button);
  }
  if(youtubeVideoId(t.youtube_url||t.audio_url)){
   const button=el('button','track-watch','Watch');button.type='button';
   button.addEventListener('click',()=>showVideo(i));actions.append(button);
  }
  if(!actions.childElementCount)actions.append(el('span','sp-track-soon','Coming soon'));
  row.append(label,actions);list.append(row);
 });
 content.append(list,player,video);root.append(coverBox,content);
 play.addEventListener('click',()=>{
  if(waveInstance){
   if(!ready){message.textContent='Waveform is loading.';return}
   waveInstance.playPause();return;
  }
  if(audio){if(audio.paused)audio.play().catch(()=>{message.textContent='Unable to play audio.'});else audio.pause()}
 });
 seek.addEventListener('input',()=>{if(audio&&Number.isFinite(audio.duration))audio.currentTime=Number(seek.value)/1000*audio.duration});
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
