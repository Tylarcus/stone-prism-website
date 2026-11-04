import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'stone-prism-cms-test-'));
try{
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
 const originals=build();
 const angelBefore=originals.recordings.find(r=>r.slug==='angel-demo');
 assert.ok(angelBefore,'Angel demo must remain in the recording library');
 assert.equal(angelBefore.artwork,angelBefore.uploaded_artwork,'Original artwork remains default');
 assert.equal(angelBefore.artwork_custom,false,'No archive choice means standard cover');
 assert.equal(originals.layoutDefaults.homepage_music.phone,2);
 assert.equal(originals.layoutDefaults.homepage_visuals.desktop,5);
 assert.equal(originals.layoutDefaults.music.desktop,4);

 const angelFile='content/recordings/angel-demo.json';
 const record=load(angelFile);
 record.artwork_visual='frog-cover';
 save(angelFile,record);
 const home=load('content/home-music.json');
 const featured=home.find(r=>r.recording==='angel-demo');
 assert.ok(featured,'Angel must have a homepage feature');
 featured.artwork_visual_override='teeth-concept';
 save('content/home-music.json',home);
 const layout=load('content/layout-defaults.json');
 layout.homepage_music.phone=4;
 layout.homepage_visuals.tablet='2'; // Pages CMS select values are strings.
 layout.music.desktop=5;
 layout.visuals.phone=1;
 save('content/layout-defaults.json',layout);

 const alternate=build();
 const frog=alternate.visuals.find(v=>v.slug==='frog-cover');
 const teeth=alternate.visuals.find(v=>v.slug==='teeth-concept');
 const angel=alternate.recordings.find(r=>r.slug==='angel-demo');
 assert.ok(frog&&teeth,'Both references must be published Visual Archive images');
 assert.equal(angel.artwork,frog.image,'Recording inherits selected published archive art');
 assert.equal(angel.uploaded_artwork,angelBefore.uploaded_artwork,'Original uploaded artwork never overwritten');
 assert.equal(angel.artwork_custom,true,'UI distinguishes intentional cover override from automatic YouTube thumbnail');
 assert.equal(alternate.homeMusic.find(p=>p.slug==='angel-demo').artwork_override,teeth.image,
  'Homepage override is independent of recording primary artwork');
 assert.equal(alternate.layoutDefaults.homepage_music.phone,4);
 assert.equal(alternate.layoutDefaults.homepage_visuals.tablet,2);
 assert.equal(alternate.layoutDefaults.music.desktop,5);
 assert.equal(alternate.layoutDefaults.visuals.phone,1);

 record.artwork_visual='not-published';
 save(angelFile,record);
 featured.artwork_visual_override='not-published';
 save('content/home-music.json',home);
 layout.homepage_music.phone=99;
 layout.visuals.phone=0;
 save('content/layout-defaults.json',layout);
 const missing=build();
 const restored=missing.recordings.find(r=>r.slug==='angel-demo');
 assert.equal(restored.artwork,angelBefore.uploaded_artwork,'Invalid/unpublished art falls back to original');
 assert.equal(restored.artwork_custom,false);
 assert.equal(missing.homeMusic.find(p=>p.slug==='angel-demo').artwork_override,'',
  'Broken homepage art references fall back instead of rendering blank');
 assert.equal(missing.layoutDefaults.homepage_music.phone,2,'Out of range values revert to safe default');
 assert.equal(missing.layoutDefaults.visuals.phone,3);

 // An explicitly unpublished archive record is never allowed into a cover.
 record.artwork_visual='frog-cover';
 save(angelFile,record);
 const frogFile='content/visuals/frog-cover.json';
 const unpublished=load(frogFile);
 unpublished.published=false;
 save(frogFile,unpublished);
 const noLeak=build();
 assert.equal(noLeak.recordings.find(r=>r.slug==='angel-demo').artwork,angelBefore.uploaded_artwork);
 assert.ok(!noLeak.visuals.some(v=>v.slug==='frog-cover'));
 console.log('CMS V3.6 inheritance: original preservation, recording/home art priority, unpublished fallback and 12 layout defaults passed.');
}finally{
 fs.rmSync(tmp,{recursive:true,force:true});
}
