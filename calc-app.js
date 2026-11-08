function boot() {
const $=id=>document.getElementById(id);
const DAY=864e5;
const parse=s=>{if(!s)return null;const[y,m,d]=s.split("-").map(Number);return Date.UTC(y,m-1,d)};
const add=(t,n)=>t+n*DAY;
const fmt=t=>{const d=new Date(t);return String(d.getUTCDate()).padStart(2,"0")+"/"+String(d.getUTCMonth()+1).padStart(2,"0")+"/"+d.getUTCFullYear()};
const brl=v=>v.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const yearsBetween=(a,b)=>{const A=new Date(a),B=new Date(b);let y=B.getUTCFullYear()-A.getUTCFullYear();
  if(B.getUTCMonth()<A.getUTCMonth()||(B.getUTCMonth()===A.getUTCMonth()&&B.getUTCDate()<A.getUTCDate()))y--;return Math.max(0,y)};
const dbIn=(y,dd,mm)=>Date.UTC(y,mm-1,dd);
let aviso="ind";

function params(){return{adm:parse($("adm").value),com:parse($("com").value),mot:$("mot").value,sal:+$("sal").value||0,adc:+$("adc").value||0,
  dd:+$("dbd").value||1,mm:+$("dbm").value||1,gd:+$("gd").value||0,crit:$("crit").value}}
function calc(){
  $("new-sim-msg").textContent="";
  $("rep-msg").textContent="";
  $("cp").textContent="Copiar memória";
  const p=params();
  window.lastR=null;
  if(!p.adm||!p.com){render(null,"Informe a data de admissão e a data da comunicação para calcular uma rescisão específica. Para sugestões de datas, basta a admissão.")}
  else if(p.com<p.adm){render(null,"A comunicação deve ser posterior à admissão.")}
  else {window.lastR=compute(p);render(window.lastR)}
  simulate();
}
function compute({adm,com,mot,sal,adc,dd,mm,gd,crit}){
  const base=sal+adc;
  const anos=yearsBetween(adm,com);
  const dAv=mot==="sjc"?Math.min(90,30+3*anos):0;
  const fim=mot==="sjc"?add(com,dAv):com;
  // data-base de referência: primeira ocorrência igual ou posterior ao término projetado
  const fy=new Date(fim).getUTCFullYear();
  let D=dbIn(fy,dd,mm); if(D<fim) D=dbIn(fy+1,dd,mm);
  const jIni=add(D,-30), jFim=add(D,-1);
  // data-base que inaugura a vigência em curso na comunicação
  const cy=new Date(com).getUTCFullYear();
  let Dv=dbIn(cy,dd,mm); if(Dv>com) Dv=dbIn(cy-1,dd,mm);
  const r={adm,com,mot,anos,dAv,fim,D,jIni,jFim,Dv,base,sal,adc,gd,crit};

  // trintídio
  if(mot!=="sjc"){r.t=false;r.tWhy="Só a dispensa sem justa causa gera a indenização adicional."}
  else if(fim>=jIni&&fim<=jFim){r.t=true;r.tWhy="Término projetado em "+fmt(fim)+", dentro da janela de "+fmt(jIni)+" a "+fmt(jFim)+"."}
  else if(fim<jIni){r.t=false;r.tWhy="Término projetado em "+fmt(fim)+", antes da janela que começa em "+fmt(jIni)+"."}
  else {r.t=false;r.tWhy="Término projetado alcança a data-base; as verbas rescisórias devem refletir o reajuste."}
  r.tVal=r.t?base:0;

  // quarintídio
  // garantia pós data-base: comunicação entre a data-base (dia 1) e o último dia do prazo
  const inWin=com>=Dv&&com<=add(Dv,gd-1);
  let Dn=dbIn(cy,dd,mm); if(Dn<=com) Dn=dbIn(cy+1,dd,mm);
  r.gIni=inWin?Dv:Dn; r.gFim=add(r.gIni,gd-1);
  if(mot!=="sjc"){r.q=false;r.qDias=0;r.qWhy="A garantia não se aplica a justa causa, pedido de demissão ou término natural do contrato de safra."}
  else if(!inWin){r.q=false;r.qDias=0;
    r.qWhy=com<Dn&&com>add(Dv,gd-1)
      ? "Comunicação em "+fmt(com)+", fora do período de "+fmt(r.gIni)+" a "+fmt(r.gFim)+". Comunicação anterior à data-base não gera a garantia, ainda que o aviso projete o contrato para depois dela."
      : "Comunicação fora do período de garantia."}
  else {
    const restam=Math.round((r.gFim-com)/DAY)+1;
    r.qDias=crit==="lit"?restam:Math.max(0,Math.round((r.gFim-fim)/DAY));
    r.q=r.qDias>0;
    r.qWhy=crit==="lit"
      ? "Comunicação em "+fmt(com)+", dentro do período de "+fmt(r.gIni)+" a "+fmt(r.gFim)+". Restam "+restam+" dias de garantia."
      : (r.q? "Garantia até "+fmt(r.gFim)+"; o aviso projeta o contrato até "+fmt(fim)+" e restam "+r.qDias+" dias." : "O aviso projetado já ultrapassa o fim da garantia em "+fmt(r.gFim)+".");
  }
  r.qVal=Math.round(base/30*r.qDias*100)/100;
  return r;
}

// simulador: percorre cada data de comunicação possível e agrupa em faixas de mesmo resultado
function simulate(){
  const p=params(), ini=parse($("sim-ini").value), hz=+$("sim-hz").value||120;
  const box=$("sim-list"), strip=$("sim-strip"), best=$("sim-best");
  window.lastSim=null;
  if(!p.adm){box.innerHTML="";strip.innerHTML="";$("sim-sug").innerHTML="";$("sim-note").textContent="";best.textContent="Informe a data de admissão.";return}
  const hj=new Date(), today=Date.UTC(hj.getFullYear(),hj.getMonth(),hj.getDate());
  const start=Math.max(ini||today,today,add(p.adm,1)), days=[];
  $("sim-note").textContent=(ini&&ini<today)?"Datas anteriores a hoje são desconsideradas. A simulação começa em "+fmt(start)+".":"";
  for(let i=0;i<=hz;i++){const c=add(start,i);const r=compute({...p,com:c,mot:"sjc"});
    days.push({c,t:r.t,q:r.q,custo:r.tVal+r.qVal,dAv:r.dAv,fim:r.fim})}
  const key=d=>(d.t?"T":"")+(d.q?"Q":"")+"|"+d.dAv;
  const runs=[];for(const d of days){const l=runs[runs.length-1];if(l&&l.k===key(d)){l.b=d;l.max=Math.max(l.max,d.custo);l.min=Math.min(l.min,d.custo)}else runs.push({k:key(d),a:d,b:d,max:d.custo,min:d.custo})}
  const label=r=>r.a.t?"Gera trintídio":r.a.q?"Gera quarintídio":"Sem parcela adicional";
  const val=r=>r.a.t||r.a.q?(r.min===r.max?brl(r.max):brl(r.min)+" a "+brl(r.max)):"R$ 0,00";
  box.innerHTML=runs.map(r=>`<tr class="${r.a.t||r.a.q?'cost':'free'}"><td>${fmt(r.a.c)}</td><td>${fmt(r.b.c)}</td><td>${r.a.dAv} dias</td><td>${label(r)}</td><td class="num">${val(r)}</td></tr>`).join("");
  // faixa visual
  const W=640,L=10,R=630,x=i=>L+i/(days.length)*(R-L),bw=(R-L)/days.length;
  const cs=getComputedStyle(document.documentElement),c=n=>cs.getPropertyValue(n).trim();
  let s="";days.forEach((d,i)=>{s+=`<rect x="${x(i)}" y="10" width="${bw+.3}" height="26" fill="${d.custo>0?c("--gold"):c("--band")}"/>`});
  const meses=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  days.forEach((d,i)=>{const dt=new Date(d.c);if(dt.getUTCDate()===1){s+=`<line x1="${x(i)}" y1="6" x2="${x(i)}" y2="40" stroke="${c("--ink")}" stroke-width="1"/><text x="${x(i)+3}" y="54" font-size="11" fill="${c("--muted")}" font-family="IBM Plex Mono, monospace">${meses[dt.getUTCMonth()]}/${String(dt.getUTCFullYear()).slice(2)}</text>`}});
  strip.innerHTML=s;
  // datas sugeridas: janelas sem parcela adicional, a partir de hoje
  const free=[];for(const r of runs){if(r.a.t||r.a.q)continue;const l=free[free.length-1];if(l&&add(l.b.c,1)===r.a.c)l.b=r.b;else free.push({a:r.a,b:r.b})}
  const sug=$("sim-sug");
  window.lastSim={runs,free,start,end:days[days.length-1].c,hz};
  if(!free.length){best.textContent="Nenhuma data sem parcela adicional nos próximos "+hz+" dias. Amplie o período simulado.";sug.innerHTML="";return}
  const f0=free[0];
  best.textContent=(f0.a.c===start?"Sugestão: comunicar a partir de hoje, "+fmt(start):"Sugestão: comunicar a partir de "+fmt(f0.a.c))+(f0.b.c===days[days.length-1].c?".":", no máximo até "+fmt(f0.b.c)+".");
  sug.innerHTML=free.slice(0,4).map((w,i)=>{const fim=w.b.c===days[days.length-1].c;
    return `<li><span class="k">${i===0?"Mais próxima":"Janela "+(i+1)}</span><b>${fmt(w.a.c)}${fim?" em diante":" a "+fmt(w.b.c)}</b><span class="why">Comunicação em ${fmt(w.a.c)}: aviso de ${w.a.dAv} dias, término projetado em ${fmt(w.a.fim)}.${fim?"":" Última data segura: "+fmt(w.b.c)+", término em "+fmt(w.b.fim)+"."}</span></li>`}).join("");
}

// relatório em PDF
const MESES=["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"];
const extenso=d=>d.getDate()+" de "+MESES[d.getMonth()]+" de "+d.getFullYear();
const toDataURL=blob=>new Promise((ok,ko)=>{const fr=new FileReader();fr.onload=()=>ok(fr.result);fr.onerror=ko;fr.readAsDataURL(blob)});
let dlNs;
function gerarRelatorio(){
  calc();
  const msg=$("rep-msg"), p=params();
  const prod=$("prod").value.trim(), emp=$("emp").value.trim(), docId=$("doc").value.trim();
  if(!prod||!emp||!p.adm){msg.textContent="Preencha produtor, empregado e data de admissão para gerar o relatório.";return}
  const old=document.getElementById("print-report"); if(old) old.remove();
  const br=d=>{if(!d)return"";const[a,m,dd]=d.split("-");return dd+"/"+m+"/"+a};
  const r=document.createElement("div"); r.id="print-report";
  const logo=document.querySelector(".logo");
  const row=(k,v)=>'<p style="margin:2px 0;font-size:13px"><strong>'+k+':</strong> '+v+'</p>';
  let h='<header style="border-bottom:2px solid #8B6914;padding-bottom:10px;margin-bottom:8px">'
    +(logo?'<img src="'+logo.getAttribute("src")+'" alt="Schnorr & Advogados Associados" style="width:170px;height:auto;display:block;margin-bottom:8px">':"")
    +'<h1 style="font-family:Georgia,serif;font-size:20px;margin:0 0 2px">Relatório de Simulação de Trintídio e Quarintídio</h1>'
    +'<p style="margin:0;color:#5E5A52;font-size:12px">Fruticultura irrigada do Vale do São Francisco · gerado em '+new Date().toLocaleDateString("pt-BR")+'</p></header>';
  h+='<section><h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#8B6914;margin:12px 0 4px">Identificação</h2>'
    +row("Produtor rural ou empresa",prod)+(docId?row("CPF/CNPJ",docId):"")+row("Empregado",emp)
    +row("Data de admissão",br($("adm").value))
    +($("com").value?row("Comunicação da dispensa",br($("com").value)):"")+'</section>';
  const clone=(sel)=>{const el=document.querySelector(sel);if(!el)return null;const c=el.cloneNode(true);c.removeAttribute("aria-live");c.querySelectorAll("button,select,input,textarea,label,.fields").forEach(e=>e.remove());return c};
  const res=clone('[aria-labelledby="h-out"]'); const sim=clone('[aria-labelledby="h-sim"]'); const law=clone('[aria-labelledby="h-law"]');
  r.innerHTML=h;
  if(res) r.appendChild(res);
  if(sim) r.appendChild(sim);
  if(law) r.appendChild(law);
  const f=document.querySelector("footer"); if(f){const fc=f.cloneNode(true);fc.style.marginTop="14px";r.appendChild(fc)}
  document.body.appendChild(r);
  document.body.classList.add("printing");
  const cleanup=()=>{document.body.classList.remove("printing");const x=document.getElementById("print-report");if(x)x.remove();window.removeEventListener("afterprint",cleanup)};
  window.addEventListener("afterprint",cleanup);
  setTimeout(cleanup,120000);
  msg.textContent="Relatório aberto na janela de impressão: escolha 'Salvar como PDF' para guardar o arquivo.";
  window.print();
}

function render(r,err){
  if(!r){$("v1").classList.remove("on");$("v2").classList.remove("on");$("s1").textContent=$("s2").textContent="";$("a1").textContent=$("a2").textContent="";$("w1").textContent=err;$("w2").textContent="";$("facts").innerHTML="";$("memo").textContent="";$("tot").textContent="";$("svg").innerHTML="";return}
  $("v1").classList.toggle("on",r.t);$("v2").classList.toggle("on",r.q);
  $("s1").textContent=r.t?"Devido":"Não devido";$("a1").textContent=brl(r.tVal);$("w1").textContent=r.tWhy;
  $("s2").textContent=r.q?"Devido":"Não devido";$("a2").textContent=brl(r.qVal);$("w2").textContent=r.qWhy;
  const rows=[["Tempo de serviço completo",r.anos+(r.anos===1?" ano":" anos")],["Aviso prévio proporcional",r.dAv+" dias ("+(aviso==="ind"?"indenizado":"trabalhado")+")"],
    ["Término projetado do contrato",fmt(r.fim)],["Data-base de referência",fmt(r.D)],["Janela do trintídio",fmt(r.jIni)+" a "+fmt(r.jFim)],["Base de cálculo mensal",brl(r.base)],["Valor do dia (base ÷ 30)",brl(r.base/30)]];
  $("facts").innerHTML=rows.map(([a,b])=>"<dt>"+a+"</dt><dd>"+b+"</dd>").join("");
  $("tot").textContent=brl(r.tVal+r.qVal);
  const mods={sjc:"dispensa sem justa causa",jc:"dispensa por justa causa",pd:"pedido de demissão",safra:"término do contrato de safra"};
  $("memo").textContent=[
    "MEMÓRIA DE CÁLCULO","Admissão: "+fmt(r.adm),"Comunicação: "+fmt(r.com)+" ("+mods[r.mot]+")",
    "Tempo de serviço completo: "+r.anos+" ano(s)",
    "Aviso prévio: 30 + 3 x "+r.anos+" = "+r.dAv+" dias (Lei 12.506/2011), "+(aviso==="ind"?"indenizado":"trabalhado"),
    "Término projetado: "+fmt(r.com)+" + "+r.dAv+" dias = "+fmt(r.fim)+" (Súmula 182/TST)",
    "Base: salário "+brl(r.sal)+" + adicionais "+brl(r.adc)+" = "+brl(r.base)+" (Súmula 242/TST)","",
    "TRINTÍDIO (art. 9º, Lei 7.238/1984)","Data-base: "+fmt(r.D)+" | Janela: "+fmt(r.jIni)+" a "+fmt(r.jFim),
    "Resultado: "+(r.t?"devido":"não devido")+" | Valor: "+brl(r.tVal),r.tWhy,"",
    "QUARINTÍDIO (garantia pós data-base, CCT)","Período de comunicação alcançado: "+fmt(r.gIni)+" a "+fmt(r.gFim)+" ("+r.gd+" dias)",
    "Critério: "+(r.crit==="lit"?"salários da comunicação ao fim da garantia":"dias da garantia além do aviso projetado"),
    "Dias indenizados: "+r.qDias+" x "+brl(r.base/30)+" = "+brl(r.qVal),r.qWhy,"",
    "TOTAL DAS PARCELAS: "+brl(r.tVal+r.qVal),"",
    "Simulação educacional, calculada por inteligência artificial. Deve ser avaliada por Contador ou Advogado especialista."].join("\n");
  drawRuler(r);
}

function drawRuler(r){
  const pts=[r.com,r.fim,r.jIni,r.D,r.gIni,r.gFim];
  const lo=add(Math.min(...pts),-6), hi=add(Math.max(...pts),6), W=640, L=20, R=620;
  const x=t=>L+(t-lo)/(hi-lo)*(R-L);
  const cs=getComputedStyle(document.documentElement);
  const c=n=>cs.getPropertyValue(n).trim();
  let s="";
  // garantia pós data-base (do início da vigência ou da comunicação)
  {const a=x(Math.max(r.gIni,lo)),b=x(Math.min(add(r.gFim,1),hi));s+=`<rect x="${a}" y="52" width="${Math.max(0,b-a)}" height="22" fill="${c("--band")}" stroke="${c("--line")}"/>`}
  // janela do trintídio
  const ja=x(Math.max(r.jIni,lo)), jb=x(Math.min(add(r.jFim,1),hi));
  s+=`<rect x="${ja}" y="40" width="${Math.max(0,jb-ja)}" height="10" fill="${c("--gold")}"/>`;
  s+=`<line x1="${L}" y1="62" x2="${R}" y2="62" stroke="${c("--muted")}" stroke-width="1"/>`;
  // ticks de mês
  const d0=new Date(lo); let m=Date.UTC(d0.getUTCFullYear(),d0.getUTCMonth()+1,1);
  const meses=["jan","fev","mar","abr","mai","jun","jul","ago","set","out","nov","dez"];
  while(m<hi){const xx=x(m);s+=`<line x1="${xx}" y1="58" x2="${xx}" y2="66" stroke="${c("--muted")}"/><text x="${xx+3}" y="90" font-size="11" fill="${c("--muted")}" font-family="IBM Plex Mono, monospace">${meses[new Date(m).getUTCMonth()]}/${String(new Date(m).getUTCFullYear()).slice(2)}</text>`;m=Date.UTC(new Date(m).getUTCFullYear(),new Date(m).getUTCMonth()+1,1)}
  // marcadores
  const mk=(t,lab,yy,anchorUp)=>{const xx=x(t);const anc=xx<80?"start":xx>560?"end":"middle";
    return `<line x1="${xx}" y1="${anchorUp?28:62}" x2="${xx}" y2="${anchorUp?62:108}" stroke="${c("--ink")}" stroke-width="1.5"/><circle cx="${xx}" cy="62" r="4" fill="${c("--ink")}"/><text x="${xx}" y="${yy}" text-anchor="${anc}" font-size="11.5" fill="${c("--ink")}" font-family="IBM Plex Sans, sans-serif">${lab}</text>`};
  s+=mk(r.com,"Comunicação "+fmt(r.com),20,true);
  if(r.fim!==r.com) s+=mk(r.fim,"Término projetado "+fmt(r.fim),124,false);
  const dx=x(r.D); s+=`<line x1="${dx}" y1="34" x2="${dx}" y2="78" stroke="${c("--gold")}" stroke-width="2" stroke-dasharray="3 2"/><text x="${dx+4}" y="34" font-size="11" fill="${c("--gold")}" font-family="IBM Plex Mono, monospace" ${dx>540?'text-anchor="end" dx="-8"':''}>data-base</text>`;
  $("svg").innerHTML=s;
}

try{const t=new Date();$("sim-ini").min=t.getFullYear()+"-"+String(t.getMonth()+1).padStart(2,"0")+"-"+String(t.getDate()).padStart(2,"0")}catch(e){}
const clearReport=()=>{$("rep-msg").textContent="";const old=$("print-report");if(old)old.remove();document.body.classList.remove("printing")};
// Listen to typing and committed changes (native selects/date pickers/autofill).
["prod","doc","emp"].forEach(id=>["input","change"].forEach(type=>$(id).addEventListener(type,clearReport)));
$("rep").onclick=gerarRelatorio;
["sim-hz","sim-ini"].forEach(id=>["input","change"].forEach(type=>$(id).addEventListener(type,calc)));
["input","change"].forEach(type=>$("fun").addEventListener(type,()=>{$("adc").value=$("fun").value;calc()}));
["adm","com","mot","sal","adc","dbd","dbm","gd","crit"].forEach(id=>["input","change"].forEach(type=>$(id).addEventListener(type,calc)));
$("new-sim").onclick=()=>{
  clearReport();
  ["prod","doc","emp","adm","com","sim-ini"].forEach(id=>$(id).value="");
  // Restore the original CCT presets, not a previous visitor's entries.
  ["mot","fun","sal","adc","dbd","dbm","gd","crit","sim-hz"].forEach(id=>{
    const e=$(id);if(e.tagName==="SELECT")e.selectedIndex=[...e.options].findIndex(o=>o.defaultSelected);
    else e.value=e.defaultValue;
    if(e.tagName==="SELECT"&&e.selectedIndex<0)e.selectedIndex=0;
  });
  aviso="ind";$("av-ind").setAttribute("aria-pressed","true");$("av-trab").setAttribute("aria-pressed","false");
  calc();$("new-sim-msg").textContent="Nova simulação: dados e resultados anteriores apagados. Parâmetros da CCT restaurados.";
  $("prod").focus();
};
const setAv=v=>{aviso=v;$("av-ind").setAttribute("aria-pressed",v==="ind");$("av-trab").setAttribute("aria-pressed",v==="trab");calc()};
$("av-ind").onclick=()=>setAv("ind");$("av-trab").onclick=()=>setAv("trab");
$("cp").onclick=async()=>{const t=$("memo").textContent;try{await navigator.clipboard.writeText(t);$("cp").textContent="Copiada"}catch(e){const rg=document.createRange();rg.selectNodeContents($("memo"));const sl=getSelection();sl.removeAllRanges();sl.addRange(rg);$("cp").textContent="Texto selecionado"}setTimeout(()=>$("cp").textContent="Copiar memória",1800)};
window.matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change",calc);
calc();

}


