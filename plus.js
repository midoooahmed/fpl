/* plus.js - التحليلات والفيتشرز الإضافية (متولّد من Plus.html ومتوافق مع التطبيق) */
(function(){"use strict";
var F=window.__fc,R=F.R,S=F.S,P=F.P,pPts=F.pPts,pStat=F.pStat,isPlayed=F.isPlayed,esc=F.esc,WM=F.WM,ownership=F.ownership,toast=F.toast;
var sum=function(a,f){return a.reduce(function(s,x){return s+(Number(f(x))||0)},0)};
var CHIPS={wildcard:["وايلد كارد","chip-wc"],freehit:["فري هيت","chip-wc"],"3xc":["تربل كابتن","ac"],bboost:["بنش بوست","ac"]};
var LS={get:function(k){try{return localStorage.getItem(k)}catch(e){return null}},set:function(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
var HIST=null,HISTGW=0,PREV={},FIXA=null,FIXGW=0;
var FAV={m:{},t:{},p:{}};try{var _f=JSON.parse(LS.get("shwayaFav")||"null");if(_f&&_f.m&&_f.t&&_f.p)FAV=_f}catch(e){}
  function num(x) { return Number(x) || 0; }
  function r1(x) { return Math.round(x * 10) / 10; }
  function live() { return !!(S.D && S.D.live); }
  function chipUser(m) { return m.chip === "wildcard" || m.chip === "freehit"; }
  function incChip() { return S.F.trChip; }
  function sgn(v) { return (v > 0 ? "+" : "") + v; }
  function sg(v) { return v === "" || v == null ? '<span class="mut">–</span>' : '<span class="' + (v > 0 ? "pos" : v < 0 ? "neg" : "mut") + '">' + sgn(v) + "</span>"; }
  function act(a, arg) { a = { member: "m", team: "t", player: "p" }[a] || a; return ' data-act="' + a + '" data-arg="' + esc(arg) + '"'; }
  function memberLabel(m) { return esc(m.person) + " (" + esc(m.team) + ")"; }
  function initials(n) { var w = String(n).trim().split(/\s+/); return ((w[0] || "")[0] || "") + ((w[1] || "")[0] || ""); }
  function chipTag(m) { var c = CHIPS[m.chip]; return '<span class="tag ' + (c ? c[1] : "") + '">' + esc(c ? c[0] : m.chip) + "</span>"; }
  function ft(ms) { return ms ? new Date(ms).toLocaleString("ar-EG", { weekday: "short", hour: "numeric", minute: "2-digit" }) : ""; }
  function pidSet(m) { return m._ids || (m._ids = new Set(m.picks.map(function (p) { return p[0]; }))); }
  function jac(a, b) {
    var A = pidSet(a), B = pidSet(b), n = 0;
    A.forEach(function (x) { if (B.has(x)) n++; });
    return n / (A.size + B.size - n || 1);
  }
  function card(cls, title, body, extra) { return F.card(title, '<div class="ct">' + title + (extra || "") + "</div>" + body, "plus " + cls); }
  function li(attrs, name, small, v, vcls) {
    return '<div class="li click"' + attrs + '><div class="grow"><b>' + name + "</b><small>" + small + '</small></div><div class="v ' + (vcls || "") + '">' + v + "</div></div>";
  }
  function table(head, rows) {
    return '<div class="tbl-sc"><table class="mini-t"><thead><tr>' + head.map(function (h) { return "<th>" + h + "</th>"; }).join("") +
      "</tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
  }
  function noLive(t) { return card("ov-half", t, '<p class="mut">محتاج تحديث اللايف الأول</p>'); }
  function acRGB() {
    var v = (getComputedStyle(document.documentElement).getPropertyValue("--ac") || "#00b4d8").trim();
    if (/^#[0-9a-f]{6}$/i.test(v)) return [1, 3, 5].map(function (i) { return parseInt(v.substr(i, 2), 16); });
    return [0, 180, 216];
  }

  // نقاط تيمات مجمّعة (كابتن التيم حسب المسابقة)
  function teamAgg2(wm) {
    var dc = S.F.capTeam, T = {};
    wm.forEach(function (m) {
      var k = dc && m.isCaptain ? (m.capMult || 1) : 1;
      var R = T[m.team] || (T[m.team] = { team: m.team, net: 0, pts: 0, cost: 0, n: 0, left: 0, value: 0, ms: [] });
      R.net += m.d.net * k; R.pts += m.d.points * k; R.cost += m.cost * k; R.n++; R.left += m.d.left; R.value += m.value; R.ms.push(m);
    });
    return Object.keys(T).map(function (k) { return T[k]; });
  }
  function difPts(m, st) {
    var s = 0;
    m.d.xi.forEach(function (x) { var o = st[x.id]; if (o && o.pct <= 20) s += num(x.pts) * x.mult; });
    return s;
  }

  // ---------------------------------------------------------------
  // مكسب التحويلة (مع نظام الوايلد كارد والفري هيت)
  // ---------------------------------------------------------------
  function trGain(m) {
    var g = 0;
    m.transfers.forEach(function (x) { g += num(pPts(x[0])) - num(pPts(x[1])); });
    return g;
  }
  function prevScore(m) {
    var p = PREV[S.D.gw + "|" + m.entryId];
    if (!p) return null;
    return p.reduce(function (s, a) { return s + num(pPts(a[0])) * a[1]; }, 0);
  }
  function chipGain(m) { var ps = prevScore(m); return ps == null ? null : m.d.points - ps; }
  function teamTrans(wm) {
    var T = {};
    if (!live()) return T;
    wm.forEach(function (m) {
      var R = T[m.team] || (T[m.team] = { n: 0, gain: 0, hits: 0, tr: 0, chipN: 0, chipGain: 0, chipEst: 0 });
      R.n++;
      if (chipUser(m)) {
        R.chipN++;
        var cg = chipGain(m);
        if (cg != null) { R.chipGain += cg; R.chipEst++; }
        if (!incChip()) return;
      }
      R.gain += trGain(m); R.hits += m.cost; R.tr += m.transfers.length;
    });
    return T;
  }

  // ---------------------------------------------------------------
  // سجل الجولات (من الشيتات اللي اتحمّلت قبل كده)
  // ---------------------------------------------------------------
  function hMember(gw, m) {
    var g = HIST && HIST[gw], r = g && g[m.entryId];
    return r ? { pts: num(r[0]), cost: num(r[1]), value: num(r[2]), chip: r[3] } : null;
  }
  function prevNet(m) { var h = hMember(S.D.gw - 1, m); return h ? h.pts - h.cost : null; }
  function formOf(m) {
    var out = [];
    for (var g = S.D.gw - 4; g < S.D.gw; g++) { var h = hMember(g, m); if (h) out.push(h.pts - h.cost); }
    out.push(m.d.net);
    return out;
  }
  function teamNetAt(g, ms) {
    var s = 0, any = false;
    ms.forEach(function (m) { var h = hMember(g, m); if (h) { s += h.pts - h.cost; any = true; } });
    return any ? s : null;
  }

function isFav(k, key) { return !!FAV[k][key]; }
function star(k, key) { var o = isFav(k, key); return '<button type="button" class="star' + (o ? " on" : "") + '" data-fav="' + k + ":" + esc(key) + '" aria-label="مفضل">' + (o ? "★" : "☆") + "</button>"; }
  function C(k, l, v, o) {
    var c = { k: k, l: l, num: 1, def: false, v: v };
    if (o) for (var q in o) c[q] = o[q];
    return c;
  }
  function meMember(wm) {
    var id = LS.get("shwayaMe");
    return id ? (wm.filter(function (m) { return m.entryId === id; })[0] || null) : null;
  }
  function regret(m) {
    if (!live() || !m.d.xi.length) return null;
    var best = null;
    m.d.xi.forEach(function (x) { if (!best || num(x.pts) > num(best.pts)) best = x; });
    var cp = m.d.eff ? num(m.d.eff.pts) : 0, mult = m.d.eff ? m.d.eff.mult : 2;
    return Math.max(0, num(best.pts) - cp) * Math.max(1, mult - 1);
  }
  function memberCols(wm) {
    var st = ownership(wm), order = wm.slice().sort(function (a, b) { return b.d.net - a.d.net; }), gap = {}, tsum = {};
    order.forEach(function (m, i) { gap[m.uid] = i ? order[i - 1].d.net - m.d.net : 0; });
    wm.forEach(function (m) { tsum[m.team] = (tsum[m.team] || 0) + m.d.net; });
    var avg = (S.D.event && S.D.event.avg) || 0, me = meMember(wm), L = live();
    var noChipHide = function (m) { return chipUser(m) && !incChip(); };
    return [
      C("x_trg", "مكسب التحويلة", function (m) { return L && !noChipHide(m) ? trGain(m) : ""; },
        { def: true, h: function (m) { return noChipHide(m) ? chipTag(m) : sg(L ? trGain(m) : ""); },
          tot: function (list) { return sum(list, function (m) { return L && !noChipHide(m) ? trGain(m) : 0; }); } }),
      C("x_trn", "صافي التحويلة (بعد السوالب)", function (m) { return L && !noChipHide(m) ? trGain(m) - m.cost : ""; }, { h: function (m) { return noChipHide(m) ? chipTag(m) : sg(L ? trGain(m) - m.cost : ""); } }),
      C("x_chg", "مكسب الخاصية (تقدير)", function (m) { var g = chipUser(m) ? chipGain(m) : null; return g == null ? "" : g; }, { h: function (m) { var g = chipUser(m) ? chipGain(m) : null; return g == null ? '<span class="mut">–</span>' : sg(g); } }),
      C("x_reg", "ندم الكابتن", function (m) { return regret(m); }),
      C("x_share", "% من نقاط التيم", function (m) { return tsum[m.team] ? Math.round(m.d.net / tsum[m.team] * 100) : 0; }),
      C("x_played", "لعب % من التشكيلة", function (m) { return m.d.xi.length ? Math.round(m.d.played / m.d.xi.length * 100) : 0; }),
      C("x_subpts", "نقاط التبديلات", function (m) { return sum(m.d.picks.filter(function (x) { return x.subIn; }), function (x) { return num(x.pts); }); }),
      C("x_dif", "عدد الديفرنشيال", function (m) { return m.d.xi.filter(function (x) { return st[x.id] && st[x.id].pct <= 20; }).length; }),
      C("x_vsw", "عن متوسط العالم", function (m) { return avg ? m.d.net - avg : ""; }, { h: function (m) { return avg ? sg(m.d.net - avg) : '<span class="mut">–</span>'; } }),
      C("x_dprev", "تغير عن الجولة اللي فاتت", function (m) { var p = HIST ? prevNet(m) : null; return p == null ? "" : m.d.net - p; }, { h: function (m) { var p = HIST ? prevNet(m) : null; return p == null ? '<span class="mut">–</span>' : sg(m.d.net - p); } }),
      C("x_form", "الفورم (آخر 5 جولات)", function (m) { var f = HIST ? formOf(m) : [m.d.net]; return r1(sum(f, function (x) { return x; }) / f.length); }, { h: function (m) { return HIST ? formOf(m).join(" · ") : '<span class="mut">–</span>'; } }),
      C("x_gap", "محتاج كام للي قدامه", function (m) { return gap[m.uid]; }),
      C("x_ppm", "نقاط لكل مليون", function (m) { return m.value ? r1(m.d.net / m.value) : ""; }),
      C("x_vchg", "تغير قيمة الفريق", function (m) { var h = HIST ? hMember(S.D.gw - 1, m) : null; return h && h.value ? r1(m.value - h.value) : ""; }, { h: function (m) { var h = HIST ? hMember(S.D.gw - 1, m) : null; return h && h.value ? sg(r1(m.value - h.value)) : '<span class="mut">–</span>'; } }),
      C("x_sim", "التشابه مع اللي اخترته (أنت)", function (m) { return me ? Math.round(jac(me, m) * 100) : ""; }),
      C("x_star", "★", function (m) { return isFav("m", m.entryId) ? 1 : 0; }, { def: true, h: function (m) { return star("m", m.entryId); } })
    ];
  }
  function teamCols(wm) {
    var TT = teamTrans(wm), L = live(), ms = {}, ord = teamAgg2(wm).sort(function (a, b) { return b.net - a.net; }), gap = {}, avg = (S.D.event && S.D.event.avg) || 0;
    ord.forEach(function (R, i) { gap[R.team] = i ? ord[i - 1].net - R.net : 0; ms[R.team] = R; });
    return [
      C("x_trg", "مكسب التحويلة", function (R) { return TT[R.team] ? TT[R.team].gain : ""; }, { def: true, h: function (R) { return TT[R.team] ? sg(TT[R.team].gain) : '<span class="mut">–</span>'; }, tot: function (list) { return sum(list, function (R) { return TT[R.team] ? TT[R.team].gain : 0; }); } }),
      C("x_trh", "سوالب التحويلات", function (R) { return TT[R.team] ? TT[R.team].hits : ""; }),
      C("x_trn", "صافي مكسب التحويلة", function (R) { return TT[R.team] ? TT[R.team].gain - TT[R.team].hits : ""; }, { def: true, h: function (R) { return TT[R.team] ? sg(TT[R.team].gain - TT[R.team].hits) : '<span class="mut">–</span>'; }, tot: function (list) { return sum(list, function (R) { return TT[R.team] ? TT[R.team].gain - TT[R.team].hits : 0; }); } }),
      C("x_chn", "أصحاب خواص (وايلد/فري هيت)", function (R) { return TT[R.team] ? TT[R.team].chipN : ""; }),
      C("x_chg", "مكسب الخاصيات (تقدير)", function (R) { return TT[R.team] && TT[R.team].chipEst ? TT[R.team].chipGain : ""; }),
      C("x_topcap", "أكتر كابتن", function (R) { var t = topCap(ms[R.team]); return t ? P(t.id).n : ""; }, { h: function (R) { var t = topCap(ms[R.team]); return t ? esc(P(t.id).n) + ' <span class="mut">×' + t.n + "</span>" : '<span class="mut">–</span>'; } }),
      C("x_above", "% فوق متوسط العالم", function (R) { return avg && ms[R.team] ? Math.round(ms[R.team].ms.filter(function (m) { return m.d.net > avg; }).length / ms[R.team].n * 100) : ""; }),
      C("x_dprev", "تغير عن الجولة اللي فاتت", function (R) { var d = 0, any = false; (ms[R.team] ? ms[R.team].ms : []).forEach(function (m) { var p = HIST ? prevNet(m) : null; if (p != null) { d += m.d.net - p; any = true; } }); return any ? d : ""; }, { h: function (R) { var d = 0, any = false; (ms[R.team] ? ms[R.team].ms : []).forEach(function (m) { var p = HIST ? prevNet(m) : null; if (p != null) { d += m.d.net - p; any = true; } }); return any ? sg(d) : '<span class="mut">–</span>'; } }),
      C("x_gap", "محتاج كام للي قدامه", function (R) { return gap[R.team] || 0; }),
      C("x_ppm", "نقاط لكل مليون", function (R) { return ms[R.team] && ms[R.team].value ? r1(ms[R.team].net / ms[R.team].value) : ""; }),
      C("x_star", "★", function (R) { return isFav("t", R.team) ? 1 : 0; }, { def: true, h: function (R) { return star("t", R.team); } })
    ];
  }
  function topCap(R) {
    if (!R) return null;
    var c = {};
    R.ms.forEach(function (m) { if (m.d.eff) c[m.d.eff.id] = (c[m.d.eff.id] || 0) + 1; });
    var b = null;
    Object.keys(c).forEach(function (id) { if (!b || c[id] > b.n) b = { id: Number(id), n: c[id] }; });
    return b;
  }
  function playerCols() {
    return [
      C("x_vsw", "الفرق عن الامتلاك العالمي %", function (s) { return r1(s.pct - P(s.id).sel); }, { h: function (s) { return sg(r1(s.pct - P(s.id).sel)); } }),
      C("x_ppm", "نقاط لكل مليون", function (s) { var p = pPts(s.id), pr = P(s.id).price; return S.D.live && pr ? r1(num(p) / pr) : ""; }),
      C("x_star", "★", function (s) { return isFav("p", String(s.id)) ? 1 : 0; }, { def: true, h: function (s) { return star("p", String(s.id)); } })
    ];
  }
  function transferCols() {
    var L = live(), dl = S.D.event && S.D.event.deadline;
    return [
      C("x_ok", "ناجحة؟", function (r) { return L && r.i && r.o ? Math.sign(num(pPts(r.i)) - num(pPts(r.o))) : ""; },
        { def: true, h: function (r) { if (!L || !r.i || !r.o) return '<span class="mut">–</span>'; var g = num(pPts(r.i)) - num(pPts(r.o)); return g > 0 ? '<span class="tag chip-mg">ناجحة ✓</span>' : g < 0 ? '<span class="tag chip-wc">فاشلة ✕</span>' : '<span class="tag">متعادلة</span>'; } }),
      C("x_ddl", "قبل الديدلاين بـ (ساعة)", function (r) { return dl && r.ms ? r1((dl - r.ms) / 36e5) : ""; })
    ];
  }  function ppx(x, rank) {
    var b = rank === 0 ? '<span class="bc">C</span>' : rank === 1 ? '<span class="bc" style="background:#5B45FF">V</span>' : "";
    return '<button type="button" class="pp"' + act(x.act, x.arg) + ">" + b + '<span class="av" style="--s:54px"><b>' + esc(initials(x.name)) +
      '</b></span><span class="pp-n">' + esc(x.name) + '</span><span class="pp-t">' + esc(x.sub) + '</span><span class="pp-p">' + x.pts + "</span></button>";
  }
  function pitch15(L) {
    if (!L.length) return '<p class="mut">مفيش بيانات</p>';
    var shape = [3, 4, 3, 1], i = 0, rows = [];
    shape.forEach(function (n) {
      var base = i;
      rows.push(L.slice(i, i + n).map(function (x, k) { return ppx(x, base + k); }));
      i += n;
    });
    var bench = L.slice(11, 15).map(function (x, k) { return ppx(x, 11 + k); });
    return '<div class="pitch">' + rows.map(function (r) { return r.length ? '<div class="prow">' + r.join("") + "</div>" : ""; }).join("") +
      (bench.length ? '<div class="bench-row"><span class="lbl">الدكة</span><div class="prow" style="margin:8px 0 0">' + bench.join("") + "</div></div>" : "") + "</div>";
  }
  function memberPitch(wm, worst) {
    return pitch15(wm.slice().sort(function (a, b) { return worst ? a.d.net - b.d.net : b.d.net - a.d.net; }).slice(0, 15)
      .map(function (m) { return { name: m.person, sub: m.team, pts: m.d.net, act: "member", arg: m.uid }; }));
  }
  function teamPitch(T, worst) {
    return pitch15(T.slice().sort(function (a, b) { return worst ? a.net - b.net : b.net - a.net; }).slice(0, 15)
      .map(function (R) { return { name: R.team, sub: R.n + " أعضاء", pts: R.net, act: "team", arg: R.team }; }));
  }

  // ---------------------------------------------------------------
  // الكروت
  // ---------------------------------------------------------------
  function cardAwards(c) {
    var wm = c.wm, st = c.st, items = [];
    function best(f, low) {
      var b = null, bv = null;
      wm.forEach(function (m) { var v = f(m); if (v == null) return; if (bv == null || (low ? v < bv : v > bv)) { bv = v; b = m; } });
      return b ? { m: b, v: bv } : null;
    }
    function put(title, r, fv) {
      if (r) items.push('<div class="tile click"' + act("member", r.m.uid) + "><span>" + title + "</span><b>" + fv(r.v) + "</b><small><em>" + memberLabel(r.m) + "</em></small></div>");
    }
    var pts = function (v) { return v + " نقطة"; };
    put("👑 الريادي", best(function (m) { return m.d.net; }), pts);
    if (c.live) {
      put("🎯 الكابتن الذهبي", best(function (m) { return m.d.eff ? num(m.d.eff.pts) : null; }), pts);
      put("🥶 الكابتن الأنحس", best(function (m) { return m.d.eff ? num(m.d.eff.pts) : null; }, true), pts);
      put("💎 ملك الديفرنشيال", best(function (m) { return difPts(m, st); }), pts);
      put("🔄 أكتر تبديلات", best(function (m) { return m.d.subs > 0 ? m.d.subs : null; }), function (v) { return v + " تبديل"; });
      put("🪑 الدكة السودا", best(function (m) { return m.d.benchPts > 0 ? m.d.benchPts : null; }), pts);
      put("📈 أحسن تحويلات", best(function (m) { return chipUser(m) || !m.transfers.length ? null : trGain(m); }), sgn);
      put("📉 أسوأ تحويلات", best(function (m) { return chipUser(m) || !m.transfers.length ? null : trGain(m); }, true), sgn);
    }
    put("💸 الهيت الغالي", best(function (m) { return m.cost > 0 ? m.cost : null; }), function (v) { return "-" + v; });
    return card("ov-full", "🏅 جوايز الجولة", '<div class="plus-tiles">' + items.join("") + "</div>");
  }

  function cardTrTeams(c) {
    if (!c.live) return noLive("📈 مكسب التحويلات للتيمات");
    var T = teamTrans(c.wm);
    var rows = Object.keys(T).map(function (t) { return { t: t, r: T[t], net: T[t].gain - T[t].hits }; }).sort(function (a, b) { return b.net - a.net; });
    var body = table(["التيم", "أعضاء", "مكسب", "سوالب", "الصافي", "أصحاب خواص"], rows.map(function (x) {
      var ch = x.r.chipN ? x.r.chipN + (x.r.chipEst ? " (تقدير " + sgn(Math.round(x.r.chipGain)) + ")" : "") : "–";
      return '<tr class="click"' + act("team", x.t) + "><td><b>" + esc(x.t) + "</b></td><td>" + x.r.n + "</td><td>" + sg(x.r.gain) + "</td><td>" + (x.r.hits ? '<span class="neg">-' + x.r.hits + "</span>" : "0") +
        "</td><td><b>" + sg(x.net) + "</b></td><td>" + ch + "</td></tr>";
    }));
    return card("ov-full", "📈 مكسب التحويلات للتيمات", body + '<div class="lg"><span>مكسب التحويلة = نقاط اللاعيبة اللي اتشتروا ناقص اللي اتباعوا.</span><span>أصحاب الوايلد/الفري هيت مش بيتحسبوا (فعّل "ضم أصحاب الوايلد/الفري هيت" لو عايزهم)، والرقم اللي بين قوسين تقدير بتشكيلة الجولة اللي فاتت.</span></div>');
  }

  function cardCapFail(c) {
    if (!c.live) return noLive("🥶 الكباتن الفاشلة");
    var by = {};
    c.wm.forEach(function (m) {
      var e = m.d.eff;
      if (!e || num(e.pts) >= 3 || !isPlayed(pStat(e.id))) return;
      var R = by[e.id] || (by[e.id] = { id: e.id, n: 0, pts: num(e.pts), ms: [] });
      R.n++; R.ms.push(m);
    });
    var L = Object.keys(by).map(function (k) { return by[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    return card("ov-half", "🥶 الكباتن الفاشلة (أقل من 3 نقط)", L.length ? L.map(function (R) {
      return li(act("player", R.id), esc(P(R.id).n), "كبّتوه " + R.n + " · " + R.ms.slice(0, 3).map(function (m) { return esc(m.person); }).join("، ") + (R.n > 3 ? "..." : ""), R.pts, "neg");
    }).join("") : '<p class="mut">مفيش كابتن فاشل لحد دلوقتي 👌</p>');
  }

  function cardRegret(c) {
    if (!c.live) return noLive("😩 ندم الكابتن");
    var L = c.wm.map(function (m) { return { m: m, r: regret(m) }; }).filter(function (x) { return x.r > 0; }).sort(function (a, b) { return b.r - a.r; }).slice(0, 6);
    return card("ov-half", "😩 ندم الكابتن (نقاط ضاعت)", L.length ? L.map(function (x) {
      var best = null;
      x.m.d.xi.forEach(function (p) { if (!best || num(p.pts) > num(best.pts)) best = p; });
      return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team) + " · كبّت " + (x.m.d.eff ? esc(P(x.m.d.eff.id).n) + " (" + num(x.m.d.eff.pts) + ")" : "مفيش") + " وأحسن واحد " + esc(P(best.id).n) + " (" + num(best.pts) + ")", "-" + x.r, "neg");
    }).join("") : '<p class="mut">كله كبّت صح 🎯</p>');
  }

  function cardFix(c) {
    var Lv = S.D.live;
    if (!Lv) return noLive("⚽ ماتشات الجولة ومين فيها");
    var cl = S.D.clubs || {};
    var rows = Lv.fx.slice().sort(function (a, b) { return a.k - b.k; }).map(function (f) {
      var owners = 0, slots = 0;
      c.wm.forEach(function (m) {
        var n = 0;
        m.d.xi.forEach(function (x) { var t = P(x.id).t; if (t === f.h || t === f.a) n++; });
        if (n) { owners++; slots += n; }
      });
      var mid = f.s ? "<b>" + (f.hs == null ? 0 : f.hs) + " - " + (f.as == null ? 0 : f.as) + "</b>" : '<span class="mut">' + ft(f.k) + "</span>";
      return "<tr><td>" + esc(cl[f.h] || f.h) + " " + mid + " " + esc(cl[f.a] || f.a) + "</td><td>" + (f.f || f.fp ? "انتهى" : f.s ? f.m + "'" : "لسه") + "</td><td>" + owners + "</td><td>" + slots + "</td></tr>";
    });
    return card("ov-half", "⚽ ماتشات الجولة ومين فيها", table(["الماتش", "الحالة", "أعضاء", "لاعيبة"], rows));
  }

  function pickXI(pool, score) {
    var by = { GKP: [], DEF: [], MID: [], FWD: [] };
    pool.forEach(function (s) { var p = P(s.id).pos; if (by[p]) by[p].push(s); });
    Object.keys(by).forEach(function (k) { by[k].sort(function (a, b) { return score(b) - score(a); }); });
    var sel = [], cnt = { GKP: 0, DEF: 0, MID: 0, FWD: 0 }, max = { GKP: 1, DEF: 5, MID: 5, FWD: 3 }, min = { GKP: 1, DEF: 3, MID: 2, FWD: 1 };
    Object.keys(min).forEach(function (k) { for (var i = 0; i < min[k] && i < by[k].length; i++) { sel.push(by[k][i]); cnt[k]++; } });
    var rest = [];
    Object.keys(by).forEach(function (k) { by[k].slice(cnt[k]).forEach(function (s) { rest.push({ s: s, k: k }); }); });
    rest.sort(function (a, b) { return score(b.s) - score(a.s); });
    rest.forEach(function (r) { if (sel.length < 11 && cnt[r.k] < max[r.k]) { sel.push(r.s); cnt[r.k]++; } });
    return sel;
  }
  function xiPitch(sel) {
    var rows = ["GKP", "DEF", "MID", "FWD"].map(function (p) {
      return '<div class="prow">' + sel.filter(function (s) { return P(s.id).pos === p; }).map(function (s) {
        return ppCard({ id: s.id, st: pStat(s.id), pts: pPts(s.id), mult: 1, inXI: true, vice: false, subIn: false, subOut: false });
      }).join("") + "</div>";
    });
    var total = sum(sel, function (s) { return num(pPts(s.id)); });
    return '<div class="pitch">' + rows.join("") + "</div>" + '<div class="lg"><span>مجموع النقاط: <b>' + total + "</b></span></div>";
  }
  function cardXIbest(c) {
    if (!c.live) return noLive("⭐ تشكيلة الجولة");
    var pool = Object.keys(c.st).map(function (id) { return c.st[id]; }).filter(function (s) { return s.own > 0; });
    return card("ov-half", "⭐ تشكيلة الجولة (أحسن 11 من اللاعيبة اللي اتملكت)", xiPitch(pickXI(pool, function (s) { return num(pPts(s.id)) * 1000 + s.own; })));
  }
  function cardXImajor(c) {
    var pool = Object.keys(c.st).map(function (id) { return c.st[id]; }).filter(function (s) { return s.own > 0; });
    return card("ov-half", "🧑‍🤝‍🧑 تشكيلة الأغلبية (أكتر 11 لاعب ملكية)", xiPitch(pickXI(pool, function (s) { return s.own * 1000 + num(pPts(s.id)); })));
  }

  function cardStarFlop(c) {
    if (!c.live) return noLive("🌟 نجم الجولة وخيبتها");
    var A = Object.keys(c.st).map(function (id) { return c.st[id]; }).filter(function (s) { return s.own > 0; });
    var stars = A.slice().sort(function (a, b) { return num(pPts(b.id)) - num(pPts(a.id)); }).slice(0, 4);
    var flops = A.filter(function (s) { return s.pct >= 25 && num(pPts(s.id)) <= 2 && isPlayed(pStat(s.id)); }).sort(function (a, b) { return b.pct - a.pct; }).slice(0, 4);
    var row = function (s, cls) { return li(act("player", s.id), esc(P(s.id).n), "عند " + s.pct + "% (" + s.own + " عضو)", num(pPts(s.id)), cls); };
    return card("ov-half", "🌟 نجم الجولة وخيبتها",
      '<div class="sub-h">النجوم</div>' + stars.map(function (s) { return row(s, "pos"); }).join("") +
      '<div class="sub-h">الخيبات (عند ناس كتير وجابوا قليل)</div>' + (flops.map(function (s) { return row(s, "neg"); }).join("") || '<p class="mut">مفيش</p>'));
  }

  function cardImpact(c) {
    if (!c.live) return noLive("💥 تأثير اللاعب");
    var L = Object.keys(c.st).map(function (id) { return c.st[id]; }).filter(function (s) { return s.own > 0; })
      .map(function (s) { return { s: s, v: s.own * num(pPts(s.id)) }; }).sort(function (a, b) { return b.v - a.v; }).slice(0, 6);
    return card("ov-half", "💥 تأثير اللاعب (نقاطه × اللي عنده)", L.map(function (x) { return li(act("player", x.s.id), esc(P(x.s.id).n), x.s.own + " عضو × " + num(pPts(x.s.id)) + " نقطة", x.v, "pos"); }).join(""));
  }

  function cardDecision(c) {
    if (!c.live || c.T.length < 2) return noLive("⚖️ قرار الجولة");
    var A = c.T[0], B = c.T[c.T.length - 1], diff = {};
    var cnt = function (R) { var o = {}; R.ms.forEach(function (m) { m.d.xi.forEach(function (x) { o[x.id] = (o[x.id] || 0) + 1; }); }); return o; };
    var ca = cnt(A), cb = cnt(B);
    Object.keys(Object.assign({}, ca, cb)).forEach(function (id) { diff[id] = ((ca[id] || 0) / A.n - (cb[id] || 0) / B.n) * num(pPts(Number(id))); });
    var L = Object.keys(diff).sort(function (a, b) { return Math.abs(diff[b]) - Math.abs(diff[a]); }).slice(0, 6);
    return card("ov-half", "⚖️ قرار الجولة (اللي فرّق بين الأول والأخير)",
      '<div class="lg"><span>الأول: <b>' + esc(A.team) + "</b></span><span>الأخير: <b>" + esc(B.team) + "</b></span></div>" +
      L.map(function (id) { var v = Math.round(diff[id] * 10) / 10; return li(act("player", id), esc(P(Number(id)).n), v > 0 ? "لصالح " + esc(A.team) : "لصالح " + esc(B.team), sgn(v), v > 0 ? "pos" : "neg"); }).join(""));
  }

  function cardWave(c) {
    var first = {};
    c.wm.forEach(function (m) {
      m.transfers.forEach(function (x) {
        var t = Date.parse(x[2]) || 0, R = first[x[0]] || (first[x[0]] = { id: x[0], n: 0, t: 1e18, m: null });
        R.n++;
        if (t && t < R.t) { R.t = t; R.m = m; }
      });
    });
    var L = Object.keys(first).map(function (k) { return first[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 6);
    return card("ov-half", "🌊 موجة الشراء (أول واحد اشتراه)", L.length ? L.map(function (R) {
      return li(act("player", R.id), esc(P(R.id).n), "اتشرى " + R.n + " مرة · الأول: " + (R.m ? esc(R.m.person) + " (" + ft(R.t) + ")" : "-"), "+" + R.n, "pos");
    }).join("") : '<p class="mut">مفيش تحويلات</p>');
  }

  function cardChips(c) {
    var by = {}, none = [];
    c.wm.forEach(function (m) { if (m.chip) (by[m.chip] = by[m.chip] || []).push(m); else none.push(m); });
    var avgNone = none.length ? r1(sum(none, function (m) { return m.d.net; }) / none.length) : 0;
    var rows = Object.keys(by).map(function (k) {
      var L = by[k], a = r1(sum(L, function (m) { return m.d.net; }) / L.length), best = L.slice().sort(function (x, y) { return y.d.net - x.d.net; })[0];
      return "<tr><td>" + chipTag({ chip: k }) + "</td><td>" + L.length + "</td><td>" + a + "</td><td>" + sg(r1(a - avgNone)) + "</td><td>" + esc(best.person) + " (" + best.d.net + ")</td></tr>";
    });
    return card("ov-half", "🃏 الخواص", rows.length ? table(["الخاصية", "عدد", "متوسط", "عن بدون خاصية", "أحسن واحد"], rows) + '<div class="lg"><span>متوسط اللي من غير خاصية: <b>' + avgNone + "</b></span></div>" : '<p class="mut">محدش لعب خاصية</p>');
  }

  function cardSubsLuck(c) {
    if (!c.live) return noLive("🍀 حظ التبديلات");
    var L = c.wm.map(function (m) {
      var g = sum(m.d.picks.filter(function (x) { return x.subIn; }), function (x) { return num(x.pts); });
      var vc = m.d.eff && m.d.cap && m.d.eff !== m.d.cap ? num(m.d.eff.pts) * (m.d.eff.mult - 1) : 0;
      return { m: m, g: g, vc: vc, t: g + vc };
    }).filter(function (x) { return x.t > 0; }).sort(function (a, b) { return b.t - a.t; }).slice(0, 6);
    return card("ov-half", "🍀 حظ التبديلات والفايس كابتن", L.length ? L.map(function (x) {
      return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team) + " · تبديلات " + x.g + (x.vc ? " · فايس كابتن +" + x.vc : ""), "+" + x.t, "pos");
    }).join("") : '<p class="mut">مفيش تبديلات لحد دلوقتي</p>');
  }

  function cardInjured(c) {
    var L = c.wm.map(function (m) {
      var bad = m.d.xi.filter(function (x) { var p = P(x.id), s = pStat(x.id); return (x.st === "pending" || x.st === "live0" || s === "na") && (p.st !== "a" || (p.ch !== "" && Number(p.ch) < 75)); });
      return { m: m, bad: bad };
    }).filter(function (x) { return x.bad.length; }).sort(function (a, b) { return b.bad.length - a.bad.length; }).slice(0, 6);
    return card("ov-half", "🚑 لاعيبة مشكوك فيهم في التشكيلات", L.length ? L.map(function (x) {
      return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team) + " · " + x.bad.map(function (b) { return esc(P(b.id).n) + (P(b.id).ch !== "" ? " (" + P(b.id).ch + "%)" : ""); }).join("، "), x.bad.length, "neg");
    }).join("") : '<p class="mut">مفيش حد عنده مشكوك فيهم 👌</p>');
  }

  function cardClubs(c) {
    var C2 = {}, tri = 0;
    c.wm.forEach(function (m) {
      var cnt = {}, has3 = false;
      m.d.xi.forEach(function (x) {
        var cl = P(x.id).club;
        if (!cl) return;
        var R = C2[cl] || (C2[cl] = { c: cl, slots: 0, pts: 0 });
        R.slots++; R.pts += num(x.pts) * x.mult; cnt[cl] = (cnt[cl] || 0) + 1;
      });
      Object.keys(cnt).forEach(function (k) { if (cnt[k] >= 3) has3 = true; });
      if (has3) tri++;
    });
    var L = Object.keys(C2).map(function (k) { return C2[k]; }).sort(function (a, b) { return b.slots - a.slots; }).slice(0, 6);
    return card("ov-half", "🏟️ الأندية", table(["النادي", "لاعيبة في التشكيلات", "نقاطهم"], L.map(function (R) { return "<tr><td><b>" + esc(R.c) + "</b></td><td>" + R.slots + "</td><td>" + R.pts + "</td></tr>"; })) +
      '<div class="lg"><span><b>' + tri + "</b> عضو عنده 3 لاعيبة أو أكتر من نفس النادي</span></div>");
  }

  function cardFormations(c) {
    var F = {};
    c.wm.forEach(function (m) {
      var d = 0, mi = 0, f = 0;
      m.d.xi.forEach(function (x) { var p = P(x.id).pos; if (p === "DEF") d++; else if (p === "MID") mi++; else if (p === "FWD") f++; });
      var k = d + "-" + mi + "-" + f, R = F[k] || (F[k] = { k: k, n: 0, net: 0 });
      R.n++; R.net += m.d.net;
    });
    var L = Object.keys(F).map(function (k) { return F[k]; }).sort(function (a, b) { return b.n - a.n; }).slice(0, 7);
    var best = L.slice().sort(function (a, b) { return b.net / b.n - a.net / a.n; })[0];
    return card("ov-half", "🧩 الخطط", table(["الخطة", "عدد", "متوسط النقاط"], L.map(function (R) { return "<tr><td><b>" + R.k + "</b></td><td>" + R.n + "</td><td>" + r1(R.net / R.n) + "</td></tr>"; })) +
      (best ? '<div class="lg"><span>أنجح خطة: <b>' + best.k + "</b> بمتوسط " + r1(best.net / best.n) + "</span></div>" : ""));
  }

  function cardPositions(c) {
    var pos = ["GKP", "DEF", "MID", "FWD"], lab = ["حراس", "مدافعين", "وسط", "مهاجمين"], byT = {}, all = [0, 0, 0, 0];
    c.wm.forEach(function (m) {
      var R = byT[m.team] || (byT[m.team] = [0, 0, 0, 0]);
      m.d.xi.forEach(function (x) { var i = pos.indexOf(P(x.id).pos); if (i > -1) { var v = num(x.pts) * x.mult; R[i] += v; all[i] += v; } });
    });
    var tot = sum(all, function (x) { return x; }) || 1;
    var stk = function (a) { var t = sum(a, function (x) { return x; }) || 1; return '<div class="stk">' + a.map(function (v, i) { return '<i class="pz' + i + '" style="width:' + (v / t * 100) + '%"></i>'; }).join("") + "</div>"; };
    var rows = Object.keys(byT).slice(0, 12).map(function (t) { return "<tr><td><b>" + esc(t) + "</b></td><td style=\"min-width:180px\">" + stk(byT[t]) + "</td></tr>"; });
    return card("ov-half", "📊 توزيع النقاط على المراكز", stk(all) + '<div class="lg">' + lab.map(function (l, i) { return '<span><b class="pz' + i + '"></b>' + l + " " + Math.round(all[i] / tot * 100) + "%</span>"; }).join("") + "</div>" +
      (rows.length > 1 ? table(["التيم", "التوزيع"], rows) : ""));
  }

  function cardWorld(c) {
    var ev = S.D.event || {}, avg = ev.avg || 0, hi = ev.high || 0;
    if (!avg) return card("ov-half", "🌍 مقارنة بالعالم", '<p class="mut">متوسط العالم لسه مش متاح - دوس (⋯) ثم "إعادة تحميل كاملة" عشان بيانات الجولة تتحدث.</p>');
    var above = c.wm.filter(function (m) { return m.d.net > avg; }).length;
    var rows = c.T.map(function (R) { var a = R.ms.filter(function (m) { return m.d.net > avg; }).length; return '<tr class="click"' + act("team", R.team) + "><td><b>" + esc(R.team) + "</b></td><td>" + Math.round(a / R.n * 100) + "%</td><td>" + sg(r1(R.net / R.n - avg)) + "</td></tr>"; });
    return card("ov-half", "🌍 مقارنة بمتوسط العالم", '<div class="lg"><span>متوسط العالم: <b>' + avg + "</b></span><span>أعلى سكور في العالم: <b>" + hi + "</b></span><span>فوق المتوسط: <b>" + above + " من " + c.wm.length + "</b></span></div>" +
      table(["التيم", "% فوق المتوسط", "متوسط العضو عن العالم"], rows));
  }

  function cardRace(c) {
    if (c.T.length < 2) return "";
    var lead = c.T[0];
    var rows = c.T.map(function (R, i) {
      return '<tr class="click"' + act("team", R.team) + "><td><b>" + esc(R.team) + "</b></td><td>" + R.net + "</td><td>" + (i ? "-" + (lead.net - R.net) : "👑") + "</td><td>" + (i ? "-" + (c.T[i - 1].net - R.net) : "–") + "</td><td>" + R.left + "</td></tr>";
    });
    return card("ov-half", "🏁 سباق الصدارة", table(["التيم", "الصافي", "عن الأول", "عن اللي قدامه", "لاعيبة لسه"], rows));
  }

  function cardCumulative(c) {
    if (!HIST) return card("ov-half", "📚 تراكمي الجولات", '<p class="mut">بيحمّل سجل الجولات...</p>');
    var gws = Object.keys(HIST).map(Number).sort(function (a, b) { return a - b; });
    if (!gws.length) return card("ov-half", "📚 تراكمي الجولات", '<p class="mut">مفيش جولات قديمة اتحمّلت لسه. افتح الجولات اللي فاتت مرة عشان تتسجل.</p>');
    var series = c.T.map(function (R) {
      var pts = gws.map(function (g) { return teamNetAt(g, R.ms); });
      pts.push(R.net);
      var total = sum(pts, function (x) { return x == null ? 0 : x; });
      return { team: R.team, pts: pts, total: total };
    }).sort(function (a, b) { return b.total - a.total; });
    var W = 300, H = 120, n = gws.length + 1, max = 1, min = 0;
    series.forEach(function (s) { s.pts.forEach(function (v) { if (v != null) { if (v > max) max = v; if (v < min) min = v; } }); });
    var cols = ["#6366f1", "#10b981", "#f59e0b", "#ef4444", "#06b6d4", "#ec4899"];
    var lines = series.slice(0, 6).map(function (s, k) {
      var pts = s.pts.map(function (v, i) { return v == null ? null : (n > 1 ? i / (n - 1) * (W - 20) + 10 : W / 2) + "," + (H - 10 - (v - min) / (max - min || 1) * (H - 20)); }).filter(Boolean).join(" ");
      return '<polyline fill="none" stroke="' + cols[k] + '" stroke-width="2.4" points="' + pts + '"/>';
    }).join("");
    var lg = series.slice(0, 6).map(function (s, k) { return '<span><b style="background:' + cols[k] + '"></b>' + esc(s.team) + "</span>"; }).join("");
    var rows = series.map(function (s, i) { return '<tr class="click"' + act("team", s.team) + "><td>" + (i + 1) + "</td><td><b>" + esc(s.team) + "</b></td><td>" + s.total + "</td></tr>"; });
    return card("ov-half", "📚 تراكمي الجولات المحمّلة (" + (gws.length + 1) + " جولات)", '<svg viewBox="0 0 ' + W + " " + H + '" style="width:100%;height:auto">' + lines + "</svg>" + '<div class="lg">' + lg + "</div>" + table(["#", "التيم", "المجموع"], rows));
  }

  function cardMatrix(c) {
    var T = c.T.slice(0, 10);
    if (T.length < 2) return "";
    var V = T.map(function (R) { var v = {}; R.ms.forEach(function (m) { pidSet(m).forEach(function (id) { v[id] = (v[id] || 0) + 1 / R.n; }); }); return v; });
    var norm = V.map(function (v) { return Math.sqrt(sum(Object.keys(v), function (k) { return v[k] * v[k]; })) || 1; });
    var rgb = acRGB();
    var sim = function (i, j) { var d = 0; Object.keys(V[i]).forEach(function (k) { if (V[j][k]) d += V[i][k] * V[j][k]; }); return d / (norm[i] * norm[j]); };
    var rows = T.map(function (R, i) {
      return "<tr><td><b>" + esc(R.team) + "</b></td>" + T.map(function (_, j) {
        var s = sim(i, j);
        return '<td style="background:rgba(' + rgb.join(",") + "," + (s * 0.85).toFixed(2) + ');font-weight:700">' + Math.round(s * 100) + "</td>";
      }).join("") + "</tr>";
    });
    return card("ov-half", "🔥 تشابه التيمات", table([""].concat(T.map(function (R) { return esc(R.team); })), rows));
  }

  function cardDiff(c) {
    var wm = c.wm;
    if (wm.length < 4 || wm.length > 400) return "";
    var L = wm.map(function (m) {
      var s = 0, n = 0;
      wm.forEach(function (o) { if (o !== m) { s += jac(m, o); n++; } });
      return { m: m, v: n ? Math.round(s / n * 100) : 0 };
    }).sort(function (a, b) { return a.v - b.v; });
    var row = function (x) { return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team), x.v + "%", ""); };
    return card("ov-half", "🧭 العضو المختلف والتقليدي (متوسط التشابه)",
      '<div class="sub-h">الأكتر اختلافًا</div>' + L.slice(0, 4).map(row).join("") + '<div class="sub-h">الأكتر تقليدية</div>' + L.slice(-4).reverse().map(row).join(""));
  }

  function cardHerd(c) {
    if (!c.live) return noLive("🐑 كابتن القطيع");
    var cnt = {};
    c.wm.forEach(function (m) { if (m.d.eff) cnt[m.d.eff.id] = (cnt[m.d.eff.id] || 0) + 1; });
    var top = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })[0];
    if (!top) return "";
    var herd = c.wm.filter(function (m) { return m.d.eff && m.d.eff.id === Number(top); }), rest = c.wm.filter(function (m) { return m.d.eff && m.d.eff.id !== Number(top); });
    var a = function (L) { return L.length ? r1(sum(L, function (m) { return m.d.net; }) / L.length) : 0; };
    var odd = rest.slice().sort(function (x, y) { return num(y.d.eff.pts) - num(x.d.eff.pts); }).slice(0, 4);
    return card("ov-half", "🐑 كابتن القطيع",
      '<div class="lg"><span>الأغلبية كبّتت <b>' + esc(P(Number(top)).n) + "</b> (" + herd.length + " عضو · " + num(pPts(Number(top))) + " نقطة)</span></div>" +
      table(["", "عدد", "متوسط الصافي"], ["<tr><td>مع القطيع</td><td>" + herd.length + "</td><td>" + a(herd) + "</td></tr>", "<tr><td>عكسهم</td><td>" + rest.length + "</td><td>" + a(rest) + "</td></tr>"]) +
      '<div class="sub-h">أنجح اللي خرجوا عن القطيع</div>' + (odd.map(function (m) { return li(act("member", m.uid), esc(m.person), esc(m.team) + " · " + esc(P(m.d.eff.id).n), num(m.d.eff.pts), ""); }).join("") || '<p class="mut">-</p>'));
  }

  function cardFavs() {
    var items = [];
    S.D.members.forEach(function (m) { if (isFav("m", m.entryId)) items.push(li(act("member", m.uid), esc(m.person), "عضو · " + esc(m.team), m.d.net, "")); });
    var T = {};
    S.D.members.forEach(function (m) { T[m.team] = 1; });
    Object.keys(T).forEach(function (t) { if (isFav("t", t)) items.push(li(act("team", t), esc(t), "تيم", "★", "")); });
    Object.keys(FAV.p).forEach(function (id) { if (S.D.players[id]) items.push(li(act("player", id), esc(P(Number(id)).n), "لاعب · " + esc(P(Number(id)).club), live() ? num(pPts(Number(id))) : "", "")); });
    return card("ov-half", "⭐ المفضلين", items.length ? items.join("") : '<p class="mut">دوس على ☆ في جداول الأعضاء والتيمات واللاعيبة وهيظهروا هنا.</p>');
  }

  function cardMe(c) {
    var wm = c.wm, me = meMember(wm);
    var sel = '<select class="me-sel" id="meSel"><option value="">اختار نفسك...</option>' + wm.slice().sort(function (a, b) { return a.person.localeCompare(b.person, "ar"); }).map(function (m) { return '<option value="' + esc(m.entryId) + '"' + (me && me.entryId === m.entryId ? " selected" : "") + ">" + esc(m.person) + " - " + esc(m.team) + "</option>"; }).join("") + "</select>";
    if (!me) return card("ov-half", "🙋 أنت وهم", sel + '<p class="mut">اختار نفسك وهتظهرلك مقارنتك بالمتوسط والمتصدر وأقرب وأبعد عضو ليك.</p>');
    var order = wm.slice().sort(function (a, b) { return b.d.net - a.d.net; }), rank = order.indexOf(me) + 1, lead = order[0], ahead = rank > 1 ? order[rank - 2] : null;
    var avg = r1(sum(wm, function (m) { return m.d.net; }) / wm.length);
    var sims = wm.filter(function (m) { return m !== me; }).map(function (m) { return { m: m, v: Math.round(jac(me, m) * 100) }; }).sort(function (a, b) { return b.v - a.v; });
    var mine = {}, ld = {};
    pidSet(me).forEach(function (id) { mine[id] = 1; });
    pidSet(lead).forEach(function (id) { ld[id] = 1; });
    var onlyMe = Object.keys(mine).filter(function (id) { return !ld[id]; }).map(Number).sort(function (a, b) { return num(pPts(b)) - num(pPts(a)); }).slice(0, 3);
    var onlyLd = Object.keys(ld).filter(function (id) { return !mine[id]; }).map(Number).sort(function (a, b) { return num(pPts(b)) - num(pPts(a)); }).slice(0, 3);
    var nm = function (ids) { return ids.map(function (i) { return esc(P(i).n) + " (" + num(pPts(i)) + ")"; }).join("، ") || "-"; };
    return card("ov-half", "🙋 أنت وهم", sel +
      '<div class="lg"><span>ترتيبك: <b>' + rank + " من " + wm.length + "</b></span><span>صافيك: <b>" + me.d.net + "</b></span><span>المتوسط: <b>" + avg + " (" + sgn(r1(me.d.net - avg)) + ")</b></span><span>عن المتصدر: <b>" + (rank > 1 ? "-" + (lead.d.net - me.d.net) : "👑") + "</b></span>" +
      (ahead ? "<span>محتاج <b>" + (ahead.d.net - me.d.net) + "</b> عشان تلحق " + esc(ahead.person) + "</span>" : "") + "</div>" +
      '<div class="sub-h">أقرب تشكيلة ليك</div>' + sims.slice(0, 2).map(function (x) { return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team), x.v + "%", ""); }).join("") +
      '<div class="sub-h">أبعد تشكيلة عنك</div>' + sims.slice(-2).reverse().map(function (x) { return li(act("member", x.m.uid), esc(x.m.person), esc(x.m.team), x.v + "%", ""); }).join("") +
      '<div class="sub-h">عندك وعند المتصدر لأ: ' + nm(onlyMe) + '</div><div class="sub-h">عنده وعندك لأ: ' + nm(onlyLd) + "</div>");
  }

  function waText(c) {
    var L = ["📊 ملخص الجولة " + S.D.gw, ""];
    c.T.slice(0, 3).forEach(function (R, i) { L.push(["🥇", "🥈", "🥉"][i] + " " + R.team + " - " + R.net); });
    var top = c.wm.slice().sort(function (a, b) { return b.d.net - a.d.net; }).slice(0, 5);
    L.push("", "👑 أعلى الأعضاء:");
    top.forEach(function (m, i) { L.push((i + 1) + ". " + m.person + " (" + m.team + ") - " + m.d.net); });
    var cap = Object.keys(c.st).map(function (id) { return c.st[id]; }).sort(function (a, b) { return b.cap - a.cap; })[0];
    if (cap && cap.cap) L.push("", "🎯 أكتر كابتن: " + P(cap.id).n + " (" + cap.cap + ")");
    var hit = c.wm.slice().sort(function (a, b) { return b.cost - a.cost; })[0];
    if (hit && hit.cost) L.push("💸 أكبر سوالب: " + hit.person + " (-" + hit.cost + ")");
    return L.join("\n");
  }

