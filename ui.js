/* ui.js - الطبقة الجديدة للتطبيق (بتتحمل آخر ملف)
   1) أشكال جاهزة (نيون / ذهبي / غروب / ملعب) من "الشكل" في القايمة
   2) حركة: دخول الصفحات والكروت، عدّاد الأرقام، نبض اللايف، فتح القايمة والشيتات بنعومة
   3) "كل الأقسام": شاشة بسيطة بأزرار كبيرة لأي حد جديد
   4) جولة تعريفية أول مرة، وسحب للتحديث، وكارت صدارة في الملخص
   كله إضافة فوق التطبيق (CSS + هوكس) ومفيش حاجة فيه بتغيّر باقي السكربتات. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, $ = F.$, $$ = F.$$, esc = F.esc, WM = F.WM;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  var root = document.documentElement;

  /* ---------- الأشكال ---------- */
  var SKINS = {
    classic: { name: "كلاسيك", sub: "الشكل الحالي", mode: null, acc: null, sw: ["#0B0F19", "#121826", "#5EEAD4"] },
    neon: { name: "نيون زجاجي", sub: "داكن بتوهّج", mode: "dark", acc: "#B8F34B", sw: ["#0A0E18", "#162040", "#B8F34B"] },
    gold: { name: "ذهبي فاخر", sub: "أسود ودهبي", mode: "dark", acc: "#D4AF37", sw: ["#0A0907", "#1B170D", "#D4AF37"] },
    sunset: { name: "غروب متدرج", sub: "فاتح بألوان دافية", mode: "light", acc: "#F0467A", sw: ["#FFF7F3", "#FCEEF2", "#F0467A"] },
    pitch: { name: "ملعب فاتح", sub: "أخضر نضيف", mode: "light", acc: "#16A34A", sw: ["#F2F6F1", "#E9F1E8", "#22A35A"] }
  };
  function applySkin(k) { if (!SKINS[k]) k = "classic"; if (k === "classic") root.removeAttribute("data-skin"); else root.setAttribute("data-skin", k); }
  applySkin(LS.get("fc_skin") || "classic");

  function hex(c) { var m = /^#?([0-9a-f]{6})$/i.exec((c || "").trim()); if (!m) return null; var n = parseInt(m[1], 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
  function nearestAccent(target) {
    var t = hex(target), best = null, bd = 1e9;
    if (!t) return null;
    $$("#drawer .dots button[data-acc]").forEach(function (b) {
      var c = hex(b.style.backgroundColor ? rgb2hex(b.style.backgroundColor) : ""), d;
      if (!c) return;
      d = Math.pow(c[0] - t[0], 2) + Math.pow(c[1] - t[1], 2) + Math.pow(c[2] - t[2], 2);
      if (d < bd) { bd = d; best = b; }
    });
    return best;
  }
  function rgb2hex(s) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(s);
    if (!m) return s;
    return "#" + [m[1], m[2], m[3]].map(function (x) { return ("0" + Number(x).toString(16)).slice(-2); }).join("");
  }
  function chooseSkin(k) {
    var sk = SKINS[k]; if (!sk) return;
    LS.set("fc_skin", k); applySkin(k);
    if (sk.mode && S.theme !== sk.mode) { var th = $("#th"); if (th) th.click(); }
    if (sk.acc) { var a = nearestAccent(sk.acc); if (a && S.acc !== a.getAttribute("data-acc")) a.click(); }
    F.toast("اتغير الشكل: " + sk.name);
  }

  var CSS = [
    /* أساسيات مريحة */
    "html{scroll-behavior:smooth}body{overscroll-behavior-y:contain}",
    ":focus-visible{outline:2px solid var(--ac);outline-offset:2px;border-radius:10px}",
    ".bar{-webkit-backdrop-filter:saturate(1.4) blur(14px);backdrop-filter:saturate(1.4) blur(14px);background:color-mix(in srgb,var(--bg) 84%,transparent)}",
    ".cd,.chip,.tb,.li,.tile,.btn,.sg button,.fchip,.pchip{transition:transform .18s cubic-bezier(.2,.8,.2,1),background-color .25s,border-color .25s,box-shadow .3s}",
    ".btn:active:not(:disabled),.cd.act:active,.li.click:active,.tile.click:active,.tb:active,.chip:active,.fchip:active{transform:scale(.97)}",
    "@media(hover:hover){.cd.act:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.16)}}",
    ".shotw *{animation:none!important;transition:none!important}",
    /* الحركات */
    "@keyframes fcUp{from{opacity:0;transform:translateY(18px) scale(.985)}to{opacity:1;transform:none}}",
    "@keyframes fcIn{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:none}}",
    "@keyframes fcPulse{0%{box-shadow:0 0 0 0 color-mix(in srgb,var(--ac) 50%,transparent)}100%{box-shadow:0 0 0 10px transparent}}",
    "@keyframes fcShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}",
    "@keyframes fcPop{0%{opacity:0;transform:scale(.9)}60%{transform:scale(1.03)}100%{opacity:1;transform:none}}",
    "@keyframes fcSpin{to{transform:rotate(360deg)}}",
    "@keyframes fcAurora{0%{transform:translate3d(0,0,0) scale(1)}50%{transform:translate3d(-30px,24px,0) scale(1.15)}100%{transform:translate3d(0,0,0) scale(1)}}",
    "@media(prefers-reduced-motion:no-preference){",
    ".vin>*{animation:fcUp .55s cubic-bezier(.2,.8,.2,1) both}",
    ".lv:not(.off) i{animation:fcPulse 1.7s ease-out infinite}",
    ".plz{opacity:1!important;background:linear-gradient(90deg,var(--s1) 25%,var(--s2) 50%,var(--s1) 75%);background-size:300% 100%;animation:fcShimmer 1.5s linear infinite}",
    ".sheet{transform:translateY(36px) scale(.985);transition:transform .45s cubic-bezier(.2,.9,.25,1),opacity .3s}.sheet.show{transform:none}",
    "#drawer{transition:transform .42s cubic-bezier(.2,.9,.25,1)}#scrim{-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);transition:opacity .35s}",
    "body.dro .ns>*{animation:fcIn .45s cubic-bezier(.2,.8,.2,1) both}",
    ".fc-pop{animation:fcPop .5s cubic-bezier(.2,.9,.25,1) both}",
    "}",
    /* كارت الصدارة */
    ".hero{overflow:hidden;border:0;color:#0B0F19;background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 92%,#fff),color-mix(in srgb,var(--ac) 45%,#6D5BF0))}",
    ".hero:after{content:'';position:absolute;inset:auto -40px -60px auto;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.22)}",
    ".hero .k{color:rgba(11,15,25,.72);font-weight:500}.hero .hr{display:flex;justify-content:space-between;align-items:flex-end;gap:10px;margin-top:6px;position:relative;z-index:1}",
    ".hero .hn{font-size:24px;font-weight:600}.hero .hb{font-size:56px;font-weight:700;line-height:1}",
    ".hero .hg{display:inline-block;margin-top:10px;padding:5px 12px;border-radius:99px;background:rgba(11,15,25,.14);font-size:13px;font-weight:500;position:relative;z-index:1}",
    /* سحب للتحديث */
    "#ptr{position:fixed;top:calc(8px + var(--safe-t));left:50%;width:40px;height:40px;margin-left:-20px;border-radius:50%;background:var(--s1);border:1px solid var(--ln);display:grid;place-items:center;z-index:30;opacity:0;pointer-events:none;box-shadow:0 8px 20px rgba(0,0,0,.2);color:var(--act)}",
    "#ptr.spin svg{animation:fcSpin .8s linear infinite}",
    /* كل الأقسام */
    ".ls-h{font-size:13px;font-weight:500;color:var(--mu);margin:20px 4px 10px}",
    ".ls-g{display:grid;grid-template-columns:1fr 1fr;gap:10px}",
    ".ls-t{display:flex;flex-direction:column;gap:6px;align-items:flex-start;text-align:start;min-height:112px;padding:14px;border-radius:20px;border:1px solid var(--ln);background:var(--s1);box-shadow:var(--sh)}",
    ".ls-t i{width:40px;height:40px;border-radius:13px;display:grid;place-items:center;background:color-mix(in srgb,var(--ac) 22%,transparent);color:var(--act)}",
    ".ls-t b{font-size:15px;font-weight:600}.ls-t small{font-size:12px;color:var(--mu);line-height:1.4}",
    ".ls-t.on{border-color:var(--ac)}",
    ".sk-t{display:flex;gap:14px;align-items:center;width:100%;padding:12px;border-radius:18px;border:1.5px solid var(--ln);background:var(--s1);margin-top:10px;text-align:start}",
    ".sk-t.on{border-color:var(--ac)}.sk-p{display:flex;width:84px;height:56px;border-radius:12px;overflow:hidden;flex:none;border:1px solid rgba(128,128,128,.25)}.sk-p span{flex:1}",
    /* جولة تعريفية */
    "#tour{position:fixed;inset:0;z-index:90;display:grid;place-items:end center;padding:16px;background:rgba(4,6,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
    "#tour .tc{width:min(420px,100%);padding:24px 22px 18px;border-radius:26px;background:var(--s1);border:1px solid var(--ln);box-shadow:0 24px 60px rgba(0,0,0,.4)}",
    "#tour .ti{width:64px;height:64px;border-radius:20px;display:grid;place-items:center;background:var(--ac);color:#0B0F19;margin-bottom:14px}",
    "#tour h3{margin:0 0 6px;font-size:20px;font-weight:600}#tour p{margin:0;color:var(--mu);line-height:1.7}",
    "#tour .td{display:flex;gap:6px;margin:18px 0 14px}#tour .td i{height:6px;flex:1;border-radius:9px;background:var(--s3)}#tour .td i.on{background:var(--ac)}",
    "#tour .tr{display:flex;gap:10px}#tour .tr button{flex:1}",
    /* ---- النيون ---- */
    "html[data-skin=neon]{--bg:#0A0E18;--s1:#111A33;--s2:#17234A;--s3:#1E2D5A;--ln:#26345F;--tx:#EEF2FF;--mu:#8E98B5;--dr:#0C1326;--r:20px;--sh:none;--scrim:rgba(3,5,12,.7)}",
    "html[data-skin=neon] body{background:radial-gradient(520px 340px at 92% -70px,rgba(184,243,75,.15),transparent),radial-gradient(440px 380px at -12% 62%,rgba(99,102,241,.2),transparent),#0A0E18;background-attachment:fixed}",
    "html[data-skin=neon] .cd{background:linear-gradient(180deg,rgba(255,255,255,.07),rgba(255,255,255,.025)),var(--s1);border-color:rgba(255,255,255,.09)}",
    "html[data-skin=neon] .bar{background:rgba(10,14,24,.72)}",
    /* ---- الدهبي ---- */
    "html[data-skin=gold]{--bg:#0A0907;--s1:#14110A;--s2:#1C170D;--s3:#251F10;--ln:#3A3015;--tx:#F3EBD3;--mu:#BBA25A;--dr:#0E0C07;--r:18px;--sh:none;--scrim:rgba(5,4,2,.72)}",
    "html[data-skin=gold] body{background:radial-gradient(520px 320px at 85% -60px,rgba(212,175,55,.16),transparent),#0A0907;background-attachment:fixed}",
    "html[data-skin=gold] .cd{border-color:#3A3015;background:linear-gradient(180deg,rgba(212,175,55,.06),transparent),var(--s1)}",
    "html[data-skin=gold] .bar{background:rgba(10,9,7,.78);border-bottom-color:#3A3015}",
    "html[data-skin=gold] .hero{color:#14110A;background:linear-gradient(135deg,#F6E3A1,#C9A02C)}",
    /* ---- الغروب ---- */
    "html[data-skin=sunset]{--bg:#FFF7F3;--s1:#fff;--s2:#FCEEF2;--s3:#F7E3EA;--ln:#F3DDE5;--tx:#2B1B2E;--mu:#8C6F86;--dr:#fff;--r:22px;--sh:0 8px 24px rgba(214,70,110,.10);--scrim:rgba(43,27,46,.45)}",
    "html[data-skin=sunset] .bar{background:linear-gradient(150deg,#FF8A3D,#F0467A 55%,#7B4DFF);border-bottom:0;color:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}",
    "html[data-skin=sunset] .bar .ib,html[data-skin=sunset] .bar h1{color:#fff}",
    "html[data-skin=sunset] .hero{color:#fff;background:linear-gradient(150deg,#FF8A3D,#F0467A 55%,#7B4DFF)}",
    "html[data-skin=sunset] .hero .k{color:rgba(255,255,255,.85)}html[data-skin=sunset] .hero .hg{background:rgba(255,255,255,.22)}",
    /* ---- الملعب ---- */
    "html[data-skin=pitch]{--bg:#F2F6F1;--s1:#fff;--s2:#E9F1E8;--s3:#DDE9DC;--ln:#DCE6DA;--tx:#10231A;--mu:#5B6F63;--dr:#fff;--r:20px;--sh:0 6px 20px rgba(16,35,26,.07);--scrim:rgba(16,35,26,.45)}",
    "html[data-skin=pitch] .bar{background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 44px,transparent 44px 88px),linear-gradient(160deg,#22A35A,#0E6B3B);border-bottom:0;color:#fff;-webkit-backdrop-filter:none;backdrop-filter:none}",
    "html[data-skin=pitch] .bar .ib,html[data-skin=pitch] .bar h1{color:#fff}",
    "html[data-skin=pitch] .hero{color:#fff;background:repeating-linear-gradient(90deg,rgba(255,255,255,.06) 0 44px,transparent 44px 88px),linear-gradient(160deg,#22A35A,#0E6B3B)}",
    "html[data-skin=pitch] .hero .k{color:rgba(255,255,255,.85)}html[data-skin=pitch] .hero .hg{background:rgba(255,255,255,.2)}",
    /* أورورا النيون (حركة هادية، بتتوقف لو الجهاز طالب تقليل الحركة) */
    "@media(prefers-reduced-motion:no-preference){html[data-skin=neon] body:before{content:'';position:fixed;z-index:-1;width:320px;height:320px;top:40%;left:-120px;border-radius:50%;background:radial-gradient(circle,rgba(99,102,241,.28),transparent 70%);animation:fcAurora 14s ease-in-out infinite;pointer-events:none}}"
  ];
  (function () {
    var delay = "";
    for (var i = 1; i <= 14; i++) delay += ".vin>*:nth-child(" + i + "){animation-delay:" + (i * 45) + "ms}body.dro .ns>*:nth-child(" + i + "){animation-delay:" + (i * 35) + "ms}";
    var st = document.createElement("style"); st.id = "uiCss";
    st.textContent = CSS.join("\n") + "\n@media(prefers-reduced-motion:no-preference){" + delay + "}";
    document.head.appendChild(st);
  })();

  /* ---------- دخول الصفحات + عدّاد الأرقام ---------- */
  var lastKey = "", animT0 = 0, clr = 0;
  function countUp(el) {
    var txt = (el.textContent || "").trim();
    if (!/^[+-]?\d+(\.\d+)?$/.test(txt) || el.getAttribute("data-cu")) return;
    el.setAttribute("data-cu", "1");
    var to = parseFloat(txt), dec = (txt.split(".")[1] || "").length, sign = txt.charAt(0) === "+" ? "+" : "", t0 = performance.now(), dur = 750;
    (function step(now) {
      var p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3), v = to * e;
      el.textContent = p >= 1 ? txt : (sign && v > 0 ? sign : "") + v.toFixed(dec);
      if (p < 1) requestAnimationFrame(step);
    })(t0);
  }
  function countAll(scope) {
    if (RM) return;
    var els = $$("#view .tile b,#view .hs b.n,#view .sc,#view .hb,#view .plus-tiles b", scope), n = 0;
    els.forEach(function (el) { if (n++ < 60) countUp(el); });
  }
  function enter() {
    var v = $("#view"); if (!v) return;
    var key = S.tab + "|" + S.gw + "|" + (S.D ? 1 : 0), now = Date.now();
    v.classList.remove("vin", "vin0");
    if (key !== lastKey) {
      lastKey = key; animT0 = now;
      if (!RM) { void v.offsetWidth; v.classList.add("vin"); countAll(); clearTimeout(clr); clr = setTimeout(function () { v.classList.remove("vin"); }, 1500); }
    } else if (now - animT0 < 1400) {
      v.classList.add("vin0");
    } else if (!RM) {
      /* تحديث عادي (لايف): من غير إعادة حركة */
      $$("#view [data-cu]").forEach(function () {});
    }
  }
  /* الكروت اللي بتتبني بالتدريج بتاخد عدّاد الأرقام بس لو لسه جوه فترة الدخول */
  if (window.MutationObserver) {
    var pend = 0;
    new MutationObserver(function () {
      if (pend || RM || Date.now() - animT0 > 2600) return;
      pend = requestAnimationFrame(function () { pend = 0; countAll(); });
    }).observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- كارت الصدارة في الملخص ---------- */
  function hero() {
    var v = $("#view");
    if (!v || S.tab !== "overview" || !S.D || $("#vhero")) return;
    var wm = WM(), T = {}, cap = S.F.capTeam;
    wm.forEach(function (m) { var k = cap && m.isCaptain ? (m.capMult || 1) : 1; T[m.team] = (T[m.team] || 0) + num(m.d && m.d.net) * k; });
    var L = Object.keys(T).map(function (k) { return { t: k, v: T[k] }; }).sort(function (a, b) { return b.v - a.v; });
    if (!L.length) return;
    var gap = L.length > 1 ? L[0].v - L[1].v : 0;
    var html = '<div class="cd hero" id="vhero"><div class="k">الجولة ' + (S.gw || "–") + (S.D.live ? " · لايف" : "") + ' · صدارة التيمات</div>' +
      '<div class="hr"><b class="hn">' + esc(L[0].t) + '</b><b class="n hb">' + L[0].v + '</b></div>' +
      (L.length > 1 ? '<span class="hg">+' + gap + ' على ' + esc(L[1].t) + '</span>' : '') + '</div>';
    v.insertAdjacentHTML("afterbegin", html);
  }
  function num(x) { return Number(x) || 0; }

  /* ---------- كل الأقسام ---------- */
  var ICONS = {
    grid: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z"/>',
    users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 19c.6-3.2 3-5 6-5s5.4 1.8 6 5M16 5.2a3.2 3.2 0 0 1 0 5.6M18 14.4c1.7.6 2.7 2.2 3 4.6"/>',
    shield: '<path d="M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6z"/>',
    ball: '<circle cx="12" cy="12" r="9"/><path d="M12 7l4 3-1.5 4.5h-5L8 10zM12 3v4M20 10l-4 .1M17.5 19l-3-4.5M6.5 19l3-4.5M4 10l4 .1"/>',
    swap: '<path d="M7 7h11l-3-3M17 17H6l3 3"/>',
    chart: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
    cal: '<rect x="3.5" y="5" width="17" height="15" rx="3"/><path d="M8 3v4M16 3v4M3.5 10h17"/>',
    vs: '<path d="M4 6l5 12 3-7 3 7 5-12"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
    cam: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>',
    sync: '<path d="M21 12a9 9 0 1 1-3-6.7L21 8M21 3v5h-5"/>',
    brush: '<path d="M18 3l3 3-9 9-3-3zM9 15c-3 0-4 2-4 4 0 1-1 2-2 2 4 1 9 0 9-5"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.4-1 .9-1 1.7M12 17h.01"/>',
    wa: '<path d="M4 20l1.3-4A8 8 0 1 1 8 18.8z"/>',
    wi: '<path d="M12 3v3M12 18v3M3 12h3M18 12h3M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>'
  };
  function svg(n, s) { return '<svg width="' + (s || 22) + '" height="' + (s || 22) + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICONS[n] + "</svg>"; }
  var META = {
    overview: ["grid", "الصورة الكاملة للجولة"], members: ["users", "ترتيب كل واحد وتفاصيله"], teams: ["shield", "الفرق ونقاطها"], players: ["ball", "اللاعيبة ومين اشتراهم"],
    transfers: ["swap", "مين اشترى ومين باع"], plus: ["chart", "تحليلات وتشكيلات وجوايز"], season_t: ["cal", "الموسم كله للتيمات"], season_m: ["cal", "الموسم كله لكل عضو"], cmp: ["vs", "قارن فريقين لايف"]
  };
  var GROUPS = [["الأساسيات", ["overview", "members", "teams", "players", "transfers"]], ["التحليلات والموسم", ["plus", "season_t", "season_m"]]];
  function lbl(b) {
    var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), n;
    while ((n = w.nextNode())) { var t = n.textContent.trim(); if (t) return t; }
    return b.getAttribute("data-tab");
  }
  function openAll() {
    var seen = {}, tabs = [];
    $$("#drawer [data-tab]").forEach(function (b) { var id = b.getAttribute("data-tab"); if (!seen[id]) { seen[id] = 1; tabs.push({ id: id, name: lbl(b) }); } });
    var byId = {}; tabs.forEach(function (t) { byId[t.id] = t; });
    var used = {}, h = "";
    var tile = function (t) {
      var m = META[t.id] || ["grid", ""];
      return '<button class="ls-t' + (S.tab === t.id ? " on" : "") + '" data-ltab="' + esc(t.id) + '"><i>' + svg(m[0]) + "</i><b>" + esc(t.name) + "</b><small>" + esc(m[1]) + "</small></button>";
    };
    GROUPS.forEach(function (g) {
      var L = g[1].filter(function (id) { return byId[id]; }).map(function (id) { used[id] = 1; return tile(byId[id]); });
      if (L.length) h += '<div class="ls-h">' + g[0] + '</div><div class="ls-g">' + L.join("") + "</div>";
    });
    var rest = tabs.filter(function (t) { return !used[t.id]; }).map(tile);
    if (rest.length) h += '<div class="ls-h">مقارنات وأقسام تانية</div><div class="ls-g">' + rest.join("") + "</div>";
    var tool = function (a, ic, name, sub) { return '<button class="ls-t" data-lact="' + a + '"><i>' + svg(ic) + "</i><b>" + name + "</b><small>" + sub + "</small></button>"; };
    h += '<div class="ls-h">أدوات سريعة</div><div class="ls-g">' +
      tool("search", "search", "بحث سريع", "عن لاعب أو عضو أو تيم") + tool("filters", "filter", "الفلاتر", "المجموعة والمسابقة وكابتن التيم") +
      tool("cmp2", "vs", "مقارنة عضوين", "ابحث وقارن أكتر من اتنين") + tool("wi", "wi", "ماذا لو", "جرّب نقاط مختلفة") +
      tool("wa", "wa", "ملخص للواتساب", "نص جاهز تبعته") + tool("cam", "cam", "تصوير الصفحة", "صورة كاملة للي قدامك") +
      tool("refresh", "sync", "تحديث اللايف", "هات آخر النقاط") + tool("skin", "brush", "الشكل", "غيّر ألوان التطبيق") + tool("tour", "help", "جولة سريعة", "اتعرف على التطبيق في دقيقة") + "</div>";
    F.push("كل الأقسام", h, "launcher");
  }
  function openSkins() {
    var cur = LS.get("fc_skin") || "classic";
    var h = '<p class="mut" style="margin:6px 4px 0">اختار الشكل اللي يريحك. الدارك واللايت والألوان لسه شغالين من القايمة.</p>';
    Object.keys(SKINS).forEach(function (k) {
      var s = SKINS[k];
      h += '<button class="sk-t' + (cur === k ? " on" : "") + '" data-skinpick="' + k + '"><span class="sk-p">' + s.sw.map(function (c) { return '<span style="background:' + c + '"></span>'; }).join("") + '</span><span><b style="font-weight:600;font-size:15px">' + s.name + '</b><br><small class="mut">' + s.sub + "</small></span></button>";
    });
    F.push("الشكل", h, "skin");
  }
  function closeSheets() { while (S.stack.length) S.stack.pop(); F.paintSheet(); }
  function runAct(a) {
    closeSheets();
    setTimeout(function () {
      if (a === "search") F.openSearch();
      else if (a === "filters") F.openFilters();
      else if (a === "cmp2") { if (R.cmp2) R.cmp2(); }
      else if (a === "wi" || a === "wa") { var b = $('[data-plus="' + a + '"]'); if (b) b.click(); else { F.setTab("plus"); F.toast("افتح التحليلات واضغط الزرار"); } }
      else if (a === "cam") { var c = $("#cp"); if (c) c.click(); }
      else if (a === "refresh") { var r = $("#rf"); if (r) r.click(); }
      else if (a === "skin") openSkins();
      else if (a === "tour") startTour();
    }, 60);
  }

  /* ---------- جولة تعريفية ---------- */
  var STEPS = [
    ["grid", "أهلاً بيك في مركز الفانتازي", "كل أرقام الجولة والترتيب والتحليلات في مكان واحد، ومن غير تعقيد. هنعدّي على أهم حاجات في دقيقة."],
    ["users", "القايمة الجانبية", "الزرار اللي فوق في الركن بيفتح القايمة: الأعضاء، التيمات، اللاعيبة، التحويلات، والتحليلات."],
    ["grid", "كل الأقسام", "الزرار ده فوق بيفتحلك كل حاجة في شاشة واحدة بأزرار كبيرة وشرح بسيط لكل قسم."],
    ["filter", "الفلاتر", "من زرار الفلاتر اختار مجموعتك ومسابقتك، وشغّل أو اقفل كابتن التيم، وكل الأرقام بتتغير على طول."],
    ["cam", "التصوير", "أي كارت أو جدول عليه كاميرا بتطلع منه صورة جاهزة تبعتها، وصور اللعيبة بتظهر فيها."]
  ];
  var ti = 0;
  function tourHtml() {
    var s = STEPS[ti], last = ti === STEPS.length - 1;
    return '<div class="tc fc-pop"><div class="ti">' + svg(s[0], 30) + "</div><h3>" + s[1] + "</h3><p>" + s[2] + '</p><div class="td">' + STEPS.map(function (x, i) { return '<i class="' + (i <= ti ? "on" : "") + '"></i>'; }).join("") +
      '</div><div class="tr"><button class="btn b2" data-tour="skip">' + (last ? "إغلاق" : "تخطي") + '</button><button class="btn b1" data-tour="next">' + (last ? "يلا نبدأ" : "التالي") + "</button></div></div>";
  }
  function startTour() { ti = 0; var d = $("#tour"); if (!d) { d = document.createElement("div"); d.id = "tour"; document.body.appendChild(d); } d.innerHTML = tourHtml(); }
  function endTour() { var d = $("#tour"); if (d) d.remove(); LS.set("fc_tour", "1"); }

  /* ---------- سحب للتحديث ---------- */
  (function () {
    var p = document.createElement("div"); p.id = "ptr"; p.innerHTML = svg("sync", 20); document.body.appendChild(p);
    var y0 = null, dy = 0, busy = false;
    function ok(t) { return !t.closest(".tbl-sc,.tw,.sg,.chips,.pgs,input,textarea") && !$("#sheet.show") && !document.body.classList.contains("dro") && (window.scrollY || document.documentElement.scrollTop) <= 0; }
    document.addEventListener("touchstart", function (e) { y0 = (!busy && ok(e.target)) ? e.touches[0].clientY : null; dy = 0; }, { passive: true });
    document.addEventListener("touchmove", function (e) {
      if (y0 == null) return;
      dy = e.touches[0].clientY - y0;
      if (dy <= 0) { p.style.opacity = 0; return; }
      var k = Math.min(dy, 110);
      p.style.opacity = Math.min(1, k / 70); p.style.transform = "translateY(" + (k * 0.55) + "px) rotate(" + (k * 3) + "deg)";
    }, { passive: true });
    document.addEventListener("touchend", function () {
      if (y0 == null) return;
      var go = dy > 85; y0 = null;
      if (go) {
        busy = true; p.classList.add("spin"); p.style.opacity = 1; p.style.transform = "translateY(50px)";
        var r = $("#rf"); if (r) r.click();
        setTimeout(function () { busy = false; p.classList.remove("spin"); p.style.opacity = 0; p.style.transform = ""; }, 1400);
      } else { p.style.opacity = 0; p.style.transform = ""; }
    }, { passive: true });
  })();

  /* ---------- ربط الهوكس ---------- */
  var bar = $(".bar");
  if (bar && $("#cp") && !$("#all")) $("#cp").insertAdjacentHTML("beforebegin", '<button class="ib" id="all" aria-label="كل الأقسام">' + svg("grid") + "</button>");

  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var ns = $("#drawer .ns");
    if (ns && !$("#skn")) ns.insertAdjacentHTML("beforeend", '<button class="tl" id="skn">' + svg("brush", 20) + ' الشكل (نيون، ذهبي، غروب...)</button><button class="tl" id="tourb">' + svg("help", 20) + " جولة سريعة في التطبيق</button>");
    hero();
    enter();
    if (S.D && !LS.get("fc_tour") && !$("#tour")) setTimeout(function () { if (!LS.get("fc_tour") && !$("#tour")) startTour(); }, 900);
  };

  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var t = e.target, b;
    if (t.closest("#all")) { if (S.D) openAll(); else F.toast("استنى لحد ما البيانات تتحمّل"); return true; }
    if (t.closest("#skn")) { document.body.classList.remove("dro"); openSkins(); return true; }
    if (t.closest("#tourb")) { document.body.classList.remove("dro"); startTour(); return true; }
    if ((b = t.closest("[data-ltab]"))) { var id = b.getAttribute("data-ltab"); closeSheets(); F.setTab(id); return true; }
    if ((b = t.closest("[data-lact]"))) { runAct(b.getAttribute("data-lact")); return true; }
    if ((b = t.closest("[data-skinpick]"))) { chooseSkin(b.getAttribute("data-skinpick")); closeSheets(); return true; }
    if ((b = t.closest("[data-tour]"))) {
      if (b.getAttribute("data-tour") === "skip" || ti >= STEPS.length - 1) endTour();
      else { ti++; var d = $("#tour"); if (d) d.innerHTML = tourHtml(); }
      return true;
    }
    return false;
  };

  /* لمسة اهتزاز خفيفة على الأزرار (أندرويد) */
  document.addEventListener("click", function (e) { if (navigator.vibrate && e.target.closest && e.target.closest("button,.tb,.cd.act")) { try { navigator.vibrate(6); } catch (x) {} } }, true);
})();