var SECTIONS = window.__SECTIONS || [];
var calcHost = document.getElementById('calc-host');
var manualPane = document.getElementById('manual-pane');
var tabCalc = document.getElementById('tab-calc');
var tabManual = document.getElementById('tab-manual');
var mSections = document.getElementById('m-sections');
var mControls = document.getElementById('m-controls');
var mPrev = document.getElementById('m-prev');
var mNext = document.getElementById('m-next');
var mPos = document.getElementById('m-pos');
var step = null;
function scrollTop(){ window.scrollTo({ top: 0, behavior: 'auto' }); }
function renderManual(){
  var html = '';
  SECTIONS.forEach(function(h, i){ if (step === null || step === i) html += '<section class="manual-section">' + h + '</section>'; });
  mSections.innerHTML = html;
  mControls.hidden = (step === null);
  mPrev.disabled = (step === 0);
  mPos.textContent = (step === null) ? '' : ((step + 1) + ' / ' + SECTIONS.length);
  mNext.textContent = (step === SECTIONS.length - 1) ? 'Início' : 'Próximo';
}
function showCalc(){ tabCalc.setAttribute('aria-current','true'); tabManual.removeAttribute('aria-current'); calcHost.hidden = false; manualPane.hidden = true; scrollTop(); }
function showManual(){ tabManual.setAttribute('aria-current','true'); tabCalc.removeAttribute('aria-current'); manualPane.hidden = false; calcHost.hidden = true; renderManual(); scrollTop(); }
tabCalc.onclick = showCalc;
tabManual.onclick = showManual;
document.getElementById('m-all').onclick = function(){ step = null; renderManual(); scrollTop(); };
document.getElementById('m-step').onclick = function(){ step = 0; renderManual(); scrollTop(); };
mPrev.onclick = function(){ step = Math.max(0, step - 1); renderManual(); scrollTop(); };
mNext.onclick = function(){ step = (step === SECTIONS.length - 1) ? 0 : step + 1; renderManual(); scrollTop(); };
manualPane.addEventListener('click', function(e){ var a = e.target.closest('a.open-calc'); if (a){ e.preventDefault(); showCalc(); } });
boot();
