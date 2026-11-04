import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';

const root=process.cwd();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'stone-prism-assets-'));
try {
 for(const name of ['index.html','music.html','visuals.html','recording.html']){
  fs.copyFileSync(path.join(root,name),path.join(temp,name));
 }
 const sha='1234567890abcdef1234567890abcdef12345678';
 execFileSync(process.execPath,[path.join(root,'tools/render-site-text.mjs'),temp],{
  cwd:root,env:{...process.env,GITHUB_SHA:sha},stdio:'pipe'
 });
 for(const file of ['index.html','music.html','visuals.html','recording.html']){
  const html=fs.readFileSync(path.join(temp,file),'utf8');
  for(const asset of ['styles.css','script.js','player-v3.js','data/site-content.js']){
   const escaped=asset.replaceAll('.','[.]');
   assert.match(html,new RegExp('(href|src)="'+escaped+'[?]v='+sha.slice(0,12)+'"'),
    'The '+file+' page must request fresh '+asset+' after a CMS edit');
  }
 }
 assert.doesNotMatch(fs.readFileSync(path.join(root,'index.html'),'utf8'),
  /site-content[.]js[?]v=/,'Build must not alter source HTML');
 console.log('CMS cache-bust test passed: deployed assets use commit revisions while originals stay unchanged.');
}finally{
 fs.rmSync(temp,{recursive:true,force:true});
}
