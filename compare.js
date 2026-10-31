/* compare.js - مقارنة بطولة Game Of Fantasy جوه التطبيق (بدل الـ iframe) */
(function(){"use strict";
var F=window.__fc,R=F.R,S=F.S,esc=F.esc,toast=F.toast,num=F.num;
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var WD=["الأحد","الاثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"],PLN={1:"حارس",2:"مدافع",3:"وسط",4:"مهاجم"};
var C={teams:null,loading:false,t1:"",t2:"",res:null,tab:"c",q:"",rem:false,lv:false,pos:"",shown:false,prep:null,busy:false,recent:[]},SH={},cap={1:{},2:{}},ct=1,RS=null,WI={preds:{},s1:true,s2:true,applied:null,rows:[],b1:0,b2:0};
try{var sv=JSON.parse(LS.get("fc_cmp")||"{}");C.t1=sv.t1||"";C.t2=sv.t2||"";C.recent=sv.recent||[]}catch(e){}
function saveC(){LS.set("fc_cmp",JSON.stringify({t1:C.t1,t2:C.t2,recent:C.recent}))}
R.main.push({id:"cmp",name:"المقارنة",sub:"مقارنة بطولة GOF - جوا التطبيق",icon:"swap"});
var _title=R.title;R.title=function(t){return t==="cmp"?"المقارنة":(_title?_title(t):null)};
R.noCtx=function(t){return t==="cmp"};
var ENC=encodeURIComponent,DEC=decodeURIComponent;

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
function winPct(){var q=RS,cur=q.net1-q.net2,m=cur+q.WP.m,sd=Math.sqrt(q.WP.v),p1;if(sd<.01)p1=cur>0?1:cur<0?0:.5;else p1=ncdf(m/sd);var pc=Math.round(p1*100);if(sd>=.01)pc=Math.min(99,Math.max(1,pc));return{pc:pc,cur:cur,m:m}}

/* ---------- عرض الصفوف ---------- */
function stc(p){return p.minutes>0?(p.live&&!p.finished?'<span class="tag ac">بيلعب '+p.minutes+"’</span>":'<span class="tag chip-mg">لعب '+p.minutes+"’</span>"):(p.finished?'<span class="tag chip-wc">غاب</span>':'<span class="tag">لسه</span>')}
function koc(p){return p.kickoffs.length?p.kickoffs.map(function(i){var k=kf(i);return k?k.day+" "+k.date+" "+k.time:""}).join(" - "):""}
function det(s){
  if(!s||s==="لا يوجد")return'<span class="mut">—</span>';
  var BR=[["[مضاعف تربل كابتن التيم 🔥👑]","تربل كابتن التيم 🔥👑","ac"],["[مضاعف تربل كابتن تلقائي 🔥🎲]","تربل كابتن تلقائي 🔥🎲","ac"],["[مضاعف كابتن التيم 👑]","كابتن التيم 👑","ac"],["[مضاعف كابتن تلقائي 🎲]","كابتن تلقائي 🎲","ac"]];
  return s.split(/ [،—] /).map(function(x){var t=x,tg="";BR.forEach(function(b){if(t.indexOf(b[0])>-1){t=t.replace(b[0],"").trim();tg+='<span class="tag '+b[2]+'">'+b[1]+"</span> "}});
    if(t.indexOf("(كابتن غائب")>-1)tg+='<span class="tag chip-wc">كابتن غائب</span> ';else if(t.indexOf("(فايس تربل كابتن")>-1)tg+='<span class="tag ac">فايس تربل كابتن</span> ';else if(t.indexOf("(فايس كابتن")>-1)tg+='<span class="tag ac">فايس كابتن</span> ';
    return'<div style="margin:3px 0">'+tg+"<bdi>"+esc(t)+"</bdi></div>"}).join("")}
function rowHtml(p,tab){
  var ex="";
  if(tab==="c")ex='<div class="k">عدد التشابه <b class="n">'+p.weight+'</b></div><div class="k" style="margin-top:6px">عند الأول</div>'+det(p.t1d)+'<div class="k" style="margin-top:6px">عند الثاني</div>'+det(p.t2d);
  else if(tab==="a"||tab==="z")ex='<div class="k">الفارق <b class="dn n">'+p.netWeight+'</b> · النقاط × الفارق <b class="n up">'+p.netWeight*p.points+"</b></div>"+det(p.details);
  else ex='<div class="k">في الأول</div>'+det(p.t1d)+'<div class="k" style="margin-top:6px">في الثاني</div>'+det(p.t2d);
  return'<div class="row" style="align-items:flex-start"><span class="av" style="--s:36px"><b>'+esc(F.ini(p.name))+'</b></span><div class="grow"><b>'+esc(p.name)+"</b> "+stc(p)+'<small>'+esc(p.clubName)+" - "+(PLN[p.elementType]||"")+(koc(p)?" - "+koc(p):"")+"</small>"+ex+'</div><b class="n" style="font-size:20px">'+p.points+"</b></div>"}
function filtered(tab){
  var q=C.q.trim();
  return(RS.D[tab]||[]).filter(function(p){return(!q||(p.name+" "+p.clubName).indexOf(q)>-1)&&(!C.rem||!p.finished)&&(!C.lv||p.live)&&(!C.pos||String(p.elementType)===C.pos)})}

/* ---------- ماذا لو ---------- */
function initWI(){
  var rows=[];[[1,RS.D.a],[2,RS.D.z]].forEach(function(pr){(pr[1]||[]).forEach(function(p){if(p.finished)return;var ko=p.sortKickoff?+new Date(p.sortKickoff):9e15;rows.push({key:"t"+pr[0]+"_"+p.name,team:pr[0],name:p.name,nw:p.netWeight,points:p.points||0,w1:p.w1||0,w2:p.w2||0,ko:isNaN(ko)?9e15:ko,xp:p.xp||0,p:p})})});
  rows.sort(function(a,b){return(a.ko-b.ko)||String(a.name).localeCompare(String(b.name),"ar")});
  WI={preds:{},s1:true,s2:true,applied:null,rows:rows,b1:RS.net1,b2:RS.net2}}
function wiCalc(){var a=0,b=0;WI.rows.forEach(function(r){if(!(r.team===1?WI.s1:WI.s2)||!(r.key in WI.preds))return;var d=WI.preds[r.key]-r.points;a+=r.w1*d;b+=r.w2*d});return{a:a,b:b}}
function wiHtml(){
  var c=WI.applied,r=RS.r;
  var sc=function(n,b,d,on){return on?'<div class="cd t" style="flex:1"><div class="k">'+esc(n)+'</div><b class="n">'+(b+(c?d:0))+'</b><small>'+(c?"الحالي "+b+" ("+(d>0?"+":"")+d+")":"")+"</small></div>":""};
  var rows=WI.rows.filter(function(x){return x.team===1?WI.s1:WI.s2}).map(function(x,i){var ch=x.key in WI.preds,v=ch?WI.preds[x.key]:x.points;
    return'<div class="row"><div class="grow"><b>'+esc(x.name)+' <span class="mut">× '+x.nw+'</span></b><small>'+esc(x.team===1?r.team1Name:r.team2Name)+" - "+(koc(x.p)||"")+'</small></div><div class="wi"><button data-cwi="'+WI.rows.indexOf(x)+':1">+</button><b class="n '+(ch?"up":"")+'">'+v+'</b><button data-cwi="'+WI.rows.indexOf(x)+':-1">−</button></div></div>'}).join("")||'<p class="mut">مفيش لعيبة ماتشهم لسه ماخلصش.</p>';
  var cal=wiCalc();
  return'<div class="chips" style="flex-wrap:wrap"><button data-cwt="1" class="'+(WI.s1?"on":"")+'">'+esc(r.team1Name)+'</button><button data-cwt="2" class="'+(WI.s2?"on":"")+'">'+esc(r.team2Name)+'</button><button data-cwgo>🔮 احسب</button><button data-cwx>🎯 املا بتوقع xG</button><button data-cwr>↺ ضبط</button></div><div style="display:flex;gap:10px;margin:10px 0">'+sc(r.team1Name,WI.b1,c?c.a:0,WI.s1)+sc(r.team2Name,WI.b2,c?c.b:0,WI.s2)+"</div>"+rows}

/* ---------- العرض الرئيسي ---------- */
function pk(slot,v){return'<div class="k" style="margin:10px 0 6px">'+(slot===1?"الفريق الأول":"الفريق الثاني")+'</div><button class="pk" data-cpk="'+slot+'"><span>'+(v?esc(v):"اختار...")+"</span>"+F.ic("cd",18)+"</button>"}
R.views.cmp=function(){
  if(!C.teams&&!C.loading){C.loading=true;F.api({api:"teams"}).then(function(r){C.teams=Array.isArray(r)?r:[];C.loading=false;F.render()}).catch(function(){C.teams=[];C.loading=false;F.render();toast("تعذّر تحميل قايمة الفرق")})}
  var h='<div class="cd"><div class="k">اختار فريقين وقارن</div>'+pk(1,C.t1)+pk(2,C.t2)+'<button class="btn b1" data-cstart style="width:100%;margin-top:14px"'+(C.busy?" disabled":"")+">"+(C.busy?"بيحلل...":"ابدأ التحليل ⚡")+"</button></div>";
  if(C.recent.length)h+='<div class="sec">مقارنات حديثة</div><div class="chips">'+C.recent.map(function(x,i){return'<button data-crec="'+i+'">'+esc(x[0])+" × "+esc(x[1])+"</button>"}).join("")+"</div>";
  if(!RS)return h+(C.teams&&!C.teams.length?'<div class="empty">قايمة الفرق فاضية - ضيف تيمات في شيت "الفرق"</div>':"");
  var r=RS.r,w=winPct(),a1=wst(RS.D.a),a2=wst(RS.D.z),sh=C.shown;
  var side=function(n,net,g,hits,note,pl,l){return'<div style="flex:1;text-align:center"><div class="k">'+esc(n)+'</div><div class="n" style="font-size:40px;font-weight:700;color:'+(l?"var(--act)":"var(--tx)")+';line-height:1.1">'+net+'</div><div class="k">'+esc(note||" ")+'</div><div class="mut" style="font-size:12px;margin-top:4px">الأساسية '+g+" · السوالب "+(hits>0?"-"+hits:0)+"</div><div class=\"mut\" style=\"font-size:12px\">لعب "+pl.pl+" من "+pl.tot+" - الباقي "+pl.rem+" ("+pl.w+")</div></div>"};
  h+='<div class="sec"><span>الجولة '+r.gameweek+" · النتيجة</span></div>"+F.card("نتيجة المقارنة",'<div style="display:flex;gap:10px;align-items:flex-start">'+side(r.team1Name,RS.net1,RS.g1,r.team1Hits,capNote(r.team1CaptainMode,r.team1CaptainName,r.team1CaptainMultiplier),a1,RS.net1>=RS.net2)+'<span class="k" style="padding-top:34px">VS</span>'+side(r.team2Name,RS.net2,RS.g2,r.team2Hits,capNote(r.team2CaptainMode,r.team2CaptainName,r.team2CaptainMultiplier),a2,RS.net2>RS.net1)+"</div>"+
   '<div style="margin-top:14px"><div style="display:flex;justify-content:space-between;font-weight:500"><span>'+esc(r.team1Name)+" · "+(sh?w.pc+"%":"؟؟%")+"</span><span>"+esc(r.team2Name)+" · "+(sh?100-w.pc+"%":"؟؟%")+'</span></div><div class="bb" style="height:10px;margin-top:6px"><i class="l" style="width:'+(sh?w.pc:50)+'%"></i></div><div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px"><span class="mut" style="font-size:12px">'+(sh?"الفارق الحالي "+(w.cur>0?"+":"")+w.cur+" · المتوقع "+(w.m>0?"+":"")+Math.round(w.m):"النسبة مخفية")+'</span><button class="chip" data-cshow>'+(sh?"🙈 اخفي النسبة":"👁️ اظهر النسبة")+'</button></div></div>')+
   '<div class="chips" style="margin-top:10px"><button data-ccap>👑 تعديل الكابتن</button><button data-crf>🔄 تحديث</button><button data-cxl>🟩 Excel</button></div>';
  var tabs=[["c","المشتركون"],["a","أسلحة "+r.team1Name],["z","أسلحة "+r.team2Name],["b","الدكة"],["w","ماذا لو"],["m","الأعضاء"]];
  h+='<div class="sg" style="margin-top:12px">'+tabs.map(function(t){return'<button data-ctab="'+t[0]+'" class="'+(C.tab===t[0]?"on":"")+'">'+esc(t[1])+"</button>"}).join("")+"</div>";
  if(C.tab==="w"){if(!WI.rows.length&&!WI.applied)initWI();return h+F.card("ماذا لو",wiHtml())}
  if(C.tab==="m"){return h+[1,2].map(function(i){var L=(r["team"+i+"Details"]||[]).slice().sort(function(a,b){return b.net-a.net});return F.card("أعضاء "+(i===1?r.team1Name:r.team2Name),'<div class="k" style="margin-bottom:6px">'+esc(i===1?r.team1Name:r.team2Name)+"</div>"+L.map(function(m,k){return'<div class="row act" data-cmem="'+esc(m.id)+":"+ENC(m.name)+'"><span class="rk n">'+(k+1)+'</span><div class="grow"><b>'+esc(m.name)+"</b>"+(m.isCaptain?' <span class="tag ac">'+(m.multiplier>=3?"تربل ":"كابتن ")+"×"+m.multiplier+"</span>":"")+'<small>النقاط '+m.gross+" · السوالب -"+m.hits+'</small></div><b class="n" style="font-size:20px">'+m.net+"</b></div>"}).join(""))}).join("")}
  var L=filtered(C.tab),titles={c:"اللاعيبة المشتركين",a:"أسلحة "+r.team1Name,z:"أسلحة "+r.team2Name,b:"غرفة الدكة"};
  h+='<div class="tbar"><label class="sr" style="flex:1"><input id="cq" placeholder="ابحث عن لاعب أو نادي" value="'+esc(C.q)+'"></label></div><div class="chips"><button data-cf="rem" class="'+(C.rem?"on":"")+'">اللي لسه ماتشهم مبدأش</button><button data-cf="lv" class="'+(C.lv?"on":"")+'">شغال دلوقتي</button>'+[["","كل المراكز"],["1","حارس"],["2","مدافع"],["3","وسط"],["4","مهاجم"]].map(function(p){return'<button data-cpos="'+p[0]+'" class="'+(C.pos===p[0]?"on":"")+'">'+p[1]+"</button>"}).join("")+"</div>";
  return h+F.card(titles[C.tab],'<div class="k" style="margin-bottom:6px">'+esc(titles[C.tab])+" · "+L.length+" لاعب</div>"+(L.sort(function(a,b){return(C.tab==="a"||C.tab==="z"?b.netWeight*b.points-a.netWeight*a.points:b.points-a.points)||String(a.name).localeCompare(b.name,"ar")}).map(function(p){return rowHtml(p,C.tab)}).join("")||'<p class="mut">مفيش نتايج بالفلاتر دي</p>'))}
R.input=(function(prev){return function(e){if(prev)prev(e);var t=e.target;
  if(t.id==="cq"){C.q=t.value;var pos=t.selectionStart;F.render();var n=F.$("#cq");if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(x){}}}
  if(t.id==="c1q"){var q=t.value.toLowerCase();F.$$("[data-cpick]").forEach(function(d){d.style.display=DEC(d.getAttribute("data-cpick").split(":")[1]).toLowerCase().indexOf(q)>-1?"":"none"})}}})(R.input);

/* ---------- التشغيل ---------- */
function ovOf(k){return SH[k]?JSON.stringify({mode:"shock",captainId:null,multiplier:SH[k]}):null}
function run(save){
  C.busy=true;F.render();var q={api:"cmp",t1:C.t1,t2:C.t2};
  if(save){q.save=1;q.c1=JSON.stringify(cap[1]);q.c2=JSON.stringify(cap[2])}else{var a=ovOf(C.t1),b=ovOf(C.t2);if(a)q.c1=a;if(b)q.c2=b}
  return F.api(q).then(function(r){C.busy=false;if(!r||r.error){toast(r&&r.error||"تعذّر التحليل");F.render();return}
    if(save){SH[C.t1]=cap[1].mode==="shock"?cap[1].multiplier:0;SH[C.t2]=cap[2].mode==="shock"?cap[2].multiplier:0}
    RS=build(r);WI={preds:{},s1:true,s2:true,applied:null,rows:[],b1:0,b2:0};C.shown=false;
    var k=[C.t1,C.t2];C.recent=[k].concat(C.recent.filter(function(x){return!(x[0]===k[0]&&x[1]===k[1])})).slice(0,8);saveC();F.render()}).catch(function(){C.busy=false;toast("حصل خطأ في التحليل");F.render()})}
function start(){
  if(!C.t1||!C.t2){toast("اختار فريقين");return}if(C.t1===C.t2){toast("اختار فريقين مختلفين");return}
  C.busy=true;F.render();
  F.api({api:"prep",t1:C.t1,t2:C.t2}).then(function(p){C.busy=false;if(!p||p.error){toast(p&&p.error||"تعذّر تجهيز المقارنة");F.render();return}C.prep=p;
    if(p.team1.needsCaptain||p.team2.needsCaptain){F.render();openCap()}else run(false)}).catch(function(){C.busy=false;toast("حصل خطأ في تجهيز المقارنة");F.render()})}
function openCap(){
  var p=C.prep;[1,2].forEach(function(i){var s=p["team"+i].saved||{mode:"auto",captainId:null,multiplier:2},k=i===1?C.t1:C.t2;cap[i]={mode:s.mode||"auto",captainId:s.captainId||null,multiplier:Number(s.multiplier)===3?3:2};if(SH[k])cap[i]={mode:"shock",captainId:null,multiplier:SH[k]}});
  ct=1;paintCap(true)}
function paintCap(first){
  var p=C.prep,c=cap[ct],t=p["team"+ct],on=function(m,id){return c.mode===m&&(m!=="manual"||String(c.captainId)===String(id))};
  var o=function(m,id,l){return'<div class="opt '+(on(m,id)?"on":"")+'" data-ccp="'+m+":"+esc(id||"")+'"><span class="cb">'+(on(m,id)?"✓":"")+"</span><b>"+l+"</b></div>"};
  var html='<div class="sg"><button data-cct="1" class="'+(ct===1?"on":"")+'">'+esc(p.team1.name)+'</button><button data-cct="2" class="'+(ct===2?"on":"")+'">'+esc(p.team2.name)+'</button></div><div class="sec">المضاعف</div><div class="sg"><button data-ccm="2" class="'+(c.multiplier===2?"on":"")+'">👑 كابتن ×2</button><button data-ccm="3" class="'+(c.multiplier===3?"on":"")+'">🔥 تربل كابتن ×3</button></div><div class="sec">الكابتن</div>'+o("shock","","هتخض الأول (استرها يارب) 🎭")+o("none","","بدون كابتن")+o("auto","","كابتن تلقائي 🎲 (أقل صافي نقاط)")+(t.members||[]).map(function(m){return o("manual",m.id,esc(m.name))}).join("")+'<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:16px"><button class="btn b2" data-ccx>إلغاء</button><button class="btn b1" data-ccok>تأكيد واحسب</button></div>';
  if(!first)F.pop();F.push("اختيار كابتن كل فريق للجولة دي",html,"ccap")}

/* ---------- تشكيلة عضو (من السيرفر) ---------- */
function pitchSheet(id,name){
  F.push(name,'<div class="empty">بيحمّل التشكيلة...</div>',"cpitch");
  F.api({api:"pitch",id:id}).then(function(d){
    var top=F.S.stack[F.S.stack.length-1];if(!top||top.kind!=="cpitch")return;
    if(d.error){top.html='<div class="empty">'+esc(d.error)+"</div>";F.paintSheet();return}
    var pc=function(p,xi){var b=p.capOut?'<u class="bg" style="background:#94a3b8">C</u>':(p.cap||p.capIn)?'<u class="bg">'+(p.mult>=3?"TC":"C")+"</u>":(p.vice?'<u class="bg v">V</u>':""),m=p.subIn?'<u class="bg i">↑</u>':p.subOut?'<u class="bg o">↓</u>':"";
      return'<div class="p '+(p.subOut||(p.min===0&&p.fin)?"dnp":"")+'"><span class="av" style="--s:42px"><b>'+esc(F.ini(p.name))+"</b>"+(p.code?'<img alt="" loading="lazy" src="https://resources.premierleague.com/premierleague25/photos/players/110x140/'+p.code+'.png" onload="this.classList.add(\'ok\')" onerror="this.remove()">':"")+"</span>"+b+m+'<span class="nm">'+esc(p.name)+'</span><em class="n">'+(xi?p.pts*p.mult:p.pts)+"</em></div>"};
    var row=function(t){return'<div class="pr">'+d.starters.filter(function(p){return p.type===t}).sort(function(a,b){return a.pos-b.pos}).map(function(p){return pc(p,true)}).join("")+"</div>"};
    var notes=(d.subs||[]).map(function(s){return"<div>🔄 <b>"+esc(s.out)+"</b> غاب ← <b>"+esc(s.inn)+"</b> دخل مكانه</div>"}).join("")+(d.capSwap?"<div>👑 الكابتن <b>"+esc(d.capSwap.from)+"</b> غاب ← المضاعف انتقل لـ <b>"+esc(d.capSwap.to)+"</b></div>":"")||"<div>مفيش تبديلات أو تغيير كابتن لحد دلوقتي.</div>";
    top.html='<div class="hs"><div><b class="n">'+d.gross+"</b><small>النقاط</small></div><div><b class=\"n\">"+(d.hit?"-"+d.hit:0)+"</b><small>السوالب</small></div><div><b class=\"n\">"+d.net+"</b><small>الصافي</small></div><div><b class=\"n\">"+d.benchPts+"</b><small>الدكة</small></div></div><div class=\"pitch\">"+row(1)+row(2)+row(3)+row(4)+'</div><div class="bn"><div class="pr">'+d.bench.map(function(p){return pc(p,false)}).join("")+'</div></div><div class="mut" style="margin-top:10px;line-height:1.9">'+notes+(d.chip?"<div>الخاصية: "+esc(d.chip)+"</div>":"")+"</div>";F.paintSheet()}).catch(function(){var top=F.S.stack[F.S.stack.length-1];if(top){top.html='<div class="empty">حصل خطأ أثناء تحميل التشكيلة</div>';F.paintSheet()}})}

/* ---------- Excel ---------- */
function excel(){
  if(!window.XLSX){toast("مكتبة Excel لسه ماتحمّلتش");return}var r=RS.r,wb=XLSX.utils.book_new();
  var sh=function(name,hdr,rows){XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet([hdr].concat(rows)),name.replace(/[\\\/?*\[\]:]/g,"").substring(0,31))};
  var base=function(p){return[p.name,p.minutes>0?p.minutes+"’":(p.finished?"غاب":"لسه"),PLN[p.elementType]||"",p.clubName,koc(p),p.points]};
  var strip=function(h){return String(h).replace(/\[[^\]]*\]/g,"").replace(/\s+/g," ").trim()};
  var H=["اللاعب","الحالة","المركز","النادي","موعد المباراة","النقاط"];
  sh("المشتركون",H.concat(["عدد التشابه","عند الأول","عند الثاني"]),RS.D.c.map(function(p){return base(p).concat([p.weight,strip(p.t1d),strip(p.t2d)])}));
  sh("أسلحة "+r.team1Name,H.concat(["الفارق","النقاط × الفارق","عند مين"]),RS.D.a.map(function(p){return base(p).concat([p.netWeight,p.netWeight*p.points,strip(p.details)])}));
  sh("أسلحة "+r.team2Name,H.concat(["الفارق","النقاط × الفارق","عند مين"]),RS.D.z.map(function(p){return base(p).concat([p.netWeight,p.netWeight*p.points,strip(p.details)])}));
  sh("الدكة",H.concat(["في الأول","في الثاني"]),RS.D.b.map(function(p){return base(p).concat([strip(p.t1d),strip(p.t2d)])}));
  XLSX.writeFile(wb,"GW"+r.gameweek+"_"+r.team1Name+"_vs_"+r.team2Name+".xlsx")}

