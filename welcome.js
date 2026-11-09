/* welcome.js - بروفايلي + بوابة الدخول + تمييز تيمي + قايمة منسدلة فيها بحث
   1) أول مرة: بيطلب منك تختار تيمك وشخصك (بروفايل بيتحفظ في الجهاز)
   2) كل دخول: زرار "ما تصلّوا على النبي" بحركة دخول، وبيسجّل دخولك في شيت "الدخول" (Visits.gs)
   3) كل حاجة تخص تيمك في الملخص والإحصائيات بتتظلّل وتتميّز (وتقدر تقفلها من بروفايلي)
   4) window.__sdrop: قايمة منسدلة فيها بحث، بتتستخدم هنا وفي كبتنة التيمات */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, $ = F.$, $$ = F.$$, esc = F.esc;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var RM = !!(window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches);
  window.__fcGate = true; window.__spKeep = true; /* بيمنع الإخفاء التلقائي لشاشة الدخول لحد ما الزرار يتداس */

  function nz(s) { return String(s || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim(); }
  function ar(a, b) { return a.localeCompare(b, "ar"); }

  /* =====================================================================
     قايمة منسدلة فيها بحث
     ===================================================================== */
  var REG = {};
  var SD = {
    html: function (id, o) {
      REG[id] = o;
      return '<div class="sd" data-sd="' + id + '"><input class="sd-in" type="text" placeholder="' + esc(o.ph || "") + '" value="' + esc(o.value || "") + '" autocomplete="off"' + (o.disabled ? " disabled" : "") + '><div class="sd-list" hidden></div></div>';
    },
    set: function (id, label) { var el = document.querySelector('[data-sd="' + id + '"] .sd-in'); if (el) el.value = label || ""; },
    enable: function (id, on, ph) { var el = document.querySelector('[data-sd="' + id + '"] .sd-in'); if (el) { el.disabled = !on; if (ph) el.placeholder = ph; } },
    reg: REG
  };
  window.__sdrop = SD;
  function sdOf(el) { var w = el && el.closest && el.closest("[data-sd]"); return w ? { w: w, id: w.getAttribute("data-sd"), o: REG[w.getAttribute("data-sd")] } : null; }
  function sdOpen(w, id, filter) {
    var o = REG[id]; if (!o) return;
    var L = w.querySelector(".sd-list"), opts = o.options() || [], q = nz(filter);
    var f = q ? opts.filter(function (x) { return nz(x.l).indexOf(q) > -1 || nz(x.t).indexOf(q) > -1; }) : opts;
    L.innerHTML = f.length ? f.slice(0, 80).map(function (x) {
      return '<button type="button" class="sd-i" data-v="' + esc(x.v) + '" data-l="' + esc(x.l) + '"><span>' + esc(x.l) + "</span>" + (x.t ? "<i>" + esc(x.t) + "</i>" : "") + "</button>";
    }).join("") : '<div class="sd-e">مفيش نتايج</div>';
    L.hidden = false; w.classList.add("open");
  }
  function sdClose() { $$(".sd.open").forEach(function (w) { w.classList.remove("open"); var l = w.querySelector(".sd-list"); if (l) l.hidden = true; }); }
  document.addEventListener("focusin", function (e) {
    var s = sdOf(e.target);
    if (s && e.target.classList.contains("sd-in")) { if (e.target.select) e.target.select(); sdOpen(s.w, s.id, ""); } else sdClose();
  });
  document.addEventListener("input", function (e) { var s = sdOf(e.target); if (s && e.target.classList.contains("sd-in")) sdOpen(s.w, s.id, e.target.value); });
  document.addEventListener("keydown", function (e) {
    if (e.key !== "Enter") return;
    var s = sdOf(e.target); if (!s || !e.target.classList.contains("sd-in")) return;
    var first = s.w.querySelector(".sd-i"); if (first) { e.preventDefault(); first.click(); }
  });
  document.addEventListener("click", function (e) {
    var it = e.target.closest && e.target.closest(".sd-i");
    if (it) {
      var s = sdOf(it);
      if (s) { s.w.querySelector(".sd-in").value = it.getAttribute("data-l"); sdClose(); if (s.o && s.o.onPick) s.o.onPick(it.getAttribute("data-v"), it.getAttribute("data-l")); }
      return;
    }
    if (!(e.target.closest && e.target.closest(".sd"))) sdClose();
  }, true);

  /* =====================================================================
     البروفايل (تيم + شخص)
     ===================================================================== */
  function getP() { try { return JSON.parse(LS.get("fc_profile") || "null"); } catch (e) { return null; } }
  function setP(p) { LS.set("fc_profile", JSON.stringify(p)); }
  function hasData() { return !!(S.D && S.D.members && S.D.members.length); }
  function teamsAll() {
    var seen = {}, L = [];
    S.D.members.forEach(function (m) { if (!seen[m.team]) { seen[m.team] = 1; L.push(m.team); } });
    return L.sort(ar);
  }
  function peopleOf(team) {
    var seen = {}, cnt = {}, L = [];
    S.D.members.forEach(function (m) { if (m.team === team && !seen[m.entryId]) { seen[m.entryId] = 1; L.push(m); cnt[m.person] = (cnt[m.person] || 0) + 1; } });
    return L.map(function (m) { return { v: m.entryId, l: m.person + (cnt[m.person] > 1 && m.contest ? " (" + m.contest + ")" : ""), person: m.person }; }).sort(function (a, b) { return ar(a.l, b.l); });
  }
  function valid(p) { return !!(p && p.team && p.entryId && (!hasData() || S.D.members.some(function (m) { return m.team === p.team && m.entryId === p.entryId; }))); }

  /* فورم اختيار البروفايل (بيتستخدم في شاشة الدخول وفي شيت "بروفايلي") */
  var PF = { team: "", mem: null };
  function formHtml(okId) {
    PF = { team: "", mem: null };
    return '<div class="gt-l"><i>1</i>اختار تيمك</div>' +
      SD.html("pfTeam", {
        ph: "ابحث عن تيمك...", options: function () { return hasData() ? teamsAll().map(function (t) { return { v: t, l: t }; }) : []; },
        onPick: function (v) { PF.team = v; PF.mem = null; SD.set("pfMem", ""); SD.enable("pfMem", true, "ابحث عن اسمك..."); upd(); }
      }) +
      '<div class="gt-l"><i>2</i>اختار شخصك</div>' +
      SD.html("pfMem", {
        ph: "اختار تيمك الأول", disabled: true, options: function () { return PF.team ? peopleOf(PF.team).map(function (m) { return { v: m.v, l: m.l }; }) : []; },
        onPick: function (v, l) { var m = peopleOf(PF.team).filter(function (x) { return x.v === v; })[0]; PF.mem = m ? { entryId: m.v, person: m.person } : null; upd(); }
      }) +
      '<button class="gt-go" id="' + okId + '" disabled>تمام</button>';
  }
  function upd() { var b = $("#gtOk") || $("#pfOk"); if (b) b.disabled = !(PF.team && PF.mem); }

  /* =====================================================================
     بوابة الدخول (جوه شاشة اللوجو)
     ===================================================================== */
  var CSS = [
    ".sd{position:relative;width:100%}",
    ".sd-in{width:100%;height:50px;padding:0 16px;border-radius:15px;border:1.5px solid var(--ln,#2a3550);background:var(--s1,#111a33);color:var(--tx,#eef2ff);font:inherit;font-size:15px;outline:none;transition:border-color .2s,box-shadow .2s}",
    ".sd-in:focus{border-color:var(--ac,#5eead4);box-shadow:0 0 0 3px color-mix(in srgb,var(--ac,#5eead4) 20%,transparent)}.sd-in:disabled{opacity:.5}",
    ".sd-list{position:absolute;top:calc(100% + 6px);inset-inline:0;max-height:240px;overflow-y:auto;z-index:30;border-radius:15px;border:1.5px solid var(--ln,#2a3550);background:var(--s1,#111a33);box-shadow:0 18px 40px rgba(0,0,0,.45);padding:4px}",
    ".sd-i{display:flex;width:100%;align-items:center;justify-content:space-between;gap:10px;padding:11px 12px;border:0;border-radius:11px;background:transparent;color:var(--tx,#eef2ff);font:inherit;font-size:14.5px;text-align:start;cursor:pointer}",
    ".sd-i:hover,.sd-i:active{background:color-mix(in srgb,var(--ac,#5eead4) 16%,transparent)}.sd-i i{font-style:normal;font-size:11.5px;color:var(--mu,#8e98b5);background:rgba(128,128,128,.16);padding:2px 8px;border-radius:99px}",
    ".sd-e{padding:14px;text-align:center;color:var(--mu,#8e98b5);font-size:13px}",
    /* البوابة */
    "#splash.gated .sp-w{width:min(40vw,150px);transition:width .6s cubic-bezier(.2,.9,.25,1)}#splash.gated .sp-t,#splash.gated .sp-bar{display:none}",
    "#splash .gt{width:min(420px,92vw);position:relative;z-index:5;color:#eef2ff;text-align:center}",
    "#splash .gt-c{padding:4px 6px;animation:spUp .7s cubic-bezier(.2,.9,.25,1) both}",
    "#splash .gt h2{margin:0 0 6px;font-size:21px;font-weight:600}#splash .gt p{margin:0 0 14px;color:rgba(238,242,255,.7);font-size:14px;line-height:1.7}",
    ".gt-l{display:flex;align-items:center;gap:8px;margin:12px 2px 7px;font-size:13px;font-weight:600;color:#ffcf7a;text-align:start}.gt-l i{width:22px;height:22px;border-radius:7px;background:linear-gradient(135deg,#ffd37a,#ff9b2f);color:#1b1203;display:grid;place-items:center;font-style:normal;font-size:12px;font-weight:700}",
    ".gt-go{width:100%;height:52px;margin-top:16px;border:0;border-radius:16px;font:inherit;font-size:16px;font-weight:700;color:#1b1203;background:linear-gradient(135deg,#ffd37a,#ff9b2f);cursor:pointer;transition:transform .15s,opacity .2s}.gt-go:disabled{opacity:.4;cursor:not-allowed}.gt-go:active:not(:disabled){transform:scale(.97)}",
    ".gt-skip,.gt-link{display:block;margin:14px auto 0;border:0;background:none;color:rgba(238,242,255,.6);font:inherit;font-size:13px;text-decoration:underline;cursor:pointer}",
    ".gt-hi{display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:18px}.gt-av{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:linear-gradient(135deg,#ffd37a,#5f86ff);color:#0b0f19;font-weight:700;font-size:19px}",
    ".gt-hi b{display:block;font-size:19px;font-weight:600;text-align:start}.gt-hi small{display:block;color:rgba(238,242,255,.65);font-size:13px;text-align:start}",
    ".gt-pw{position:relative;display:grid;place-items:center;height:110px}",
    ".gt-pray{position:relative;z-index:2;min-width:270px;height:64px;padding:0 30px;border:0;border-radius:99px;font:inherit;font-size:19px;font-weight:700;color:#1b1203;background:linear-gradient(135deg,#ffd37a,#ff9b2f 45%,#ffd37a);background-size:200% 100%;box-shadow:0 10px 30px rgba(255,155,47,.45),inset 0 1px 0 rgba(255,255,255,.7);overflow:hidden;cursor:pointer}",
    ".gt-pray:before{content:'';position:absolute;inset:0;background:linear-gradient(110deg,transparent 35%,rgba(255,255,255,.7) 50%,transparent 65%);background-size:250% 100%;background-position:130% 0}",
    ".gt-pray.go{pointer-events:none}",
    ".gt-ring{position:absolute;z-index:1;width:270px;height:64px;border-radius:99px;border:2px solid rgba(255,190,90,.6);opacity:0}",
    ".gt-flare{position:absolute;z-index:0;width:60px;height:60px;border-radius:50%;background:radial-gradient(circle,rgba(255,225,150,.95),rgba(255,155,47,.5) 40%,transparent 70%);opacity:0;pointer-events:none}",
    ".gt-p{position:absolute;z-index:3;left:50%;top:50%;width:9px;height:9px;margin:-4px;border-radius:50%;background:var(--c);pointer-events:none;animation:gtFly .95s cubic-bezier(.15,.8,.3,1) forwards}",
    "@keyframes gtFly{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.1);opacity:0}}",
    "@keyframes gtPulse{50%{box-shadow:0 14px 46px rgba(255,155,47,.75),inset 0 1px 0 rgba(255,255,255,.7);transform:scale(1.03)}}",
    "@keyframes gtShine{to{background-position:-130% 0}}",
    "@keyframes gtRing{0%{transform:scale(1);opacity:.7}100%{transform:scale(1.45,1.9);opacity:0}}",
    "@keyframes gtFlare{0%{transform:scale(.2);opacity:.95}100%{transform:scale(20);opacity:0}}",
    "@keyframes gtPress{0%{transform:scale(1)}40%{transform:scale(.9)}100%{transform:scale(1.06)}}",
    "@media(prefers-reduced-motion:no-preference){.gt-pray{animation:gtPulse 2.2s ease-in-out infinite}.gt-pray:before{animation:gtShine 2.6s ease-in-out infinite}.gt-ring{animation:gtRing 2.2s ease-out infinite}.gt-ring.b{animation-delay:1.1s}",
    ".gt-pray.go{animation:gtPress .5s ease forwards}.gt-pray.go~.gt-flare{animation:gtFlare .9s ease-out forwards}}",
    /* لحظة الدخول للتطبيق */
    "#splash.enter{opacity:0;transform:scale(1.7);filter:blur(8px);visibility:hidden;pointer-events:none;transition:opacity .9s ease .15s,transform 1.1s cubic-bezier(.6,0,.2,1),filter 1s ease,visibility 0s linear 1.2s}",
    "#splash.enter .sp-w{transform:translateY(-34px) scale(1.25);transition:transform 1s ease}",
    /* بروفايلي */
    ".pf-c{display:flex;align-items:center;gap:14px;padding:14px;border-radius:18px;border:1px solid var(--ln);background:var(--s1)}",
    ".pf-c .gt-av{flex:none}.pf-c b{display:block;font-size:16px;font-weight:600}.pf-c small{color:var(--mu);font-size:13px}",
    ".pf-row{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px;border-radius:16px;border:1px solid var(--ln);background:var(--s1);margin-top:10px}",
    ".pf-row small{display:block;color:var(--mu);font-size:12px;margin-top:2px}",
    ".pf-sw{width:50px;height:30px;border-radius:99px;border:0;background:var(--s3);position:relative;cursor:pointer;flex:none;transition:background .25s}.pf-sw i{position:absolute;top:3px;inset-inline-start:3px;width:24px;height:24px;border-radius:50%;background:#fff;transition:transform .25s}",
    ".pf-sw.on{background:var(--ac)}.pf-sw.on i{transform:translateX(-20px)}",
    "#sheet .gt-l{color:var(--act)}#sheet .gt-go{color:#0b0f19;background:var(--ac)}",
    /* تمييز تيمي */
    ".cd.mine-t,.li.mine-t,.act.mine-t{background:linear-gradient(270deg,color-mix(in srgb,var(--ac) 18%,transparent),transparent 72%),var(--s1)!important;box-shadow:inset -3px 0 0 var(--ac)}",
    "tr.mine-t>td{background:color-mix(in srgb,var(--ac) 14%,var(--s1))!important}tr.mine-t>td:first-child{box-shadow:inset -3px 0 0 var(--ac)}",
    ".cd.mine-me,.li.mine-me,.act.mine-me{box-shadow:inset -3px 0 0 var(--ac),0 0 0 1.5px var(--ac)}",
    "tr.mine-me>td{background:color-mix(in srgb,var(--ac) 26%,var(--s1))!important;font-weight:600}",
    ".cd.mine-me:before{content:'إنت';position:absolute;top:8px;inset-inline-start:10px;padding:2px 9px;border-radius:99px;background:var(--ac);color:#0b0f19;font-size:11px;font-weight:700;z-index:2}"
  ];
  (function () { var st = document.createElement("style"); st.id = "welcomeCss"; st.textContent = CSS.join("\n"); document.head.appendChild(st); })();

  function waitData(cb, ms) {
    var t0 = Date.now();
    (function chk() { if (hasData()) cb(true); else if (Date.now() - t0 > (ms || 7000)) cb(false); else setTimeout(chk, 250); })();
  }
  function sp() { return $("#splash"); }
  function gt() {
    var s = sp(); if (!s) return null;
    var g = s.querySelector(".gt");
    if (!g) { g = document.createElement("div"); g.className = "gt"; s.appendChild(g); }
    s.classList.add("gated");
    return g;
  }
  function initial(n) { return esc(String(n || "؟").trim().charAt(0) || "؟"); }

  function stageProfile(g, canGuest) {
    g.innerHTML = '<div class="gt-c"><h2>أهلاً بيك في مركز الفانتازي</h2><p>اختار تيمك وشخصك الأول، علشان نظبطلك التطبيق ونسجّل دخولك.</p>' + formHtml("gtOk") +
      '<button class="gt-skip" id="gtSkip">ادخل كزائر</button></div>';
  }
  function stagePray(g, p) {
    g.innerHTML = '<div class="gt-c"><div class="gt-hi"><div class="gt-av">' + initial(p.person) + '</div><div><b>أهلاً يا ' + esc(p.person) + "</b><small>تيم " + esc(p.team) + '</small></div></div><div class="gt-pw"><i class="gt-ring"></i><i class="gt-ring b"></i><button class="gt-pray" id="gtPray">ما تصلّوا على النبي</button><i class="gt-flare"></i></div>' +
      '<button class="gt-link" id="gtChange">مش إنت؟ غيّر البروفايل</button></div>';
  }
  function stageOffline(g) {
    g.innerHTML = '<div class="gt-c"><h2>مفيش اتصال بالبيانات</h2><p>تأكد من الإنترنت، وبعدين جرّب تاني.</p><button class="gt-go" id="gtRetry">جرّب تاني</button><button class="gt-skip" id="gtSkip">ادخل على أي حال</button></div>';
  }

  function visit(p) {
    var pend = Number(LS.get("fc_pend")) || 0;
    return F.api({ api: "visit", team: p.team, entryId: p.entryId, n: Math.min(10, pend + 1) }).then(function (r) {
      if (r && r.success) { LS.set("fc_pend", "0"); return r; }
      throw 0;
    }).catch(function () { LS.set("fc_pend", String(Math.min(50, pend + 1))); return null; });
  }
  function burst(btn) {
    if (RM) return;
    var w = btn.parentNode, cols = ["#ffd37a", "#ff9b2f", "#fff3cf", "#7fa0ff", "#b9ccff"];
    for (var i = 0; i < 30; i++) {
      var a = Math.random() * Math.PI * 2, d = 90 + Math.random() * 150, p = document.createElement("i");
      p.className = "gt-p"; p.style.setProperty("--dx", Math.cos(a) * d + "px"); p.style.setProperty("--dy", Math.sin(a) * d + "px"); p.style.setProperty("--c", cols[i % cols.length]);
      p.style.animationDelay = Math.random() * 0.08 + "s"; w.appendChild(p);
    }
  }
  function enter(after) {
    var s = sp();
    window.__fcGate = false;
    if (!s) { if (after) after(); return; }
    s.classList.add("enter");
    setTimeout(function () { var x = sp(); if (x) x.remove(); F.render(); if (after) after(); }, RM ? 200 : 1250);
  }
  function pray(p) {
    var btn = $("#gtPray"); if (!btn || btn.classList.contains("go")) return;
    btn.classList.add("go"); burst(btn);
    var res = null, entered = false;
    visit(p).then(function (r) { res = r; if (entered) say(r); });
    function say(r) {
      if (r && r.success) F.toast(r.counted ? "نوّرت يا " + (r.person || p.person) + " - دي دخولتك رقم " + r.count : "نوّرت يا " + (r.person || p.person) + " (اتسجلت دخولتك قبل شوية)");
    }
    setTimeout(function () { enter(function () { entered = true; if (res) say(res); }); }, RM ? 150 : 1000);
  }

  function showGate() {
    var g = gt(); if (!g) { window.__fcGate = false; return; }
    var p = getP();
    if (p && valid(p)) stagePray(g, p); else stageProfile(g);
  }
  function startGate() {
    var wait = Math.max(0, 1700 - (Date.now() - (window.__spT0 || Date.now())));
    setTimeout(function () {
      waitData(function (ok) {
        var g = gt(); if (!g) { window.__fcGate = false; return; }
        if (!ok) { var p0 = getP(); if (p0 && p0.team && p0.entryId) stagePray(g, p0); else stageOffline(g); return; }
        showGate();
      });
    }, wait);
  }
  if (sp()) startGate(); else window.__fcGate = false;

  /* ---------- أحداث البوابة والبروفايل ---------- */
  function saveProfile() {
    if (!(PF.team && PF.mem)) return false;
    setP({ team: PF.team, entryId: PF.mem.entryId, person: PF.mem.person });
    return true;
  }
  document.addEventListener("click", function (e) {
    var t = e.target, el;
    if (!t.closest) return;
    if ((el = t.closest("#gtPray"))) { var p = getP(); if (p) pray(p); return; }
    if (t.closest("#gtOk")) { if (saveProfile()) { var g = gt(); if (g) stagePray(g, getP()); } return; }
    if (t.closest("#gtSkip")) { enter(); return; }
    if (t.closest("#gtRetry")) { var g2 = gt(); if (g2) g2.innerHTML = '<div class="gt-c"><p>بنحاول...</p></div>'; F.refreshLive && F.refreshLive(); startGate(); return; }
    if (t.closest("#gtChange")) { var g3 = gt(); if (g3) stageProfile(g3); return; }
    if (t.closest("#pfOk")) { if (saveProfile()) { F.toast("اتحفظ بروفايلك"); while (S.stack.length) S.stack.pop(); F.paintSheet(); F.render(); } return; }
    if (t.closest("#pfChange")) { var box = $("#pfForm"); if (box) { box.innerHTML = formHtml("pfOk"); } return; }
    if (t.closest("#pfClear")) { LS.del("fc_profile"); F.toast("اتمسح البروفايل"); while (S.stack.length) S.stack.pop(); F.paintSheet(); F.render(); return; }
    if ((el = t.closest("#pfMine"))) { var on = LS.get("fc_mine") !== "0"; LS.set("fc_mine", on ? "0" : "1"); el.classList.toggle("on", !on); clearMarks(); mark(); return; }
  }, true);

  /* ---------- شيت "بروفايلي" ---------- */
  function openProfile() {
    var p = getP(), ok = p && valid(p);
    var h = ok ? '<div class="pf-c"><div class="gt-av">' + initial(p.person) + "</div><div><b>" + esc(p.person) + "</b><small>تيم " + esc(p.team) + "</small></div></div>" : '<p class="mut" style="margin:6px 4px">لسه ماعملتش بروفايل. اختار تيمك وشخصك تحت.</p>';
    h += '<div class="pf-row"><div><b>تمييز تيمي</b><small>تظليل كل حاجة تخص تيمك في الملخص والإحصائيات</small></div><button class="pf-sw' + (LS.get("fc_mine") !== "0" ? " on" : "") + '" id="pfMine" aria-label="تمييز تيمي"><i></i></button></div>';
    h += '<div style="margin-top:16px" id="pfForm">' + (ok ? '<button class="btn b2" id="pfChange" style="width:100%">غيّر بروفايلي</button>' : formHtml("pfOk")) + "</div>";
    if (p) h += '<button class="btn b2" id="pfClear" style="width:100%;margin-top:10px">مسح بروفايلي</button>';
    F.push("بروفايلي", h, "profile");
  }
  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var ns = $("#drawer .ns");
    if (ns && !$("#profb")) { var p = getP(); ns.insertAdjacentHTML("afterbegin", '<button class="tl" id="profb">' + F.ic("filter", 20).replace(/<path[^>]*\/>/, '<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>') + " بروفايلي" + (p && p.person ? ": " + esc(p.person) : "") + "</button>"); }
    mark();
  };
  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    if (e.target.closest && e.target.closest("#profb")) { document.body.classList.remove("dro"); openProfile(); return true; }
    return false;
  };

  /* =====================================================================
     تمييز كل حاجة تخص تيمك (جداول، كروت، قوايم)
     ===================================================================== */
  var UID = null, UIDD = null;
  function uidMap() {
    if (UIDD === S.D) return UID;
    UID = {}; UIDD = S.D;
    ((S.D && S.D.members) || []).forEach(function (m) { UID[m.uid] = m; });
    return UID;
  }
  function clearMarks() { $$(".mine-t,.mine-me").forEach(function (el) { el.classList.remove("mine-t", "mine-me"); }); }
  function mark() {
    var p = getP();
    if (!p || !S.D || LS.get("fc_mine") === "0") return;
    var U = uidMap(), root = $("#view"); if (!root) return;
    $$("[data-act][data-arg]", root).forEach(function (el) {
      if (el.classList.contains("mine-t")) return;
      var a = el.getAttribute("data-act"), g = el.getAttribute("data-arg");
      if (a === "t") { if (g === p.team) el.classList.add("mine-t"); }
      else if (a === "m") {
        var m = U[g];
        if (m && m.team === p.team) { el.classList.add("mine-t"); if (m.entryId === p.entryId) el.classList.add("mine-me"); }
      }
    });
  }
  if (window.MutationObserver) {
    var pend = 0;
    new MutationObserver(function () { if (pend) return; pend = setTimeout(function () { pend = 0; mark(); }, 120); }).observe(document.body, { childList: true, subtree: true });
  }
})();
