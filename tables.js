/* tables.js - الجداول الكاملة بكل الأعمدة + الفلاتر المتقدمة + الفلاتر المحفوظة + رابط المشاركة + CSV */
(function(){"use strict";
var F=window.__fc,R=F.R,S=F.S,P=F.P,pPts=F.pPts,pStat=F.pStat,isPlayed=F.isPlayed,esc=F.esc,num=F.num,r1=F.r1,sgn=F.sgn,WM=F.WM,toast=F.toast,PL=window.__plus;
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var DEF={sp:[],sc:[],spos:[],must:[],xp:[],xc:[],xpos:[],xany:[],xmust:[],chips:[],caps:false,top:false,lastBuy:false,lastSell:false,diff:false,minOwn:0,tFrom:"",tTo:"",limit:"all",dir:"all"};
var cp=function(o){return JSON.parse(JSON.stringify(o))};
S.F.adv=Object.assign(cp(DEF),S.F.adv||{});
var VM={},TB={};try{VM=JSON.parse(LS.get("fc_vm")||"{}");TB=JSON.parse(LS.get("fc_tb")||"{}")}catch(e){}
var A=function(){return S.F.adv};
var live=function(){return !!(S.D&&S.D.live)};
function saveV(){LS.set("fc_vm",JSON.stringify(VM));LS.set("fc_tb",JSON.stringify(TB))}

/* ---------- منطق الفلاتر ---------- */
function clubPosOk(id,clubs,pos){var p=P(id);return(!clubs.length||clubs.indexOf(p.club)>-1)&&(!pos.length||pos.indexOf(p.pos)>-1)}
function grp(id){var s=pStat(id);return isPlayed(s)?"played":s==="dnp"?"dnp":"pending"}
function okPlay(id){return S.F.play==="all"||!live()||grp(id)===S.F.play}
function selOn(){var a=A();return a.sp.length>0||a.sc.length>0||a.spos.length>0}
function hit(id){var a=A();if(!okPlay(id)||a.xp.indexOf(String(id))>-1)return false;if(a.sp.indexOf(String(id))>-1)return true;if(!a.sc.length&&!a.spos.length)return false;return clubPosOk(id,a.sc,a.spos)}
function exOn(){var a=A();return a.xp.length>0||a.xc.length>0||a.xpos.length>0}
function timeWin(){var a=A(),f=a.tFrom?Date.parse(a.tFrom):null,t=a.tTo?Date.parse(a.tTo):null;return function(ms){return!((f&&(!ms||ms<f))||(t&&(!ms||ms>t)))}}
R.filters.push(function(m){
  var a=A(),ids=m.picks.map(function(x){return x[0]});
  if(a.xany.some(function(i){return ids.indexOf(Number(i))>-1}))return false;
  if(a.xmust.length&&a.xmust.every(function(i){return ids.indexOf(Number(i))>-1}))return false;
  if((a.xc.length||a.xpos.length)&&ids.some(function(id){return clubPosOk(id,a.xc,a.xpos)}))return false;
  if(a.must.length&&!a.must.every(function(i){return ids.indexOf(Number(i))>-1}))return false;
  if(S.tab==="members"){if(selOn()&&!ids.some(hit))return false;if(a.caps&&!m.isCaptain)return false}
  return true});
R.trRow=function(r){
  var a=A(),dir=a.dir,w=timeWin();
  if(!w(r.t))return false;
  if(a.xp.indexOf(String(r.i))>-1&&a.xp.indexOf(String(r.o))>-1)return false;
  if(selOn()){if(!((dir!=="sell"&&hit(r.i))||(dir!=="buy"&&hit(r.o))))return false}
  else if(dir!=="all"&&!r.i)return false;
  if(a.caps&&!r.m.isCaptain)return false;
  if(a.chips.length&&a.chips.indexOf(r.m.chip)<0)return false;
  return true};
R.trPost=function(rows){
  var a=A();if(!a.lastBuy&&!a.lastSell)return rows;
  var ch={},info=new Map();
  rows.forEach(function(r){info.set(r,{e:0,s:0});[["buy",r.i],["sell",r.o]].forEach(function(x){if(!x[1])return;if(selOn()&&!hit(x[1]))return;var k=r.m.uid+"|"+x[1];(ch[k]=ch[k]||[]).push({type:x[0],r:r,t:r.t||0});info.get(r).e++})});
  Object.keys(ch).forEach(function(k){var ev=ch[k],last=ev[0];ev.forEach(function(x){if(x.t>=last.t)last=x});if((last.type==="sell"&&a.lastSell)||(last.type==="buy"&&a.lastBuy))ev.forEach(function(x){if(x!==last)info.get(x.r).s++})});
  return rows.filter(function(r){var f=info.get(r);return!(f.e>0&&f.s===f.e)})};
R.plRow=function(s){
  var a=A(),id=s.id;
  if(a.sp.length&&a.sp.indexOf(String(id))<0)return false;
  if((a.sc.length||a.spos.length)&&!clubPosOk(id,a.sc,a.spos))return false;
  if(a.xp.indexOf(String(id))>-1||((a.xc.length||a.xpos.length)&&clubPosOk(id,a.xc,a.xpos)))return false;
  if(!okPlay(id))return false;
  if(a.minOwn&&s.pct<a.minOwn)return false;
  if(a.diff&&!(s.own>0&&s.pct<=20))return false;
  return true};

/* ---------- مساعدات الخلايا ---------- */
function oext(wm){
  var st=F.ownership(wm),N=wm.length||1;
  Object.keys(st).forEach(function(k){st[k].vice=0;st[k].tc=0;st[k].eo=0});
  wm.forEach(function(m){m.d.picks.forEach(function(x){var s=st[x.id];if(!s)return;if(x.vice)s.vice++;s.eo+=x.mult;if(m.d.eff&&m.d.eff.id===x.id&&m.chip==="3xc")s.tc++})});
  Object.keys(st).forEach(function(k){st[k].eoPct=r1(st[k].eo/N*100)});return st}
var chk=function(b){return'<span class="'+(b?"up":"mut")+'">'+(b?"✓":"–")+"</span>"};
function nms(L,pts){return L.length?'<span class="names">'+L.map(function(x){return'<span class="nm2">'+F.av(x.id,20)+esc(P(x.id).n)+(pts&&x.pts!=null?' <b class="n">'+x.pts*Math.max(x.mult,1)+"</b>":"")+"</span>"}).join("")+"</span>":'<span class="mut">–</span>'}
function sg(v){return v===""||v==null?'<span class="mut">–</span>':'<span class="'+(v>0?"up":v<0?"dn":"mut")+' n">'+sgn(v)+"</span>"}
var chipNm={wildcard:"وايلد كارد",freehit:"فري هيت","3xc":"تربل كابتن",bboost:"بنش بوست"};
function col(k,l,v,o){var c={k:k,l:l,v:v,num:true};if(o)for(var q in o)c[q]=o[q];return c}
function sum(a,f){return a.reduce(function(s,x){return s+(Number(f(x))||0)},0)}

/* ---------- أعمدة الأعضاء ---------- */
function membersCols(wm){
  var anyT=selOn(),rk={},L=live();wm.slice().sort(function(a,b){return b.d.net-a.d.net}).forEach(function(m,i){rk[m.uid]=i+1});
  var mS=function(m){return anyT?m.d.xi.filter(function(x){return hit(x.id)}):[]},mB=function(m){return anyT?m.d.bn.filter(function(x){return hit(x.id)}):[]},cnt=function(m){return mS(m).length+mB(m).length};
  var capOk=function(m){return anyT&&m.d.eff&&hit(m.d.eff.id)},viceOk=function(m){return anyT&&m.d.vice&&hit(m.d.vice.id)};
  var ptsOf=function(l,xi){return sum(l,function(x){return num(x.pts)*(xi?x.mult:1)})};
  var base=[
    col("rank","ترتيب المسابقة",function(m){return rk[m.uid]}),
    col("person","الشخص",function(m){return m.person},{num:false}),
    col("team","التيم",function(m){return m.team},{num:false}),
    col("mS","لاعيبة أساسي",function(m){return mS(m).map(function(x){return P(x.id).n}).join(", ")},{num:false,wr:1,h:function(m){return nms(mS(m),true)}}),
    col("mB","لاعيبة دكة",function(m){return mB(m).map(function(x){return P(x.id).n}).join(", ")},{num:false,wr:1,h:function(m){return nms(mB(m),true)}}),
    col("ptsS","نقاطهم (أساسي)",function(m){return L?ptsOf(mS(m),true):""}),
    col("ptsB","نقاطهم (دكة)",function(m){return L?ptsOf(mB(m),false):""}),
    col("inS","أساسي",function(m){return mS(m).length?1:0},{h:function(m){return chk(mS(m).length)}}),
    col("inB","دكة",function(m){return mB(m).length?1:0},{h:function(m){return chk(mB(m).length)}}),
    col("mixed","أساسي ودكة",function(m){return mS(m).length&&mB(m).length?1:0},{h:function(m){return chk(mS(m).length&&mB(m).length)}}),
    col("tri","تربيل+",function(m){return cnt(m)>=3?1:0},{h:function(m){return chk(cnt(m)>=3)}}),
    col("dbl","دابل",function(m){return cnt(m)===2?1:0},{h:function(m){return chk(cnt(m)===2)}}),
    col("sgl","فردي",function(m){return cnt(m)===1?1:0},{h:function(m){return chk(cnt(m)===1)}}),
    col("cap","كابتن",function(m){return capOk(m)?1:0},{h:function(m){return chk(capOk(m))}}),
    col("vice","فايس",function(m){return viceOk(m)?1:0},{h:function(m){return chk(viceOk(m))}}),
    col("capName","الكابتن",function(m){return m.d.eff?P(m.d.eff.id).n:""},{num:false}),
    col("viceName","الفايس",function(m){return m.d.vice?P(m.d.vice.id).n:""},{num:false,def:false}),
    col("isCap","كابتن التيم",function(m){return m.isCaptain&&m.capMult>1?1:0},{h:function(m){return chk(m.isCaptain&&m.capMult>1)}}),
    col("cost","السوالب",function(m){return m.cost},{h:function(m){return m.cost?'<span class="dn n">-'+m.cost+"</span>":'<span class="mut">0</span>'}}),
    col("points","النقاط",function(m){return m.d.points}),
    col("net","الصافي",function(m){return m.d.net}),
    col("bench","نقاط الدكة",function(m){return m.d.benchPts}),
    col("left","لسه هيلعب",function(m){return m.d.left}),
    col("played","لعبوا",function(m){return m.d.played},{def:false}),
    col("subs","تبديلات تلقائية",function(m){return m.d.subs},{def:false}),
    col("chip","الخاصية",function(m){return chipNm[m.chip]||""},{num:false}),
    col("value","قيمة الفريق",function(m){return m.value},{def:false}),
    col("bank","البنك",function(m){return m.bank},{def:false}),
    col("orank","الترتيب العام",function(m){return m.orank===""?"":m.orank},{def:false}),
    col("xiFull","التشكيلة كاملة",function(m){return m.d.xi.map(function(x){return P(x.id).n}).join(", ")},{num:false,wr:1,def:false,h:function(m){return nms(m.d.xi,true)}}),
    col("bnFull","الدكة كاملة",function(m){return m.d.bn.map(function(x){return P(x.id).n}).join(", ")},{num:false,wr:1,def:false,h:function(m){return nms(m.d.bn,true)}})];
  return base.concat(PL?PL.cols.members(wm):[])}

/* ---------- أعمدة التيمات ---------- */
function tAgg(wm){
  var dc=S.F.capTeam,a=A(),sel=selOn(),w=timeWin(),T={},mustOn=a.must.length>0;
  wm.forEach(function(m){
    var d=m.d,k=dc&&m.isCaptain?(m.capMult||1):1;
    var R2=T[m.team]||(T[m.team]={team:m.team,n:0,points:0,cost:0,net:0,bench:0,left:0,played:0,buy:0,sell:0,bts:0,stb:0,wild:0,fh:0,tc:0,bb:0,selS:0,selB:0,ptsS:0,ptsB:0,capCnt:0,tri:0,dbl:0,sgl:0,triS:0,dblS:0,sglS:0,triB:0,dblB:0,sglB:0,fS:0,fB:0,fN:0,capIds:[],ms:[],value:0});
    R2.n++;R2.ms.push(m);R2.value+=m.value;R2.points+=d.points*k;R2.cost+=m.cost*k;R2.net+=d.net*k;R2.bench+=d.benchPts*k;R2.left+=d.left*k;R2.played+=d.played*k;
    if(m.chip==="wildcard")R2.wild++;if(m.chip==="freehit")R2.fh++;if(m.chip==="3xc")R2.tc++;if(m.chip==="bboost")R2.bb++;
    if(m.isCaptain&&d.eff)R2.capIds.push(d.eff.id);
    if(sel){
      var cS=0,cB=0;
      d.xi.forEach(function(x){if(hit(x.id)){cS++;R2.ptsS+=num(x.pts)*x.mult*k}});
      d.bn.forEach(function(x){if(hit(x.id)){cB++;R2.ptsB+=num(x.pts)*k}});
      R2.selS+=cS*k;R2.selB+=cB*k;if(d.eff&&hit(d.eff.id))R2.capCnt+=k;
      var bk=function(n,s){if(n>=3)R2["tri"+s]+=k;else if(n===2)R2["dbl"+s]+=k;else if(n===1)R2["sgl"+s]+=k};bk(cS+cB,"");bk(cS,"S");bk(cB,"B");
      var ev=m.transfers.map(function(x){return{i:x[0],o:x[1],ms:Date.parse(x[2])||0}}).filter(function(x){return w(x.ms||null)}).sort(function(a,b){return a.ms-b.ms}),seen={};
      ev.forEach(function(x){if(hit(x.i))seen[x.i]=1;if(hit(x.o))seen[x.o]=1});
      Object.keys(seen).forEach(function(id){var seq=[];ev.forEach(function(x){if(x.i==id)seq.push("b");if(x.o==id)seq.push("s")});for(var j=0;j<seq.length-1;j++){if(seq[j]==="b"&&seq[j+1]==="s")R2.bts+=k;if(seq[j]==="s"&&seq[j+1]==="b")R2.stb+=k}})}
    m.transfers.forEach(function(x){if(!w(Date.parse(x[2])||null))return;if(sel){if(hit(x[0]))R2.buy+=k;if(hit(x[1]))R2.sell+=k}else{R2.buy+=k;R2.sell+=k}});
    if(mustOn){var ids=d.picks.map(function(y){return y.id});R2.fN++;a.must.forEach(function(i){var p=d.picks.find(function(y){return y.id===Number(i)});if(p){if(p.inXI)R2.fS++;else R2.fB++}})}
  });
  return Object.keys(T).map(function(k){return T[k]}).sort(function(a,b){return b.net-a.net})}
function teamsCols(wm){
  var L=live(),sel=selOn(),ST=oext(wm),rk={};
  var tl=tAgg(wm);tl.forEach(function(R2,i){rk[R2.team]=i+1;R2.avg=R2.n?r1(R2.points/R2.n):0;var c={};R2.capIds.forEach(function(id){c[id]=(c[id]||0)+1});var b=null;Object.keys(c).forEach(function(id){if(!b||c[id]>b.n)b={id:Number(id),n:c[id]}});R2.capName=b?P(b.id).n:""});
  var N=function(k,l,o){return col(k,l,function(R2){return R2[k]},o||{})};
  var base=[col("rank","الترتيب",function(R2){return rk[R2.team]}),col("team","التيم",function(R2){return R2.team},{num:false}),N("n","الأعضاء"),N("points","النقاط"),N("cost","السوالب"),N("net","الصافي"),N("avg","المتوسط"),N("bench","نقاط الدكة"),N("left","لسه هيلعبوا",{def:L}),N("played","لعبوا",{def:false}),
    N("buy","اشترى",{def:sel}),N("sell","باع",{def:sel}),N("bts","اشترى ثم باع",{def:sel}),N("stb","باع ثم اشترى",{def:sel}),N("wild","وايلد كارد"),N("fh","فري هيت"),N("tc","تربيل كابتن"),N("bb","بنش بوست"),
    col("tchips","مجموع الخواص",function(R2){return R2.wild+R2.fh+R2.tc+R2.bb}),
    N("selS","أساسي",{def:sel}),N("selB","دكة",{def:sel}),N("ptsS","نقاط الأساسيين",{def:sel}),N("ptsB","نقاط الدكة (المختارين)",{def:false}),N("capCnt","عدد الكابتن",{def:sel}),
    N("tri","تربيل+",{def:sel}),N("dbl","دابل",{def:sel}),N("sgl","فردي",{def:sel}),N("triS","تربيل (أساسي)",{def:false}),N("dblS","دابل (أساسي)",{def:false}),N("sglS","فردي (أساسي)",{def:false}),N("triB","تربيل (دكة)",{def:false}),N("dblB","دابل (دكة)",{def:false}),N("sglB","فردي (دكة)",{def:false}),
    N("fS","أساسي (تصفية)",{def:A().must.length>0}),N("fB","دكة (تصفية)",{def:A().must.length>0}),
    col("capName","أكتر كابتن",function(R2){return R2.capName},{num:false})];
  var ex=PL?PL.cols.teams(wm).filter(function(c){return["x_trg","x_trh","x_trn","x_chn","x_chg","x_topcap","x_above","x_dprev","x_gap","x_ppm","x_star"].indexOf(c.k)>-1}):[];
  return{cols:base.concat(ex),rows:tl}}

/* ---------- أعمدة اللاعيبة ---------- */
function playersCols(wm){
  var ST=oext(wm),L=live();
  var rows=Object.keys(ST).map(function(k){return ST[k]}).filter(function(s){return R.plRow(s)});
  var base=[col("player","اللاعب",function(s){return P(s.id).n},{num:false,h:function(s){return'<span style="display:inline-flex;align-items:center;gap:8px">'+F.av(s.id,26)+esc(P(s.id).n)+"</span>"}}),
    col("pos","المركز",function(s){return P(s.id).pos},{num:false}),col("club","الفريق",function(s){return P(s.id).club},{num:false}),col("price","السعر",function(s){return P(s.id).price}),
    col("own","عدد اللي عندهم",function(s){return s.own}),col("pct","الامتلاك %",function(s){return s.pct}),col("xi","أساسي",function(s){return s.xi}),col("bn","دكة",function(s){return s.bn}),
    col("cap","كابتن",function(s){return s.cap}),col("vice","فايس",function(s){return s.vice},{def:false}),col("tc","تربيل",function(s){return s.tc},{def:false}),col("eoPct","الامتلاك الفعلي %",function(s){return s.eoPct},{def:false}),
    col("pts","النقاط",function(s){return L?num(pPts(s.id)):""}),col("min","الدقايق",function(s){return L&&S.D.live.el[s.id]?S.D.live.el[s.id][0]:""},{def:false}),
    col("status","الحالة",function(s){return L?({played:"لعب",playing:"بيلعب",live0:"لسه ماجاش",pending:"لسه",dnp:"ملعبش"})[pStat(s.id)]:""},{num:false}),
    col("buy","اتشرى",function(s){return s.buy}),col("sell","اتباع",function(s){return s.sell}),col("netT","صافي التحويلات",function(s){return s.buy-s.sell},{h:function(s){return sg(s.buy-s.sell)}}),col("sel","امتلاكه في العالم %",function(s){return P(s.id).sel},{def:false})];
  var ex=PL?PL.cols.players().filter(function(c){return c.k!=="x_vsw"||true}):[];
  return{cols:base.concat(ex),rows:rows}}

/* ---------- أعمدة التحويلات ---------- */
function transfersCols(wm){
  var L=live(),rows=[];
  wm.forEach(function(m){m.transfers.forEach(function(x){rows.push({m:m,i:x[0],o:x[1],t:Date.parse(x[2])||0,ic:x[3],oc:x[4],k:m.uid+"|"+x[0]+"|"+x[1]})})});
  rows=rows.filter(R.trRow);rows=R.trPost(rows);
  var gain=function(r){return L&&r.i&&r.o?num(pPts(r.i))-num(pPts(r.o)):""};
  var ft=function(t){return t?new Date(t).toLocaleString("ar-EG",{weekday:"short",day:"numeric",month:"numeric",hour:"numeric",minute:"2-digit"}):""};
  var base=[col("person","الشخص",function(r){return r.m.person},{num:false}),col("team","التيم",function(r){return r.m.team},{num:false}),
    col("in","اشترى",function(r){return P(r.i).n},{num:false}),col("inPrice","سعر الشراء",function(r){return r.ic},{def:false}),col("inPts","نقاط اللي اشتراه",function(r){return L?num(pPts(r.i)):""}),
    col("out","باع",function(r){return P(r.o).n},{num:false}),col("outPrice","سعر البيع",function(r){return r.oc},{def:false}),col("outPts","نقاط اللي باعه",function(r){return L?num(pPts(r.o)):""}),
    col("gain","مكسب التحويلة",gain,{h:function(r){return sg(gain(r))}}),col("chip","الخاصية",function(r){return chipNm[r.m.chip]||""},{num:false}),
    col("cap","كابتن التيم",function(r){return r.m.isCaptain?1:0},{h:function(r){return chk(r.m.isCaptain)}}),col("cost","السوالب",function(r){return r.m.cost}),col("points","النقاط",function(r){return r.m.d.points}),col("net","الصافي",function(r){return r.m.d.net}),
    col("bench","نقاط الدكة",function(r){return r.m.d.benchPts},{def:false}),col("time","وقت التحويلة",function(r){return r.t},{h:function(r){return r.t?ft(r.t):'<span class="mut">–</span>'}})];
  var ex=PL?PL.cols.transfers():[];
  return{cols:base.concat(ex),rows:rows}}

/* ---------- محرك الجداول ---------- */
var LAST={};
function tbl(key,rows,cols,o){
  var st=TB[key]||(TB[key]={sort:null,hide:{}}),a=A();
  var vis=cols.filter(function(c){var h=st.hide[c.k];return h==null?c.def!==false:!h});
  var list=rows.slice(),sc=st.sort&&cols.find(function(c){return c.k===st.sort.k});
  if(sc)list.sort(function(x,y){var u=sc.v(x),w=sc.v(y),e1=u===""||u==null,e2=w===""||w==null;if(e1&&e2)return 0;if(e1)return 1;if(e2)return-1;var d=typeof u==="number"&&typeof w==="number"?u-w:String(u).localeCompare(String(w),"ar");return d*st.sort.dir});
  else if(o.defSort)list.sort(o.defSort);
  if(a.top&&o.teamOf){var seen={};list=list.filter(function(r){var t=o.teamOf(r);if(seen[t])return false;seen[t]=1;return true})}
  if(a.limit!=="all")list=list.slice(0,Number(a.limit));
  LAST[key]={vis:vis,list:list};
  var head=vis.map(function(c){return'<th data-sk="'+key+":"+c.k+'">'+esc(c.l)+(st.sort&&st.sort.k===c.k?'<span class="arr">'+(st.sort.dir>0?"▲":"▼")+"</span>":"")+"</th>"}).join("");
  var body=list.map(function(r){return"<tr"+(o.act?o.act(r):"")+">"+vis.map(function(c){var v;try{v=c.h?c.h(r):esc(fmt(c.v(r)))}catch(e){v=""}return"<td"+(c.wr?' class="wr"':"")+">"+v+"</td>"}).join("")+"</tr>"}).join("")||'<tr><td colspan="'+vis.length+'" class="mut" style="text-align:center;padding:30px">مفيش نتائج بالفلاتر دي</td></tr>';
  var tot="";if(o.totals&&list.length){var t=o.totals(list),first=true;tot='<tr class="tot">'+vis.map(function(c){var v=t[c.k];if(first){first=false;return"<td>"+(v!=null?esc(String(v)):"الإجمالي")+"</td>"}return"<td>"+(v!=null?esc(fmt(v)):"")+"</td>"}).join("")+"</tr>"}
  var bar='<div class="tbar" style="margin-top:0"><button class="chip" data-tb="cols:'+key+'">الأعمدة</button><button class="chip" data-tb="csv:'+key+'">CSV</button><button class="chip" data-tb="copy:'+key+'">نسخ</button><span class="mut" style="margin-inline-start:auto">'+list.length+" صف</span></div>";
  return bar+'<div class="tw" data-t="'+esc(o.title)+'"><table class="gt"><thead><tr>'+head+"</tr></thead><tbody>"+body+tot+"</tbody></table></div>"}
function fmt(v){return typeof v==="number"?(Math.round(v*10)/10).toLocaleString("en-US"):v==null?"":v}

R.tableView=function(tab){
  if(VM[tab]!=="table"||!S.D)return null;var wm=WM();
  if(tab==="members"){var cols=membersCols(wm);return tbl("members",wm,cols,{title:"الأعضاء",defSort:function(a,b){return b.d.net-a.d.net},act:function(m){return' data-act="m" data-arg="'+esc(m.uid)+'"'},teamOf:function(m){return m.team},
    totals:function(l){var t={rank:"الإجمالي - "+l.length+" عضو"};cols.forEach(function(c){if(c.num&&["rank","orank","value","bank","x_star","x_share","x_played","x_dprev","x_form"].indexOf(c.k)<0&&c.k.indexOf("x_")!==0)t[c.k]=sum(l,c.v)});return t}})}
  if(tab==="teams"){var x=teamsCols(wm);return tbl("teams",x.rows,x.cols,{title:"التيمات",act:function(r){return' data-act="t" data-arg="'+esc(r.team)+'"'},defSort:function(a,b){return b.net-a.net}})}
  if(tab==="players"){var y=playersCols(wm);return tbl("players",y.rows,y.cols,{title:"اللاعيبة",act:function(s){return' data-act="p" data-arg="'+s.id+'"'},defSort:function(a,b){return b.own-a.own||b.cap-a.cap}})}
  if(tab==="transfers"){var z=transfersCols(wm);return tbl("transfers",z.rows,z.cols,{title:"التحويلات",teamOf:function(r){return r.m.team},act:function(r){return' data-act="m" data-arg="'+esc(r.m.uid)+'"'},defSort:function(a,b){return b.t-a.t}})}
  return null};

var prevAfter=R.afterRender;
R.afterRender=function(){
  if(prevAfter)prevAfter();
  var tab=S.tab;if(["members","teams","players","transfers"].indexOf(tab)<0||!S.D)return;
  var v=F.$("#view"),m=VM[tab]==="table"?"table":"cards";
  v.insertAdjacentHTML("afterbegin",'<div class="tbar"><div class="sg"><button data-vm="'+tab+':cards" class="'+(m==="cards"?"on":"")+'">بطاقات</button><button data-vm="'+tab+':table" class="'+(m==="table"?"on":"")+'">جدول كامل</button></div><button class="chip" data-adv-open>فلاتر متقدمة'+(advCount()?' <b class="up n">'+advCount()+"</b>":"")+"</button></div>")};
function advCount(){var a=A(),n=0;["sp","sc","spos","must","xp","xc","xpos","xany","xmust","chips"].forEach(function(k){if(a[k].length)n++});["caps","top","lastBuy","lastSell","diff"].forEach(function(k){if(a[k])n++});if(a.minOwn)n++;if(a.tFrom||a.tTo)n++;if(a.limit!=="all")n++;if(a.dir!=="all")n++;if(S.F.play!=="all")n++;return n}

/* ---------- الفلاتر المتقدمة ---------- */
var PKS=null;
function optsFor(kind){
  if(kind==="club"){var c={};Object.keys(S.D.players).forEach(function(i){var cl=P(i).club;if(cl)c[cl]=1});return Object.keys(c).sort().map(function(x){return{v:x,t:x}})}
  if(kind==="pos")return[["GKP","حارس"],["DEF","مدافع"],["MID","وسط"],["FWD","مهاجم"]].map(function(x){return{v:x[0],t:x[1]}});
  var u={};S.D.members.forEach(function(m){m.picks.forEach(function(p){u[p[0]]=1});m.transfers.forEach(function(t){u[t[0]]=1;u[t[1]]=1})});
  return Object.keys(u).filter(function(i){return S.D.players[i]}).map(function(i){return{v:String(i),t:P(i).n,s:P(i).club+" - "+P(i).pos}}).sort(function(a,b){return a.t.localeCompare(b.t)})}
var KIND={sp:"player",must:"player",xp:"player",xany:"player",xmust:"player",sc:"club",xc:"club",spos:"pos",xpos:"pos"};
var LBL={sp:"لاعب",must:"لازم يكون عنده كلهم",xp:"استبعد لاعب",xany:"استبعد اللي عنده أي واحد من",xmust:"استبعد اللي عنده كل دول",sc:"الفريق",xc:"استبعد فريق",spos:"المركز",xpos:"استبعد مركز"};
function pkList(){var a=A()[PKS.key],q=PKS.q.toLowerCase();return PKS.opts.filter(function(o){return!q||(o.t+" "+(o.s||"")).toLowerCase().indexOf(q)>-1}).slice(0,200).map(function(o){var on=a.indexOf(o.v)>-1;return'<div class="opt '+(on?"on":"")+'" data-popt="'+esc(o.v)+'"><span class="cb">'+(on?"✓":"")+"</span><b>"+esc(o.t)+"</b>"+(o.s?"<small>"+esc(o.s)+"</small>":"")+"</div>"}).join("")||'<div class="empty">مفيش نتائج</div>'}
function openPicker(key){
  PKS={key:key,opts:optsFor(KIND[key]),q:""};
  F.push(LBL[key],'<label class="sr">'+F.ic("search",18)+'<input id="pkq" placeholder="بحث..."></label><div id="pkl">'+pkList()+'</div><button class="btn b1" data-pkdone style="width:100%;margin-top:12px">تم</button>',"picker")}
function advHtml(){
  var a=A(),row=function(k){var n=a[k].length;return'<div class="tg"><span>'+LBL[k]+'</span><button class="pk" style="width:auto;min-height:36px" data-pkopen="'+k+'">'+(n?n+" مختار":"اختار")+" "+F.ic("cr",16)+"</button></div>"};
  var pill=function(t,k,on){return'<button data-adv="'+k+'" class="'+(on?"on":"")+'">'+t+"</button>"};
  var seg=function(k,L,v){return'<div class="sg">'+L.map(function(x){return'<button data-aseg="'+k+":"+x[0]+'" class="'+(v===x[0]?"on":"")+'">'+x[1]+"</button>"}).join("")+"</div>"};
  var presets=JSON.parse(LS.get("fc_presets")||"{}"),pn=Object.keys(presets);
  return'<div class="sec">الفلاتر المحفوظة</div><div class="tbar" style="margin:0"><select id="pset" class="sr" style="flex:1"><option value="">اختار فلتر محفوظ</option>'+pn.map(function(n){return'<option value="'+esc(n)+'">'+esc(n)+"</option>"}).join("")+'</select><button class="chip" data-pre="apply">تطبيق</button><button class="chip" data-pre="save">حفظ الحالي</button><button class="chip" data-pre="del">حذف</button></div>'+
   '<div class="sec">اختيار اللاعيبة (بيأثر على الأعضاء والتيمات والتحويلات)</div>'+row("sp")+row("sc")+row("spos")+row("must")+
   '<div class="sec">استبعاد</div>'+row("xp")+row("xc")+row("xpos")+row("xany")+row("xmust")+
   '<div class="sec">التحويلات</div>'+seg("dir",[["all","شراء وبيع"],["buy","شراء بس"],["sell","بيع بس"]],a.dir)+
   '<div class="chips" style="margin-top:10px;flex-wrap:wrap">'+[["wildcard","وايلد كارد"],["freehit","فري هيت"],["3xc","تربيل كابتن"],["bboost","بنش بوست"]].map(function(c){return pill(c[1],"chip:"+c[0],a.chips.indexOf(c[0])>-1)}).join("")+pill("آخر شروة","lastBuy",a.lastBuy)+pill("آخر بيعة","lastSell",a.lastSell)+"</div>"+
   '<div class="tbar"><label class="mut" style="flex:1">من وقت<input type="datetime-local" data-aval="tFrom" value="'+esc(a.tFrom)+'" class="sr" style="margin-top:4px"></label><label class="mut" style="flex:1">لحد وقت<input type="datetime-local" data-aval="tTo" value="'+esc(a.tTo)+'" class="sr" style="margin-top:4px"></label></div>'+
   '<div class="sec">عام</div><div class="chips" style="flex-wrap:wrap">'+pill("كباتن التيمات بس","caps",a.caps)+pill("أول واحد لكل تيم","top",a.top)+pill("الديفرنشيال بس (20% أو أقل)","diff",a.diff)+"</div>"+
   '<div class="sec">حالة اللعب (من اللايف)</div>'+seg("play",[["all","الكل"],["played","لعب"],["pending","لسه"],["dnp","ملعبش"]],S.F.play)+
   '<div class="tbar"><label class="mut" style="flex:1">أقل نسبة امتلاك %<input type="number" min="0" max="100" data-aval="minOwn" value="'+(a.minOwn||"")+'" class="sr" style="margin-top:4px"></label><label class="mut" style="flex:1">عدد الصفوف<select data-aval="limit" class="sr" style="margin-top:4px">'+["all","5","10","20","30","50"].map(function(x){return'<option value="'+x+'"'+(a.limit===x?" selected":"")+">"+(x==="all"?"كل الصفوف":"أول "+x)+"</option>"}).join("")+"</select></label></div>"+
   '<div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-top:18px"><button class="btn b2" data-advclr>مسح الكل</button><button class="btn b1" data-advok>تطبيق</button></div>'}
R.openAdv=function(){if(!S.D){toast("حمّل الجولة الأول");return}F.push("فلاتر متقدمة",advHtml(),"adv")};
function refreshAdv(){var top=F.$("#sheet").scrollTop;F.pop();R.openAdv();F.$("#sheet").scrollTop=top}

R.click=(function(prev){return function(e){
  if(prev&&prev(e))return true;
  var t=e.target,a=A(),m;
  if((m=t.closest("[data-sk]"))){var p=m.getAttribute("data-sk").split(":"),st=TB[p[0]]||(TB[p[0]]={sort:null,hide:{}});st.sort=st.sort&&st.sort.k===p[1]?{k:p[1],dir:-st.sort.dir}:{k:p[1],dir:-1};saveV();F.render();return true}
  if((m=t.closest("[data-vm]"))){var q=m.getAttribute("data-vm").split(":");VM[q[0]]=q[1];saveV();F.render();return true}
  if(t.closest("[data-adv-open]")){R.openAdv();return true}
  if((m=t.closest("[data-tb]"))){var u=m.getAttribute("data-tb").split(":"),k=u[1];
    if(u[0]==="cols"){var cols=colsFor(k);F.push("الأعمدة",'<div class="tbar" style="margin-top:0"><button class="chip" data-ckall="'+k+':1">الكل</button><button class="chip" data-ckall="'+k+':0">ولا حاجة</button></div>'+cols.map(function(c){var h=(TB[k]||{hide:{}}).hide[c.k],on=h==null?c.def!==false:!h;return'<div class="opt '+(on?"on":"")+'" data-ck="'+k+":"+c.k+'"><span class="cb">'+(on?"✓":"")+"</span><b>"+esc(c.l)+"</b></div>"}).join(""),"cols");return true}
    var L2=LAST[k];if(!L2)return true;var rows=[L2.vis.map(function(c){return c.l})].concat(L2.list.map(function(r){return L2.vis.map(function(c){var v=c.v(r);return v==null?"":v})}));
    if(u[0]==="csv"){var csv="\uFEFF"+rows.map(function(r){return r.map(function(v){return'"'+String(v).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n"),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),aa=document.createElement("a");aa.href=url;aa.download="فانتازي-ج"+S.gw+"-"+k+".csv";document.body.appendChild(aa);aa.click();aa.remove();setTimeout(function(){URL.revokeObjectURL(url)},2000)}
    else navigator.clipboard&&navigator.clipboard.writeText(rows.map(function(r){return r.join("\t")}).join("\n")).then(function(){toast("اتنسخ الجدول - الصقه في شيت")});return true}
  if((m=t.closest("[data-ck]"))){var w=m.getAttribute("data-ck").split(":"),st2=TB[w[0]]||(TB[w[0]]={sort:null,hide:{}}),cc=colsFor(w[0]).find(function(c){return c.k===w[1]}),cur=st2.hide[w[1]]==null?cc.def!==false:!st2.hide[w[1]];st2.hide[w[1]]=cur;saveV();m.classList.toggle("on",!cur);m.querySelector(".cb").textContent=cur?"":"✓";F.render();return true}
  if((m=t.closest("[data-ckall]"))){var z=m.getAttribute("data-ckall").split(":"),st3=TB[z[0]]||(TB[z[0]]={sort:null,hide:{}});colsFor(z[0]).forEach(function(c){st3.hide[c.k]=z[1]!=="1"});saveV();F.pop();F.render();R.click({target:{closest:function(s){return s==="[data-tb]"?{getAttribute:function(){return"cols:"+z[0]}}:null}}});return true}
  if((m=t.closest("[data-pkopen]"))){openPicker(m.getAttribute("data-pkopen"));return true}
  if((m=t.closest("[data-popt]"))){var v=m.getAttribute("data-popt"),arr=a[PKS.key],i=arr.indexOf(v);if(i>-1)arr.splice(i,1);else arr.push(v);m.classList.toggle("on");m.querySelector(".cb").textContent=i>-1?"":"✓";return true}
  if(t.closest("[data-pkdone]")){F.pop();refreshAdv();return true}
  if((m=t.closest("[data-adv]"))){var f=m.getAttribute("data-adv");if(f.indexOf("chip:")===0){var c2=f.slice(5),j=a.chips.indexOf(c2);if(j>-1)a.chips.splice(j,1);else a.chips.push(c2)}else a[f]=!a[f];m.classList.toggle("on");return true}
  if((m=t.closest("[data-aseg]"))){var s2=m.getAttribute("data-aseg").split(":");if(s2[0]==="play")S.F.play=s2[1];else a[s2[0]]=s2[1];refreshAdv();return true}
  if(t.closest("[data-advclr]")){S.F.adv=cp(DEF);S.F.play="all";refreshAdv();return true}
  if(t.closest("[data-advok]")){F.save();F.pop();F.derive();F.render();return true}
  if((m=t.closest("[data-pre]"))){var pr=JSON.parse(LS.get("fc_presets")||"{}"),act=m.getAttribute("data-pre"),sel=F.$("#pset");
    if(act==="save"){var n=prompt("اسم الفلتر:");if(!n)return true;pr[n.trim()]=cp({F:S.F});LS.set("fc_presets",JSON.stringify(pr));toast("اتحفظ "+n);refreshAdv()}
    else if(sel&&sel.value&&pr[sel.value]){if(act==="apply"){Object.assign(S.F,cp(pr[sel.value].F));S.F.adv=Object.assign(cp(DEF),S.F.adv);F.save();F.derive();F.pop();F.render();toast("اتطبّق "+sel.value)}else{delete pr[sel.value];LS.set("fc_presets",JSON.stringify(pr));toast("اتمسح");refreshAdv()}}
    else toast("اختار فلتر محفوظ الأول");return true}
  if(t.closest("#lnk")){var st4={gw:S.gw,tab:S.tab,F:S.F},b=btoa(unescape(encodeURIComponent(JSON.stringify(st4)))).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""),url2=location.href.split("#")[0]+"#s="+b;navigator.clipboard&&navigator.clipboard.writeText(url2).then(function(){toast("اتنسخ رابط بنفس الجولة والفلاتر")});return true}
  if(t.closest("#aut")){var key=LS.get("fc_key")||prompt("مفتاح الأدمن (ADMIN_KEY):","");if(!key)return true;LS.set("fc_key",key);F.api({api:"autoLive",key:key,on:"toggle"}).then(function(r){toast((r&&r.message)||"تم")}).catch(function(){toast("تعذّر تغيير التحديث التلقائي")});return true}
  return false}})(R.click);
function colsFor(k){var wm=WM();return k==="members"?membersCols(wm):k==="teams"?teamsCols(wm).cols:k==="players"?playersCols(wm).cols:transfersCols(wm).cols}
R.input=(function(prev){return function(e){if(prev)prev(e);var t=e.target;
  if(t.id==="pkq"&&PKS){PKS.q=t.value;F.$("#pkl").innerHTML=pkList()}}})(R.input);
R.change=(function(prev){return function(e){if(prev)prev(e);var t=e.target,k=t.getAttribute&&t.getAttribute("data-aval");
  if(k){var v=t.value;A()[k]=k==="minOwn"?Number(v)||0:v}}})(R.change);
})();