/* ---------- لصق مع التطبيق ---------- */
function ppx(x,rank){return F.initP({n:x.name,s:x.sub,v:x.pts,a:x.act==="member"?"m":x.act==="team"?"t":x.act,g:x.arg},rank)}
function pitch15(L){
  if(!L.length)return'<p class="mut">مفيش بيانات</p>';var sh=[3,4,3,1],i=0,rows=[];
  sh.forEach(function(n){var b=i;rows.push(L.slice(i,i+n).map(function(x,k){return ppx(x,b+k)}));i+=n});
  var bn=L.slice(11,15).map(function(x,k){return ppx(x,11+k)});
  return'<div class="pitch">'+rows.map(function(r){return r.length?'<div class="pr">'+r.join("")+"</div>":""}).join("")+"</div>"+(bn.length?'<div class="bn"><div class="pr">'+bn.join("")+"</div></div>":"")}
function ppCard(x){return'<button class="p '+(x.st==="dnp"?"dnp":"")+'" data-act="p" data-arg="'+x.id+'">'+F.av(x.id,42)+'<span class="nm">'+esc(P(x.id).n)+'</span><em class="n">'+x.pts+"</em></button>"}
function xiPitch(sel){
  var rows=["GKP","DEF","MID","FWD"].map(function(p){return'<div class="pr">'+sel.filter(function(s){return P(s.id).pos===p}).map(function(s){return ppCard({id:s.id,st:pStat(s.id),pts:pPts(s.id)})}).join("")+"</div>"});
  return'<div class="pitch">'+rows.join("")+'</div><div class="lg"><span>مجموع النقاط: <b>'+sum(sel,function(s){return num(pPts(s.id))})+"</b></span></div>"}

