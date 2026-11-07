"""毎朝のまとめをプレビュー用の1枚のHTMLにする（GitHub Actions の build-preview.yml から実行）
使い方: python3 build_preview.py <リポジトリ> <next start のHTML> <tail.html> <出力先>"""
import re,sys,json,base64,io,html,os,glob
from PIL import Image
repo,src,tailf,out=sys.argv[1:5]
import urllib.request
h=open(src,encoding='utf8').read()
# CSS
css=''
for href in re.findall(r'<link rel="stylesheet" href="(/_next/[^"]+)"',h):
    css+=open(os.path.join(repo,'.next',href[len('/_next/'):]),encoding='utf8').read()
body=re.search(r'<body[^>]*>(.*)</body>',h,re.S).group(1)
body=re.sub(r'<script\b[^>]*>.*?</script>','',body,flags=re.S)
body=re.sub(r'<link[^>]*>','',body)
# images
cache={}
def datauri(u):
    if u in cache: return cache[u]
    try:
        req=urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})
        raw=urllib.request.urlopen(req,timeout=20).read()
        im=Image.open(io.BytesIO(raw)).convert('RGB'); im.thumbnail((800,800))
        b=io.BytesIO(); im.save(b,'JPEG',quality=68,optimize=True)
        cache[u]='data:image/jpeg;base64,'+base64.b64encode(b.getvalue()).decode()
    except Exception as e:
        print('image failed',u,e); cache[u]=None
    return cache[u]
miss=0
def rep(m):
    global miss
    u=html.unescape(m.group(1)); d=datauri(u)
    if not d: miss+=1; return m.group(0)
    return 'src="'+d+'"'
body=re.sub(r'src="(https?://[^"]+)"',rep,body)
# archive list
digs=sorted((json.load(open(f,encoding='utf8')) for f in glob.glob(os.path.join(repo,'data/digests/*.json'))),key=lambda d:d['date'],reverse=True)
W='日月火水木金土'
import datetime
def ja(s):
    d=datetime.date.fromisoformat(s); return f"{d.year}年{d.month}月{d.day}日（{W[(d.weekday()+1)%7]}）"
items=''
for k,d in enumerate(digs):
    n=sum(len(c['items']) for c in d['categories'])
    hv=d.get('headline'); hl=html.escape(hv[0] if isinstance(hv,list) and hv else str(hv or ''))
    if k==0:
        items+=f'<li><a href="#" class="block rounded-3xl bg-surface p-5"><div class="flex items-baseline justify-between gap-3"><p class="font-black">{ja(d["date"])}</p><p class="shrink-0 text-xs text-faint">今日・{n}本</p></div><p class="mt-2 text-[14px] leading-6 text-muted">{hl}</p></a></li>'
    else:
        items+=f'<li><div class="block rounded-3xl bg-surface p-5 opacity-70"><div class="flex items-baseline justify-between gap-3"><p class="font-black">{ja(d["date"])}</p><p class="shrink-0 text-xs text-faint">{n}本</p></div><p class="mt-2 text-[14px] leading-6 text-muted">{hl}</p></div></li>'
tail=open(tailf,encoding='utf8').read()
tail=re.sub(r"<ul class=\"mt-5 space-y-3\">.*?</ul><p class=\"mt-6 text-xs text-faint\">[^<]*</p>",
    lambda m:'<ul class="mt-5 space-y-3">'+items.replace("'","\\'")+'</ul><p class="mt-6 text-xs text-faint">このプレビューで開けるのは今日のまとめだけです。過去の日付は一覧のみ表示しています。</p>',tail,flags=re.S)
assert '今日・' in tail
doc=('<title>Morning Brief</title>\n<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700;900&display=swap">\n'
     '<style>'+css+'</style>\n'+body+'\n'+tail)
open(out,'w',encoding='utf8').write(doc)
print('bytes',len(doc),'missing imgs',miss, 'scripts left',doc.count('<script'))
