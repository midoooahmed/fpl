// =====================================================================
// Perm.gs - صلاحيات التبويبات (الأدمن يتحكم مين يفتح إيه: الأعضاء / الزوار برا البوابة)
// الشيت "الصلاحيات": التبويب | عضو (1/0) | زائر (1/0) | أدمن (1/0)   - اللي مش مكتوب = مفتوح للكل
// permGet (للكل) / permSave (أدمن، POST)  - بتتنادى من Api.gs
// ملحوظة: القفل من ناحية التطبيق بس (البيانات نفسها لسه بتتجاب من السيرفر).
// =====================================================================
const PERM_SHEET = "الصلاحيات";

function permSheet_() {
  const ss = getTargetSpreadsheet();
  let sh = ss.getSheetByName(PERM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(PERM_SHEET);
    sh.appendRow(["التبويب", "عضو", "زائر", "أدمن"]);
    sh.getRange(1, 1, 1, 4).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  if (String(sh.getRange(1, 4).getValue() || "") !== "أدمن") { sh.getRange(1, 4).setValue("أدمن").setFontWeight("bold"); }
  return sh;
}

function permGet_() {
  const sh = permSheet_(), perms = {};
  if (sh.getLastRow() >= 2) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 4).getValues().forEach(function (r) {
      const id = String(r[0] || "").trim();
      if (id) perms[id] = { m: Number(r[1]) === 0 ? 0 : 1, v: Number(r[2]) === 0 ? 0 : 1, a: r[3] !== "" && Number(r[3]) === 0 ? 0 : 1 };
    });
  }
  return { success: true, perms: perms };
}

function permSave_(p) {
  if (!checkAdminKey_(p.key)) return { success: false, message: "مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)" };
  let perms = p.perms;
  if (typeof perms === "string") perms = safeJson_(perms, null);
  if (!perms || typeof perms !== "object") return { success: false, message: "الصلاحيات مش مفهومة" };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return { success: false, message: "فيه عملية شغالة دلوقتي، جرّب كمان ثواني" };
  try {
    const sh = permSheet_();
    if (sh.getLastRow() >= 2) sh.getRange(2, 1, sh.getLastRow() - 1, 4).clearContent();
    const rows = Object.keys(perms).map(function (k) { return [k, Number(perms[k].m) === 0 ? 0 : 1, Number(perms[k].v) === 0 ? 0 : 1, Number(perms[k].a) === 0 ? 0 : 1]; });
    if (rows.length) sh.getRange(2, 1, rows.length, 4).setValues(rows);
    SpreadsheetApp.flush();
    return { success: true, message: "اتحفظت الصلاحيات" };
  } finally {
    lock.releaseLock();
  }
}