function ctxP(){var wm=WM();return{wm:wm,st:ownership(wm),T:teamAgg2(wm).sort(function(a,b){return b.net-a.net}),live:live()}}
function cardTop10(c){var L=c.wm.slice().sort(function(a,b){return b.d.net-a.d.net}).slice(0,10);return card("ov-half","أعلى 10 أعضاء",L.map(function(m,i){return li(act("member",m.uid),esc(m.person),esc(m.team)+(m.chip?" - "+(CHIPS[m.chip]||[m.chip])[0]:""),m.d.net,"")}).join(""))}
function cardBuySell(c){var A=Object.keys(c.st).map(function(k){return c.st[k]});var b=A.filter(function(s){return s.buy}).sort(function(a,z){return z.buy-a.buy}).slice(0,5),s2=A.filter(function(s){return s.sell}).sort(function(a,z){return z.sell-a.sell}).slice(0,5);
  return card("ov-half","الأكتر شراء وبيع",'<div class="sub-h">الأكتر شراء</div>'+(b.map(function(s){return li(act("player",s.id),esc(P(s.id).n),"اتشرى "+s.buy+" مرة","+"+s.buy,"up")}).join("")||'<p class="mut">-</p>')+'<div class="sub-h">الأكتر بيع</div>'+(s2.map(function(s){return li(act("player",s.id),esc(P(s.id).n),"اتباع "+s.sell+" مرة","-"+s.sell,"dn")}).join("")||'<p class="mut">-</p>'))}
