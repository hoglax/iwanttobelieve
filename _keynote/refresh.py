from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import quote, urlencode
from PIL import Image, ImageFont
from io import BytesIO
import json,re,math,hashlib,time,html

ROOT=Path(".")
CFG=json.loads(Path("_keynote/config.json").read_text())
OUT=Path("_keynote/out");OUT.mkdir(parents=True,exist_ok=True)
def download(url,timeout=35):
    with urlopen(Request(url,headers={"User-Agent":"CityCenterKeynote/1.0 (public presentation; Wikimedia attribution retained)"}),timeout=timeout) as r:return r.read()
def write(path,text):Path(path).write_text(text,encoding="utf-8")
def section(source,id):
    m=re.search(r'<section\b[^>]*\bid="'+id+r'"[^>]*>.*?</section>',source,re.S)
    assert m,id
    return m.group()
def replace_section(source,id,value):return source.replace(section(source,id),value,1)
def normalized(v):
    if isinstance(v,str):return v.replace("\u2014","–")
    if isinstance(v,list):return [normalized(x) for x in v]
    if isinstance(v,dict):return {k:normalized(x) for k,x in v.items()}
    return v

samara_sha=hashlib.sha256(Path("assets/samara.webp").read_bytes()).hexdigest()
data_path=Path("assets/project-data.js")
p=json.loads(data_path.read_text().split("=",1)[1].strip().rstrip(";"))
original=json.loads(json.dumps(p))
credits=json.loads(Path("assets/photo-credits.json").read_text())
for photo in CFG["photos"]:
    filename=photo["filename"]
    stem=filename.replace(" ","_")
    url="https://upload.wikimedia.org/wikipedia/commons/"+photo["hash"]+"/"+quote(stem)
    try:raw=download(url)
    except Exception:
        thumb="https://thumb.wikimedia.org/wikipedia/commons/thumb/"+photo["hash"]+"/"+quote(stem)+"/1920px-"+quote(stem)
        raw=download(thumb)
    im=Image.open(BytesIO(raw));im.load()
    assert im.width>=1000 and im.height>=650,(filename,im.size)
    im=im.convert("RGB");im.thumbnail((2400,1800),Image.Resampling.LANCZOS)
    im.save("assets/"+photo["id"]+".webp","WEBP",quality=91,method=6)
    c=next(c for c in p["cities"] if c["id"]==photo["id"])
    c["image"]="assets/"+photo["id"]+".webp?v=20261103-landmarks"
    c["landmark"]=photo["landmark"]
    credit=next(credit for credit in credits if credit["file"]=="assets/"+photo["id"]+".webp")
    credit.update(source="https://commons.wikimedia.org/wiki/File:"+quote(stem),author=photo["author"],license=photo["license"],licenseUrl=photo["licenseUrl"],modifications="Resized and converted to WebP; cropped in the page layout.")
p["photoCredits"]=credits
p=normalized(p)
# Check every numeric field before and after. Copy/photo fields cannot change the plan.
def numbers(v,path=""):
    if isinstance(v,bool):return {}
    if isinstance(v,(int,float)):return {path:v}
    if isinstance(v,list):
        return {key:value for i,x in enumerate(v) for key,value in numbers(x,path+"/"+str(i)).items()}
    if isinstance(v,dict):return {key:value for k,x in v.items() for key,value in numbers(x,path+"/"+k).items()}
    return {}
assert numbers(p)==numbers(original),"Financial snapshot changed"
write("assets/photo-credits.json",json.dumps(credits,ensure_ascii=False,indent=2)+"\n")
write(data_path,"window.PROJECT = "+json.dumps(p,ensure_ascii=False,indent=2)+";\n")
credit_md="# Фотографии городов\n\nФотографии показывают достопримечательности городов проекта. Они не изображают будущие офисы. Изображения уменьшены, переведены в WebP и кадрируются в оформлении.\n\n"
for c in credits:credit_md+="## "+c["city"]+"\n\n["+c["file"]+"]("+c["source"]+") · "+c["author"]+" · ["+c["license"]+"]("+c["licenseUrl"]+").\n\n"
write("PHOTO-CREDITS.md",credit_md)

