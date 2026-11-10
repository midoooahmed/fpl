/* season.js - إحصائيات الموسم: تبويبين (تيمات / فردي) وكل واحد بطاقات + جدول كامل زي باقي التطبيق
   البيانات: سجل الجولات اللي الـ API بيرجّعه (?api=history) + الجولة الحالية (لايف).
   نقاط الدكة وعدد التحويلات بتيجي من Stats.gs المحدّث (لو لسه ماتحدّثش بتظهر "–").
   الكروت بتتبني بالتدريج (نفس نظام plus.js) عشان الموبايل مايبجّش. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc, WM = F.WM, PL = window.__plus || {}, LZ = PL.lz || null, GRID = window.__grid;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var CHIPS = { wildcard: "وايلد كارد", freehit: "فري هيت", "3xc": "تربل كابتن", bboost: "بنش بوست" };
  function num(x) { return Number(x) || 0; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function sgn(v) { return (v > 0 ? "+" : "") + v; }
  function mut() { return '<span class="mut">–</span>'; }
  function act(a, arg) { return ' data-act="' + a + '" data-arg="' + esc(arg) + '"'; }
  function card(cls, title, body) { return F.card(title, '<div class="ct">' + title + "</div>" + body, "plus " + cls); }
  function li(attrs, name, small, v, vcls) {
    return '<div class="li click"' + attrs + '><div class="grow"><b>' + name + "</b><small>" + small + '</small></div><div class="v ' + (vcls || "") + '">' + v + "</div></div>";
  }
  function table(head, rows, cls) {
    return '<div class="tbl-sc"><table class="mini-t ' + (cls || "") + '"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }
  function fmt(n) { try { return Number(n).toLocaleString("ar-EG"); } catch (e) { return String(n); } }
  function who(X) { return esc(X.m.person) + " (" + esc(X.m.team) + ")"; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + f(x); }, 0); }

  (function () {
    var st = document.createElement("style"); st.id = "seasonCss";
    st.textContent = ".sm-gwt td:first-child,.sm-gwt th:first-child{position:sticky;inset-inline-start:0;background:var(--s1);z-index:1}" +
      ".sm-note{font-size:12.5px;color:var(--mu);line-height:1.7}.sm-note b{color:var(--tx)}" +
      ".hs.h3{grid-template-columns:repeat(3,1fr)}.hs.h2{margin-top:6px}";
    document.head.appendChild(st);
  })();

  /* ---------- السجل: من plus.js لو موجود، وإلا بنجيبه إحنا ---------- */
  var OWN = null, OWNGW = 0;
  function hist() { return PL.HISTf ? PL.HISTf() : OWN; }
  if (!PL.HISTf) {
    R.hooks.afterLoad.push(function () {
      var gw = S.gw; if (OWNGW === gw) return; OWNGW = gw; OWN = null;
      F.api({ api: "history", gw: gw }).then(function (h) {
        if (S.gw === gw) { OWN = (!h || h.success === false) ? {} : h; if (S.tab === "season_t" || S.tab === "season_m") F.render(); }
      }).catch(function () { OWN = {}; });
    });
  }

  /* ---------- كباتن التيمات لكل جولة (Captain.gs) ---------- */
  var CAPS = null, CAPV = 0, CAPREQ = 0, AUTOFROM = 0, AUTOMAP = {};
  function loadCaps() {
    if (CAPREQ) return; CAPREQ = 1;
    F.api({ api: "capHistory" }).then(function (r) {
      if (r && r.success) { CAPS = r.caps || {}; AUTOFROM = Number(r.autoFrom) || 0; CAPV++; MC.sig = ""; if (S.tab === "season_t" || S.tab === "season_m") F.render(); }
    }).catch(function () {});
  }
  R.hooks.afterLoad.push(function () { CAPREQ = 0; });
  /* الكابتن اللي التيم اختاره في الجولة دي، ولو ماكبتنش بنرجع للعلامة اليدوية */
  function isCapAt(m, g) {
    var P = CAPS && CAPS[g], key = m.team + "|" + m.contest;
    if (P && P[key] !== undefined) return String(P[key]) === String(m.entryId);
    /* مفيش اختيار: الكابتن التلقائي (أضعف عضو في الجولة) لو شغال من الجولة دي */
    if (AUTOFROM > 0 && g >= AUTOFROM && m.capMult > 1) return !!(AUTOMAP[g] && AUTOMAP[g][key] === String(m.entryId));
    return m.manualCap !== undefined ? !!m.manualCap : !!m.isCaptain;
  }

  /* ---------- الموديل ---------- */
  var MC = { d: null, sig: "", m: null };
  function sigOf(wm, H) {
    var h = 0, u = wm.map(function (m) { return m.uid; }).join(",");
    for (var i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
    return [S.gw, S.D.live ? S.D.live.updatedAt : 0, S.F.capTeam ? 1 : 0, wm.length, h, Object.keys(H).length, CAPV, AUTOFROM].join("|");
  }
  function model() {
    var H = hist(); if (!H) return null;
    var wm = WM(), sig = sigOf(wm, H);
    if (MC.d === S.D && MC.sig === sig) return MC.m;
    var cur = S.gw, g;
    var have = Object.keys(H).map(Number).filter(function (x) { return x >= 1 && x < cur && H[x]; }).sort(function (a, b) { return a - b; });
    var curOk = !!(S.D.live || wm.some(function (m) { return m.points > 0; }));
    var gws = have.slice(); if (curOk) gws.push(cur);
    var missing = []; for (g = 1; g < cur; g++) if (have.indexOf(g) < 0) missing.push(g);
    var capTeam = S.F.capTeam, hasBench = false, hasTr = false;

    var MR = wm.map(function (m) {
      var ser = gws.map(function (gg) {
        if (gg === cur && curOk) {
          return { g: gg, pts: num(m.d.points), cost: num(m.cost), net: num(m.d.net), chip: m.chip || "", value: m.value, bench: num(m.d.benchPts), ntr: (m.transfers || []).length,
            rank: (m.orank === "" || m.orank == null) ? null : Number(m.orank) };
        }
        var r = H[gg] && H[gg][m.entryId];
        if (!r) return null;
        if (r[5] != null) hasBench = true;
        if (r[6] != null) hasTr = true;
        return { g: gg, pts: num(r[0]), cost: num(r[1]), net: num(r[0]) - num(r[1]), chip: r[3] || "", value: num(r[2]), bench: r[5] == null ? null : num(r[5]), ntr: r[6] == null ? null : num(r[6]),
          rank: (r[4] === "" || r[4] == null) ? null : Number(r[4]) };
      });
      var X = { m: m, ser: ser, n: 0, total: 0, pts: 0, hits: 0, hitGws: 0, bench: 0, benchN: 0, ntr: 0, best: null, worst: null, sd: 0, avg: 0, last5: null, chips: [], v0: null, v1: null, r0: null, r1: null };
      var pl = ser.filter(Boolean);
      X.n = pl.length;
      pl.forEach(function (e) {
        X.total += e.net; X.pts += e.pts; X.hits += e.cost; if (e.cost > 0) X.hitGws++;
        if (e.bench != null) { X.bench += e.bench; X.benchN++; }
        if (e.ntr != null) X.ntr += e.ntr;
        if (e.chip) X.chips.push({ g: e.g, chip: e.chip });
        if (!X.best || e.net > X.best.net) X.best = e;
        if (!X.worst || e.net < X.worst.net) X.worst = e;
        if (e.value > 0) { if (X.v0 == null) X.v0 = e.value; X.v1 = e.value; }
        if (e.rank != null) { if (X.r0 == null) X.r0 = e.rank; X.r1 = e.rank; }
      });
      if (X.n) {
        X.avg = X.total / X.n;
        X.sd = Math.sqrt(sum(pl, function (e) { return (e.net - X.avg) * (e.net - X.avg); }) / X.n);
        var l5 = pl.slice(-5); X.last5 = sum(l5, function (e) { return e.net; }) / l5.length;
      }
      return X;
    });

    AUTOMAP = {};
    if (AUTOFROM > 0) {
      var grp = {};
      MR.forEach(function (X) { if (X.m.capMult > 1) { var gk = X.m.team + "|" + X.m.contest; (grp[gk] = grp[gk] || []).push(X); } });
      gws.forEach(function (gg, j) {
        if (gg < AUTOFROM) return;
        Object.keys(grp).forEach(function (gk) {
          var P = CAPS && CAPS[gg]; if (P && P[gk] !== undefined) return;
          var low = null;
          grp[gk].forEach(function (X) {
            var e = X.ser[j]; if (!e) return;
            if (!low || e.net < low.e.net || (e.net === low.e.net && String(X.m.entryId) < String(low.X.m.entryId))) low = { X: X, e: e };
          });
          if (low) (AUTOMAP[gg] = AUTOMAP[gg] || {})[gk] = String(low.X.m.entryId);
        });
      });
    }
    var T = {};
    MR.forEach(function (X) {
      var m = X.m;
      var t = T[m.team] || (T[m.team] = { team: m.team, n: 0, per: gws.map(function () { return null; }), pts: 0, hits: 0, bench: 0, benchN: 0, ntr: 0, chips: 0, mg: 0 });
      t.n++;
      X.ser.forEach(function (e, j) {
        if (!e) return;
        var k = capTeam && isCapAt(m, gws[j]) ? (m.capMult || 1) : 1;
        t.per[j] = (t.per[j] || 0) + e.net * k; t.pts += e.pts * k; t.hits += e.cost * k; t.mg++;
        if (e.bench != null) { t.bench += e.bench; t.benchN++; }
        if (e.ntr != null) t.ntr += e.ntr;
        if (e.chip) t.chips++;
      });
    });
    var TL = Object.keys(T).map(function (k) {
      var t = T[k], tot = 0, gp = 0, cum = [], run = 0, vals = [];
      t.per.forEach(function (v, j) {
        if (v != null) { tot += v; gp++; run += v; vals.push(v); if (!t.best || v > t.best.v) t.best = { g: gws[j], v: v }; if (!t.worst || v < t.worst.v) t.worst = { g: gws[j], v: v }; }
        cum.push(run);
      });
      t.total = tot; t.gp = gp; t.avg = gp ? tot / gp : 0; t.cum = cum; t.lead = 0;
      t.avgM = t.mg ? tot / t.mg : 0;
      t.sd = gp ? Math.sqrt(sum(vals, function (v) { return (v - t.avg) * (v - t.avg); }) / gp) : 0;
      return t;
    }).sort(function (a, b) { return b.total - a.total; });
    if (TL.length > 1) {
      gws.forEach(function (gg, j) {
        var b = null;
        TL.forEach(function (t) { if (t.per[j] != null && (!b || t.per[j] > b.per[j])) b = t; });
        if (b) b.lead++;
      });
    }

    var gwAvg = gws.map(function (gg, j) {
      var s = 0, n = 0; MR.forEach(function (X) { var e = X.ser[j]; if (e) { s += e.net; n++; } });
      return n ? s / n : 0;
    });
    var all = []; MR.forEach(function (X) { X.ser.forEach(function (e) { if (e) all.push({ X: X, e: e }); }); });
    var top = all.slice().sort(function (a, b) { return b.e.net - a.e.net; }).slice(0, 5);
    var low = all.slice().sort(function (a, b) { return a.e.net - b.e.net; }).slice(0, 5);
    var tAll = []; TL.forEach(function (t) { t.per.forEach(function (v, j) { if (v != null) tAll.push({ t: t, g: gws[j], v: v }); }); });
    var tTop = tAll.slice().sort(function (a, b) { return b.v - a.v; }).slice(0, 5), tLow = tAll.slice().sort(function (a, b) { return a.v - b.v; }).slice(0, 5);
    var overall = all.length ? sum(all, function (x) { return x.e.net; }) / all.length : 0;
    var byTotal = MR.slice().sort(function (a, b) { return b.total - a.total; });
    var M = { gws: gws, missing: missing, curOk: curOk, MR: MR, TL: TL, gwAvg: gwAvg, top: top, low: low, tTop: tTop, tLow: tLow, overall: overall, byTotal: byTotal, hasBench: hasBench, hasTr: hasTr };
    MC = { d: S.D, sig: sig, m: M };
    return M;
  }

  /* للبطولات (tournaments.js): نفس الموديل بس من غير فلاتر التطبيق (مجموعة/مسابقة/بحث) عشان البطولة تحسب كل التيمات */
  window.__season = {
    full: function () {
      var f = S.F, g = f.groups, c = f.contests, q = f.q;
      f.groups = []; f.contests = []; f.q = "";
      try { return model(); } finally { f.groups = g; f.contests = c; f.q = q; }
    }
  };

  /* ---------- كروت التيمات ---------- */
  function noteHtml(M) {
    return '<div class="sm-note" style="margin:6px 2px 0">الأرقام محسوبة على <b>' + M.gws.length + "</b> " + (M.gws.length === 1 ? "جولة" : "جولات") +
      " (من ج" + M.gws[0] + " لحد ج" + M.gws[M.gws.length - 1] + ")" + (M.curOk ? "، وآخر جولة هي الجولة الحالية بنقاطها اللايف" : "") + "." +
      (M.missing.length ? " جولات ناقصة من السجل: <b>" + M.missing.join("، ") + "</b> - افتحها مرة من اختيار الجولة عشان تتسجل." : "") +
      (!M.hasBench ? " نقاط الدكة وعدد التحويلات للجولات القديمة محتاجة تحديث Stats.gs." : "") + "</div>";
  }
  function teamCards(M) {
    return '<div class="sm-teams">' + M.TL.map(function (t, i) {
      var benchTxt = M.hasBench ? t.bench : "–";
      return '<div class="cd act ' + (i === 0 ? "f1" : "") + '"' + act("t", t.team) + '><div style="display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center"><span class="rk n">' + (i + 1) + "</span><div><b>" + esc(t.team) +
        '</b><small class="mut" style="display:block;font-size:12px">' + t.n + " أعضاء · " + t.gp + " جولة · " + t.lead + ' جولة في الصدارة</small></div><b class="n" style="font-size:22px">' + t.total + "</b></div>" +
        '<div class="hs"><div><b class="n">' + t.pts + "</b><small>النقاط</small></div><div><b class=\"n\">" + t.hits + "</b><small>السوالب</small></div><div><b class=\"n\">" + benchTxt + "</b><small>نقاط الدكة</small></div><div><b class=\"n\">" + r1(t.avg) + "</b><small>متوسط/جولة</small></div></div>" +
        '<div class="hs h3 h2"><div><b class="n">' + (t.best ? t.best.v : "–") + "</b><small>أحسن جولة" + (t.best ? " (ج" + t.best.g + ")" : "") + '</small></div><div><b class="n">' + (t.worst ? t.worst.v : "–") + "</b><small>أسوأ جولة" + (t.worst ? " (ج" + t.worst.g + ")" : "") + '</small></div><div><b class="n">' + t.chips + "</b><small>خواص اتلعبت</small></div></div></div>";
    }).join("") + "</div>";
  }
  function cardTHead(M) {
    var lead = M.TL[0], bt = M.tTop[0], bch = M.TL.slice().sort(function (a, b) { return b.bench - a.bench; })[0], bh = M.TL.slice().sort(function (a, b) { return b.hits - a.hits; })[0];
    var t = function (l, v, sub, a) { return '<div class="tile' + (a ? " click" : "") + '"' + (a || "") + "><span>" + l + "</span><b>" + v + "</b><small><em>" + sub + "</em></small></div>"; };
    return card("ov-full", "🏆 ملخص التيمات في الموسم", '<div class="plus-tiles">' +
      t("جولات محسوبة", M.gws.length, "من ج" + M.gws[0] + " لحد ج" + M.gws[M.gws.length - 1]) +
      (lead ? t("👑 متصدر الموسم", esc(lead.team), lead.total + " نقطة", act("t", lead.team)) : "") +
      (bt ? t("🚀 أعلى جولة", bt.v, esc(bt.t.team) + " · ج" + bt.g, act("t", bt.t.team)) : "") +
      (M.hasBench && bch && bch.bench > 0 ? t("🪑 أكتر دكة", bch.bench, esc(bch.team), act("t", bch.team)) : "") +
      (bh && bh.hits > 0 ? t("💸 أكتر سوالب", "-" + bh.hits, esc(bh.team), act("t", bh.team)) : "") + "</div>");
  }
  function cardRace(M) {
    var T = M.TL.slice(0, 6), n = M.gws.length;
    if (T.length < 2 || n < 2) return "";
    var W = 320, H = 150, mx = 1, mn = 0;
    T.forEach(function (t) { t.cum.forEach(function (v) { if (v > mx) mx = v; if (v < mn) mn = v; }); });
    var cols = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
    var lines = T.map(function (t, k) {
      var pts = t.cum.map(function (v, i) { return (10 + i / (n - 1) * (W - 20)).toFixed(1) + "," + (H - 14 - (v - mn) / (mx - mn || 1) * (H - 28)).toFixed(1); }).join(" ");
      return '<polyline fill="none" stroke="' + cols[k] + '" stroke-width="2.4" stroke-linejoin="round" points="' + pts + '"/>';
    }).join("");
    var axis = '<text x="10" y="' + (H - 2) + '" font-size="10" fill="currentColor" opacity=".6">ج' + M.gws[0] + '</text><text x="' + (W - 10) + '" y="' + (H - 2) + '" font-size="10" text-anchor="end" fill="currentColor" opacity=".6">ج' + M.gws[n - 1] + "</text>";
    var lg = T.map(function (t, k) { return '<span><b style="background:' + cols[k] + '"></b>' + esc(t.team) + " " + t.total + "</span>"; }).join("");
    return card("ov-full", "📈 سباق الموسم (التراكمي لأحسن 6 تيمات)", '<div style="direction:ltr"><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto">' + lines + axis + '</svg></div><div class="lg">' + lg + "</div>");
  }
  function cardGwTable(M) {
    var colMax = M.gws.map(function (g, j) { var b = null; M.TL.forEach(function (t) { if (t.per[j] != null && (b == null || t.per[j] > b)) b = t.per[j]; }); return b; });
    var rows = M.TL.map(function (t) {
      return '<tr class="click"' + act("t", t.team) + "><td><b>" + esc(t.team) + "</b></td>" + t.per.map(function (v, j) {
        return v == null ? "<td>" + mut() + "</td>" : "<td" + (v === colMax[j] && M.TL.length > 1 ? ' class="pos"' : "") + ">" + v + "</td>";
      }).join("") + "<td><b>" + t.total + "</b></td></tr>";
    });
    return card("ov-full", "🗓️ جدول الجولات للتيمات", table(["التيم"].concat(M.gws.map(function (g) { return "ج" + g; })).concat(["المجموع"]), rows, "sm-gwt") + '<div class="lg"><span>الأخضر = أعلى تيم في الجولة دي.</span></div>');
  }
  function cardTBW(M) {
    var row = function (x, cls) { return li(act("t", x.t.team), esc(x.t.team), "ج" + x.g, x.v, cls); };
    return card("ov-half", "🔥 أحسن وأسوأ جولات التيمات",
      '<div class="sub-h">أعلى 5 جولات</div>' + M.tTop.map(function (x) { return row(x, "pos"); }).join("") +
      '<div class="sub-h">أقل 5 جولات</div>' + M.tLow.map(function (x) { return row(x, "neg"); }).join(""));
  }
  function cardTBench(M) {
    if (!M.hasBench) return card("ov-half", "🪑 نقاط الدكة (تيمات)", '<p class="mut">محتاج تحديث Stats.gs عشان نقاط الدكة للجولات القديمة تظهر.</p>');
    var L = M.TL.slice().sort(function (a, b) { return b.bench - a.bench; });
    return card("ov-half", "🪑 نقاط الدكة في الموسم (تيمات)", L.map(function (t) { return li(act("t", t.team), esc(t.team), "متوسط " + r1(t.benchN ? t.bench / t.benchN : 0) + " للعضو في الجولة", t.bench, ""); }).join(""));
  }
  function cardTHits(M) {
    var L = M.TL.slice().sort(function (a, b) { return b.hits - a.hits; }), tot = sum(L, function (t) { return t.hits; });
    if (!tot) return card("ov-half", "💸 السوالب (تيمات)", '<p class="mut">محدش ضرب هيت لحد دلوقتي 👌</p>');
    return card("ov-half", "💸 السوالب في الموسم (تيمات)", '<div class="lg" style="margin:0 0 4px"><span>إجمالي السوالب: <b>-' + tot + "</b></span></div>" + L.map(function (t) { return li(act("t", t.team), esc(t.team), "نقاط ضاعت في هيتات", "-" + t.hits, "neg"); }).join(""));
  }
  function cardTCons(M) {
    var L = M.TL.filter(function (t) { return t.gp >= Math.min(3, M.gws.length); });
    if (L.length < 2) return "";
    L = L.slice().sort(function (a, b) { return a.sd - b.sd; });
    var row = function (t) { return li(act("t", t.team), esc(t.team), "متوسط " + r1(t.avg) + " · انحراف " + r1(t.sd), r1(t.sd), ""); };
    return card("ov-half", "🧘 ثبات التيمات", '<div class="sub-h">الأكتر ثباتًا</div>' + L.slice(0, 3).map(row).join("") + '<div class="sub-h">الأكتر تذبذبًا</div>' + L.slice(-3).reverse().map(row).join(""));
  }

  /* ---------- كروت الأعضاء ---------- */
  var SMORE = { m: 20 };
  function cardMembers(M) {
    var L = M.byTotal, shown = L.slice(0, SMORE.m);
    var cards = shown.map(function (X, i) {
      return '<div class="cd act ' + (i === 0 ? "f1" : "") + '"' + act("m", X.m.uid) + '><div style="display:grid;grid-template-columns:34px 1fr auto;gap:12px;align-items:center"><span class="rk n">' + (i + 1) + "</span><div><b>" + esc(X.m.person) +
        "</b>" + (X.m.isCaptain && S.F.capTeam && X.m.capMult > 1 ? ' <span class="chip ac">كابتن ×' + X.m.capMult + "</span>" : "") + '<small class="mut" style="display:block;font-size:12px">' + esc(X.m.team) + " · " + X.n + ' جولة</small></div><b class="n" style="font-size:22px">' + X.total + "</b></div>" +
        '<div class="hs"><div><b class="n">' + X.pts + "</b><small>النقاط</small></div><div><b class=\"n\">" + X.hits + "</b><small>السوالب</small></div><div><b class=\"n\">" + (X.benchN ? X.bench : "–") + "</b><small>نقاط الدكة</small></div><div><b class=\"n\">" + (X.n ? r1(X.avg) : "–") + "</b><small>متوسط/جولة</small></div></div>" +
        '<div class="hs h3 h2"><div><b class="n">' + (X.best ? X.best.net : "–") + "</b><small>أحسن جولة" + (X.best ? " (ج" + X.best.g + ")" : "") + '</small></div><div><b class="n">' + (X.worst ? X.worst.net : "–") + "</b><small>أسوأ جولة" + (X.worst ? " (ج" + X.worst.g + ")" : "") + '</small></div><div><b class="n">' + X.chips.length + "</b><small>خواص اتلعبت</small></div></div></div>";
    }).join("");
    var more = L.length > shown.length ? '<button type="button" class="btn b2" data-sm="more" style="width:100%;margin-top:8px">عرض المزيد (' + (L.length - shown.length) + " متبقي)</button>" : "";
    return '<div class="sm-members">' + cards + more + "</div>";
  }
  function cardMHead(M) {
    var topM = M.byTotal[0], bs = M.top[0];
    var bb = M.hasBench ? M.MR.slice().sort(function (a, b) { return b.bench - a.bench; })[0] : null;
    var bh = M.MR.slice().sort(function (a, b) { return b.hits - a.hits; })[0];
    var t = function (l, v, sub, a) { return '<div class="tile' + (a ? " click" : "") + '"' + (a || "") + "><span>" + l + "</span><b>" + v + "</b><small><em>" + sub + "</em></small></div>"; };
    return card("ov-full", "🏆 ملخص الأعضاء في الموسم", '<div class="plus-tiles">' +
      t("جولات محسوبة", M.gws.length, "من ج" + M.gws[0] + " لحد ج" + M.gws[M.gws.length - 1]) +
      (topM ? t("🥇 متصدر الأعضاء", esc(topM.m.person), topM.total + " نقطة · " + esc(topM.m.team), act("m", topM.m.uid)) : "") +
      (bs ? t("🔥 أعلى جولة", bs.e.net, esc(bs.X.m.person) + " · ج" + bs.e.g, act("m", bs.X.m.uid)) : "") +
      (bb && bb.bench > 0 ? t("🪑 أكتر دكة", bb.bench, esc(bb.m.person), act("m", bb.m.uid)) : "") +
      (bh && bh.hits > 0 ? t("💸 أكتر سوالب", "-" + bh.hits, esc(bh.m.person), act("m", bh.m.uid)) : "") +
      t("متوسط العضو في الجولة", r1(M.overall), "صافي بعد السوالب") + "</div>");
  }
  function cardBestWorst(M) {
    var row = function (x, cls) { return li(act("m", x.X.m.uid), esc(x.X.m.person), esc(x.X.m.team) + " · ج" + x.e.g, x.e.net, cls); };
    return card("ov-half", "🔥 أحسن وأسوأ جولات في الموسم",
      '<div class="sub-h">أعلى 5 جولات</div>' + M.top.map(function (x) { return row(x, "pos"); }).join("") + '<div class="sub-h">أقل 5 جولات</div>' + M.low.map(function (x) { return row(x, "neg"); }).join(""));
  }
  function cardConsistency(M) {
    var min = Math.min(4, M.gws.length), L = M.MR.filter(function (X) { return X.n >= min; });
    if (L.length < 2) return "";
    L = L.slice().sort(function (a, b) { return a.sd - b.sd; });
    var row = function (X) { return li(act("m", X.m.uid), who(X), "متوسط " + r1(X.avg) + " · انحراف " + r1(X.sd), r1(X.sd), ""); };
    return card("ov-half", "🧘 الثبات والتذبذب", '<div class="sub-h">الأكتر ثباتًا (انحراف أقل)</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">الأكتر تذبذبًا</div>' + L.slice(-4).reverse().map(row).join(""));
  }
  function cardForm(M) {
    var min = Math.min(6, M.gws.length), L = M.MR.filter(function (X) { return X.n >= min && X.last5 != null; });
    if (L.length < 2) return "";
    L = L.map(function (X) { return { X: X, d: r1(X.last5 - X.avg) }; }).sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "آخر 5 جولات: " + r1(x.X.last5) + " · الموسم: " + r1(x.X.avg), sgn(x.d), x.d > 0 ? "pos" : x.d < 0 ? "neg" : ""); };
    return card("ov-half", "📊 الفورم (آخر 5 جولات مقابل متوسط الموسم)", '<div class="sub-h">طالعين</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">نازلين</div>' + L.slice(-4).reverse().map(row).join(""));
  }
  function cardBench(M) {
    if (!M.hasBench) return card("ov-half", "🪑 الدكة السودا (موسم)", '<p class="mut">محتاج تحديث Stats.gs عشان نقاط الدكة للجولات القديمة تظهر.</p>');
    var L = M.MR.filter(function (X) { return X.bench > 0; }).sort(function (a, b) { return b.bench - a.bench; });
    if (!L.length) return "";
    return card("ov-half", "🪑 الدكة السودا (نقاط ضاعت على الدكة)", L.slice(0, 8).map(function (X) { return li(act("m", X.m.uid), who(X), "متوسط " + r1(X.bench / (X.benchN || 1)) + " في الجولة", X.bench, "neg"); }).join(""));
  }
  function cardMe(M) {
    var id = LS.get("shwayaMe"), X = id ? M.MR.filter(function (x) { return x.m.entryId === id; })[0] : null;
    if (!X) return card("ov-half", "🙋 أنت في الموسم", '<p class="mut">اختار نفسك من كارت "أنت وهم" في تبويب التحليلات وهتظهرلك إحصائياتك هنا.</p>');
    var rank = M.byTotal.indexOf(X) + 1, lead = M.byTotal[0], n = M.gws.length;
    var W = 320, H = 100, mx = 1, mn = 0;
    X.ser.forEach(function (e) { if (e && e.net > mx) mx = e.net; if (e && e.net < mn) mn = e.net; });
    M.gwAvg.forEach(function (v) { if (v > mx) mx = v; if (v < mn) mn = v; });
    var bw = (W - 20) / n, y = function (v) { return H - 14 - (v - mn) / (mx - mn || 1) * (H - 28); };
    var bars = X.ser.map(function (e, i) { return e ? '<rect x="' + (10 + i * bw + bw * 0.15).toFixed(1) + '" y="' + Math.min(y(e.net), y(0)).toFixed(1) + '" width="' + (bw * 0.7).toFixed(1) + '" height="' + Math.max(1, Math.abs(y(e.net) - y(0))).toFixed(1) + '" rx="2" fill="var(--ac)"/>' : ""; }).join("");
    var line = '<polyline fill="none" stroke="currentColor" opacity=".55" stroke-width="1.6" stroke-dasharray="4 3" points="' + M.gwAvg.map(function (v, i) { return (10 + i * bw + bw / 2).toFixed(1) + "," + y(v).toFixed(1); }).join(" ") + '"/>';
    return card("ov-half", "🙋 أنت في الموسم",
      '<div class="lg"><span>ترتيبك: <b>' + rank + " من " + M.MR.length + "</b></span><span>مجموعك: <b>" + X.total + "</b></span><span>متوسطك: <b>" + (X.n ? r1(X.avg) : "–") + "</b></span><span>عن المتصدر: <b>" + (rank > 1 ? "-" + (lead.total - X.total) : "👑") + "</b></span>" +
      (X.best ? "<span>أحسن جولة: <b>" + X.best.net + " (ج" + X.best.g + ")</b></span>" : "") + (X.worst ? "<span>أسوأ جولة: <b>" + X.worst.net + " (ج" + X.worst.g + ")</b></span>" : "") + "</div>" +
      '<div style="direction:ltr;margin-top:8px"><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto">' + bars + line + "</svg></div>" +
      '<div class="lg"><span>الأعمدة = صافيك في كل جولة · الخط المتقطع = متوسط الأعضاء.</span></div>');
  }
  function cardChips(M) {
    var by = {}, plain = { s: 0, n: 0 };
    M.MR.forEach(function (X) {
      X.ser.forEach(function (e) {
        if (!e) return;
        if (!e.chip) { plain.s += e.net; plain.n++; return; }
        var c = by[e.chip] || (by[e.chip] = { n: 0, s: 0, best: null });
        c.n++; c.s += e.net;
        if (!c.best || e.net > c.best.e.net) c.best = { X: X, e: e };
      });
    });
    var avgPlain = plain.n ? plain.s / plain.n : 0, keys = Object.keys(by);
    if (!keys.length) return card("ov-half", "🃏 الخواص في الموسم", '<p class="mut">محدش لعب خاصية في الجولات المحسوبة.</p>');
    var rows = keys.sort(function (a, b) { return by[b].n - by[a].n; }).map(function (k) {
      var c = by[k], a = c.s / c.n, d = r1(a - avgPlain);
      return "<tr><td><b>" + esc(CHIPS[k] || k) + "</b></td><td>" + c.n + "</td><td>" + r1(a) + '</td><td><span class="' + (d > 0 ? "pos" : d < 0 ? "neg" : "mut") + '">' + sgn(d) + "</span></td><td>" + esc(c.best.X.m.person) + " (" + c.best.e.net + " · ج" + c.best.e.g + ")</td></tr>";
    });
    return card("ov-half", "🃏 الخواص في الموسم", table(["الخاصية", "مرات", "متوسط الصافي", "عن الجولة العادية", "أحسن استخدام"], rows) + '<div class="lg"><span>متوسط الجولة من غير خاصية: <b>' + r1(avgPlain) + "</b></span></div>");
  }
  function cardHits(M) {
    var L = M.MR.filter(function (X) { return X.hits > 0; }).sort(function (a, b) { return b.hits - a.hits; }), tot = sum(M.MR, function (X) { return X.hits; });
    if (!L.length) return card("ov-half", "💸 السوالب في الموسم", '<p class="mut">محدش ضرب هيت لحد دلوقتي 👌</p>');
    return card("ov-half", "💸 السوالب في الموسم", '<div class="lg" style="margin:0 0 4px"><span>إجمالي السوالب: <b>-' + tot + "</b></span></div>" +
      L.slice(0, 8).map(function (X) { return li(act("m", X.m.uid), who(X), X.hitGws + " جولة فيها هيت · صافي الموسم " + X.total, "-" + X.hits, "neg"); }).join(""));
  }
  function cardRank(M) {
    var L = M.MR.filter(function (X) { return X.r0 != null && X.r1 != null && X.r0 !== X.r1; }).map(function (X) { return { X: X, d: X.r0 - X.r1 }; });
    if (L.length < 2) return "";
    L.sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "من " + fmt(x.X.r0) + " إلى " + fmt(x.X.r1), (x.d > 0 ? "▲ " : "▼ ") + fmt(Math.abs(x.d)), x.d > 0 ? "pos" : "neg"); };
    return card("ov-half", "🌍 الترتيب العالمي (من أول جولة محسوبة لدلوقتي)", '<div class="sub-h">أحسن صعود</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">أكبر هبوط</div>' + L.slice(-4).reverse().map(row).join(""));
  }
  function cardValue(M) {
    var L = M.MR.filter(function (X) { return X.v0 != null && X.v1 != null; }).map(function (X) { return { X: X, d: r1(X.v1 - X.v0) }; });
    if (L.length < 2) return "";
    L.sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "من " + r1(x.X.v0) + " إلى " + r1(x.X.v1), sgn(x.d), x.d > 0 ? "pos" : x.d < 0 ? "neg" : ""); };
    return card("ov-half", "💰 نمو قيمة الفريق", '<div class="sub-h">أكتر زيادة</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">أقل زيادة</div>' + L.slice(-4).reverse().map(row).join(""));
  }

  /* ---------- الجداول الكاملة (نفس محرك جداول التطبيق) ---------- */
  function col(k, l, v, o) { var c = { k: k, l: l, v: v, num: true }; if (o) for (var q in o) c[q] = o[q]; return c; }
  function teamTable(M) {
    var rk = {}; M.TL.forEach(function (t, i) { rk[t.team] = i + 1; });
    var cols = [
      col("rank", "الترتيب", function (t) { return rk[t.team]; }),
      col("team", "التيم", function (t) { return t.team; }, { num: false }),
      col("n", "الأعضاء", function (t) { return t.n; }, { tot: 1 }),
      col("gp", "الجولات", function (t) { return t.gp; }),
      col("total", "الصافي", function (t) { return t.total; }, { tot: 1 }),
      col("pts", "النقاط", function (t) { return t.pts; }, { tot: 1 }),
      col("hits", "السوالب", function (t) { return t.hits; }, { tot: 1 }),
      col("bench", "نقاط الدكة", function (t) { return M.hasBench ? t.bench : null; }, { tot: 1 }),
      col("avg", "متوسط/جولة", function (t) { return r1(t.avg); }),
      col("avgM", "متوسط العضو/جولة", function (t) { return r1(t.avgM); }),
      col("best", "أحسن جولة", function (t) { return t.best ? t.best.v : null; }),
      col("bestG", "رقم أحسن جولة", function (t) { return t.best ? t.best.g : null; }, { def: false }),
      col("worst", "أسوأ جولة", function (t) { return t.worst ? t.worst.v : null; }),
      col("worstG", "رقم أسوأ جولة", function (t) { return t.worst ? t.worst.g : null; }, { def: false }),
      col("lead", "جولات الصدارة", function (t) { return t.lead; }, { tot: 1 }),
      col("sd", "التذبذب", function (t) { return r1(t.sd); }),
      col("chips", "خواص اتلعبت", function (t) { return t.chips; }, { tot: 1 }),
      col("ntr", "التحويلات", function (t) { return M.hasTr ? t.ntr : null; }, { tot: 1 })
    ].concat(M.gws.map(function (g, j) { return col("g" + g, "ج" + g, function (t) { return t.per[j]; }, { def: false, tot: 1 }); }));
    return GRID.render({
      key: "season_t", title: "إحصائيات الموسم - التيمات", rows: M.TL, cols: cols, rowKey: function (t) { return t.team; },
      act: function (t) { return act("t", t.team); }, defSort: function (a, b) { return b.total - a.total; },
      totals: function (l) { var t = { rank: "الإجمالي - " + l.length + " تيم" }; cols.forEach(function (c) { if (c.tot) t[c.k] = sum(l, function (r) { return num(c.v(r)); }); }); return t; }
    });
  }
  function memberTable(M) {
    var rk = {}; M.byTotal.forEach(function (X, i) { rk[X.m.uid] = i + 1; });
    var cols = [
      col("rank", "الترتيب", function (X) { return rk[X.m.uid]; }),
      col("person", "العضو", function (X) { return X.m.person; }, { num: false }),
      col("team", "التيم", function (X) { return X.m.team; }, { num: false }),
      col("cap", "كابتن التيم", function (X) { return X.m.isCaptain && X.m.capMult > 1 ? X.m.capMult : null; }, { def: false }),
      col("n", "الجولات", function (X) { return X.n; }),
      col("total", "الصافي", function (X) { return X.total; }, { tot: 1 }),
      col("pts", "النقاط", function (X) { return X.pts; }, { tot: 1 }),
      col("hits", "السوالب", function (X) { return X.hits; }, { tot: 1 }),
      col("hitGws", "جولات فيها هيت", function (X) { return X.hitGws; }, { tot: 1 }),
      col("bench", "نقاط الدكة", function (X) { return X.benchN ? X.bench : null; }, { tot: 1 }),
      col("avgBench", "متوسط الدكة/جولة", function (X) { return X.benchN ? r1(X.bench / X.benchN) : null; }),
      col("avg", "متوسط/جولة", function (X) { return X.n ? r1(X.avg) : null; }),
      col("best", "أحسن جولة", function (X) { return X.best ? X.best.net : null; }),
      col("bestG", "رقم أحسن جولة", function (X) { return X.best ? X.best.g : null; }, { def: false }),
      col("worst", "أسوأ جولة", function (X) { return X.worst ? X.worst.net : null; }),
      col("worstG", "رقم أسوأ جولة", function (X) { return X.worst ? X.worst.g : null; }, { def: false }),
      col("sd", "التذبذب", function (X) { return r1(X.sd); }),
      col("last5", "متوسط آخر 5", function (X) { return X.last5 == null ? null : r1(X.last5); }),
      col("formD", "الفورم (آخر 5 - الموسم)", function (X) { return X.last5 == null || !X.n ? null : r1(X.last5 - X.avg); }),
      col("chipsN", "خواص اتلعبت", function (X) { return X.chips.length; }, { tot: 1 }),
      col("chipsL", "الخواص", function (X) { return X.chips.map(function (c) { return (CHIPS[c.chip] || c.chip) + " ج" + c.g; }).join("، "); }, { num: false, def: false, wr: true }),
      col("ntr", "التحويلات", function (X) { return M.hasTr ? X.ntr : null; }, { tot: 1 }),
      col("v1", "قيمة الفريق", function (X) { return X.v1 == null ? null : r1(X.v1); }),
      col("dv", "نمو القيمة", function (X) { return X.v0 == null || X.v1 == null ? null : r1(X.v1 - X.v0); }, { def: false }),
      col("r1", "الترتيب العالمي", function (X) { return X.r1; }, { def: false, h: function (X) { return X.r1 == null ? "" : fmt(X.r1); } }),
      col("dr", "تغير الترتيب العالمي", function (X) { return X.r0 == null || X.r1 == null ? null : X.r0 - X.r1; }, { def: false })
    ].concat(M.gws.map(function (g, j) { return col("g" + g, "ج" + g, function (X) { var e = X.ser[j]; return e ? e.net : null; }, { def: false, tot: 1 }); }));
    return GRID.render({
      key: "season_m", title: "إحصائيات الموسم - الأعضاء", rows: M.MR, cols: cols, rowKey: function (X) { return X.m.uid; },
      act: function (X) { return act("m", X.m.uid); }, defSort: function (a, b) { return b.total - a.total; },
      totals: function (l) { var t = { rank: "الإجمالي - " + l.length + " عضو" }; cols.forEach(function (c) { if (c.tot) t[c.k] = sum(l, function (r) { return num(c.v(r)); }); }); return t; }
    });
  }

  /* ---------- التبويبين ---------- */
  var VM = { season_t: "cards", season_m: "cards" };
  try { var _v = JSON.parse(LS.get("fc_svm") || "{}"); if (_v.season_t) VM.season_t = _v.season_t; if (_v.season_m) VM.season_m = _v.season_m; } catch (e) {}
  var SECTIONS = {
    season_t: [["🏆 ملخص التيمات", ["thead", "teams"]], ["📈 تحليلات التيمات", ["race", "gwt", "tbw", "tbench", "thits", "tcons"]]],
    season_m: [["🏆 ملخص الأعضاء", ["mhead", "members"]], ["👤 تحليلات الأعضاء", ["bw", "cons", "form", "me", "bench"]], ["🃏 خواص وهيتات وترتيب", ["chips", "hits", "rank", "value"]]]
  };
  var BUILD = {
    thead: cardTHead, teams: teamCards, race: cardRace, gwt: cardGwTable, tbw: cardTBW, tbench: cardTBench, thits: cardTHits, tcons: cardTCons,
    mhead: cardMHead, members: cardMembers, bw: cardBestWorst, cons: cardConsistency, form: cardForm, me: cardMe, bench: cardBench, chips: cardChips, hits: cardHits, rank: cardRank, value: cardValue
  };
  var NOCACHE = { me: 1, members: 1 };
  var SC = { M: null, h: {} }, CUR = null;
  function resolve(key) {
    var k = key.replace(/^s_/, ""), fn = BUILD[k]; if (!fn || !CUR) return "";
    if (!NOCACHE[k] && SC.h[k] !== undefined) return SC.h[k];
    var h = ""; try { h = fn(CUR) || ""; } catch (e) { console.error(e); }
    if (!NOCACHE[k]) SC.h[k] = h;
    return h;
  }
  function toggle(tab) {
    var m = VM[tab];
    return '<div class="tbar"><div class="sg"><button data-svm="' + tab + ':cards" class="' + (m === "cards" ? "on" : "") + '">بطاقات</button><button data-svm="' + tab + ':table" class="' + (m === "table" ? "on" : "") + '">جدول كامل</button></div></div>';
  }
  function view(tab) {
    if (!S.D) return '<div class="empty">بيحمّل...</div>';
    loadCaps();
    if (!WM().length) return '<div class="empty">مفيش أعضاء. غيّر الفلاتر أو حمّل الجولة.</div>';
    var M = model();
    if (!M) return '<div class="empty">بيحمّل سجل الجولات...</div>';
    if (!M.gws.length) return '<div class="empty">مفيش جولات متسجلة لسه. افتح الجولات اللي فاتت مرة عشان تتسجل في الشيت وتظهر هنا.</div>';
    if (SC.M !== M) SC = { M: M, h: {} };
    CUR = M;
    if (VM[tab] === "table") return toggle(tab) + (tab === "season_t" ? teamTable(M) : memberTable(M)) + noteHtml(M);
    var parts = [toggle(tab), noteHtml(M)];
    SECTIONS[tab].forEach(function (sc) {
      parts.push('<div class="sec">' + sc[0] + "</div>");
      sc[1].forEach(function (k) {
        if (!LZ) { parts.push(resolve(k)); return; }
        parts.push(!NOCACHE[k] && SC.h[k] !== undefined ? SC.h[k] : LZ.box("s_" + k));
      });
    });
    return parts.join("");
  }

  R.tabs.push({ id: "season_t", name: "إحصائيات الموسم - تيمات" });
  R.tabs.push({ id: "season_m", name: "إحصائيات الموسم - فردي" });
  var _title = R.title;
  R.title = function (t) { return t === "season_t" ? "الموسم - تيمات" : t === "season_m" ? "الموسم - فردي" : (_title ? _title(t) : null); };
  R.views.season_t = function () { return view("season_t"); };
  R.views.season_m = function () { return view("season_m"); };

  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    if ((S.tab === "season_t" || S.tab === "season_m") && LZ && VM[S.tab] === "cards") LZ.run(resolve);
  };

  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var t = e.target, b;
    if ((b = t.closest && t.closest("[data-svm]"))) {
      var q = b.getAttribute("data-svm").split(":"); VM[q[0]] = q[1];
      LS.set("fc_svm", JSON.stringify(VM)); F.render(); return true;
    }
    if ((b = t.closest && t.closest("[data-sm]")) && CUR) {
      if (b.getAttribute("data-sm") === "more") {
        SMORE.m += 20;
        var el = document.querySelector("#view .sm-members");
        if (el) el.outerHTML = cardMembers(CUR);
      }
      return true;
    }
    return false;
  };

  /* احتياطي لو plus.js مش موجود: بيبني الكروت اللي لسه placeholder قبل التصوير */
  if (!R.flush && LZ) {
    R.flush = function (nodes) {
      var all = [];
      nodes.forEach(function (n) { if (n.matches && n.matches("[data-lz]")) all.push(n); if (n.querySelectorAll) [].forEach.call(n.querySelectorAll("[data-lz]"), function (x) { all.push(x); }); });
      all.forEach(function (n) { if (!n.isConnected) return; var h = ""; try { h = resolve(n.getAttribute("data-lz")) || ""; } catch (e) {} n.insertAdjacentHTML("beforebegin", h); n.remove(); });
    };
  }
})();