function tilesMore(c){
  var wm=c.wm,L=c.live,hit=wm.slice().sort(function(a,b){return b.cost-a.cost})[0],bw=wm.slice().sort(function(a,b){return b.d.benchPts-a.d.benchPts})[0],top=wm.slice().sort(function(a,b){return b.d.net-a.d.net})[0];
  var dif=L?Object.keys(c.st).map(function(k){return c.st[k]}).filter(function(s){return s.own&&s.pct<=20}).sort(function(a,b){return num(pPts(b.id))-num(pPts(a.id))})[0]:null;
  var chips={};wm.forEach(function(m){if(m.chip)chips[m.chip]=(chips[m.chip]||0)+1});var trn=sum(wm,function(m){return m.transfers.length});
  var t=function(l,v,sub,a){return'<div class="cd t '+(a?"act":"")+'"'+(a||"")+'><div class="k">'+l+'</div><b class="n">'+v+"</b><small>"+sub+"</small></div>"};
  return'<div class="g2">'+t("أعلى عضو",top?top.d.net:"-",top?esc(top.person):"",top?act("member",top.uid):"")+t("أحسن ديفرنشيال",dif?num(pPts(dif.id)):"-",dif?esc(P(dif.id).n)+" عند "+dif.pct+"%":"محتاج لايف",dif?act("player",dif.id):"")+t("أكبر سوالب",hit&&hit.cost?"-"+hit.cost:"0",hit&&hit.cost?esc(hit.person):"محدش ضرب هيت",hit&&hit.cost?act("member",hit.uid):"")+t("نقاط ضاعت على الدكة",bw?bw.d.benchPts:"-",bw?esc(bw.person):"",bw?act("member",bw.uid):"")+t("التحويلات والخواص",trn,Object.keys(chips).map(function(k){return(CHIPS[k]||[k])[0]+" "+chips[k]}).join("، ")||"مفيش خواص")+"</div>"}
