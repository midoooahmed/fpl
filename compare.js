/* compare.js - مقارنة بطولة Game Of Fantasy جوه التطبيق بنفس شكل السكربت الأصلي (الجداول والفلاتر والصفحات) */
(function(){"use strict";
var F=window.__fc,R=F.R,S=F.S,esc=F.esc,toast=F.toast,G=window.__grid;
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var WD=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],PLN={1:"حارس",2:"مدافع",3:"وسط",4:"مهاجم"};
var ENC=encodeURIComponent,DEC=decodeURIComponent;
var C={mode:"t",teams:null,loading:false,t1:"",t2:"",RS:null,tab:"c",q:"",rem:false,lv:false,pos:"",shown:false,prep:null,busy:false,mq:"",mf:0,WI:null};
var SH={},cap={1:{},2:{}},ct=1;
var PG={list:[{id:1,name:"",t1:"",t2:"",mode:"t",snap:null}],act:1,n:1};
try{var sv=JSON.parse(LS.get("fc_cmp2")||"null");if(sv&&sv.list&&sv.list.length){PG.list=sv.list.map(function(p){return{id:p.id,name:p.name||"",t1:p.t1||"",t2:p.t2||"",mode:p.mode==="m"?"m":"t",snap:null}});PG.n=sv.n||PG.list.length;PG.act=PG.list.some(function(p){return p.id===sv.act})?sv.act:PG.list[0].id}}catch(e){}
function cur(){return PG.list.filter(function(p){return p.id===PG.act})[0]}
/* ---------- مقارنة الأعضاء: نفس المحرك والشكل، لكن كل طرف عضو واحد بدل تيم ---------- */
var MEM={},POSN={GKP:1,DEF:2,MID:3,FWD:4};
function memLabels(){
  MEM={};var cnt={},L=[];
  if(!S.D||!S.D.members)return L;
  S.D.members.forEach(function(m){var k=m.person+" - "+m.team;cnt[k]=(cnt[k]||0)+1});
  S.D.members.forEach(function(m){var k=m.person+" - "+m.team;if(cnt[k]>1&&m.contest)k+=" ("+m.contest+")";while(MEM[k])k+=" #"+m.entryId;MEM[k]=m;L.push(k)});
  return L.sort(function(a,b){return a.localeCompare(b,"ar")})}
function LIST(){return C.mode==="m"?memLabels():(C.teams||[])}
/* توقع تقريبي لنقاط اللي لسه ماخلصوش (مفيش xP في الداتا): متوسط نقاط اللي لعبوا فعلًا في نفس المركز بالجولة دي، مضروب في احتمال المشاركة */
function priors(){
  var def={1:[3.4,6],2:[3,7],3:[3.3,8],4:[3.5,9]},acc={1:[0,0,0],2:[0,0,0],3:[0,0,0],4:[0,0,0]},el=(S.D.live&&S.D.live.el)||{},out={};
  Object.keys(el).forEach(function(id){var e=el[id],p=S.D.players[id],t=p&&POSN[p.pos];if(t&&e&&e[0]>0){var a=acc[t];a[0]++;a[1]+=e[1];a[2]+=e[1]*e[1]}});
  [1,2,3,4].forEach(function(t){var a=acc[t],mean=a[0]>=15?a[1]/a[0]:def[t][0],v=a[0]>=15?Math.max(1,a[2]/a[0]-mean*mean):def[t][1],pr=.75;out[t]={xp:pr*mean,xv:Math.max(.5,pr*(v+mean*mean)-pr*pr*mean*mean)}});
  return out}
function memberR(){
  memLabels();var a=MEM[C.t1],b=MEM[C.t2];
  if(!S.D||!a||!b)return{error:"اختار عضوين من القايمة"};
  if(!S.D.live)return{error:"مقارنة الأعضاء محتاجة بيانات اللايف للجولة، حدّث اللايف وجرّب تاني"};
  var live=S.D.live,FX={},tn={},PR=priors();
  Object.keys(S.D.players).forEach(function(id){var p=S.D.players[id];if(p.t&&p.club&&!tn[p.t])tn[p.t]=p.club});
  live.fx.forEach(function(f){(FX[f.h]=FX[f.h]||[]).push({f:f,home:true});(FX[f.a]=FX[f.a]||[]).push({f:f,home:false})});
  function side(m){
    var raw={},bb=m.chip==="bboost",eff=m.d.eff,effId=eff?eff.id:null,effM=eff?eff.mult:1;
    m.d.picks.forEach(function(x){
      var p=S.D.players[x.id]||{n:"#"+x.id,pos:"",club:"",t:0},el=live.el[x.id],list=FX[p.t]||[],t=POSN[p.pos]||0;
      var min=el?el[0]:0,pts=el?el[1]:0;if(S.WI&&S.WI[x.id]!=null)pts=S.WI[x.id];
      var fin=list.length?list.every(function(z){return z.f.fp||z.f.f}):true;
      var ks=list.map(function(z){return z.f.k}).filter(Boolean);
      var sw=(bb||x.slot<=11)?(x.id===effId?effM:1):0,tb=!x.inXI&&!x.subIn;
      raw[p.n]={weight:x.mult,startWeight:sw,points:pts,minutes:min,finished:fin,live:min>0&&list.some(function(z){return z.f.s&&!z.f.fp}),
        clubName:p.club||"—",kickoffs:ks,sortKickoff:ks.length?Math.min.apply(null,ks):null,elementType:t,
        opp:list.map(function(z){return(tn[z.home?z.f.a:z.f.h]||"")+(z.home?" (H)":" (A)")}).join(" + "),
        xp:fin?0:(PR[t]?PR[t].xp:0),xv:fin?0:(PR[t]?PR[t].xv:0),xg:0,
        starterDetails:sw>0?[m.person+(sw>1?" (كابتن ×"+sw+")":"")]:[],trueBenchDetails:tb?[m.person]:[]}});
    return{raw:raw,eff:eff}}
  var A=side(a),B=side(b),same=a.person===b.person,n1=a.person+(same?" ("+a.team+")":""),n2=b.person+(same?" ("+b.team+")":"");
  var det=function(m){return[{id:m.entryId,name:m.person,isCaptain:false,isAutoCaptain:false,multiplier:1,gross:m.d.points,hits:m.cost,net:m.d.net}]};
  return{gameweek:S.gw,team1Name:n1,team2Name:n2,team1Hits:a.cost,team2Hits:b.cost,
    team1CaptainMode:A.eff?"manual":"none",team1CaptainName:A.eff?(S.D.players[A.eff.id]||{}).n:"",team1CaptainMultiplier:A.eff?A.eff.mult:2,
    team2CaptainMode:B.eff?"manual":"none",team2CaptainName:B.eff?(S.D.players[B.eff.id]||{}).n:"",team2CaptainMultiplier:B.eff?B.eff.mult:2,
    team1RawPlayers:A.raw,team2RawPlayers:B.raw,team1Details:det(a),team2Details:det(b)}}
function modeHtml(){return'<div class="tbar" style="margin:10px 0 0"><div class="sg"><button data-cmode="t" class="'+(C.mode==="t"?"on":"")+'">مقارنة تيمات</button><button data-cmode="m" class="'+(C.mode==="m"?"on":"")+'">مقارنة أعضاء</button></div></div>'}

function savePG(){var c=cur();if(c){c.t1=C.t1;c.t2=C.t2;c.mode=C.mode}LS.set("fc_cmp2",JSON.stringify({act:PG.act,n:PG.n,list:PG.list.map(function(p){return{id:p.id,name:p.name,t1:p.t1,t2:p.t2,mode:p.mode==="m"?"m":"t"}})}))}
var FIELDS=["mode","t1","t2","RS","tab","q","rem","lv","pos","shown","WI","mq","mf"];
function snap(p){var o={};FIELDS.forEach(function(k){o[k]=C[k]});p.snap=o}
function restore(p){var o=p.snap||{mode:p.mode==="m"?"m":"t",t1:p.t1,t2:p.t2,RS:null,tab:"c",q:"",rem:false,lv:false,pos:"",shown:false,WI:null,mq:"",mf:0};FIELDS.forEach(function(k){C[k]=o[k]!==undefined?o[k]:C[k]})}
restore(cur());C.t1=cur().t1;C.t2=cur().t2;
R.main.push({id:"cmp",name:"المقارنة",sub:"قارن تيمين أو عضوين - جوا التطبيق",icon:"swap"});
var _title=R.title;R.title=function(t){return t==="cmp"?"المقارنة":(_title?_title(t):null)};R.noCtx=function(t){return t==="cmp"};

/* ---------- حسابات ---------- */
function ncdf(z){var t=1/(1+.2316419*Math.abs(z)),d=.3989423*Math.exp(-z*z/2),p=d*t*(.3193815+t*(-.3565638+t*(1.781478+t*(-1.821256+t*1.330274))));return z>0?1-p:p}
function kf(i){var d=new Date(i);if(isNaN(d))return null;var h=d.getHours(),ap=h>=12?"م":"ص",z=function(n){return(n<10?"0":"")+n};h=h%12||12;return{day:WD[d.getDay()],date:z(d.getDate())+"/"+z(d.getMonth()+1),time:z(h)+":"+z(d.getMinutes())+" "+ap}}
function build(r){
  var all={};Object.keys(r.team1RawPlayers).concat(Object.keys(r.team2RawPlayers)).forEach(function(k){all[k]=1});
  var E={weight:0,startWeight:0,points:0,minutes:0,finished:false,starterDetails:[],trueBenchDetails:[]},g1=0,g2=0,D={c:[],a:[],z:[],b:[]},WP={m:0,v:0,l:[]};
  var J=function(a,s){return a&&a.length?a.join(s||" ، "):"لا يوجد"};
  Object.keys(all).forEach(function(k){
    var a=r.team1RawPlayers[k],b=r.team2RawPlayers[k],p1=a||E,p2=b||E,src=a||b||{};
    var base={name:k,points:p1.points||p2.points||0,minutes:p1.minutes||p2.minutes||0,finished:!!src.finished,live:!!src.live,clubName:src.clubName||"—",kickoffs:src.kickoffs||[],sortKickoff:src.sortKickoff||null,elementType:src.elementType||0,opp:src.opp||"",xp:src.xp||0,xv:src.xv||0,xg:src.xg||0};
    var o=function(x){var y={};for(var q in base)y[q]=base[q];for(q in x)y[q]=x[q];return y};
    g1+=p1.weight*base.points;g2+=p2.weight*base.points;var dd=p1.weight-p2.weight;
    if(dd&&!base.finished){WP.m+=dd*base.xp;WP.v+=dd*dd*base.xv;WP.l.push({n:k,d:dd,xp:base.xp,xv:base.xv,xg:base.xg,opp:base.opp})}
    var s1=p1.startWeight||0,s2=p2.startWeight||0;
    if(s1>0||s2>0){var cw=Math.min(s1,s2);
      if(cw>0)D.c.push(o({weight:cw,t1d:J(p1.starterDetails),t2d:J(p2.starterDetails)}));
      if(s1-cw>0)D.a.push(o({netWeight:s1-cw,w1:p1.weight,w2:p2.weight,details:J(p1.starterDetails)}));
      if(s2-cw>0)D.z.push(o({netWeight:s2-cw,w1:p1.weight,w2:p2.weight,details:J(p2.starterDetails," — ")}))}
    var b1=p1.trueBenchDetails&&p1.trueBenchDetails.length,b2=p2.trueBenchDetails&&p2.trueBenchDetails.length;
    if(b1||b2)D.b.push(o({t1d:b1?J(p1.trueBenchDetails):"لا يوجد",t2d:b2?J(p2.trueBenchDetails):"لا يوجد"}))});
  return{r:r,D:D,WP:WP,g1:g1,g2:g2,net1:g1-r.team1Hits,net2:g2-r.team2Hits}}
function wst(l){var rem=l.filter(function(p){return!(p.minutes>0||p.finished)});return{tot:l.length,pl:l.length-rem.length,rem:rem.length,w:rem.reduce(function(s,p){return s+(p.netWeight||1)},0)}}
function capNote(m,n,x){if(m==="none"||!n)return"";var t=Number(x)===3;return m==="auto"?((t?"🔥🎲 تربل كابتن تلقائي: ":"🎲 الكابتن التلقائي: ")+n):((t?"🔥 تربل كابتن: ":"👑 الكابتن: ")+n)}
function winPct(){var q=C.RS,cur0=q.net1-q.net2,m=cur0+q.WP.m,sd=Math.sqrt(q.WP.v),p1;if(sd<.01)p1=cur0>0?1:cur0<0?0:.5;else p1=ncdf(m/sd);var pc=Math.round(p1*100);if(sd>=.01)pc=Math.min(99,Math.max(1,pc));return{pc:pc,cur:cur0,m:m}}

/* ---------- الأعمدة (زي الأصلي) ---------- */
function stc(p){var m=p.minutes>0?(p.live&&!p.finished?["lv","✓",p.minutes+"’"]:["ok","✓",p.minutes+"’"]):(p.finished?["no","✕","غاب"]:["up","–","لسه"]);return'<span class="st '+m[0]+'"><i>'+m[1]+"</i>"+m[2]+"</span>"}
function koc(p){return p.kickoffs.length?p.kickoffs.map(function(i){var k=kf(i);return k?'<div class="ko">'+k.day+" <bdi>"+k.date+"</bdi><br><bdi>"+k.time+"</bdi></div>":""}).join(""):"—"}
function det(s){
  if(!s||s==="لا يوجد")return"—";
  var BR=[["[مضاعف تربل كابتن التيم 🔥👑]","tr","تربل كابتن التيم 🔥👑"],["[مضاعف تربل كابتن تلقائي 🔥🎲]","tr","تربل كابتن تلقائي 🔥🎲"],["[مضاعف كابتن التيم 👑]","cp","كابتن التيم 👑"],["[مضاعف كابتن تلقائي 🎲]","cp","كابتن تلقائي 🎲"]];
  return s.split(/ [،—] /).map(function(x){var t=x,tb=null,st=null;BR.forEach(function(r){if(t.indexOf(r[0])>-1){t=t.replace(r[0],"").trim();tb=r}});
    if(t.indexOf("(كابتن غائب")>-1)st=["ms","كابتن غائب 🪑❌"];else if(t.indexOf("(فايس تربل كابتن")>-1)st=["vt","فايس تربل كابتن 👑🔥"];else if(t.indexOf("(فايس كابتن")>-1)st=["vc","فايس كابتن 👑"];else if(t.indexOf("(تربل فايس")>-1)st=["vc","تربل فايس 👑🔥"];
    var h=(st?'<span class="bg2 '+st[0]+'">'+st[1]+"</span>":"")+(tb?'<span class="bg2 '+tb[1]+'">'+tb[2]+"</span>":"");
    return'<div class="dt'+(x.indexOf("👑")>-1?" cp":"")+'">'+(h?h+"<br>":"")+"<bdi>"+esc(t)+"</bdi></div>"}).join("")}
function BASE(wide){var d=wide;return[
  {k:"name",l:"اللاعب",v:function(p){return p.name},h:function(p){return esc(p.name)}},
  {k:"st",l:"الحالة",def:d,v:function(p){return p.minutes},h:stc},
  {k:"pos",l:"المركز",def:d,v:function(p){return p.elementType||99},h:function(p){return PLN[p.elementType]||"—"}},
  {k:"club",l:"النادي",def:d,v:function(p){return p.clubName},h:function(p){return esc(p.clubName)}},
  {k:"ko",l:"موعد المباراة",def:d,v:function(p){return p.sortKickoff?+new Date(p.sortKickoff):9e15},h:koc},
  {k:"pts",l:"النقاط",def:d,num:true,v:function(p){return p.points},h:function(p){return'<b style="font-size:15px">'+p.points+"</b>"}}]}
function colsFor(tab){
  if(tab==="c")return BASE(true).concat([{k:"w",l:"عدد التشابه",num:true,v:function(p){return p.weight}},{k:"d1",l:"عند الأول",wr:1,v:function(p){return p.t1d},h:function(p){return det(p.t1d)}},{k:"d2",l:"عند الثاني",wr:1,v:function(p){return p.t2d},h:function(p){return det(p.t2d)}}]);
  if(tab==="b")return BASE(true).concat([{k:"d1",l:"في الأول",wr:1,v:function(p){return p.t1d},h:function(p){return det(p.t1d)}},{k:"d2",l:"في الثاني",wr:1,v:function(p){return p.t2d},h:function(p){return det(p.t2d)}}]);
  return BASE(false).concat([{k:"nw",l:"الفارق",num:true,v:function(p){return p.netWeight},h:function(p){return'<b style="color:var(--ng);font-weight:600">'+p.netWeight+"</b>"}},{k:"nwp",l:"النقاط × الفارق",num:true,def:false,v:function(p){return p.netWeight*p.points},h:function(p){return'<b style="color:var(--act)">'+p.netWeight*p.points+"</b>"}},{k:"dt",l:"عند مين",def:false,wr:1,v:function(p){return p.details},h:function(p){return det(p.details)}}])}
function rowsOf(tab){var q=C.q.trim();return(C.RS.D[tab]||[]).filter(function(p){return(!q||(p.name+" "+p.clubName).indexOf(q)>-1)&&(!C.rem||!p.finished)&&(!C.lv||p.live)&&(!C.pos||String(p.elementType)===C.pos)})}
function gridOf(tab,title,plain){
  var all=colsFor(tab);
  return G.render({key:"cmp_"+tab,title:title,rows:rowsOf(tab),cols:all,rowKey:function(p){return p.name},plain:true,hdr:"cmp",defSort:function(a,b){return(tab==="a"||tab==="z"?b.netWeight*b.points-a.netWeight*a.points:b.points-a.points)||String(a.name).localeCompare(b.name,"ar")},rowCls:function(p){return(p.t1d||"").indexOf("👑")>-1||(p.t2d||"").indexOf("👑")>-1||(p.details||"").indexOf("👑")>-1?"cr":""}})}

/* ---------- ماذا لو ---------- */
function initWI(){
  var rows=[];[[1,C.RS.D.a],[2,C.RS.D.z]].forEach(function(pr){(pr[1]||[]).forEach(function(p){if(p.finished)return;var ko=p.sortKickoff?+new Date(p.sortKickoff):9e15;rows.push({key:"t"+pr[0]+"_"+p.name,team:pr[0],name:p.name,nw:p.netWeight,points:p.points||0,w1:p.w1||0,w2:p.w2||0,ko:isNaN(ko)?9e15:ko,xp:p.xp||0,p:p})})});
  rows.sort(function(a,b){return(a.ko-b.ko)||String(a.name).localeCompare(String(b.name),"ar")});
  C.WI={preds:{},s1:true,s2:true,applied:null,rows:rows,b1:C.RS.net1,b2:C.RS.net2}}
function wiCalc(){var a=0,b=0,W=C.WI;W.rows.forEach(function(r){if(!(r.team===1?W.s1:W.s2)||!(r.key in W.preds))return;var d=W.preds[r.key]-r.points;a+=r.w1*d;b+=r.w2*d});return{a:a,b:b}}
function wiHtml(){
  var W=C.WI,c=W.applied,r=C.RS.r;
  var sc=function(n,b,d,on){return on?'<div class="cd tm" style="flex:1;cursor:default"><div class="nm3">'+esc(n)+'</div><div class="sc n">'+(b+(c?d:0))+'</div><div class="cp3" style="color:'+(d>0?"var(--act)":d<0?"var(--ng)":"var(--mu)")+'">'+(c?"الحالي "+b+" ("+(d>0?"+":"")+d+")":"")+"</div></div>":""};
  var rows=W.rows.filter(function(x){return x.team===1?W.s1:W.s2}).map(function(x){var ch=x.key in W.preds,v=ch?W.preds[x.key]:x.points,i=W.rows.indexOf(x);
    return"<tr><td>"+esc(x.name)+' <span class="mut">× '+x.nw+'</span></td><td style="color:'+(x.team===1?"#6366F1":"var(--act)")+';font-weight:500">'+esc(x.team===1?r.team1Name:r.team2Name)+"</td><td>"+koc(x.p)+'</td><td><span class="wi"><button data-cwi="'+i+':1">+</button><b class="n '+(ch?"up":"")+'">'+v+'</b><button data-cwi="'+i+':-1">−</button></span></td></tr>'}).join("")||'<tr><td class="emp" colspan="4">مفيش لعيبة ماتشهم لسه ماخلصش.</td></tr>';
  return'<div class="cd fbox"><h4>🔮 ماذا لو: عدّل إجمالي نقاط اللعيبة اللي ماتشهم لسه ماخلصش</h4><div class="fr"><label class="chk"><input type="checkbox" data-cwt="1"'+(W.s1?" checked":"")+"> "+esc(r.team1Name)+'</label><label class="chk"><input type="checkbox" data-cwt="2"'+(W.s2?" checked":"")+"> "+esc(r.team2Name)+'</label><button class="chip" data-cwgo>🔮 ما تيجو نشوف</button><button class="chip" data-cwx>🎯 املا بتوقع xG</button><button class="chip" data-cwr>↺ إعادة ضبط</button></div><div style="display:flex;gap:10px">'+sc(r.team1Name,W.b1,c?c.a:0,W.s1)+sc(r.team2Name,W.b2,c?c.b:0,W.s2)+'</div></div><div class="tw cmp" data-t="ماذا لو"><table class="gt"><thead><tr><th>اللاعب</th><th>التيم</th><th>موعد المباراة</th><th>توقع النقاط</th></tr></thead><tbody>'+rows+"</tbody></table></div>"}

/* ---------- العرض ---------- */
function pgsHtml(){return'<div class="pgs">'+PG.list.map(function(p,i){var cv=p.id===PG.act?C:p,t1=p.id===PG.act?C.t1:p.t1,t2=p.id===PG.act?C.t2:p.t2,title=p.name?esc(p.name):(t1&&t2?"<bdi>"+esc(t1)+"</bdi> × <bdi>"+esc(t2)+"</bdi>":(t1||t2?"<bdi>"+esc(t1||t2)+"</bdi> × ؟":"مقارنة "+(i+1)));return'<div class="pchip'+(p.id===PG.act?" on":"")+'" data-cpg="'+p.id+'"><span class="pt2">'+title+'</span><button data-cpe="'+p.id+'" aria-label="تغيير الاسم">✎</button>'+(PG.list.length>1?'<button data-cpx="'+p.id+'" aria-label="إغلاق">×</button>':"")+"</div>"}).join("")+'<button class="padd" data-cpadd aria-label="مقارنة جديدة"'+(PG.list.length>=15?" disabled":"")+">+</button></div>"}
function pk(slot,v){return'<div class="k" style="margin:'+(slot===1?"0":"10px")+' 0 6px">'+(C.mode==="m"?(slot===1?"العضو الأول - اختار أو ابحث 🔍":"العضو التاني - اختار أو ابحث 🔍"):(slot===1?"الفريق الأول - اختار أو ابحث 🔍":"الفريق الثاني - اختار أو ابحث 🔍"))+'</div><button class="pk" data-cpk="'+slot+'"><span>'+(v?esc(v):(C.mode==="m"?(slot===1?"اختر العضو الأول...":"اختر العضو التاني..."):(slot===1?"اختر الفريق الأول...":"اختر الفريق الثاني...")))+"</span>"+F.ic("cd",18)+"</button>"}
function teamCard(i,r,net,g,hits,note,pl,second){return'<div class="cd tm'+(second?"":" b")+'" data-ctab="m" data-cmf="'+i+'"><div class="nm3">'+esc(i===1?r.team1Name:r.team2Name)+'</div><div class="cp3">'+esc(note)+'</div><div class="sc n">'+net+'</div><div class="mini2"><span>الأساسية '+g+'</span><span class="dn n">السوالب '+(hits>0?"-"+hits:0)+'</span></div><div class="mini2"><span>لعب '+pl.pl+" من "+pl.tot+' لعيبه</span><span>الباقي '+pl.rem+" ("+pl.w+")</span></div></div>"}
R.views.cmp=function(){
  if(C.mode!=="m"&&!C.teams&&!C.loading){C.loading=true;F.api({api:"teams"}).then(function(r){C.teams=Array.isArray(r)?r:[];C.loading=false;F.render()}).catch(function(){C.teams=[];C.loading=false;F.render();toast("تعذّر تحميل قايمة الفرق")})}
  var h=pgsHtml()+modeHtml()+'<div class="cd" style="margin-top:10px">'+pk(1,C.t1)+pk(2,C.t2)+'<button class="btn b1" data-cstart style="width:100%;margin-top:14px"'+(C.busy?" disabled":"")+">"+(C.busy?"بيحلل...":"ابدأ التحليل ⚡")+"</button></div>";
  if(!C.RS)return h+(C.mode!=="m"&&C.teams&&!C.teams.length?'<div class="empty">قايمة الفرق فاضية - ضيف تيمات في شيت "الفرق"</div>':"");
  var Q=C.RS,r=Q.r,w=winPct(),a1=wst(Q.D.a),a2=wst(Q.D.z),sh=C.shown;
  h+='<div class="sec">الجولة '+r.gameweek+' · مباشر</div><div class="vsr">'+teamCard(1,r,Q.net1,Q.g1,r.team1Hits,capNote(r.team1CaptainMode,r.team1CaptainName,r.team1CaptainMultiplier),a1,false)+'<div class="vsc">VS</div>'+teamCard(2,r,Q.net2,Q.g2,r.team2Hits,capNote(r.team2CaptainMode,r.team2CaptainName,r.team2CaptainMultiplier),a2,true)+"</div>";
  h+='<div class="cd fbox"><div style="display:flex;justify-content:space-between;font-weight:500;font-size:.76rem"><span>'+esc(r.team1Name)+" · "+(sh?w.pc+"%":"؟؟%")+"</span><span>"+esc(r.team2Name)+" · "+(sh?100-w.pc+"%":"؟؟%")+'</span></div><div class="bb" style="height:11px;margin-top:7px"><i class="l" style="width:'+(sh?w.pc:50)+'%"></i></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><span class="mut" style="font-size:.76rem">'+(sh?"الفارق الحالي "+(w.cur>0?"+":"")+w.cur+" · المتوقع بعد اللعيبة الباقيين "+(w.m>0?"+":"")+Math.round(w.m):"النسبة مخفية - اضغط عشان تشوفها")+'</span><button class="chip" data-cshow>'+(sh?"🙈 اخفي النسبة":"👁️ اظهر النسبة")+"</button></div>"+(sh?'<div class="mut" style="font-size:.68rem;margin-top:6px">النسبة محسوبة من الفارق الحالي + توقع اللعيبة الباقيين (xG/xA، احتمال اللعب، الكلين شيت، الماتشات المتبقية) مش من النتيجة بس.</div>':"")+"</div>";
  h+='<div class="fr" style="margin:6px 0 12px">'+(C.mode==="m"?"":'<button class="chip" data-ccap>👑 تعديل الكابتن</button>')+'<button class="chip" data-crf>🔄 تحديث النتائج</button><button class="chip" data-cshot>📸 حمل صورة</button><button class="chip" data-cweap>🏹 صورة الأسلحة</button><button class="chip" data-cxl>🟩 Excel</button></div>';
  var tabs=[["c","🤝 المشتركون"],["a","🏹 أسلحة "+r.team1Name],["z","🏹 أسلحة "+r.team2Name],["b","🪑 الدكة"],["w","🔮 ماذا لو"],["m","👥 الأعضاء"]];
  h+='<div class="sg" style="margin-bottom:10px">'+tabs.map(function(t){return'<button data-ctab="'+t[0]+'" class="'+(C.tab===t[0]?"on":"")+'">'+esc(t[1])+"</button>"}).join("")+"</div>";
  if(C.tab==="w"){if(!C.WI||!C.WI.rows.length&&!C.WI.applied)initWI();return h+wiHtml()}
  if(C.tab==="m"){
    var mf=C.mf,q=C.mq.trim();
    h+='<div class="fr"><button class="fchip'+(mf===0?" on":"")+'" data-cmf="0">الكل</button><button class="fchip'+(mf===1?" on":"")+'" data-cmf="1">'+esc(r.team1Name)+'</button><button class="fchip'+(mf===2?" on":"")+'" data-cmf="2">'+esc(r.team2Name)+'</button><label class="sr" style="flex:1;min-width:150px;height:38px"><input id="cmq" placeholder="ابحث عن عضو…" value="'+esc(C.mq)+'"></label></div><div class="mgrid">';
    [1,2].forEach(function(i){if(mf&&mf!==i)return;(r["team"+i+"Details"]||[]).filter(function(m){return!q||m.name.indexOf(q)>-1}).forEach(function(m){
      h+='<div class="cd memc" data-cmem="'+esc(m.id)+":"+ENC(m.name)+'"><div class="h"><span class="av"><b>'+esc(m.name.charAt(0))+'</b></span><div><b style="font-weight:500">'+esc(m.name)+"</b><br>"+(m.isCaptain?'<span class="chip ac">'+(m.isAutoCaptain?"🎲 تلقائي ":"👑 ")+(m.multiplier>=3?"تربل ":"كابتن ")+"×"+m.multiplier+"</span>":'<small class="mut"><bdi>'+esc(i===1?r.team1Name:r.team2Name)+"</bdi></small>")+'</div></div><div class="nn"><span>النقاط</span><strong class="n">'+m.gross+'</strong></div><div class="nn"><span>السوالب</span><strong class="dn n">-'+m.hits+'</strong></div><div class="nn"><span>الصافي</span><strong class="up n">'+m.net+"</strong></div></div>"})});
    return h+"</div>"}
  h+='<div class="cd fbox"><h4>🔎 الفلاتر</h4><div class="fr"><label class="sr" style="flex:1 1 170px;height:40px"><input id="cq" placeholder="ابحث عن لاعب أو نادي…" value="'+esc(C.q)+'"></label><label class="chk"><input type="checkbox" data-cf="rem"'+(C.rem?" checked":"")+"> اللاعبين المتبقية (لسه ماتشهم مبدأش)</label><label class=\"chk\"><input type=\"checkbox\" data-cf=\"lv\""+(C.lv?" checked":"")+"> ماتشهم شغال دلوقتي 🟡</label></div>"+
   '<div class="fr">'+[["","كل المراكز"],["1","حارس"],["2","مدافع"],["3","وسط"],["4","مهاجم"]].map(function(p){return'<span class="fchip'+(C.pos===p[0]?" on":"")+'" data-cpos="'+p[0]+'">'+p[1]+"</span>"}).join("")+'<span class="fchip" data-cfr>↺ إعادة ضبط</span></div><h4>🧩 اتحكم في الأعمدة</h4><div class="fr">'+colsFor(C.tab).map(function(c){var on=G.colOn(G.state("cmp_"+C.tab),c);return'<label class="chk"><input type="checkbox" data-cvk="'+C.tab+":"+c.k+'"'+(on?" checked":"")+"> "+esc(c.l)+"</label>"}).join("")+"</div></div>";
  var titles={c:"اللاعبون المشتركون",a:"أسلحة "+r.team1Name,z:"أسلحة "+r.team2Name,b:"غرفة الدكة"};
  return h+gridOf(C.tab,titles[C.tab])}
R.input=(function(prev){return function(e){if(prev)prev(e);var t=e.target,id=t.id,pos;
  if(id==="cq"||id==="cmq"){if(id==="cq")C.q=t.value;else C.mq=t.value;pos=t.selectionStart;F.render();var n=F.$("#"+id);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}}
  if(id==="c1q"){var q=t.value.toLowerCase();F.$$("[data-cpick]").forEach(function(d){d.style.display=DEC(d.getAttribute("data-cpick").split(":")[1]).toLowerCase().indexOf(q)>-1?"":"none"})}}})(R.input);

