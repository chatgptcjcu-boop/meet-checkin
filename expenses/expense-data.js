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

/** 結構版本（不相容時阻擋匯入）；頁面範本標記 */
window.EXPENSE_SCHEMA_VERSION = 1;
window.EXPENSE_PAGE_RELEASE = '1.0.0';
window.EXPENSE_PAGE_RELEASE_DATE = '2026-06-30';

window.fmtMoney = function (n) {
  return Math.round(n).toLocaleString('zh-TW');
};

window.eligibleCount = function () {
  return window.EXPENSE_MEMBERS.filter((m) => m.feeEligible && m.attendance !== '請假').length;
};

window.pad2 = function (n) {
  return String(n).padStart(2, '0');
};

window.formatUpdatedDateZhTW = function (d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const roc = dt.getFullYear() - 1911;
  return roc + '年' + (dt.getMonth() + 1) + '月' + dt.getDate() + '日';
};

window.formatUpdatedDateTimeZhTW = function (d) {
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  const date = window.formatUpdatedDateZhTW(dt);
  const time = window.pad2(dt.getHours()) + ':' + window.pad2(dt.getMinutes()) + ':' + window.pad2(dt.getSeconds());
  return date + ' ' + time;
};

/** 版本格式：YYYYMMDD-HHmmss-NNNN（日期＋時間＋4碼流水號） */
window.parseDataVersion = function (v) {
  const m = String(v || '').match(/^(\d{8})-(\d{6})-(\d{4})$/);
  if (!m) return null;
  return { date: m[1], time: m[2], serial: parseInt(m[3], 10) };
};

window.nextDataVersion = function (previousVersion) {
  const now = new Date();
  const date = '' + now.getFullYear() + window.pad2(now.getMonth() + 1) + window.pad2(now.getDate());
  const time = window.pad2(now.getHours()) + window.pad2(now.getMinutes()) + window.pad2(now.getSeconds());
  let serial = 1;
  const prev = window.parseDataVersion(previousVersion);
  if (prev && prev.date === date && prev.time === time) {
    serial = Math.min(9999, prev.serial + 1);
  }
  return date + '-' + time + '-' + String(serial).padStart(4, '0');
};

window.compareDataVersions = function (a, b) {
  const na = window.normalizeDataVersion(a);
  const nb = window.normalizeDataVersion(b);
  if (na < nb) return -1;
  if (na > nb) return 1;
  return 0;
};

window.normalizeDataVersion = function (v) {
  if (!v) return '';
  if (window.parseDataVersion(v)) return String(v);
  return '0-legacy-' + String(v);
};

window.enrichExpenseState = function (state, opts) {
  const now = new Date();
  const previous = opts?.previousDataVersion;
  return {
    schemaVersion: window.EXPENSE_SCHEMA_VERSION,
    dataVersion: window.nextDataVersion(previous),
    updatedAt: now.toISOString(),
    updatedDate: window.formatUpdatedDateTimeZhTW(now),
    meta: state.meta,
    rows: state.rows,
    staff: state.staff,
  };
};

window.renderExpenseVersionBar = function (containerId) {
  const el = document.getElementById(containerId || 'versionBar');
  if (!el) return;
  let text = '頁面範本 ' + window.EXPENSE_PAGE_RELEASE + '｜發布 ' + window.EXPENSE_PAGE_RELEASE_DATE;
  try {
    const saved = JSON.parse(localStorage.getItem(window.STORAGE_KEY));
    if (saved?.dataVersion) {
      text += '｜本機儲存 ' + saved.dataVersion;
    }
  } catch (_) {}
  el.textContent = text;
};

/** 判斷本機檔案或 GitHub Pages 雲端 */
window.detectExpenseEnv = function () {
  const host = location.hostname;
  const protocol = location.protocol;
  if (protocol === 'file:' || !host || host === 'localhost' || host === '127.0.0.1') return 'local';
  return 'cloud';
};

window.getExpenseEnvInfo = function () {
  const env = window.detectExpenseEnv();
  if (env === 'local') {
    return { env, label: '本機版', badge: '🖥 本機版', titlePrefix: '[本機] ', accent: '#7c3aed' };
  }
  return { env, label: '雲端版', badge: '☁ 雲端版', titlePrefix: '[雲端] ', accent: '#0f766e' };
};

window.applyExpenseEnvTheme = function () {
  const info = window.getExpenseEnvInfo();
  document.documentElement.classList.add('expense-env-' + info.env);
  document.body.classList.add('expense-env-' + info.env);

  if (!document.title.startsWith('[本機]') && !document.title.startsWith('[雲端]')) {
    document.title = info.titlePrefix + document.title;
  }

  let themeMeta = document.querySelector('meta[name="theme-color"]');
  if (!themeMeta) {
    themeMeta = document.createElement('meta');
    themeMeta.name = 'theme-color';
    document.head.appendChild(themeMeta);
  }
  themeMeta.content = info.accent;

  document.querySelectorAll('.top-bar').forEach((bar) => {
    let badge = bar.querySelector('.env-badge');
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'env-badge';
      bar.insertBefore(badge, bar.firstChild);
    }
    badge.textContent = info.badge;
    badge.title = info.env === 'local'
      ? '本機檔案／localhost（可用「☁ 儲存到雲端」寫入共用試算表）'
      : 'GitHub Pages 線上版｜「☁ 儲存到雲端」即時同步 Google 試算表';
  });

  const syncPanel = document.getElementById('syncPanel');
  if (syncPanel) {
    syncPanel.classList.add('env-panel-' + info.env);
    const envEl = document.getElementById('syncEnv');
    if (envEl) {
      envEl.textContent = '目前環境：' + info.label
        + (info.env === 'local' ? '（紫色標示）' : '（青綠色標示）')
        + '｜雲端資料存於 Google 試算表分頁 expenses';
    }
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', window.applyExpenseEnvTheme);
} else {
  window.applyExpenseEnvTheme();
}
