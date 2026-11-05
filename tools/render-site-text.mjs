// Apply CMS text at build time so page copy and SEO are present without JavaScript.
// Source HTML is never modified; GitHub Actions invokes this on the staged _site.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dir=path.resolve(process.argv[2]||path.join(root,'_site'));
const text=JSON.parse(fs.readFileSync(path.join(root,'content/site-text.json'),'utf8'));
const lookup=key=>key.split('.').reduce((v,k)=>v&&typeof v==='object'&&Object.hasOwn(v,k)?v[k]:null,text);
const esc=v=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const origin='https://stoneprism.music';
const socialArtwork=origin+'/assets/hero-flower.webp';
const canonicalPaths={home:'/',music:'/music.html',visuals:'/visuals.html'};
const safeJson=value=>JSON.stringify(value).replace(/</g,'\\u003c').replace(/>/g,'\\u003e').replace(/&/g,'\\u0026');
function seoHead(page){
 const canonical=canonicalPaths[page] ? origin+canonicalPaths[page] : null;
 const title=lookup('seo.'+page+'.title')||'Stone Prism';
 const description=lookup('seo.'+page+'.description')||'Music and art from Stone Prism.';
 const tags=[
  '<meta property="og:site_name" content="Stone Prism"/>',
  '<meta property="og:type" content="website"/>',
  '<meta property="og:title" content="'+esc(title)+'"/>',
  '<meta property="og:description" content="'+esc(description)+'"/>',
  '<meta property="og:image" content="'+socialArtwork+'"/>',
  '<meta name="twitter:card" content="summary_large_image"/>'
 ];
 if(canonical){
  tags.push('<link rel="canonical" href="'+canonical+'"/>');
  tags.push('<meta property="og:url" content="'+canonical+'"/>');
 }
 if(page==='home'){
  const band={'@type':'MusicGroup','@id':origin+'/#band',name:'Stone Prism',
   url:origin+'/',genre:['Grunge Rock','Alternative Rock'],
   foundingDate:'2015',image:socialArtwork,
   description};
  const website={'@type':'WebSite','@id':origin+'/#website',
   name:'Stone Prism',url:origin+'/',publisher:{'@id':origin+'/#band'}};
  tags.push('<script type="application/ld+json" data-sp-seo>'+safeJson({
   '@context':'https://schema.org','@graph':[band,website]
  })+'</script>');
 }
 return tags.join('\n');
}

for(const [file,page] of [['index.html','home'],['music.html','music'],['visuals.html','visuals'],['recording.html','recording']]){
 const filename=path.join(dir,file);
 let html=fs.readFileSync(filename,'utf8');
 html=html.replace(/(<([a-z][a-z0-9-]*)\b[^>]*\bdata-cms-text="([^"]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,(whole,open,tag,key,old,close)=>{
  const value=lookup(key);return typeof value==='string'?open+esc(value)+close:whole;
 });
 // A successful CMS publish creates new site-content.js. Version the staged
 // CSS/JS URLs by commit so mobile browsers do not reuse stale metadata/artwork.
 // Source HTML stays untouched; only the deployed _site copy is modified.
 const revision=(process.env.GITHUB_SHA||'').slice(0,12);
 if(revision){
  html=html.replace(/(href|src)="(styles[.]css|script[.]js|player-v3[.]js|data[/]site-content[.]js)"/g,
   (all,attribute,asset)=>attribute+'="'+asset+'?v='+revision+'"');
 }
 const title=lookup(`seo.${page}.title`),description=lookup(`seo.${page}.description`);
 if(typeof title==='string'&&title)html=html.replace(/<title>[\s\S]*?<\/title>/i,`<title>${esc(title)}</title>`);
 if(typeof description==='string')html=html.replace(/<meta\b[^>]*\bname="description"[^>]*>/i,tag=>tag.replace(/\bcontent="[^"]*"/,`content="${esc(description)}"`));
 html=html.replace(/<\/head>/i,seoHead(page)+'\n</head>');
 fs.writeFileSync(filename,html);
}
console.log('Stone Prism website text and search metadata rendered into static pages');


// The XML sitemap and robots.txt are generated in the staged public directory,
// not source files. No keyword stuffing, tracking pixels, or false SEO promises.
const publicPages=['/','/music.html','/visuals.html'];
const songs=fs.readdirSync(path.join(root,'content/recordings'))
 .filter(file=>file.endsWith('.json'))
 .map(file=>JSON.parse(fs.readFileSync(path.join(root,'content/recordings',file),'utf8')))
 .filter(record=>record.status==='published'&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug))
 .map(record=>'/recording.html?slug='+encodeURIComponent(record.slug));
const xmlEsc=value=>String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const locs=[...publicPages,...new Set(songs)];
const sitemap='<?xml version="1.0" encoding="UTF-8"?>\n'
 +'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
 +locs.map(loc=>'  <url><loc>'+xmlEsc(origin+loc)+'</loc></url>').join('\n')
 +'\n</urlset>\n';
fs.writeFileSync(path.join(dir,'sitemap.xml'),sitemap);
fs.writeFileSync(path.join(dir,'robots.txt'),
 'User-agent: *\nAllow: /\n\nSitemap: '+origin+'/sitemap.xml\n');
console.log('Stone Prism search metadata: '+locs.length+' sitemap URLs, canonical and social/JSON-LD tags generated.');
