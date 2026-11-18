export const ADMIN_HTML = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Lottery Hub admin</title>
<style>
:root{--bg:#f5f3ff;--card:#fff;--ink:#2b2150;--muted:#6b6785;--brand:#6341c8;--ok:#1a7f4b;--bad:#b3261e;--line:#e3def5}
@media (prefers-color-scheme:dark){:root{--bg:#15111f;--card:#201a30;--ink:#efeaff;--muted:#a49fc0;--line:#352d4f}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.5 system-ui,sans-serif}
main{max-width:760px;margin:0 auto;padding:20px 16px 60px}h1{margin:8px 0 2px}p{color:var(--muted);margin:4px 0 16px}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:16px;margin:14px 0}
input,button{font:inherit}input[type=password],input[type=file]{width:100%;padding:10px;border:1px solid var(--line);border-radius:10px;background:transparent;color:var(--ink)}
button{background:var(--brand);color:#fff;border:0;border-radius:10px;padding:10px 16px;cursor:pointer}button:disabled{opacity:.5}
.ok{color:var(--ok)}.bad{color:var(--bad)}table{border-collapse:collapse;width:100%}td,th{padding:6px 8px;border-bottom:1px solid var(--line);text-align:left}
</style></head><body><main>
<h1>Lottery Hub admin</h1><p>Upload an official result PDF. The numbers are read and checked, and you publish them to the app.</p>
<div class="card"><label>Official result PDF</label><input id="file" type="file" accept="application/pdf"><div id="out"></div></div>
<div class="card"><b>Published draws</b><div id="list">Loading…</div></div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
const $=id=>document.getElementById(id);let pdfText="";
const hdr=()=>({"content-type":"application/json"});
async function readPdf(buf){
  const pdf=await pdfjsLib.getDocument({data:buf}).promise;let out="";
  for(let p=1;p<=pdf.numPages;p++){
    const c=await (await pdf.getPage(p)).getTextContent();const rows=new Map();
    for(const it of c.items){const y=Math.round(it.transform[5]/3);(rows.get(y)||rows.set(y,[]).get(y)).push(it)}
    [...rows.keys()].sort((a,b)=>b-a).forEach(y=>{out+=rows.get(y).sort((a,b)=>a.transform[4]-b.transform[4]).map(i=>i.str).join(" ")+"\\n"});
  }
  return out;
}
const n=a=>(a||[]).length;
$("file").onchange=async e=>{
  const f=e.target.files[0];if(!f)return;$("out").innerHTML="Reading…";
  try{pdfText=await readPdf(await f.arrayBuffer());}catch(x){$("out").innerHTML='<p class="bad">Could not read this PDF.</p>';return}
  const r=await fetch("/api/admin/preview",{method:"POST",headers:hdr(),body:JSON.stringify({text:pdfText})});
  const j=await r.json();
  if(!r.ok){$("out").innerHTML='<p class="bad">'+(j.error||"Failed")+"</p>";return}
  const d=j.draw,p=j.problems||[];
  let h="";
  if(d){const q=d.prizes;h+="<p><b>"+d.name+" "+d.drawNo+"</b> · "+d.date+"</p><table><tr><th>Prize</th><th>Numbers</th></tr>"+
    [["1st",q.first],["2nd",q.second],["3rd",q.third],["Consolation",q.consolation],["4th",q.fourth],["5th",q.fifth],["6th",q.sixth],["7th",q.seventh],["8th",q.eighth],["9th",q.ninth]]
    .map(x=>"<tr><td>"+x[0]+"</td><td>"+n(x[1])+" · "+(x[1]||[]).slice(0,2).map(t=>t.ticket||t).join(", ")+"</td></tr>").join("")+"</table>"}
  h+=p.length?'<p class="bad"><b>Not safe to publish:</b><br>'+p.join("<br>")+"</p>":'<p class="ok"><b>All checks passed.</b></p><button id="pub">Publish to app</button>';
  $("out").innerHTML=h;
  if($("pub"))$("pub").onclick=async()=>{
    $("pub").disabled=true;
    const r=await fetch("/api/admin/publish",{method:"POST",headers:hdr(),body:JSON.stringify({text:pdfText})});
    const j=await r.json();
    $("out").innerHTML=r.ok?'<p class="ok"><b>Published '+j.drawNo+" ("+j.date+"). Users now see it in the app.</b></p>":'<p class="bad">'+(j.error||"Failed")+" "+(j.problems||[]).join(", ")+"</p>";
    load();
  };
};
async function load(){
  const j=await (await fetch("/api/admin/draws")).json();
  $("list").innerHTML=n(j.draws)?"<table>"+j.draws.map(d=>"<tr><td>"+d.name+"</td><td>"+d.drawNo+"</td><td>"+d.date+'</td><td><button data-id="'+d.id+'">Remove</button></td></tr>').join("")+"</table>":"Nothing published yet.";
  document.querySelectorAll("button[data-id]").forEach(b=>b.onclick=async()=>{
    if(!confirm("Remove this draw from the app?"))return;
    await fetch("/api/admin/draws/"+encodeURIComponent(b.dataset.id),{method:"DELETE",headers:hdr()});load();
  });
}
load();
</script></main></body></html>`;
