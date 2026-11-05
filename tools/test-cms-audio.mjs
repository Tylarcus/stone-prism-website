// Regression-test Pages CMS MP3 picker without uploading real music or using R2 secrets.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const root=process.cwd(),tmp=fs.mkdtempSync(path.join(os.tmpdir(),'sp-audio-cms-'));
try{
 fs.mkdirSync(path.join(tmp,'tools'),{recursive:true});
 fs.cpSync(path.join(root,'tools/build.mjs'),path.join(tmp,'tools/build.mjs'));
 fs.cpSync(path.join(root,'content'),path.join(tmp,'content'),{recursive:true});
 // Test only the synthetic CMS recording. Production content (such as Zodiac)
 // can legitimately reference newly uploaded MP3s that are not part of this
 // small temporary fixture. The real publisher validates all actual files
 // separately with `node tools/build.mjs` before running this test.
 const fixtureRecordingsDir=path.join(tmp,'content','recordings');
 for(const filename of fs.readdirSync(fixtureRecordingsDir)){
  if(filename.endsWith('.json')) fs.rmSync(path.join(fixtureRecordingsDir,filename));
 }
 fs.mkdirSync(path.join(tmp,'media/audio'),{recursive:true});
 const testSong='cms-upload-test-1001.mp3';
 fs.writeFileSync(path.join(tmp,'media/audio',testSong),'synthetic-test-audio-not-for-playback');
 const recordingFile=path.join(tmp,'content/recordings','cms-auto-audio-fixture.json');
 const recording={title:'CMS Audio Test',slug:'cms-auto-audio-fixture',
  kind:'demo',release_type:'demo',status:'published',
  tracks:[{title:'Uploaded song',
   audio_file:'/media/audio/'+testSong,
   audio_url:'https://pub-example.r2.dev/old-ignored.mp3'}]};
 const run=()=>{
  fs.writeFileSync(recordingFile,JSON.stringify(recording));
  execFileSync(process.execPath,[path.join(tmp,'tools/build.mjs')],{cwd:tmp,stdio:'pipe'});
  const sandbox={window:{}};
  vm.runInNewContext(fs.readFileSync(path.join(tmp,'data/site-content.js'),'utf8'),sandbox);
  return sandbox.window.STONE_PRISM_CONTENT;
 };
 const config=JSON.parse(fs.readFileSync(path.join(tmp,'content/audio-host.json'),'utf8'));
 const url=config.public_base_url+'/'+config.object_prefix+'/'+testSong;
 const built=run();
 const track=built.recordings.find(x=>x.slug===recording.slug)?.tracks[0];
 assert.equal(track.audio_url,url,'New MP3 picker should map to public R2 key and override legacy link');
 assert.equal(track.youtube_url,'');
 // Legacy links remain unmodified and do not need a new upload.
 recording.tracks[0].audio_file='';
 recording.tracks[0].audio_url='https://pub-example.r2.dev/old-unchanged.mp3';
 const legacy=run().recordings.find(x=>x.slug===recording.slug)?.tracks[0];
 assert.equal(legacy.audio_url,'https://pub-example.r2.dev/old-unchanged.mp3');
 // Missing or unsafe local files must cause a failed build, not publish broken links.
 recording.tracks[0].audio_file='/media/audio/missing-song.mp3';
 assert.throws(run,/Command failed/);
 recording.tracks[0].audio_file='/media/audio/../secret.mp3';
 assert.throws(run,/Command failed/);
 // CMS file field selection & publisher requirements.
 const cms=fs.readFileSync('.pages.yml','utf8');
 assert.match(cms,/name: song_uploads[\s\S]*?input: media\/audio[\s\S]*?extensions: \[mp3\]/);
 assert.match(cms,/- name: audio_file\n\s+label: Upload MP3 \(no Cloudflare login\)\n\s+type: file[\s\S]*?media: song_uploads/);
 const workflow=fs.readFileSync('.github/workflows/deploy-pages.yml','utf8');
 assert.ok(workflow.indexOf('Copy MP3s chosen in Pages CMS into Cloudflare R2')<
  workflow.indexOf('- name: Generate published content'),'R2 sync must occur before site build');
 assert.match(workflow,/aws s3 sync media\/audio\//,'Song files must sync to R2');
 assert.match(workflow,/AWS_SECRET_ACCESS_KEY: \$\{\{ secrets\.R2_SECRET_ACCESS_KEY \}\}/,
  'R2 credential must come from GitHub Actions secret');
 assert.ok(!workflow.includes('cp -R media _site/'),'Published Pages bundle must not contain MP3 staging');
 assert.match(workflow,/cp -R media\/images _site\/media\//,
  'Artwork must continue deploying unchanged');
 console.log('CMS MP3 picker: R2 mapping, existing links, missing file failure, workflow secrets and media staging passed.');
}finally{
 fs.rmSync(tmp,{recursive:true,force:true});
}
