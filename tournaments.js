/* tournaments.js - تبويب "البطولات" (صانع البطولات) - كل تبويب سكربت مستقل
   - الأدمن بس (بمفتاح ADMIN_KEY) يعمل ويعدّل ويمسح بطولات، والكل يشوف الجداول والنتايج.
   - النتايج والترتيب بتتحسب تلقائيًا من نقاط الجولات (نفس أرقام إحصائيات الموسم) عن طريق tm-engine.js.
   - الإعدادات بتتخزن في شيت "البطولات" (Tournament.gs). */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc, E = window.__tmEngine, GRID = window.__grid;
  if (!E || !GRID) return;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var ST = { items: null, err: "", loading: false, cur: null, tab: "", edit: null, editId: null, admin: false, key: LS.get("fc_key") || "", busy: false, tries: 0 };
  var CC = {}, wasOn = false;
  var MODES = { teams: "تيمات", individual: "فردي", both: "تيمات + فردي" };

  (function () {
    var st = document.createElement("style"); st.id = "tmCss";
    st.textContent = [
      ".tm-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.tm-top h2{margin:0;font-size:20px;font-weight:700}",
      ".tm-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center}.tm-gap{margin-top:12px}",
      ".tm-it{cursor:pointer;display:grid;gap:8px;transition:transform .15s}.tm-it:active{transform:scale(.99)}.tm-it b{font-size:17px}",
      ".tm-pill{display:inline-flex;align-items:center;padding:4px 11px;border-radius:99px;background:var(--s3);color:var(--mu);font-size:12px;font-weight:500;white-space:nowrap}",
      ".tm-pill.ok{background:color-mix(in srgb,#17d67e 18%,transparent);color:var(--tx)}.tm-pill.live{background:color-mix(in srgb,var(--ac) 22%,transparent);color:var(--act)}.tm-pill.no{background:color-mix(in srgb,#ff3b5c 16%,transparent)}",
      ".tm-champ{display:flex;align-items:center;gap:12px;padding:16px;border-radius:18px;margin-top:12px;color:#0B0F19;background:linear-gradient(135deg,#ffe28a,#ff9b2f)}.tm-champ b{font-size:20px;font-weight:700}.tm-champ small{display:block;opacity:.75;font-size:12.5px}.tm-champ i{font-style:normal;font-size:34px}",
      ".tm-tabs{display:flex;gap:8px;overflow-x:auto;padding:12px 0 6px;scrollbar-width:none}.tm-tabs::-webkit-scrollbar{display:none}",
      ".tm-tab{flex:none;padding:8px 16px;border-radius:99px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:13px;font-weight:500;cursor:pointer}.tm-tab.on{background:var(--ac);border-color:var(--ac);color:#0B0F19;font-weight:600}.tm-tab.done:after{content:' ✓'}",
      ".tm-note{margin-top:10px;padding:11px 14px;border-radius:12px;border:1px solid var(--ln);background:var(--s2);font-size:13px;line-height:1.7;color:var(--mu)}.tm-note b{color:var(--tx)}",
      ".tm-sh{display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:6px}.tm-sh b{font-size:16px}",
      ".tm-rd{margin-top:10px;border:1px solid var(--ln);border-radius:14px;background:var(--s1);overflow:hidden}.tm-rd>summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:11px 14px;font-weight:600;font-size:14px}.tm-rd>summary::-webkit-details-marker{display:none}.tm-rd>summary small{color:var(--mu);font-weight:400;font-size:12px}",
      ".tm-fx{display:grid;grid-template-columns:1fr auto 1fr auto;align-items:center;gap:8px;padding:10px 14px;border-top:1px solid var(--ln);font-size:14px}",
      ".tm-fx .tm-n{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.tm-fx .tm-n.b{text-align:end}.tm-fx .tm-n.w{font-weight:700;color:var(--act)}",
      ".tm-sc{min-width:74px;text-align:center;padding:4px 10px;border-radius:10px;background:var(--s3);font-weight:700;font-variant-numeric:tabular-nums}.tm-fx.lv .tm-sc{background:color-mix(in srgb,var(--ac) 28%,transparent)}.tm-fx.ov .tm-sc{outline:1.5px dashed var(--ac)}",
      ".tm-g{display:inline-block;margin-inline-end:6px;padding:1px 8px;border-radius:99px;background:var(--s3);color:var(--mu);font-size:11px}",
      ".tm-ed{border:0;background:var(--s3);color:var(--tx);width:30px;height:30px;border-radius:9px;font-size:14px;cursor:pointer}",
      ".tm-br{display:flex;gap:14px;overflow-x:auto;padding:6px 2px 12px}.tm-bc{flex:none;width:220px;display:flex;flex-direction:column;justify-content:space-around;gap:10px}",
      ".tm-bh{text-align:center;font-weight:600;font-size:13px;margin-bottom:2px}.tm-bh small{display:block;color:var(--mu);font-weight:400;font-size:11.5px}",
      ".tm-tie{border:1px solid var(--ln);border-radius:14px;background:var(--s1);overflow:hidden;position:relative}.tm-tie.e{border:0;background:none}",
      ".tm-tp{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:9px 12px;font-size:13.5px}.tm-tp+.tm-tp{border-top:1px solid var(--ln)}.tm-tp span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}",
      ".tm-tp.w{background:color-mix(in srgb,var(--ac) 14%,transparent);font-weight:700}.tm-tp b{font-variant-numeric:tabular-nums}",
      ".tm-ti{padding:5px 12px 8px;font-size:11.5px;color:var(--mu);display:flex;justify-content:space-between;align-items:center;gap:6px}",
      "tr.tm-q>td{background:color-mix(in srgb,var(--ac) 10%,var(--s1))!important}",
      ".tm-fm{display:inline-flex;gap:3px}.tm-fm i{width:9px;height:9px;border-radius:50%;background:var(--s3)}.tm-fm i.w{background:#17d67e}.tm-fm i.l{background:#ff3b5c}.tm-fm i.d{background:#f5b342}",
      /* الفورم */
      ".tm-sec{margin-top:12px}.tm-sec>.ct{margin:0 0 10px}.tm-f{display:grid;gap:6px;margin-top:10px;font-size:13px;color:var(--mu)}.tm-f>span{font-weight:500}",
      ".tm-in{width:100%;height:46px;padding:0 12px;border-radius:12px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:14.5px;outline:none}.tm-in:focus{border-color:var(--ac)}textarea.tm-in{height:auto;padding:10px 12px}",
      ".tm-g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}.tm-g3{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}",
      ".tm-ck{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:99px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font-size:13px;cursor:pointer;user-select:none}.tm-ck input{width:17px;height:17px;margin:0;accent-color:var(--ac)}.tm-ck:has(input:checked){border-color:var(--ac);background:color-mix(in srgb,var(--ac) 14%,var(--s1))}",
      ".tm-pl{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}.tm-pr{display:inline-flex}.tm-pr .tm-ck small{color:var(--mu);font-size:11px}",
      ".tm-tg{margin-top:12px;padding:10px;border:1px solid var(--ln);border-radius:14px;background:var(--s2)}.tm-tg>.tm-ck{font-weight:600}",
      ".tm-stg{margin-top:12px;border:1.5px solid var(--ln);border-radius:18px;padding:14px;background:var(--s1);position:relative}.tm-stg h4{margin:0;font-size:15px;display:flex;align-items:center;gap:8px}",
      ".tm-stg h4 i{width:24px;height:24px;border-radius:8px;background:var(--ac);color:#0B0F19;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}",
      ".tm-sb{display:flex;gap:6px;margin-inline-start:auto}.tm-sb button{border:0;background:var(--s3);color:var(--tx);width:32px;height:32px;border-radius:10px;font-size:14px;cursor:pointer}.tm-sb button.x{color:#ff6b81}",
      ".tm-hint{font-size:12px;color:var(--mu);margin-top:6px;line-height:1.7}.tm-bar{position:sticky;bottom:0;z-index:5;margin-top:16px;padding:12px 0;display:grid;grid-template-columns:2fr 1fr;gap:10px;background:linear-gradient(to top,var(--bg) 70%,transparent)}",
      ".tm-as{display:flex;align-items:center;gap:8px;margin-top:6px;font-size:13px}.tm-as select{width:auto;flex:1}",
      "#tmModal{position:fixed;inset:0;z-index:96;display:grid;place-items:center;padding:20px;background:rgba(4,6,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}",
      "#tmModal .tc{width:min(420px,100%);max-height:88vh;overflow-y:auto;padding:20px;border-radius:24px;background:var(--s1);border:1px solid var(--ln);box-shadow:0 24px 60px rgba(0,0,0,.4)}",
      "#tmModal h3{margin:0 0 6px;font-size:18px;font-weight:600}#tmModal p{margin:0 0 10px;color:var(--mu);font-size:13px;line-height:1.7}#tmModal .ab{display:grid;gap:8px;margin-top:14px}",
      "#tmModal .tm-ar{display:grid;grid-template-columns:1fr 90px;gap:8px;align-items:center;margin-top:8px;font-size:13.5px}"
    ].join("\n");
    document.head.appendChild(st);
  })();

  /* ---------- أدوات صغيرة ---------- */
  function num(x) { return Number(x) || 0; }
  function fmt(v) { return v == null || v === "" ? "–" : (typeof v === "number" ? (Math.round(v * 10) / 10).toLocaleString("en-US") : v); }
  function members() { return (S.D && S.D.members) || []; }
  var _mm = null, _mmD = null;
  function MM() {
    if (_mm && _mmD === S.D) return _mm;
    _mm = {}; _mmD = S.D;
    members().forEach(function (m) { var k = m.team + "|" + m.entryId; if (!_mm[k]) _mm[k] = { person: m.person, team: m.team, uid: m.uid, entryId: m.entryId, group: m.group || "" }; });
    return _mm;
  }
  function isMem(id) { return String(id).indexOf("|") > -1; }
  function nameOf(id) { if (id === "?" ) return "؟"; if (isMem(id)) { var m = MM()[id]; return m ? m.person : String(id).split("|")[1]; } return id; }
  function subOf(id) { if (!isMem(id)) return ""; var m = MM()[id]; return m ? m.team : String(id).split("|")[0]; }
  function actAttr(id) {
    if (isMem(id)) { var m = MM()[id]; return m ? ' data-act="m" data-arg="' + esc(m.uid) + '"' : ""; }
    return ' data-act="t" data-arg="' + esc(id) + '"';
  }
  function gwTxt(g) { return !g || !g.length ? "الجولة لسه ماتحددتش" : (g.length === 1 ? "ج" + g[0] : "ج" + g[0] + "–ج" + g[g.length - 1]); }
  function cloneO(o) { return JSON.parse(JSON.stringify(o)); }
  function pill(t, c) { return '<span class="tm-pill ' + (c || "") + '">' + t + "</span>"; }
  function find(arr, f) { for (var i = 0; i < arr.length; i++) if (f(arr[i], i)) return arr[i]; return null; }

  /* ---------- النتايج (من موديل إحصائيات الموسم) ---------- */
  function getM() { var W = window.__season; if (!W || !S.D) return null; try { return W.full(); } catch (e) { return null; } }
  function mkCtx(cfg, M, force) {
    var gws = M.gws, ix = {}, teamX = {}, memX = {}, byTeam = {}, sc = cfg.scoring || {}, mode = (force || cfg.mode) === "individual" ? "individual" : "teams", sCache = {};
    gws.forEach(function (g, j) { ix[g] = j; });
    M.TL.forEach(function (t) { teamX[t.team] = t; });
    M.MR.forEach(function (X) { var k = X.m.team + "|" + X.m.entryId; if (!memX[k]) { memX[k] = X; (byTeam[X.m.team] = byTeam[X.m.team] || []).push(X); } });
    function memNet(X, j) { var e = X.ser[j]; return e ? e.net : null; }
    function teamScore(team, j) {
      var m = sc.team || "net";
      if (m === "net") { var t = teamX[team]; return t && t.per[j] != null ? t.per[j] : null; }
      var L = (byTeam[team] || []).map(function (X) { return memNet(X, j); }).filter(function (v) { return v != null; });
      if (!L.length) return null;
      if (m === "avg") return Math.round(L.reduce(function (s, v) { return s + v; }, 0) / L.length * 10) / 10;
      L.sort(function (a, b) { return b - a; });
      return L.slice(0, Math.max(1, num(sc.n) || 3)).reduce(function (s, v) { return s + v; }, 0);
    }
    var ctx = {
      gws: gws, M: M, memX: memX, byTeam: byTeam,
      cur: S.gw || gws[gws.length - 1] || 0, curLive: !!(M.curOk && S.D && S.D.live && S.gw === S.cur),
      score: function (id, g) {
        var j = ix[g]; if (j == null) return null;
        if (mode === "individual") { var X = memX[id]; return X ? memNet(X, j) : null; }
        return teamScore(id, j);
      },
      season: function (id) {
        if (sCache[id] != null) return sCache[id];
        var v = 0;
        if (mode === "individual") v = memX[id] ? memX[id].total : 0;
        else if ((sc.team || "net") === "net") v = teamX[id] ? teamX[id].total : 0;
        else gws.forEach(function (g, j) { v += teamScore(id, j) || 0; });
        return (sCache[id] = v);
      }
    };
    return ctx;
  }
  function result(it) {
    var M = getM(); if (!M) return null;
    var c = CC[it.id];
    if (c && c.M === M && c.u === it.updated) return c.r;
    var ctx = mkCtx(it.cfg, M), r = E.compute(it.cfg, ctx);
    r.ctx = ctx; r.M = M; CC[it.id] = { M: M, u: it.updated, r: r };
    return r;
  }

  /* ---------- السيرفر ---------- */
  function post(o) { return fetch(F.CFG.API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(o) }).then(function (r) { return r.json(); }); }
  function norm(it) {
    var c = it.cfg || {};
    c.name = c.name || it.name; c.mode = c.mode || "teams"; c.players = c.players || []; c.stages = c.stages || []; c.overrides = c.overrides || {}; c.adj = c.adj || {}; c.scoring = c.scoring || { team: "net", n: 3 };
    it.cfg = c; return it;
  }
  function loadList(quiet) {
    if (ST.loading) return;
    ST.loading = true; if (!quiet) ST.err = "";
    return F.api({ api: "tmList" }).then(function (r) {
      ST.loading = false;
      if (!r || r.success === false) ST.err = (r && r.message) || "تعذّر تحميل البطولات";
      else { ST.items = (r.items || []).map(norm); ST.err = ""; CC = {}; }
      if (S.tab === "tournaments") F.render();
    }).catch(function () { ST.loading = false; if (!ST.items) ST.err = "تعذّر الاتصال بالسيرفر"; if (S.tab === "tournaments") F.render(); });
  }
  function checkKey(k) { return F.api({ api: "tmCheck", key: k }).then(function (r) { return !!(r && r.success); }).catch(function () { return false; }); }
  if (ST.key) checkKey(ST.key).then(function (ok) { ST.admin = ok; if (S.tab === "tournaments") F.render(); });
  function persist(it, okMsg) {
    if (ST.busy) return Promise.resolve();
    ST.busy = true;
    return post({ api: "tmSave", key: ST.key, id: it.id, cfg: it.cfg }).then(function (r) {
      ST.busy = false;
      if (r && r.success) { it.updated = r.updated || it.updated; CC = {}; F.toast(okMsg || r.message || "اتحفظ"); }
      else F.toast((r && r.message) || "تعذّر الحفظ");
      F.render();
    }).catch(function () { ST.busy = false; F.toast("فشل الاتصال بالسيرفر"); });
  }
  function itemById(id) { return find(ST.items || [], function (x) { return x.id === id; }); }

  /* ---------- مودال ---------- */
  function modal(html) { var d = document.getElementById("tmModal"); if (!d) { d = document.createElement("div"); d.id = "tmModal"; document.body.appendChild(d); } d.innerHTML = '<div class="tc">' + html + "</div>"; }
  function closeModal() { var d = document.getElementById("tmModal"); if (d) d.remove(); }
  function mval(sel) { var el = document.querySelector("#tmModal " + sel); return el ? el.value : ""; }
  function keyModal() {
    modal('<h3>وضع الأدمن</h3><p>اكتب مفتاح الأدمن (ADMIN_KEY) علشان تقدر تعمل وتعدّل البطولات. هيتحفظ على جهازك.</p><input class="tm-in" id="tmKey" type="password" placeholder="ADMIN_KEY" autocomplete="off" value="' + esc(ST.key) + '"><div class="ab"><button class="btn b1" data-tm="savekey">دخول</button><button class="btn b2" data-tm="close">إلغاء</button></div><p id="tmMsg" style="margin:10px 0 0"></p>');
  }

  /* =====================================================================
     العرض
     ===================================================================== */
  function adminChip() {
    return ST.admin ? '<button class="chip" data-tm="logout">أدمن ✓ (خروج)</button>' : '<button class="chip" data-tm="admin">وضع الأدمن</button>';
  }
  function statusOf(res) {
    if (!res) return { t: "بيحسب...", c: "" };
    if (res.champion) return { t: "🏆 البطل: " + esc(nameOf(res.champion)), c: "ok" };
    var cur = find(res.stages, function (s) { return !s.complete; });
    if (cur) return { t: (cur.live ? "لايف · " : "شغالة · ") + esc(cur.name), c: "live" };
    return { t: "خلصت", c: "ok" };
  }
  function viewList() {
    var h = '<div class="tm-top"><h2>البطولات</h2><div class="tm-row">' + adminChip() + '<button class="chip" data-tm="refresh">تحديث</button></div></div>';
    if (ST.admin) h += '<button class="btn b1" data-tm="new" style="width:100%;margin-top:12px">＋ بطولة جديدة</button>';
    if (ST.err && !ST.items) return h + '<div class="empty">' + esc(ST.err) + '<br><button class="btn b2" data-tm="refresh" style="margin-top:12px">حاول تاني</button></div>';
    if (!ST.items) return h + '<div class="plz" style="min-height:200px;margin-top:12px"></div>';
    if (!ST.items.length) return h + '<div class="empty">مفيش بطولات لسه.' + (ST.admin ? "<br>دوس \"بطولة جديدة\" وابدأ." : "") + "</div>";
    var M = getM();
    h += ST.items.map(function (it) {
      var c = it.cfg, res = M ? result(it) : null, s = statusOf(res);
      return '<div class="cd tm-it" data-tm="open" data-a="' + esc(it.id) + '"><div class="tm-top"><b>' + esc(c.name) + "</b>" + pill(s.t, s.c) + '</div><div class="tm-row">' +
        pill(MODES[c.mode] || "") + pill(c.players.length + (c.mode === "individual" ? " لاعب" : " تيم")) + pill(c.stages.length + (c.stages.length === 1 ? " مرحلة" : " مراحل")) +
        c.stages.map(function (st) { return '<span class="tm-pill">' + esc(E.TYPES[st.type] || st.type) + "</span>"; }).join("") + "</div></div>";
    }).join("");
    if (!M) pollModel();
    return h;
  }

  function pollModel() {
    if (ST.tries > 25) return;
    ST.tries++;
    setTimeout(function () { if (S.tab === "tournaments" && !ST.edit) { if (getM()) { ST.tries = 0; F.render(); } else pollModel(); } }, 900);
  }

  function defaultTab(res) {
    var s = find(res.stages, function (x) { return !x.complete; }) || res.stages[res.stages.length - 1];
    return s ? s.id : "ov";
  }
  function viewOne(it) {
    var c = it.cfg, M = getM();
    var head = '<div class="tm-top"><div class="tm-row"><button class="chip" data-tm="back">← البطولات</button></div><div class="tm-row">' + adminChip() + "</div></div>" +
      '<div class="tm-top tm-gap"><h2>' + esc(c.name) + '</h2></div><div class="tm-row" style="margin-top:6px">' + pill(MODES[c.mode]) + pill(c.players.length + (c.mode === "individual" ? " لاعب" : " تيم")) +
      (c.mode !== "individual" ? pill(c.scoring.team === "avg" ? "نقاط التيم = متوسط الأعضاء" : c.scoring.team === "top" ? "نقاط التيم = أحسن " + (c.scoring.n || 3) + " أعضاء" : "نقاط التيم العادية") : "") + "</div>";
    if (ST.admin) head += '<div class="tm-row tm-gap"><button class="chip" data-tm="edit">✎ تعديل البطولة</button><button class="chip" data-tm="dup">نسخ</button><button class="chip" data-tm="del">مسح</button></div>';
    if (!M) { pollModel(); return head + '<div class="plz" style="min-height:240px;margin-top:12px"></div><div class="tm-note">بيحمّل نقاط الجولات علشان يحسب البطولة...</div>'; }
    var res = result(it);
    var note = (S.cur && S.gw !== S.cur) ? '<div class="tm-note">الأرقام محسوبة لحد <b>ج' + S.gw + '</b> (الجولة المعروضة دلوقتي). <button class="chip" data-tm="jump" style="margin-inline-start:6px">احسب لحد الجولة الحالية ج' + S.cur + "</button></div>" : "";
    var champ = res.champion ? '<div class="tm-champ"><i>🏆</i><div><small>بطل ' + esc(c.name) + "</small><b>" + esc(nameOf(res.champion)) + "</b>" + (subOf(res.champion) ? "<small>" + esc(subOf(res.champion)) + "</small>" : "") + "</div></div>" : "";
    var tab = ST.tab && (ST.tab === "ov" || ST.tab === "ind" || res.byId[ST.tab]) ? ST.tab : defaultTab(res);
    var tabs = '<div class="tm-tabs"><button class="tm-tab' + (tab === "ov" ? " on" : "") + '" data-tm="tab" data-a="ov">نظرة عامة</button>' +
      res.stages.map(function (s) { return '<button class="tm-tab' + (tab === s.id ? " on" : "") + (s.complete ? " done" : "") + '" data-tm="tab" data-a="' + esc(s.id) + '">' + esc(s.name) + "</button>"; }).join("") +
      (c.mode === "both" ? '<button class="tm-tab' + (tab === "ind" ? " on" : "") + '" data-tm="tab" data-a="ind">ترتيب الأفراد</button>' : "") + "</div>";
    var body = tab === "ov" ? overviewHtml(it, res) : tab === "ind" ? indivHtml(it, res) : stageHtml(it, res, res.byId[tab]);
    return head + note + champ + tabs + body;
  }

  function overviewHtml(it, res) {
    var h = res.stages.map(function (s, i) {
      var lead = s.order.length && (s.complete || s.rounds.some(function (r) { return r.fixtures.some(function (f) { return f.done; }); }) || s.type === "ranking") ? nameOf(s.order[0]) : "";
      return '<div class="cd tm-it" data-tm="tab" data-a="' + esc(s.id) + '" style="margin-top:10px"><div class="tm-top"><b>' + (i + 1) + ". " + esc(s.name) + "</b>" + stagePills(s) + '</div><div class="tm-row">' +
        pill(esc(E.TYPES[s.type])) + pill(s.ents.length + " متسابق") + pill(esc(spanTxt(s))) + (lead ? pill((s.complete ? "الأول: " : "المتصدر: ") + esc(lead), s.complete ? "ok" : "") : "") + "</div></div>";
    }).join("");
    return h || '<div class="empty">مفيش مراحل</div>';
  }
  function spanTxt(s) {
    var g = [];
    s.rounds.forEach(function (r) { (r.gws || []).forEach(function (x) { g.push(x); }); });
    (s.gwsList || []).forEach(function (x) { g.push(x); });
    if (!g.length) return "الجولات لسه ماتحددتش";
    return "ج" + Math.min.apply(null, g) + " → ج" + Math.max.apply(null, g);
  }
  function stagePills(s) {
    return (s.complete ? pill("خلصت", "ok") : s.live ? pill("لايف", "live") : "") + (s.tentative ? pill("مؤقت لحد ما اللي قبلها يخلص", "no") : "");
  }

  /* ---------- جداول ---------- */
  function nameCol() {
    return { k: "name", l: "الاسم", v: function (r) { return nameOf(r.id); }, wr: true, h: function (r) { var s = subOf(r.id); return "<b>" + esc(nameOf(r.id)) + "</b>" + (s ? '<small class="mut" style="display:block;font-size:11px">' + esc(s) + "</small>" : ""); } };
  }
  function nc(k, l, f, o) { var c = { k: k, l: l, v: f, num: true }; if (o) for (var q in o) c[q] = o[q]; return c; }
  function qualCount(res, S0, gi) {
    var q = 0;
    res.stages.forEach(function (x) {
      var src = x.st.src;
      if (!src || src.t !== "stage" || src.s !== S0.id) return;
      if (S0.type === "groups" && src.r === "group") q = Math.max(q, num(src.k) || 2);
      else if (S0.type !== "groups" && src.r === "top") q = Math.max(q, num(src.n) || 0);
    });
    return q;
  }
  function tableHtml(it, res, S0, T, gi) {
    var q = qualCount(res, S0, gi), title = S0.name + (T.name ? " - " + T.name : "");
    var cols;
    if (T.ranking) {
      cols = [nc("pos", "المركز", function (r) { return r.pos; }), nameCol(), nc("total", "المجموع", function (r) { return r.total; }), nc("gp", "جولات", function (r) { return r.gp; }), nc("best", "أحسن جولة", function (r) { return r.best; }),
        nc("avg", "المتوسط", function (r) { return r.avg; }), nc("raw", "قبل الاستبعاد", function (r) { return r.raw; }, { def: S0.st.drop > 0 })];
      (S0.gwsList || []).forEach(function (g, j) { cols.push(nc("g" + g, "ج" + g, function (r) { return r.per[j]; }, { def: (S0.gwsList.length <= 6) })); });
    } else {
      cols = [nc("pos", "المركز", function (r) { return r.pos; }), nameCol(), nc("p", "لعب", function (r) { return r.p; }), nc("w", "فوز", function (r) { return r.w; }), nc("d", "تعادل", function (r) { return r.d; }), nc("l", "خسارة", function (r) { return r.l; }),
        nc("pf", "له", function (r) { return r.pf; }), nc("pa", "عليه", function (r) { return r.pa; }), nc("diff", "الفارق", function (r) { return r.diff; }), nc("pts", "النقاط", function (r) { return r.pts; }),
        nc("form", "آخر النتايج", function (r) { return r.form.join(""); }, { num: false, def: false, h: function (r) { return '<span class="tm-fm">' + r.form.slice(-5).map(function (x) { return '<i class="' + x + '"></i>'; }).join("") + "</span>"; } })];
    }
    return GRID.render({ key: "tm_" + it.id + "_" + S0.id + "_" + gi, title: title, rows: T.rows, cols: cols, rowKey: function (r) { return r.id; }, idx: false, defSort: function (a, b) { return a.pos - b.pos; },
      act: function (r) { return actAttr(r.id); }, rowCls: function (r) { return q && r.pos <= q ? "tm-q" : ""; } });
  }
  function fxHtml(f, S0) {
    var A = f.a ? esc(nameOf(f.a)) : "؟", B = f.b ? esc(nameOf(f.b)) : "";
    var g = f.grp != null && S0.groups ? '<span class="tm-g">' + esc(S0.groups[f.grp].name.replace("المجموعة ", "")) + "</span>" : "";
    if (f.bye) return '<div class="tm-fx"><span class="tm-n">' + g + A + '</span><span class="tm-sc">راحة</span><span class="tm-n b mut">باي (فوز تلقائي)</span><span></span></div>';
    var sc = f.done ? (f.sa != null && f.sb != null ? fmt(f.sa) + " - " + fmt(f.sb) : "قرار") : "–";
    return '<div class="tm-fx' + (f.live ? " lv" : "") + (f.ov ? " ov" : "") + '"><span class="tm-n' + (f.res === "a" ? " w" : "") + '">' + g + A + '</span><span class="tm-sc">' + sc + '</span><span class="tm-n b' + (f.res === "b" ? " w" : "") + '">' + B + "</span>" +
      (ST.admin ? '<button class="tm-ed" data-tm="fx" data-a="' + esc(f.key) + '" aria-label="تعديل النتيجة">✎</button>' : "<span></span>") + "</div>";
  }
  function roundsHtml(S0) {
    if (!S0.rounds.length) return "";
    var last = -1;
    S0.rounds.forEach(function (rd, i) { if (rd.fixtures.some(function (f) { return f.done; })) last = i; });
    return S0.rounds.map(function (rd, i) {
      var open = i === Math.max(0, last) || i === last + 1;
      return '<details class="tm-rd"' + (open ? " open" : "") + "><summary><span>" + esc(rd.name || "الجولة " + rd.no) + "</span><small>" + esc(gwTxt(rd.gws)) + (rd.pending ? " · لسه مستني اللي قبلها" : "") + "</small></summary>" +
        (rd.fixtures.length ? rd.fixtures.map(function (f) { return fxHtml(f, S0); }).join("") : '<div class="tm-fx"><span class="mut">مفيش ماتشات لسه</span></div>') + "</details>";
    }).join("");
  }
  function tieHtml(t, S0) {
    if (t.empty) return '<div class="tm-tie e"></div>';
    function row(id, score, w) {
      var nm = id === "" ? '<i class="mut">—</i>' : id === "?" ? '<i class="mut">يتحدد بعدين</i>' : esc(nameOf(id));
      return '<div class="tm-tp' + (w ? " w" : "") + '"><span>' + nm + "</span><b>" + (score == null ? "" : fmt(score)) + "</b></div>";
    }
    var aw = !!t.winner && t.winner === t.a, bw = !!t.winner && t.winner === t.b, info = "";
    if (t.bye) info = "تأهل مباشر (باي)";
    else if (t.legs.length > 1) info = t.legs.map(function (f) { return f.done && f.sa != null ? fmt(f.sa) + "-" + fmt(f.sb) : "–"; }).join(" | ");
    if (t.by) info += (info ? " · " : "") + t.by;
    var gws = t.legs.length ? gwTxt([].concat.apply([], t.legs.map(function (f) { return f.gws; }))) : "";
    var ed = ST.admin && !t.bye && t.legs.length ? '<button class="tm-ed" data-tm="tie" data-a="' + esc(t.key) + '" aria-label="تعديل">✎</button>' : "";
    return '<div class="tm-tie">' + row(t.a, t.ta != null ? t.ta : (t.legs[0] && t.legs[0].done ? t.legs[0].sa : null), aw) + row(t.b, t.tb != null ? t.tb : (t.legs[0] && t.legs[0].done ? t.legs[0].sb : null), bw) +
      '<div class="tm-ti"><span>' + (t.live ? "لايف · " : "") + esc(gws) + (info ? " · " + esc(info) : "") + "</span>" + ed + "</div></div>";
  }
  function bracketHtml(S0) {
    if (!S0.bracket || !S0.bracket.rounds.length) return '<div class="empty">محتاج متسابقين اتنين على الأقل</div>';
    var h = '<div class="tm-br">' + S0.bracket.rounds.map(function (rd) {
      return '<div class="tm-bc"><div class="tm-bh">' + esc(rd.name) + "<small>" + esc(gwTxt(rd.gws)) + "</small></div>" + rd.ties.map(function (t) { return tieHtml(t, S0); }).join("") + "</div>";
    }).join("") + "</div>";
    if (S0.bracket.third) h += '<div class="tm-bh" style="margin-top:6px">المركز التالت</div><div style="max-width:260px;margin:6px auto 0">' + tieHtml(S0.bracket.third, S0) + "</div>";
    return h;
  }

  function stageHtml(it, res, S0) {
    if (!S0) return "";
    var h = '<div class="tm-sh"><b>' + esc(S0.name) + "</b>" + pill(esc(E.TYPES[S0.type])) + pill(S0.ents.length + " متسابق") + pill(esc(spanTxt(S0))) + stagePills(S0) + "</div>";
    S0.notes.forEach(function (n) { h += '<div class="tm-note">' + esc(n) + "</div>"; });
    if (S0.tentative) h += '<div class="tm-note">المتسابقين هنا <b>مؤقتين</b> لأنهم جايين من مرحلة لسه ماخلصتش. هيتأكدوا تلقائي أول ما تخلص.</div>';
    if (S0.type === "knockout") {
      h += F.card(S0.name, '<div class="ct">' + esc(S0.name) + "</div>" + bracketHtml(S0), "plus ov-full");
    } else {
      S0.tables.forEach(function (T, gi) { h += '<div style="margin-top:10px">' + tableHtml(it, res, S0, T, gi) + "</div>"; });
      if (S0.type !== "ranking") h += F.card(S0.name + " - الماتشات", '<div class="ct">الماتشات والنتايج</div><div class="tm-hint" style="margin:-4px 0 6px">الأرقام دي مجموع نقاط الجولة لكل متسابق.</div>' + roundsHtml(S0), "plus ov-full");
    }
    if (ST.admin) {
      var idx = it.cfg.stages.indexOf(S0.st);
      h += '<div class="tm-row tm-gap">' + (S0.type !== "knockout" && S0.type !== "ranking" ? '<button class="chip" data-tm="adj" data-a="' + esc(S0.id) + '">تعديل نقاط الجدول (خصم/مكافأة)</button>' : "") +
        (S0.st.seed === "random" || (S0.type === "groups" && (S0.st.draw === "random" || S0.st.draw === "pots" || !S0.st.draw)) ? '<button class="chip" data-tm="redraw" data-a="' + idx + '">🎲 قرعة جديدة</button>' : "") + "</div>";
    }
    return h;
  }
  function indivHtml(it, res) {
    var c = it.cfg, ictx = mkCtx(c, res.M, "individual"), ids = [];
    c.players.forEach(function (t) { (ictx.byTeam[t] || []).forEach(function (X) { ids.push(X.m.team + "|" + X.m.entryId); }); });
    var gws = res.span ? res.M.gws.filter(function (g) { return g >= res.span[0] && g <= res.span[1]; }) : [];
    if (!gws.length) return '<div class="tm-note">ترتيب الأفراد بيبدأ يظهر أول ما تتلعب أول جولة في البطولة.</div>';
    var rows = E.leaderboard(ids, gws, ictx, 0);
    var cols = [nc("pos", "المركز", function (r) { return r.pos; }), nameCol(), nc("team", "التيم", function (r) { return subOf(r.id); }, { num: false }), nc("total", "المجموع", function (r) { return r.total; }),
      nc("gp", "جولات", function (r) { return r.gp; }), nc("best", "أحسن جولة", function (r) { return r.best; }), nc("avg", "المتوسط", function (r) { return r.avg; })];
    return '<div class="tm-note">ترتيب أفراد التيمات المشاركة من <b>ج' + gws[0] + "</b> لحد <b>ج" + gws[gws.length - 1] + "</b> (نقاط كل عضو لوحده).</div>" +
      '<div style="margin-top:10px">' + GRID.render({ key: "tm_ind_" + it.id, title: c.name + " - ترتيب الأفراد", rows: rows, cols: cols, rowKey: function (r) { return r.id; }, idx: false, defSort: function (a, b) { return a.pos - b.pos; }, act: function (r) { return actAttr(r.id); } }) + "</div>";
  }

  /* =====================================================================
     صانع البطولة (الأدمن)
     ===================================================================== */
  function uni() {
    var teams = {}, mem = {};
    members().forEach(function (m) {
      if (!teams[m.team]) teams[m.team] = { id: m.team, group: m.group || "" };
      var k = m.team + "|" + m.entryId; if (!mem[k]) mem[k] = { id: k, person: m.person, team: m.team };
    });
    var T = Object.keys(teams).map(function (k) { return teams[k]; }).sort(function (a, b) { return a.id.localeCompare(b.id, "ar"); });
    var byT = {}; Object.keys(mem).forEach(function (k) { (byT[mem[k].team] = byT[mem[k].team] || []).push(mem[k]); });
    Object.keys(byT).forEach(function (t) { byT[t].sort(function (a, b) { return a.person.localeCompare(b.person, "ar"); }); });
    return { teams: T, byT: byT };
  }
  function newDraft() { return { name: "", mode: "teams", scoring: { team: "net", n: 3 }, players: [], stages: [], overrides: {}, adj: {} }; }
  function nextId(d) { var n = 0; d.stages.forEach(function (s) { var m = /^s(\d+)$/.exec(s.id); if (m) n = Math.max(n, Number(m[1])); }); return "s" + (n + 1); }
  function newStage(type, id, start) {
    var s = { id: id, name: E.TYPES[type], type: type, startGw: start || "", gpr: 1, src: { t: "all" }, seed: "season" };
    if (type === "league" || type === "groups" || type === "swiss") { s.legs = 1; s.win = 3; s.draw_pts = 1; s.loss = 0; s.margin = 0; s.tb = ["diff", "pf"]; s.carry = 0; }
    if (type === "groups") { s.groups = 4; s.draw = "pots"; }
    if (type === "swiss") { s.rounds = 5; }
    if (type === "knockout") { s.koLegs = 1; s.finalLegs = 1; s.third = false; s.tie = ["last", "season", "seed"]; }
    if (type === "ranking") { s.endGw = (Number(start) || 1) + 4; s.drop = 0; }
    return s;
  }
  function rulesFor(P) { var r = ["top", "range", "bottom"]; if (P.type === "groups") r.unshift("group"); if (P.type === "knockout") r.push("losers"); return r; }
  function fixStage(d, i) {
    var st = d.stages[i]; st.src = st.src || { t: "all" };
    if (st.src.t === "stage") {
      var prev = d.stages.slice(0, i);
      if (!prev.length) st.src = { t: "all" };
      else {
        if (!find(prev, function (p) { return p.id === st.src.s; })) st.src.s = prev[prev.length - 1].id;
        var P = find(prev, function (p) { return p.id === st.src.s; }), ok = rulesFor(P);
        if (ok.indexOf(st.src.r) < 0) st.src.r = ok[0];
        if (st.src.r === "top" && !st.src.n) st.src.n = 4;
        if (st.src.r === "range" && !st.src.a) { st.src.a = 1; st.src.b = 4; }
        if (st.src.r === "bottom" && !st.src.n) st.src.n = 4;
        if (st.src.r === "group" && !st.src.k) st.src.k = 2;
        if (st.src.r === "losers" && !st.src.round) st.src.round = 1;
      }
    }
    if (st.src.t === "manual" && !st.manual) st.manual = [];
    if (st.seed === "cross" && !(st.type === "knockout" && st.src.t === "stage" && st.src.r === "group")) st.seed = "season";
  }
  function fixAll(d) { d.stages.forEach(function (s, i) { fixStage(d, i); }); }
  function estN(d, i) {
    var st = d.stages[i], src = st.src || { t: "all" };
    if (src.t === "manual") return (st.manual || []).length;
    if (src.t !== "stage") return d.players.length;
    var pi = -1; d.stages.forEach(function (s, k) { if (s.id === src.s) pi = k; });
    if (pi < 0 || pi >= i) return d.players.length;
    var Pn = estN(d, pi), P = d.stages[pi];
    if (src.r === "top" || src.r === "bottom") return Math.min(Pn, num(src.n) || Pn);
    if (src.r === "range") return Math.max(0, num(src.b) - num(src.a) + 1);
    if (src.r === "group") return Math.min(Pn, num(src.k) * (num(P.groups) || 2) + num(src.wild));
    if (src.r === "losers") return Math.ceil(Pn / 2);
    return Pn;
  }
  function gwEnd(d, i) {
    var st = d.stages[i];
    if (st.gws && st.gws.length) return Math.max.apply(null, st.gws);
    if (st.gwsTxt) { var a = parseGws(st.gwsTxt); if (a.length) return Math.max.apply(null, a); }
    if (st.type === "ranking") return num(st.endGw) || num(st.startGw);
    return num(st.startGw) + E.gwsNeeded(st, estN(d, i)) - 1;
  }
  function parseGws(t) { return String(t || "").split(/[,،\s]+/).map(Number).filter(function (x) { return x > 0 && x < 60; }); }

  /* قوالب جاهزة */
  var TPL = [
    ["league2", "دوري ذهاب وإياب"], ["league1", "دوري ذهاب بس"], ["ko", "خروج مغلوب"], ["gk", "مجموعات + خروج مغلوب"],
    ["lfinal", "دوري ثم نهائي"], ["lpo", "دوري ثم بلاي أوف أول 4"], ["swiss", "نظام سويسري"], ["rank", "ترتيب تراكمي (كلاسيك)"]
  ];
  function applyTpl(d, name) {
    var n = Math.max(2, d.players.length || 8), base = (S.cur || S.gw || 0) + 1, out = [], st;
    function push(type, o) { st = newStage(type, "s" + (out.length + 1), ""); for (var k in o) st[k] = o[k]; out.push(st); d.stages = out; fixStage(d, out.length - 1); st.startGw = out.length === 1 ? base : gwEnd(d, out.length - 2) + 1; if (type === "ranking") st.endGw = st.startGw + 7; }
    if (name === "league2") push("league", { name: "الدوري", legs: 2 });
    else if (name === "league1") push("league", { name: "الدوري" });
    else if (name === "ko") push("knockout", { name: "خروج المغلوب" });
    else if (name === "gk") {
      var G = n >= 16 ? 4 : n >= 8 ? 2 : 2;
      push("groups", { name: "دور المجموعات", groups: G });
      push("knockout", { name: "الأدوار الإقصائية", src: { t: "stage", s: "s1", r: "group", k: 2 }, seed: G % 2 === 0 ? "cross" : "src", third: true });
    } else if (name === "lfinal") { push("league", { name: "الدوري" }); push("knockout", { name: "النهائي", src: { t: "stage", s: "s1", r: "top", n: 2 }, seed: "src" }); }
    else if (name === "lpo") { push("league", { name: "الدوري" }); push("knockout", { name: "البلاي أوف", src: { t: "stage", s: "s1", r: "top", n: 4 }, seed: "src", third: true }); }
    else if (name === "swiss") push("swiss", { name: "السويسري", rounds: Math.max(3, Math.ceil(Math.log2(n)) + 1) });
    else if (name === "rank") push("ranking", { name: "الترتيب التراكمي" });
    d.stages = out;
  }

  function setPath(o, p, v) { var a = p.split("."), c = o; for (var i = 0; i < a.length - 1; i++) { if (c[a[i]] == null) c[a[i]] = isNaN(a[i + 1]) ? {} : []; c = c[a[i]]; } c[a[a.length - 1]] = v; }
  function fld(l, inner) { return '<label class="tm-f"><span>' + l + "</span>" + inner + "</label>"; }
  function inp(path, v, o) { o = o || {}; return '<input class="tm-in" ' + (o.n ? 'type="number" inputmode="decimal" data-t="n"' : 'type="text"') + ' data-tmf="' + path + '" value="' + esc(v == null ? "" : v) + '"' + (o.ph ? ' placeholder="' + esc(o.ph) + '"' : "") + ">"; }
  function sel(path, v, opts, o) { return '<select class="tm-in" data-tmf="' + path + '"' + (o && o.rr ? ' data-rr="1"' : "") + (o && o.n ? ' data-t="n"' : "") + ">" + opts.map(function (x) { return '<option value="' + esc(x[0]) + '"' + (String(x[0]) === String(v) ? " selected" : "") + ">" + esc(x[1]) + "</option>"; }).join("") + "</select>"; }
  function ck(path, on, label, rr) { return '<label class="tm-ck"><input type="checkbox" data-tmf="' + path + '"' + (rr ? ' data-rr="1"' : "") + (on ? " checked" : "") + "><span>" + label + "</span></label>"; }
  function ckArr(path, arr, val, label) { return '<label class="tm-ck"><input type="checkbox" data-tmarr="' + path + '" data-v="' + esc(val) + '"' + ((arr || []).indexOf(val) > -1 ? " checked" : "") + "><span>" + label + "</span></label>"; }

  function playersHtml(d) {
    var U = uni(), h = "";
    if (!U.teams.length) return '<div class="tm-note">استنى لحد ما بيانات التيمات تتحمّل وارجع.</div>';
    var groups = []; U.teams.forEach(function (t) { if (t.group && groups.indexOf(t.group) < 0) groups.push(t.group); });
    h += '<div class="tm-row"><button class="chip" data-tm="pl" data-a="all">اختار الكل</button><button class="chip" data-tm="pl" data-a="none">ولا واحد</button>' +
      groups.map(function (g) { return '<button class="chip" data-tm="pl" data-a="g:' + esc(g) + '">+ ' + esc(g) + "</button>"; }).join("") + "</div>" +
      '<input class="tm-in" data-tmsearch placeholder="ابحث بالاسم..." style="margin-top:10px">';
    if (d.mode === "individual") {
      h += U.teams.map(function (t) {
        var L = U.byT[t.id] || [], all = L.length && L.every(function (m) { return d.players.indexOf(m.id) > -1; });
        return '<div class="tm-tg tm-pr" data-s="' + esc((t.id + " " + L.map(function (m) { return m.person; }).join(" ")).toLowerCase()) + '" style="display:block"><label class="tm-ck"><input type="checkbox" data-tmteam="' + esc(t.id) + '"' + (all ? " checked" : "") + "><span>" + esc(t.id) + "</span></label>" +
          '<div class="tm-pl">' + L.map(function (m) { return '<label class="tm-ck"><input type="checkbox" data-tmpl="' + esc(m.id) + '"' + (d.players.indexOf(m.id) > -1 ? " checked" : "") + "><span>" + esc(m.person) + "</span></label>"; }).join("") + "</div></div>";
      }).join("");
    } else {
      h += '<div class="tm-pl">' + U.teams.map(function (t) {
        return '<span class="tm-pr" data-s="' + esc(t.id.toLowerCase()) + '"><label class="tm-ck"><input type="checkbox" data-tmpl="' + esc(t.id) + '"' + (d.players.indexOf(t.id) > -1 ? " checked" : "") + "><span>" + esc(t.id) + (t.group ? " <small>" + esc(t.group) + "</small>" : "") + "</span></label></span>";
      }).join("") + "</div>";
    }
    return h;
  }

  function stageEd(d, i) {
    var st = d.stages[i], p = "stages." + i + ".", src = st.src || { t: "all" }, prev = d.stages.slice(0, i), h = "", T = st.type;
    h += '<div class="tm-stg"><h4><i>' + (i + 1) + "</i>" + esc(E.TYPES[T]) + '<span class="tm-sb"><button data-tm="sup" data-a="' + i + '" aria-label="فوق">▲</button><button data-tm="sdn" data-a="' + i + '" aria-label="تحت">▼</button><button data-tm="sdup" data-a="' + i + '" aria-label="نسخ">⧉</button><button class="x" data-tm="sdel" data-a="' + i + '" aria-label="مسح">✕</button></span></h4>';
    h += fld("اسم المرحلة", inp(p + "name", st.name));
    h += fld("نوع المرحلة", sel(p + "type", T, Object.keys(E.TYPES).map(function (k) { return [k, E.TYPES[k]]; }), { rr: 1 }));
    /* المصدر */
    var srcOpts = [["all", "كل المشاركين"]]; if (prev.length) srcOpts.push(["stage", "المتأهلين من مرحلة سابقة"]); srcOpts.push(["manual", "اختيار يدوي"]);
    h += fld("مين بيلعب في المرحلة دي؟", sel(p + "src.t", src.t, srcOpts, { rr: 1 }));
    if (src.t === "stage") {
      var P = find(prev, function (x) { return x.id === src.s; }) || prev[prev.length - 1], R0 = { top: "أول N", range: "من مركز لمركز", bottom: "آخر N", group: "المتأهلين من المجموعات", losers: "الخاسرين من دور" };
      h += '<div class="tm-g2">' + fld("من أنهي مرحلة", sel(p + "src.s", src.s, prev.map(function (x) { return [x.id, x.name]; }), { rr: 1 })) + fld("طريقة التأهل", sel(p + "src.r", src.r, rulesFor(P).map(function (k) { return [k, R0[k]]; }), { rr: 1 })) + "</div>";
      if (src.r === "top" || src.r === "bottom") h += fld(src.r === "top" ? "عدد المتأهلين (الأوائل)" : "عدد آخر المراكز", inp(p + "src.n", src.n, { n: 1 }));
      if (src.r === "range") h += '<div class="tm-g2">' + fld("من مركز", inp(p + "src.a", src.a, { n: 1 })) + fld("لحد مركز", inp(p + "src.b", src.b, { n: 1 })) + "</div>";
      if (src.r === "group") h += '<div class="tm-g2">' + fld("كام متأهل من كل مجموعة", inp(p + "src.k", src.k, { n: 1 })) + fld("أحسن كام تالت/تاني بالبطاقات البرية", inp(p + "src.wild", src.wild || 0, { n: 1 })) + "</div>";
      if (src.r === "losers") h += fld("خاسري الدور رقم", inp(p + "src.round", src.round, { n: 1 }));
    }
    if (src.t === "manual") {
      h += '<div class="tm-pl">' + d.players.map(function (id) { return ckArr(p + "manual", st.manual, id, esc(nameOf(id))); }).join("") + "</div>" + (d.players.length ? "" : '<div class="tm-hint">اختار المشاركين الأول من فوق.</div>');
    }
    /* التوقيت */
    h += '<div class="tm-g2">' + fld(T === "ranking" ? "من جولة" : "أول جولة", inp(p + "startGw", st.startGw, { n: 1 })) + (T === "ranking" ? fld("لحد جولة", inp(p + "endGw", st.endGw, { n: 1 })) : fld("عدد الجولات في كل دور", inp(p + "gpr", st.gpr, { n: 1 }))) + "</div>";
    if (T !== "ranking") h += fld("جولات مخصصة (اختياري): افصل بفاصلة، مثال 5,6,9,10", inp(p + "gwsTxt", st.gwsTxt != null ? st.gwsTxt : (st.gws || []).join(","), { ph: "سيبه فاضي لو متتالية" }));
    if (i > 0) h += '<div class="tm-row" style="margin-top:8px"><button class="chip" data-tm="chain" data-a="' + i + '">ابدأ بعد المرحلة اللي قبلها (ج' + (gwEnd(d, i - 1) + 1) + ")</button></div>";
    h += '<div class="tm-hint">المرحلة دي هتاخد حوالي ' + E.gwsNeeded(st, Math.max(2, estN(d, i))) + " جولة (تقديري على حسب عدد المتسابقين).</div>";
    /* خيارات النوع */
    if (T === "league" || T === "groups" || T === "swiss") {
      if (T === "groups") h += '<div class="tm-g2">' + fld("عدد المجموعات", inp(p + "groups", st.groups, { n: 1 })) + fld("طريقة القرعة", sel(p + "draw", st.draw || "pots", [["random", "عشوائية"], ["snake", "ثعبانية (حسب الموسم)"], ["pots", "أوعية (حسب الموسم)"], ["manual", "يدوي"]], { rr: 1 })) + "</div>";
      if (T === "groups" && st.draw === "manual") {
        var ents = src.t === "all" ? d.players : src.t === "manual" ? (st.manual || []) : null;
        if (!ents) h += '<div class="tm-hint">التوزيع اليدوي متاح بس لو المتسابقين من "كل المشاركين" أو "اختيار يدوي".</div>';
        else {
          var G = Math.max(1, num(st.groups) || 2), opts = []; for (var g = 0; g < G; g++) opts.push([g, "المجموعة " + (E.GL[g] || g + 1)]);
          h += ents.map(function (id) {
            var cur = 0; (st.assign || []).forEach(function (a, gi) { if (a.indexOf(id) > -1) cur = gi; });
            return '<div class="tm-as"><span style="flex:1">' + esc(nameOf(id)) + '</span><select class="tm-in" data-tmassign="' + i + "|" + esc(id) + '">' + opts.map(function (o) { return '<option value="' + o[0] + '"' + (o[0] === cur ? " selected" : "") + ">" + o[1] + "</option>"; }).join("") + "</select></div>";
          }).join("");
        }
      }
      if (T === "swiss") h += fld("عدد الجولات (الدورات)", inp(p + "rounds", st.rounds, { n: 1 }));
      else h += fld("كام مرة بيتقابلوا", sel(p + "legs", st.legs || 1, [[1, "مرة واحدة"], [2, "ذهاب وإياب"]], { n: 1 }));
      h += '<div class="tm-g3">' + fld("نقاط الفوز", inp(p + "win", st.win, { n: 1 })) + fld("نقاط التعادل", inp(p + "draw_pts", st.draw_pts, { n: 1 })) + fld("نقاط الخسارة", inp(p + "loss", st.loss, { n: 1 })) + "</div>";
      h += fld("هامش التعادل: لو الفرق بين النقطتين أقل من أو يساوي الرقم ده يبقى تعادل", inp(p + "margin", st.margin, { n: 1 }));
      h += '<div class="tm-f"><span>ترتيب كسر التعادل في الجدول (بعد النقاط)</span><div class="tm-row">' + [["diff", "فارق النقاط"], ["pf", "النقاط له"], ["wins", "عدد الفوز"], ["h2h", "المواجهات المباشرة"], ["season", "أداء الموسم"]].map(function (x) { return ckArr(p + "tb", st.tb, x[0], x[1]); }).join("") + "</div></div>";
      if (src.t === "stage") h += fld("ترحيل نقاط المرحلة اللي فاتت (نسبة %)", inp(p + "carry", st.carry || 0, { n: 1 }));
    }
    if (T === "knockout") {
      h += '<div class="tm-g2">' + fld("الأدوار العادية", sel(p + "koLegs", st.koLegs || 1, [[1, "ماتش واحد"], [2, "ذهاب وإياب (مجموع)"]], { n: 1 })) + fld("النهائي", sel(p + "finalLegs", st.finalLegs || 1, [[1, "ماتش واحد"], [2, "ذهاب وإياب (مجموع)"]], { n: 1 })) + "</div>";
      h += '<div class="tm-row" style="margin-top:10px">' + ck(p + "third", st.third, "ماتش على المركز التالت") + "</div>";
      h += '<div class="tm-f"><span>لو اتساووا بيتحسم إزاي (بالترتيب ده)</span><div class="tm-row">' + [["last", "الأعلى في آخر جولة"], ["season", "الأعلى في الموسم"], ["seed", "الأفضل تصنيفًا"], ["random", "قرعة"]].map(function (x) { return ckArr(p + "tie", st.tie, x[0], x[1]); }).join("") + "</div></div>";
    }
    if (T === "ranking") h += fld("استبعاد أسوأ كام جولة من كل متسابق", inp(p + "drop", st.drop, { n: 1 }));
    /* التصنيف */
    var so = [["src", "زي ترتيب المصدر / ترتيب الاختيار"], ["season", "حسب أداء الموسم"], ["random", "قرعة عشوائية"]];
    if (T === "knockout" && src.t === "stage" && src.r === "group") so.push(["cross", "تقاطع المجموعات (أول أ × تاني ب)"]);
    if (T !== "ranking") h += fld("تصنيف المتسابقين (للقرعة والتقابل)", sel(p + "seed", st.seed || "season", so, { rr: 1 }));
    return h + "</div>";
  }

  function editHtml() {
    var d = ST.edit, h = '<div class="tm-top"><h2>' + (ST.editId ? "تعديل البطولة" : "بطولة جديدة") + '</h2><button class="chip" data-tm="cancel">إلغاء</button></div>';
    h += '<div class="cd tm-sec"><div class="ct">الأساسيات</div>' + fld("اسم البطولة", inp("name", d.name, { ph: "مثال: كأس مركز الفانتازي" })) +
      '<div class="tm-f"><span>نوع البطولة</span><div class="sg">' + [["teams", "تيمات"], ["individual", "فردي"], ["both", "تيمات + فردي"]].map(function (x) { return '<button data-tm="mode" data-a="' + x[0] + '" class="' + (d.mode === x[0] ? "on" : "") + '">' + x[1] + "</button>"; }).join("") + "</div></div>" +
      '<div class="tm-hint">' + (d.mode === "teams" ? "المتسابقين تيمات، ونقاط التيم في الجولة زي ما هي في التطبيق." : d.mode === "individual" ? "المتسابقين أعضاء (أفراد)، كل واحد بنقاطه هو." : "التيمات هي اللي بتلعب المراحل، وفي نفس الوقت فيه ترتيب أفراد تلقائي لأعضاء التيمات المشاركة.") + "</div>";
    if (d.mode !== "individual") {
      h += fld("طريقة حساب نقاط التيم في الجولة", sel("scoring.team", d.scoring.team, [["net", "نقاط التيم العادية (بكابتن التيم)"], ["avg", "متوسط نقاط الأعضاء (عادل لو عدد الأعضاء مختلف)"], ["top", "مجموع أحسن N أعضاء"]], { rr: 1 }));
      if (d.scoring.team === "top") h += fld("N = كام عضو", inp("scoring.n", d.scoring.n, { n: 1 }));
    }
    h += "</div>";
    h += '<div class="cd tm-sec"><div class="ct">المشاركين <span class="tm-pill" id="tmPc">' + d.players.length + "</span></div>" + playersHtml(d) + "</div>";
    h += '<div class="cd tm-sec"><div class="ct">المراحل</div><div class="tm-f" style="margin-top:0"><span>قوالب جاهزة (بتبدّل المراحل الحالية، وتقدر تعدّل بعدها)</span><div class="tm-row">' + TPL.map(function (x) { return '<button class="chip" data-tm="tpl" data-a="' + x[0] + '">' + x[1] + "</button>"; }).join("") + "</div></div>";
    h += d.stages.map(function (s, i) { return stageEd(d, i); }).join("");
    h += '<div class="tm-f"><span>＋ ضيف مرحلة</span><div class="tm-row">' + Object.keys(E.TYPES).map(function (k) { return '<button class="chip" data-tm="addst" data-a="' + k + '">' + E.TYPES[k] + "</button>"; }).join("") + "</div></div></div>";
    h += '<div class="tm-bar"><button class="btn b1" data-tm="save">' + (ST.busy ? "جاري الحفظ..." : "حفظ البطولة") + '</button><button class="btn b2" data-tm="cancel">إلغاء</button></div>';
    return h;
  }

  function buildCfg() {
    var d = cloneO(ST.edit), name = String(d.name || "").trim();
    if (!name) return { err: "اكتب اسم البطولة" };
    if (d.players.length < 2) return { err: "اختار متسابقين اتنين على الأقل" };
    if (!d.stages.length) return { err: "ضيف مرحلة واحدة على الأقل" };
    d.name = name;
    for (var i = 0; i < d.stages.length; i++) {
      var s = d.stages[i];
      s.name = String(s.name || "").trim() || E.TYPES[s.type];
      var g = parseGws(s.gwsTxt); delete s.gwsTxt;
      if (g.length) s.gws = g; else delete s.gws;
      if (!g.length && !num(s.startGw)) return { err: "حدد أول جولة للمرحلة " + (i + 1) + " (" + s.name + ")" };
      if (s.type === "ranking" && !g.length && num(s.endGw) < num(s.startGw)) return { err: "آخر جولة لازم تبقى بعد أول جولة في المرحلة " + (i + 1) };
      ["startGw", "gpr", "endGw", "legs", "win", "draw_pts", "loss", "margin", "carry", "groups", "rounds", "koLegs", "finalLegs", "drop"].forEach(function (k) { if (s[k] !== undefined && s[k] !== "") s[k] = Number(s[k]); else if (s[k] === "") delete s[k]; });
      if (s.src && s.src.t === "stage") ["n", "a", "b", "k", "wild", "round"].forEach(function (k) { if (s.src[k] !== undefined && s.src[k] !== "") s.src[k] = Number(s.src[k]); });
      if (s.src && s.src.t === "manual" && (s.manual || []).length < 2) return { err: "المرحلة " + (i + 1) + ": اختار متسابقين اتنين على الأقل" };
      if (s.type === "groups" && s.draw !== "manual") delete s.assign;
    }
    return { cfg: d };
  }

  /* ---------- مودالات التعديل (أدمن) ---------- */
  function findFx(res, key) {
    var out = null;
    res.stages.forEach(function (s) {
      s.rounds.forEach(function (r) { r.fixtures.forEach(function (f) { if (f.key === key) out = f; }); });
    });
    return out;
  }
  function findTie(res, key) {
    var out = null;
    res.stages.forEach(function (s) {
      if (!s.bracket) return;
      s.bracket.rounds.forEach(function (r) { r.ties.forEach(function (t) { if (t.key === key) out = t; }); });
      if (s.bracket.third && s.bracket.third.key === key) out = s.bracket.third;
    });
    return out;
  }
  function numIn(id, v) { return '<input class="tm-in" id="' + id + '" type="number" inputmode="decimal" value="' + (v == null ? "" : esc(v)) + '" placeholder="تلقائي">'; }
  function fxModal(it, res, key) {
    var f = findFx(res, key); if (!f) return;
    var ov = it.cfg.overrides[key] || {};
    ST.mod = { kind: "fx", id: it.id, keys: [key] };
    modal("<h3>تعديل نتيجة ماتش</h3><p>" + esc(nameOf(f.a)) + " × " + esc(nameOf(f.b)) + "<br>سيب الخانات فاضية والنتيجة تتحسب تلقائي من نقاط الجولة.</p>" +
      '<div class="tm-ar"><span>' + esc(nameOf(f.a)) + "</span>" + numIn("tmA0", ov.a) + '</div><div class="tm-ar"><span>' + esc(nameOf(f.b)) + "</span>" + numIn("tmB0", ov.b) + "</div>" +
      '<div class="tm-f"><span>النتيجة (لو عايز تحسمها بقرار)</span><select class="tm-in" id="tmW"><option value="">تلقائي من النقاط</option><option value="a"' + (ov.w === "a" ? " selected" : "") + ">فوز " + esc(nameOf(f.a)) + '</option><option value="b"' + (ov.w === "b" ? " selected" : "") + ">فوز " + esc(nameOf(f.b)) + '</option><option value="d"' + (ov.w === "d" ? " selected" : "") + ">تعادل</option></select></div>" +
      '<div class="ab"><button class="btn b1" data-tm="saveov">حفظ</button><button class="btn b2" data-tm="clrov">مسح التعديل</button><button class="btn b2" data-tm="close">إلغاء</button></div>');
  }
  function tieModal(it, res, key) {
    var t = findTie(res, key); if (!t) return;
    var keys = [], h = "<h3>تعديل مواجهة</h3><p>" + esc(nameOf(t.a)) + " × " + esc(nameOf(t.b)) + "</p>";
    t.legs.forEach(function (f, i) {
      var ov = it.cfg.overrides[f.key] || {}; keys.push(f.key);
      h += '<p style="margin:10px 0 0"><b>' + (t.legs.length > 1 ? "الماتش " + (i + 1) + " · " : "") + esc(gwTxt(f.gws)) + '</b></p><div class="tm-ar"><span>' + esc(nameOf(t.a)) + "</span>" + numIn("tmA" + i, ov.a) + '</div><div class="tm-ar"><span>' + esc(nameOf(t.b)) + "</span>" + numIn("tmB" + i, ov.b) + "</div>";
    });
    var ow = (it.cfg.overrides[key] || {}).w;
    keys.push(key);
    ST.mod = { kind: "tie", id: it.id, keys: keys, tie: key, n: t.legs.length };
    modal(h + '<div class="tm-f"><span>تأهل بقرار (لو عايز تحسمها)</span><select class="tm-in" id="tmW"><option value="">تلقائي</option><option value="a"' + (ow === "a" ? " selected" : "") + ">يتأهل " + esc(nameOf(t.a)) + '</option><option value="b"' + (ow === "b" ? " selected" : "") + ">يتأهل " + esc(nameOf(t.b)) + "</option></select></div>" +
      '<div class="ab"><button class="btn b1" data-tm="saveov">حفظ</button><button class="btn b2" data-tm="clrov">مسح التعديلات</button><button class="btn b2" data-tm="close">إلغاء</button></div>');
  }
  function adjModal(it, res, sid) {
    var s = res.byId[sid]; if (!s) return;
    ST.mod = { kind: "adj", id: it.id, stage: sid };
    var h = "<h3>تعديل نقاط الجدول</h3><p>رقم موجب = مكافأة، سالب = خصم. بيتحسب على نقاط الترتيب في مرحلة \"" + esc(s.name) + "\".</p>";
    s.ents.forEach(function (id, i) { h += '<div class="tm-ar"><span>' + esc(nameOf(id)) + '</span><input class="tm-in" type="number" inputmode="decimal" data-adj="' + esc(id) + '" value="' + esc(it.cfg.adj[sid + "|" + id] || "") + '" placeholder="0"></div>'; });
    modal(h + '<div class="ab"><button class="btn b1" data-tm="saveadj">حفظ</button><button class="btn b2" data-tm="close">إلغاء</button></div>');
  }
  function curItem() { return ST.cur ? itemById(ST.cur) : null; }

  /* ---------- الأحداث ---------- */
  function setField(el) {
    var p = el.getAttribute("data-tmf"), t = el.getAttribute("data-t"), v = el.type === "checkbox" ? el.checked : el.value;
    if (t === "n") v = v === "" ? "" : Number(v);
    if (el.tagName === "SELECT" && !t && /^(true|false)$/.test(v)) v = v === "true";
    setPath(ST.edit, p, v);
    if (p.split(".").pop() === "type" && p.indexOf("stages.") === 0) { var i = Number(p.split(".")[1]), o = ST.edit.stages[i], nw = newStage(v, o.id, o.startGw); nw.src = o.src; nw.seed = o.seed; nw.manual = o.manual; nw.name = (o.name === E.TYPES[o.type] || !o.name) ? E.TYPES[v] : o.name; ST.edit.stages[i] = nw; }
  }
  function rerender() { var y = window.scrollY; F.render(); window.scrollTo(0, y); }
  function savePlayers() { var el = document.getElementById("tmPc"); if (el) el.textContent = ST.edit.players.length; }

  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var t = e.target; if (!t.closest) return false;
    if (t.id === "tmModal") { closeModal(); return true; }
    var b = t.closest("[data-tm]"); if (!b) return false;
    var a = b.getAttribute("data-tm"), arg = b.getAttribute("data-a"), it = curItem(), d = ST.edit, i;
    switch (a) {
      case "open": ST.cur = arg; ST.tab = ""; F.render(); window.scrollTo(0, 0); return true;
      case "back": ST.cur = null; F.render(); return true;
      case "tab": ST.tab = arg; F.render(); return true;
      case "refresh": ST.tries = 0; loadList(); return true;
      case "jump": S.gw = S.cur; S.D = null; if (F.save) F.save(); F.render(); if (F.load) F.load(false); return true;
      case "admin": keyModal(); return true;
      case "logout": ST.admin = false; ST.key = ""; LS.del("fc_key"); F.render(); return true;
      case "savekey": {
        var k = mval("#tmKey").trim(), msg = document.getElementById("tmMsg"); if (!k) { if (msg) msg.textContent = "اكتب المفتاح الأول"; return true; }
        if (msg) msg.textContent = "بيتأكد...";
        checkKey(k).then(function (ok) { if (ok) { ST.key = k; ST.admin = true; LS.set("fc_key", k); closeModal(); F.toast("اتفعّل وضع الأدمن"); F.render(); } else if (msg) msg.textContent = "المفتاح غلط"; });
        return true;
      }
      case "close": closeModal(); return true;
      case "new": ST.edit = newDraft(); ST.editId = null; F.render(); window.scrollTo(0, 0); return true;
      case "edit": if (it) { ST.edit = cloneO(it.cfg); ST.edit.stages.forEach(function (s) { if (s.gws) s.gwsTxt = s.gws.join(","); }); ST.editId = it.id; F.render(); window.scrollTo(0, 0); } return true;
      case "cancel": ST.edit = null; ST.editId = null; F.render(); return true;
      case "dup": if (it) { var c = cloneO(it.cfg); c.name += " (نسخة)"; c.overrides = {}; c.adj = {}; post({ api: "tmSave", key: ST.key, cfg: c }).then(function (r) { F.toast((r && r.message) || "تعذّر النسخ"); if (r && r.success) loadList(); }).catch(function () { F.toast("فشل الاتصال بالسيرفر"); }); } return true;
      case "del": if (it && confirm("تمسح بطولة \"" + it.cfg.name + "\" نهائي؟")) post({ api: "tmDelete", key: ST.key, id: it.id }).then(function (r) { F.toast((r && r.message) || "تعذّر المسح"); if (r && r.success) { ST.cur = null; loadList(); } }).catch(function () { F.toast("فشل الاتصال بالسيرفر"); }); return true;
      case "redraw": if (it) { it.cfg.stages[Number(arg)].seedKey = Math.random().toString(36).slice(2, 8); persist(it, "اتعملت قرعة جديدة"); } return true;
      case "fx": { var res = it && result(it); if (res) fxModal(it, res, arg); return true; }
      case "tie": { var res2 = it && result(it); if (res2) tieModal(it, res2, arg); return true; }
      case "adj": { var res3 = it && result(it); if (res3) adjModal(it, res3, arg); return true; }
      case "saveov": {
        var M0 = ST.mod; if (!it || !M0) return true;
        var n = M0.kind === "fx" ? 1 : M0.n, w = mval("#tmW");
        for (i = 0; i < n; i++) {
          var A = mval("#tmA" + i), B = mval("#tmB" + i), o = {};
          if (A !== "" && B !== "") { o.a = Number(A); o.b = Number(B); }
          if (M0.kind === "fx" && w) o.w = w;
          if (Object.keys(o).length) it.cfg.overrides[M0.keys[i]] = o; else delete it.cfg.overrides[M0.keys[i]];
        }
        if (M0.kind === "tie") { if (w) it.cfg.overrides[M0.tie] = { w: w }; else delete it.cfg.overrides[M0.tie]; }
        closeModal(); persist(it, "اتحفظ التعديل"); return true;
      }
      case "clrov": { var M1 = ST.mod; if (!it || !M1) return true; M1.keys.forEach(function (k) { delete it.cfg.overrides[k]; }); closeModal(); persist(it, "اتمسح التعديل"); return true; }
      case "saveadj": {
        var M2 = ST.mod; if (!it || !M2) return true;
        document.querySelectorAll("#tmModal [data-adj]").forEach(function (el) { var k = M2.stage + "|" + el.getAttribute("data-adj"), v = Number(el.value); if (el.value !== "" && v) it.cfg.adj[k] = v; else delete it.cfg.adj[k]; });
        closeModal(); persist(it, "اتحفظت التعديلات"); return true;
      }
      /* الفورم */
      case "mode": if (d) { var wasInd = d.mode === "individual"; if (wasInd !== (arg === "individual") && d.players.length) { d.players = []; F.toast("اتفضّت قايمة المشاركين علشان نوع البطولة اتغيّر"); } d.mode = arg; d.stages.forEach(function (s) { if (s.src && s.src.t === "manual") s.manual = []; }); rerender(); } return true;
      case "pl": if (d) { var U = uni(), ids = d.mode === "individual" ? Object.keys(U.byT).reduce(function (x, k) { return x.concat(U.byT[k].map(function (m) { return m.id; })); }, []) : U.teams.map(function (x) { return x.id; });
        if (arg === "all") d.players = ids; else if (arg === "none") d.players = []; else if (arg.indexOf("g:") === 0) { var gn = arg.slice(2); U.teams.forEach(function (tm) { if (tm.group === gn) (d.mode === "individual" ? U.byT[tm.id].map(function (m) { return m.id; }) : [tm.id]).forEach(function (x) { if (d.players.indexOf(x) < 0) d.players.push(x); }); }); }
        rerender(); } return true;
      case "tpl": if (d) { if (d.players.length < 2) { F.toast("اختار المشاركين الأول علشان القالب يتظبط على عددهم"); return true; } if (!d.stages.length || confirm("القالب هيبدّل المراحل الحالية. تكمّل؟")) { applyTpl(d, arg); rerender(); } } return true;
      case "addst": if (d) { var id = nextId(d), start = d.stages.length ? gwEnd(d, d.stages.length - 1) + 1 : (S.cur || S.gw || 0) + 1; d.stages.push(newStage(arg, id, start)); fixAll(d); rerender(); } return true;
      case "sdel": if (d) { d.stages.splice(Number(arg), 1); fixAll(d); rerender(); } return true;
      case "sdup": if (d) { i = Number(arg); var cp = cloneO(d.stages[i]); cp.id = nextId(d); cp.name += " (نسخة)"; d.stages.splice(i + 1, 0, cp); fixAll(d); rerender(); } return true;
      case "sup": case "sdn": if (d) { i = Number(arg); var j = a === "sup" ? i - 1 : i + 1; if (j >= 0 && j < d.stages.length) { var tmp = d.stages[i]; d.stages[i] = d.stages[j]; d.stages[j] = tmp; fixAll(d); rerender(); } } return true;
      case "chain": if (d) { i = Number(arg); d.stages[i].startGw = gwEnd(d, i - 1) + 1; if (d.stages[i].type === "ranking") d.stages[i].endGw = d.stages[i].startGw + 4; rerender(); } return true;
      case "save": {
        if (!d || ST.busy) return true;
        var r0 = buildCfg(); if (r0.err) { F.toast(r0.err); return true; }
        ST.busy = true; rerender();
        post({ api: "tmSave", key: ST.key, id: ST.editId || "", cfg: r0.cfg }).then(function (r) {
          ST.busy = false;
          if (r && r.success) { var nid = r.id || ST.editId; ST.edit = null; ST.editId = null; ST.cur = nid; ST.tab = ""; F.toast(r.message || "اتحفظت"); loadList(true); }
          else { F.toast((r && r.message) || "تعذّر الحفظ"); rerender(); }
        }).catch(function () { ST.busy = false; F.toast("فشل الاتصال بالسيرفر"); rerender(); });
        return true;
      }
    }
    return false;
  };

  R.change = (function (prev) {
    return function (e) {
      if (prev) prev(e);
      var t = e.target; if (!t.getAttribute || !ST.edit || S.tab !== "tournaments") return;
      var d = ST.edit, v;
      if (t.hasAttribute("data-tmf")) { setField(t); if (t.hasAttribute("data-rr") || /\.type$/.test(t.getAttribute("data-tmf"))) { fixAll(d); rerender(); } }
      else if ((v = t.getAttribute("data-tmarr"))) {
        var arr = (function () { var a = v.split("."), c = d; for (var i = 0; i < a.length; i++) { if (c[a[i]] == null) c[a[i]] = []; c = c[a[i]]; } return c; })(), val = t.getAttribute("data-v"), ix = arr.indexOf(val);
        if (t.checked && ix < 0) arr.push(val); else if (!t.checked && ix > -1) arr.splice(ix, 1);
      } else if ((v = t.getAttribute("data-tmpl"))) {
        var k = d.players.indexOf(v); if (t.checked && k < 0) d.players.push(v); else if (!t.checked && k > -1) d.players.splice(k, 1); savePlayers();
      } else if ((v = t.getAttribute("data-tmteam"))) {
        var L = uni().byT[v] || []; L.forEach(function (m) { var k2 = d.players.indexOf(m.id); if (t.checked && k2 < 0) d.players.push(m.id); else if (!t.checked && k2 > -1) d.players.splice(k2, 1); }); rerender();
      } else if ((v = t.getAttribute("data-tmassign"))) {
        var p = v.split("|"), si = Number(p[0]), id = p.slice(1).join("|"), st = d.stages[si], ents = (st.src && st.src.t === "manual") ? (st.manual || []) : d.players, G = Math.max(1, num(st.groups) || 2), as = [];
        for (var g = 0; g < G; g++) as.push([]);
        ents.forEach(function (x) { var cur = 0; (st.assign || []).forEach(function (a2, gi) { if (a2.indexOf(x) > -1) cur = gi; }); if (x === id) cur = Number(t.value); as[Math.min(cur, G - 1)].push(x); });
        st.assign = as;
      }
    };
  })(R.change);

  R.input = (function (prev) {
    return function (e) {
      if (prev) prev(e);
      var t = e.target; if (!t.getAttribute) return;
      if (t.hasAttribute("data-tmsearch")) {
        var q = t.value.trim().toLowerCase();
        document.querySelectorAll(".tm-pr").forEach(function (r) { r.style.display = !q || (r.getAttribute("data-s") || "").indexOf(q) > -1 ? "" : "none"; });
        return;
      }
      if (ST.edit && S.tab === "tournaments" && t.hasAttribute("data-tmf") && (t.type === "text" || t.type === "number")) setField(t);
    };
  })(R.input);

  /* ---------- ربط التبويب ---------- */
  R.tabs.push({ id: "tournaments", name: "البطولات" });
  var _title = R.title;
  R.title = function (t) { return t === "tournaments" ? "البطولات" : (_title ? _title(t) : null); };
  R.views.tournaments = function () {
    if (ST.edit) return editHtml();
    if (ST.cur) { var it = curItem(); if (it) return viewOne(it); if (ST.items) ST.cur = null; }
    return viewList();
  };
  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var on = S.tab === "tournaments";
    if (on && !wasOn) { ST.tries = 0; loadList(!!ST.items); }
    if (!on && wasOn) closeModal();
    wasOn = on;
  };
})();
