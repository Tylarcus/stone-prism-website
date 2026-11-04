import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

class Element{
 constructor(){
  this.dataset={};this.attributes={};this.children=[];this.listeners={};
  this.style={values:{},setProperty:(k,v)=>{this.style.values[k]=v}};
  this.textContent='';
 }
 append(...children){this.children.push(...children)}
 addEventListener(event,handler){this.listeners[event]=handler}
 setAttribute(name,val){this.attributes[name]=val}
 querySelector(sel){
  if(sel==='.grid-density-current')return this.status;
  return null;
 }
 querySelectorAll(sel){return sel==='[data-columns]'?this.buttons||[]:[]}
}
const makeControl=kind=>{
 const e=new Element();e.dataset.gridDensity=kind;e.status=new Element();
 e.buttons=Array.from({length:5},(_,i)=>{const b=new Element();b.dataset.columns=String(i+1);return b});
 return e;
};
const homeMusic=new Element(),homeVisuals=new Element();
homeMusic.children=[new Element(),new Element(),new Element()];
homeVisuals.children=[new Element(),new Element(),new Element()];
const musicGrid=new Element(),visualsGrid=new Element();
const musicControl=makeControl('music'),visualControl=makeControl('visuals');
let activeControl=musicControl;
const saved=new Map(),listeners={};
const win={
 innerWidth:400,
 STONE_PRISM_CONTENT:{
  recordings:[],visuals:[],visualCategories:[],
  layoutDefaults:{
   homepage_music:{phone:2,tablet:3,desktop:4},
   homepage_visuals:{phone:3,tablet:4,desktop:5},
   music:{phone:3,tablet:2,desktop:4},
   visuals:{phone:2,tablet:3,desktop:5}
  }
 },
 localStorage:{
  getItem:key=>saved.get(key)??null,
  setItem:(key,val)=>saved.set(key,String(val)),
  removeItem:key=>saved.delete(key)
 },
 addEventListener:(event,handler)=>{(listeners[event]??=[]).push(handler)}
};
const doc={
 readyState:'loading',
 addEventListener(){},
 querySelector:sel=>{
  if(sel==='.releases .release-grid')return homeMusic;
  if(sel==='[data-cms-featured]')return homeVisuals;
  if(sel==='[data-grid-density]')return activeControl;
  return null;
 },
 querySelectorAll:sel=>{
  if(sel==='[data-adjustable-grid="music"]')return [musicGrid];
  if(sel==='[data-adjustable-grid="visuals"]')return [visualsGrid];
  return [];
 },
 createElement:()=>new Element()
};
let code=fs.readFileSync('script.js','utf8');
code=code.replace('window.STONE_PRISM_APP={',
 'window.SP_LAYOUT_TEST={applyHomepageLayouts,initGridDensity,layoutDefault,layoutMode};window.STONE_PRISM_APP={');
vm.runInNewContext(code,{window:win,document:doc,console});
const ui=win.SP_LAYOUT_TEST;
assert.ok(ui,'Layout functions must exist');

ui.applyHomepageLayouts();
assert.equal(homeMusic.dataset.homeColumns,'2','Home music phone default');
assert.equal(homeVisuals.dataset.homeColumns,'3','Home visuals phone default');
win.innerWidth=830;
listeners.resize.forEach(fn=>fn());
assert.equal(homeMusic.dataset.homeColumns,'3','Home music tablet default');
assert.equal(homeVisuals.dataset.homeColumns,'4','Home visuals tablet default');
win.innerWidth=1200;
listeners.resize.forEach(fn=>fn());
assert.equal(homeMusic.dataset.homeColumns,'3','Three featured music items must fill width despite four-column CMS setting');
assert.equal(homeVisuals.dataset.homeColumns,'3','Three featured visuals must fill width despite five-column CMS setting');
homeMusic.children.push(new Element());
homeVisuals.children.push(new Element());
listeners.resize.forEach(fn=>fn());
assert.equal(homeMusic.dataset.homeColumns,'4','Adding fourth music item activates fourth column');
assert.equal(homeVisuals.dataset.homeColumns,'4','Four visuals expand to four columns');
homeVisuals.children.push(new Element());
listeners.resize.forEach(fn=>fn());
assert.equal(homeVisuals.dataset.homeColumns,'5','Five visuals activate five columns');
homeMusic.children.pop();
homeVisuals.children.pop();
homeVisuals.children.pop();
listeners.resize.forEach(fn=>fn());
assert.equal(homeMusic.dataset.homeColumns,'3','Removing a featured item removes empty grid slot');
assert.equal(homeVisuals.dataset.homeColumns,'3','Visual grid also removes empty grid slots');

win.innerWidth=400;
ui.initGridDensity();
assert.equal(musicGrid.dataset.columns,'3','Music phone CMS default');
assert.equal(musicControl.children.length,1,'Reset to site default added to Music control');
assert.equal(musicControl.children[0].textContent,'Reset to site default');
musicControl.buttons[4].listeners.click(); // Five columns is this visitor's choice.
assert.equal(musicGrid.dataset.columns,'5');
assert.equal(saved.get('stoneprism:v25:columns:music:phone'),'5');
ui.initGridDensity(); // Simulate rebuilding page after navigation.
assert.equal(musicGrid.dataset.columns,'5','Visitor choice wins over CMS site default');
const freshMusicControl=musicControl.children.at(-1);
freshMusicControl.listeners.click();
assert.equal(musicGrid.dataset.columns,'3','Reset restores current CMS default');
assert.equal(saved.has('stoneprism:v25:columns:music:phone'),false,'Reset removes saved preference');

win.innerWidth=830;
listeners.resize.forEach(fn=>fn());
assert.equal(musicGrid.dataset.columns,'2','Tablet default applies after viewport change');
win.innerWidth=1200;
listeners.resize.forEach(fn=>fn());
assert.equal(musicGrid.dataset.columns,'4','Desktop default applies after viewport change');

activeControl=visualControl;
win.innerWidth=400;
ui.initGridDensity();
assert.equal(visualsGrid.dataset.columns,'2','Visual Archive phone default is independent of Music');
visualControl.buttons[0].listeners.click();
assert.equal(visualsGrid.dataset.columns,'1');
visualControl.children[0].listeners.click();
assert.equal(visualsGrid.dataset.columns,'2','Visual Archive reset uses its own CMS default');
assert.equal(saved.has('stoneprism:v25:columns:visuals:phone'),false);

console.log('Layout V3.6 passed: 12 breakpoint defaults, home layouts, visitor precedence and per-section reset.');
