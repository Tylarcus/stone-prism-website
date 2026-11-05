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

const categoryFolder='content/visual-category-options';
const categoryEntries=fs.readdirSync(categoryFolder)
 .filter(name=>name.endsWith('.json'))
 .map(name=>JSON.parse(fs.readFileSync(path.join(categoryFolder,name),'utf8')));
for(const entry of categoryEntries){
 assert.ok(built.visualCategories.some(x=>x.id===entry.id&&x.label===entry.label),
  'New Visual Categories must automatically appear in public category filters');
}
const config=fs.readFileSync('.pages.yml','utf8');
const artFields=config.slice(config.indexOf('  - name: visuals\n    label: Visual Archive'),config.indexOf('  - name: visual_categories\n'));
assert.match(artFields,/- name: category\n\s+label: Artwork category\n\s+type: reference/,
 'Art category must be a searchable CMS choice, not a manually typed ID');
assert.match(artFields,/collection: visual_categories\n\s+value: "\{fields.id\}"\n\s+label: "\{fields.label\}"/,
 'Art category picker must display readable labels and store original IDs');
const musicFields=config.slice(config.indexOf('  - name: recordings\n'),config.indexOf('  - name: visuals\n    label: Visual Archive'));
assert.match(musicFields,/- name: kind\n\s+label: Music category \(choose one\)\n\s+type: select/,
 'Music library category must remain a dropdown');
assert.match(musicFields,/- name: release_type\n\s+label: Recording format \(choose one\)\n\s+type: select/,
 'Music format must remain a dropdown');


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

const pageJS=fs.readFileSync('script.js','utf8');
const cardStart=pageJS.indexOf('function makeRecording(rec){');
const cardEnd=pageJS.indexOf('function initMusic(){');
assert.ok(cardStart>=0&&cardEnd>cardStart,'Music library renderer must exist');
const musicCard=pageJS.slice(cardStart,cardEnd);
assert.match(musicCard,/addCoverBadge\(art,rec\)/,'Type badge must be added to cover artwork');
assert.match(pageJS,/function addCoverBadge\(art,rec\)/,'Shared homepage and Music badge renderer must exist');
assert.match(pageJS,/sp-recording-cover-tag/,'Badge uses correct overlay class');
assert.match(musicCard,/release-foot/,'Card must use homepage foot layout');
assert.match(musicCard,/release-name/,'Card must show recording title');
assert.match(musicCard,/release-sub/,'Card must show short CMS description');
assert.match(musicCard,/play-circle/,'Card must have one circular action');
assert.doesNotMatch(musicCard,/sp-recording-details|Track details|Watch \/ Details/,'No redundant detail rows allowed');
const siteCSS=fs.readFileSync('styles.css','utf8');
assert.match(siteCSS,/\.library-grid \.recording-card \.release-foot/,
 'Music page must have compact homepage-style foot layout');
assert.match(siteCSS,/\.library-grid \.sp-recording-cover-tag/,
 'Release badge must overlay cover artwork');
console.log('Music library cards: compact homepage-style layout and no redundant links passed.');


const visualsConfig=JSON.parse(fs.readFileSync('content/home-visuals.json','utf8'));
assert.ok(Array.isArray(visualsConfig),'Homepage Visual Archive must be an editable CMS list');
assert.ok(Array.isArray(built.homeVisuals),'Compiled homepage visuals must exist');
const seenVisuals=new Set();
const expectedVisuals=visualsConfig.filter(p=>p&&p.hidden!==true).map(p=>p.visual)
 .filter(slug=>{
  if(seenVisuals.has(slug))return false;
  if(!built.visuals.some(v=>v.slug===slug))return false;
  seenVisuals.add(slug);return true;
 });
assert.deepEqual(Array.from(built.homeVisuals,x=>x.slug),expectedVisuals,
 'Homepage Visual Archive must preserve CMS order, omit hidden/drafts and deduplicate');
const musicHtml=fs.readFileSync('music.html','utf8');
assert.doesNotMatch(musicHtml,/data-cms-text="music\.archive_heading"/,
 'Duplicate artwork section must not appear on the Music page');
assert.doesNotMatch(musicHtml,/Audio link not yet available/,
 'Music must not show fake artwork-only audio placeholders');
const uiSrc=fs.readFileSync('script.js','utf8');
assert.match(uiSrc,/function openYouTube\(rec,id\)/,'One-tap YouTube dialog function must exist');
assert.match(uiSrc,/function videoPoster\(id\)/,'YouTube-only cards need genuine video thumbnails');
assert.match(uiSrc,/function videoIdForSingle\(rec\)/,'Only single-track videos should open directly');
assert.match(uiSrc,/function addCoverBadge\(art,rec\)/,'Homepage and Music cards need shared badges');
assert.match(uiSrc,/data\.homeVisuals/,'Homepage visuals must use ordered CMS picks');
assert.match(fs.readFileSync('styles.css','utf8'),/\.sp-youtube-dialog-screen/,
 'Embedded YouTube video must have a responsive player');
console.log('Player V3.5: home visuals, single/video badges, YouTube viewer and music-only vault passed.');


// The CMS must make the visibility flag obvious and default NEW archive items
// to public while allowing owners to explicitly switch individual entries off.
const visualCms=fs.readFileSync('.pages.yml','utf8');
const publishedField=visualCms.slice(visualCms.indexOf('  - name: visuals\n    label: Visual Archive'),
 visualCms.indexOf('  - name: visual_categories\n'));
assert.match(publishedField,/- name: published\n\s+label: Show on website\n\s+type: boolean\n\s+default: true/,
 'New Visual Archive entries should be visible by default');
const visualSources=fs.readdirSync('content/visuals').filter(n=>n.endsWith('.json'))
 .map(n=>JSON.parse(fs.readFileSync(path.join('content/visuals',n),'utf8')));
for(const visual of visualSources){
 if(visual.published!==true||typeof visual.image!=='string'||!visual.image.trim())continue;
 assert.ok(built.visuals.some(x=>x.slug===visual.slug),
  'A published Visual Archive entry must appear in the generated archive: '+visual.slug);
}
console.log('Visual Archive visibility: published entries included, hidden entries excluded, new entries default visible.');

console.log('Stone Prism Player V2: CMS publishing, audio and video separation checks passed.');
