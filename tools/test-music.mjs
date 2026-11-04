import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const built=fs.readFileSync('data/site-content.js','utf8');
const sandbox={window:{}};
vm.runInNewContext(built,sandbox);
const site=sandbox.window.STONE_PRISM_CONTENT;
assert.ok(site,'Site content must be generated');
assert.ok(Array.isArray(site.recordings),'Recordings must exist');
const acoustic=site.recordings.find(r=>r.slug==='i-need-you-live-acoustic');
assert.ok(acoustic,'The existing public recording must be preserved');
assert.equal(acoustic.tracks[0].audio_url,'','A YouTube link must not be passed to HTML Audio');
assert.match(acoustic.tracks[0].youtube_url,/^https:\/\/www\.youtube\.com\/watch\?v=zvHoJMJKBbY$/);
assert.equal(site.recordings.some(r=>r.slug==='hole-demo'),false,'Drafts must stay unpublished');
for(const record of site.recordings){
 for(const track of record.tracks){
  assert.ok(typeof track.audio_url==='string','Audio URLs must be strings');
  assert.ok(typeof track.youtube_url==='string','Video URLs must be strings');
  assert.ok(!/^https?:\/\/(?:www\.)?(?:youtu\.be|youtube\.com)\//i.test(track.audio_url),'YouTube is not an audio source');
  if(track.youtube_url)assert.match(track.youtube_url,/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/);
 }
}
console.log('Stone Prism Player V2: content, separation, video URL, and draft tests passed.');
