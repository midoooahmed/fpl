// =====================================================================
// Tournament.gs - صانع البطولات: تخزين إعدادات البطولات (الأدمن بس يعمل/يعدّل/يمسح، والكل يشوف)
//
// الشيت (بيتعمل تلقائيًا في نفس ملف الشيت بتاع التطبيق):
//   "البطولات" : Id | الاسم | الإعدادات (JSON) | آخر تعديل | Ts
//
// النتايج والترتيب والجداول مابتتخزنش هنا: التطبيق بيحسبها تلقائيًا من نقاط الجولات (نفس أرقام إحصائيات الموسم)،
// فأي جولة بتخلص النتايج بتتحدّث لوحدها. هنا بنخزّن بس "إزاي البطولة متظبّطة" (المشاركين، المراحل، القرعة، التعديلات).
//
// بتتنادى من Api.gs:  tmList / tmCheck&key / tmSave (POST) / tmDelete&key&id
// ⚠️ tmSave بيجي POST علشان الإعدادات كبيرة (لازم Router.gs الجديد فيه doPost) - بعد الإضافة: New version -> Deploy
// =====================================================================
const TM_SHEET = "البطولات";
const TM_HEADER = ["Id", "الاسم", "الإعدادات (JSON)", "آخر تعديل", "Ts"];
const TM_MAX_JSON = 45000; // حد الخلية الواحدة في جوجل شيت ٥٠ ألف حرف

function tmFail_(msg) { return { success: false, message: msg }; }

function tmSheet_() {
  const ss = getTargetSpreadsheet();
  let sh = ss.getSheetByName(TM_SHEET);
  if (!sh) {
    sh = ss.insertSheet(TM_SHEET);
    sh.appendRow(TM_HEADER);
    sh.getRange(1, 1, 1, TM_HEADER.length).setFontWeight("bold");
    sh.setFrozenRows(1);
  }
  return sh;
}

function tmRows_() {
  const sh = tmSheet_();
  if (sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 5).getValues().map((r, i) => ({
    row: i + 2, id: String(r[0] || ""), name: String(r[1] || ""), json: String(r[2] || ""), updated: String(r[3] || ""), ts: Number(r[4]) || 0
  })).filter(x => x.id);
}

function tmList_() {
  const items = tmRows_().map(x => ({ id: x.id, name: x.name, updated: x.ts, cfg: safeJson_(x.json, null) })).filter(x => x.cfg);
  return { success: true, now: Date.now(), items: items };
}

function tmCheck_(p) {
  return checkAdminKey_(p.key) ? { success: true } : tmFail_("مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)");
}

// حفظ بطولة (جديدة لو مفيش id، أو تعديل). p.cfg = كائن الإعدادات (أو نص JSON)
function tmSave_(p) {
  if (!checkAdminKey_(p.key)) return tmFail_("مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)");
  let cfg = p.cfg;
  if (typeof cfg === "string") cfg = safeJson_(cfg, null);
  if (!cfg || typeof cfg !== "object") return tmFail_("إعدادات البطولة مش مفهومة");
  const name = String(cfg.name || "").trim();
  if (!name) return tmFail_("اكتب اسم البطولة");
  if (!cfg.players || cfg.players.length < 2) return tmFail_("اختار متسابقين اتنين على الأقل");
  if (!cfg.stages || !cfg.stages.length) return tmFail_("ضيف مرحلة واحدة على الأقل");
  const json = JSON.stringify(cfg);
  if (json.length > TM_MAX_JSON) return tmFail_("البطولة كبيرة أوي على خلية الشيت (" + json.length + " حرف). قلّل المشاركين أو التعديلات.");
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return tmFail_("فيه عملية شغالة دلوقتي، جرّب كمان ثواني");
  try {
    const sh = tmSheet_(), now = new Date(), ts = now.getTime(), txt = visTime_(now);
    const id = String(p.id || "").trim();
    const cur = id ? tmRows_().filter(x => x.id === id)[0] : null;
    if (cur) {
      sh.getRange(cur.row, 2, 1, 4).setValues([[name, json, txt, ts]]);
      SpreadsheetApp.flush();
      return { success: true, id: id, updated: ts, message: "اتحفظت التعديلات" };
    }
    const nid = "t" + ts.toString(36) + Math.floor(Math.random() * 1296).toString(36);
    sh.appendRow([nid, name, json, txt, ts]);
    SpreadsheetApp.flush();
    return { success: true, id: nid, updated: ts, message: "اتعملت البطولة" };
  } finally {
    lock.releaseLock();
  }
}

function tmDelete_(p) {
  if (!checkAdminKey_(p.key)) return tmFail_("مفتاح الأدمن غلط أو مش متضبط (ADMIN_KEY)");
  const id = String(p.id || "").trim();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) return tmFail_("فيه عملية شغالة دلوقتي، جرّب كمان ثواني");
  try {
    const cur = tmRows_().filter(x => x.id === id)[0];
    if (!cur) return tmFail_("البطولة مش موجودة");
    tmSheet_().deleteRow(cur.row);
    SpreadsheetApp.flush();
    return { success: true, message: "اتمسحت البطولة" };
  } finally {
    lock.releaseLock();
  }
}
