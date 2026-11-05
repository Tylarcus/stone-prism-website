import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stone-prism-seo-'));
try {
 for(const file of ['index.html','music.html','visuals.html','recording.html']){
  fs.copyFileSync(path.join(root,file),path.join(temp,file));
 }
 execFileSync(process.execPath,[path.join(root,'tools/render-site-text.mjs'),temp],{
  cwd:root,env:{...process.env,GITHUB_SHA:'0'.repeat(40)},stdio:'pipe'
 });
 const cms=JSON.parse(fs.readFileSync('content/site-text.json','utf8'));
 const mappings={home:'index.html',music:'music.html',visuals:'visuals.html',recording:'recording.html'};
 const urls={home:'https://stoneprism.music/',music:'https://stoneprism.music/music.html',
  visuals:'https://stoneprism.music/visuals.html'};
 for(const [page,filename] of Object.entries(mappings)){
  const html=fs.readFileSync(path.join(temp,filename),'utf8');
  assert.ok(html.includes('<title>'+cms.seo[page].title.replaceAll('&','&amp;')+'</title>'),
   filename+' uses editable CMS SEO title');
  assert.ok(html.includes('property="og:title"'),'Social title must be included');
  assert.ok(html.includes('property="og:description"'),'Social description must be included');
  assert.ok(html.includes('property="og:image"'),'Image for sharing must be present');
  assert.ok(html.includes('name="twitter:card"'),'Share card metadata must be present');
  assert.doesNotMatch(html,/name="keywords"/i,'Do not include ignored meta-keywords');
  if(urls[page]){
   assert.ok(html.includes('<link rel="canonical" href="'+urls[page]+'"/>'),
    'Only established canonical pages receive canonical links');
  }else{
   assert.doesNotMatch(html,/rel="canonical"/,'Dynamic recording page must not canonicalize all songs to the same URL');
  }
 }
 const home=fs.readFileSync(path.join(temp,'index.html'),'utf8');
 const ld=home.match(/<script type="application\/ld\+json" data-sp-seo>([\s\S]*?)<\/script>/);
 assert.ok(ld,'Homepage needs band structured data');
 const schema=JSON.parse(ld[1]);
 assert.equal(schema['@context'],'https://schema.org');
 assert.ok(schema['@graph'].some(x=>x['@type']==='MusicGroup'&&x.name==='Stone Prism'),
  'Band identity should be a MusicGroup');
 const recordings=fs.readdirSync('content/recordings').filter(x=>x.endsWith('.json'))
  .map(x=>JSON.parse(fs.readFileSync(path.join('content/recordings',x),'utf8')));
 const sitemap=fs.readFileSync(path.join(temp,'sitemap.xml'),'utf8');
 const urlsInMap=[...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(m=>m[1].replaceAll('&amp;','&'));
 assert.deepEqual(urlsInMap.slice(0,3),[urls.home,urls.music,urls.visuals]);
 const published=recordings.filter(x=>x.status==='published'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(x.slug));
 assert.equal(urlsInMap.length,3+published.length,'Sitemap should list only public pages and published recordings');
 for(const rec of published){
  assert.ok(urlsInMap.includes('https://stoneprism.music/recording.html?slug='+rec.slug),
   'Published song must be discoverable: '+rec.slug);
 }
 for(const draft of recordings.filter(x=>x.status!=='published')){
  assert.ok(!urlsInMap.some(x=>x.endsWith('?slug='+draft.slug)),
   'Unpublished songs must not be listed in the sitemap');
 }
 assert.ok(fs.readFileSync(path.join(temp,'robots.txt'),'utf8')
  .includes('Sitemap: https://stoneprism.music/sitemap.xml'));
 assert.ok(!fs.existsSync(path.join(root,'sitemap.xml')),
  'Generated sitemap should remain in staged output only');
 console.log('Stone Prism SEO: canonical/social/JSON-LD CMS metadata, robots and published-only sitemap verified.');
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