/* ---------- الأحداث ---------- */
var COMP=function(){return S.tab==="cmp"};
R.click=(function(prev){return function(e){
  if(prev&&prev(e))return true;var t=e.target,m;
  if((m=t.closest("[data-cpk]"))){var slot=Number(m.getAttribute("data-cpk")),L=C.teams||[];F.push(slot===1?"الفريق الأول":"الفريق الثاني",'<label class="sr">'+F.ic("search",18)+'<input id="c1q" placeholder="ابحث..."></label>'+(L.map(function(n){return'<div class="opt" data-cpick="'+slot+":"+ENC(n)+'"><b>'+esc(n)+"</b></div>"}).join("")||'<div class="empty">مفيش تيمات</div>'),"cpick");return true}
  if((m=t.closest("[data-cpick]"))){var p=m.getAttribute("data-cpick").split(":");if(p[0]==="1")C.t1=DEC(p[1]);else C.t2=DEC(p[1]);saveC();F.pop();F.render();return true}
  if(t.closest("[data-cstart]")){start();return true}
  if((m=t.closest("[data-crec]"))){var x=C.recent[Number(m.getAttribute("data-crec"))];if(x){C.t1=x[0];C.t2=x[1];saveC();start()}return true}
  if((m=t.closest("[data-ctab]"))){C.tab=m.getAttribute("data-ctab");F.render();return true}
  if((m=t.closest("[data-cf]"))){var f=m.getAttribute("data-cf");C[f]=!C[f];F.render();return true}
  if((m=t.closest("[data-cpos]"))){C.pos=m.getAttribute("data-cpos");F.render();return true}
  if(t.closest("[data-cshow]")){C.shown=!C.shown;F.render();return true}
  if(t.closest("[data-crf]")){run(false);return true}
  if(t.closest("[data-cxl]")){excel();return true}
  if(t.closest("[data-ccap]")){C.busy=true;F.render();F.api({api:"prep",t1:C.t1,t2:C.t2}).then(function(p){C.busy=false;F.render();if(p&&!p.error){C.prep=p;openCap()}else toast("تعذّر تحميل الكباتن")}).catch(function(){C.busy=false;F.render()});return true}
  if((m=t.closest("[data-cct]"))){ct=Number(m.getAttribute("data-cct"));paintCap();return true}
  if((m=t.closest("[data-ccm]"))){if(cap[ct].mode!=="none"){cap[ct].multiplier=Number(m.getAttribute("data-ccm"));paintCap()}return true}
  if((m=t.closest("[data-ccp]"))){var q=m.getAttribute("data-ccp").split(":");cap[ct].mode=q[0];cap[ct].captainId=q[1]||null;paintCap();return true}
  if(t.closest("[data-ccx]")){F.pop();return true}
  if(t.closest("[data-ccok]")){F.pop();run(true);return true}
  if((m=t.closest("[data-cmem]"))){var z=m.getAttribute("data-cmem").split(":");pitchSheet(z[0],DEC(z[1]));return true}
  if((m=t.closest("[data-cwt]"))){var n=m.getAttribute("data-cwt");WI["s"+n]=!WI["s"+n];if(!WI.s1&&!WI.s2)WI.s1=WI.s2=true;if(WI.applied)WI.applied=wiCalc();F.render();return true}
  if((m=t.closest("[data-cwi]"))){var w=m.getAttribute("data-cwi").split(":"),r=WI.rows[Number(w[0])];if(r){var cur=r.key in WI.preds?WI.preds[r.key]:r.points,nv=Math.max(-10,Math.min(40,cur+Number(w[1])));if(nv===r.points)delete WI.preds[r.key];else WI.preds[r.key]=nv;if(WI.applied)WI.applied=wiCalc();F.render()}return true}
  if(t.closest("[data-cwgo]")){WI.applied=wiCalc();F.render();return true}
  if(t.closest("[data-cwr]")){WI.preds={};WI.applied=null;F.render();return true}
  if(t.closest("[data-cwx]")){WI.rows.forEach(function(r){var v=Math.max(-10,Math.min(40,Math.round(r.points+r.xp)));if(v!==r.points)WI.preds[r.key]=v;else delete WI.preds[r.key]});WI.applied=wiCalc();F.render();return true}
  return false}})(R.click);
})();