R.overviewExtra=function(){var c=ctxP();if(!c.wm.length)return"";return'<div class="sec">أرقام إضافية</div>'+tilesMore(c)+'<div class="sec">الأعضاء والتحويلات</div>'+cardTop10(c)+cardBuySell(c)};

function waText(c){var L=["📊 ملخص الجولة "+S.gw,""];c.T.slice(0,3).forEach(function(R2,i){L.push(["🥇","🥈","🥉"][i]+" "+R2.team+" - "+R2.net)});
  L.push("","👑 أعلى الأعضاء:");c.wm.slice().sort(function(a,b){return b.d.net-a.d.net}).slice(0,5).forEach(function(m,i){L.push((i+1)+". "+m.person+" ("+m.team+") - "+m.d.net)});
  var cap=Object.keys(c.st).map(function(k){return c.st[k]}).sort(function(a,b){return b.cap-a.cap})[0];if(cap&&cap.cap)L.push("","🎯 أكتر كابتن: "+P(cap.id).n+" ("+cap.cap+")");
  var hit=c.wm.slice().sort(function(a,b){return b.cost-a.cost})[0];if(hit&&hit.cost)L.push("💸 أكبر سوالب: "+hit.person+" (-"+hit.cost+")");return L.join("\n")}
function actionsRow(){return'<div class="chips" style="margin-top:12px"><button data-plus="search">🔍 بحث سريع</button><button data-plus="wi">🔮 ماذا لو</button><button data-plus="wa">📋 ملخص للواتساب</button><button data-plus="kiosk">📺 وضع العرض</button><button data-plus="cmp2">⚖️ مقارنة عضوين</button></div>'}
R.tabs.push({id:"plus",name:"التحليلات"});
R.views.plus=function(){
  if(!S.D)return'<div class="empty">بيحمّل...</div>';var c=ctxP();if(!c.wm.length)return'<div class="empty">مفيش أعضاء</div>';var parts=[actionsRow()];
  var sec=function(t){parts.push('<div class="sec" style="font-size:15px;color:var(--tx);font-weight:600">'+t+"</div>")};var add=function(fn){try{var h=fn(c);if(h)parts.push(h)}catch(e){console.error(e)}};
  sec("🏅 جوايز وتحويلات");add(cardAwards);add(cardTrTeams);add(cardWave);add(cardChips);add(cardSubsLuck);
  sec("🎯 الكباتن");add(cardCapFail);add(cardRegret);add(cardHerd);
  sec("⚽ اللاعيبة والماتشات");add(cardStarFlop);add(cardImpact);add(cardDecision);add(cardFix);add(cardXIbest);add(cardXImajor);add(cardInjured);
  sec("🧠 التكتيك والأندية");add(cardFormations);add(cardPositions);add(cardClubs);add(cardWorld);add(cardRace);
  sec("🧬 التشابه والتاريخ");add(cardMe);add(cardMatrix);add(cardDiff);add(cardCumulative);add(cardFavs);
  CTX=c;return parts.join("")};
