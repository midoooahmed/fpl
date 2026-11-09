// =====================================================================
// Visits.gs - "اللي نوّروا وشرّفوا": تسجيل دخول الناس للتطبيق (بروفايل = تيم + شخص)
//
// الشيتات (بتتعمل تلقائيًا في نفس ملف الشيت بتاع التطبيق):
//   "الدخول"        : Key | التيم | الشخص | EntryId | عدد المرات | أول دخول | آخر دخول | LastTs   (صف لكل شخص)
//   "أرشيف الدخول"  : نسخة من اللي اتصفّر
//
// بتتنادى من Api.gs:  visit&team&entryId[&n] / visits / visitReset&key
// - الدخول بيتحسب مرة كل دقيقة بالكتير للشخص الواحد (عشان الضغط المتكرر مايزودش العدد بالغلط)
// - التصفير بيحتاج ADMIN_KEY (نفس مفتاح باقي التطبيق)
// ⚠️ بعد إضافة الملف: Deploy -> Manage deployments -> ✏️ -> New version -> Deploy
// =====================================================================
const VIS_SHEET = "الدخول";
const VIS_ARCHIVE = "أرشيف الدخول";
const VIS_HEADER = ["Key", "التيم", "الشخص", "EntryId", "عدد المرات", "أول دخول", "آخر دخول", "LastTs"];
const VIS_MIN_GAP_MS = 60 * 1000;

function visFail_(msg) { return { success: false, message: msg }; }

function visSheet_(name) {
  const ss = getTargetSpreadsheet();
  let sh = ss.getSheetByName(name || VIS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(name || VIS_SHEET);
    sh.appendRow(VIS_HEADER);
    sh.getRange(1, 1, 1, VIS_HEADER.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function visTime_(d) {
  const tz = Session.getScriptTimeZone();
  const hh = Number(Utilities.formatDate(d, tz, "HH"));
  let h = hh % 12; if (h === 0) h = 12;
  return Utilities.formatDate(d, tz, "yyyy-MM-dd") + " " + (h < 10 ? "0" : "") + h + ":" + Utilities.formatDate(d, tz, "mm:ss") + " " + (hh >= 12 ? "م" : "ص");
}

function visRead_(sh) {
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues().map((r, i) => ({
    row: i + 2, key: String(r[0] || ""), team: String(r[1] || ""), person: String(r[2] || ""), entryId: String(r[3] || ""),
    count: Number(r[4]) || 0, first: String(r[5] || ""), last: String(r[6] || ""), lastTs: Number(r[7]) || 0
  })).filter(x => x.key);
}

// تسجيل دخول: لازم الشخص يكون فعلًا ضمن أعضاء التيم (من ورقة "الأعضاء")
function visit_(p) {
  const team = String(p.team || "").trim(), eid = String(p.entryId || "").trim();
  if (!team || !eid) return visFail_("اختار التيم والشخص");
  const mem = readTeamsList_().filter(m => m.team === team && m.entryId === eid)[0];
  if (!mem) return visFail_("الشخص ده مش موجود في التيم");
  const n = Math.max(1, Math.min(10, Number(p.n) || 1));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return visFail_("فيه عملية شغالة دلوقتي، جرّب كمان ثواني");
  try {
    const sh = visSheet_(), key = team + "|" + eid, now = new Date(), ts = now.getTime(), txt = visTime_(now);
    const cur = visRead_(sh).filter(x => x.key === key)[0];
    if (cur) {
      if (ts - cur.lastTs < VIS_MIN_GAP_MS) return { success: true, count: cur.count, counted: false, person: cur.person };
      const c = cur.count + n;
      sh.getRange(cur.row, 3).setValue(mem.person);
      sh.getRange(cur.row, 5).setValue(c);
      sh.getRange(cur.row, 7, 1, 2).setValues([[txt, ts]]);
      SpreadsheetApp.flush();
      return { success: true, count: c, counted: true, person: mem.person };
    }
    sh.appendRow([key, team, mem.person, eid, n, txt, txt, ts]);
    SpreadsheetApp.flush();
    return { success: true, count: n, counted: true, person: mem.person };
  } finally {
    lock.releaseLock();
  }
}

// كل الدخولات (التطبيق هو اللي بيرتّب ويجمّع للتيمات)
function visits_() {
  const sh = getTargetSpreadsheet().getSheetByName(VIS_SHEET);
  const rows = sh ? visRead_(sh) : [];
  return {
    success: true, now: Date.now(),
    rows: rows.map(x => ({ team: x.team, person: x.person, entryId: x.entryId, count: x.count, last: x.last, lastTs: x.lastTs }))
  };
}

// تصفير كل الدخولات (للأدمن): بينقلها للأرشيف الأول
function visitReset_(p) {
  if (!checkAdminKey_(p.key)) return visFail_("مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)");
  const sh = getTargetSpreadsheet().getSheetByName(VIS_SHEET);
  if (!sh || sh.getLastRow() < 2) return { success: true, cleared: 0, message: "مفيش دخولات تتصفّر" };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return visFail_("فيه عملية شغالة دلوقتي، جرّب كمان ثواني");
  try {
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();
    const ar = visSheet_(VIS_ARCHIVE);
    ar.getRange(ar.getLastRow() + 1, 1, v.length, 8).setValues(v);
    sh.getRange(2, 1, sh.getLastRow() - 1, 8).clearContent();
    SpreadsheetApp.flush();
    return { success: true, cleared: v.length, message: "اتصفّرت " + v.length + " دخولة (محفوظة في ورقة \"" + VIS_ARCHIVE + "\")" };
  } finally {
    lock.releaseLock();
  }
}
