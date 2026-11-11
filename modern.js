/* modern.js - تحسينات عامة للتطبيق:
   1) شكل عصري للتشيك بوكس + قايمة منسدلة فيها بحث (window.__dd) + خط أصغر وأسماء كاملة
   2) زرار رجوع الموبايل بيرجع جوه التطبيق بدل ما يطلّعك
   3) ملء الشاشة
   4) صلاحيات التبويبات (الأدمن يتحكم مين يفتح إيه: الأعضاء والزوار برا البوابة)
   الخط: Rubik بس. */
(function () {
  "use strict";
  var F = window.__fc; if (!F) return;
  var R = F.R, S = F.S, esc = F.esc;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }
  function nz(s) { return String(s || "").toLowerCase().replace(/[\u064B-\u0652\u0640]/g, "").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim(); }

  /* ---------- CSS ---------- */
  var css = [
    /* تشيك بوكس عصري في كل التطبيق */
    'input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:none;width:20px;height:20px;margin:0;border-radius:7px;border:1.8px solid var(--ln,#444);background:var(--s1,transparent) center/13px no-repeat;cursor:pointer;display:inline-grid;place-content:center;transition:background-color .15s,border-color .15s,transform .12s;vertical-align:middle}',
    'input[type=checkbox]:active{transform:scale(.9)}',
    'input[type=checkbox]:checked{background-color:var(--ac);border-color:var(--ac);background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%230B0F19\' stroke-width=\'3.4\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpath d=\'M5 12.5l4.5 4.5L19 7.5\'/%3E%3C/svg%3E")}',
    'input[type=checkbox]:focus-visible{outline:2px solid var(--ac);outline-offset:2px}input[type=checkbox]:disabled{opacity:.45;cursor:not-allowed}',
    /* خط أصغر وأسماء كاملة */
    '.tbl-sc td,.tbl-sc th,.mini-t td,.mini-t th{white-space:normal;word-break:break-word;text-overflow:clip;overflow:visible;max-width:none}',
    '.tbl-sc table,.mini-t{font-size:12.5px}',
    /* قايمة منسدلة فيها بحث */
    '.dd{position:relative}.dd-b{width:100%;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px;border-radius:14px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;cursor:pointer;text-align:start}',
    '.dd.open .dd-b{border-color:var(--ac)}.dd-t{display:grid;min-width:0}.dd-t small{color:var(--mu);font-size:10.5px;font-weight:500}.dd-t b{font-size:13px;font-weight:700;line-height:1.35;word-break:break-word}.dd-b svg{flex:none;opacity:.7;transition:transform .15s}.dd.open .dd-b svg{transform:rotate(180deg)}',
    '.dd-p{position:absolute;z-index:60;inset-inline:0;top:calc(100% + 6px);padding:8px;border-radius:16px;border:1px solid var(--ln);background:var(--s1);box-shadow:0 18px 40px rgba(0,0,0,.35)}',
    '.dd-s{width:100%;height:40px;padding:0 12px;margin-bottom:6px;border-radius:11px;border:1.5px solid var(--ln);background:var(--s2);color:var(--tx);font:inherit;font-size:13px;outline:none}.dd-s:focus{border-color:var(--ac)}',
    '.dd-l{max-height:260px;overflow-y:auto;display:grid;gap:3px}.dd-i{display:flex;justify-content:space-between;align-items:center;gap:8px;border:0;background:none;color:var(--tx);font:inherit;font-size:13px;padding:9px 10px;border-radius:10px;cursor:pointer;text-align:start;line-height:1.35}',
    '.dd-i:hover,.dd-i.on{background:color-mix(in srgb,var(--ac) 16%,transparent)}.dd-i.on{font-weight:700}.dd-i i{font-style:normal;color:var(--mu);font-size:11px;white-space:nowrap}.dd-e{padding:10px;color:var(--mu);font-size:12.5px;text-align:center}',
    /* صلاحيات */
    '#pmModal{position:fixed;inset:0;z-index:97;display:grid;place-items:center;padding:16px;background:rgba(4,6,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}',
    '#pmModal .pc{width:min(440px,100%);max-height:88vh;overflow-y:auto;padding:18px;border-radius:22px;background:var(--s1);border:1px solid var(--ln);box-shadow:0 24px 60px rgba(0,0,0,.4)}',
    '#pmModal h3{margin:0 0 4px;font-size:17px}#pmModal p{margin:0 0 10px;color:var(--mu);font-size:12.5px;line-height:1.7}',
    '.pm-r{display:grid;grid-template-columns:1fr 64px 64px;gap:6px;align-items:center;padding:8px 4px;border-bottom:1px solid var(--ln);font-size:13px}.pm-r.h{font-size:11.5px;color:var(--mu);font-weight:600}.pm-r span:not(:first-child){text-align:center}',
    '.pm-r label{display:grid;place-items:center}'
  ].join("\n");
  var st = document.createElement("style"); st.id = "modernCss"; st.textContent = css; document.head.appendChild(st);

  /* ---------- قايمة منسدلة فيها بحث ---------- */
  var REG = {};
  var CH = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
  window.__dd = {
    html: function (id, o) {
      REG[id] = o;
      var opts = (o.options || []).map(function (x) { return '<button type="button" class="dd-i' + (String(x.v) === String(o.value) ? " on" : "") + '" data-v="' + esc(x.v) + '" data-k="' + esc(nz(x.l + " " + (x.t || ""))) + '"><span>' + esc(x.l) + "</span>" + (x.t ? "<i>" + esc(x.t) + "</i>" : "") + "</button>"; }).join("");
      return '<div class="dd" data-dd="' + esc(id) + '"><button type="button" class="dd-b"><span class="dd-t">' + (o.prefix ? "<small>" + esc(o.prefix) + "</small>" : "") + "<b>" + esc(o.label || "") + "</b></span>" + CH + '</button><div class="dd-p" hidden>' +
        (o.search === false ? "" : '<input class="dd-s" type="text" placeholder="ابحث..." autocomplete="off">') + '<div class="dd-l">' + opts + '</div><div class="dd-e" hidden>مفيش نتايج</div></div></div>';
    }
  };
  function ddClose(except) { $$(".dd.open").forEach(function (w) { if (w === except) return; w.classList.remove("open"); var p = $(".dd-p", w); if (p) p.hidden = true; }); }
  document.addEventListener("click", function (e) {
    var t = e.target; if (!t.closest) return;
    var item = t.closest(".dd-i");
    if (item) {
      var w = item.closest(".dd"), o = REG[w.getAttribute("data-dd")];
      ddClose(); if (o && o.onPick) o.onPick(item.getAttribute("data-v"));
      e.stopPropagation(); return;
    }
    var b = t.closest(".dd-b");
    if (b) {
      var w2 = b.closest(".dd"), p = $(".dd-p", w2), open = !w2.classList.contains("open");
      ddClose(w2); w2.classList.toggle("open", open); p.hidden = !open;
      if (open) { var si = $(".dd-s", w2); if (si) { si.value = ""; filt(w2, ""); setTimeout(function () { try { si.focus(); } catch (x) {} }, 30); } var on = $(".dd-i.on", w2); if (on && on.scrollIntoView) on.scrollIntoView({ block: "nearest" }); }
      e.stopPropagation(); return;
    }
    if (!t.closest(".dd")) ddClose();
  }, true);
  function filt(w, q) {
    q = nz(q); var n = 0;
    $$(".dd-i", w).forEach(function (i) { var ok = !q || i.getAttribute("data-k").indexOf(q) > -1; i.hidden = !ok; if (ok) n++; });
    var e = $(".dd-e", w); if (e) e.hidden = n > 0;
  }
  document.addEventListener("input", function (e) { var t = e.target; if (t.classList && t.classList.contains("dd-s")) filt(t.closest(".dd"), t.value); });
  document.addEventListener("keydown", function (e) {
    var t = e.target; if (e.key === "Enter" && t.classList && t.classList.contains("dd-s")) { var f = $$(".dd-i", t.closest(".dd")).filter(function (i) { return !i.hidden; })[0]; if (f) { e.preventDefault(); f.click(); } }
  });

  /* ---------- الأدمن + البروفايل ---------- */
  var ADMIN = false;
  function prof() { try { var p = JSON.parse(LS.get("fc_profile") || "null"); return p && p.team && p.entryId ? p : null; } catch (e) { return null; } }
  function adminKey() { return LS.get("fc_key") || ""; }
  function checkAdmin() {
    var k = adminKey(); if (!k) { ADMIN = false; return Promise.resolve(false); }
    return F.api({ api: "tmCheck", key: k }).then(function (r) { ADMIN = !!(r && r.success); return ADMIN; }).catch(function () { return ADMIN; });
  }

  /* ---------- صلاحيات التبويبات ---------- */
  var PERM = {}; try { PERM = JSON.parse(LS.get("fc_perm") || "{}") || {}; } catch (e) { PERM = {}; }
  function allowed(tab) {
    if (!tab || tab === "overview" || ADMIN) return true;
    var p = PERM[tab]; if (!p) return true;
    return prof() ? p.m !== 0 : p.v !== 0;
  }
  function loadPerm() {
    return F.api({ api: "permGet" }).then(function (r) {
      if (r && r.success && r.perms) { PERM = r.perms; LS.set("fc_perm", JSON.stringify(PERM)); apply(); }
    }).catch(function () {});
  }
  function apply() {
    if (!allowed(S.tab)) { F.toast("التبويب ده مقفول دلوقتي"); F.setTab("overview"); return; }
    $$("#drawer [data-tab]").forEach(function (b) { if (!allowed(b.getAttribute("data-tab"))) b.remove(); });
    $$("[data-ltab]").forEach(function (b) { if (!allowed(b.getAttribute("data-ltab"))) b.remove(); });
    var ns = $("#drawer .ns");
    if (ns && ADMIN && !$("#pmOpen")) { var bt = document.createElement("button"); bt.className = "tl"; bt.id = "pmOpen"; bt.textContent = "🔒 صلاحيات التبويبات (أعضاء / زوار)"; ns.appendChild(bt); }
    if (ns && !$("#fsTgl") && document.fullscreenEnabled) { var f = document.createElement("button"); f.className = "tl"; f.id = "fsTgl"; f.textContent = "⛶ ملء الشاشة"; ns.appendChild(f); }
  }
  new MutationObserver(function () { $$("[data-ltab]").forEach(function (b) { if (!allowed(b.getAttribute("data-ltab"))) b.remove(); }); }).observe(document.body, { childList: true, subtree: true });

  function permModal() {
    var tabs = [], seen = {};
    $$("#drawer [data-tab]").forEach(function (b) {
      var id = b.getAttribute("data-tab"); if (seen[id] || id === "overview") return; seen[id] = 1;
      var w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, null), n, nm = id; while ((n = w.nextNode())) { var tx = n.textContent.trim(); if (tx) { nm = tx; break; } }
      tabs.push({ id: id, name: nm });
    });
    var d = document.createElement("div"); d.id = "pmModal";
    d.innerHTML = '<div class="pc"><h3>صلاحيات التبويبات</h3><p>علّم على اللي يقدر يفتح كل تبويب. «عضو» = اللي دخل بالبروفايل بتاعه، «زائر» = اللي برا البوابة من غير بروفايل. الأدمن بيفتح كله دايمًا.</p><div class="pm-r h"><span>التبويب</span><span>عضو</span><span>زائر</span></div>' +
      tabs.map(function (t) { var p = PERM[t.id] || {}; return '<div class="pm-r"><span>' + esc(t.name) + '</span><label><input type="checkbox" data-pm="' + esc(t.id) + '|m"' + (p.m !== 0 ? " checked" : "") + '></label><label><input type="checkbox" data-pm="' + esc(t.id) + '|v"' + (p.v !== 0 ? " checked" : "") + "></label></div>"; }).join("") +
      '<div style="display:grid;gap:8px;margin-top:14px"><button class="btn b1" id="pmSave">حفظ</button><button class="btn b2" id="pmClose">إلغاء</button></div><p id="pmMsg" style="margin:10px 0 0"></p></div>';
    document.body.appendChild(d);
  }
  function permSave() {
    var out = {}, msg = $("#pmMsg");
    $$("#pmModal [data-pm]").forEach(function (c) { var a = c.getAttribute("data-pm").split("|"); out[a[0]] = out[a[0]] || { m: 1, v: 1 }; out[a[0]][a[1]] = c.checked ? 1 : 0; });
    Object.keys(out).forEach(function (k) { if (out[k].m === 1 && out[k].v === 1) delete out[k]; });
    if (msg) msg.textContent = "بيحفظ...";
    fetch(F.CFG.API, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ api: "permSave", key: adminKey(), perms: out }) }).then(function (r) { return r.json(); }).then(function (r) {
      if (r && r.success) { PERM = out; LS.set("fc_perm", JSON.stringify(PERM)); var m = $("#pmModal"); if (m) m.remove(); F.toast("اتحفظت الصلاحيات"); F.render(); }
      else if (msg) msg.textContent = (r && r.message) || "تعذّر الحفظ (اعمل Deploy ← New version)";
    }).catch(function () { if (msg) msg.textContent = "فشل الاتصال بالسيرفر"; });
  }

  var _click = R.click;
  R.click = function (e) {
    var t = e.target; if (t.closest) {
      var tb = t.closest("[data-tab],[data-ltab]");
      if (tb && !allowed(tb.getAttribute("data-tab") || tb.getAttribute("data-ltab"))) { F.toast("التبويب ده مقفول دلوقتي"); return true; }
      if (t.closest("#pmOpen")) { document.body.classList.remove("dro"); permModal(); return true; }
      if (t.closest("#pmSave")) { permSave(); return true; }
      if (t.closest("#pmClose") || t.id === "pmModal") { var m = $("#pmModal"); if (m) m.remove(); return true; }
      if (t.closest("#fsTgl")) { toggleFs(); return true; }
    }
    return _click ? _click(e) : false;
  };
  var _ra = R.afterRender;
  R.afterRender = function () { if (_ra) _ra(); apply(); };

  /* ---------- ملء الشاشة ---------- */
  function isFs() { return !!(document.fullscreenElement || (window.matchMedia && (matchMedia("(display-mode: fullscreen)").matches || matchMedia("(display-mode: standalone)").matches))); }
  function toggleFs() {
    var de = document.documentElement;
    if (document.fullscreenElement) { LS.set("fc_fsoff", "1"); document.exitFullscreen(); }
    else { LS.del("fc_fsoff"); if (de.requestFullscreen) de.requestFullscreen({ navigationUI: "hide" }).catch(function () {}); }
  }
  function autoFs() {
    if (LS.get("fc_fsoff") || isFs() || !document.fullscreenEnabled) return;
    try { document.documentElement.requestFullscreen({ navigationUI: "hide" }).catch(function () {}); } catch (e) {}
  }
  document.addEventListener("pointerup", function once() { document.removeEventListener("pointerup", once, true); autoFs(); }, true);

  /* ---------- زرار الرجوع ---------- */
  var guard = { fc: 1 };
  try { history.replaceState({ fc: 0 }, ""); history.pushState(guard, ""); } catch (e) {}
  var reg = (window.__backLayers = window.__backLayers || []);
  function closeTop() {
    var m;
    if ((m = $("#pmModal"))) { m.remove(); return true; }
    if ((m = $("#tmModal"))) { m.remove(); return true; }
    var md = $("#modal"); if (md && md.classList.contains("show")) { md.classList.remove("show"); return true; }
    if ($(".dd.open")) { ddClose(); return true; }
    if (document.body.classList.contains("dro")) { document.body.classList.remove("dro"); return true; }
    for (var i = 0; i < reg.length; i++) { try { if (reg[i]()) return true; } catch (e) {} }
    if (S.stack && S.stack.length) { F.pop(); return true; }
    if (window.__tmNav && window.__tmNav.back()) return true;
    if (S.tab !== "overview") { F.setTab("overview"); return true; }
    return false;
  }
  window.addEventListener("popstate", function () {
    if (window.__fcGate) { try { history.pushState(guard, ""); } catch (e) {} return; }
    if (closeTop()) { try { history.pushState(guard, ""); } catch (e) {} }
    else { window.__fcExit = true; history.back(); }
  });

  /* ---------- تشغيل ---------- */
  checkAdmin().then(function () { apply(); });
  loadPerm();
  document.addEventListener("visibilitychange", function () { if (!document.hidden) loadPerm(); });
})();
