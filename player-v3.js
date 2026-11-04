/* Stone Prism Player V3 — continuous in-site listening, one-tap start and Android media controls. */
(()=>{
'use strict';
const library=window.STONE_PRISM_CONTENT?.recordings||[];
const tracks=library.flatMap(record=>(record.tracks||[]).map((track,index)=>({
 record,track,index,source:typeof track.audio_url==='string'?track.audio_url.trim():''
}))).filter(item=>/^(https:\/\/|assets\/|media\/|audio\/)/i.test(item.source)
 && !/(?:youtube\.com|youtu\.be)\//i.test(item.source));
let current=-1,element=null,wave=null,waveToken=0,visualContext=null,analyser=null,frequencies=null,visualFrame=0;
let ui={},waveScript=null,navigationId=0;
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
function setStatus(message){if(ui.status)ui.status.textContent=message||''}
function playbackState(){
 const playing=!!element&&!element.paused&&current>=0;
 document.body.classList.toggle('sp-audio-playing',playing);
 if(ui.play){ui.play.textContent=playing?'❚❚':'▶';ui.play.setAttribute('aria-label',playing?'Pause':'Play')}
 if(ui.meter)ui.meter.classList.toggle('is-playing',playing);
 if('mediaSession' in navigator)navigator.mediaSession.playbackState=playing?'playing':'paused';
 if(playing)startVisualizer();
 else cancelAnimationFrame(visualFrame);
}
function updatePosition(){
 if(!element||current<0)return;
 const duration=Number.isFinite(element.duration)?element.duration:0;
 const time=element.currentTime||0;
 if(ui.time)ui.time.textContent=seconds(time)+' / '+seconds(duration);
 if(ui.seek)ui.seek.value=duration?String(Math.round(time/duration*1000)):'0';
 if(wave&&duration){
  try{
   if(Math.abs(wave.getCurrentTime()-time)>.22)wave.setTime(time);
  }catch(_){/* Waveform is still decoding. */}
 }
 if('mediaSession' in navigator&&navigator.mediaSession.setPositionState&&duration){
  try{navigator.mediaSession.setPositionState({duration,position:Math.min(time,duration),playbackRate:1})}catch(_){}
 }
}
function updateTrackUI(){
 const item=active();if(!item)return;
 if(ui.title)ui.title.textContent=item.track.title;
 if(ui.album)ui.album.textContent=item.record.title+' / STONE PRISM';
 if(ui.image){ui.image.src=artwork(item);ui.image.alt=item.record.title+' artwork'}
 if(ui.details)ui.details.href='recording.html?slug='+encodeURIComponent(item.record.slug);
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
function destroyWave(){
 waveToken++;
 const previous=wave;wave=null;
 if(previous)try{previous.destroy()}catch(_){}
 if(ui.wave){ui.wave.replaceChildren();ui.wave.hidden=true}
 if(ui.seek)ui.seek.hidden=false;
}
function loadWaveSurfer(){
 if(window.WaveSurfer)return Promise.resolve(window.WaveSurfer);
 if(!waveScript)waveScript=new Promise((resolve,reject)=>{
  const script=make('script');script.async=true;
  script.src='https://cdn.jsdelivr.net/npm/wavesurfer.js@7.12.12/dist/wavesurfer.min.js';
  script.onload=()=>window.WaveSurfer?resolve(window.WaveSurfer):reject(new Error('Waveform unavailable'));
  script.onerror=()=>reject(new Error('Waveform library failed'));
  document.head.append(script);
 });
 return waveScript;
}
function drawWave(item){
 const token=waveToken;
 loadWaveSurfer().then(WaveSurfer=>{
  if(token!==waveToken||!ui.wave||!element)return;
  const canvas=make('canvas').getContext('2d');
  let gradient='#c7dc4f';
  if(canvas){
   gradient=canvas.createLinearGradient(0,0,480,0);
   gradient.addColorStop(0,'#b9e849');gradient.addColorStop(.31,'#e8a34a');
   gradient.addColorStop(.65,'#dc6558');gradient.addColorStop(1,'#a275c0');
  }
  // Separate paused waveform decoder; the shared audio element plays immediately
  // on the initial tap. Waveform loading never pauses or restarts that audio.
  const instance=WaveSurfer.create({
   container:ui.wave,url:item.source,interact:true,normalize:true,
   height:46,barWidth:2,barGap:2,barRadius:2,
   waveColor:'#766477',progressColor:gradient,cursorColor:'#eee3cf',cursorWidth:1
  });
  wave=instance;
  instance.on('ready',()=>{
   if(token!==waveToken||wave!==instance)return;
   ui.wave.hidden=false;ui.seek.hidden=true;
   try{instance.setTime(element.currentTime||0)}catch(_){}
  });
  instance.on('interaction',()=>{
   if(wave===instance&&Number.isFinite(instance.getCurrentTime()))element.currentTime=instance.getCurrentTime();
  });
  instance.on('error',()=>{
   if(wave===instance){destroyWave();setStatus('Audio works; waveform visualization unavailable.')}
  });
 }).catch(()=>{if(token===waveToken)setStatus('Audio works; waveform visualization unavailable.')});
}
function createVisualizer(){
 if(analyser||!window.AudioContext&&!window.webkitAudioContext)return;
 try{
  const AudioEngine=window.AudioContext||window.webkitAudioContext;
  visualContext=new AudioEngine();
  const input=visualContext.createMediaElementSource(element);
  analyser=visualContext.createAnalyser();
  analyser.fftSize=128;analyser.smoothingTimeConstant=.72;
  input.connect(analyser);analyser.connect(visualContext.destination);
  frequencies=new Uint8Array(analyser.frequencyBinCount);
  visualContext.resume().catch(()=>{});
 }catch(_){analyser=null}
}
function startVisualizer(){
 if(visualFrame)return;
 function step(){
  visualFrame=0;
  if(!element||element.paused||current<0)return;
  if(analyser&&ui.bars?.length){
   analyser.getByteFrequencyData(frequencies);
   ui.bars.forEach((bar,i)=>{
    const sample=frequencies[Math.min(frequencies.length-1,Math.floor(i*frequencies.length/ui.bars.length))]||0;
    bar.style.height=(5+Math.round(sample/255*25))+'px';
   });
  }
  visualFrame=requestAnimationFrame(step);
 }
 visualFrame=requestAnimationFrame(step);
}
function play(){
 if(current<0)return;
 if(visualContext?.state==='suspended')visualContext.resume().catch(()=>{});
 element.play().catch(()=>setStatus('Tap Play again if your browser blocked automatic playback.'));
}
function startAt(index){
 if(index<0||index>=tracks.length)return;
 const item=tracks[index];
 clearInlineVideo();destroyWave();
 current=index;
 element.pause();element.crossOrigin='anonymous';element.preload='auto';element.src=item.source;
 updateTrackUI();
 // CRITICAL: call play synchronously within the click gesture, before loading
 // the waveform library, decoding peaks, or initiating a page transition.
 play();
 if(!analyser)createVisualizer();
 drawWave(item);
 updatePosition();
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
 element.pause();destroyWave();element.removeAttribute('src');element.load();
 current=-1;
 if(ui.dock)ui.dock.hidden=true;
 document.body.classList.remove('sp-audio-open','sp-audio-playing');
 if('mediaSession' in navigator)navigator.mediaSession.playbackState='none';
}
function makeDock(){
 const dock=make('aside','sp-jukebox');dock.id='spJukebox';dock.hidden=true;
 dock.setAttribute('aria-label','Stone Prism persistent music player');
 const art=make('img','sp-jukebox-art');art.alt='';
 const meta=make('div','sp-jukebox-meta');
 const title=make('strong','sp-jukebox-title','');
 const album=make('span','sp-jukebox-album','');
 const details=make('a','sp-jukebox-details','Details ↗');
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
 const meter=make('div','sp-jukebox-spectrum');meter.setAttribute('aria-hidden','true');
 const bars=[];
 for(let i=0;i<18;i++){const b=make('span');meter.append(b);bars.push(b)}
 const waveContainer=make('div','sp-jukebox-wave');waveContainer.hidden=true;
 const seek=make('input','sp-jukebox-seek');seek.type='range';seek.min='0';seek.max='1000';seek.value='0';
 seek.setAttribute('aria-label','Seek through current track');
 const timeline=make('div','sp-jukebox-timeline');timeline.append(waveContainer,seek);
 const time=make('span','sp-jukebox-time','0:00 / 0:00');
 const lower=make('div','sp-jukebox-lower');lower.append(meter,timeline,time);
 const status=make('div','sp-jukebox-status','');status.setAttribute('role','status');
 dock.append(info,lower,status);
 document.body.append(dock);
 ui={dock,image:art,title,album,details,prev,play:playButton,next:nextButton,close,wave:waveContainer,seek,time,meter,bars,status};
 playButton.onclick=()=>element.paused?play():pause();
 prev.onclick=previous;nextButton.onclick=next;close.onclick=stop;
 seek.oninput=()=>{
  if(element&&Number.isFinite(element.duration))element.currentTime=Number(seek.value)/1000*element.duration;
 };
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
 makeDock();initMediaSession();initRouting();
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