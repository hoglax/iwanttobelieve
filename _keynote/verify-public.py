from pathlib import Path
from urllib.request import Request,urlopen
from urllib.parse import quote
from concurrent.futures import ThreadPoolExecutor
import hashlib,json,time
cfg=json.loads(Path("_keynote/public-config.json").read_text())
origin="https://hoglax.github.io/iwanttobelieve/"
paths=["index.html","assets/site.css","assets/site.js","assets/project-data.js","assets/market-data.js","assets/photo-credits.json","assets/ekaterinburg.webp","assets/nizhny.webp","assets/samara.webp","assets/rostov.webp","assets/ufa.webp","assets/russia-expansion.svg","assets/voronezh-offices.svg","assets/voronezh-offices.json"]
def check(path):
    target=origin+("" if path=="index.html" else path)+"?v="+cfg["sha"]
    try:
        with urlopen(Request(target,headers={"Cache-Control":"no-cache","User-Agent":"CityCenterPublicationCheck/1.0"}),timeout=20) as r:
            data=r.read()
        local=Path(path).read_bytes()
        return {"path":path,"match":data==local,"sha256":hashlib.sha256(data).hexdigest(),"bytes":len(data)}
    except Exception as e:return {"path":path,"match":False,"error":str(e)}
results=[]
for attempt in range(24):
    with ThreadPoolExecutor(max_workers=6) as pool:results=list(pool.map(check,paths))
    bad=[r["path"] for r in results if not r["match"]]
    print("Public check",attempt+1,"waiting for",bad,flush=True)
    if not bad:break
    time.sleep(10)
report={"success":all(r["match"] for r in results),"commit":cfg["sha"],"url":origin+"?v="+cfg["sha"][:7],"files":results}
Path("_keynote/out/public-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2))
print("PUBLIC_REPORT",json.dumps(report,ensure_ascii=False),flush=True)
assert report["success"],"Published bytes do not yet match the verified build"
