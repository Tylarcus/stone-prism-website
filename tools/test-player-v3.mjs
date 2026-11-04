import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

for(const name of ['index.html','music.html','visuals.html','recording.html']){
 const html=fs.readFileSync(name,'utf8');
 assert.match(html,/<script src="player-v3\.js"><\/script>/,'Every page needs the persistent player');
}
const elements=[];
class FakeNode{
 constructor(tag='div'){this.tagName=tag;this.children=[];this.events={};this.style={};this.hidden=false;this.attributes={};this.classList={add(){},remove(){},toggle(){}}}
 append(...items){this.children.push(...items)}
 appendChild(node){this.append(node)}
 setAttribute(name,value){this.attributes[name]=value}
 addEventListener(type,handler){this.events[type]=handler}
 replaceChildren(...items){this.children=[...items]}
}
class FakeAudio{
 constructor(){this.events={};this.paused=true;this.currentTime=0;this.duration=240;this.playCalls=0;this.src='';elements.push(this)}
 addEventListener(type,handler){this.events[type]=handler}
 play(){this.playCalls++;this.paused=false;this.events.play?.();return Promise.resolve()}
 pause(){this.paused=true;this.events.pause?.()}
 load(){}
 removeAttribute(name){if(name==='src')this.src=''}
 emit(type){this.events[type]?.()}
}
const stored=new Map();
const sessionStorage={
 setItem(key,value){stored.set(key,value)},
 getItem(key){return stored.get(key)??null},
 removeItem(key){stored.delete(key)}
};

const docEvents={},winEvents={};
const document={
 readyState:'loading',
 createElement:tag=>new FakeNode(tag),
 querySelector:()=>null,
 addEventListener:(key,handler)=>{docEvents[key]=handler},
 body:{classList:{add(){},remove(){},toggle(){}},append(){},dataset:{}},
 head:{append(){}}
};
const history={state:null,replaceState(state){this.state=state},pushState(state){this.state=state}};
const window={
 STONE_PRISM_CONTENT:{recordings:[
  {slug:'first',title:'First EP',artwork:'assets/angel.webp',tracks:[{title:'Track one',audio_url:'https://example.net/one.mp3'},{title:'Track two',audio_url:'https://example.net/two.mp3'}]},
  {slug:'second',title:'Second EP',tracks:[{title:'Video only',youtube_url:'https://www.youtube.com/watch?v=zvHoJMJKBbY',audio_url:''}]}
 ]},
 addEventListener:(key,handler)=>{winEvents[key]=handler}
};
const sandbox={
 window,document,history,navigator:{},location:{href:'https://stoneprism.music/music.html',pathname:'/music.html',search:'',origin:'https://stoneprism.music'},
 Audio:FakeAudio,URL,Uint8Array,sessionStorage,
 requestAnimationFrame:()=>42,cancelAnimationFrame:()=>{},
 Promise,console
};
vm.runInNewContext(fs.readFileSync('player-v3.js','utf8'),sandbox);
docEvents.DOMContentLoaded?.();
const player=window.STONE_PRISM_PLAYER;
assert.ok(player,'Global persistent player API should be present');
assert.equal(player.getQueue().length,2,'Only directly streamable tracks enter the playlist');
assert.equal(player.playTrack('first',0),true,'The first song is playable');
const audio=elements[0];
assert.equal(audio.playCalls,1,'First click must immediately call audio.play exactly once');
assert.equal(audio.src,'https://example.net/one.mp3');
assert.equal(player.playTrack('second',0),false,'Video-only songs are not audio streams');
audio.emit('ended');
assert.equal(audio.src,'https://example.net/two.mp3','Track end must automatically select the next song');
assert.equal(audio.playCalls,2,'Following track should begin playing automatically');
player.pause();
assert.equal(audio.paused,true);
player.playTrack('first',1);
assert.equal(audio.playCalls,3,'A tap on the current paused song resumes playback');
player.stop();
assert.equal(audio.src,'','Close stops and unloads the audio');
assert.equal(stored.size,0,'Close removes the saved playback session');
player.playTrack('first',0);
audio.currentTime=46.2;
audio.events.timeupdate?.();
const resume=JSON.parse(sessionStorage.getItem('stoneprism:jukebox:resume-v1'));
assert.equal(resume.slug,'first','Current song is saved for reload');
assert.equal(resume.index,0);
assert.equal(resume.playing,true);
assert.equal(resume.position,46.2);
const code=fs.readFileSync('player-v3.js','utf8');
assert.ok(!/WaveSurfer\.create|loadWaveSurfer|drawWave/.test(code),'No second MP3 download for waveform rendering');
assert.match(code,/createAnalyser\(/,'A real-time analyser is used for the vertical spectrum');
const newEvents={};
const refreshedDocument={...document,addEventListener:(event,handler)=>{newEvents[event]=handler}};
const refreshedWindow={...window,STONE_PRISM_PLAYER:undefined};
const refreshedSandbox={...sandbox,document:refreshedDocument,window:refreshedWindow};
vm.runInNewContext(code,refreshedSandbox);
newEvents.DOMContentLoaded?.();
assert.equal(elements.length,2,'Reload creates a new audio element');
assert.equal(elements[1].src,'https://example.net/one.mp3','Reload restores the saved song');
assert.equal(elements[1].playCalls,1,'Reload attempts to resume when browser permits autoplay');
console.log('Player V3.1: one-tap, auto-advance, reload recovery, real-time spectrum and one-stream checks passed.');
