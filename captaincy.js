/* captaincy.js - تبويب "كبتنة التيمات" (كل تبويب سكربت مستقل)
   الطريقة من سكربت Costa Fantasy: التيم يختار نفسه ويختار الكابتن ويكتب الباسورد ويأكد، ولوحة الكباتن بالمجموعات
   والتيمات اللي لسه ماكبتنتش. الإضافة هنا: الكبتنة جولة بجولة وبتتحسب تلقائي ×2/×3 في نقاط التيم.
   الباك إند: Captain.gs (?api=capInfo / capSave / capLock / capInit / capClear). الأدمن بيستخدم ADMIN_KEY. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc;
  var ROOT = document.createElement("div"); ROOT.id = "capRoot";
  var ST = { info: null, err: "", loading: false, team: "", sel: {}, pwd: "", show: false, grp: "__all", sk: "team", sd: 1, admin: "", busy: false, off: 0, armed: false };
  var wasCap = false, tmr = 0;

  (function () {
    var st = document.createElement("style"); st.id = "capCss";
    st.textContent =
      "#capRoot .cp-st{position:relative;overflow:hidden;padding:20px;border:0;color:#0B0F19;background:linear-gradient(135deg,color-mix(in srgb,var(--ac) 92%,#fff),color-mix(in srgb,var(--ac) 45%,#6D5BF0))}" +
      "#capRoot .cp-st:after{content:'';position:absolute;inset:auto -40px -60px auto;width:180px;height:180px;border-radius:50%;background:rgba(255,255,255,.22)}" +
      "#capRoot .cp-st .k{font-size:13px;font-weight:500;color:rgba(11,15,25,.72)}" +
      "#capRoot .cp-hr{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:6px;position:relative;z-index:1}" +
      "#capRoot .cp-hn{font-size:28px;font-weight:700}" +
      "#capRoot .cp-chip{display:inline-flex;align-items:center;padding:5px 12px;border-radius:99px;font-size:12.5px;font-weight:600}" +
      "#capRoot .cp-chip.ok{background:rgba(11,15,25,.85);color:#B8F34B}#capRoot .cp-chip.no{background:rgba(11,15,25,.85);color:#FF8A8A}" +
      "#capRoot .cp-chip.ac{background:color-mix(in srgb,var(--ac) 22%,transparent);color:var(--act)}" +
      "#capRoot .cp-cd{display:inline-block;margin-top:10px;padding:5px 12px;border-radius:99px;background:rgba(11,15,25,.14);font-size:13px;font-weight:500;position:relative;z-index:1}" +
      "#capRoot .cp-adm{position:absolute;top:14px;inset-inline-end:14px;z-index:2}" +
      "#capRoot .cp-step{font-size:13px;font-weight:600;color:var(--act);margin:16px 0 8px;display:flex;align-items:center;gap:8px}" +
      "#capRoot .cp-step i{width:22px;height:22px;border-radius:7px;background:var(--ac);color:#0B0F19;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}" +
      "#capRoot .cp-in{width:100%;height:48px;padding:0 14px;border-radius:14px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:15px;outline:none}" +
      "#capRoot .cp-in:focus{border-color:var(--ac)}" +
      "#capRoot .cp-pw{position:relative}#capRoot .cp-pw .cp-in{padding-inline-end:48px}" +
      "#capRoot .cp-eye{position:absolute;top:50%;inset-inline-end:8px;transform:translateY(-50%);width:34px;height:34px;border:0;border-radius:10px;background:transparent;color:var(--mu);display:grid;place-items:center;cursor:pointer}" +
      "#capRoot .cp-blk{margin-top:12px;padding:12px;border-radius:16px;border:1px solid var(--ln);background:var(--s2)}" +
      "#capRoot .cp-bh{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}" +
      "#capRoot .cp-note{font-size:12.5px;color:var(--mu);margin-bottom:8px}#capRoot .cp-note b{color:var(--tx)}" +
      "#capRoot .cp-mem{display:flex;flex-wrap:wrap;gap:8px}" +
      "#capRoot .cp-m{min-height:42px;padding:8px 14px;border-radius:12px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:14px;cursor:pointer;transition:transform .15s,background-color .2s,border-color .2s}" +
      "#capRoot .cp-m:active{transform:scale(.96)}#capRoot .cp-m.on{background:var(--ac);border-color:var(--ac);color:#0B0F19;font-weight:600}" +
      "#capRoot .cp-msg{margin-top:14px;padding:11px 14px;border-radius:12px;font-size:13.5px;font-weight:500}" +
      "#capRoot .cp-msg.ok{background:color-mix(in srgb,#17d67e 16%,transparent);border:1px solid #17d67e}" +
      "#capRoot .cp-msg.no{background:color-mix(in srgb,#ff3b5c 14%,transparent);border:1px solid #ff3b5c}" +
      "#capRoot .cp-tabs{display:flex;gap:8px;overflow-x:auto;padding:2px 0 10px;scrollbar-width:none}#capRoot .cp-tabs::-webkit-scrollbar{display:none}" +
      "#capRoot .cp-tab{flex:none;padding:8px 16px;border-radius:99px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:13px;font-weight:500;cursor:pointer}" +
      "#capRoot .cp-tab.on{background:var(--ac);border-color:var(--ac);color:#0B0F19;font-weight:600}" +
      "#capRoot .cp-tb th{cursor:pointer;white-space:nowrap}#capRoot .cp-tb td.cp-c{font-weight:600;color:var(--act)}" +
      "#capRoot .cp-hint{font-size:12px;color:var(--mu);margin-top:8px}" +
      "#capAdm{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:20px;background:rgba(4,6,12,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}" +
      "#capAdm .tc{width:min(360px,100%);padding:22px;border-radius:24px;background:var(--s1);border:1px solid var(--ln);box-shadow:0 24px 60px rgba(0,0,0,.4)}" +
      "#capAdm h3{margin:0 0 12px;font-size:18px;font-weight:600}#capAdm .cp-in{margin-bottom:10px}" +
      "#capAdm .ab{display:grid;gap:8px;margin-top:6px}";
    document.head.appendChild(st);
  })();

  /* ---------- أدوات ---------- */
  function q(sel) { return ROOT.querySelector(sel); }
  function eyeSvg(off) {
    return '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      (off ? '<path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c5 0 8.5 4.5 9.5 6a14 14 0 0 1-3 3.4M6.5 7.6C4.4 9 3 11 2.5 12c1 1.5 4.5 6 9.5 6 1.4 0 2.700-.3 3.800-.9"/>' : '<path d="M2.5 12C3.500 10.500 7 6 12 6s8.500 4.500 9.500 6c-1 1.500-4.500 6-9.500 6S3.500 13.500 2.500 12z"/><circle cx="12" cy="12" r="3"/>') + "</svg>";
  }
  function teamsList() {
    var seen = {}, out = [];
    ((ST.info && ST.info.teams) || []).forEach(function (e) { if (!seen[e.team]) { seen[e.team] = 1; out.push(e.team); } });
    return out.sort(function (a, b) { return a.localeCompare(b, "ar"); });
  }
  function teamEls() { return ((ST.info && ST.info.teams) || []).filter(function (e) { return e.team === ST.team; }); }
  function pickMap() { var m = {}; ((ST.info && ST.info.picks) || []).forEach(function (x) { m[x.team + "|" + x.contest] = x; }); return m; }
  function findTeam(txt) {
    txt = (txt || "").trim().toLowerCase(); if (!txt) return "";
    var L = teamsList(), hit = "", part = [];
    L.forEach(function (t) { var l = t.toLowerCase(); if (l === txt) hit = t; else if (l.indexOf(txt) > -1) part.push(t); });
    return hit || (part.length === 1 ? part[0] : "");
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function now() { return Date.now() + ST.off; }

  /* ---------- الرسم ---------- */
  function statusHtml() {
    var I = ST.info;
    var open = I.gw && !I.locked;
    return '<div class="cd cp-st"><div class="k">كبتنة التيمات</div><div class="cp-hr"><b class="cp-hn">' + (I.gw ? "الجولة " + I.gw : "مفيش جولة جاية") + '</b><span class="cp-chip ' + (open ? "ok" : "no") + '">' + (open ? "مفتوحة" : "مقفولة") + '</span></div><div class="cp-cd" id="capCd"></div><button class="chip cp-adm" data-capact="admin">إدارة</button></div>';
  }
  function formHtml() {
    var I = ST.info, dis = I.locked || !I.gw;
    return '<div class="cd" style="margin-top:12px"><div class="ct">اكبتن تيمك</div>' +
      (I.locked ? '<div class="cp-msg no" style="margin:0 0 6px">الكبتنة مقفولة حاليًا. هتتفتح لما الأدمن يفتحها للجولة الجاية.</div>' : "") +
      (I.autoFrom > 0 && I.gw >= I.autoFrom ? '<div class="cp-hint" style="margin:0 0 4px">التيم اللي مايكبتنش قبل الديدلاين، كابتنه بيبقى تلقائي أضعف عضو عنده في الجولة.</div>' : "") +
      '<div class="cp-step"><i>1</i>اختار تيمك</div>' + teamPicker() +
      '<div class="cp-step"><i>2</i>اختار الكابتن</div><div id="capBlocks">' + blocksHtml() + "</div>" +
      '<div class="cp-step"><i>3</i>باسورد التيم</div><div class="cp-pw"><input class="cp-in" id="capPwd" type="' + (ST.show ? "text" : "password") + '" placeholder="اكتب باسورد التيم" autocomplete="off"><button type="button" class="cp-eye" data-capeye aria-label="إظهار أو إخفاء الباسورد">' + eyeSvg(ST.show) + "</button></div>" +
      '<button class="btn b1" id="capSave" data-capsave style="width:100%;margin-top:16px"' + (dis ? " disabled" : "") + ">تأكيد الكبتنة</button>" +
      '<div id="capMsg"></div>' + (I.noPassword ? '<div class="cp-hint">فيه ' + I.noPassword + " تيم لسه ملوش باسورد (الأدمن يضغط إدارة ثم تجهيز الباسوردات).</div>" : "") + "</div>";
  }
  /* اختيار التيم: قايمة منسدلة فيها بحث (من welcome.js)، ولو مش موجودة بنرجع للحقل العادي */
  function teamPicker() {
    var SD = window.__sdrop;
    if (!SD) return '<input class="cp-in" id="capTeamIn" list="capTeams" placeholder="ابحث عن اسم التيم..." autocomplete="off"><datalist id="capTeams">' + teamsList().map(function (t) { return '<option value="' + esc(t) + '"></option>'; }).join("") + "</datalist>";
    return SD.html("capTeam", {
      ph: "ابحث واختار تيمك...", value: ST.team,
      options: function () {
        var seen = {}, L = [];
        ((ST.info && ST.info.teams) || []).forEach(function (e) { if (!seen[e.team]) { seen[e.team] = 1; L.push({ v: e.team, l: e.team, t: e.group || "" }); } });
        return L.sort(function (a, b) { return a.l.localeCompare(b.l, "ar"); });
      },
      onPick: function (v) { ST.team = v; seedSel(); drawBlocks(); msg("", true); }
    });
  }
  function blocksHtml() {
    if (!ST.team) return '<p class="mut" style="margin:0">اختار تيمك الأول.</p>';
    var els = teamEls(), P = pickMap();
    if (!els.length) return '<p class="mut" style="margin:0">التيم ده مفيهوش مسابقة فيها كابتن.</p>';
    return els.map(function (e) {
      var saved = P[e.team + "|" + e.contest], cur = ST.sel[e.contest];
      return '<div class="cp-blk"><div class="cp-bh"><b>' + esc(e.contest || "المسابقة") + '</b><span class="cp-chip ac">' + esc(e.capType) + " ×" + e.capMult + "</span></div>" +
        (saved ? '<div class="cp-note">الكابتن الحالي: <b>' + esc(saved.person) + "</b> · " + esc(saved.time) + "</div>" : '<div class="cp-note">لسه ماكبتنتش في المسابقة دي.</div>') +
        '<div class="cp-mem">' + e.members.map(function (m) {
          return '<button type="button" class="cp-m' + (cur === m.entryId ? " on" : "") + '" data-capc="' + esc(e.contest) + '" data-cape="' + esc(m.entryId) + '">' + esc(m.person) + "</button>";
        }).join("") + "</div></div>";
    }).join("");
  }
  function boardRows() {
    var P = pickMap();
    return ST.info.teams.map(function (e) {
      var p = P[e.team + "|" + e.contest];
      return { team: e.team, group: e.group || "", contest: e.contest || "", cap: p ? p.person : "", time: p ? p.time : "", ts: p ? p.ts : 0 };
    });
  }
  function boardHtml() {
    var rows = boardRows(), groups = [], seen = {};
    rows.forEach(function (r) { if (!seen[r.group]) { seen[r.group] = 1; groups.push(r.group); } });
    var left = rows.filter(function (r) { return !r.cap; }).length;
    var tabs = '<button class="cp-tab' + (ST.grp === "__all" ? " on" : "") + '" data-capg="__all">الكل</button>' +
      groups.map(function (g) { return '<button class="cp-tab' + (ST.grp === g ? " on" : "") + '" data-capg="' + esc(g) + '">' + esc(g || "بدون مجموعة") + "</button>"; }).join("") +
      '<button class="cp-tab' + (ST.grp === "__left" ? " on" : "") + '" data-capg="__left">لسه ماكبتنوش (' + left + ")</button>";
    var L = rows.filter(function (r) { return ST.grp === "__all" ? true : ST.grp === "__left" ? !r.cap : r.group === ST.grp; });
    L.sort(function (a, b) {
      var k = ST.sk, x = a[k], y = b[k];
      if (k === "ts") return (x - y) * ST.sd;
      return String(x).localeCompare(String(y), "ar") * ST.sd;
    });
    var arr = function (k) { return ST.sk === k ? (ST.sd > 0 ? " ▲" : " ▼") : ""; };
    var body = L.map(function (r, i) {
      return "<tr><td>" + (i + 1) + "</td><td><b>" + esc(r.team) + "</b></td><td>" + esc(r.contest) + '</td><td class="cp-c">' + (r.cap ? esc(r.cap) : '<span class="mut">–</span>') + "</td><td>" + (r.time ? esc(r.time) : '<span class="mut">–</span>') + "</td></tr>";
    }).join("");
    return F.card("كباتن الجولة " + ST.info.gw,
      '<div class="ct">لوحة الكباتن - الجولة ' + (ST.info.gw || "–") + '</div><div class="cp-tabs">' + tabs + "</div>" +
      '<div class="tbl-sc"><table class="mini-t cp-tb"><thead><tr><th>#</th><th data-caps="team">التيم' + arr("team") + '</th><th data-caps="contest">المسابقة' + arr("contest") + '</th><th data-caps="cap">الكابتن' + arr("cap") + '</th><th data-caps="ts">الوقت' + arr("ts") + "</th></tr></thead><tbody>" +
      (body || '<tr><td colspan="5" class="mut">مفيش نتايج</td></tr>') + "</tbody></table></div>", "plus ov-full");
  }
  function draw() {
    if (ST.err) { ROOT.innerHTML = '<div class="empty">' + esc(ST.err) + '<br><button class="btn b2" data-capact="retry" style="margin-top:12px">حاول تاني</button></div>'; return; }
    if (!ST.info) { ROOT.innerHTML = '<div class="plz" style="min-height:160px"></div><div class="plz" style="min-height:260px"></div>'; return; }
    ROOT.innerHTML = '<div id="capStatus">' + statusHtml() + "</div>" + formHtml() + '<div id="capBoard" style="margin-top:12px">' + boardHtml() + "</div>";
    var ti = q("#capTeamIn"); if (ti) ti.value = ST.team;
    var pw = q("#capPwd"); if (pw) pw.value = ST.pwd;
    tick();
  }
  function drawBoard() { var b = q("#capBoard"); if (b) b.innerHTML = boardHtml(); }
  function drawBlocks() { var b = q("#capBlocks"); if (b) b.innerHTML = blocksHtml(); }
  function drawStatus() { var b = q("#capStatus"); if (b) { b.innerHTML = statusHtml(); tick(); } }
  function msg(text, ok) { var m = q("#capMsg"); if (m) m.innerHTML = text ? '<div class="cp-msg ' + (ok ? "ok" : "no") + '">' + esc(text) + "</div>" : ""; }

  function tick() {
    var el = q("#capCd"), I = ST.info; if (!el || !I) return;
    if (!I.deadline) { el.textContent = ""; return; }
    var left = I.deadline - now();
    if (left <= 0) { el.textContent = "الديدلاين عدّى"; if (!I.locked) { I.locked = true; drawStatus(); var s = q("#capSave"); if (s) s.disabled = true; } return; }
    var d = Math.floor(left / 864e5), h = Math.floor(left % 864e5 / 36e5), m = Math.floor(left % 36e5 / 6e4), s2 = Math.floor(left % 6e4 / 1e3);
    el.textContent = "باقي على الديدلاين " + (d ? d + " يوم " : "") + pad(h) + ":" + pad(m) + ":" + pad(s2);
  }

  /* ---------- بيانات ---------- */
  function load(silent) {
    if (!silent) { ST.loading = true; ST.err = ""; if (!ST.info) draw(); }
    return F.api({ api: "capInfo" }).then(function (r) {
      ST.loading = false;
      if (!r || r.success === false) { ST.err = (r && r.message) || "تعذّر تحميل الكبتنة"; if (!ST.info) draw(); return; }
      ST.err = ""; ST.info = r; ST.off = (r.now || Date.now()) - Date.now();
      if (ST.team && !teamsList().some(function (t) { return t === ST.team; })) ST.team = "";
      draw();
    }).catch(function () { ST.loading = false; if (!ST.info) { ST.err = "تعذّر الاتصال بالسيرفر"; draw(); } });
  }
  function seedSel() {
    ST.sel = {}; var P = pickMap();
    teamEls().forEach(function (e) { var p = P[e.team + "|" + e.contest]; if (p) ST.sel[e.contest] = String(p.entryId); });
  }
  function ping() {
    try {
      var C = window.AudioContext || window.webkitAudioContext; if (!C) return;
      var c = new C(), t0 = c.currentTime;
      [660, 880, 1320].forEach(function (f, i) {
        var o = c.createOscillator(), g = c.createGain(); o.type = "sine"; o.frequency.value = f;
        var t = t0 + i * 0.09; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
        o.connect(g); g.connect(c.destination); o.start(t); o.stop(t + 0.3);
      });
      setTimeout(function () { c.close(); }, 700);
    } catch (e) {}
  }
  function save() {
    if (ST.busy) return;
    if (!ST.team) { msg("اختار تيمك الأول", false); return; }
    var picks = teamEls().filter(function (e) { return ST.sel[e.contest]; }).map(function (e) { return { contest: e.contest, entryId: ST.sel[e.contest] }; });
    if (!picks.length) { msg("اختار الكابتن", false); return; }
    if (!ST.pwd) { msg("اكتب باسورد التيم", false); return; }
    ST.busy = true; var b = q("#capSave"); if (b) { b.disabled = true; b.textContent = "جاري التأكيد..."; }
    F.api({ api: "capSave", team: ST.team, password: ST.pwd, picks: JSON.stringify(picks) }).then(function (r) {
      ST.busy = false;
      if (r && r.success) {
        ST.pwd = ""; ping(); F.toast(r.message);
        if (F.load && r.gw === S.gw) F.load();
        return load(true).then(function () { seedSel(); drawBlocks(); drawBoard(); var pw = q("#capPwd"); if (pw) pw.value = ""; var bb = q("#capSave"); if (bb) { bb.disabled = !!(ST.info && ST.info.locked); bb.textContent = "تأكيد الكبتنة"; } msg(r.message, true); });
      }
      var bb = q("#capSave"); if (bb) { bb.disabled = false; bb.textContent = "تأكيد الكبتنة"; }
      msg((r && r.message) || "تعذّر التأكيد", false);
    }).catch(function () { ST.busy = false; var bb = q("#capSave"); if (bb) { bb.disabled = false; bb.textContent = "تأكيد الكبتنة"; } msg("فشل الاتصال بالسيرفر", false); });
  }

  /* ---------- الكابتن التلقائي ----------
     التيم اللي ماكبتنش في الجولة بيبقى كابتنه أضعف عضو عنده (أقل صافي نقاط، ولو اتساووا بالأقل في الأيدي).
     السيرفر بيعلّم الأعضاء (capAuto) والتطبيق بيختار الأضعف بعد حساب النقاط اللايف، فبيتحدّث مع اللايف. */
  R.afterDerive = function () {
    var D = S.D; if (!D || !D.members) return;
    var G = {};
    D.members.forEach(function (m) {
      if (!m.capAuto) return;
      (G[m.team + "|" + m.contest] = G[m.team + "|" + m.contest] || []).push(m);
      m.isCaptain = false;
    });
    Object.keys(G).forEach(function (k) {
      var L = G[k].filter(function (m) { return m.ok !== false; });
      if (!L.length) L = G[k];
      var low = L[0];
      L.forEach(function (m) {
        var a = Number(m.d && m.d.net) || 0, b = Number(low.d && low.d.net) || 0;
        if (a < b || (a === b && String(m.entryId) < String(low.entryId))) low = m;
      });
      low.isCaptain = true;
    });
  };

  /* ---------- الأدمن ---------- */
  function adminOpen() {
    var d = document.getElementById("capAdm");
    if (!d) { d = document.createElement("div"); d.id = "capAdm"; document.body.appendChild(d); }
    var I = ST.info || {};
    d.innerHTML = '<div class="tc"><h3>إدارة الكبتنة</h3><input class="cp-in" id="capKey" type="password" placeholder="مفتاح الأدمن (ADMIN_KEY)" value="' + esc(ST.admin) + '" autocomplete="off">' +
      '<div class="ab"><button class="btn b1" data-capadm="lock">' + (I.locked ? "فتح الكبتنة" : "قفل الكبتنة") + '</button><button class="btn b2" data-capadm="auto">' + (I.autoFrom > 0 ? "الكابتن التلقائي: شغال من ج" + I.autoFrom + " (اضغط للإيقاف)" : "الكابتن التلقائي: موقوف (اضغط للتشغيل)") + '</button><button class="btn b2" data-capadm="init">تجهيز الباسوردات (يملى الفاضي بأرقام عشوائية)</button>' +
      '<button class="btn b2" data-capadm="clear" id="capClr">تصفير كباتن الجولة ' + (I.gw || "") + '</button><button class="btn b2" data-capadm="close">إغلاق</button></div><div id="capAdmMsg" class="cp-hint"></div></div>';
    ST.armed = false;
  }
  function adminRun(what) {
    var key = (document.getElementById("capKey") || {}).value || ST.admin; ST.admin = key;
    var out = document.getElementById("capAdmMsg"), I = ST.info || {};
    if (what === "close") { var d = document.getElementById("capAdm"); if (d) d.remove(); return; }
    if (!key) { if (out) out.textContent = "اكتب مفتاح الأدمن الأول"; return; }
    if (what === "clear" && !ST.armed) { ST.armed = true; var c = document.getElementById("capClr"); if (c) c.textContent = "اضغط تاني للتأكيد"; return; }
    var p = { key: key };
    if (what === "lock") { p.api = "capLock"; p.locked = I.locked ? 0 : 1; }
    else if (what === "auto") { p.api = "capAuto"; p.from = I.autoFrom > 0 ? "off" : ""; }
    else if (what === "init") p.api = "capInit";
    else { p.api = "capClear"; p.gw = I.gw; }
    if (out) out.textContent = "جاري التنفيذ...";
    F.api(p).then(function (r) {
      if (out) out.textContent = (r && r.message) || "تم";
      ST.armed = false;
      return load(true).then(function () { var d = document.getElementById("capAdm"); if (d) adminOpen(); var o2 = document.getElementById("capAdmMsg"); if (o2 && r) o2.textContent = r.message || "تم"; });
    }).catch(function () { if (out) out.textContent = "فشل الاتصال بالسيرفر"; });
  }

  /* ---------- الأحداث ---------- */
  ROOT.addEventListener("click", function (e) {
    var t = e.target, b;
    if ((b = t.closest("[data-capc]"))) { ST.sel[b.getAttribute("data-capc")] = b.getAttribute("data-cape"); drawBlocks(); return; }
    if ((b = t.closest("[data-capg]"))) { ST.grp = b.getAttribute("data-capg"); drawBoard(); return; }
    if ((b = t.closest("[data-caps]"))) { var k = b.getAttribute("data-caps"); if (ST.sk === k) ST.sd = -ST.sd; else { ST.sk = k; ST.sd = 1; } drawBoard(); return; }
    if (t.closest("[data-capeye]")) { ST.show = !ST.show; var pw = q("#capPwd"); if (pw) pw.type = ST.show ? "text" : "password"; var ey = t.closest("[data-capeye]"); ey.innerHTML = eyeSvg(ST.show); return; }
    if (t.closest("[data-capsave]")) { save(); return; }
    if ((b = t.closest("[data-capact]"))) { var a = b.getAttribute("data-capact"); if (a === "admin") adminOpen(); else if (a === "retry") { ST.err = ""; ST.info = null; load(); } return; }
  });
  ROOT.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "capPwd") ST.pwd = t.value;
    else if (t.id === "capTeamIn") {
      var f = findTeam(t.value);
      if (f && f !== ST.team) { ST.team = f; seedSel(); drawBlocks(); msg("", true); }
      else if (!f && ST.team && !t.value.trim()) { ST.team = ""; ST.sel = {}; drawBlocks(); }
    }
  });
  ROOT.addEventListener("keydown", function (e) { if (e.key === "Enter" && e.target.id === "capPwd") save(); });
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest("[data-capadm]");
    if (b) { adminRun(b.getAttribute("data-capadm")); return; }
    var d = document.getElementById("capAdm");
    if (d && e.target === d) d.remove();
  });

  /* ---------- ربطها بالتطبيق ---------- */
  R.tabs.push({ id: "captain", name: "كبتنة التيمات" });
  var _title = R.title;
  R.title = function (t) { return t === "captain" ? "كبتنة التيمات" : (_title ? _title(t) : null); };
  R.views.captain = function () { return '<div id="capHost"></div>'; };
  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var on = S.tab === "captain";
    if (on) {
      var host = F.$("#capHost");
      if (host) { host.appendChild(ROOT); if (!wasCap) { if (ST.info) { draw(); load(true); } else load(); } }
      if (!tmr) tmr = setInterval(function () { if (S.tab === "captain") tick(); }, 1000);
    }
    wasCap = on;
  };
})();
