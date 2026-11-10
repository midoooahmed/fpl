// =====================================================================
// Visits.gs - "اللي نوّروا وشرّفوا": تسجيل دخول الناس للتطبيق + مدة الاستخدام (بروفايل = تيم + شخص)
//
// الشيتات (بتتعمل تلقائيًا في نفس ملف الشيت بتاع التطبيق):
//   "الدخول"        : Key | التيم | الشخص | EntryId | عدد المرات | أول دخول | آخر دخول | LastTs | إجمالي الثواني | آخر نشاط   (صف لكل شخص)
//   "أرشيف الدخول"  : نسخة من اللي اتصفّر
//
// بتتنادى من Api.gs:  visit&team&entryId[&n] / ping&team&entryId&secs / visits / visitReset&key
// - الدخولة الجديدة بتتحسب بس لو عدّى 15 دقيقة من آخر نشاط للشخص (آخر دخولة أو آخر نبضة وقت)، يعني الفتح والقفل
//   والريفريش المتكرر جوه الربع ساعة مايزودش العدد.
// - الوقت: التطبيق بيبعت نبضة (ping) كل شوية بالثواني اللي الشخص قضاها والتطبيق قدامه (بيقف في الخلفية).
// - التصفير بيحتاج ADMIN_KEY (نفس مفتاح باقي التطبيق)
// ⚠️ بعد إضافة الملف: Deploy -> Manage deployments -> ✏️ -> New version -> Deploy
// =====================================================================
const VIS_SHEET = "الدخول";
const VIS_ARCHIVE = "أرشيف الدخول";
const VIS_HEADER = ["Key", "التيم", "الشخص", "EntryId", "عدد المرات", "أول دخول", "آخر دخول", "LastTs", "إجمالي الثواني", "آخر نشاط"];
const VIS_COLS = 10;
const VIS_MIN_GAP_MS = 15 * 60 * 1000; // فاصل ربع ساعة بين دخولة ودخولة
const VIS_MAX_PING_SECS = 600;         // أقصى ثواني تتسجل في نبضة واحدة (حماية)

function visFail_(msg) { return { success: false, message: msg }; }

function visSheet_(name) {
  const ss = getTargetSpreadsheet();
  let sh = ss.getSheetByName(name || VIS_SHEET);
  if (!sh) {
    sh = ss.insertSheet(name || VIS_SHEET);
    sh.appendRow(VIS_HEADER);
    sh.getRange(1, 1, 1, VIS_HEADER.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  } else if (sh.getLastColumn() < VIS_COLS || String(sh.getRange(1, 9).getValue() || "") === "") {
    // شيت قديم (٨ أعمدة): نضيف عمودين الوقت
    sh.getRange(1, 9, 1, 2).setValues([[VIS_HEADER[8], VIS_HEADER[9]]]).setFontWeight("bold");
  }
  return sh;
}

// وقت مبسّط: اليوم + التاريخ + الساعة (من غير ثواني)  مثال: الثلاثاء 2026-11-10 09:30 م
function visTime_(d) {
  const tz = Session.getScriptTimeZone();
  const DAYS = { 1: "الاثنين", 2: "الثلاثاء", 3: "الأربعاء", 4: "الخميس", 5: "الجمعة", 6: "السبت", 7: "الأحد" };
  const hh = Number(Utilities.formatDate(d, tz, "HH"));
  let h = hh % 12; if (h === 0) h = 12;
  return DAYS[Number(Utilities.formatDate(d, tz, "u"))] + " " + Utilities.formatDate(d, tz, "yyyy-MM-dd") + " " + (h < 10 ? "0" : "") + h + ":" + Utilities.formatDate(d, tz, "mm") + " " + (hh >= 12 ? "م" : "ص");
}

function visRead_(sh) {
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, VIS_COLS).getValues().map((r, i) => ({
    row: i + 2, key: String(r[0] || ""), team: String(r[1] || ""), person: String(r[2] || ""), entryId: String(r[3] || ""),
    count: Number(r[4]) || 0, first: String(r[5] || ""), last: String(r[6] || ""), lastTs: Number(r[7]) || 0,
    secs: Number(r[8]) || 0, seen: Number(r[9]) || 0
  })).filter(x => x.key);
}