/* ---------- التشغيل ---------- */
function ovOf(k){return SH[k]?JSON.stringify({mode:"shock",captainId:null,multiplier:SH[k]}):null}
function run(save){
  C.busy=true;F.render();var q={api:"cmp",t1:C.t1,t2:C.t2};
  if(save){q.save=1;q.c1=JSON.stringify(cap[1]);q.c2=JSON.stringify(cap[2])}else{var a=ovOf(C.t1),b=ovOf(C.t2);if(a)q.c1=a;if(b)q.c2=b}
  return (C.mode==="m"?Promise.resolve(memberR()):F.api(q)).then(function(r){C.busy=false;if(!r||r.error){toast(r&&r.error||"تعذّر التحليل");F.render();return}
    if(save){SH[C.t1]=cap[1].mode==="shock"?cap[1].multiplier:0;SH[C.t2]=cap[2].mode==="shock"?cap[2].multiplier:0}
    C.RS=build(r);C.WI=null;C.shown=false;savePG();F.render()}).catch(function(){C.busy=false;toast("حصل خطأ في التحليل");F.render()})}
function start(){
  if(!C.t1||!C.t2){toast(C.mode==="m"?"يرجى اختيار عضوين.":"يرجى اختيار فريقين.");return}if(C.t1===C.t2){toast(C.mode==="m"?"اختر عضوين مختلفين.":"اختر فريقين مختلفين.");return}
  if(C.mode==="m"){run(false);return}
  C.busy=true;F.render();
  F.api({api:"prep",t1:C.t1,t2:C.t2}).then(function(p){C.busy=false;if(!p||p.error){toast(p&&p.error||"تعذّر تجهيز المقارنة");F.render();return}C.prep=p;
    if(p.team1.needsCaptain||p.team2.needsCaptain){F.render();openCap()}else run(false)}).catch(function(){C.busy=false;toast("حصل خطأ في تجهيز المقارنة");F.render()})}
