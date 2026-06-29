/** 委員名單與預設經費列 — 與 assets/members.js 同步 */
window.EXPENSE_MEMBERS = [
  { name: '林清淇', org: '內政部宗教禮制司', title: '前司長', role: '召集委員', attendance: '出席', feeEligible: true },
  { name: '吳永猛', org: '臺灣法教會／文化大學', title: '前理事長／前副校長', role: '評核委員', attendance: '視訊', feeEligible: true },
  { name: '薄喬萍', org: '義守大學', title: '前院長', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '李樑堅', org: '義守大學', title: '前副校長', role: '評核委員', attendance: '視訊', feeEligible: true },
  { name: '鄭卜五', org: '高雄師範大學', title: '教授', role: '評核委員', attendance: '視訊', feeEligible: true },
  { name: '鄭志明', org: '輔仁大學', title: '教授', role: '評核委員', attendance: '視訊', feeEligible: true },
  { name: '陳美華', org: '台灣宗教學會', title: '前理事長', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '高超文', org: '木柵指南宮', title: '主任委員', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '鄭詠紜', org: '臺灣道法總會', title: '不分區會長', role: '評核委員', attendance: '出席', feeEligible: false, feeNote: '受補助計畫相關人員，不得支出席費（請確認）' },
  { name: '王世任', org: '承天宮', title: '興建主任委員', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '詹博雅', org: '凌霄寶殿武龍宮', title: '顧問', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '郭昭廷', org: '開封宮包公廟', title: '前主任委員', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '黃國彰', org: '中華關聖文化世界弘揚協會', title: '理事長', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '黃志華', org: '五里林護天府', title: '主任委員', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '蔡鴻祺', org: '中華世界全民念佛會', title: '會長', role: '評核委員', attendance: '出席', feeEligible: true },
  { name: '洪家祥', org: '如魚得水顧問公司', title: '總經理', role: '評核委員', attendance: '請假', feeEligible: false, feeNote: '請假不支費' },
];

/** 計畫主持人（本次會議主持） */
window.EXPENSE_HOST = {
  name: '張祐倉',
  org: '臺灣道法總會',
  title: '教育委員會主任委員',
  role: '計畫主持人',
  attendance: '出席',
};

window.DEFAULT_BUDGET_ROWS = [
  { item: '場地費', category: '業務費', unitPrice: 5000, qty: 1, unit: '式', note: '會議場地租用', feeType: 'biz' },
  { item: '會議餐費（中午包廂）', category: '業務費', unitPrice: 10000, qty: 1, unit: '式', note: '30人份用餐', feeType: 'biz' },
  { item: '工讀生（人員A）', category: '業務費', unitPrice: 200, qty: 6, unit: '小時', note: '簽到、會務、資料分發；時薪請依實際核銷', feeType: 'biz' },
  { item: '工讀生（人員B）', category: '業務費', unitPrice: 200, qty: 6, unit: '小時', note: '簽到、會務、攝影紀錄', feeType: 'biz' },
  { item: '工讀生交通費', category: '業務費', unitPrice: 150, qty: 2, unit: '人次', note: '往返交通費實報實銷', feeType: 'biz' },
  { item: '出席費', category: '業務費', unitPrice: 2500, qty: 13, unit: '人次', note: '依出席費要點，每次會議上限2,500元', feeType: 'attendance' },
  { item: '審查費', category: '業務費', unitPrice: 1830, qty: 13, unit: '件', note: '職能基準及課程架構審查文件1件/人', feeType: 'review' },
  { item: '計畫主持人費（張祐倉）', category: '主持費', unitPrice: 3000, qty: 1, unit: '式', note: '第一次評核委員會現場主持；依計畫書主持工作項目編列', feeType: 'host' },
  { item: '資料印刷費', category: '業務費', unitPrice: 50, qty: 20, unit: '本', note: '填答手冊等印製', feeType: 'biz' },
  { item: '茶水點心費', category: '業務費', unitPrice: 800, qty: 1, unit: '式', note: '會議茶點', feeType: 'biz' },
  { item: '委員交通費（遠地）', category: '業務費', unitPrice: 0, qty: 0, unit: '人次', note: '30公里以外得支交通費，實報實銷', feeType: 'biz' },
  { item: '雜支', category: '業務費', unitPrice: 500, qty: 1, unit: '式', note: '郵資、影印等', feeType: 'biz' },
];

window.DEFAULT_STAFF = [
  { name: '王芯庭', role: '會議助理／紀錄', hours: 6, hourly: 0, transport: 0, note: '計畫人員（不另支出席費）' },
  { name: '工讀生A', role: '現場簽到、會務', hours: 6, hourly: 200, transport: 150, note: '' },
  { name: '工讀生B', role: '現場簽到、會務', hours: 6, hourly: 200, transport: 150, note: '' },
];

window.STORAGE_KEY = 'meet-checkin-expenses-v1';
window.EXPENSE_SCHEMA_VERSION = 1;

window.getExpenseVersionMeta = function (data) {
  if (!data || typeof data !== 'object') {
    return { version: 0, updatedAt: null, schemaVersion: 0 };
  }
  return {
    version: Number.isFinite(data.version) ? data.version : 0,
    updatedAt: data.updatedAt || null,
    schemaVersion: Number.isFinite(data.schemaVersion) ? data.schemaVersion : 0,
  };
};

window.fmtExpenseUpdatedAt = function (iso) {
  if (!iso) return '（尚無紀錄）';
  try {
    return new Date(iso).toLocaleString('zh-TW', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch (_) {
    return iso;
  }
};

window.compareExpenseVersions = function (a, b) {
  const va = window.getExpenseVersionMeta(a);
  const vb = window.getExpenseVersionMeta(b);
  if (va.version !== vb.version) return va.version - vb.version;
  if (va.updatedAt && vb.updatedAt) {
    return new Date(va.updatedAt).getTime() - new Date(vb.updatedAt).getTime();
  }
  return 0;
};

window.fmtMoney = function (n) {
  return Math.round(n).toLocaleString('zh-TW');
};

window.eligibleCount = function () {
  return window.EXPENSE_MEMBERS.filter((m) => m.feeEligible && m.attendance !== '請假').length;
};