function visMember_(team, eid) {
  return readTeamsList_().filter(m => m.team === team && m.entryId === eid)[0];
}

// تسجيل دخول: لازم الشخص يكون فعلًا ضمن أعضاء التيم (من ورقة "الأعضاء")
function visit_(p) {
  const team = String(p.team || "").trim(), eid = String(p.entryId || "").trim();
  if (!team || !eid) return visFail_("اختار التيم والشخص");
  const mem = visMember_(team, eid);
  if (!mem) return visFail_("الشخص ده مش موجود في التيم");
  const n = Math.max(1, Math.min(10, Number(p.n) || 1));
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return visFail_("فيه عملية شغالة دلوقتي، جرّب كمان ثواني");
  try {
    const sh = visSheet_(), key = team + "|" + eid, now = new Date(), ts = now.getTime(), txt = visTime_(now);
    const cur = visRead_(sh).filter(x => x.key === key)[0];
    if (cur) {
      const lastActive = Math.max(cur.lastTs, cur.seen);
      if (ts - lastActive < VIS_MIN_GAP_MS) {
        sh.getRange(cur.row, 10).setValue(ts); // لسه في نفس الزيارة: بس نمدّد آخر نشاط
        return { success: true, count: cur.count, counted: false, person: cur.person };
      }
      const c = cur.count + n;
      sh.getRange(cur.row, 3).setValue(mem.person);
      sh.getRange(cur.row, 5).setValue(c);
      sh.getRange(cur.row, 7, 1, 2).setValues([[txt, ts]]);
      sh.getRange(cur.row, 10).setValue(ts);
      SpreadsheetApp.flush();
      return { success: true, count: c, counted: true, person: mem.person };
    }
    sh.appendRow([key, team, mem.person, eid, n, txt, txt, ts, 0, ts]);
    SpreadsheetApp.flush();
    return { success: true, count: n, counted: true, person: mem.person };
  } finally {
    lock.releaseLock();
  }
}

// نبضة وقت: ثواني استخدام فعلية (والتطبيق قدام الشخص). بتتزود على إجمالي الشخص.
function ping_(p) {
  const team = String(p.team || "").trim(), eid = String(p.entryId || "").trim();
  const secs = Math.max(0, Math.min(VIS_MAX_PING_SECS, Math.round(Number(p.secs) || 0)));
  if (!team || !eid) return visFail_("بيانات ناقصة");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) return visFail_("مشغول، هنعيد المحاولة");
  try {
    const sh = getTargetSpreadsheet().getSheetByName(VIS_SHEET);
    if (!sh || sh.getLastRow() < 2) return { success: true, ignored: true };
    const key = team + "|" + eid, last = sh.getLastRow();
    const keys = sh.getRange(2, 1, last - 1, 1).getValues();
    let row = 0;
    for (let i = 0; i < keys.length; i++) if (String(keys[i][0]) === key) { row = i + 2; break; }
    if (!row) return { success: true, ignored: true }; // لسه ماسجّلش دخولة
    const cell = sh.getRange(row, 9, 1, 2), v = cell.getValues()[0];
    cell.setValues([[(Number(v[0]) || 0) + secs, Date.now()]]);
    return { success: true, secs: (Number(v[0]) || 0) + secs };
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
    rows: rows.map(x => ({ team: x.team, person: x.person, entryId: x.entryId, count: x.count, last: x.last, lastTs: x.lastTs, secs: x.secs }))
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
    const v = sh.getRange(2, 1, sh.getLastRow() - 1, VIS_COLS).getValues();
    const ar = visSheet_(VIS_ARCHIVE);
    ar.getRange(ar.getLastRow() + 1, 1, v.length, VIS_COLS).setValues(v);
    sh.getRange(2, 1, sh.getLastRow() - 1, VIS_COLS).clearContent();
    SpreadsheetApp.flush();
    return { success: true, cleared: v.length, message: "اتصفّرت " + v.length + " دخولة (محفوظة في ورقة \"" + VIS_ARCHIVE + "\")" };
  } finally {
    lock.releaseLock();
  }
}
