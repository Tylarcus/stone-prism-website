import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const sandbox={window:{}};
vm.runInNewContext(fs.readFileSync('data/site-content.js','utf8'),sandbox);
const built=sandbox.window.STONE_PRISM_CONTENT;
assert.ok(built,'Site content must be generated');
assert.ok(Array.isArray(built.recordings),'Recordings must be an array');
assert.ok(Array.isArray(built.visuals),'Visuals must be an array');
assert.equal(typeof built.siteText,'object','CMS text must be preserved');

const sourceDir='content/recordings';
const entries=fs.readdirSync(sourceDir).filter(n=>n.endsWith('.json'))
 .map(n=>JSON.parse(fs.readFileSync(path.join(sourceDir,n),'utf8')));
const expected=entries.filter(e=>e.status==='published');
assert.equal(built.recordings.length,expected.length,'Only published entries may appear on site');

const seen=new Set();
for(const rec of built.recordings){
 assert.ok(!seen.has(rec.slug),'Public recording slugs must be unique');
 seen.add(rec.slug);
 const original=expected.find(e=>e.slug===rec.slug);
 assert.ok(original,'A draft or unknown recording was published');
 assert.equal(rec.tracks.length,Array.isArray(original.tracks)?original.tracks.filter(t=>t&&typeof t.title==='string').length:0);
 for(const track of rec.tracks){
  assert.equal(typeof track.audio_url,'string');
  assert.equal(typeof track.youtube_url,'string');
  if(track.audio_url){
   assert.ok(!/^https?:\/\/(?:www\.)?(?:youtu\.be|youtube\.com)\//i.test(track.audio_url),
    'YouTube must never be passed to HTML audio');
  }
  if(track.youtube_url)assert.match(track.youtube_url,
   /^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/,
   'YouTube video URLs must be canonical and safe for an iframe');
 }
}

const homeConfig=JSON.parse(fs.readFileSync('content/home-music.json','utf8'));
assert.ok(Array.isArray(homeConfig),'Homepage CMS list must be an array');
assert.ok(Array.isArray(built.homeMusic),'Homepage cards must be compiled into site data');
const expectedHome=[];
for(const pick of homeConfig){
 if(!pick||pick.hidden===true)continue;
 const recSlug=typeof pick.recording==='string'?pick.recording.trim():'';
 const visualSlug=typeof pick.visual==='string'?pick.visual.trim():'';
 if(recSlug){
  if(built.recordings.find(r=>r.slug===recSlug))expectedHome.push({kind:'recording',slug:recSlug});
 }else if(visualSlug){
  if(built.visuals.find(v=>v.slug===visualSlug))expectedHome.push({kind:'visual',slug:visualSlug});
 }
}
const actualHome=Array.from(built.homeMusic,x=>({kind:x.kind,slug:x.slug}));
assert.deepEqual(actualHome,expectedHome,'Homepage cards must follow CMS order and include only published sources');
for(const pick of built.homeMusic){
 assert.ok(pick.kind==='recording'||pick.kind==='visual','Home card type must be validated');
 assert.equal(typeof pick.title,'string');
 assert.equal(typeof pick.subtitle,'string');
 assert.ok(pick.title.length<=120&&pick.subtitle.length<=120,'Home card captions must be bounded');
}
assert.match(fs.readFileSync('script.js','utf8'),/function initHomepageMusic\(\)/,'Home renderer must be available');
console.log('Homepage CMS: ordered picks, artwork references and draft hiding passed.');

console.log('Stone Prism Player V2: CMS publishing, audio and video separation checks passed.');