var CTX=null;

/* ---------- تحميل السجل والماتشات ---------- */
R.hooks.afterLoad.push(function(){var gw=S.gw;
  if(HISTGW!==gw){HISTGW=gw;HIST=null;F.api({api:"history",gw:gw}).then(function(h){if(S.gw===gw){HIST=h&&!h.success===false?{}:(h||{});F.render()}}).catch(function(){HIST={}})}
  var need=[];S.D.members.forEach(function(m){if(chipUser(m)&&!PREV[gw+"|"+m.entryId])need.push(m.entryId)});
  if(need.length&&gw>1)F.api({api:"prev",gw:gw,ids:need.join(",")}).then(function(r){Object.keys(r||{}).forEach(function(id){PREV[gw+"|"+id]=r[id]});if(S.gw===gw)F.render()}).catch(function(){})});
R.afterPlayer=function(id){
  var host=F.$("#sheet main");if(!host)return;var h=document.createElement("div");h.className="cd";h.innerHTML='<div class="k">الماتشات الجاية</div><p class="mut">بيحمّل...</p>';host.appendChild(h);
  var done=function(Fx){var t=P(id).t,cl=S.D.clubs||{},L=(Fx&&Fx[t])||[];h.innerHTML='<div class="k" style="margin-bottom:6px">الماتشات الجاية</div>'+(L.length?L.map(function(f){return'<span class="fxd d'+f[3]+'">'+esc(cl[f[1]]||f[1])+"<small>"+(f[2]?"H":"A")+" · ج"+f[0]+"</small></span>"}).join(""):'<p class="mut">مفيش ماتشات متاحة</p>')};
  if(FIXA&&FIXGW===S.gw){done(FIXA);return}var gw=S.gw;F.api({api:"fixtures",gw:gw}).then(function(x){FIXA=x||{};FIXGW=gw;done(FIXA)}).catch(function(){h.innerHTML='<p class="mut">تعذّر تحميل الماتشات</p>'})};

