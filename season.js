/* season.js - تبويب "إحصائيات الموسم"
   مستقل عن plus.js: بيجمّع سجل الجولات اللي الـ API بيرجّعه (?api=history) + الجولة الحالية (لايف)
   ويطلّع ترتيب الموسم للتيمات والأعضاء، أحسن/أسوأ الجولات، الثبات، الفورم، الخواص، السوالب، الترتيب العالمي.
   الكروت بتتبني بالتدريج (نفس نظام plus.js) عشان الموبايل مايبجّش. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc, WM = F.WM, PL = window.__plus || {}, LZ = PL.lz || null;
  var LS = { get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } } };
  var CHIPS = { wildcard: "وايلد كارد", freehit: "فري هيت", "3xc": "تربل كابتن", bboost: "بنش بوست" };
  function num(x) { return Number(x) || 0; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function sgn(v) { return (v > 0 ? "+" : "") + v; }
  function mut() { return '<span class="mut">–</span>'; }
  function sg(v) { return v == null ? mut() : '<span class="' + (v > 0 ? "pos" : v < 0 ? "neg" : "mut") + '">' + sgn(v) + "</span>"; }
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

  (function () {
    var st = document.createElement("style"); st.id = "seasonCss";
    st.textContent = ".sm-gwt td:first-child,.sm-gwt th:first-child{position:sticky;inset-inline-start:0;background:var(--s1);z-index:1}" +
      ".sm-note{font-size:12.5px;color:var(--mu);line-height:1.7}.sm-note b{color:var(--tx)}";
    document.head.appendChild(st);
  })();

  /* ---------- السجل: من plus.js لو موجود، وإلا بنجيبه إحنا ---------- */
  var OWN = null, OWNGW = 0;
  function hist() { return PL.HISTf ? PL.HISTf() : OWN; }
  if (!PL.HISTf) {
    R.hooks.afterLoad.push(function () {
      var gw = S.gw; if (OWNGW === gw) return; OWNGW = gw; OWN = null;
      F.api({ api: "history", gw: gw }).then(function (h) {
        if (S.gw === gw) { OWN = (!h || h.success === false) ? {} : h; if (S.tab === "season") F.render(); }
      }).catch(function () { OWN = {}; });
    });
  }

  /* ---------- حساب الموديل (مرة واحدة لكل تغيّر في البيانات) ---------- */
  var MC = { d: null, sig: "", m: null };
  function sigOf(wm, H) {
    var h = 0, u = wm.map(function (m) { return m.uid; }).join(",");
    for (var i = 0; i < u.length; i++) h = (h * 31 + u.charCodeAt(i)) | 0;
    return [S.gw, S.D.live ? S.D.live.updatedAt : 0, S.F.capTeam ? 1 : 0, wm.length, h, Object.keys(H).length].join("|");
  }
  function model() {
    var H = hist(); if (!H) return null;
    var wm = WM(), sig = sigOf(wm, H);
    if (MC.d === S.D && MC.sig === sig) return MC.m;
    var cur = S.gw, i, g;
    var have = Object.keys(H).map(Number).filter(function (x) { return x >= 1 && x < cur && H[x]; }).sort(function (a, b) { return a - b; });
    var curOk = !!(S.D.live || wm.some(function (m) { return m.points > 0; }));
    var gws = have.slice(); if (curOk) gws.push(cur);
    var missing = []; for (g = 1; g < cur; g++) if (have.indexOf(g) < 0) missing.push(g);
    var capTeam = S.F.capTeam;

    var MR = wm.map(function (m) {
      var ser = gws.map(function (gg) {
        if (gg === cur && curOk) return { g: gg, pts: m.d.points, cost: m.cost, net: m.d.net, chip: m.chip || "", value: m.value, rank: (m.orank === "" || m.orank == null) ? null : Number(m.orank) };
        var r = H[gg] && H[gg][m.entryId];
        return r ? { g: gg, pts: num(r[0]), cost: num(r[1]), net: num(r[0]) - num(r[1]), chip: r[3] || "", value: num(r[2]), rank: (r[4] === "" || r[4] == null) ? null : Number(r[4]) } : null;
      });
      var X = { m: m, ser: ser, n: 0, total: 0, hits: 0, hitGws: 0, best: null, worst: null, sd: 0, avg: 0, last5: null, v0: null, v1: null, r0: null, r1: null };
      var pl = ser.filter(Boolean);
      X.n = pl.length;
      pl.forEach(function (e) {
        X.total += e.net; X.hits += e.cost; if (e.cost > 0) X.hitGws++;
        if (!X.best || e.net > X.best.net) X.best = e;
        if (!X.worst || e.net < X.worst.net) X.worst = e;
        if (e.value > 0) { if (X.v0 == null) X.v0 = e.value; X.v1 = e.value; }
        if (e.rank != null) { if (X.r0 == null) X.r0 = e.rank; X.r1 = e.rank; }
      });
      if (X.n) {
        X.avg = X.total / X.n;
        X.sd = Math.sqrt(pl.reduce(function (s, e) { return s + (e.net - X.avg) * (e.net - X.avg); }, 0) / X.n);
        var l5 = pl.slice(-5); X.last5 = l5.reduce(function (s, e) { return s + e.net; }, 0) / l5.length;
      }
      return X;
    });

    // التيمات
    var T = {};
    MR.forEach(function (X) {
      var m = X.m, k = capTeam && m.isCaptain ? (m.capMult || 1) : 1;
      var t = T[m.team] || (T[m.team] = { team: m.team, n: 0, per: gws.map(function () { return null; }) });
      t.n++;
      X.ser.forEach(function (e, j) { if (e) t.per[j] = (t.per[j] || 0) + e.net * k; });
    });
    var TL = Object.keys(T).map(function (k) {
      var t = T[k], tot = 0, gp = 0, cum = [], run = 0;
      t.per.forEach(function (v, j) {
        if (v != null) { tot += v; gp++; run += v; if (!t.best || v > t.best.v) t.best = { g: gws[j], v: v }; if (!t.worst || v < t.worst.v) t.worst = { g: gws[j], v: v }; }
        cum.push(run);
      });
      t.total = tot; t.gp = gp; t.avg = gp ? tot / gp : 0; t.cum = cum; t.lead = 0;
      return t;
    }).sort(function (a, b) { return b.total - a.total; });
    if (TL.length > 1) {
      gws.forEach(function (gg, j) {
        var b = null;
        TL.forEach(function (t) { if (t.per[j] != null && (!b || t.per[j] > b.per[j])) b = t; });
        if (b) b.lead++;
      });
    }

    // متوسط الأعضاء في كل جولة + أحسن/أسوأ جولات فردية
    var gwAvg = gws.map(function (gg, j) {
      var s = 0, n = 0; MR.forEach(function (X) { var e = X.ser[j]; if (e) { s += e.net; n++; } });
      return n ? s / n : 0;
    });
    var all = []; MR.forEach(function (X) { X.ser.forEach(function (e) { if (e) all.push({ X: X, e: e }); }); });
    var top = all.slice().sort(function (a, b) { return b.e.net - a.e.net; }).slice(0, 5);
    var low = all.slice().sort(function (a, b) { return a.e.net - b.e.net; }).slice(0, 5);
    var bestTeam = null; TL.forEach(function (t) { if (t.best && (!bestTeam || t.best.v > bestTeam.v)) bestTeam = { team: t.team, g: t.best.g, v: t.best.v }; });
    var overall = all.length ? all.reduce(function (s, x) { return s + x.e.net; }, 0) / all.length : 0;

    var M = { gws: gws, missing: missing, curOk: curOk, MR: MR, TL: TL, gwAvg: gwAvg, top: top, low: low, bestTeam: bestTeam, overall: overall, byTotal: MR.slice().sort(function (a, b) { return b.total - a.total; }) };
    MC = { d: S.D, sig: sig, m: M };
    return M;
  }

  /* ---------- الكروت ---------- */
  function cardHead(M) {
    var lead = M.TL[0], topM = M.byTotal[0], bs = M.top[0];
    var t = function (l, v, sub, a) { return '<div class="tile' + (a ? " click" : "") + '"' + (a || "") + "><span>" + l + "</span><b>" + v + "</b><small><em>" + sub + "</em></small></div>"; };
    var tiles = [
      t("جولات محسوبة", M.gws.length, "من ج" + M.gws[0] + " لحد ج" + M.gws[M.gws.length - 1]),
      lead ? t("👑 متصدر الموسم (تيم)", esc(lead.team), lead.total + " نقطة", act("t", lead.team)) : "",
      topM ? t("🥇 متصدر الأعضاء", esc(topM.m.person), topM.total + " نقطة · " + esc(topM.m.team), act("m", topM.m.uid)) : "",
      bs ? t("🔥 أعلى جولة (عضو)", bs.e.net, esc(bs.X.m.person) + " · ج" + bs.e.g, act("m", bs.X.m.uid)) : "",
      M.bestTeam ? t("🚀 أعلى جولة (تيم)", M.bestTeam.v, esc(M.bestTeam.team) + " · ج" + M.bestTeam.g, act("t", M.bestTeam.team)) : "",
      t("متوسط العضو في الجولة", r1(M.overall), "صافي بعد السوالب")
    ];
    var note = '<div class="sm-note" style="margin-top:10px">الأرقام محسوبة على <b>' + M.gws.length + "</b> " + (M.gws.length === 1 ? "جولة" : "جولات") +
      (M.curOk ? " (آخر جولة فيهم هي الجولة الحالية بنقاطها اللايف)" : "") + "." +
      (M.missing.length ? " جولات ناقصة من السجل: <b>" + M.missing.join("، ") + "</b> - افتحها مرة من اختيار الجولة عشان تتسجل وتدخل في الحسبة." : "") + "</div>";
    return card("ov-full", "🏆 ملخص الموسم", '<div class="plus-tiles">' + tiles.join("") + "</div>" + note);
  }

  function cardTeams(M) {
    var rows = M.TL.map(function (t, i) {
      return '<tr class="click"' + act("t", t.team) + "><td>" + (i + 1) + "</td><td><b>" + esc(t.team) + "</b></td><td><b>" + t.total + "</b></td><td>" + r1(t.avg) + "</td><td>" +
        (t.best ? t.best.v + ' <span class="mut">ج' + t.best.g + "</span>" : "–") + "</td><td>" + (t.worst ? t.worst.v + ' <span class="mut">ج' + t.worst.g + "</span>" : "–") + "</td><td>" + t.lead + "</td></tr>";
    });
    return card("ov-full", "🏅 ترتيب التيمات في الموسم", table(["#", "التيم", "المجموع", "متوسط/جولة", "أحسن جولة", "أسوأ جولة", "جولات في الصدارة"], rows) +
      '<div class="lg"><span>المجموع = صافي نقاط أعضاء التيم في كل الجولات المحسوبة (بعد السوالب)' + (S.F.capTeam ? " وبمضاعفة كابتن التيم" : "") + ".</span></div>");
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
    return card("ov-full", "📈 سباق الموسم (التراكمي لأحسن 6 تيمات)", '<div style="direction:ltr"><svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto">' + lines + axis + "</svg></div>" + '<div class="lg">' + lg + "</div>");
  }

  function cardGwTable(M) {
    var colMax = M.gws.map(function (g, j) { var b = null; M.TL.forEach(function (t) { if (t.per[j] != null && (b == null || t.per[j] > b)) b = t.per[j]; }); return b; });
    var rows = M.TL.map(function (t) {
      return '<tr class="click"' + act("t", t.team) + "><td><b>" + esc(t.team) + "</b></td>" + t.per.map(function (v, j) {
        return v == null ? "<td>" + mut() + "</td>" : "<td" + (v === colMax[j] && M.TL.length > 1 ? ' class="pos"' : "") + ">" + v + "</td>";
      }).join("") + "<td><b>" + t.total + "</b></td></tr>";
    });
    return card("ov-full", "🗓️ جدول الجولات للتيمات", table(["التيم"].concat(M.gws.map(function (g) { return "ج" + g; })).concat(["المجموع"]), rows, "sm-gwt") +
      '<div class="lg"><span>الأخضر = أعلى تيم في الجولة دي.</span></div>');
  }

  var SMORE = { m: 20 };
  function cardMembers(M) {
    var L = M.byTotal, shown = L.slice(0, SMORE.m);
    var rows = shown.map(function (X, i) {
      return '<tr class="click"' + act("m", X.m.uid) + "><td>" + (i + 1) + "</td><td><b>" + esc(X.m.person) + '</b><br><small class="mut">' + esc(X.m.team) + "</small></td><td><b>" + X.total + "</b></td><td>" + (X.n ? r1(X.avg) : "–") + "</td><td>" +
        (X.best ? X.best.net + ' <span class="mut">ج' + X.best.g + "</span>" : "–") + "</td><td>" + (X.worst ? X.worst.net + ' <span class="mut">ج' + X.worst.g + "</span>" : "–") + "</td><td>" + X.n + "</td></tr>";
    });
    var more = L.length > shown.length ? '<button type="button" class="btn b2" data-sm="more" style="width:100%;margin-top:8px">عرض المزيد (' + (L.length - shown.length) + " متبقي)</button>" : "";
    return card("ov-full sm-members", "👤 ترتيب الأعضاء في الموسم", table(["#", "العضو", "المجموع", "متوسط", "أحسن", "أسوأ", "جولات"], rows) + more);
  }

  function cardBestWorst(M) {
    var row = function (x, cls) { return li(act("m", x.X.m.uid), esc(x.X.m.person), esc(x.X.m.team) + " · ج" + x.e.g, x.e.net, cls); };
    return card("ov-half", "🔥 أحسن وأسوأ جولات في الموسم",
      '<div class="sub-h">أعلى 5 جولات</div>' + M.top.map(function (x) { return row(x, "pos"); }).join("") +
      '<div class="sub-h">أقل 5 جولات</div>' + M.low.map(function (x) { return row(x, "neg"); }).join(""));
  }

  function cardConsistency(M) {
    var min = Math.min(4, M.gws.length), L = M.MR.filter(function (X) { return X.n >= min; });
    if (L.length < 2) return "";
    L = L.slice().sort(function (a, b) { return a.sd - b.sd; });
    var row = function (X) { return li(act("m", X.m.uid), who(X), "متوسط " + r1(X.avg) + " · انحراف " + r1(X.sd), r1(X.sd), ""); };
    return card("ov-half", "🧘 الثبات والتذبذب",
      '<div class="sub-h">الأكتر ثباتًا (انحراف أقل)</div>' + L.slice(0, 4).map(row).join("") +
      '<div class="sub-h">الأكتر تذبذبًا</div>' + L.slice(-4).reverse().map(row).join(""));
  }

  function cardForm(M) {
    var min = Math.min(6, M.gws.length), L = M.MR.filter(function (X) { return X.n >= min && X.last5 != null; });
    if (L.length < 2) return "";
    L = L.map(function (X) { return { X: X, d: r1(X.last5 - X.avg) }; }).sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "آخر 5 جولات: " + r1(x.X.last5) + " · الموسم: " + r1(x.X.avg), sgn(x.d), x.d > 0 ? "pos" : x.d < 0 ? "neg" : ""); };
    return card("ov-half", "📊 الفورم (آخر 5 جولات مقابل متوسط الموسم)",
      '<div class="sub-h">طالعين</div>' + L.slice(0, 4).map(row).join("") +
      '<div class="sub-h">نازلين</div>' + L.slice(-4).reverse().map(row).join(""));
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
      '<div class="lg"><span>ترتيبك: <b>' + rank + " من " + M.MR.length + "</b></span><span>مجموعك: <b>" + X.total + "</b></span><span>متوسطك: <b>" + (X.n ? r1(X.avg) : "–") + "</b></span>" +
      "<span>عن المتصدر: <b>" + (rank > 1 ? "-" + (lead.total - X.total) : "👑") + "</b></span>" +
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
      var c = by[k], a = c.s / c.n;
      return "<tr><td><b>" + esc(CHIPS[k] || k) + "</b></td><td>" + c.n + "</td><td>" + r1(a) + "</td><td>" + sg(r1(a - avgPlain)) + "</td><td>" + esc(c.best.X.m.person) + " (" + c.best.e.net + " · ج" + c.best.e.g + ")</td></tr>";
    });
    return card("ov-half", "🃏 الخواص في الموسم", table(["الخاصية", "مرات", "متوسط الصافي", "عن الجولة العادية", "أحسن استخدام"], rows) +
      '<div class="lg"><span>متوسط الجولة من غير خاصية: <b>' + r1(avgPlain) + "</b></span></div>");
  }

  function cardHits(M) {
    var L = M.MR.filter(function (X) { return X.hits > 0; }).sort(function (a, b) { return b.hits - a.hits; });
    var tot = M.MR.reduce(function (s, X) { return s + X.hits; }, 0);
    if (!L.length) return card("ov-half", "💸 السوالب في الموسم", '<p class="mut">محدش ضرب هيت لحد دلوقتي 👌</p>');
    return card("ov-half", "💸 السوالب في الموسم", '<div class="lg" style="margin:0 0 4px"><span>إجمالي السوالب: <b>-' + tot + "</b></span></div>" +
      L.slice(0, 6).map(function (X) { return li(act("m", X.m.uid), who(X), X.hitGws + " جولة فيها هيت · صافي الموسم " + X.total, "-" + X.hits, "neg"); }).join(""));
  }

  function cardRank(M) {
    var L = M.MR.filter(function (X) { return X.r0 != null && X.r1 != null && X.r0 !== X.r1; }).map(function (X) { return { X: X, d: X.r0 - X.r1 }; });
    if (L.length < 2) return "";
    L.sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "من " + fmt(x.X.r0) + " إلى " + fmt(x.X.r1), (x.d > 0 ? "▲ " : "▼ ") + fmt(Math.abs(x.d)), x.d > 0 ? "pos" : "neg"); };
    return card("ov-half", "🌍 الترتيب العالمي (من أول جولة محسوبة لدلوقتي)",
      '<div class="sub-h">أحسن صعود</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">أكبر هبوط</div>' + L.slice(-4).reverse().map(row).join(""));
  }

  function cardValue(M) {
    var L = M.MR.filter(function (X) { return X.v0 != null && X.v1 != null; }).map(function (X) { return { X: X, d: r1(X.v1 - X.v0) }; });
    if (L.length < 2) return "";
    L.sort(function (a, b) { return b.d - a.d; });
    var row = function (x) { return li(act("m", x.X.m.uid), who(x.X), "من " + r1(x.X.v0) + " إلى " + r1(x.X.v1), sgn(x.d), x.d > 0 ? "pos" : x.d < 0 ? "neg" : ""); };
    return card("ov-half", "💰 نمو قيمة الفريق",
      '<div class="sub-h">أكتر زيادة</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">أقل زيادة</div>' + L.slice(-4).reverse().map(row).join(""));
  }

  /* ---------- التبويب ---------- */
  var SECTIONS = [
    ["🏆 ملخص الموسم", ["head", "teams", "race", "gwt"]],
    ["👤 الأعضاء", ["members", "bw", "cons", "form", "me"]],
    ["🃏 خواص وهيتات وترتيب", ["chips", "hits", "rank", "value"]]
  ];
  var BUILD = { head: cardHead, teams: cardTeams, race: cardRace, gwt: cardGwTable, members: cardMembers, bw: cardBestWorst, cons: cardConsistency, form: cardForm, me: cardMe, chips: cardChips, hits: cardHits, rank: cardRank, value: cardValue };
  var NOCACHE = { me: 1, members: 1 };
  var SC = { M: null, h: {} }, CUR = null;
  function resolve(key) {
    var k = key.replace(/^s_/, ""), fn = BUILD[k]; if (!fn || !CUR) return "";
    if (!NOCACHE[k] && SC.h[k] !== undefined) return SC.h[k];
    var h = ""; try { h = fn(CUR) || ""; } catch (e) { console.error(e); }
    if (!NOCACHE[k]) SC.h[k] = h;
    return h;
  }

  R.tabs.push({ id: "season", name: "إحصائيات الموسم" });
  var _title = R.title; R.title = function (t) { return t === "season" ? "إحصائيات الموسم" : (_title ? _title(t) : null); };
  R.views.season = function () {
    if (!S.D) return '<div class="empty">بيحمّل...</div>';
    if (!WM().length) return '<div class="empty">مفيش أعضاء</div>';
    var M = model();
    if (!M) return '<div class="empty">بيحمّل سجل الجولات...</div>';
    if (!M.gws.length) return '<div class="empty">مفيش جولات متسجلة لسه. افتح الجولات اللي فاتت مرة عشان تتسجل في الشيت وتظهر هنا.</div>';
    if (SC.M !== M) { SC = { M: M, h: {} }; }
    CUR = M;
    var parts = [];
    SECTIONS.forEach(function (sc) {
      parts.push('<div class="sec" style="font-size:15px;color:var(--tx);font-weight:600">' + sc[0] + "</div>");
      sc[1].forEach(function (k) {
        if (!LZ) { parts.push(resolve(k)); return; }
        parts.push(!NOCACHE[k] && SC.h[k] !== undefined ? SC.h[k] : LZ.box("s_" + k));
      });
    });
    return parts.join("");
  };

  var _ra = R.afterRender;
  R.afterRender = function () { if (_ra) _ra(); if (S.tab === "season" && LZ) LZ.run(resolve); };

  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var b = e.target.closest && e.target.closest("[data-sm]");
    if (!b || !CUR) return false;
    if (b.getAttribute("data-sm") === "more") {
      SMORE.m += 20;
      var el = document.querySelector("#view .sm-members");
      if (el) el.outerHTML = cardMembers(CUR);
    }
    return true;
  };
})();
