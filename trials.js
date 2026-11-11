/* trials.js - تبويب "لينكات التجربة" (أدمن): اعمل لينك مؤقت تبعته لحد يجرب التطبيق، حدد مدته، شوف مين دخل بيه، وجدّده أو وقّفه.
   اللينك بيفتح نفس التطبيق بس بـ ?trial=TOKEN، والبوابة (trial-gate.js) هي اللي بتقفل لما المدة تخلص. الداتا في Trials.gs. */
(function () {
  "use strict";
  var F = window.__fc, R = F.R, S = F.S, esc = F.esc;
  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del: function (k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  var ST = { key: LS.get("fc_key") || "", admin: false, items: null, off: 0, err: "", loading: false, label: "", n: 2, unit: "60", checked: false, rs: { visits: true, tournaments: true, trials: true } };
  var wasOn = false, timer = 0;

  (function () {
    var st = document.createElement("style"); st.id = "trlCss";
    st.textContent = [
      ".tr-in{width:100%;height:46px;padding:0 12px;border-radius:12px;border:1.5px solid var(--ln);background:var(--s1);color:var(--tx);font:inherit;font-size:14.5px;outline:none}.tr-in:focus{border-color:var(--ac)}",
      ".tr-g{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}.tr-f{display:grid;gap:6px;margin-top:10px;font-size:13px;color:var(--mu)}",
      ".tr-top{display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap}.tr-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:10px}",
      ".tr-pill{display:inline-flex;padding:4px 11px;border-radius:99px;background:var(--s3);color:var(--mu);font-size:12px;font-weight:500}.tr-pill.ok{background:color-mix(in srgb,#17d67e 18%,transparent);color:var(--tx)}.tr-pill.no{background:color-mix(in srgb,#ff3b5c 16%,transparent);color:var(--tx)}",
      ".tr-link{display:flex;gap:8px;margin-top:10px}.tr-link input{direction:ltr;text-align:left;font-size:12.5px}",
      ".tr-en{margin-top:12px;border-top:1px solid var(--ln);padding-top:10px}.tr-en b{font-size:13.5px}.tr-e{display:flex;justify-content:space-between;gap:10px;padding:8px 0;font-size:13.5px;border-bottom:1px dashed var(--ln)}.tr-e small{display:block;color:var(--mu);font-size:11.5px}.tr-e span:last-child{white-space:nowrap;color:var(--mu);font-size:12px;text-align:end}",
      "#trlModal{position:fixed;inset:0;z-index:96;display:grid;place-items:center;padding:20px;background:rgba(4,6,12,.62);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)}#trlModal .tc{width:min(380px,100%);padding:22px;border-radius:24px;background:var(--s1);border:1px solid var(--ln)}#trlModal h3{margin:0 0 6px;font-size:18px}#trlModal p{margin:0 0 12px;color:var(--mu);font-size:13px;line-height:1.7}#trlModal .ab{display:grid;gap:8px;margin-top:12px}"
    ].join("\n");
    document.head.appendChild(st);
  })();

  function hint(r) { var m = r && r.message; if (!m) return "تعذّر الاتصال بالسيرفر"; if (m.indexOf("غير معروف") > -1) return "السيرفر لسه على نسخة قديمة: اعمل Deploy ← New version في Apps Script"; return m; }
  function linkOf(t) { return location.origin + location.pathname + "?trial=" + encodeURIComponent(t); }
  function mins() { return Math.max(1, Math.round((Number(ST.n) || 1) * Number(ST.unit))); }
  function nowS() { return Date.now() + ST.off; }
  function call(q) { q.key = ST.key; return F.api(q); }

  function load(quiet) {
    if (!ST.key || ST.loading) { if (!ST.key) { ST.checked = true; if (S.tab === "trials") F.render(); } return; }
    ST.loading = true;
    return call({ api: "trialList" }).then(function (r) {
      ST.loading = false; ST.checked = true;
      if (r && r.success) { ST.admin = true; ST.items = r.items || []; ST.off = (r.now || Date.now()) - Date.now(); ST.err = ""; }
      else { ST.admin = false; ST.err = (r && r.message) || "تعذّر التحميل"; }
      if (S.tab === "trials" && !document.getElementById("trlModal")) F.render();
    }).catch(function () { ST.loading = false; ST.checked = true; if (!quiet) ST.err = "تعذّر الاتصال بالسيرفر"; if (S.tab === "trials") F.render(); });
  }
  function act(api, token, msg) {
    var q = { api: api, token: token }; if (api === "trialRenew") q.mins = mins();
    call(q).then(function (r) { F.toast((r && r.message) || "تعذّر التنفيذ"); if (r && r.success) { ST.loading = false; return load(true); } });
  }
  function modal(html) { var d = document.getElementById("trlModal"); if (!d) { d = document.createElement("div"); d.id = "trlModal"; document.body.appendChild(d); } d.innerHTML = '<div class="tc">' + html + "</div>"; }
  function closeModal() { var d = document.getElementById("trlModal"); if (d) d.remove(); }

  function unitSel() {
    return '<select class="tr-in" data-trl="unit">' + [["1", "دقيقة"], ["60", "ساعة"], ["1440", "يوم"]].map(function (x) { return '<option value="' + x[0] + '"' + (ST.unit === x[0] ? " selected" : "") + ">" + x[1] + "</option>"; }).join("") + "</select>";
  }
  function card(x) {
    var rem = (x.endsTs - nowS()) / 1000, active = !x.revoked && rem > 0;
    var pill = x.revoked ? '<span class="tr-pill no">موقوف</span>' : active ? '<span class="tr-pill ok">شغال</span>' : '<span class="tr-pill no">منتهي</span>';
    var url = linkOf(x.token);
    var en = (x.entrants || []).slice().sort(function (a, b) { return b.lastTs - a.lastTs; });
    return '<div class="cd" style="margin-top:12px"><div class="tr-top"><b style="font-size:16px">' + esc(x.label) + "</b>" + pill + "</div>" +
      '<div class="tr-row" style="margin-top:8px"><span class="tr-pill">' + (active ? "ينتهي: " : "انتهى: ") + esc(F.when(x.endsTs)) + "</span>" + (active ? '<span class="tr-pill ok">باقي ' + esc(F.dur(rem)) + "</span>" : "") + '<span class="tr-pill">اتعمل: ' + esc(F.when(x.createdTs)) + "</span></div>" +
      '<div class="tr-link"><input class="tr-in" readonly value="' + esc(url) + '" onclick="this.select()"><button class="chip" data-trl="copy" data-a="' + esc(x.token) + '">نسخ</button>' + (navigator.share ? '<button class="chip" data-trl="share" data-a="' + esc(x.token) + '">مشاركة</button>' : "") + "</div>" +
      '<div class="tr-row"><button class="btn b1" data-trl="renew" data-a="' + esc(x.token) + '" style="flex:1">تجديد (+' + esc(String(ST.n)) + " " + esc(ST.unit === "1" ? "دقيقة" : ST.unit === "60" ? "ساعة" : "يوم") + ")</button>" +
      (active ? '<button class="btn b2" data-trl="stop" data-a="' + esc(x.token) + '">إيقاف</button>' : "") + '<button class="btn b2" data-trl="del" data-a="' + esc(x.token) + '">مسح</button></div>' +
      '<div class="tr-en"><b>دخلوا باللينك (' + en.length + ")</b>" +
      (en.length ? en.map(function (e) { return '<div class="tr-e"><span>' + esc(e.person) + (e.team ? "<small>" + esc(e.team) + "</small>" : "") + "</span><span>" + e.count + " مرة<br>" + esc(F.when(e.lastTs)) + "</span></div>"; }).join("") : '<div class="tr-e"><span style="color:var(--mu)">لسه محدش دخل</span></div>') + "</div></div>";
  }
  function resetCard() {
    var R0 = [["visits", "الدخولات ومدة الاستخدام (اللي نوّروا وشرّفوا)"], ["tournaments", "كل البطولات"], ["trials", "كل لينكات التجربة (وسجل اللي دخلوا بيها)"]];
    return '<div class="cd" style="margin-top:12px"><div class="ct">تصفير التجارب (رجّع التطبيق جديد)</div><p style="margin:0 0 8px;font-size:13px;color:var(--mu);line-height:1.8">اللي تختاره بيتنقل لورقة أرشيف في الشيت (مش بيتمسح نهائي). كباتن الجولات بتتصفّر من تاب الكبتنة.</p><div class="tr-row" style="margin-top:0">' +
      R0.map(function (x) { return '<label class="tr-pill" style="cursor:pointer;gap:8px;align-items:center;padding:8px 12px"><input type="checkbox" data-trl="rs" data-a="' + x[0] + '"' + (ST.rs[x[0]] ? " checked" : "") + ' style="accent-color:var(--ac)"> ' + x[1] + "</label>"; }).join("") + '</div>' +
      '<button class="btn b2" data-trl="rsask" style="width:100%;margin-top:12px;color:#ff6b81">تصفير المختار من السيرفر</button>' +
      '<button class="btn b2" data-trl="devask" style="width:100%;margin-top:8px">تصفير بيانات الجهاز ده بس (بروفايل، إعدادات، وقت)</button></div>';
  }
  function view() {
    var h = '<div class="tr-top"><h2 style="margin:0;font-size:20px">لينكات التجربة</h2>' + (ST.admin ? '<div class="tr-row" style="margin:0"><button class="chip" data-trl="refresh">تحديث</button><button class="chip" data-trl="logout">خروج الأدمن</button></div>' : "") + "</div>";
    if (!ST.admin) {
      if (!ST.checked && ST.key) return h + '<div class="plz" style="min-height:200px;margin-top:12px"></div>';
      return h + '<div class="cd" style="margin-top:12px"><div class="ct">للأدمن بس</div><p style="color:var(--mu);font-size:14px;line-height:1.8">من هنا بتعمل لينك مؤقت تبعته لحد يجرب التطبيق، بمدة بتحددها، وتشوف مين دخل بيه وتجدّده.</p>' + (ST.err ? '<div class="empty" style="padding:10px">' + esc(ST.err) + "</div>" : "") + '<button class="btn b1" data-trl="admin" style="width:100%">وضع الأدمن</button></div>';
    }
    h += '<div class="cd" style="margin-top:12px"><div class="ct">لينك جديد</div><div class="tr-f"><span>اسم / ملاحظة (مثلًا: تجربة أحمد)</span><input class="tr-in" data-trl="label" value="' + esc(ST.label) + '" placeholder="اسم اللينك"></div>' +
      '<div class="tr-g"><div class="tr-f" style="margin:0"><span>المدة (للإنشاء والتجديد)</span><input class="tr-in" type="number" min="1" inputmode="numeric" data-trl="n" value="' + esc(String(ST.n)) + '"></div><div class="tr-f" style="margin:0"><span>الوحدة</span>' + unitSel() + "</div></div>" +
      '<button class="btn b1" data-trl="create" style="width:100%;margin-top:12px">إنشاء اللينك</button><p style="margin:10px 0 0;font-size:12px;color:var(--mu);line-height:1.8">بعد ما المدة تخلص، التطبيق بيتقفل عند اللي فتح باللينك، وبيرجع يشتغل لوحده لو جدّدت. القفل من ناحية المتصفح، فاللينك الدائم نفسه مش مخفي.</p></div>';
    h += resetCard();
    if (ST.err && !ST.items) h += '<div class="empty">' + esc(ST.err) + "</div>";
    if (!ST.items) return h + '<div class="plz" style="min-height:160px;margin-top:12px"></div>';
    return h + (ST.items.length ? ST.items.map(card).join("") : '<div class="empty" style="margin-top:12px">مفيش لينكات لسه.</div>');
  }

  var _click = R.click;
  R.click = function (e) {
    if (_click && _click(e)) return true;
    var t = e.target; if (!t.closest) return false;
    var b = t.closest("[data-trl]"); if (!b || S.tab !== "trials") return false;
    var a = b.getAttribute("data-trl"), tk = b.getAttribute("data-a");
    if (a === "label" || a === "n" || a === "unit" || a === "rs") return false;
    if (a === "rsask") {
      var w = Object.keys(ST.rs).filter(function (k) { return ST.rs[k]; });
      if (!w.length) { F.toast("اختار حاجة تتصفّر"); return true; }
      modal('<h3>تأكيد التصفير</h3><p>هتتنقل للأرشيف: ' + esc(w.map(function (k) { return { visits: "الدخولات", tournaments: "البطولات", trials: "لينكات التجربة" }[k]; }).join(" + ")) + '.<br>اكتب كلمة <b>تصفير</b> علشان تأكد.</p><input class="tr-in" id="trlOk" autocomplete="off" placeholder="تصفير"><div class="ab"><button class="btn b1" data-trl="rsgo" style="background:#ff3b5c;color:#fff">صفّر</button><button class="btn b2" data-trl="close">إلغاء</button></div><p id="trlMsg" style="margin:10px 0 0"></p>');
      return true;
    }
    if (a === "rsgo") {
      var ok = ((document.getElementById("trlOk") || {}).value || "").trim(), m2 = document.getElementById("trlMsg");
      if (ok !== "تصفير") { if (m2) m2.textContent = "اكتب كلمة تصفير بالظبط"; return true; }
      if (m2) m2.textContent = "بيصفّر...";
      call({ api: "resetAll", what: Object.keys(ST.rs).filter(function (k) { return ST.rs[k]; }).join(",") }).then(function (r) {
        closeModal(); F.toast((r && r.message) || hint(r));
        if (r && r.success) { ST.loading = false; ST.items = null; load(true); }
      }).catch(function () { if (m2) m2.textContent = "تعذّر الاتصال بالسيرفر"; });
      return true;
    }
    if (a === "devask") {
      modal('<h3>تصفير الجهاز ده</h3><p>هيمسح بيانات التطبيق المحفوظة على الجهاز ده بس: البروفايل، إعدادات الجداول، عدّاد الوقت، ولينك التجربة المحفوظ. مفتاح الأدمن هيفضل. بعدها بيعمل تحديث للصفحة.</p><div class="ab"><button class="btn b1" data-trl="devgo">صفّر الجهاز</button><button class="btn b2" data-trl="close">إلغاء</button></div>');
      return true;
    }
    if (a === "devgo") {
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf("fc_") === 0 && k !== "fc_key") localStorage.removeItem(k); }); sessionStorage.clear(); } catch (e) {}
      location.href = location.origin + location.pathname;
      return true;
    }
    if (a === "refresh") { ST.loading = false; load(); return true; }
    if (a === "logout") { ST.admin = false; ST.key = ""; ST.items = null; LS.del("fc_key"); F.render(); return true; }
    if (a === "admin") {
      modal('<h3>وضع الأدمن</h3><p>اكتب مفتاح الأدمن (ADMIN_KEY).</p><input class="tr-in" id="trlKey" type="password" autocomplete="off" placeholder="ADMIN_KEY" value="' + esc(ST.key) + '"><div class="ab"><button class="btn b1" data-trl="savekey">دخول</button><button class="btn b2" data-trl="close">إلغاء</button></div><p id="trlMsg" style="margin:10px 0 0"></p>');
      return true;
    }
    if (a === "close") { closeModal(); return true; }
    if (a === "savekey") {
      var k = (document.getElementById("trlKey") || {}).value || "", m = document.getElementById("trlMsg"); k = k.trim(); if (!k) return true;
      if (m) m.textContent = "بيتأكد...";
      F.api({ api: "trialList", key: k }).then(function (r) {
        if (r && r.success) { ST.key = k; LS.set("fc_key", k); ST.admin = true; ST.items = r.items || []; ST.off = (r.now || Date.now()) - Date.now(); closeModal(); F.toast("اتفعّل وضع الأدمن"); F.render(); }
        else if (m) m.textContent = hint(r);
      }).catch(function () { if (m) m.textContent = "تعذّر الاتصال بالسيرفر"; });
      return true;
    }
    if (a === "create") {
      call({ api: "trialCreate", label: ST.label, mins: mins() }).then(function (r) {
        F.toast((r && r.message) || "تعذّر الإنشاء");
        if (r && r.success) { ST.label = ""; ST.loading = false; load(true); }
      });
      return true;
    }
    if (a === "renew") { act("trialRenew", tk); return true; }
    if (a === "stop") { if (confirm("توقّف اللينك ده؟")) act("trialRevoke", tk); return true; }
    if (a === "del") { if (confirm("تمسح اللينك ده وسجل اللي دخلوا بيه؟")) act("trialDelete", tk); return true; }
    if (a === "copy") {
      var u = linkOf(tk);
      (navigator.clipboard ? navigator.clipboard.writeText(u).then(function () { F.toast("اتنسخ اللينك"); }) : Promise.reject()).catch(function () { prompt("انسخ اللينك:", u); });
      return true;
    }
    if (a === "share") { navigator.share({ title: "جرّب التطبيق", text: "لينك تجربة مؤقت:", url: linkOf(tk) }).catch(function () {}); return true; }
    return false;
  };
  R.input = (function (prev) {
    return function (e) {
      if (prev) prev(e);
      var t = e.target, a = t.getAttribute && t.getAttribute("data-trl"); if (!a || S.tab !== "trials") return;
      if (a === "label") ST.label = t.value; else if (a === "n") ST.n = t.value; else if (a === "unit") ST.unit = t.value;
    };
  })(R.input);
  R.change = (function (prev) {
    return function (e) {
      if (prev) prev(e);
      var t = e.target, a = t.getAttribute && t.getAttribute("data-trl");
      if (a === "rs" && S.tab === "trials") { ST.rs[t.getAttribute("data-a")] = t.checked; return; }
      if (a === "unit" && S.tab === "trials") { ST.unit = t.value; F.render(); }
      else if (a === "n" && S.tab === "trials") { ST.n = t.value; F.render(); }
    };
  })(R.change);

  R.tabs.push({ id: "trials", name: "لينكات التجربة" });
  var _title = R.title;
  R.title = function (t) { return t === "trials" ? "لينكات التجربة" : (_title ? _title(t) : null); };
  R.views.trials = view;
  var _ra = R.afterRender;
  R.afterRender = function () {
    if (_ra) _ra();
    var on = S.tab === "trials";
    if (on && !wasOn) { ST.loading = false; load(!!ST.items); clearInterval(timer); timer = setInterval(function () { if (S.tab === "trials" && ST.admin) { ST.loading = false; load(true); } }, 30000); }
    if (!on && wasOn) { clearInterval(timer); closeModal(); }
    wasOn = on;
  };
})();
