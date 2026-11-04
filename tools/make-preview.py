from pathlib import Path
import mimetypes,base64,re,json,html
from bs4 import BeautifulSoup
root=Path(__file__).resolve().parent.parent
asset_map={}
for p in sorted((root/'assets').iterdir()):
 if p.is_file():
  mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
  asset_map[f'assets/{p.name}']=f'data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}'
for p in sorted((root/'media/images').iterdir()):
 if p.is_file():
  mime=mimetypes.guess_type(p.name)[0] or 'application/octet-stream'
  asset_map[f'media/images/{p.name}']=f'data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}'
css=(root/'styles.css').read_text()
css=re.sub(r'url\(([\'"]?)(assets/[^)\'"]+)\1\)',lambda m:f'url("{asset_map.get(m.group(2),m.group(2))}")',css)

def get_page(name):
 parsed=BeautifulSoup((root/name).read_text(),'html.parser')
 main=parsed.select_one('main')
 return str(main)
pages={'home':get_page('index.html'),'music':get_page('music.html'), 'visuals':get_page('visuals.html'),'recording':get_page('recording.html')}
jsonsafe=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('>','\\u003e').replace('&','\\u0026')
initial=(root/'index.html').read_text()
initial=re.sub(r'<link[^>]+href="styles.css"[^>]*>',lambda m:'<style>'+css+'</style>',initial,flags=re.I)
# Home images are populated from the single shared asset map at runtime.
# This avoids embedding every PNG/WebP a second time inside the HTML.
# Replace script tag with all scripts + route function
initial=initial.replace('<script src="data/site-content.js"></script>', '<script>'+ (root/'data/site-content.js').read_text()+'</script>')
initial=initial.replace('<script src="script.js"></script>','')
head_import='''<script>window.STONE_PRISM_PREVIEW_ASSETS=__MAP__;</script>'''.replace('__MAP__',jsonsafe(asset_map))
initial=initial.replace('</head>',head_import+'</head>')

router='''
<script id="sp-preview-page-fragments" type="application/json">__PAGES__</script>
<script>
(()=>{
 const pages=JSON.parse(document.getElementById('sp-preview-page-fragments').textContent);
 const map=window.STONE_PRISM_PREVIEW_ASSETS||{};
 const main=document.querySelector('main');let current='home';
 function route(name,slug='',anchor=''){
  if(!pages[name])return;
  window.STONE_PRISM_APP?.stopAudio?.();
  window.STONE_PRISM_PREVIEW_SLUG=slug;
  current=name;
  if(name==='home'&&anchor&&!main)return;
  main.innerHTML=pages[name].replace(/^<main[^>]*>/i,'').replace(/<\/main>\s*$/i,'');
  main.querySelectorAll('img[src]').forEach(img=>{const asset=img.getAttribute('src');if(map[asset])img.src=map[asset]});
  document.title=({home:'Stone Prism',music:'Music / Releases | Stone Prism',visuals:'Visual Archive | Stone Prism',recording:'Recording | Stone Prism'})[name];
  window.STONE_PRISM_APP?.init?.();
  window.scrollTo({top:0,behavior:'instant'});
  if(anchor){const node=document.getElementById(anchor);if(node)node.scrollIntoView({block:'start',behavior:'instant'})}
 }
 document.addEventListener('click',event=>{
  const a=event.target.closest('a[href]');if(!a)return;
  const href=a.getAttribute('href')||'';
  if(/^(https?:|mailto:|tel:|data:)/i.test(href))return;
  const match=href.match(/^(index|music|visuals|recording)\.html(?:\?([^#]*))?(?:#(.+))?$/i);
  if(match){event.preventDefault();const slug=new URLSearchParams(match[2]||'').get('slug')||'';route(match[1]==='index'?'home':match[1],slug,match[3]||'');return}
  if(href.startsWith('#')&&current!=='home'&&(href==='#about'||href==='#contact')){event.preventDefault();route('home','',href.slice(1))}
 },true);
 window.STONE_PRISM_PREVIEW_NAV=route;
})();
</script>
'''.replace('__PAGES__',jsonsafe(pages))
hydrate="""<script>
document.querySelectorAll('img[src]').forEach(img=>{
 const src=img.getAttribute('src');
 const mapped=window.STONE_PRISM_PREVIEW_ASSETS?.[src];
 if(mapped)img.src=mapped;
});
</script>"""
initial=initial.replace('</body>',hydrate+'<script>'+ (root/'script.js').read_text() +'</script>'+router+'</body>')
out=Path('/mnt/data/Stone_Prism_V2_5_Interactive_Preview.html')
out.write_text(initial)
print(out,'bytes',out.stat().st_size)