function openCap(){
  var p=C.prep;[1,2].forEach(function(i){var s=p["team"+i].saved||{mode:"auto",captainId:null,multiplier:2},k=i===1?C.t1:C.t2;cap[i]={mode:s.mode||"auto",captainId:s.captainId||null,multiplier:Number(s.multiplier)===3?3:2};if(SH[k])cap[i]={mode:"shock",captainId:null,multiplier:SH[k]}});
  ct=1;paintCap(true)}
function paintCap(first){
  var p=C.prep,c=cap[ct],t=p["team"+ct],on=function(m,id){return c.mode===m&&(m!=="manual"||String(c.captainId)===String(id))};
  var o=function(m,id,l){return'<div class="opt '+(on(m,id)?"on":"")+'" data-ccp="'+m+":"+esc(id||"")+'"><span class="cb">'+(on(m,id)?"✓":"")+"</span><b>"+l+"</b>"+(on(m,id)&&m!=="none"?"<small>"+(c.multiplier===3?"🔥":"")+(m==="auto"?"🎲":m==="shock"?"🎭":"👑")+"</small>":"")+"</div>"};
  var html='<div class="sg"><button data-cct="1" class="'+(ct===1?"on":"")+'">'+esc(p.team1.name)+'</button><button data-cct="2" class="'+(ct===2?"on":"")+'">'+esc(p.team2.name)+'</button></div><div class="sec">المضاعف</div><div class="sg"><button data-ccm="2" class="'+(c.multiplier===2?"on":"")+'">👑 كابتن ×2</button><button data-ccm="3" class="'+(c.multiplier===3?"on":"")+'">🔥 تربل كابتن ×3</button></div><div class="sec">الكابتن</div>'+o("shock","","هتخض الاول ( استرها يارب )")+o("none","","بدون كابتن")+o("auto","","كابتن تلقائي 🎲 (أقل صافي نقاط)")+(t.members||[]).map(function(m){return o("manual",m.id,esc(m.name))}).join("")+'<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:16px"><button class="btn b2" data-ccx>إلغاء</button><button class="btn b1" data-ccok>✅ تأكيد واحسب</button></div>';
  if(!first)F.pop();F.push("👑 اختيار كابتن كل فريق للجولة دي",html,"ccap")}

