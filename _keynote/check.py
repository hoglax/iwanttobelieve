from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from playwright.sync_api import sync_playwright
from PIL import Image,ImageDraw
import json,time,traceback,fitz,hashlib,subprocess
OUT=Path("_keynote/out");OUT.mkdir(parents=True,exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
    def log_message(self,*args):pass
server=ThreadingHTTPServer(("127.0.0.1",0),Handler)
thread=Thread(target=server.serve_forever,daemon=True);thread.start()
url="http://127.0.0.1:"+str(server.server_port)+"/"
expected=["home","russia","system","vision","cities","team","pace","economics","launch","decision","next","cis","world","franchise","future","leadership"]
report={"viewports":[],"errors":[],"interactions":{}}
def active(page):return page.locator(".scene.presentation-active").get_attribute("id")
def settle(page):
    page.wait_for_function("Array.from(document.images).filter(i=>i.closest('.presentation-active')).every(i=>i.complete&&i.naturalWidth>0)")
    page.wait_for_timeout(75)
def enter(page):
    page.goto(url,wait_until="networkidle")
    page.wait_for_function("window.PROJECT && document.querySelectorAll('#city-monoliths img').length===5")
    page.wait_for_function("Array.from(document.querySelectorAll('#city-monoliths img')).every(i=>i.complete&&i.naturalWidth>0)")
    page.evaluate("() => {document.documentElement.requestFullscreen=()=>Promise.reject(new Error('QA fallback'));}")
    page.locator("#presentation-toggle").click()
    page.keyboard.press("Home");settle(page)
def frame_layout(page):
    return page.evaluate("""() => {
      const scene=document.querySelector('.presentation-active'),canvas=scene.querySelector('.presentation-canvas');
      const s=document.querySelector('#main').getBoundingClientRect(),b=canvas.getBoundingClientRect();
      const bad=[];
      const walk=document.createTreeWalker(canvas,NodeFilter.SHOW_TEXT);
      while(walk.nextNode()){
        const n=walk.currentNode,e=n.parentElement;
        if(!n.textContent.trim()||e.closest('svg,[aria-hidden="true"],[hidden]'))continue;
        const cs=getComputedStyle(e);if(cs.display==='none'||cs.visibility==='hidden'||+cs.opacity===0)continue;
        const r=document.createRange();r.selectNodeContents(n);
        for(const t of r.getClientRects()){
          if(t.width<1||t.height<1)continue;
          if(t.left<s.left-2||t.right>s.right+2||t.top<s.top-2||t.bottom>s.bottom+2)bad.push(n.textContent.trim().slice(0,70));
        }
      }
      return {id:scene.id,centerX:Math.abs((b.left+b.right-s.left-s.right)/2),centerY:Math.abs((b.top+b.bottom-s.top-s.bottom)/2),bad};
    }""")
try:
    subprocess.run(["node","--check","assets/site.js"],check=True)
    subprocess.run(["node","--check","assets/project-data.js"],check=True)
    subprocess.run(["node","--check","assets/market-data.js"],check=True)
    with sync_playwright() as pw:
        browser=pw.chromium.launch()
        for width,height in [(1600,1049),(1920,1080),(1440,900),(1366,768),(1024,768),(390,844),(320,740)]:
            page=browser.new_page(viewport={"width":width,"height":height},device_scale_factor=1,reduced_motion="reduce")
            page.on("pageerror",lambda e:report["errors"].append(str(e)))
            enter(page)
            assert page.locator(".scene").evaluate_all("(nodes)=>nodes.map(n=>n.id)")==expected
            frames=[];fail=[];seen=set()
            while True:
                settle(page);layout=frame_layout(page);frames.append(layout["id"])
                if layout["centerX"]>1.6 or layout["centerY"]>1.6 or layout["bad"]:fail.append(layout)
                sid=layout["id"]
                if sid not in seen and sid in expected[:6] and width in (1600,390):
                    page.screenshot(path=str(OUT/f"slide-{sid}-{width}.png"))
                    seen.add(sid)
                if page.locator("#next-scene").is_disabled():break
                assert len(frames)<35,"Navigation did not reach final slide"
                page.locator("#next-scene").click()
            assert len(frames)==27,frames
            assert frames[0:4]==expected[:4] and frames[-1]=="leadership",frames
            backward=[]
            while not page.locator("#previous-scene").is_disabled():
                page.locator("#previous-scene").click();settle(page);backward.append(active(page))
                assert len(backward)<35
            assert len(backward)==26
            assert active(page)=="home"
            page.locator("#exit-presentation").click()
            assert page.locator(".presentation-canvas").count()==0
            assert page.locator(".scene").count()==16
            assert page.evaluate("document.documentElement.scrollWidth<=innerWidth+2")
            home=page.locator("#home")
            dims=home.locator(".expansion-pillar").evaluate_all("(ns)=>ns.map(n=>{const b=n.getBoundingClientRect();const t=n.querySelector('.horizon-name'),s=getComputedStyle(t);return {w:b.width,h:b.height,size:s.fontSize}})")
            assert max(d["w"] for d in dims)-min(d["w"] for d in dims)<1.5,dims
            assert len({d["size"] for d in dims})==1,dims
            assert page.locator("#russia .monolith img").evaluate_all("(ns)=>ns.every(n=>getComputedStyle(n).filter==='none')")
            if fail:page.screenshot(path=str(OUT/f"layout-fail-{width}.png"),full_page=True)
            report["viewports"].append({"width":width,"height":height,"forward":len(frames),"backward":len(backward),"layoutFailures":fail,"equalHeroSizes":True})
            page.close()
        page=browser.new_page(viewport={"width":1600,"height":1049},reduced_motion="reduce")
        enter(page)
        # Real dot and label clicks for every projected city, including distant callouts.
        ids=["ekaterinburg","nizhny","samara","rostov","ufa"]
        for city in ids:
            for target in [".map-city-dot","text"]:
                page.keyboard.press("Home")
                for _ in range(3):page.locator("#next-scene").click()
                assert active(page)=="vision"
                marker=page.locator('#vision [data-city="'+city+'"] '+target)
                marker.click();settle(page)
                assert active(page)=="cities"
                assert page.locator('#city-tab-'+city).get_attribute("aria-selected")=="true"
        report["interactions"]["mapDotAndLabelClicks"]=10
        page.keyboard.press("Home")
        for _ in range(3):page.locator("#next-scene").click()
        page.locator('[data-map-zoom="1"]').click()
        assert page.locator("#russia-map-viewport").evaluate("(e)=>e.scrollWidth>e.clientWidth*1.4")
        page.locator('[data-map-zoom="reset"]').click()
        assert page.locator("#russia-map-viewport").evaluate("(e)=>e.scrollWidth<=e.clientWidth+1")
        assert page.locator(".map-project-city").count()==5
        assert page.locator(".map-reference-city").count()==2
        assert "Калининград" in page.locator("#vision").inner_text()
        # Browser-measured label bounds use the actual loaded presentation font.
        collision=page.locator("#vision .full-russia-map text").evaluate_all("""ns=>{
          const a=ns.map(n=>({label:n.textContent,b:n.getBBox()})),out=[];
          for(let i=0;i<a.length;i++)for(let k=i+1;k<a.length;k++){let b=a[i].b,c=a[k].b;
          if(b.x<c.x+c.width&&b.x+b.width>c.x&&b.y<c.y+c.height&&b.y+b.height>c.y)out.push([a[i].label,a[k].label]);}
          return out;
        }""")
        assert not collision,collision
        report["interactions"]["russiaMapLabels"]=page.locator("#vision .full-russia-map text").count()
        assert page.locator("#system .voronezh-map a").count()==6
        assert page.locator("#system .office-addresses li").count()==6
        page.keyboard.press("Home");page.locator('#home a[href="#cis"]').click()
        assert active(page)=="cis"
        page.keyboard.press("ArrowRight");assert active(page)=="world"
        page.keyboard.press("ArrowLeft");assert active(page)=="cis"
        page.keyboard.press("ArrowLeft");assert active(page)=="next"
        report["interactions"]["cisArrows"]=True
        # City and average-check steps, then the two team scopes.
        page.locator('.desktop-nav a[href="#cities"]').click()
        for _ in range(4):page.locator("#next-city").click()
        assert page.locator("#city-tab-ufa").get_attribute("aria-selected")=="true"
        page.locator("#next-city").click();assert active(page)=="team"
        page.locator("#next-scene").click()
        assert page.locator('[data-team-scope="network"]').get_attribute("aria-pressed")=="true"
        page.locator("#next-scene").click();assert active(page)=="pace"
        page.locator("#next-scene").click();assert active(page)=="economics"
        for _ in range(4):page.locator("#next-average").click()
        assert "219" in page.locator("#average-value").inner_text()
        page.locator("#next-average").click();assert active(page)=="launch"
        for _ in range(3):page.locator("#next-scene").click()
        assert active(page)=="decision"
        assert "Уточняется" in page.locator("#decision").inner_text()
        report["interactions"]["cityTeamAndAverageSteps"]=True
        page.locator("#next-scene").click();assert active(page)=="next"
        page.locator('[data-open="source-dialog"]').click()
        assert page.locator("#source-dialog").is_visible()
        assert "192" in page.locator("#source-dialog").inner_text()
        page.locator("#source-dialog [data-close]").click()
        assert active(page)=="next"
        report["interactions"]["sourceTableDialog"]=True
        # Export each actual stage and preserve external link targets in the PDF.
        pdf=fitz.open()
        page.keyboard.press("Home")
        num=0
        while True:
            settle(page);stage=page.locator("#main").bounding_box()
            shot=page.screenshot(type="jpeg",quality=91,clip=stage)
            sheet=pdf.new_page(width=stage["width"],height=stage["height"])
            sheet.insert_image(sheet.rect,stream=shot)
            targets=page.locator(".presentation-active a[href],.presentation-active button[data-open]").evaluate_all("""ns=>ns.map(n=>{
              const b=n.getBoundingClientRect();return {href:n.href||window.PROJECT.sourceUrl,x:b.x,y:b.y,w:b.width,h:b.height};
            }).filter(n=>/^https?:/.test(n.href)&&n.w>0&&n.h>0)""")
            for link in targets:
                rect=fitz.Rect(link["x"]-stage["x"],link["y"]-stage["y"],link["x"]+link["w"]-stage["x"],link["y"]+link["h"]-stage["y"])&sheet.rect
                if not rect.is_empty:sheet.insert_link({"kind":fitz.LINK_URI,"from":rect,"uri":link["href"]})
            num+=1
            if page.locator("#next-scene").is_disabled():break
            page.locator("#next-scene").click()
        assert num==27
        pdf.set_metadata({"title":"Сити-Центр · Следующая география","subject":"16 слайдов, 27 кадров; первые шесть обновлены","author":"Сити-Центр","keywords":"2027, Россия, СНГ, мир"})
        pdf.save(OUT/"citycenter-presentation.pdf",garbage=4,deflate=True)
        report["pdfPages"]=num
        page.close();browser.close()
    # Reusable contact sheets for visual review outside the runner.
    paths=[OUT/f"slide-{sid}-1600.png" for sid in expected[:6]]
    paths=[p for p in paths if p.exists()]
    board=Image.new("RGB",(1600,3*550),"#08090c")
    draw=ImageDraw.Draw(board)
    for i,path in enumerate(paths):
        im=Image.open(path).convert("RGB");im.thumbnail((790,518))
        x=(i%2)*800;y=(i//2)*550
        board.paste(im,(x,y+24));draw.text((x+12,y+5),path.stem,fill="white")
    board.save(OUT/"first-six-contact.jpg",quality=91)
    thumbs=Image.new("RGB",(1400,940),"#08090c")
    for i,city in enumerate(ids):
        im=Image.open("assets/"+city+".webp").convert("RGB");im.thumbnail((690,435))
        x=(i%2)*700;y=(i//2)*470
        # Samara is unchanged; omit it from the replacement-photo contact sheet.
        if city=="samara":continue
        idx=["ekaterinburg","nizhny","rostov","ufa"].index(city);x=(idx%2)*700;y=(idx//2)*470
        thumbs.paste(im,(x,y+24));ImageDraw.Draw(thumbs).text((x+10,y+5),city,fill="white")
    thumbs.save(OUT/"landmarks-contact.jpg",quality=91)
    assert not report["errors"],report["errors"]
    assert all(not v["layoutFailures"] for v in report["viewports"]),report["viewports"]
    report["success"]=True
except Exception as e:
    report["success"]=False;report["failure"]=str(e);traceback.print_exc()
finally:
    server.shutdown();server.server_close()
    Path(OUT/"qa-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
    print("QA_REPORT",json.dumps(report,ensure_ascii=False),flush=True)
if not report.get("success"):raise SystemExit(1)