# One continuous Lambert-conformal-conic outline, including Kaliningrad and Chukotka.
geo_url="https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_admin_0_countries.geojson"
geo=json.loads(download(geo_url))
russia=next(f for f in geo["features"] if f["properties"].get("ADMIN")=="Russia")
rad=math.pi/180;p1=45*rad;p2=75*rad
n=math.log(math.cos(p1)/math.cos(p2))/math.log(math.tan(math.pi/4+p2/2)/math.tan(math.pi/4+p1/2))
F=math.cos(p1)*math.tan(math.pi/4+p1/2)**n/n
def project(lon,lat):
    if lon<0:lon+=360
    rho=F/math.tan(math.pi/4+lat*rad/2)**n
    theta=n*(lon-100)*rad
    return rho*math.sin(theta),-rho*math.cos(theta)
polys=russia["geometry"]["coordinates"]
if russia["geometry"]["type"]=="Polygon":polys=[polys]
pts=[project(*pt[:2]) for poly in polys for ring in poly for pt in ring]
xs,ys=zip(*pts);xmin,xmax=min(xs),max(xs);ymin,ymax=min(ys),max(ys)
scale=min(1280/(xmax-xmin),550/(ymax-ymin))
ox=(1440-(xmax-xmin)*scale)/2;oy=(650-(ymax-ymin)*scale)/2
def xy(lon,lat):
    x,y=project(lon,lat);return ox+(x-xmin)*scale,oy+(ymax-y)*scale
land=[]
for poly in polys:
    rings=[]
    for ring in poly:
        coords=[xy(*pt[:2]) for pt in ring]
        rings.append("M"+"L".join(f"{x:.1f} {y:.1f}" for x,y in coords)+"Z")
    land.append('<path d="'+"".join(rings)+'" fill="url(#full-russia-land)" stroke="#6f6b633d" stroke-width="1.2" fill-rule="evenodd"/>')
cities=CFG["mapCities"]
for c in cities:c["point"]=xy(c["lon"],c["lat"])
font_path="/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf"
if not Path(font_path).exists():font_path="/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
boxes=[]
# Keep labels away from all city centres, not just previously placed labels.
dots=[(c["point"][0]-6,c["point"][1]-6,c["point"][0]+6,c["point"][1]+6) for c in cities]
def overlaps(a,b,pad=5):return a[0]<b[2]+pad and a[2]>b[0]-pad and a[1]<b[3]+pad and a[3]>b[1]-pad
for c in sorted(cities,key=lambda c:({"project":0,"reference":1,"context":2}[c["kind"]],c["point"][0],c["point"][1])):
    size=20 if c["kind"]=="project" else 19 if c["kind"]=="reference" else 15
    font=ImageFont.truetype(font_path,size)
    width=font.getlength(c["name"]);height=size+3;x,y=c["point"]
    candidates=[]
    for radius in [13,25,40,58,78,102,130,165,205,250,300,350]:
        for angle in range(0,360,20):
            a=angle*rad;cx=x+radius*math.cos(a);cy=y+radius*math.sin(a)
            left=cx if math.cos(a)>=0 else cx-width
            top=cy-height/2
            box=(left,top,left+width,top+height)
            if min(left,top)<12 or box[2]>1428 or box[3]>638:continue
            if any(overlaps(box,b,4) for b in boxes):continue
            if any(overlaps(box,d,2) for d in dots):continue
            candidates.append((radius+abs(math.sin(a))*2,box))
        if candidates:break
    assert candidates,"No map label position for "+c["name"]
    _,box=min(candidates,key=lambda x:x[0]);boxes.append(box)
    c["labelBox"]=box;c["fontSize"]=size
leaders=[];markers=[]
for c in cities:
    x,y=c["point"];l,t,r,b=c["labelBox"];tx=l;ty=t+c["fontSize"]
    endx=min(max(x,l),r);endy=min(max(y,t),b)
    if math.hypot(endx-x,endy-y)>19:
        leaders.append('<path class="map-leader '+('map-project-leader' if c["kind"]=="project" else '')+'" d="M'+f'{x:.1f} {y:.1f}L{endx:.1f} {endy:.1f}'+'"/>')
    cls="map-"+c["kind"]+"-city"
    tag="a" if c["kind"]=="project" else "g"
    attrs=' href="#cities" data-city="'+c["id"]+'" aria-label="'+html.escape(c["name"])+'"' if tag=="a" else ""
    group='<'+tag+' class="'+cls+'"'+attrs+'>'
    if c["kind"]=="project":
        group+='<circle class="map-city-halo" cx="'+f'{x:.1f}'+'" cy="'+f'{y:.1f}'+'" r="12"/>'
        group+='<circle class="map-city-dot" cx="'+f'{x:.1f}'+'" cy="'+f'{y:.1f}'+'" r="5.5"/>'
    else:
        fill="#e8e4dc" if c["kind"]=="reference" else "#757e8b"
        group+='<circle cx="'+f'{x:.1f}'+'" cy="'+f'{y:.1f}'+'" r="'+('4.2' if c["kind"]=="reference" else '3')+'" fill="'+fill+'"/>'
    group+='<text x="'+f'{tx:.1f}'+'" y="'+f'{ty:.1f}'+'">'+html.escape(c["name"])+'</text></'+tag+'>'
    markers.append(group)
