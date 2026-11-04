/* grid.js - محرك الجداول المشترك (نفس جدول الإحصائيات الأصلي: # وتحديد الصفوف والتثبيت والترتيب والنطاقات والإجمالي) */
(function(){"use strict";
var F=window.__fc,R=F.R,esc=F.esc,toast=F.toast;
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var G={};try{G=JSON.parse(LS.get("fc_grid2")||"{}")}catch(e){}
var LAST={};
function st(k){var s=G[k]||(G[k]={sort:null,pin:undefined,cv:{},hid:{},unc:{},rg:[],idx:true,sticky:true,notot:false,limit:"all"});return s}
function persist(){var o={};Object.keys(G).forEach(function(k){var s=G[k];o[k]={sort:s.sort,pin:s.pin,cv:s.cv,rg:s.rg,idx:s.idx,sticky:s.sticky,notot:s.notot,limit:s.limit,hid:{},unc:{}}});LS.set("fc_grid2",JSON.stringify(o))}
var fmt=function(v){return typeof v==="number"?(Math.round(v*10)/10).toLocaleString("en-US"):v==null?"":v};
var COLP='<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16 3l5 5-3 1-4 4 1 5-2 2-4-4-5 5-1-1 5-5-4-4 2-2 5 1 4-4z"/></svg>';
function colOn(s,c){var v=s.cv[c.k];return v==null?c.def!==false:v}
function cmpv(a,b,dir){var ae=a==null||a==="",be=b==null||b==="";if(ae&&be)return 0;if(ae)return 1;if(be)return-1;return(typeof a==="number"&&typeof b==="number"?a-b:String(a).localeCompare(String(b),"ar"))*dir}

/* o: {key,title,rows,cols,rowKey,defSort,totals,act,teamOf,plain,hdr,rc,idx,tools,extra,pinDef,rowCls} */
function render(o){
  var k=o.key,s=st(k),plain=!!o.plain,cols=o.cols,vis=cols.filter(function(c){return colOn(s,c)});
  var pin=s.pin===undefined?(o.pinDef===false?null:(vis[0]&&vis[0].k)):s.pin;
  var list=o.rows.slice(),sc=s.sort&&cols.find(function(c){return c.k===s.sort.k});
  if(sc){var pc=s.sort.pk&&cols.find(function(c){return c.k===s.sort.pk});list.sort(function(a,b){return cmpv(sc.v(a),sc.v(b),s.sort.dir)||(pc&&pc!==sc?cmpv(pc.v(a),pc.v(b),s.sort.pd||1):0)})}
  else if(o.defSort)list.sort(o.defSort);
  if(o.post)list=o.post(list);
  var hid=s.hid,unc=s.unc,hiddenN=0;
  list=list.filter(function(r){if(hid[o.rowKey(r)]){hiddenN++;return false}return true});
  list.forEach(function(r,i){r._n=i+1});
  var shown=list,rg=s.rg.map(function(x){return{f:parseInt(x.f),t:parseInt(x.t)}}).filter(function(x){return x.f>0&&x.t>=x.f});
  if(rg.length){var ix={};rg.forEach(function(x){for(var i=x.f;i<=x.t;i++)ix[i]=1});shown=Object.keys(ix).map(Number).sort(function(a,b){return a-b}).map(function(i){return list[i-1]}).filter(Boolean)}
  else if(s.limit!=="all")shown=list.slice(0,Number(s.limit));
  var rc=o.rc!==false&&!plain,idx=o.idx!==false&&!plain&&s.idx;
  LAST[k]={o:o,vis:vis,shown:shown,list:list};
  var h='<thead><tr>';
  if(rc)h+='<th class="rc"><input type="checkbox" data-grca="'+k+'" aria-label="تحديد الكل"'+(shown.some(function(r){return unc[o.rowKey(r)]})?"":" checked")+"></th>";
  if(idx)h+='<th class="ix">#</th>';
  vis.forEach(function(c){h+='<th data-gs="'+k+":"+c.k+'" class="'+(c.k===pin&&!plain?"pin":"")+(c.num?" nm":"")+'">'+esc(c.l)+'<span class="arr">'+(s.sort&&s.sort.k===c.k?(s.sort.dir>0?"▲":"▼"):"↕")+"</span>"+(plain?"":'<button class="pb2'+(c.k===pin?" on":"")+'" data-gp="'+k+":"+c.k+'" aria-label="تثبيت العمود">'+COLP+"</button>")+"</th>"});
  h+="</tr></thead><tbody>";
  if(!shown.length)h+='<tr><td class="emp" colspan="'+(vis.length+(rc?1:0)+(idx?1:0))+'">'+(o.empty||"مفيش نتائج بالفلاتر دي. جرّب تشيل فلتر من فوق.")+"</td></tr>";
  shown.forEach(function(r){
    var rk=o.rowKey(r),un=unc[rk];
    h+='<tr data-rk="'+esc(rk)+'" class="'+(un?"unc ":"")+(o.rowCls?o.rowCls(r):"")+'"'+(o.act&&!plain?o.act(r):"")+">";
    if(rc)h+='<td class="rc"><input type="checkbox" data-grc="'+k+":"+esc(rk)+'" aria-label="تحديد الصف"'+(un?"":" checked")+"></td>";
    if(idx)h+='<td class="ix n">'+r._n+"</td>";
    vis.forEach(function(c){var v;try{v=c.h?c.h(r):esc(fmt(c.v(r)))}catch(e){v=""}h+='<td class="'+(c.k===pin&&!plain?"pin ":"")+(c.num?"nm ":"")+(c.wr?"wr":"")+'">'+(v==null?"":v)+"</td>"});
    h+="</tr>"});
  if(o.totals&&!s.notot&&shown.length){
    var t=o.totals(shown.filter(function(r){return!unc[o.rowKey(r)]})),first=true;
    h+='<tr class="tot">'+(rc?"<td></td>":"")+(idx?"<td></td>":"")+vis.map(function(c){var v=t[c.k];if(first){first=false;return"<td>"+(v!=null?esc(String(v)):"الإجمالي")+"</td>"}return'<td class="'+(c.num?"nm":"")+'">'+(v!=null?esc(fmt(v)):"")+"</td>"}).join("")+"</tr>"}
  h+="</tbody>";
  var tools="";
  if(o.tools!==false&&!plain){
    tools='<div class="tt"><div class="tt1"><b>'+esc(o.title)+'</b><span class="mut">'+(shown.length===list.length?list.length+" صف":"عرض "+shown.length+" من "+list.length)+"</span>"+(hiddenN?'<button class="lk" data-gt="'+k+':showhid">'+hiddenN+" مخفي - إظهارهم</button>":"")+"</div>"+
     '<div class="tt2"><select data-gl="'+k+'" aria-label="عدد الصفوف">'+[["all","كل الصفوف"],["5","أول 5"],["10","أول 10"],["20","أول 20"],["30","أول 30"],["50","أول 50"]].map(function(x){return'<option value="'+x[0]+'"'+(s.limit===x[0]?" selected":"")+">"+x[1]+"</option>"}).join("")+"</select>"+
     s.rg.map(function(x,i){return'<span class="rgb"><input type="number" min="1" placeholder="من" data-gr="'+k+":"+i+':f" value="'+esc(x.f)+'"> – <input type="number" min="1" placeholder="إلى" data-gr="'+k+":"+i+':t" value="'+esc(x.t)+'"><button data-gt="'+k+":rgx"+i+'" aria-label="شيل النطاق">✕</button></span>'}).join("")+
     '<button class="chip" data-gt="'+k+':rgadd">+ نطاق</button><button class="chip'+(s.idx?" on":"")+'" data-gt="'+k+':idx">#</button><button class="chip'+(s.sticky?" on":"")+'" data-gt="'+k+':sticky">تثبيت الهيدر</button><button class="chip'+(s.notot?" on":"")+'" data-gt="'+k+':notot">بدون إجمالي</button><button class="chip" data-gt="'+k+':hideunc">إخفاء غير المحدد</button><button class="chip" data-gt="'+k+':cols">الأعمدة</button><button class="chip" data-gt="'+k+':csv">CSV</button><button class="chip" data-gt="'+k+':copy">نسخ</button><button class="chip" data-gt="'+k+':shot">📸 صورة الجدول</button>'+(o.extra||"")+"</div></div>"}
  return tools+'<div class="tw'+(o.hdr?" "+o.hdr:"")+(s.sticky?" stk2":"")+'" data-k="'+k+'" data-t="'+esc(o.title)+'"><table class="gt'+(plain?" plain":"")+'">'+h+"</table></div>"}

function rerender(k){var L0=LAST[k];if(L0&&L0.o.sheetFn){var stk=F.S.stack,en=null;stk.forEach(function(x){if(x.kind===L0.o.sheetKind)en=x});if(en){en.html=L0.o.sheetFn();if(stk[stk.length-1]===en){var sh=document.querySelector("#sheet"),sc=sh.scrollTop;F.paintSheet();sh.scrollTop=sc}return}}var q='.tw[data-k="'+k+'"]',tw=document.querySelector(q),sl=tw?tw.scrollLeft:0,stp=tw?tw.scrollTop:0,y=window.scrollY;F.render();var t2=document.querySelector(q);if(t2){t2.scrollLeft=sl;t2.scrollTop=stp}window.scrollTo(0,y)}
function matrix(k){var L=LAST[k];if(!L)return null;var unc=st(k).unc;var rows=L.shown.filter(function(r){return!unc[L.o.rowKey(r)]});return[["#"].concat(L.vis.map(function(c){return c.l}))].concat(rows.map(function(r,i){return[i+1].concat(L.vis.map(function(c){var v=c.csv?c.csv(r):c.v(r);return v==null?"":v}))}))}
function colsSheet(k){var L=LAST[k];if(!L)return;var s=st(k);F.push("الأعمدة",'<div class="tbar" style="margin-top:0"><button class="chip" data-gca="'+k+':1">الكل</button><button class="chip" data-gca="'+k+':0">ولا حاجة</button></div>'+L.o.cols.map(function(c){var on=colOn(s,c);return'<div class="opt '+(on?"on":"")+'" data-gck="'+k+":"+c.k+'"><span class="cb">'+(on?"✓":"")+"</span><b>"+esc(c.l)+"</b></div>"}).join(""),"cols")}

R.click=(function(prev){return function(e){
  if(prev&&prev(e))return true;var t=e.target,m;
  if(t.closest(".pb2")){m=t.closest("[data-gp]");var p=m.getAttribute("data-gp").split(":"),s=st(p[0]);s.pin=s.pin===p[1]?null:p[1];persist();rerender(p[0]);return true}
  if((m=t.closest("[data-gs]"))){var q=m.getAttribute("data-gs").split(":"),s2=st(q[0]);if(s2.sort&&s2.sort.k===q[1])s2.sort={k:q[1],dir:-s2.sort.dir,pk:s2.sort.pk,pd:s2.sort.pd};else{var def=LAST[q[0]]&&LAST[q[0]].o.cols.find(function(c){return c.k===q[1]});s2.sort={k:q[1],dir:def&&def.num?-1:1,pk:s2.sort&&s2.sort.k,pd:s2.sort&&s2.sort.dir}}persist();rerender(q[0]);return true}
  if((m=t.closest("[data-grca]"))){var k3=m.getAttribute("data-grca"),L=LAST[k3];if(L){var u=st(k3).unc;L.shown.forEach(function(r){if(m.checked)delete u[L.o.rowKey(r)];else u[L.o.rowKey(r)]=1})}rerender(k3);return true}
  if((m=t.closest("[data-grc]"))){var z=m.getAttribute("data-grc"),i=z.indexOf(":"),k4=z.slice(0,i),rk=z.slice(i+1),u2=st(k4).unc;if(m.checked)delete u2[rk];else u2[rk]=1;rerender(k4);return true}
  if((m=t.closest("[data-gt]"))){var w=m.getAttribute("data-gt").split(":"),k5=w[0],a=w[1],s5=st(k5),L5=LAST[k5];
    if(a==="idx")s5.idx=!s5.idx;else if(a==="sticky")s5.sticky=!s5.sticky;else if(a==="notot")s5.notot=!s5.notot;
    else if(a==="rgadd")s5.rg.push({f:"",t:""});else if(a.indexOf("rgx")===0)s5.rg.splice(Number(a.slice(3)),1);
    else if(a==="showhid")s5.hid={};
    else if(a==="hideunc"){if(!Object.keys(s5.unc).length){toast("شيل علامة الصفوف اللي عايز تخفيها الأول");return true}Object.keys(s5.unc).forEach(function(x){s5.hid[x]=1});s5.unc={}}
    else if(a==="cols"){colsSheet(k5);return true}
    else if(a==="shot"){var tw=document.querySelector('.tw[data-k="'+k5+'"]');if(tw)F.capture(tw,tw.getAttribute("data-t"));return true}
    else if(a==="csv"||a==="copy"){var mx=matrix(k5);if(!mx)return true;
      if(a==="csv"){var csv="\uFEFF"+mx.map(function(r){return r.map(function(v){return'"'+String(v).replace(/"/g,'""')+'"'}).join(",")}).join("\r\n"),url=URL.createObjectURL(new Blob([csv],{type:"text/csv;charset=utf-8"})),an=document.createElement("a");an.href=url;an.download="فانتازي-ج"+F.S.gw+"-"+k5+".csv";document.body.appendChild(an);an.click();an.remove();setTimeout(function(){URL.revokeObjectURL(url)},2000)}
      else navigator.clipboard&&navigator.clipboard.writeText(mx.map(function(r){return r.join("\t")}).join("\n")).then(function(){toast("اتنسخ الجدول - الصقه في شيت")});return true}
    persist();rerender(k5);return true}
  if((m=t.closest("[data-gck]"))){var y=m.getAttribute("data-gck").split(":"),s6=st(y[0]),c6=LAST[y[0]].o.cols.find(function(c){return c.k===y[1]}),cur=colOn(s6,c6);s6.cv[y[1]]=!cur;persist();m.classList.toggle("on",!cur);m.querySelector(".cb").textContent=cur?"":"✓";rerender(y[0]);return true}
  if((m=t.closest("[data-gca]"))){var x=m.getAttribute("data-gca").split(":"),s7=st(x[0]);LAST[x[0]].o.cols.forEach(function(c){s7.cv[c.k]=x[1]==="1"});persist();F.pop();rerender(x[0]);colsSheet(x[0]);return true}
  return false}})(R.click);
R.change=(function(prev){return function(e){if(prev)prev(e);var t=e.target,a;
  if(t.getAttribute&&(a=t.getAttribute("data-gl"))){st(a).limit=t.value;persist();rerender(a)}
  else if(t.getAttribute&&(a=t.getAttribute("data-gr"))){var p=a.split(":"),s=st(p[0]);if(s.rg[Number(p[1])])s.rg[Number(p[1])][p[2]]=t.value;persist();rerender(p[0])}}})(R.change);
window.__grid={render:render,state:st,rerender:rerender,last:LAST,colOn:colOn};
})();