/* ---------- ماذا لو / وضع العرض / مقارنة عضوين / تنبيه الصدارة / الديدلاين ---------- */
function wiSheet(){
  if(!live()){toast("حمّل اللايف الأول");return}
  var wm=WM(),st=ownership(wm);
  var L=Object.keys(st).map(Number).filter(function(id){var s=pStat(id);return st[id].own>0&&(s==="pending"||s==="live0"||s==="playing")}).sort(function(a,b){return st[b].own-st[a].own}).slice(0,40);
  F.push("ماذا لو",'<div class="k" style="margin-bottom:8px">عدّل نقاط اللاعيبة اللي ماتشهم ماخلصش وشوف الترتيب هيتغير إزاي</div><button class="btn b2" data-wireset style="width:100%;margin-bottom:8px">↺ رجّع كل حاجة</button>'+(L.length?L.map(function(id){var ch=S.WI[id]!=null;return'<div class="row"><div class="grow"><b>'+esc(P(id).n)+"</b><small>"+st[id].own+" عضو · "+esc(P(id).club)+'</small></div><div class="wi"><button data-wi="'+id+':-1">−</button><b class="n '+(ch?"up":"")+'">'+num(pPts(id))+'</b><button data-wi="'+id+':1">+</button></div></div>'}).join(""):'<p class="mut">مفيش لاعيبة ماتشهم لسه ماخلصش.</p>'),"wi")}