/* ---------- تشكيلة عضو ---------- */
function pitchSheet(id,name,list,team){
  F.push(name+" - "+team,'<div class="empty">بيحمّل التشكيلة...</div>',"cpitch");
  F.api({api:"pitch",id:id}).then(function(d){
    var top=F.S.stack[F.S.stack.length-1];if(!top||top.kind!=="cpitch")return;
    if(d.error){top.html='<div class="empty">'+esc(d.error)+"</div>";F.paintSheet();return}
    var L=list.slice().sort(function(a,b){return b.net-a.net}),rk=0;L.forEach(function(m,i){if(m.name===name)rk=i+1});
    var pc=function(p,xi){var b=p.capOut?'<u class="bg" style="background:#94a3b8">C</u>':(p.cap||p.capIn)?'<u class="bg">'+(p.mult>=3?"TC":"C")+"</u>":(p.vice?'<u class="bg v">V</u>':""),m=p.subIn?'<u class="bg i">↑</u>':p.subOut?'<u class="bg o">↓</u>':"",dot=p.min>0?(p.live?"#f59e0b":"#10b981"):(p.fin?"#ef4444":"#94a3b8");
      return'<div class="p '+(p.subOut?"dnp":"")+'"><span class="av" style="--s:42px"><b>'+esc(F.ini(p.name))+"</b>"+(p.code?'<img alt="" loading="lazy" src="https://resources.premierleague.com/premierleague25/photos/players/110x140/'+p.code+'.png" onload="this.classList.add(\'ok\')" onerror="this.remove()">':"")+"</span>"+b+m+'<span class="nm">'+esc(p.name)+'</span><em class="n">'+(xi?p.pts*p.mult:p.pts)+'</em><i style="position:absolute;top:34px;inset-inline-end:10px;width:11px;height:11px;border-radius:50%;background:'+dot+';border:2px solid #fff"></i></div>'};
    var row=function(t){return'<div class="pr">'+d.starters.filter(function(p){return p.type===t}).sort(function(a,b){return a.pos-b.pos}).map(function(p){return pc(p,true)}).join("")+"</div>"};
    var st=[["الترتيب",rk+" من "+L.length],["النقاط",d.gross],["السوالب",d.hit?"-"+d.hit:0],["الصافي",d.net],["الدكة",d.benchPts],["لسه هيلعبوا",d.remaining],["قيمة الفريق",Number(d.value).toFixed(1)],["الترتيب العالمي",d.overall?Number(d.overall).toLocaleString("en"):"—"]];
    var notes=(d.subs||[]).map(function(s){return"<div>🔄 <b>"+esc(s.out)+"</b> ⬇ غاب ← <b>"+esc(s.inn)+"</b> ⬆ دخل مكانه</div>"}).join("")+(d.capSwap?"<div>👑 الكابتن <b>"+esc(d.capSwap.from)+"</b> غاب ← المضاعف انتقل لـ <b>"+esc(d.capSwap.to)+"</b></div>":"")||"<div>مفيش تبديلات أو تغيير كابتن لحد دلوقتي.</div>";
    top.html='<div class="hs" style="grid-template-columns:repeat(4,1fr)">'+st.map(function(x){return"<div><b class=\"n\" style=\"font-size:15px\">"+x[1]+"</b><small>"+x[0]+"</small></div>"}).join("")+'</div><div class="pitch">'+row(1)+row(2)+row(3)+row(4)+'</div><div class="bn"><div class="mut" style="font-size:12px;padding:0 8px 6px">الدكة'+(d.chip?" · شيب: "+esc(d.chip):"")+'</div><div class="pr">'+d.bench.map(function(p){return pc(p,false)}).join("")+'</div></div><div class="cd" style="margin-top:12px;line-height:1.9;font-size:.76rem">'+notes+"</div>";F.paintSheet()}).catch(function(){var top=F.S.stack[F.S.stack.length-1];if(top){top.html='<div class="empty">حصل خطأ أثناء تحميل التشكيلة</div>';F.paintSheet()}})}

