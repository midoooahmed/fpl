/* tm-engine.js - محرك البطولات (دوال نقية من غير DOM: بتشتغل في المتصفح وفي Node للاختبار)
   الداخل: cfg (إعدادات البطولة) + ctx (مصدر النقاط). الخارج: كل مرحلة بجداولها وماتشاتها وشجرة الإقصاء والبطل.
   ctx = { score(id, gw) -> رقم أو null, season(id) -> إجمالي الموسم, gws:[الجولات المتاحة], cur, curLive }
   cfg = { name, mode:"teams"|"individual"|"both", players:[ids], stages:[...], overrides:{}, adj:{} }
   أنواع المراحل: league (دوري) | groups (مجموعات) | knockout (خروج مغلوب) | swiss (سويسري) | ranking (ترتيب تراكمي) */
(function (root, factory) {
  var E = factory();
  if (typeof module === "object" && module.exports) module.exports = E; else root.__tmEngine = E;
})(typeof window !== "undefined" ? window : this, function () {
  "use strict";
  var GL = ["أ", "ب", "ج", "د", "هـ", "و", "ز", "ح", "ط", "ي", "ك", "ل", "م", "ن", "س", "ع"];
  var TYPES = { league: "دوري", groups: "مجموعات", knockout: "خروج مغلوب", swiss: "نظام سويسري", ranking: "ترتيب تراكمي" };
  var SEP = "\u0001";

  function num(x) { return Number(x) || 0; }
  function has(x) { return x !== undefined && x !== null && x !== ""; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function sum(a, f) { return a.reduce(function (s, x) { return s + (f ? f(x) : x); }, 0); }
  function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function rng(seed) { var a = hash(seed) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function shuffle(list, seed) { var a = list.slice(), r = rng(seed); for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(r() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pow2(n) { var s = 1; while (s < n) s *= 2; return s; }
  function bracketOrder(S) { var p = [1]; while (p.length < S) { var L = p.length * 2, n = []; p.forEach(function (x) { n.push(x, L + 1 - x); }); p = n; } return p; }
  function gprOf(st) { return Math.max(1, num(st.gpr) || 1); }
  function winPts(st) { return has(st.win) ? num(st.win) : 3; }
  function drawPts(st) { return has(st.draw_pts) ? num(st.draw_pts) : 1; }
  function lossPts(st) { return has(st.loss) ? num(st.loss) : 0; }

  /* الجولات اللي بتتلعب فيها خانة (سلوط) رقم slot */
  function slotGws(st, slot) {
    var p = gprOf(st), out = [], k;
    if (st.gws && st.gws.length) { for (k = 0; k < p; k++) { var g = st.gws[slot * p + k]; if (g == null) return []; out.push(Number(g)); } return out; }
    var s = num(st.startGw); if (!s) return [];
    for (k = 0; k < p; k++) out.push(s + slot * p + k);
    return out;
  }
  function scoreOf(id, gws, ctx) {
    if (!gws || !gws.length) return null;
    var s = 0;
    for (var i = 0; i < gws.length; i++) { var v = ctx.score(id, gws[i]); if (v == null) return null; s += v; }
    return r1(s);
  }
  function isLive(gws, ctx) { return !!(ctx.curLive && gws && gws.indexOf(ctx.cur) > -1); }

  /* ---------- مواجهات الأعضاء (5 ضد 5): كل عضو في تيم بيلعب قصاد عضو في التيم التاني ---------- */
  function mScoreOf(id, gws, ctx) {
    if (!gws || !gws.length || !ctx.mscore) return null;
    var s = 0;
    for (var i = 0; i < gws.length; i++) { var v = ctx.mscore(id, gws[i]); if (v == null) return null; s += v; }
    return r1(s);
  }
  function duelsOn(cfg, st) { var D = cfg.duels; return !!(D && D.on && !st.noDuels && cfg.mode !== "individual"); }
  function duelPts(D, st, k) { return k === "w" ? (has(D.win) ? num(D.win) : winPts(st)) : k === "d" ? (has(D.draw) ? num(D.draw) : drawPts(st)) : (has(D.loss) ? num(D.loss) : lossPts(st)); }
  function applyDuels(cfg, st, ctx, f) {
    var D = cfg.duels;
    if (!duelsOn(cfg, st) || !ctx.mem || f.bye || f.ov || !f.a || !f.b || f.a === "?" || f.b === "?") return;
    var A = ctx.mem(f.a, D.pair), B = ctx.mem(f.b, D.pair), n = Math.min(num(D.n) > 0 ? num(D.n) : 1e9, A.length, B.length);
    if (!n) return;
    var pairs = [], wa = 0, wb = 0, dr = 0, all = true, mg = num(D.margin), i;
    for (i = 0; i < n; i++) {
      var sa = mScoreOf(A[i], f.gws, ctx), sb = mScoreOf(B[i], f.gws, ctx), res = null;
      if (sa == null || sb == null) all = false;
      else { var d = sa - sb; res = Math.abs(d) <= mg ? "d" : (d > 0 ? "a" : "b"); if (res === "a") wa++; else if (res === "b") wb++; else dr++; }
      pairs.push({ a: A[i], b: B[i], sa: sa, sb: sb, res: res });
    }
    var dres = !all ? null : (wa > wb ? "a" : wb > wa ? "b" : "d");
    var du = { pairs: pairs, n: n, wa: wa, wb: wb, d: dr, done: all, res: dres, pa: 0, pb: 0, mode: D.mode === "only" ? "only" : "add" };
    if (all) {
      var sc = D.score || "match", per = has(D.per) ? num(D.per) : 1, stl = has(D.steal) ? num(D.steal) : 1, df = wa - wb, dpt = has(D.draw) ? num(D.draw) : 0;
      if (sc === "count" || sc === "count_steal") { du.pa = wa * per + dr * dpt; du.pb = wb * per + dr * dpt; }
      if (sc === "steal" || sc === "count_steal") { du.pa += df * stl; du.pb -= df * stl; }
      if (sc !== "count" && sc !== "steal" && sc !== "count_steal") {
        du.pa = dres === "a" ? duelPts(D, st, "w") : dres === "b" ? duelPts(D, st, "l") : duelPts(D, st, "d");
        du.pb = dres === "b" ? duelPts(D, st, "w") : dres === "a" ? duelPts(D, st, "l") : duelPts(D, st, "d");
      }
      du.pa = Math.round(du.pa * 10) / 10; du.pb = Math.round(du.pb * 10) / 10;
    }
    f.duel = du;
    if (du.mode === "only") {
      f.tsa = f.sa; f.tsb = f.sb; f.sa = all ? wa : null; f.sb = all ? wb : null; f.done = all; f.res = all ? dres : null; f.live = all && isLive(f.gws, ctx);
    } else if (all) { f.xa = du.pa; f.xb = du.pb; }
  }
  function legPts(f, st, side) {
    var p = 0, r = f.res;
    if (r) p = r === "d" ? drawPts(st) : (r === side ? winPts(st) : lossPts(st));
    return p + num(side === "a" ? f.xa : f.xb);
  }

  function mkFix(cfg, st, ctx, key, a, b, gws, extra) {
    var f = { key: key, a: a, b: b, gws: gws || [], sa: null, sb: null, done: false, live: false, res: null, ov: false }, k;
    if (extra) for (k in extra) f[k] = extra[k];
    var ov = cfg.overrides && cfg.overrides[key];
    if (ov && (has(ov.a) || has(ov.b) || ov.w)) {
      f.ov = true; f.done = true;
      if (has(ov.a) && has(ov.b)) { f.sa = num(ov.a); f.sb = num(ov.b); }
      if (ov.w) f.res = ov.w;
    } else {
      f.sa = scoreOf(a, f.gws, ctx); f.sb = scoreOf(b, f.gws, ctx);
      f.done = f.sa != null && f.sb != null; f.live = f.done && isLive(f.gws, ctx);
    }
    if (f.done && !f.res && f.sa != null && f.sb != null) { var d = f.sa - f.sb; f.res = Math.abs(d) <= num(st.margin) ? "d" : (d > 0 ? "a" : "b"); }
    applyDuels(cfg, st, ctx, f);
    return f;
  }

  /* ---------- جدول الترتيب ---------- */
  function newRow(id) { return { id: id, p: 0, w: 0, d: 0, l: 0, pf: 0, pa: 0, diff: 0, pts: 0, adj: 0, base: 0, form: [] }; }
  function tableOf(cfg, st, ctx, ids, fixtures, seedNo, base) {
    var rows = {}, h2h = {};
    ids.forEach(function (id) { rows[id] = newRow(id); });
    fixtures.forEach(function (f) {
      if (!f.done || !f.res) return;
      var A = rows[f.a], B = rows[f.b];
      if (f.bye) { if (A) { A.p++; A.w++; A.pts += winPts(st); A.form.push("w"); } return; }
      if (!A || !B) return;
      A.p++; B.p++;
      if (f.sa != null && f.sb != null) { A.pf += f.sa; A.pa += f.sb; B.pf += f.sb; B.pa += f.sa; }
      var pa = 0, pb = 0;
      if (f.res === "a") { A.w++; B.l++; pa = winPts(st); pb = lossPts(st); A.form.push("w"); B.form.push("l"); }
      else if (f.res === "b") { B.w++; A.l++; pb = winPts(st); pa = lossPts(st); B.form.push("w"); A.form.push("l"); }
      else { A.d++; B.d++; pa = pb = drawPts(st); A.form.push("d"); B.form.push("d"); }
      pa += num(f.xa); pb += num(f.xb);
      A.pts += pa; B.pts += pb;
      h2h[f.a + SEP + f.b] = num(h2h[f.a + SEP + f.b]) + pa; h2h[f.b + SEP + f.a] = num(h2h[f.b + SEP + f.a]) + pb;
    });
    ids.forEach(function (id) {
      var r = rows[id];
      r.pf = r1(r.pf); r.pa = r1(r.pa); r.diff = r1(r.pf - r.pa);
      r.adj = num(cfg.adj && cfg.adj[st.id + "|" + id]); r.base = num(base && base[id]);
      r.pts = r1(r.pts + r.adj + r.base);
    });
    var tb = (st.tb && st.tb.length) ? st.tb : ["diff", "pf"];
    var list = ids.map(function (id) { return rows[id]; }).sort(function (a, b) {
      if (b.pts !== a.pts) return b.pts - a.pts;
      for (var i = 0; i < tb.length; i++) {
        var k = tb[i], d = 0;
        if (k === "diff") d = b.diff - a.diff; else if (k === "pf") d = b.pf - a.pf; else if (k === "wins") d = b.w - a.w;
        else if (k === "season") d = num(ctx.season && ctx.season(b.id)) - num(ctx.season && ctx.season(a.id));
        else if (k === "h2h") d = num(h2h[b.id + SEP + a.id]) - num(h2h[a.id + SEP + b.id]);
        if (d) return d;
      }
      return seedNo(a.id) - seedNo(b.id);
    });
    list.forEach(function (r, i) { r.pos = i + 1; });
    return list;
  }

  /* ---------- لوحة الأفراد / الترتيب التراكمي ---------- */
  function leaderboard(ids, gws, ctx, drop, seedNo) {
    var rows = ids.map(function (id) {
      var per = [], vals = [];
      gws.forEach(function (g) { var v = ctx.score(id, g); per.push(v); if (v != null) vals.push(v); });
      var sorted = vals.slice().sort(function (a, b) { return a - b; });
      var dn = Math.min(num(drop), Math.max(0, vals.length - 1)), kept = sorted.slice(dn);
      return { id: id, per: per, gp: vals.length, raw: r1(sum(vals)), total: r1(sum(kept)), dropped: dn,
        best: vals.length ? Math.max.apply(null, vals) : null, worst: vals.length ? Math.min.apply(null, vals) : null, avg: vals.length ? r1(sum(vals) / vals.length) : 0 };
    });
    rows.sort(function (a, b) { return b.total - a.total || b.avg - a.avg || (seedNo ? seedNo(a.id) - seedNo(b.id) : 0); });
    rows.forEach(function (r, i) { r.pos = i + 1; });
    return rows;
  }

  /* ---------- القرعة ---------- */
  function seasonSorted(ids, ctx) {
    return ids.map(function (id, i) { return { id: id, i: i }; }).sort(function (a, b) { return num(ctx.season && ctx.season(b.id)) - num(ctx.season && ctx.season(a.id)) || a.i - b.i; }).map(function (x) { return x.id; });
  }
  function seedList(st, list, ctx) {
    var m = st.seed || "src", L = list.slice();
    if (m === "season") return seasonSorted(L, ctx);
    if (m === "random") return shuffle(L.slice().sort(), st.seedKey || st.id);
    if (m === "manual") { var o = (st.order || []).filter(function (x) { return L.indexOf(x) > -1; }); return o.concat(L.filter(function (x) { return o.indexOf(x) < 0; })); }
    return L;
  }
  function drawGroups(st, seeded, ctx) {
    var G = Math.max(1, Math.min(num(st.groups) || 2, Math.max(1, seeded.length))), mode = st.draw || "random", out = [], i;
    for (i = 0; i < G; i++) out.push([]);
    if (mode === "manual" && st.assign && st.assign.length) {
      var seen = {}, g2 = st.assign.map(function (a) { return a.filter(function (x) { if (seeded.indexOf(x) > -1 && !seen[x]) { seen[x] = 1; return true; } return false; }); });
      seeded.forEach(function (x) { if (!seen[x]) { var s = g2[0]; g2.forEach(function (g) { if (g.length < s.length) s = g; }); s.push(x); } });
      return g2;
    }
    var key = st.seedKey || st.id;
    if (mode === "snake") {
      seasonSorted(seeded, ctx).forEach(function (id, k) { var r = Math.floor(k / G), c = k % G; out[r % 2 ? G - 1 - c : c].push(id); });
    } else if (mode === "pots") {
      var S = seasonSorted(seeded, ctx);
      for (i = 0; i < S.length; i += G) shuffle(S.slice(i, i + G), key + "|pot" + i).forEach(function (id, j) { out[j].push(id); });
    } else {
      shuffle(seeded.slice().sort(), key).forEach(function (id, k) { out[k % G].push(id); });
    }
    return out;
  }
  function roundRobin(ids) {
    var a = ids.slice(); if (a.length % 2) a.push(null);
    var n = a.length, rounds = [];
    for (var r = 0; r < n - 1; r++) {
      var pairs = [];
      for (var i = 0; i < n / 2; i++) { var x = a[i], y = a[n - 1 - i]; if (x != null && y != null) pairs.push(r % 2 ? [y, x] : [x, y]); }
      rounds.push(pairs); a.splice(1, 0, a.pop());
    }
    return rounds;
  }

  /* ---------- اختيار المتأهلين من مرحلة سابقة ---------- */
  function pickFrom(P, src, R) {
    var n = num(src.n), r = src.r || "top", L = [];
    if (r === "top") L = n ? P.order.slice(0, n) : P.order.slice();
    else if (r === "range") L = P.order.slice(Math.max(0, num(src.a) - 1), num(src.b) || P.order.length);
    else if (r === "bottom") L = P.order.slice(Math.max(0, P.order.length - (n || 1)));
    else if (r === "losers") L = (P.koLosers && P.koLosers[num(src.round) || 1] || []).slice();
    else if (r === "group" && P.groups) {
      var k = Math.max(1, num(src.k) || 2), wild = num(src.wild), G = P.groups.length, pos, g, byPos = [];
      for (pos = 0; pos < k; pos++) {
        var row = [];
        for (g = 0; g < G; g++) { var x = P.groups[g].rows[pos]; if (x) row.push(x); }
        byPos.push(row.map(function (z) { return z.id; }));
        row.sort(function (a, b) { return a.pos - b.pos || b.pts - a.pts || b.diff - a.diff || b.pf - a.pf; });
        L = L.concat(row.map(function (x) { return x.id; }));
      }
      if (wild) {
        var cand = [];
        for (g = 0; g < G; g++) { var y = P.groups[g].rows[k]; if (y) cand.push(y); }
        cand.sort(function (a, b) { return b.pts - a.pts || b.diff - a.diff || b.pf - a.pf; });
        L = L.concat(cand.slice(0, wild).map(function (x) { return x.id; }));
      }
      R.qual = { k: k, G: G, wild: wild, byPos: byPos };
    } else L = P.order.slice();
    return L;
  }

  function roundName(r, RN) {
    var left = RN - r;
    return left === 0 ? "النهائي" : left === 1 ? "نصف النهائي" : left === 2 ? "ربع النهائي" : left === 3 ? "دور الـ16" : left === 4 ? "دور الـ32" : "الدور " + r;
  }
  function koTie(st, ctx, a, b, legs, seedNo) {
    var chain = (st.tie && st.tie.length) ? st.tie : ["last", "season", "seed"];
    for (var i = 0; i < chain.length; i++) {
      var k = chain[i], d = 0, by = "";
      if (k === "last") { var f = legs[legs.length - 1]; if (f && f.sa != null && f.sb != null) d = f.sa - f.sb; by = "الأعلى في آخر جولة"; }
      else if (k === "season") { d = num(ctx.season && ctx.season(a)) - num(ctx.season && ctx.season(b)); by = "الأعلى في الموسم"; }
      else if (k === "seed") { d = seedNo(b) - seedNo(a); by = "الأفضل تصنيفًا"; }
      else if (k === "random") { d = hash((st.seedKey || st.id) + a) - hash((st.seedKey || st.id) + b); by = "بالقرعة"; }
      if (d) return { w: d > 0 ? a : b, by: by };
    }
    return { w: seedNo(a) <= seedNo(b) ? a : b, by: "الأفضل تصنيفًا" };
  }

  /* ---------- بناء المراحل ---------- */
  function buildLeagueLike(cfg, st, R, seeded, ctx, seedNo, base) {
    var legs = num(st.legs) === 2 ? 2 : 1, groups, gi;
    if (st.type === "groups") {
      groups = drawGroups(st, seeded, ctx);
      R.groups = groups.map(function (ids, i) { return { name: "المجموعة " + (GL[i] || i + 1), ids: ids, rows: [], fixtures: [] }; });
    } else groups = [seeded];
    var per = groups.map(function (ids) { var rr = roundRobin(ids), all = rr.slice(); if (legs === 2) rr.forEach(function (r) { all.push(r.map(function (p) { return [p[1], p[0]]; })); }); return all; });
    var maxR = per.reduce(function (m, x) { return Math.max(m, x.length); }, 0), all = [];
    for (var r = 0; r < maxR; r++) {
      var gws = slotGws(st, r), fx = [];
      groups.forEach(function (ids, g) {
        (per[g][r] || []).forEach(function (p, k) {
          var f = mkFix(cfg, st, ctx, st.id + "|g" + g + "|r" + (r + 1) + "|" + k, p[0], p[1], gws, { grp: g, rnd: r + 1 });
          fx.push(f); all.push(f);
          if (R.groups) R.groups[g].fixtures.push(f);
        });
      });
      R.rounds.push({ no: r + 1, gws: gws, fixtures: fx });
    }
    if (st.type === "groups") {
      R.groups.forEach(function (G, g) { G.rows = tableOf(cfg, st, ctx, G.ids, G.fixtures, seedNo, base); });
      R.tables = R.groups.map(function (G) { return { name: G.name, rows: G.rows }; });
      var flat = []; R.groups.forEach(function (G) { flat = flat.concat(G.rows); });
      flat.sort(function (a, b) { return a.pos - b.pos || b.pts - a.pts || b.diff - a.diff || b.pf - a.pf; });
      R.order = flat.map(function (x) { return x.id; }); R.ptsMap = {}; flat.forEach(function (x) { R.ptsMap[x.id] = x.pts; });
    } else {
      var rows = tableOf(cfg, st, ctx, seeded, all, seedNo, base);
      R.tables = [{ name: "", rows: rows }]; R.order = rows.map(function (x) { return x.id; }); R.ptsMap = {}; rows.forEach(function (x) { R.ptsMap[x.id] = x.pts; });
    }
    R.live = all.some(function (f) { return f.live; });
    R.complete = !R.tentative && all.length > 0 && all.every(function (f) { return f.done; }) && !R.live;
  }

  function buildSwiss(cfg, st, R, seeded, ctx, seedNo, base) {
    var n = seeded.length, RN = Math.max(1, num(st.rounds) || Math.ceil(Math.log2(Math.max(2, n)))), played = {}, all = [], hadBye = {}, stop = false;
    for (var r = 0; r < RN; r++) {
      var gws = slotGws(st, r), fx = [];
      if (!stop && r > 0) { var prev = R.rounds[r - 1]; if (!prev.fixtures.length || !prev.fixtures.every(function (f) { return f.done; })) stop = true; }
      if (!stop && n >= 2) {
        var order = r === 0 ? seeded.slice() : tableOf(cfg, st, ctx, seeded, all, seedNo, base).map(function (x) { return x.id; }), pairs = [], bye = null, k;
        if (r === 0) {
          var half = Math.ceil(n / 2);
          for (k = 0; k < Math.floor(n / 2); k++) pairs.push([order[k], order[k + half]]);
          if (n % 2) bye = order[half - 1];
        } else {
          var rem = order.slice();
          if (rem.length % 2) { for (k = rem.length - 1; k >= 0; k--) if (!hadBye[rem[k]]) { bye = rem.splice(k, 1)[0]; break; } if (bye == null) bye = rem.pop(); }
          while (rem.length) {
            var a = rem.shift(), bi = -1;
            for (k = 0; k < rem.length; k++) if (!played[a + SEP + rem[k]]) { bi = k; break; }
            if (bi < 0) bi = 0;
            var b = rem.splice(bi, 1)[0]; pairs.push([a, b]);
          }
        }
        pairs.forEach(function (p, i) { played[p[0] + SEP + p[1]] = played[p[1] + SEP + p[0]] = 1; var f = mkFix(cfg, st, ctx, st.id + "|r" + (r + 1) + "|" + i, p[0], p[1], gws, { rnd: r + 1 }); fx.push(f); all.push(f); });
        if (bye != null) { hadBye[bye] = 1; var bf = { key: st.id + "|r" + (r + 1) + "|bye", a: bye, b: null, bye: true, gws: gws, done: true, res: "a", sa: null, sb: null, rnd: r + 1 }; fx.push(bf); all.push(bf); }
      }
      R.rounds.push({ no: r + 1, gws: gws, fixtures: fx, pending: stop });
    }
    var rows = tableOf(cfg, st, ctx, seeded, all, seedNo, base);
    R.tables = [{ name: "", rows: rows }]; R.order = rows.map(function (x) { return x.id; }); R.ptsMap = {}; rows.forEach(function (x) { R.ptsMap[x.id] = x.pts; });
    R.live = all.some(function (f) { return f.live; });
    R.complete = !R.tentative && !stop && all.length > 0 && all.every(function (f) { return f.done; }) && !R.live;
  }

  function buildRanking(cfg, st, R, seeded, ctx, seedNo) {
    var gws = [];
    if (st.gws && st.gws.length) gws = st.gws.map(Number);
    else {
      var s = num(st.startGw), e = num(st.endGw) || Math.max.apply(null, [s].concat(ctx.gws || []));
      for (var g = s; s && g <= e; g++) gws.push(g);
    }
    R.gwsList = gws;
    var rows = leaderboard(seeded, gws, ctx, st.drop, seedNo);
    R.tables = [{ name: "", rows: rows, ranking: true }]; R.order = rows.map(function (x) { return x.id; }); R.ptsMap = {}; rows.forEach(function (x) { R.ptsMap[x.id] = x.total; });
    var last = gws[gws.length - 1];
    R.live = !!(ctx.curLive && gws.indexOf(ctx.cur) > -1);
    R.complete = !R.tentative && !!st.endGw && !!last && last < num(ctx.cur) && gws.every(function (g) { return (ctx.gws || []).indexOf(g) > -1; });
    R.rounds = [];
  }

  function buildKO(cfg, st, R, seeded, ctx, seedNo) {
    var N = seeded.length, i, r;
    R.bracket = { rounds: [], third: null }; R.koLosers = {};
    if (N < 2) { R.order = seeded.slice(); R.complete = N === 1 && !R.tentative; return; }
    var S = pow2(N), RN = Math.round(Math.log2(S)), leaves = [];
    if (st.seed === "cross" && R.qual && R.qual.k === 2 && !R.qual.wild && R.qual.G % 2 === 0 && N === R.qual.G * 2 && S === N && R.qual.byPos[0].length === R.qual.G && R.qual.byPos[1].length === R.qual.G) {
      var G = R.qual.G, W = R.qual.byPos[0], U = R.qual.byPos[1], l1 = [], l2 = [];
      for (i = 0; i < G; i += 2) { l1.push(W[i], U[i + 1]); l2.push(W[i + 1], U[i]); }
      leaves = l1.concat(l2);
    } else {
      bracketOrder(S).forEach(function (p) { leaves.push(p <= N ? seeded[p - 1] : ""); });
    }
    var cur = leaves, slot = 0, losers = [], finalSlot = 0, champ = "", flat = [];
    for (r = 1; r <= RN; r++) {
      var legs = r === RN ? (num(st.finalLegs) === 2 ? 2 : 1) : (num(st.koLegs) === 2 ? 2 : 1), next = [], ties = [];
      if (r === RN) finalSlot = slot;
      for (i = 0; i < cur.length / 2; i++) {
        var a = cur[2 * i], b = cur[2 * i + 1];
        var t = { key: st.id + "|r" + r + "|m" + i, a: a, b: b, legs: [], bye: false, winner: "", by: "", ta: null, tb: null, done: false, live: false };
        ties.push(t);
        if (a === "" && b === "") { next.push(""); t.empty = true; continue; }
        if (a === "" || b === "") { t.bye = true; t.winner = a === "" ? b : a; t.done = t.winner !== "?"; next.push(t.winner); continue; }
        if (a === "?" || b === "?") { next.push("?"); continue; }
        var legFix = [];
        for (var l = 0; l < legs; l++) legFix.push(mkFix(cfg, st, ctx, t.key + "|L" + (l + 1), a, b, slotGws(st, slot + l), { leg: l + 1, rnd: r }));
        t.legs = legFix; t.live = legFix.some(function (f) { return f.live; });
        var all = legFix.every(function (f) { return f.done; }), w = "", ov = cfg.overrides && cfg.overrides[t.key];
        if (all) {
          t.ta = r1(sum(legFix, function (f) { return f.sa == null ? 0 : f.sa; })); t.tb = r1(sum(legFix, function (f) { return f.sb == null ? 0 : f.sb; }));
          var hasDu = duelsOn(cfg, st) && cfg.duels.mode !== "only" && legFix.some(function (f) { return f.duel && f.duel.done; });
          var ca = hasDu ? sum(legFix, function (f) { return legPts(f, st, "a"); }) : 0, cb = hasDu ? sum(legFix, function (f) { return legPts(f, st, "b"); }) : 0;
          t.ca = hasDu ? ca : null; t.cb = hasDu ? cb : null;
          if (hasDu && ca !== cb) { w = ca > cb ? a : b; t.by = "نقاط المواجهة + مواجهات الأعضاء"; }
          else if (t.ta > t.tb) w = a; else if (t.tb > t.ta) w = b; else { var tt = koTie(st, ctx, a, b, legFix, seedNo); w = tt.w; t.by = tt.by; }
        }
        if (ov && (ov.w === "a" || ov.w === "b")) { w = ov.w === "a" ? a : b; t.by = "تأهل بقرار الإدارة"; all = true; }
        if (all && w) {
          t.winner = w; t.done = true; next.push(w);
          var lo = w === a ? b : a; losers.push({ id: lo, r: r, agg: w === a ? t.tb : t.ta });
        } else next.push("?");
      }
      ties.forEach(function (t) { flat.push(t); });
      R.bracket.rounds.push({ no: r, name: roundName(r, RN), ties: ties, gws: slotGws(st, slot) });
      var fx = []; ties.forEach(function (t) { t.legs.forEach(function (f) { fx.push(f); }); });
      R.rounds.push({ no: r, name: roundName(r, RN), gws: slotGws(st, slot), fixtures: fx });
      slot += legs; cur = next;
    }
    champ = cur[0];
    var decided = !!champ && champ !== "?" && champ !== "";
    /* ماتش المركز التالت */
    var thirdDone = true;
    if (st.third && RN >= 2) {
      var semis = R.bracket.rounds[RN - 2].ties, lo2 = [];
      semis.forEach(function (t) { if (t.done && !t.bye) lo2.push(t.winner === t.a ? t.b : t.a); else lo2.push("?"); });
      var T = { key: st.id + "|third", a: lo2[0], b: lo2[1], legs: [], bye: false, winner: "", by: "", ta: null, tb: null, done: false, live: false, third: true };
      if (lo2[0] && lo2[1] && lo2[0] !== "?" && lo2[1] !== "?") {
        var tf = mkFix(cfg, st, ctx, T.key + "|L1", T.a, T.b, slotGws(st, finalSlot), { leg: 1, rnd: RN, third: true });
        T.legs = [tf]; T.live = tf.live;
        if (tf.done) {
          T.ta = tf.sa; T.tb = tf.sb; var w3 = "";
          if (tf.res === "a") w3 = T.a; else if (tf.res === "b") w3 = T.b;
          else { var t3 = koTie(st, ctx, T.a, T.b, [tf], seedNo); w3 = t3.w; T.by = t3.by; }
          var ov3 = cfg.overrides && cfg.overrides[T.key];
          if (ov3 && (ov3.w === "a" || ov3.w === "b")) { w3 = ov3.w === "a" ? T.a : T.b; T.by = "قرار الإدارة"; }
          T.winner = w3; T.done = true;
        }
        R.rounds[RN - 1].fixtures.push(tf);
      }
      thirdDone = T.done; R.bracket.third = T;
    }
    /* الترتيب النهائي (المراكز) */
    var byR = {}; losers.forEach(function (x) { (byR[x.r] = byR[x.r] || []).push(x); });
    Object.keys(byR).forEach(function (k) {
      byR[k].sort(function (x, y) { return y.agg - x.agg || seedNo(x.id) - seedNo(y.id); });
      R.koLosers[k] = byR[k].map(function (x) { return x.id; });
    });
    var order = [], elim = {}; losers.forEach(function (x) { elim[x.id] = 1; });
    if (decided) order.push(champ);
    else seeded.forEach(function (id) { if (!elim[id]) order.push(id); });
    for (r = RN; r >= 1; r--) {
      var L = (R.koLosers[r] || []).slice();
      if (r === RN - 1 && R.bracket.third && R.bracket.third.done) { var T3 = R.bracket.third; L = [T3.winner, T3.winner === T3.a ? T3.b : T3.a]; }
      L.forEach(function (id) { if (order.indexOf(id) < 0) order.push(id); });
    }
    R.order = order;
    R.live = flat.some(function (t) { return t.live; }) || !!(R.bracket.third && R.bracket.third.live);
    R.complete = !R.tentative && decided && thirdDone && !R.live;
    R.champion = decided ? champ : "";
  }

  function buildStage(cfg, st, out, ctx) {
    var R = { id: st.id, name: st.name || TYPES[st.type] || "مرحلة", type: st.type, st: st, ents: [], seeded: [], rounds: [], tables: [], order: [], complete: false, tentative: false, live: false, notes: [] };
    var src = st.src || { t: "all" }, list;
    if (src.t === "stage") {
      var P = out.byId[src.s];
      if (!P) { R.notes.push("المرحلة المصدر مش موجودة"); list = []; }
      else { if (!P.complete || P.tentative) R.tentative = true; list = pickFrom(P, src, R); R.srcStage = P; }
    } else if (src.t === "manual") list = (st.manual || []).slice();
    else list = (cfg.players || []).slice();
    var seen = {}; list = list.filter(function (x) { if (!x || seen[x]) return false; seen[x] = 1; return true; });
    R.ents = list.slice();
    var seeded = seedList(st, list, ctx); R.seeded = seeded;
    var sn = {}; seeded.forEach(function (id, i) { sn[id] = i + 1; });
    var seedNo = function (id) { return sn[id] || 9999; };
    R.seedNo = seedNo;
    var base = null;
    if (num(st.carry) > 0 && R.srcStage && R.srcStage.ptsMap) { base = {}; Object.keys(R.srcStage.ptsMap).forEach(function (id) { base[id] = r1(R.srcStage.ptsMap[id] * num(st.carry) / 100); }); }
    if (seeded.length < 2 && st.type !== "ranking") { R.notes.push("محتاج متسابقين اتنين على الأقل"); R.order = seeded.slice(); R.complete = false; if (st.type === "knockout") R.bracket = { rounds: [], third: null }; return R; }
    if (st.type === "league" || st.type === "groups") buildLeagueLike(cfg, st, R, seeded, ctx, seedNo, base);
    else if (st.type === "swiss") buildSwiss(cfg, st, R, seeded, ctx, seedNo, base);
    else if (st.type === "knockout") buildKO(cfg, st, R, st.seed === "cross" ? list : seeded, ctx, seedNo);
    else if (st.type === "ranking") buildRanking(cfg, st, R, seeded, ctx, seedNo);
    return R;
  }

  function compute(cfg, ctx) {
    var out = { stages: [], byId: {}, champion: "", span: null };
    (cfg.stages || []).forEach(function (st) { var R = buildStage(cfg, st, out, ctx); out.stages.push(R); out.byId[st.id] = R; });
    var last = out.stages[out.stages.length - 1];
    if (last && last.complete && last.order.length) out.champion = last.order[0];
    var lo = 1e9, hi = 0;
    out.stages.forEach(function (R) {
      var add = function (g) { if (g < lo) lo = g; if (g > hi) hi = g; };
      R.rounds.forEach(function (rd) { (rd.gws || []).forEach(add); });
      (R.gwsList || []).forEach(add);
    });
    if (hi) out.span = [lo, hi];
    return out;
  }

  /* عدد الجولات اللي المرحلة هتاخدها (لترتيب بداية المراحل ورا بعض) */
  function slotsNeeded(st, n) {
    n = Math.max(2, n || 2);
    var legs = num(st.legs) === 2 ? 2 : 1;
    if (st.type === "league") return (n % 2 ? n : n - 1) * legs;
    if (st.type === "groups") { var sz = Math.ceil(n / Math.max(1, num(st.groups) || 2)); return Math.max(1, (sz % 2 ? sz : sz - 1)) * legs; }
    if (st.type === "swiss") return Math.max(1, num(st.rounds) || Math.ceil(Math.log2(n)));
    if (st.type === "knockout") { var RN = Math.round(Math.log2(pow2(n))); return Math.max(0, RN - 1) * (num(st.koLegs) === 2 ? 2 : 1) + (num(st.finalLegs) === 2 ? 2 : 1); }
    if (st.type === "ranking") return Math.max(1, (num(st.endGw) - num(st.startGw) + 1) || 1);
    return 1;
  }
  function gwsNeeded(st, n) { return st.type === "ranking" ? slotsNeeded(st, n) : slotsNeeded(st, n) * gprOf(st); }

  return { TYPES: TYPES, GL: GL, compute: compute, leaderboard: leaderboard, slotGws: slotGws, slotsNeeded: slotsNeeded, gwsNeeded: gwsNeeded, shuffle: shuffle, hash: hash, pow2: pow2, seasonSorted: seasonSorted, drawGroups: drawGroups, roundRobin: roundRobin, bracketOrder: bracketOrder };
});
