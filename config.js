// عدّل القيم دي بس (من Deploy > Manage deployments في Apps Script). الرابط لازم ينتهي بـ /exec
window.CFG = {
  API: "https://script.google.com/macros/s/AKfycbzI1EDiai-cHlBhfwOloN_NXS1azAPP4oMIk16jvk8fD2z1QL4gxVTXYP7ji2A6BvdN/exec?page=stats&skin=1&mode=light",        // رابط تطبيق Apps Script (نفس رابط الإحصائيات والمقارنة)
  TABS: [         // تبويبات إضافية بتتفتح جوه التطبيق (مقارنة نوع 1، نوع 2...)
    // { id: "gof", name: "مقارنة بطولة GOF", sub: "نوع 1", url: "https://script.google.com/macros/s/.../exec?page=gof" }
  ]
};