/* ---------- Excel وصور ---------- */
function excel(){
  if(!window.XLSX){toast("مكتبة Excel لسه ماتحمّلتش");return}var r=C.RS.r,wb=XLSX.utils.book_new();
  [["c","المشتركون"],["a","أسلحة "+r.team1Name],["z","أسلحة "+r.team2Name],["b","غرفة الدكة"]].forEach(function(x){var cols=colsFor(x[0]),tmp=document.createElement("div"),rows=(C.RS.D[x[0]]||[]).map(function(p){return cols.map(function(c){tmp.innerHTML=c.h?c.h(p):"";return(c.h?tmp.textContent:c.v(p)).trim()})});
    XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([cols.map(function(c){return c.l})].concat(rows)),x[1].replace(/[\\\/?*\[\]:]/g,"").substring(0,31))});
  XLSX.writeFile(wb,"FPL_GW"+r.gameweek+"_"+r.team1Name+"_vs_"+r.team2Name+".xlsx")}
function weapons(){
  var r=C.RS.r,Q=C.RS,el=document.createElement("div");el.style.cssText="display:flex;gap:14px;align-items:flex-start";
  [[1,"a",Q.net1,r.team1Name,r.team1CaptainMode,r.team1CaptainName,r.team1CaptainMultiplier],[2,"z",Q.net2,r.team2Name,r.team2CaptainMode,r.team2CaptainName,r.team2CaptainMultiplier]].forEach(function(x){
    var s=G.state("cmp_"+x[1]);var keep=s.cv;s.cv={};var col=document.createElement("div");col.style.cssText="display:flex;flex-direction:column;gap:10px";
    col.innerHTML='<div class="cd tm'+(x[0]===1?" b":"")+'" style="cursor:default"><div class="nm3">'+esc(x[3])+'</div><div class="sc n">'+x[2]+'</div><div class="cp3">'+esc(capNote(x[4],x[5],x[6]))+"</div></div>"+G.render({key:"cmpw_"+x[1],title:x[3],rows:C.RS.D[x[1]],cols:colsFor(x[1]),rowKey:function(p){return p.name},plain:true,hdr:"cmp",defSort:function(a,b){return b.netWeight*b.points-a.netWeight*a.points}});
    s.cv=keep;el.appendChild(col)});
  F.capture(el,"أسلحة "+r.team1Name+" و "+r.team2Name+" - GW"+r.gameweek)}