russia_svg='<svg class="russia-map full-russia-map" viewBox="0 0 1440 650" role="img" aria-labelledby="russia-map-title russia-map-description" xmlns="http://www.w3.org/2000/svg"><title id="russia-map-title">Города России и пять направлений проекта</title><desc id="russia-map-description">Единая карта всей России, включая Калининград, Сибирь и Дальний Восток. Города проекта выделены медным, Москва и Воронеж светлым. Контуры Natural Earth, общественное достояние.</desc><defs><linearGradient id="full-russia-land" x1="0" y1="1" x2="1" y2="0"><stop stop-color="#3a3028"/><stop offset=".5" stop-color="#25303d"/><stop offset="1" stop-color="#182331"/></linearGradient><radialGradient id="full-map-glow"><stop stop-color="#a6764c25"/><stop offset="1" stop-color="#a6764c00"/></radialGradient></defs><ellipse cx="410" cy="390" rx="500" ry="270" fill="url(#full-map-glow)"/>'+"".join(land+leaders+markers)+'</svg>'
write("assets/russia-expansion.svg",russia_svg)
write(OUT/"russia-map-manifest.json",json.dumps({"projection":"Lambert conformal conic, standard parallels 45/75, central meridian 100","source":geo_url,"cities":cities,"labelOverlapCount":0,"insets":0},ensure_ascii=False,indent=2))

# A real OpenStreetMap basemap for the independently verified Voronezh addresses.
bbox=(51.638,39.125,51.738,39.283)
query='[out:json][timeout:20];(way["highway"~"^(trunk|primary|secondary|tertiary)$"]('+",".join(map(str,bbox))+');way["waterway"="river"]('+",".join(map(str,bbox))+');way["natural"="water"]('+",".join(map(str,bbox))+');relation["natural"="water"]('+",".join(map(str,bbox))+'););out geom;'
geometry=None
for endpoint in ["https://overpass-api.de/api/interpreter","https://overpass.kumi.systems/api/interpreter","https://overpass.private.coffee/api/interpreter"]:
    try:
        geometry=json.loads(download(endpoint+"?"+urlencode({"data":query}),40))
        if geometry.get("elements"):break
    except Exception as e:print("Basemap retry:",type(e).__name__,flush=True)
assert geometry and geometry.get("elements"),"Real Voronezh basemap unavailable"
osm_roads=[e for e in geometry["elements"] if e.get("tags",{}).get("highway") in ("trunk","primary","secondary","tertiary")]
assert len(osm_roads)>10,"Incomplete road geometry"
write(OUT/"voronezh-map-geometry.json",json.dumps(geometry,ensure_ascii=False))
lat0=51.688*rad
def vxy(lon,lat):
    return (lon-bbox[1])/(bbox[3]-bbox[1])*640,(bbox[2]-lat)/(bbox[2]-bbox[0])*380
# Equal physical x/y scale, centred in the map panel.
kmw=(bbox[3]-bbox[1])*math.cos(lat0);kmh=bbox[2]-bbox[0]
vs=min(600/kmw,340/kmh);vcx=(bbox[1]+bbox[3])/2;vcy=(bbox[0]+bbox[2])/2
def vxy(lon,lat):return 320+(lon-vcx)*math.cos(lat0)*vs,190-(lat-vcy)*vs
def geom_path(coords,closed=False):
    if not coords:return ""
    return "M"+"L".join(f"{x:.1f} {y:.1f}" for x,y in (vxy(pt["lon"],pt["lat"]) for pt in coords))+("Z" if closed else "")
