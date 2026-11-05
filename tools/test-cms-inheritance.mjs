// CMS regression checks use synthetic fixtures in a temporary copy.
// Never assume a real band's cover art, song titles or layout values stay fixed:
// editing them in Pages CMS must not break the next website deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stone-prism-cms-test-'));
try {
 fs.mkdirSync(path.join(tmp,'tools'),{recursive:true});
 fs.cpSync(path.join(root,'tools','build.mjs'),path.join(tmp,'tools','build.mjs'));
 fs.cpSync(path.join(root,'content'),path.join(tmp,'content'),{recursive:true});
 const file=relative=>path.join(tmp,relative);
 const load=relative=>JSON.parse(fs.readFileSync(file(relative),'utf8'));
 const save=(relative,obj)=>fs.writeFileSync(file(relative),JSON.stringify(obj,null,2));
 const build=()=>{
  execFileSync(process.execPath,[file('tools/build.mjs')],{cwd:tmp,stdio:'pipe'});
  const win={};
  vm.runInNewContext(fs.readFileSync(file('data/site-content.js'),'utf8'),{window:win});
  return win.STONE_PRISM_CONTENT;
 };
 const current=build();
 assert.ok(current.recordings.every(r=>r.artwork_custom===Boolean(
  current.visuals.some(v=>v.slug===r.artwork_visual)
 )),'Existing CMS cover choices should resolve only to published Visual Archive entries');
 // Any valid CMS default is allowed; the band may edit all twelve whenever it wants.
 for(const group of ['homepage_music','homepage_visuals','music','visuals']){
  for(const mode of ['phone','tablet','desktop']){
   const n=current.layoutDefaults[group][mode];
   assert.ok(Number.isInteger(n)&&n>=1&&n<=5,'Each compiled grid default must be 1–5');
  }
 }
 const fixtureSlug='cms-test-recording';
 const primarySlug='cms-test-primary';
 const featuredSlug='cms-test-featured';
 const recordingFile='content/recordings/'+fixtureSlug+'.json';
 const primaryFile='content/visuals/'+primarySlug+'.json';
 const featuredFile='content/visuals/'+featuredSlug+'.json';
 // These made-up files live only inside the temporary directory.
 const recording={
  title:'CMS Test Recording',slug:fixtureSlug,kind:'demo',release_type:'demo',
  status:'published',artwork:'assets/angel.webp',artwork_visual:'',
  tracks:[{title:'Fixture',audio_url:''}]
 };
 const primary={
  title:'Test Primary Image',slug:primarySlug,image:'assets/frog-cover.webp',
  category:'illustration',published:true
 };
 const featured={
  title:'Test Featured Image',slug:featuredSlug,image:'assets/teeth.webp',
  category:'collage',published:true
 };
 save(recordingFile,recording);
 save(primaryFile,primary);
 save(featuredFile,featured);
 const home=load('content/home-music.json');
 home.push({recording:fixtureSlug,visual:'',artwork_visual_override:'',hidden:false});
 save('content/home-music.json',home);

 // New categories created through the CMS collection must immediately
 // become choices for artwork and appear in the public Visual Archive filters.
 const newCategoryFile='content/visual-category-options/polaroids.json';
 save(newCategoryFile,{id:'polaroids',label:'Polaroids'});
 primary.category='polaroids';
 save(primaryFile,primary);
 const initial=build();
 assert.ok(initial.visualCategories.some(x=>x.id==='polaroids'&&x.label==='Polaroids'),
  'A new category in the CMS collection must appear automatically in site filters');
 assert.equal(initial.visuals.find(x=>x.slug===primarySlug).category,'polaroids',
  'Artwork must retain its selected category ID');
 const initialRec=initial.recordings.find(r=>r.slug===fixtureSlug);
 assert.equal(initialRec.uploaded_artwork,'assets/angel.webp');
 assert.equal(initialRec.artwork,initialRec.uploaded_artwork,
  'No reference means use the original uploaded art');
 assert.equal(initialRec.artwork_custom,false);

 recording.artwork_visual=primarySlug;
 save(recordingFile,recording);
 const entry=home.at(-1);
 entry.artwork_visual_override=featuredSlug;
 save('content/home-music.json',home);
 const layout=load('content/layout-defaults.json');
 layout.homepage_music.phone=4;
 layout.homepage_visuals.tablet='2';
 layout.music.desktop=5;
 layout.visuals.phone=1;
 save('content/layout-defaults.json',layout);
 const alternate=build();
 const rec=alternate.recordings.find(r=>r.slug===fixtureSlug);
 assert.equal(rec.artwork,'assets/frog-cover.webp',
  'The recording can use a published Visual Archive cover');
 assert.equal(rec.uploaded_artwork,'assets/angel.webp',
  'Original uploaded artwork remains intact');
 assert.equal(rec.artwork_custom,true);
 assert.equal(alternate.homeMusic.find(p=>p.slug===fixtureSlug).artwork_override,
  'assets/teeth.webp','Homepage cover override must be separate from recording cover');
 assert.equal(alternate.layoutDefaults.homepage_music.phone,4);
 assert.equal(alternate.layoutDefaults.homepage_visuals.tablet,2);
 assert.equal(alternate.layoutDefaults.music.desktop,5);
 assert.equal(alternate.layoutDefaults.visuals.phone,1);

 // If a CMS user selects a recording AND a Visual Archive image in the same
 // homepage card, honor that second selection as a legacy card-cover override.
 entry.artwork_visual_override='';
 entry.visual=featuredSlug;
 save('content/home-music.json',home);
 const legacy=build();
 assert.equal(legacy.homeMusic.find(p=>p.slug===fixtureSlug).artwork_override,
  'assets/teeth.webp','Recordings with a visual selection must honor it as cover art');
 entry.visual='';
 entry.artwork_visual_override='missing-visual';
 recording.artwork_visual='missing-visual';
 save('content/home-music.json',home);
 save(recordingFile,recording);
 layout.homepage_music.phone=99;
 layout.visuals.phone=0;
 save('content/layout-defaults.json',layout);
 const missing=build();
 const noArt=missing.recordings.find(r=>r.slug===fixtureSlug);
 assert.equal(noArt.artwork,'assets/angel.webp','Broken archive references revert to original');
 assert.equal(noArt.artwork_custom,false);
 assert.equal(missing.homeMusic.find(p=>p.slug===fixtureSlug).artwork_override,'');
 assert.equal(missing.layoutDefaults.homepage_music.phone,2);
 assert.equal(missing.layoutDefaults.visuals.phone,3);

 recording.artwork_visual=primarySlug;
 save(recordingFile,recording);
 primary.published=false;
 save(primaryFile,primary);
 const unpublished=build();
 assert.equal(unpublished.recordings.find(r=>r.slug===fixtureSlug).artwork,
  'assets/angel.webp','Unpublished Visual Archive art never changes public recording');
 assert.ok(!unpublished.visuals.some(v=>v.slug===primarySlug));
 console.log('CMS tests passed: arbitrary live content, non-destructive art, homepage overrides, unpublished fallback and all layout settings.');
} finally {
 fs.rmSync(tmp,{recursive:true,force:true});
}
