// =====================================================================
// Router.gs - نقطة الدخول الوحيدة للتطبيق (doGet)
//   بدون باراميتر أو ?page=gof            -> مقارنة بطولة Game Of Fantasy
//   ?page=stats (أو أي رابط فيه s=)       -> شويه احصائيات - مسابقتي
// الصفحتين بيفضلوا ملفات مستقلة (Index.html و IndexStats.html) فمفيش تعارض بينهم
// =====================================================================

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.api) return handleApi_(p); // واجهة JSON للتطبيق (Api.gs)
  var page = String(p.page || (p.s ? "stats" : "gof")).toLowerCase();
  return page === "stats" ? renderStatsPage_() : renderGofPage_();
}

// POST: بنستخدمه لحفظ البطولات (إعدادات كبيرة ماتنفعش في رابط GET). الجسم JSON فيه api وباقي الباراميترز
function doPost(e) {
  var p = {};
  try { p = JSON.parse((e && e.postData && e.postData.contents) || "{}"); } catch (err) { p = {}; }
  if (p.api) return handleApi_(p);
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: "طلب غير مفهوم" })).setMimeType(ContentService.MimeType.JSON);
}

function renderGofPage_() {
  var html = HtmlService.createHtmlOutputFromFile("Index").getContent();
  html = html.indexOf("</body>") > -1
    ? html.replace("</body>", function () { return GOF_NAV_SNIPPET_ + "</body>"; })
    : html + GOF_NAV_SNIPPET_;
  return HtmlService.createHtmlOutput(html)
    .setTitle("مقارنه بطوله Game Of Fantasy")
    .addMetaTag("viewport", "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no")
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// زرار "الإحصائيات" بيتضاف لصفحة المقارنة وقت التشغيل (من غير ما نعدّل Index.html)
// + بيستلم الثيم والوضع الليلي من صفحة الإحصائيات لما ترجع منها
var GOF_NAV_SNIPPET_ = `
<style>.top{flex-wrap:wrap}#goStats{white-space:nowrap}html th{background:var(--ac)}</style>
<script>
(function () {
  var APPURL = "";
  try { google.script.run.withSuccessHandler(function (u) { APPURL = u || ""; }).getAppUrl(); } catch (e) {}
  var skb = document.getElementById("skb");
  if (skb && skb.parentNode) {
    var b = document.createElement("button");
    b.id = "goStats"; b.className = "btn"; b.type = "button";
    b.style.cssText = "padding:8px 14px;font-size:.78rem";
    b.textContent = "📊 الإحصائيات";
    b.onclick = function () {
      var h = document.documentElement;
      var q = "page=stats&skin=" + (h.getAttribute("data-skin") || "1") + "&mode=" + (h.getAttribute("data-mode") || "light");
      var go = function (u) { window.open(u + (u.indexOf("?") > -1 ? "&" : "?") + q, "_top"); };
      if (APPURL) { go(APPURL); return; }
      google.script.run
        .withSuccessHandler(function (u) { if (u) go(u); else alert("تعذّر فتح صفحة الإحصائيات"); })
        .withFailureHandler(function () { alert("تعذّر فتح صفحة الإحصائيات"); })
        .getAppUrl();
    };
    skb.parentNode.insertBefore(b, skb.parentNode.firstChild);
  }
  try {
    google.script.url.getLocation(function (l) {
      var p = (l && l.parameter) || {};
      if (/^[1-5]$/.test(p.skin || "") && typeof setSkin === "function") setSkin(p.skin);
      if ((p.mode === "dark" || p.mode === "light") && typeof setMode === "function") setMode(p.mode);
    });
  } catch (e) {}
})();
</script>
`;
