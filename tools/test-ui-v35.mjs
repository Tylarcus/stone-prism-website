import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Node {
 constructor(tag='div'){
  this.tagName=tag.toUpperCase();this.className='';this.children=[];
  this.dataset={};this.attributes={};this.style={};this.listeners={};
  this.hidden=false;this.open=false;this.textContent='';this.id='';
  this.classList={add:name=>{this.className+=' '+name},remove:name=>{this.className=this.className.split(' ').filter(x=>x!==name).join(' ')}};
 }
 append(...children){this.children.push(...children)}
 replaceChildren(...children){this.children=[...children]}
 setAttribute(key,value){this.attributes[key]=value}
 addEventListener(name,fn){this.listeners[name]=fn}
 querySelector(selector){
  const wanted=selector.slice(1);
  const visit=node=>{
   if(selector[0]==='.'&&node.className.split(' ').includes(wanted))return node;
   if(selector[0]==='#'&&node.id===wanted)return node;
   for(const child of node.children||[]){const result=visit(child);if(result)return result}
   return null;
  };
  return visit(this);
 }
 showModal(){this.open=true}
 close(){this.open=false;this.listeners.close?.()}
}
const body=new Node('body'),homeGrid=new Node('div'),visualGrid=new Node('div');
const allNodes=[body,homeGrid,visualGrid];
const document={
 readyState:'loading',
 createElement:tag=>new Node(tag),
 addEventListener(){},
 querySelector:selector=>{
  if(selector==='.releases .release-grid')return homeGrid;
  if(selector==='[data-cms-featured]')return visualGrid;
  return body.querySelector(selector);
 },
 querySelectorAll:()=>[],
 body
};
const video={slug:'acoustic',title:'I Need You (Live Acoustic)',kind:'official',release_type:'single',
 date:'2017-01-01',description:'Original recording from 2017',artwork:'',
 tracks:[{title:'I Need You',audio_url:'',youtube_url:'https://www.youtube.com/watch?v=zvHoJMJKBbY'}]};
const audio={slug:'angel-demo',title:'Angel [Demo]',kind:'demo',release_type:'demo',
 description:'Website-exclusive',artwork:'assets/angel.webp',
 tracks:[{title:'Angel',audio_url:'https://pub-abc.r2.dev/song.mp3',youtube_url:''}]};
const visual={slug:'frog-cover',title:'Frog Cover',image:'assets/frog-cover.webp',published:true};
const data={recordings:[video,audio],visuals:[visual],visualCategories:[],
 homeMusic:[{kind:'recording',slug:'acoustic',title:'',subtitle:''},{kind:'recording',slug:'angel-demo',title:'',subtitle:''},{kind:'visual',slug:'frog-cover',title:'',subtitle:''}],
 homeVisuals:[{slug:'frog-cover'}]};
let audioPauseCount=0;
const window={
 STONE_PRISM_CONTENT:data,
 STONE_PRISM_PLAYER:{pause(){audioPauseCount++},playTrack(){return true}},
 addEventListener(){}
};
let src=fs.readFileSync('script.js','utf8');
src=src.replace('window.STONE_PRISM_APP={',
 'window.SP_UI_TEST={initHomepageMusic,initVisuals,makeRecording,openYouTube,closeVideoDialog};window.STONE_PRISM_APP={');
const sandbox={window,document,URL,URLSearchParams,location:{href:'https://stoneprism.music/music.html',search:'',origin:'https://stoneprism.music'},console};
vm.runInNewContext(src,sandbox);
const ui=window.SP_UI_TEST;
assert.ok(ui,'UI functions should be accessible in test context');

ui.initHomepageMusic();
assert.equal(homeGrid.children.length,3,'Homepage keeps all CMS-picked cards');
const videoCard=homeGrid.children[0];
const videoPoster=videoCard.children[0].children[0];
assert.equal(videoPoster.src,'https://i.ytimg.com/vi/zvHoJMJKBbY/hqdefault.jpg',
 'Video-only single gets YouTube thumbnail instead of a blank SP placeholder');
assert.equal(videoCard.children[0].children.at(-1).textContent,'Single',
 'Homepage single badge overlays artwork');
const audioCard=homeGrid.children[1];
assert.equal(audioCard.children[0].children.at(-1).textContent,'Demo',
 'Homepage audio demo badge overlays artwork');
assert.ok(videoCard.children[1].children[1].className.includes('sp-youtube-play'),'YouTube circle uses red-specific styling');
assert.ok(!audioCard.children[1].children[1].className.includes('sp-youtube-play'),'MP3 circle keeps green styling');
const css=fs.readFileSync('styles.css','utf8');
assert.match(css,/\.sp-youtube-play\{background:#ff0033/,'Video play button should use YouTube red');
assert.match(css,/\.sp-video-cover::before[\s\S]*?background:#ff0033/,'Video poster button should be YouTube red');
assert.equal(audioCard.dataset.spPlay,'angel-demo:0','Audio plays in dock from one tap');

let prevented=false;
videoCard.listeners.click({preventDefault(){prevented=true}});
assert.equal(prevented,true,'YouTube single does not navigate away on first tap');
const modal=body.querySelector('#spVideoDialog');
assert.ok(modal?.open,'YouTube single opens embedded modal');
const screen=body.querySelector('#spVideoStage');
assert.ok(screen.children[0].src.includes('/embed/zvHoJMJKBbY?autoplay=1'),
 'First tap loads video with autoplay enabled');
assert.equal(audioPauseCount,1,'Opening video pauses the audio dock');
ui.closeVideoDialog();
assert.equal(screen.children.length,0,'Closing YouTube removes iframe and stops video');

const musicVideoCard=ui.makeRecording(video);
assert.equal(musicVideoCard.children[0].children[0].children[0].src,
 'https://i.ytimg.com/vi/zvHoJMJKBbY/hqdefault.jpg',
 'Music page uses the same YouTube preview');
assert.equal(musicVideoCard.children[0].children[0].children.at(-1).textContent,'Single');
ui.initVisuals();
assert.equal(visualGrid.children.length,1,'Homepage Visual Archive follows CMS picks');
assert.equal(visualGrid.children[0].dataset.image,'assets/frog-cover.webp');
console.log('UI V3.5 passed: video poster, one-tap embed, stop-on-close, badges and homepage visuals.');
