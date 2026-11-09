/* nowroo.js - تبويب "اللي نوّروا وشرّفوا" (كل تبويب سكربت مستقل)
   ترتيبين: التيمات (عدد المرات) والأعضاء (تيمه - عدد المرات). الداتا من Visits.gs (?api=visits) وبتتسجل لما حد يدوس زرار الدخول.
   الجدول بنفس محرك جداول التطبيق: ترتيب بالضغط على أي عنوان، والمركز في أول عمود بيفضل ثابت مع الصف. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc, $ = F.$, GRID = window.__grid;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  var ST = { rows: null, loading: false, err: "", mode: LS.get("fc_vis") === "m" ? "m" : "t", armed: false };

  (function () {
    var st = document.createElement("style"); st.id = "nowrooCss";
    st.textContent = ".vs-sum{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:10px}.vs-sum div{padding:12px 8px;border-radius:16px;border:1px solid var(--ln);background:var(--s1);text-align:center}.vs-sum b{display:block;font-size:22px;font-weight:700}.vs-sum small{color:var(--mu);font-size:12px}" +
      "#vsAdm{position:fixed;inset:0;z-index:95;display:grid;place-items:center;padding:20px;background:rgba(4,6,12,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}#vsAdm .tc{width:min(360px,100%);padding:22px;border-radius:24px;background:var(--s1);border:1px solid var(--ln);box-shadow:0 24px 60px rgba(0,0,0,.4)}" +
      "#vsAdm h3{margin:0 0 6px;font-size:18px;font-weight:600}#vsAdm p{margin:0 0 12px;color:var(--mu);font-size:13px;line-height:1.7}#vsAdm input{width:100%;height:48px;padding:0 14px;margin-bottom:10px;border-radius:14px;border:1.5px solid var(--ln);background:var(--s2);color:var(--tx);font:inherit;outline:none}#vsAdm .ab{display:grid;gap:8px}";
    document.head.appendChild(st);
  })();

  function fmtN(n) { try { return Number(n).toLocaleString("ar-EG"); } catch (e) { return String(n); } }
  function ranks(list, key) {
    /* مركز تنافسي: نفس العدد = نفس المركز */
    return list.map(function (x) { var r = 1; list.forEach(function (y) { if (y[key] > x[key]) r++; }); return r; });
  }
  /* ---------- حساب الترتيبين ---------- */
  function build() {
    var rows = ST.rows || [], T = {}, M = [];
    rows.forEach(function (r) {
      var t = T[r.team] || (T[r.team] = { team: r.team, count: 0, people: 0, lastTs: 0, last: "" });
      t.count += r.count; t.people++;
      if (r.lastTs > t.lastTs) { t.lastTs = r.lastTs; t.last = r.last; }
      M.push({ person: r.person, team: r.team, entryId: r.entryId, count: r.count, lastTs: r.lastTs, last: r.last });
    });
    var TL = Object.keys(T).map(function (k) { return T[k]; }).sort(function (a, b) { return b.count - a.count || a.team.localeCompare(b.team, "ar"); });
    M.sort(function (a, b) { return b.count - a.count || a.person.localeCompare(b.person, "ar"); });
    var rt = ranks(TL, "count"), rm = ranks(M, "count");
    TL.forEach(function (t, i) { t.rank = rt[i]; });
    M.forEach(function (m, i) { m.rank = rm[i]; });
    return { T: TL, M: M, total: rows.reduce(function (s, r) { return s + r.count; }, 0) };
  }
  function uidOf(team, entryId) {
    var m = ((S.D && S.D.members) || []).filter(function (x) { return x.team === team && x.entryId === entryId; })[0];
    return m ? m.uid : "";
  }
  function col(k, l, v, o) { var c = { k: k, l: l, v: v, num: true }; if (o) for (var q in o) c[q] = o[q]; return c; }

  function table(B) {
    if (ST.mode === "t") {
      var cols = [
        col("rank", "المركز", function (t) { return t.rank; }),
        col("team", "التيم", function (t) { return t.team; }, { num: false }),
        col("count", "عدد المرات", function (t) { return t.count; }, { tot: 1 }),
        col("people", "عدد الأعضاء اللي دخلوا", function (t) { return t.people; }, { tot: 1 }),
        col("last", "آخر دخول", function (t) { return t.lastTs; }, { h: function (t) { return esc(t.last || "–"); } })
      ];
      return GRID.render({
        key: "visits_t", title: "اللي نوّروا وشرّفوا - ترتيب التيمات", rows: B.T, cols: cols, rowKey: function (t) { return t.team; },
        act: function (t) { return ' data-act="t" data-arg="' + esc(t.team) + '"'; }, defSort: function (a, b) { return a.rank - b.rank || a.team.localeCompare(b.team, "ar"); },
        totals: function (l) { var o = { rank: "الإجمالي - " + l.length + " تيم" }; cols.forEach(function (c) { if (c.tot) o[c.k] = l.reduce(function (s, r) { return s + (Number(c.v(r)) || 0); }, 0); }); return o; }
      });
    }
    var cols2 = [
      col("rank", "المركز", function (m) { return m.rank; }),
      col("person", "العضو", function (m) { return m.person; }, { num: false }),
      col("team", "التيم", function (m) { return m.team; }, { num: false }),
      col("count", "عدد المرات", function (m) { return m.count; }, { tot: 1 }),
      col("last", "آخر دخول", function (m) { return m.lastTs; }, { h: function (m) { return esc(m.last || "–"); } })
    ];
    return GRID.render({
      key: "visits_m", title: "اللي نوّروا وشرّفوا - ترتيب الأعضاء", rows: B.M, cols: cols2, rowKey: function (m) { return m.team + "|" + m.entryId; },
      act: function (m) { var u = uidOf(m.team, m.entryId); return u ? ' data-act="m" data-arg="' + esc(u) + '"' : ""; },
      defSort: function (a, b) { return a.rank - b.rank || a.person.localeCompare(b.person, "ar"); },
      totals: function (l) { var o = { rank: "الإجمالي - " + l.length + " عضو" }; cols2.forEach(function (c) { if (c.tot) o[c.k] = l.reduce(function (s, r) { return s + (Number(c.v(r)) || 0); }, 0); }); return o; }
    });
  }

  function view() {
    var tg = '<div class="tbar"><div class="sg"><button data-vv="t" class="' + (ST.mode === "t" ? "on" : "") + '">ترتيب التيمات</button><button data-vv="m" class="' + (ST.mode === "m" ? "on" : "") + '">ترتيب الأعضاء</button></div>' +
      '<button class="chip" data-vadm>تصفير (أدمن)</button></div>';
    if (ST.err && !ST.rows) return tg + '<div class="empty">' + esc(ST.err) + '<br><button class="btn b2" data-vretry style="margin-top:12px">حاول تاني</button></div>';
    if (!ST.rows) return tg + '<div class="plz" style="min-height:220px"></div>';
    if (!ST.rows.length) return tg + '<div class="empty">لسه محدش دخل. أول واحد يدوس زرار "ما تصلّوا على النبي" هيظهر هنا.</div>';
    var B = build();
    return tg + '<div class="vs-sum"><div><b>' + fmtN(B.total) + "</b><small>إجمالي الدخولات</small></div><div><b>" + fmtN(B.M.length) + "</b><small>عضو دخل</small></div><div><b>" + fmtN(B.T.length) + "</b><small>تيم دخل</small></div></div>" + table(B);
  }

  function load(silent) {
    if (ST.loading) return;
    ST.loading = true; if (!silent) ST.err = "";
    return F.api({ api: "visits" }).then(function (r) {
      ST.loading = false;
      if (!r || r.success === false) { ST.err = (r && r.message) || "تعذّر تحميل الدخولات"; }
      else { ST.rows = r.rows || []; ST.err = ""; }
      if (S.tab === "visits") F.render();
    }).catch(function () { ST.loading = false; ST.err = "تعذّر الاتصال بالسيرفر"; if (S.tab === "visits") F.render(); });
  }

  /* ---------- التصفير (أدمن) ---------- */
  function admOpen() {
    var d = document.getElementById("vsAdm");
    if (!d) { d = document.createElement("div"); d.id = "vsAdm"; document.body.appendChild(d); }
    ST.armed = false;
    d.innerHTML = '<div class="tc"><h3>تصفير الدخولات</h3><p>هيصفّر عدّاد كل التيمات والأعضاء (وبينقل النسخة القديمة لورقة "أرشيف الدخول"). استخدمه لما تخلّص تجاربك.</p><input id="vsKey" type="password" placeholder="مفتاح الأدمن (ADMIN_KEY)" autocomplete="off"><div class="ab"><button class="btn b1" data-vgo>تصفير الكل</button><button class="btn b2" data-vclose>إلغاء</button></div><p id="vsMsg" style="margin:10px 0 0"></p></div>';
  }
  function admGo() {
    var b = document.querySelector("[data-vgo]"), key = (document.getElementById("vsKey") || {}).value, out = document.getElementById("vsMsg");
    if (!key) { if (out) out.textContent = "اكتب مفتاح الأدمن الأول"; return; }
    if (!ST.armed) { ST.armed = true; if (b) b.textContent = "اضغط تاني للتأكيد"; return; }
    if (out) out.textContent = "جاري التصفير...";
    F.api({ api: "visitReset", key: key }).then(function (r) {
      if (out) out.textContent = (r && r.message) || "تم";
      ST.armed = false; if (b) b.textContent = "تصفير الكل";
      if (r && r.success) { ST.rows = []; F.toast(r.message); var d = document.getElementById("vsAdm"); if (d) d.remove(); F.render(); }
    }).catch(function () { if (out) out.textContent = "فشل الاتصال بالسيرفر"; });
  }

  /* ---------- ربط التبويب ---------- */
  R.tabs.push({ id: "visits", name: "اللي نوّروا وشرّفوا" });
  var _title = R.title;
  R.title = function (t) { return t === "visits" ? "اللي نوّروا وشرّفوا" : (_title ? _title(t) : null); };
  R.views.visits = view;
  var was = false, _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var on = S.tab === "visits";
    if (on && !was) load(!!ST.rows);
    was = on;
  };
  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var t = e.target, b;
    if (!t.closest) return false;
    if ((b = t.closest("[data-vv]"))) { ST.mode = b.getAttribute("data-vv"); LS.set("fc_vis", ST.mode); F.render(); return true; }
    if (t.closest("[data-vadm]")) { admOpen(); return true; }
    if (t.closest("[data-vretry]")) { ST.err = ""; load(); return true; }
    return false;
  };
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t.closest) return;
    if (t.closest("[data-vgo]")) { admGo(); return; }
    if (t.closest("[data-vclose]") || t.id === "vsAdm") { var d = document.getElementById("vsAdm"); if (d) d.remove(); }
  });
})();