var KI=null,KL=null;
function stopKiosk(){clearInterval(KI);clearInterval(KL);KI=KL=null;document.body.classList.remove("kiosk");try{if(document.fullscreenElement)document.exitFullscreen()}catch(e){}}
function toggleKiosk(){if(KI){stopKiosk();return}if(!S.D){toast("حمّل الجولة الأول");return}var tabs=["overview","teams","members"],i=0;document.body.classList.add("kiosk");try{document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen()}catch(e){}F.setTab(tabs[0]);KI=setInterval(function(){i=(i+1)%tabs.length;F.setTab(tabs[i])},15000);KL=setInterval(function(){F.refreshLive(true)},120000);toast("وضع العرض شغال - دوس Esc للخروج")}
document.addEventListener("fullscreenchange",function(){if(!document.fullscreenElement&&KI)stopKiosk()});
function leaderName(){try{var T=teamAgg2(WM()).sort(function(a,b){return b.net-a.net});return T.length?T[0].team:null}catch(e){return null}}
var _lead=null;R.hooks.beforeLive.push(function(){_lead=leaderName()});R.hooks.afterLive.push(function(){var a=leaderName();if(_lead&&a&&_lead!==a)toast("👑 المتصدر اتغير: "+a)});
function tickDdl(){var el=F.$("#ddl");if(!el)return;if(!S.D||!S.D.nextDeadline){el.hidden=true;return}var ms=S.D.nextDeadline-Date.now();if(ms<=0){el.textContent="ديدلاين ج"+S.D.nextGw+" عدّى";return}var d=Math.floor(ms/864e5),h=Math.floor(ms%864e5/36e5),m=Math.floor(ms%36e5/6e4);el.textContent="⏳ ديدلاين ج"+S.D.nextGw+": "+(d?d+" يوم ":"")+h+" س "+m+" د"}
setInterval(tickDdl,30000);R.afterRender=function(){tickDdl()};
var CM={a:null,b:null};
function cmp2Sheet(){
  if(!S.D)return;var opts=S.D.members.slice().sort(function(a,b){return a.person.localeCompare(b.person,"ar")});
  var sel=function(id,v){return'<select id="'+id+'" class="sr" style="height:46px"><option value="">اختار عضو...</option>'+opts.map(function(m){return'<option value="'+esc(m.uid)+'"'+(m.uid===v?" selected":"")+">"+esc(m.person)+" - "+esc(m.team)+"</option>"}).join("")+"</select>"};
  F.push("مقارنة عضوين",sel("c2a",CM.a)+'<div style="height:8px"></div>'+sel("c2b",CM.b)+'<div id="c2o"></div>',"cmp2");drawCmp2()}
function drawCmp2(){
  var o=F.$("#c2o");if(!o)return;var a=S.D.members.find(function(m){return m.uid===CM.a}),b=S.D.members.find(function(m){return m.uid===CM.b});
  if(!a||!b){o.innerHTML='<div class="empty">اختار عضوين</div>';return}
  var A=new Map(a.d.picks.map(function(x){return[x.id,x]})),B=new Map(b.d.picks.map(function(x){return[x.id,x]}));
  var common=[],oa=[],ob=[];A.forEach(function(x,i){B.has(i)?common.push(i):oa.push(i)});B.forEach(function(x,i){if(!A.has(i))ob.push(i)});
  var pt=function(ids,src){return sum(ids,function(i){return num(pPts(i))*Math.max(src.get(i).mult,0)})};
  var row=function(l,x,y,hi){var w=hi===undefined?0:(x>y?1:x<y?-1:0)*(hi?1:-1);return'<div class="row"><b class="grow n '+(w>0?"up":"")+'" style="text-align:center">'+x+'</b><span class="mut" style="flex:1;text-align:center">'+l+'</span><b class="grow n '+(w<0?"up":"")+'" style="text-align:center">'+y+"</b></div>"};
  var lst=function(ids,src){return ids.map(function(i){var pl=live()&&isPlayed(pStat(i));return'<div class="row act'+(pl?" pl":"")+'" data-act="p" data-arg="'+i+'">'+F.av(i,30)+'<div class="grow"><b>'+esc(P(i).n)+"</b><small>"+(src.get(i).inXI?"أساسي":"دكة")+(src.get(i).mult>=2?" - كابتن":"")+'</small></div><b class="n">'+(live()?num(pPts(i)):"")+"</b></div>"}).join("")||'<p class="mut">-</p>'};
  o.innerHTML='<div class="cd" style="margin-top:12px">'+row("الصافي",a.d.net,b.d.net,true)+row("النقاط",a.d.points,b.d.points,true)+row("السوالب",a.cost,b.cost,false)+row("نقاط الدكة",a.d.benchPts,b.d.benchPts)+row("لسه هيلعب",a.d.left,b.d.left)+(live()?row("نقاط المختلف",pt(oa,A),pt(ob,B),true):"")+"</div>"+
   '<div class="sec">عند '+esc(a.person)+" بس ("+oa.length+")</div>"+lst(oa,A)+'<div class="sec">مشتركين ('+common.length+")</div>"+lst(common,A)+'<div class="sec">عند '+esc(b.person)+" بس ("+ob.length+")</div>"+lst(ob,B)+'<div class="lg" style="margin-top:10px"><span><i></i>اللعيب اللي لعب متظلل بالأخضر</span></div>'}
R.cmp2=cmp2Sheet;

R.click=function(e){
  var t=e.target;
  var fv=t.closest("[data-fav]");if(fv){var p=fv.getAttribute("data-fav").split(":"),k=p[0],key=p.slice(1).join(":");if(FAV[k][key])delete FAV[k][key];else FAV[k][key]=1;LS.set("shwayaFav",JSON.stringify(FAV));F.render();return true}
  var pl=t.closest("[data-plus]");if(pl){var a=pl.getAttribute("data-plus");if(a==="search")F.openSearch();else if(a==="wi")wiSheet();else if(a==="kiosk")toggleKiosk();else if(a==="cmp2")cmp2Sheet();else if(a==="wa"&&CTX)navigator.clipboard&&navigator.clipboard.writeText(waText(CTX)).then(function(){toast("اتنسخ الملخص - الصقه في الواتساب")});return true}
  if(t.closest("[data-wireset]")){S.WI={};F.derive();wiSheet();F.render();return true}
  var wb=t.closest("[data-wi]");if(wb){var q=wb.getAttribute("data-wi").split(":"),id=Number(q[0]);S.WI[id]=num(pPts(id))+Number(q[1]);F.derive();var top=F.$("#sheet").scrollTop;F.pop();wiSheet();F.$("#sheet").scrollTop=top;F.render();return true}
  return false};
R.change=function(e){var t=e.target;
  if(t.id==="meSel"){LS.set("shwayaMe",t.value);F.render()}
  if(t.id==="c2a"||t.id==="c2b"){CM[t.id==="c2a"?"a":"b"]=t.value;drawCmp2()}};
document.addEventListener("keydown",function(e){if(e.key==="Escape"&&KI)stopKiosk()});
window.__plus={cols:{members:memberCols,teams:teamCols,players:playerCols,transfers:transferCols},isFav:isFav,star:star,C:C,teamAgg2:teamAgg2,trGain:trGain,chipUser:chipUser,jac:jac,hMember:hMember,HISTf:function(){return HIST},formOf:formOf,regret:regret,meMember:meMember};
})();