def joined_water_rings(members):
    segments=[m["geometry"] for m in members if m.get("role") in ("outer","") and m.get("geometry")]
    rings=[]
    def same(a,b):return abs(a["lon"]-b["lon"])<1e-7 and abs(a["lat"]-b["lat"])<1e-7
    while segments:
        chain=segments.pop()
        while True:
            match=False
            for i,other in enumerate(segments):
                if same(chain[-1],other[0]):chain=chain+other[1:]
                elif same(chain[-1],other[-1]):chain=chain+list(reversed(other[:-1]))
                elif same(chain[0],other[-1]):chain=other[:-1]+chain
                elif same(chain[0],other[0]):chain=list(reversed(other[1:]))+chain
                else:continue
                segments.pop(i);match=True;break
            if not match:break
        if len(chain)>3 and same(chain[0],chain[-1]):rings.append(chain)
    return rings

water=[];roads=[]
for e in geometry["elements"]:
    tags=e.get("tags",{})
    if tags.get("natural")=="water":
        if e["type"]=="relation":
            for ring in joined_water_rings(e.get("members",[])):
                water.append('<path d="'+geom_path(ring,True)+'" fill="#253a49" stroke="#43556677" stroke-width="1.2"/>')
        elif e.get("geometry"):
            water.append('<path d="'+geom_path(e["geometry"],True)+'" fill="#253a49" stroke="#43556677" stroke-width="1.2"/>')
    if tags.get("waterway")=="river" and e.get("geometry"):
        water.append('<path d="'+geom_path(e["geometry"])+'" fill="none" stroke="#344b5d" stroke-width="4"/>')
    if tags.get("highway") and e.get("geometry"):
        weight={"trunk":2.4,"primary":2.2,"secondary":1.6,"tertiary":.9}.get(tags["highway"],.6)
        roads.append('<path d="'+geom_path(e["geometry"])+'" fill="none" stroke="#8f8170" stroke-opacity="'+(".65" if weight>2 else ".35")+'" stroke-width="'+str(weight)+'" stroke-linejoin="round" stroke-linecap="round"/>')
pins=[]
for i,o in enumerate(CFG["offices"],1):
    actualx,actualy=vxy(o["lon"],o["lat"])
    dx,dy={1:(-13,14),2:(13,-14)}.get(i,(0,0))
    x,y=actualx+dx,actualy+dy
    if dx or dy:
        pins.append('<path d="M'+f'{actualx:.1f} {actualy:.1f}L{x:.1f} {y:.1f}'+'" stroke="#e0af84" stroke-width="1.4"/><circle cx="'+f'{actualx:.1f}'+'" cy="'+f'{actualy:.1f}'+'" r="3" fill="#e0af84"/>')
    pins.append('<a href="'+html.escape(o["source"],quote=True)+'" target="_blank" rel="noopener" aria-label="'+html.escape(o["name"]+", "+o["address"],quote=True)+'"><circle cx="'+f'{x:.1f}'+'" cy="'+f'{y:.1f}'+'" r="12" fill="#c18e64" stroke="#f3c599" stroke-width="1.5"/><text x="'+f'{x:.1f}'+'" y="'+f'{y+4:.1f}'+'" text-anchor="middle" fill="#11151b" font-family="Arial,sans-serif" font-size="12" font-weight="700">'+str(i)+'</text></a>')
vsvg='<svg class="voronezh-map" viewBox="0 0 640 380" role="img" aria-labelledby="voronezh-map-title voronezh-map-desc" xmlns="http://www.w3.org/2000/svg"><title id="voronezh-map-title">Офисы Сити-Центра в Воронеже</title><desc id="voronezh-map-desc">Шесть адресов с официальной страницы контактов компании. Номера на карте соответствуют списку адресов. Карта OpenStreetMap.</desc><defs><clipPath id="voronezh-map-clip"><rect width="640" height="380" rx="12"/></clipPath><radialGradient id="voronezh-wash"><stop stop-color="#9c704425"/><stop offset="1" stop-color="#0e161b00"/></radialGradient></defs><g clip-path="url(#voronezh-map-clip)"><rect width="640" height="380" fill="#111a21"/><rect width="640" height="380" fill="url(#voronezh-wash)"/>'+"".join(water+roads)+'<g font-family="Arial,sans-serif" font-size="12" fill="#a9a49d" letter-spacing="1.5"><text x="185" y="294">ЦЕНТР</text><text x="400" y="113">ЛЕВЫЙ БЕРЕГ</text><text x="109" y="50">СЕВЕРНЫЙ</text></g>'+"".join(pins)+'</g></svg>'
write("assets/voronezh-offices.svg",vsvg)
write("assets/voronezh-offices.json",json.dumps({"checkedAt":"2026-11-03","officialContactsUrl":CFG["officialContactsUrl"],"coordinateReference":"WGS84 building centres; Yandex house pages","basemap":"OpenStreetMap contributors, ODbL","offices":CFG["offices"]},ensure_ascii=False,indent=2))
legend='<ol class="office-addresses">'+"".join('<li><span class="office-number" aria-hidden="true">'+str(i)+'</span><a href="'+html.escape(o["source"],quote=True)+'" target="_blank" rel="noopener"><strong>'+html.escape(o["name"])+'</strong>'+html.escape(o["address"])+'</a></li>' for i,o in enumerate(CFG["offices"],1))+'</ol>'
vpanel='<div class="voronezh-map-panel" data-reveal><div class="voronezh-map-heading"><strong>Наши офисы</strong><span>ВОРОНЕЖ</span></div>'+vsvg+legend+'<p class="voronezh-attribution">© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> · Адреса: <a href="'+CFG["officialContactsUrl"]+'" target="_blank" rel="noopener">Сити-Центр</a></p></div>'

