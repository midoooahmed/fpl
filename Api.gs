// =====================================================================
// Api.gs - واجهة JSON للتطبيق (index.html على GitHub Pages)
// بتتنادى من Router.gs لما الرابط فيه ?api=...
//   cur               -> الجولة الحالية
//   gw&gw=N&force=0   -> بيانات الجولة (نفس اللي كانت بتروح لصفحة الإحصائيات)
//   liveCached&gw=N   -> آخر لايف متخزن (خفيف، التطبيق بيسأل عنه كل دقيقة)
//   live&gw=N         -> بيجيب لايف جديد من الفانتازي (زرار التحديث)
//   history&gw=N      -> الجولات القديمة من الشيتات
//   fixtures&gw=N     -> الماتشات الجاية
//   prev&gw=N&ids=a,b -> تشكيلة الجولة اللي فاتت لأصحاب الخواص
//   teams / prep&t1&t2 / cmp&t1&t2&c1&c2&save / pitch&id -> المقارنة (Code.gs + Extra.gs)
//   autoLive&key=..   -> تشغيل/إيقاف التحديث التلقائي كل 5 دقايق
//   sync&key=..&team= -> تحديث الأعضاء من الليغات (محتاج ADMIN_KEY)
//   capInfo / capHistory / capSave&team&password&picks / capLock&key&locked / capInit&key / capClear&key&gw / capAuto&key&from -> كبتنة التيمات (Captain.gs)
//   visit&team&entryId / visits / visitReset&key -> اللي نوّروا وشرّفوا (Visits.gs)
// ADMIN_KEY: Project Settings > Script properties > أضف ADMIN_KEY وقيمته أي كلمة سر
// =====================================================================
function handleApi_(p) {
  var out;
  try {
    var gw = Number(p.gw);
    switch (String(p.api)) {
      case "cur": out = { gw: getCurrentGw() }; break;
      case "gw": out = loadGWDataForWeb(gw, String(p.force) === "1"); break;
      case "liveCached": out = { live: getLiveOnly(gw) }; break;
      case "live": out = updateLiveData(gw); break;
      case "history": out = getHistoryData(gw); break;
      case "fixtures": out = getFixturesAhead(gw, 4); break;
      case "prev": out = getPrevPicks(gw, String(p.ids || "").split(",")); break;
      case "teams": out = getTeamsList(); break;
      case "prep": out = prepareComparison(String(p.t1), String(p.t2)); break;
      case "cmp":
        var c1 = p.c1 ? JSON.parse(p.c1) : null, c2 = p.c2 ? JSON.parse(p.c2) : null;
        out = String(p.save) === "1" ? confirmAndAnalyze(String(p.t1), String(p.t2), c1, c2) : analyzeTeams(String(p.t1), String(p.t2), c1, c2);
        break;
      case "pitch": out = getManagerPitch(String(p.id)); break;
      case "autoLive":
        if (!checkAdminKey_(p.key)) { out = { success: false, message: "مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)" }; break; }
        var on = !getAutoLive(); setAutoLive(on);
        out = { success: true, on: on, message: on ? "التحديث التلقائي اشتغل (كل 5 دقايق وقت الماتشات)" : "التحديث التلقائي اتقفل" };
        break;
      case "sync":
        out = checkAdminKey_(p.key) ? syncMembers(p.team || "") : { success: false, message: "مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)" };
        break;
      // كبتنة التيمات (Captain.gs)
      case "capInfo": out = capInfo_(); break;
      case "capHistory": out = capHistory_(); break;
      case "capSave": out = capSave_(p); break;
      case "capLock": out = capLock_(p); break;
      case "capInit": out = capInit_(p); break;
      case "capClear": out = capClear_(p); break;
      case "capAuto": out = capAuto_(p); break;
      // اللي نوّروا وشرّفوا (Visits.gs)
      case "visit": out = visit_(p); break;
      case "visits": out = visits_(); break;
      case "visitReset": out = visitReset_(p); break;
      default: out = { success: false, message: "api غير معروف" };
    }
  } catch (e) {
    out = { success: false, message: String(e && e.message ? e.message : e) };
  }
  return ContentService.createTextOutput(JSON.stringify(out)).setMimeType(ContentService.MimeType.JSON);
}

function checkAdminKey_(k) {
  var s = PropertiesService.getScriptProperties().getProperty("ADMIN_KEY");
  return !!s && String(k || "") === s;
}