/* ---------- الأحداث ---------- */
R.click=(function(prev){return function(e){
  if(prev&&prev(e))return true;var t=e.target,m;
  if((m=t.closest("[data-cpg]"))&&!t.closest("[data-cpe]")&&!t.closest("[data-cpx]")){var id=Number(m.getAttribute("data-cpg"));if(id!==PG.act){snap(cur());PG.act=id;restore(cur());savePG();F.render()}return true}
  if(t.closest("[data-cpadd]")){if(PG.list.length>=15){toast("أقصى عدد للصفحات 15");return true}snap(cur());var np={id:++PG.n,name:"",t1:"",t2:"",mode:C.mode,snap:null};PG.list.push(np);PG.act=np.id;restore(np);C.t1="";C.t2="";C.RS=null;savePG();F.render();return true}
  if((m=t.closest("[data-cpx]"))){var xid=Number(m.getAttribute("data-cpx")),pg=PG.list.filter(function(p){return p.id===xid})[0];if(!pg||PG.list.length<=1)return true;if((pg.t1||pg.t2)&&!confirm("تقفل صفحة المقارنة دي؟"))return true;var i=PG.list.indexOf(pg),was=xid===PG.act;PG.list.splice(i,1);if(was){var nx=PG.list[Math.min(i,PG.list.length-1)];PG.act=nx.id;restore(nx)}savePG();F.render();return true}
  if((m=t.closest("[data-cpe]"))){var eid=Number(m.getAttribute("data-cpe")),pe=PG.list.filter(function(p){return p.id===eid})[0],v=prompt("اكتب اسم قصير للمقارنة دي (سيبه فاضي عشان يرجع للاسم التلقائي):",pe.name||"");if(v!==null&&pe){pe.name=v.trim().slice(0,30);savePG();F.render()}return true}
  if((m=t.closest("[data-cmode]"))){var nmd=m.getAttribute("data-cmode");if(nmd!==C.mode){C.mode=nmd;C.t1="";C.t2="";C.RS=null;C.prep=null;C.WI=null;C.shown=false;savePG();F.render()}return true}
  if((m=t.closest("[data-cpk]"))){var slot=Number(m.getAttribute("data-cpk")),L=LIST();F.push(C.mode==="m"?(slot===1?"العضو الأول":"العضو التاني"):(slot===1?"الفريق الأول":"الفريق الثاني"),'<label class="sr">'+F.ic("search",18)+'<input id="c1q" placeholder="🔍 اكتب للبحث..."></label>'+(L.map(function(n){return'<div class="opt" data-cpick="'+slot+":"+ENC(n)+'"><b>'+esc(n)+"</b></div>"}).join("")||'<div class="empty">'+(C.mode==="m"?"مفيش أعضاء (حمّل الجولة)":"مفيش تيمات")+'</div>'),"cpick");return true}
  if((m=t.closest("[data-cpick]"))){var p=m.getAttribute("data-cpick").split(":");if(p[0]==="1")C.t1=DEC(p[1]);else C.t2=DEC(p[1]);savePG();F.pop();F.render();return true}
  if(t.closest("[data-cstart]")){start();return true}
  if((m=t.closest("[data-cmf]"))&&!t.closest("[data-cmem]")){C.mf=Number(m.getAttribute("data-cmf"));C.tab="m";F.render();return true}
  if((m=t.closest("[data-ctab]"))){C.tab=m.getAttribute("data-ctab");F.render();return true}
  if((m=t.closest("[data-cf]"))&&m.tagName==="INPUT"){C[m.getAttribute("data-cf")]=m.checked;F.render();return true}
  if((m=t.closest("[data-cvk]"))&&m.tagName==="INPUT"){var q=m.getAttribute("data-cvk").split(":");G.state("cmp_"+q[0]).cv[q[1]]=m.checked;F.render();return true}
  if((m=t.closest("[data-cpos]"))){C.pos=m.getAttribute("data-cpos");F.render();return true}
  if(t.closest("[data-cfr]")){C.q="";C.rem=false;C.lv=false;C.pos="";["c","a","z","b"].forEach(function(k){G.state("cmp_"+k).cv={};G.state("cmp_"+k).sort=null});F.render();return true}
  if(t.closest("[data-cshow]")){C.shown=!C.shown;F.render();return true}
  if(t.closest("[data-crf]")){run(false);return true}
  if(t.closest("[data-cxl]")){excel();return true}
  if(t.closest("[data-cweap]")){weapons();return true}
  if(t.closest("[data-cshot]")){var tw=F.$("#view .tw");var tgt=tw||F.$("#view");F.capture(tgt,(tw&&tw.getAttribute("data-t"))||"المقارنة");return true}
  if(t.closest("[data-ccap]")){if(C.mode==="m"){toast("مقارنة الأعضاء بتستخدم الكابتن الحقيقي بتاع كل عضو");return true}C.busy=true;F.render();F.api({api:"prep",t1:C.t1,t2:C.t2}).then(function(pp){C.busy=false;F.render();if(pp&&!pp.error){C.prep=pp;openCap()}else toast("تعذّر تحميل الكباتن")}).catch(function(){C.busy=false;F.render()});return true}
  if((m=t.closest("[data-cct]"))){ct=Number(m.getAttribute("data-cct"));paintCap();return true}
  if((m=t.closest("[data-ccm]"))){if(cap[ct].mode!=="none"){cap[ct].multiplier=Number(m.getAttribute("data-ccm"));paintCap()}return true}
  if((m=t.closest("[data-ccp]"))){var z=m.getAttribute("data-ccp").split(":");cap[ct].mode=z[0];cap[ct].captainId=z[1]||null;paintCap();return true}
  if(t.closest("[data-ccx]")){F.pop();return true}
  if(t.closest("[data-ccok]")){F.pop();run(true);return true}
  if((m=t.closest("[data-cmem]"))){var w=m.getAttribute("data-cmem").split(":"),nm=DEC(w[1]),rr=C.RS.r,tm=(rr.team1Details||[]).some(function(x){return x.name===nm&&String(x.id)===w[0]})?1:2;pitchSheet(w[0],nm,rr["team"+tm+"Details"]||[],tm===1?rr.team1Name:rr.team2Name);return true}
  if((m=t.closest("[data-cwt]"))&&m.tagName==="INPUT"){var n=m.getAttribute("data-cwt");C.WI["s"+n]=m.checked;if(!C.WI.s1&&!C.WI.s2){C.WI.s1=C.WI.s2=true}if(C.WI.applied)C.WI.applied=wiCalc();F.render();return true}
  if((m=t.closest("[data-cwi]"))){var ww=m.getAttribute("data-cwi").split(":"),rw=C.WI.rows[Number(ww[0])];if(rw){var cu=rw.key in C.WI.preds?C.WI.preds[rw.key]:rw.points,nv=Math.max(-10,Math.min(40,cu+Number(ww[1])));if(nv===rw.points)delete C.WI.preds[rw.key];else C.WI.preds[rw.key]=nv;if(C.WI.applied)C.WI.applied=wiCalc();F.render()}return true}
  if(t.closest("[data-cwgo]")){C.WI.applied=wiCalc();F.render();return true}
  if(t.closest("[data-cwr]")){C.WI.preds={};C.WI.applied=null;F.render();return true}
  if(t.closest("[data-cwx]")){C.WI.rows.forEach(function(r){var v=Math.max(-10,Math.min(40,Math.round(r.points+r.xp)));if(v!==r.points)C.WI.preds[r.key]=v;else delete C.WI.preds[r.key]});C.WI.applied=wiCalc();F.render();return true}
  return false}})(R.click);
/* زرار "مقارنة عضوين" في كل التطبيق بيفتح نفس شاشة المقارنة في وضع الأعضاء */
R.cmp2=function(){if(C.mode!=="m"){C.mode="m";C.t1="";C.t2="";C.RS=null;C.prep=null;C.WI=null;C.shown=false;savePG()}F.setTab("cmp")};
})();