h=Path("index.html").read_text()
h=h.replace("\u2014","–")
home=section(h,"home")
home=re.sub(r'<div class="expansion-pillars".*?</div>','<div class="scale-vision"><h2 id="scale-title">Масштабируемся</h2><div class="expansion-pillars" aria-labelledby="scale-title"><a href="#russia" class="expansion-pillar"><span class="horizon-name">Россия</span></a><a href="#cis" class="expansion-pillar"><span class="horizon-name">СНГ</span></a><a href="#world" class="expansion-pillar"><span class="horizon-name">Популярные <br>мировые направления</span></a></div></div>',home,flags=re.S)
h=replace_section(h,"home",home)
system=section(h,"system")
system=system.replace('<span>04</span> ИДЕЯ РАСШИРЕНИЯ','<span>03</span> ИДЕЯ РАСШИРЕНИЯ')
system=re.sub(r'<div class="system-sculpture".*?</svg></div>',lambda _:vpanel,system,flags=re.S)
assert "system-sculpture" not in system
vision=section(h,"vision")
vision=vision.replace('<span>03</span> МАСШТАБ','<span>04</span> МАСШТАБ')
vision=re.sub(r'<p class="section-lead"[^>]*>.*?</p>','',vision,count=1,flags=re.S)
vision=re.sub(r'<svg class="russia-map".*?</svg>',lambda _:russia_svg,vision,count=1,flags=re.S)
vision=vision.replace('<div class="map-viewport"','<div class="map-tools" role="group" aria-label="Масштаб карты"><button type="button" data-map-zoom="-1" aria-label="Уменьшить карту" disabled>−</button><button type="button" data-map-zoom="reset">Вся Россия</button><button type="button" data-map-zoom="1" aria-label="Увеличить карту">+</button></div><div class="map-viewport"',1)
vision=vision.replace('Карта городов России; на небольшом экране карту можно прокручивать по горизонтали','Карта России. Кнопки меняют масштаб; увеличенную карту можно прокручивать.')
# Swap sections with placeholders to retain all unrelated content and controls.
h=h.replace(section(h,"vision"),"<!--KEYNOTE-SYSTEM-->",1).replace(section(h,"system"),"<!--KEYNOTE-VISION-->",1)
h=h.replace("<!--KEYNOTE-SYSTEM-->",system,1).replace("<!--KEYNOTE-VISION-->",vision,1)
cities_s=section(h,"cities")
cities_s=re.sub(r'<p class="section-lead"[^>]*>.*?</p>','',cities_s,count=1,flags=re.S)
h=replace_section(h,"cities",cities_s)
h=h.replace('Начнём с небольшой<br><span class="metal-text">команды.</span>','Начнём<br><span class="metal-text">с команды.</span>')
h=re.sub(r'(assets/(?:site\.css|site\.js|project-data\.js|market-data\.js))\?v=[^"]+',r'\1?v=20261103-first-six',h)
assert h.index('id="system"')<h.index('id="vision"')<h.index('id="cities"')
assert "Остановились на этих пяти" not in h and "В каждом городе соберём" not in h
assert "небольшой" not in section(h,"team")
write("index.html",h)
j=Path("assets/site.js").read_text().replace("\u2014","–")
j=j.replace("String(value ?? '').replace(","String(value ?? '').replaceAll('\\u2014','–').replace(",1)
j=j.replace("Math.min(1360,stage.clientWidth-edge*2)","Math.min(scenes[activeScene].id==='vision'?1680:1360,stage.clientWidth-edge*2)")
start=j.index("  const mapViewport=");end=j.index("  let selectedCity=",start)
new_map_js="""  const mapViewport=$('#russia-map-viewport');
  let mapZoom=1;
  $$('[data-map-zoom]').forEach(button=>button.addEventListener('click',()=>{
    if(!mapViewport)return;
    const cx=(mapViewport.scrollLeft+mapViewport.clientWidth/2)/Math.max(1,mapViewport.scrollWidth);
    const cy=(mapViewport.scrollTop+mapViewport.clientHeight/2)/Math.max(1,mapViewport.scrollHeight);
    mapZoom=button.dataset.mapZoom==='reset'?1:Math.max(1,Math.min(3,mapZoom+Number(button.dataset.mapZoom)*.5));
    mapViewport.style.setProperty('--map-zoom',String(mapZoom));
    mapViewport.scrollLeft=mapZoom===1?0:cx*mapViewport.scrollWidth-mapViewport.clientWidth/2;
    mapViewport.scrollTop=mapZoom===1?0:cy*mapViewport.scrollHeight-mapViewport.clientHeight/2;
    $('[data-map-zoom="-1"]').disabled=mapZoom===1;
    $('[data-map-zoom="1"]').disabled=mapZoom===3;
  }));
  // Separate target areas keep distant callout labels from covering other cities.
  $$('.map-project-city').forEach(link=>{
    const label=link.querySelector('text'),dot=link.querySelector('.map-city-dot');
    if(label){
      const box=label.getBBox(),target=document.createElementNS('http://www.w3.org/2000/svg','rect');
      for(const [key,value] of Object.entries({x:box.x-5,y:box.y-5,width:box.width+10,height:box.height+10,fill:'transparent',stroke:'none','pointer-events':'all'}))target.setAttribute(key,String(value));
      target.classList.add('map-city-label-hit-area');link.prepend(target);
    }
    if(dot){
      const target=document.createElementNS('http://www.w3.org/2000/svg','circle');
      for(const [key,value] of Object.entries({cx:dot.getAttribute('cx'),cy:dot.getAttribute('cy'),r:12,fill:'transparent',stroke:'none','pointer-events':'all'}))target.setAttribute(key,String(value));
      target.classList.add('map-city-dot-hit-area');link.prepend(target);
    }
  });
"""
j=j[:start]+new_map_js+j[end:]
write("assets/site.js",j)
css=Path("assets/site.css").read_text()
css=css.replace('@media(prefers-reduced-motion:reduce)',Path("_keynote/first-six.css").read_text()+'\n@media(prefers-reduced-motion:reduce)',1)
write("assets/site.css",css)
for path in ["assets/market-data.js","README.md"]:
    text=Path(path).read_text().replace("\u2014","–")
    if path=="README.md":
        text=text.replace("3. Увеличенная карта России: пять городов проекта, выделенные Москва и Воронеж, 29 других городов, включая Сибирь и Дальний Восток.\n4. Одна система работы для пяти офисов.","3. «Пять офисов. Одна система»: карта Воронежа с шестью действующими адресами компании.\n4. Одна карта всей России, включая Калининград, Сибирь и Дальний Восток; "+str(len(cities))+" городов, пять городов проекта выделены медным, Москва и Воронеж светлым. Доступно увеличение карты.")
        text=text.replace("Россия – коническая проекция Ламберта с увеличенной врезкой всей страны;","Россия – единая коническая проекция Ламберта без врезок;")
        text+="\n\nКарта Воронежа: дороги и водоёмы © [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), ODbL. [Адреса офисов](https://xn-----flckcgia1cckawdfre3e.xn--p1ai/contacts/) проверены 03.11.2026; координаты WGS84 относятся к центрам зданий по Яндекс Картам. Полный список источников: assets/voronezh-offices.json. Заголовок «Пять офисов» относится к пяти новым офисам проекта; на карте Воронежа сохранены все шесть подтверждённых адресов компании.\n"
    write(path,text)
assert hashlib.sha256(Path("assets/samara.webp").read_bytes()).hexdigest()==samara_sha
assert "\u2014" not in Path("index.html").read_text()
write(OUT/"build-report.json",json.dumps({"samaraUnchanged":True,"financialNumbersUnchanged":True,"russiaCityCount":len(cities),"voronezhOffices":len(CFG["offices"]),"osmRoadWays":len(osm_roads),"newPhotos":[p["id"] for p in CFG["photos"]]},ensure_ascii=False,indent=2))
print("BUILD_REPORT",Path(OUT/"build-report.json").read_text(),flush=True)
