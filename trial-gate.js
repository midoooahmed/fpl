/* trial-gate.js - بوابة لينك التجربة (بيتحمّل بعد config.js علطول، قبل باقي التطبيق)
   - لو اللينك فيه ?trial=TOKEN: بيتحفظ على الجهاز، والتطبيق بيتفتح بس طول ما اللينك شغال.
   - لما المدة تخلص (أو الأدمن يوقفه): شاشة قفل بتغطي التطبيق كله، وبتفتح تاني لوحدها لو الأدمن جدّد.
   - بيسجّل مين دخل باللينك (البروفايل أو "زائر") ويعرض عدّاد "باقي كام" تحت.
   ملاحظة: ده قفل من ناحية المتصفح (GitHub Pages مفيهاش سيرفر يقفل فعليًا). */
(function () {
  "use strict";
  var API = (window.CFG && window.CFG.API) || "";
  var K = "fc_trial", KE = "fc_trial_end";
  function g(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function s(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  function d(k) { try { localStorage.removeItem(k); } catch (e) {} }
  var tok = "";
  try { tok = new URL(location.href).searchParams.get("trial") || ""; } catch (e) {}
  if (tok) { s(K, tok); d(KE); }
  tok = g(K);
  if (!tok || !API) return;

  var ends = Number(g(KE)) || 0, off = 0, ok = false, locked = false, logged = "", box = null, pillEl = null, msgEl = null;
  var DAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  function when(ts) {
    var x = new Date(ts), h = x.getHours(), m = x.getMinutes(), p = h >= 12 ? "م" : "ص"; h = h % 12; if (h === 0) h = 12;
    return DAYS[x.getDay()] + " " + x.getDate() + "-" + (x.getMonth() + 1) + "-" + x.getFullYear() + " " + h + ":" + (m < 10 ? "0" : "") + m + " " + p;
  }
  function left(sec) {
    sec = Math.max(0, Math.round(sec)); var dd = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60);
    return dd ? dd + " يوم " + (h ? h + " س" : "") : h ? h + " س " + (m ? m + " د" : "") : m ? m + " د" : sec + " ث";
  }
  function now() { return Date.now() + off; }

  function mount(fn) { if (document.body) fn(); else document.addEventListener("DOMContentLoaded", fn); }
  function showBox(title, text, retry) {
    mount(function () {
      if (!box) {
        box = document.createElement("div"); box.id = "trGate";
        box.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:24px;background:#0B0F19;color:#fff;text-align:center;font-family:inherit";
        document.body.appendChild(box);
      }
      box.innerHTML = '<div style="max-width:380px"><div style="font-size:44px;margin-bottom:10px">' + (retry === "wait" ? "⏳" : "🔒") + '</div><h2 style="margin:0 0 10px;font-size:22px;font-weight:700">' + title + '</h2><p style="margin:0 0 18px;line-height:1.9;opacity:.8;font-size:14.5px">' + text + "</p>" +
        (retry === "wait" ? "" : '<button id="trRetry" style="height:48px;padding:0 26px;border:0;border-radius:14px;background:#17d67e;color:#0B0F19;font:inherit;font-size:15px;font-weight:600;cursor:pointer">جرّب تاني</button>') + "</div>";
      var b = box.querySelector("#trRetry"); if (b) b.onclick = function () { check(true); };
    });
  }
  function hideBox() { if (box) { box.remove(); box = null; } }
  function pill() {
    mount(function () {
      if (!pillEl) {
        pillEl = document.createElement("div");
        pillEl.style.cssText = "position:fixed;bottom:10px;left:50%;transform:translateX(-50%);z-index:9998;padding:6px 14px;border-radius:99px;background:rgba(11,15,25,.82);color:#fff;font-size:12px;font-family:inherit;pointer-events:none;white-space:nowrap;-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px)";
        document.body.appendChild(pillEl);
      }
      pillEl.textContent = "نسخة تجربة · باقي " + left((ends - now()) / 1000);
    });
  }
  function lock(r) {
    locked = true; ok = false; if (pillEl) { pillEl.remove(); pillEl = null; }
    var why = r.reason === "revoked" ? "الأدمن وقّف لينك التجربة ده." : r.reason === "invalid" ? "لينك التجربة ده مش صحيح." : "مدة التجربة خلصت" + (r.endsTs ? " (انتهت " + when(r.endsTs) + ")" : "") + ".";
    showBox("لينك التجربة مش شغال", why + "<br>كلّم الأدمن لو عايز تجدّد، ولو جدّده دوس \"جرّب تاني\".");
  }
  function check(manual) {
    if (manual && locked) showBox("بيتأكد...", "ثواني بنراجع اللينك", "wait");
    return fetch(API + "?" + new URLSearchParams({ api: "trialCheck", token: tok })).then(function (r) { return r.json(); }).then(function (r) {
      if (!r || !r.success) throw new Error("bad");
      off = (r.now || Date.now()) - Date.now();
      if (r.valid) { ends = r.endsTs; s(KE, String(ends)); ok = true; locked = false; hideBox(); pill(); }
      else { s(KE, String(r.endsTs || 1)); lock(r); }
    }).catch(function () {
      if (ends > now()) { ok = true; pill(); }
      else showBox("مش قادر أتأكد من اللينك", "اتأكد إن النت شغال وجرّب تاني.");
    });
  }

  /* تسجيل الدخول باللينك (بروفايل أو زائر) بعد ما شاشة الدخول تتقفل */
  function logEntry() {
    if (!ok || window.__fcGate) return;
    var p = null; try { p = JSON.parse(g("fc_profile") || "null"); } catch (e) {}
    var key = p && p.team && p.entryId ? p.team + "|" + p.entryId : "guest";
    if (key === logged) return;
    var q = { api: "trialEnter", token: tok }; if (key !== "guest") { q.team = p.team; q.entryId = p.entryId; }
    logged = key;
    fetch(API + "?" + new URLSearchParams(q)).then(function (r) { return r.json(); }).then(function (r) { if (!r || !r.success) logged = ""; }).catch(function () { logged = ""; });
  }

  if (ends <= Date.now()) showBox("بيتأكد...", "ثواني بنراجع لينك التجربة", "wait");
  check(false);
  setInterval(function () {
    if (ok && ends - now() <= 0) { check(false); return; }
    if (ok) pill();
    logEntry();
  }, 5000);
  setInterval(function () { if (!document.hidden) check(false); }, 60000);
  document.addEventListener("visibilitychange", function () { if (!document.hidden) check(false); });
})();
