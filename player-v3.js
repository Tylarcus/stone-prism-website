/* Stone Prism Player V3 — continuous in-site listening, one-tap start and Android media controls. */
(()=>{
'use strict';
const library=window.STONE_PRISM_CONTENT?.recordings||[];
const tracks=library.flatMap(record=>(record.tracks||[]).map((track,index)=>({
 record,track,index,source:typeof track.audio_url==='string'?track.audio_url.trim():''
}))).filter(item=>/^(https:\/\/|assets\/|media\/|audio\/)/i.test(item.source)
 && !/(?:youtube\.com|youtu\.be)\//i.test(item.source));
let current=-1,element=null,waveformPeaks=null,waveformTicket=0;
let ui={},navigationId=0,lastSaveAt=0,lastSavedPosition=-1;
const PLAYBACK_KEY='stoneprism:jukebox:resume-v1';
const $=selector=>document.querySelector(selector);
const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n};
const seconds=n=>Number.isFinite(n)&&n>=0?Math.floor(n/60)+':'+String(Math.floor(n%60)).padStart(2,'0'):'0:00';
const active=()=>tracks[current];
const artwork=track=>track?.record?.artwork||'assets/favicon-b-96.png';
function clearInlineVideo(){
 const embed=$('.sp-video-embed'),panel=$('.sp-video-panel');
 if(embed)embed.replaceChildren();
 if(panel)panel.hidden=true;
}
function setStatus(message){if(ui.status){ui.status.textContent=message||'';ui.status.classList.toggle('sp-status-quiet',!message||message==='Streaming on Stone Prism.')}}
function playbackState(){
 const playing=!!element&&!element.paused&&current>=0;
 document.body.classList.toggle('sp-audio-playing',playing);
 if(ui.play){ui.play.textContent=playing?'❚❚':'▶';ui.play.setAttribute('aria-label',playing?'Pause':'Play')}
 if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
 // A previously blocked reload must never keep warning after user presses Play.
 if(playing)setStatus('');
 saveState(true);
}
function updatePosition(){
 if(!element||current<0)return;
 const duration=Number.isFinite(element.duration)?element.duration:0;
 const time=element.currentTime||0;
 if(ui.time)ui.time.textContent=seconds(time)+' / '+seconds(duration);
 if(ui.seek)ui.seek.value=duration?String(Math.round(time/duration*1000)):'0';
 if(ui.waveSeek)ui.waveSeek.value=duration?String(Math.round(time/duration*1000)):'0';
 if(ui.wavePlayed)ui.wavePlayed.style.clipPath='inset(0 '+(duration?Math.max(0,100-time/duration*100):100)+'% 0 0)';
 saveState();
 if('mediaSession' in navigator&&navigator.mediaSession.setPositionState&&duration){
  try{navigator.mediaSession.setPositionState({duration,position:Math.min(time,duration),playbackRate:1})}catch(_){}
 }
}
function updateTrackUI(){
 const item=active();if(!item)return;
 if(ui.title)ui.title.textContent=item.track.title;
 if(ui.album)ui.album.textContent=item.record.title+' / STONE PRISM';
 if(ui.image){ui.image.src=artwork(item);ui.image.alt=item.record.title+' artwork'}
 if(ui.details){
  ui.details.href='recording.html?slug='+encodeURIComponent(item.record.slug);
  const type=item.record.kind==='demo'?'Demo':({
   single:'Single',ep:'EP',album:'Album',collection:'Collection'
  }[item.record.release_type]||'Recording');
  const year=/^\d{4}/.test(item.record.date||'')?item.record.date.slice(0,4):'';
  ui.details.textContent=type+(year?' · '+year:'')+' ↗';
  ui.details.setAttribute('aria-label','Open '+item.record.title+' recording details');
 }
 if(ui.prev)ui.prev.disabled=current<=0;
 if(ui.next)ui.next.disabled=current>=tracks.length-1;
 document.body.classList.add('sp-audio-open');
 if(ui.dock)ui.dock.hidden=false;
 setStatus('Streaming on Stone Prism.');
 if('mediaSession' in navigator&&typeof window.MediaMetadata==='function'){
  const src=new URL(artwork(item),location.href).href;
  const metadata={title:item.track.title,artist:'Stone Prism',album:item.record.title,artwork:[{src}]};
  try{navigator.mediaSession.metadata=new window.MediaMetadata(metadata)}catch(_){}
 }
}
// Refresh creates a new document: store the last track/time so we can recover it.
// Most mobile browsers block audible autoplay on the new document; the resumed
// dock and its Play button always remain available if autoplay is denied.
function saveState(force=false){
 if(current<0||!element)return;
 const now=Date.now();
 if(!force&&now-lastSaveAt<1500&&Math.abs((element.currentTime||0)-lastSavedPosition)<2)return;
 lastSaveAt=now;lastSavedPosition=element.currentTime||0;
 try{sessionStorage.setItem(PLAYBACK_KEY,JSON.stringify({
  slug:tracks[current].record.slug,index:tracks[current].index,
  position:Math.max(0,element.currentTime||0),playing:!element.paused,
  saved:now
 }))}catch(_){}
}
function restoreState(){
 let data;
 try{data=JSON.parse(sessionStorage.getItem(PLAYBACK_KEY)||'null')}catch(_){return}
 if(!data||!Number.isFinite(data.saved)||Date.now()-data.saved>15*60*1000)return;
 const id=tracks.findIndex(t=>t.record.slug===data.slug&&t.index===data.index);
 if(id<0)return;
 current=id;element.src=tracks[id].source;element.preload='metadata';
 updateTrackUI();loadWaveform(tracks[id]);
 const saved=Number(data.position);
 if(Number.isFinite(saved)&&saved>0){
  const restorePosition=()=>{
   if(Number.isFinite(element.duration))element.currentTime=Math.min(saved,Math.max(0,element.duration-0.3));
   updatePosition();
  };
  element.addEventListener('loadedmetadata',restorePosition,{once:true});
 }
 if(data.playing){
  // Restore may be blocked by the autoplay policy. A blocked resume leaves
  // an explicit Play control instead of pretending music is still playing.
  const attempt=element.play();
  if(attempt&&typeof attempt.catch==='function')attempt.catch(()=>{
   // Mobile browsers may block autoplay after refresh. The Play icon tells
   // visitors how to resume without a stale warning occupying dock space.
   if(element.paused)setStatus('');
  });
 }else setStatus('');
}
// A waveform is visual data, NOT a sound processor. Peaks are generated at
// publish time by ffmpeg, so the visitor streams the MP3 only once.
function clearWaveform(){
 waveformTicket++;
 waveformPeaks=null;
 if(ui.wave)ui.wave.hidden=true;
 if(ui.seek)ui.seek.hidden=false;
}
function drawStaticWaveform(){
 if(!waveformPeaks||!ui.wave||ui.wave.hidden)return;
 const width=Math.max(100,Math.round(ui.wave.clientWidth||600));
 const height=Math.max(30,Math.round(ui.wave.clientHeight||58)),dpr=Math.min(2,window.devicePixelRatio||1);
 const count=Math.min(280,Math.max(34,Math.floor(width/3.6)));
 for(const canvas of [ui.waveBase,ui.wavePlayed]){
  canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
  canvas.style.width=width+'px';canvas.style.height=height+'px';
 }
 const base=ui.waveBase.getContext('2d'),played=ui.wavePlayed.getContext('2d');
 if(!base||!played)return;
 base.setTransform(dpr,0,0,dpr,0,0);played.setTransform(dpr,0,0,dpr,0,0);
 const colored=played.createLinearGradient(0,0,width,0);
 colored.addColorStop(0,'#b8e849');colored.addColorStop(.3,'#e5a349');
 colored.addColorStop(.63,'#d86657');colored.addColorStop(1,'#a478ba');
 base.fillStyle='#786779';played.fillStyle=colored;
 const step=width/count, gap=Math.min(1.6,step*.35);
 for(let i=0;i<count;i++){
  const from=Math.floor(i*waveformPeaks.length/count);
  const to=Math.max(from+1,Math.ceil((i+1)*waveformPeaks.length/count));
  let amplitude=0;
  for(let k=from;k<to;k++)amplitude=Math.max(amplitude,waveformPeaks[k]||0);
  const barHeight=Math.max(2,Math.min(height-4,amplitude*(height-4)));
  const x=i*step, y=(height-barHeight)/2;
  const w=Math.max(.8,step-gap);
  base.fillRect(x,y,w,barHeight);
  played.fillRect(x,y,w,barHeight);
 }
 updatePosition();
}
function loadWaveform(item){
 clearWaveform();
 const ticket=waveformTicket;
 const filename='data/waveforms/'+encodeURIComponent(item.record.slug)+'-'+item.index+'.json';
 fetch(filename,{cache:'default'}).then(response=>{
  if(!response.ok)throw Error('Waveform peaks not published');
  return response.json();
 }).then(result=>{
  if(ticket!==waveformTicket||active()!==item)return;
  if(result.source!==item.source||!Array.isArray(result.peaks)||result.peaks.length<20)return;
  waveformPeaks=result.peaks.map(x=>Number.isFinite(x)?Math.min(1,Math.max(0,x)):0);
  ui.wave.hidden=false;ui.seek.hidden=true;
  drawStaticWaveform();
 }).catch(()=>{
  // Keep native seeking, without downloading the MP3 to create a waveform.
  if(ticket===waveformTicket&&current>=0)setStatus('Streaming on Stone Prism.');
 });
}
function play(){
 if(current<0)return;
 element.play().catch(()=>setStatus('Tap Play again if your browser blocked automatic playback.'));
}
function startAt(index){
 if(index<0||index>=tracks.length)return;
 const item=tracks[index];
 clearInlineVideo();
 current=index;
 element.pause();element.preload='auto';element.src=item.source;
 updateTrackUI();
 // One tap starts the native MP3 stream before fetching tiny display-only peaks.
 play();loadWaveform(item);
 updatePosition();saveState(true);
}
function selectTrack(slug,index=0){
 const target=tracks.findIndex(item=>item.record.slug===slug&&item.index===Number(index));
 if(target<0)return false;
 if(target===current){
  if(element.paused)play();
  else {element.currentTime=0;play()}
 }else startAt(target);
 return true;
}
function previous(){
 if(current<0)return;
 if(element.currentTime>3){element.currentTime=0;return}
 if(current>0)startAt(current-1);else element.currentTime=0;
}
function next(){if(current>=0&&current<tracks.length-1)startAt(current+1)}
function pause(){element?.pause()}
function stop(){
 if(!element)return;
 element.pause();clearWaveform();element.removeAttribute('src');element.load();
 current=-1;lastSavedPosition=-1;lastSaveAt=0;
 if(ui.dock)ui.dock.hidden=true;
 document.body.classList.remove('sp-audio-open','sp-audio-playing');
 try{sessionStorage.removeItem(PLAYBACK_KEY)}catch(_){}
 if('mediaSession' in navigator)navigator.mediaSession.playbackState='none';
}
function makeDock(){
 const dock=make('aside','sp-jukebox');dock.id='spJukebox';dock.hidden=true;
 dock.setAttribute('aria-label','Stone Prism persistent music player');
 const art=make('img','sp-jukebox-art');art.alt='';
 const meta=make('div','sp-jukebox-meta');
 const title=make('strong','sp-jukebox-title','');
 const album=make('span','sp-jukebox-album','');
 const details=make('a','sp-jukebox-details','Recording ↗');
 meta.append(title,album,details);
 const prev=make('button','sp-jukebox-button','⏮'),playButton=make('button','sp-jukebox-button sp-jukebox-play','▶');
 const nextButton=make('button','sp-jukebox-button','⏭');
 const close=make('button','sp-jukebox-close','×');
 for(const [button,label] of [[prev,'Previous track'],[nextButton,'Next track'],[close,'Stop and close player']]){
  button.type='button';button.setAttribute('aria-label',label);
 }
 playButton.type='button';playButton.setAttribute('aria-label','Play');
 const buttons=make('div','sp-jukebox-actions');
 buttons.append(prev,playButton,nextButton,close);
 const info=make('div','sp-jukebox-info');info.append(art,meta,buttons);
 const wave=make('div','sp-jukebox-static-wave');wave.hidden=true;
 wave.setAttribute('aria-label','Static audio waveform: drag to seek through the song');
 const waveBase=make('canvas','sp-waveform-base');
 const wavePlayed=make('canvas','sp-waveform-played');
 const waveSeek=make('input','sp-waveform-seek');
 waveSeek.type='range';waveSeek.min='0';waveSeek.max='1000';waveSeek.value='0';
 waveSeek.setAttribute('aria-label','Seek through song waveform');
 wave.append(waveBase,wavePlayed,waveSeek);
 const seek=make('input','sp-jukebox-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';
 seek.setAttribute('aria-label','Seek through current track');
 const timeline=make('div','sp-jukebox-timeline');timeline.append(wave,seek);
 const time=make('span','sp-jukebox-time','0:00 / 0:00');
 const lower=make('div','sp-jukebox-lower');lower.append(timeline,time);
 const status=make('div','sp-jukebox-status','');status.setAttribute('role','status');
 dock.append(info,lower,status);
 document.body.append(dock);
 ui={dock,image:art,title,album,details,prev,play:playButton,next:nextButton,close,seek,waveSeek,wave,waveBase,wavePlayed,time,status};
 playButton.onclick=()=>element.paused?play():pause();
 prev.onclick=previous;nextButton.onclick=next;close.onclick=stop;
 for(const control of [seek,waveSeek])control.oninput=()=>{
  if(element&&Number.isFinite(element.duration))element.currentTime=Number(control.value)/1000*element.duration;
 };
 window.addEventListener('resize',drawStaticWaveform,{passive:true});
}
function initMediaSession(){
 if(!('mediaSession' in navigator))return;
 const actions={
  play:play,pause,stop,previoustrack:previous,nexttrack:next,
  seekto:details=>{if(Number.isFinite(details.seekTime)&&element)element.currentTime=details.seekTime}
 };
 for(const [action,handler] of Object.entries(actions)){
  try{navigator.mediaSession.setActionHandler(action,handler)}catch(_){}
 }
}
function initialize(){
 element=new Audio();element.preload='none';
 element.addEventListener('play',playbackState);
 element.addEventListener('pause',playbackState);
 element.addEventListener('timeupdate',updatePosition);
 element.addEventListener('loadedmetadata',updatePosition);
 element.addEventListener('ended',()=>{
  if(current<tracks.length-1)next();
  else {setStatus('Playlist finished.');playbackState()}
 });
 element.addEventListener('error',()=>setStatus('Could not load this MP3. Check its full R2 object URL.'));
 makeDock();initMediaSession();initRouting();restoreState();
}
function initRouting(){
 // Keep a single document alive across Stone Prism's four static pages, so the
 // real Audio object and dock survive page changes and mobile Back navigation.
 try{if(!history.state?.spPage)history.replaceState({spPage:true},'',location.href)}catch(_){}
 document.addEventListener('click',event=>{
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  const anchor=event.target.closest('a[href]');
  if(!anchor||anchor.hasAttribute('download')||anchor.target&&anchor.target!=='_self')return;
  if(anchor.hasAttribute('data-image'))return;
  const direct=anchor.closest('[data-sp-play]');
  if(direct){
   const raw=direct.getAttribute('data-sp-play')||'';
   const split=raw.lastIndexOf(':');const slug=raw.slice(0,split),index=Number(raw.slice(split+1));
   if(split>0&&Number.isInteger(index)&&selectTrack(slug,index)){event.preventDefault();return}
  }
  const url=new URL(anchor.href,location.href);
  if(url.origin!==location.origin||!isSitePage(url.pathname))return;
  if(url.pathname===location.pathname&&url.search===location.search)return;
  event.preventDefault();navigate(url,true);
 });
 window.addEventListener('popstate',()=>navigate(new URL(location.href),false));
}
function isSitePage(path){
 const name=path.split('/').pop();
 return name===''||['index.html','music.html','visuals.html','recording.html'].includes(name);
}
async function navigate(destination,push){
 const id=++navigationId;
 try{
  const response=await fetch(destination.pathname,{cache:'no-cache'});
  if(!response.ok)throw Error('Unable to open page');
  const html=new DOMParser().parseFromString(await response.text(),'text/html');
  const nextSite=html.querySelector('.site'),nextDialog=html.querySelector('#artDialog');
  const currentSite=$('.site'),currentDialog=$('#artDialog');
  if(!nextSite||!currentSite||!nextDialog||!currentDialog)throw Error('Unsupported page');
  if(id!==navigationId)return;
  if(push)history.pushState({spPage:true},'',destination.href);
  currentSite.replaceWith(document.importNode(nextSite,true));
  currentDialog.replaceWith(document.importNode(nextDialog,true));
  document.body.dataset.cmsPage=html.body.dataset.cmsPage||'';
  document.title=html.title;
  const nextDescription=html.querySelector('meta[name="description"]');
  const description=$('meta[name="description"]');
  if(description&&nextDescription)description.content=nextDescription.content;
  window.STONE_PRISM_APP?.init();
  if(destination.hash){
   const hash=decodeURIComponent(destination.hash.slice(1));
   const target=document.getElementById(hash);
   if(target)target.scrollIntoView({block:'start'});
   else window.scrollTo(0,0);
  }else window.scrollTo(0,0);
 }catch(error){
  if(id!==navigationId)return;
  // Graceful fallback if the host doesn't support fetching HTML pages.
  location.assign(destination.href);
 }
}
window.STONE_PRISM_PLAYER={playTrack:selectTrack,pause,stop,next,previous,getQueue:()=>tracks.map(t=>({slug:t.record.slug,title:t.track.title}))};
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initialize);
else initialize();
})();