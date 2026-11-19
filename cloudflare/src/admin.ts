export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lottery Hub admin</title>
<style>
:root{--bg:#f4f2fb;--card:#fff;--ink:#241c45;--muted:#6f6a8a;--brand:#6341c8;--brand2:#8a6cf0;--soft:#ece7fb;--ok:#168a4f;--bad:#b3261e;--line:#e6e1f4;--gold:#e0a21b}
@media (prefers-color-scheme:dark){:root{--bg:#120f1c;--card:#1c1729;--ink:#f0ecff;--muted:#a29dbf;--soft:#2a2340;--line:#332b4d}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.5 system-ui,-apple-system,sans-serif}
header{background:linear-gradient(135deg,#4b2fa6,#7a55e0);color:#fff;padding:22px 16px 70px}
.wrap{max-width:1080px;margin:0 auto}
.top{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
.brand{display:flex;align-items:center;gap:12px}.logo{width:42px;height:42px;border-radius:12px;background:#ffffff26;display:grid;place-items:center;font-size:22px}
h1{margin:0;font-size:22px}.sub{opacity:.8;font-size:13px}
.who{font-size:13px;background:#ffffff22;border-radius:99px;padding:6px 12px}
main{max-width:1080px;margin:-48px auto 0;padding:0 16px 60px}
.grid{display:grid;gap:14px}.stats{grid-template-columns:repeat(auto-fit,minmax(200px,1fr))}.two{grid-template-columns:2fr 1fr}
@media (max-width:820px){.two{grid-template-columns:1fr}}
.card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px;box-shadow:0 4px 18px #2b1a6a14}
.stat .l{color:var(--muted);font-size:12px;text-transform:uppercase;letter-spacing:.06em}
.stat .v{font-size:32px;font-weight:700;line-height:1.2;margin-top:4px}.stat .n{font-size:12px;color:var(--muted)}
.ico{float:right;width:34px;height:34px;border-radius:10px;background:var(--soft);display:grid;place-items:center;font-size:17px}
h2{font-size:16px;margin:22px 0 10px}.card h3{margin:0 0 10px;font-size:15px}
.chart{display:flex;align-items:flex-end;gap:6px;height:150px;padding-top:8px}
.col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;gap:4px}
.bar{width:100%;border-radius:6px 6px 2px 2px;background:linear-gradient(var(--brand2),var(--brand));min-height:3px;position:relative}
.col span{font-size:10px;color:var(--muted)}.col b{font-size:11px}
.legend{font-size:12px;color:var(--muted);margin-top:8px}
.row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--line)}.row:last-child{border:0}
.pill{background:var(--soft);border-radius:99px;padding:2px 10px;font-size:12px}
.drop{border:2px dashed var(--brand2);border-radius:14px;padding:26px;text-align:center;background:var(--soft);cursor:pointer}
.drop input{display:none}.drop b{color:var(--brand)}
button{font:inherit;background:var(--brand);color:#fff;border:0;border-radius:10px;padding:9px 16px;cursor:pointer}button:disabled{opacity:.5}
button.ghost{background:transparent;color:var(--bad);border:1px solid var(--line);padding:5px 10px;font-size:13px}
.ok{color:var(--ok)}.bad{color:var(--bad)}
table{border-collapse:collapse;width:100%}td,th{padding:8px;border-bottom:1px solid var(--line);text-align:left;font-size:14px}th{color:var(--muted);font-weight:600;font-size:12px}
.note{font-size:12px;color:var(--muted);margin-top:10px}
.tbl{overflow-x:auto}
</style></head><body>
<header><div class="wrap top"><div class="brand"><div class="logo">🎟️</div><div><h1>Lottery Hub</h1><div class="sub">Admin dashboard</div></div></div><div class="who" id="who">Signed in</div></div></header>
<main>
<div class="grid stats" id="stats"></div>

<div class="grid two" style="margin-top:14px">
  <div class="card"><h3>App users, last 14 days</h3><div class="chart" id="chart"></div><div class="legend">Each bar is the number of different phones that opened the app that day.</div></div>
  <div class="card"><h3>Results in the app</h3><div id="content"></div><h3 style="margin-top:16px">App versions</h3><div id="versions"></div></div>
</div>

<h2>Publish an official result</h2>
<div class="card">
  <label class="drop" id="drop"><div style="font-size:30px">📄</div><div><b>Choose the official PDF</b> or drop it here</div><div class="note">The numbers are read and checked before you can publish.</div><input id="file" type="file" accept="application/pdf"></label>
  <div id="out" style="margin-top:12px"></div>
</div>

<h2>Published draws</h2>
<div class="card tbl" id="list">Loading…</div>
<p class="note">Users and installs are counted anonymously: each phone makes a random code, and nothing personal is stored. "Total users" means phones that have opened the app at least once. Play Store download numbers appear in the Play Console after launch.</p>
</main>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const $=id=>document.getElementById(id);let pdfText="";
const hdr=()=>({"content-type":"application/json"});
const esc=s=>String(s==null?"":s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const n=a=>(a||[]).length;
const fmt=v=>Number(v||0).toLocaleString("en-IN");
async function readPdf(buf){
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;let out="";
  for(let p=1;p<=pdf.numPages;p++){
    const c=await (await pdf.getPage(p)).getTextContent();const rows=new Map();
    for(const it of c.items){const y=Math.round(it.transform[5]/3);(rows.get(y)||rows.set(y,[]).get(y)).push(it)}
    [...rows.keys()].sort((a,b)=>b-a).forEach(y=>{out+=rows.get(y).sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(" ")+"\\n"});
  }
  return out;
}
function ago(iso){
  if(!iso)return "never";const m=Math.round((Date.now()-new Date(iso))/60000);
  if(m<1)return "just now";if(m<60)return m+" min ago";if(m<1440)return Math.round(m/60)+" h ago";return Math.round(m/1440)+" days ago";
}
function card(label,value,note,icon){return '<div class="card stat"><div class="ico">'+icon+'</div><div class="l">'+label+'</div><div class="v">'+fmt(value)+'</div><div class="n">'+note+'</div></div>'}
async function stats(){
  let j;try{const r=await fetch("/api/admin/stats");if(!r.ok)throw 0;j=await r.json()}catch(e){$("stats").innerHTML='<div class="card bad">Could not load the numbers.</div>';return}
  $("who").textContent=j.email||"Signed in";
  const u=j.users;
  $("stats").innerHTML=card("Total users",u.total,"phones that opened the app","👥")+card("Active today",u.activeToday,"opened the app today","⚡")+
    card("Active, 7 days",u.active7,u.active30+" in the last 30 days","📈")+card("New this week",u.new7,"first-time users, last 7 days","✨");
  const max=Math.max(1,...j.days.map(d=>d.active));
  $("chart").innerHTML=j.days.map(d=>'<div class="col" title="'+d.day+': '+d.active+' active, '+d.joined+' new"><b>'+(d.active||"")+'</b><div class="bar" style="height:'+Math.max(2,Math.round(d.active/max*100))+'%"></div><span>'+d.day.slice(8)+'</span></div>').join("");
  const c=j.content;
  $("content").innerHTML='<div class="row"><span>Draws published</span><b>'+fmt(c.draws)+'</b></div><div class="row"><span>Lotteries covered</span><b>'+fmt(c.lotteries)+'</b></div><div class="row"><span>Last publish</span><b>'+ago(c.lastPublished)+'</b></div>';
  $("versions").innerHTML=n(j.versions)?j.versions.map(v=>'<div class="row"><span>Version '+esc(v.v)+'</span><span class="pill">'+fmt(v.n)+'</span></div>').join(""):'<div class="note">No app opens counted yet.</div>';
}
async function preview(file){
  $("out").innerHTML="Reading…";
  try{pdfText=await readPdf(await file.arrayBuffer());}catch(x){$("out").innerHTML='<p class="bad">Could not read this PDF.</p>';return}
  const r=await fetch("/api/admin/preview",{method:"POST",headers:hdr(),body:JSON.stringify({text:pdfText})});
  const j=await r.json();
  if(!r.ok){$("out").innerHTML='<p class="bad">'+esc(j.error||"Failed")+"</p>";return}
  const d=j.draw,p=j.problems||[];let h="";
  if(d){const q=d.prizes;h+="<p><b>"+esc(d.name)+" "+esc(d.drawNo)+"</b> · "+esc(d.date)+'</p><div class="tbl"><table><tr><th>Prize</th><th>Count</th><th>Sample</th></tr>'+
    [["1st",q.first],["2nd",q.second],["3rd",q.third],["Consolation",q.consolation],["4th",q.fourth],["5th",q.fifth],["6th",q.sixth],["7th",q.seventh],["8th",q.eighth],["9th",q.ninth]]
    .map(x=>"<tr><td>"+x[0]+"</td><td>"+n(x[1])+"</td><td>"+esc((x[1]||[]).slice(0,2).map(t=>t.ticket||t).join(", "))+"</td></tr>").join("")+"</table></div>"}
  h+=p.length?'<p class="bad"><b>Not safe to publish:</b><br>'+p.map(esc).join("<br>")+"</p>":'<p class="ok"><b>All checks passed.</b></p><button id="pub">Publish to app</button>';
  $("out").innerHTML=h;
  if($("pub"))$("pub").onclick=async()=>{
    $("pub").disabled=true;
    const r=await fetch("/api/admin/publish",{method:"POST",headers:hdr(),body:JSON.stringify({text:pdfText})});
    const j=await r.json();
    $("out").innerHTML=r.ok?'<p class="ok"><b>Published '+esc(j.drawNo)+" ("+esc(j.date)+"). Users now see it in the app.</b></p>":'<p class="bad">'+esc(j.error||"Failed")+" "+(j.problems||[]).map(esc).join(", ")+"</p>";
    load();stats();
  };
}
$("file").onchange=e=>{const f=e.target.files[0];if(f)preview(f)};
const drop=$("drop");
["dragover","dragenter"].forEach(t=>drop.addEventListener(t,e=>{e.preventDefault()}));
drop.addEventListener("drop",e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)preview(f)});
async function load(){
  const j=await (await fetch("/api/admin/draws")).json();
  $("list").innerHTML=n(j.draws)?"<table><tr><th>Lottery</th><th>Draw</th><th>Date</th><th></th></tr>"+j.draws.map(d=>"<tr><td>"+esc(d.name)+"</td><td>"+esc(d.drawNo)+"</td><td>"+esc(d.date)+'</td><td><button class="ghost" data-id="'+esc(d.id)+'">Remove</button></td></tr>').join("")+"</table>":"Nothing published yet.";
  document.querySelectorAll("button[data-id]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Remove this draw from the app?"))return;
    await fetch("/api/admin/draws/"+encodeURIComponent(b.dataset.id),{method:"DELETE",headers:hdr()});load();stats();
  });
}
stats();load();
</script></body></html>`;
