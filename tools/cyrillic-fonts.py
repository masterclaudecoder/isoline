import re
U={"Inter Tight":"https://fonts.gstatic.com/s/intertight/v9/NGSwv5HMAFg6IuGlBNMjxLsD8ah8QA.woff2",
"Onest":"https://fonts.gstatic.com/s/onest/v11/gNMKW3F-SZuj7xmb-HY6EQ.woff2",
"Wix Madefor Text":"https://fonts.gstatic.com/s/wixmadefortext/v17/-W_lXI_oSymQ8Qj-Apx3HGN_Hu1RZiER5zwf.woff2"}
R="U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116"
V=[("Inter Tight · as is","Inter Tight",1,0,0),("Inter Tight · x-height matched","Inter Tight",.93,0,0),("Inter Tight · matched, +tracking, lighter","Inter Tight",.93,.012,-40),
("Onest · as is","Onest",1,0,0),("Onest · x-height matched","Onest",.96,0,0),("Onest · matched, tighter, lighter","Onest",.96,-.01,-40),
("Wix Madefor · as is","Wix Madefor Text",1,0,0),("Wix Madefor · slightly smaller","Wix Madefor Text",.97,0,0),("Wix Madefor · smaller, tighter, lighter","Wix Madefor Text",.97,-.012,-40)]
css=""
for i,(l,f,sa,ls,wd) in enumerate(V):
  css+=f"@font-face{{font-family:'C{i}';src:url({U[f]}) format('woff2');font-weight:100 900;unicode-range:{R};size-adjust:{sa*100:.0f}%}}\n"
S=[("h","Isoline Студия"),("ui","Сохранить PNG как новую версию"),("sm","Палитры, компоненты и библиотеки"),("btn","Экспорт")]
def wrap(t,ls,wd,w):
  return re.sub(r"([А-Яа-яЁё][А-Яа-яЁё ,]*[А-Яа-яЁё])",lambda m:f"<span style='letter-spacing:{ls}em;font-weight:{w+wd}'>{m.group(1)}</span>",t)
W={"h":600,"ui":500,"sm":400,"btn":600}
rows=""
for i,(l,f,sa,ls,wd) in enumerate(V):
  cells="".join(f"<span class='{c}'>{wrap(t,ls,wd,W[c])}</span>" for c,t in S)
  rows+=f"<div class=row><div class=lab>{l}</div><div class=s style=\"font-family:'Instrument Sans','C{i}'\">{cells}</div></div>"
html=f"""<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wdth,wght@75..100,400..700&display=swap" rel=stylesheet>
<style>{css}body{{margin:0;padding:24px;background:#fbfbf9;color:#1c1c1e;font-family:'Instrument Sans';width:1150px}}
.row{{display:grid;grid-template-columns:250px 1fr;align-items:center;padding:12px 0;border-bottom:1px solid #e8e6e0}}
.lab{{font-size:13px;font-weight:600;color:#6b6a64}} .s{{display:flex;align-items:baseline;gap:22px;flex-wrap:wrap}}
.h{{font-size:30px;font-weight:600;letter-spacing:-.01em}} .ui{{font-size:15px;font-weight:500}} .sm{{font-size:13px;font-weight:400;color:#55534d}}
.btn{{font-size:14px;font-weight:600;background:#e8572a;color:#fff;padding:7px 14px;border-radius:10px}}
.ref{{background:#f1efe9;border-radius:12px;padding:12px 14px}}</style>
<div class="row ref"><div class=lab>Now (English)</div><div class=s><span class=h>Isoline Studio</span><span class=ui>Save PNG as a new version</span><span class=sm>Palettes, components and libraries</span><span class=btn>Export</span></div></div>
{rows}"""
open('tools/cyrillic-fonts.html','w').write(html)
