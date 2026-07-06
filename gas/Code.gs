/**
 * meet-checkin 完整後端
 *
 * 部署 Web App（每次改程式都要做）：
 *   部署 → 管理部署 → 編輯 → 版本「新版本」→ 部署
 *   執行身分：我 ｜ 存取權：任何人（含匿名）
 *
 * 試算表 → 擴充功能 → Apps Script 貼上此檔（勿用獨立「未命名專案」）
 *
 * ── 架構說明 ──
 * • 填答-正文 / 填答-附錄 → handleFormSubmit（視訊委員職能填答，勿異動）
 * • 730-instructor        → handleInstructorWorksheet（730 講師學習單，分頁 instructor-730）
 * • icap-report-worksheet → handleReportWizardWorksheet（報告書精靈講師學習單，分頁 icap-report-worksheet）
 * • unit-claim-matrix     → handleUnitClaimMatrix（86 單元認領矩陣，分頁 unit-claim-matrix，以單元碼 upsert）
 *                           讀取：doGet ?action=unit-claim-matrix 回傳目前全部單元 JSON
 * • expenses              → handleExpenses（經費編列整份 JSON，分頁 expenses，每次儲存新增一版）
 *                           讀取：doGet ?action=expenses 回傳最新一版的資料 JSON
 * • expense-finance       → handleExpenseFinance（核銷總帳／人員／出帳／動支規劃 JSON，分頁 expense-finance）
 *                           讀取：doGet ?action=expense-finance 回傳最新一版
 * • expense-entry-submission
 *                         → 工讀生支出送審，分頁 expense-entry-submissions，並寄信通知主辦
 *                           讀取：doGet ?action=expense-entry-submissions 回傳送審清單
 * • expense-person-profile → 委員／工作人員以人員ID＋登入碼維護 Email 與收款帳戶
 * • expense-transfer-notify→ 撥款後寄送 Email 通知收款人並留通知紀錄
 * • roster-admin          → handleRosterAdmin（出席名單群組／成員 CRUD＋批次貼上）
 *                           讀取：doGet ?action=roster 回傳全部群組＋成員 JSON
 * • 簽到 / 簽退           → handleSignInOut（驗證簽到＋試算表＋Drive＋寄信通知）
 *
 * ⚠️ 每次修改本檔後必須重新部署 Web App：
 *   部署 → 管理部署 → 編輯 → 版本「新版本」→ 部署
 */

var SPREADSHEET_ID = '1gqA0iv17jE4FKEzUKVh5ngKnd57mU12RW0-md1fTjSo';
// 留空 = 使用「試算表 → 擴充功能 → Apps Script」綁定的這張表（建議）
// 若需手動指定，請從試算表網址 /d/ 與 /edit 之間完整複製，例如：
// 1gqA0iv17jE4FKEzUKVh5ngKnd57mU12RW0-md1fTjSo  ← 注意 Z/z 大小寫

function getSpreadsheet_() {
  /* 綁定試算表的腳本：優先用 ActiveSpreadsheet（免填 ID） */
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) {
    return ss;
  }
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  throw new Error(
    '找不到試算表。請從試算表開啟 Apps Script（擴充功能），或設定正確的 SPREADSHEET_ID'
  );
}

var SIGN_SHEET_NAME = '工作表1';
var FORM_SHEET_NAME = '填答紀錄';
/** 730 教材編審 Demo 講師學習單專用分頁（英文 tab 名，避免 Sheets 編碼問題） */
var INSTRUCTOR_SHEET_NAME = 'instructor-730';
/** iCAP 報告書格式精靈講師學習單（備援訓練模組） */
var REPORT_WIZARD_SHEET_NAME = 'icap-report-worksheet';
/** 86 單元認領矩陣分頁（英文 tab 名；以單元碼為主鍵 upsert，last-write-wins） */
var UNIT_CLAIM_SHEET_NAME = 'unit-claim-matrix';
/** 經費編列表分頁（英文 tab 名；整份經費 JSON 每次儲存新增一版，保留歷史） */
var EXPENSE_SHEET_NAME = 'expenses';
/** 核銷總帳分頁（ledger／personnel／transfers／plans／entries 整包 JSON） */
var EXPENSE_FINANCE_SHEET_NAME = 'expense-finance';
/** 工讀生支出送審分頁（送出後先通知主辦，確認後才匯入 expense-finance） */
var EXPENSE_ENTRY_SUBMISSIONS_SHEET_NAME = 'expense-entry-submissions';
/** 出席名單群組／成員分頁（英文 tab 名；memberId 為跨群組連動刪改的主鍵） */
var ROSTER_GROUPS_SHEET_NAME = 'roster-groups';
var ROSTER_MEMBERS_SHEET_NAME = 'roster-members';

/** expenses 分頁欄位順序（單一結構化文件；每列一個版本，最後一列為最新） */
var EXPENSE_HEADERS = ['更新時間', '版本', '更新者', '資料JSON'];
/** expense-finance 分頁欄位（與 expenses 相同版本化模式） */
var EXPENSE_FINANCE_HEADERS = ['更新時間', '版本', '更新者', '資料JSON'];
/** expense-entry-submissions 分頁欄位 */
var EXPENSE_ENTRY_SUBMISSION_HEADERS = [
  'submissionId', '提交時間', '登錄人ID', '登錄人', '日期', '類別', '金額',
  '說明', '會議ID', '狀態', '匯入時間', '資料JSON', '頁面URL'
];

/** roster-groups 分頁欄位（groupId 為活動 preset rosterGroupIds 引用的穩定 ID） */
var ROSTER_GROUP_HEADERS = ['groupId', 'name', 'committee', 'rosterKind', 'sortOrder', 'description'];

/** roster-members 分頁欄位（memberId 跨群組連動；同一人在多群組可共用 memberId） */
var ROSTER_MEMBER_HEADERS = ['memberId', 'groupId', 'name', 'org', 'title', 'role', 'attendance', 'sortOrder'];

/** unit-claim-matrix 分頁欄位順序（與前端 units 物件鍵名對應） */
var UNIT_CLAIM_HEADERS = [
  '單元碼', '單元名稱', '模組', '主筆', '協作', '審查', '狀態', '更新時間', '更新者'
];

/** instructor-730 分頁欄位順序（與前端 fields 物件鍵名一致） */
var INSTRUCTOR_FIELD_KEYS = [
  '講師姓名', '服務單位宮廟', '示範單元', '活動日期', '職稱', '聯絡電話', 'Email', '出席方式',
  '編審經驗', 'Demo目的理解', '壹章簽名日期',
  '緒論導入', '核心概念', '案例故事', '演練活動', '總結',
  '步驟1', '步驟2', '步驟3', '步驟4', '步驟5', '步驟6',
  '最難教段落',
  'ABCD_A', 'ABCD_B', 'ABCD_C', 'ABCD_D', 'B欄可評量', '修訂說明',
  '教學方式', '時間比例', '學習單設計', '學習單產出',
  '選擇題1', '選擇題2', '簡答題1', '勾選建檔',
  'Rubrics達標描述', 'Rubrics達標分數', 'Rubrics待加強描述', 'Rubrics待加強分數',
  '流程理解', '協作平台', '陸章簽名日期'
];

/** icap-report-worksheet 分頁欄位順序（與前端 fields 物件鍵名一致） */
var REPORT_WIZARD_FIELD_KEYS = [
  '講師姓名', '服務單位', '課程名稱',
  '訓練需求', '課程簡介', '課程目的',
  '課程時數', '職能級別', '主要對象', '先備條件',
  '表1_職能任務', '表1_行為指標P', '表1_知識技能',
  '表2_課程地圖',
  '表3_A對象', '表3_B行為', '表3_C條件', '表3_D標準', '表3_對應職能',
  '表4_單元內容', '表5_教學方法',
  '表6_教材資源', '表7_師資安排', '表8_評量方式',
  '表9_執行人員', '表10_試辦成果', '表11_學習證據', '表12_結訓標準',
  '填寫章節', '簽名日期'
];

/** 與簽到試算表第 1 列標題一致（第 5 欄可核對截圖是否上傳） */
var SIGN_HEADERS = ['報到時間', '姓名', '身份別', '錄影授權', '截圖連結'];

/* ═══════════════════════════════════════════════════════════════
 * 簽到驗證 — 寄信通知（新增，不影響填答）
 * ═══════════════════════════════════════════════════════════════ */
var NOTIFY_EMAIL = 'chatgpt.cjcu@gmail.com';
var MEETING_TITLE = '2026宮廟管理師會議';

function doPost(e) {
  try {
    var data = parsePostData_(e);
    var action = data.action || '';

    if (action === '填答-正文' || action === '填答-附錄') {
      return handleFormSubmit(data);
    }
    if (action === '730-instructor') {
      return handleInstructorWorksheet(data);
    }
    if (action === 'icap-report-worksheet') {
      return handleReportWizardWorksheet(data);
    }
    if (action === 'unit-claim-matrix') {
      return handleUnitClaimMatrix(data);
    }
    if (action === 'expenses') {
      return handleExpenses(data);
    }
    if (action === 'expense-finance') {
      return handleExpenseFinance(data);
    }
    if (action === 'expense-entry-submission') {
      return handleExpenseEntrySubmission(data);
    }
    if (action === 'expense-person-profile') {
      return handleExpensePersonProfile(data);
    }
    if (action === 'expense-transfer-notify') {
      return handleExpenseTransferNotify(data);
    }
    if (action === 'roster-admin') {
      return handleRosterAdmin(data);
    }
    if (action === '簽到' || action === '簽退') {
      return handleSignInOut(data);
    }
    return jsonOut({ ok: false, error: '未知 action: ' + action });
  } catch (err) {
    return jsonOut({ ok: false, error: String(err.message || err) });
  }
}

/** 支援 fetch/sendBeacon（postData）與 hidden form（parameter.payload） */
function parsePostData_(e) {
  if (!e) {
    throw new Error('缺少事件物件');
  }
  if (e.postData && e.postData.contents) {
    return JSON.parse(e.postData.contents);
  }
  if (e.parameter && e.parameter.payload) {
    return JSON.parse(e.parameter.payload);
  }
  throw new Error('缺少 postData.contents 或 parameter.payload');
}

function handleSignInOut(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateSignSheet_(ss);
  var timeStr = formatTaiwanTime_(data.timestamp);

  sheet.appendRow([
    timeStr,
    data.name || '',
    data.role || '',
    data.consent ? '已同意' : '未同意',
    ''
  ]);
  var rowNum = sheet.getLastRow();

  var attachBlob = null;
  var imageUrl = '';
  var imgData = data.image || data.photo || '';

  if (imgData) {
    try {
      var saved = saveSignImage_(imgData);
      if (saved) {
        imageUrl = saved.url;
        attachBlob = saved.blob;
        sheet.getRange(rowNum, 5).setValue(imageUrl);
      } else {
        sheet.getRange(rowNum, 5).setValue('解碼失敗' + (data.imageLen ? '(' + data.imageLen + ')' : ''));
        Logger.log('簽到截圖解碼失敗: ' + (data.name || '') + ' len=' + (data.imageLen || 0));
      }
    } catch (imgErr) {
      sheet.getRange(rowNum, 5).setValue('上傳失敗');
      Logger.log('簽到截圖失敗: ' + imgErr);
    }
  } else {
    var hint = '無截圖';
    if (data.imageLen) {
      hint += '(' + data.imageLen + '字元)';
    }
    sheet.getRange(rowNum, 5).setValue(hint);
    Logger.log('簽到無截圖資料: ' + (data.name || '') + ' imageLen=' + (data.imageLen || 0));
  }

  try {
    sendSignEmail_(data, timeStr, attachBlob, imageUrl);
  } catch (mailErr) {
    Logger.log('寄信含附件失敗，改寄純文字: ' + mailErr);
    try {
      sendSignEmail_(data, timeStr, null, imageUrl);
    } catch (mailErr2) {
      Logger.log('寄信失敗: ' + mailErr2);
    }
  }

  return jsonOut({ ok: true });
}

/* ═══════════════════════════════════════════════════════════════
 * 視訊委員填答 — 以下區塊維持原架構，勿異動
 * ═══════════════════════════════════════════════════════════════ */

function handleFormSubmit(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(FORM_SHEET_NAME) || ss.insertSheet(FORM_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '提交時間', '動作', '姓名', '身份', '答題數',
      '結構化答案(JSON)', '頁面URL', '截圖連結'
    ]);
  }

  sheet.appendRow([
    formatTaiwanTime_(data.timestamp),
    data.action || '',
    data.name || '',
    data.role || '',
    data.answerCount || (data.answers ? data.answers.length : 0),
    JSON.stringify(data.answers || []),
    data.pageUrl || '',
    ''
  ]);

  if (data.image) {
    try {
      var imageUrl = saveImageToDrive_(
        data.image,
        (data.name || 'unknown') + '_' + (data.formType || data.action)
      );
      if (imageUrl) {
        sheet.getRange(sheet.getLastRow(), 8).setValue(imageUrl);
      }
    } catch (imgErr) {
      Logger.log('填答截圖失敗（列已寫入）: ' + imgErr);
    }
  }

  return jsonOut({ ok: true });
}

/* ═══════════════════════════════════════════════════════════════
 * 730 講師學習單 — instructor-730 分頁（扁平欄位 + JSON 備份）
 * action / formType: 730-instructor
 * ⚠️ 修改後請重新部署 Web App（見檔案頂部說明）
 * ═══════════════════════════════════════════════════════════════ */

function handleInstructorWorksheet(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(INSTRUCTOR_SHEET_NAME) || ss.insertSheet(INSTRUCTOR_SHEET_NAME);
  var fields = data.fields || {};

  if (sheet.getLastRow() === 0) {
    var headers = ['提交時間', '身份'].concat(INSTRUCTOR_FIELD_KEYS, ['頁面URL', '結構化答案JSON']);
    sheet.appendRow(headers);
  }

  var row = [
    formatTaiwanTime_(data.timestamp),
    data.role || '講師'
  ];

  for (var i = 0; i < INSTRUCTOR_FIELD_KEYS.length; i++) {
    var key = INSTRUCTOR_FIELD_KEYS[i];
    row.push(fields[key] != null ? String(fields[key]) : '');
  }

  row.push(data.pageUrl || '');
  row.push(JSON.stringify(data.answers || []));

  sheet.appendRow(row);
  return jsonOut({ ok: true });
}

/* ═══════════════════════════════════════════════════════════════
 * iCAP 報告書格式精靈講師學習單 — icap-report-worksheet 分頁
 * action / formType: icap-report-worksheet
 * ⚠️ 修改後請重新部署 Web App（見檔案頂部說明）
 * ═══════════════════════════════════════════════════════════════ */

function handleReportWizardWorksheet(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(REPORT_WIZARD_SHEET_NAME) || ss.insertSheet(REPORT_WIZARD_SHEET_NAME);
  var fields = data.fields || {};

  if (sheet.getLastRow() === 0) {
    var headers = ['提交時間', '身份'].concat(REPORT_WIZARD_FIELD_KEYS, ['頁面URL', '結構化答案JSON']);
    sheet.appendRow(headers);
  }

  var row = [
    formatTaiwanTime_(data.timestamp),
    data.role || '講師'
  ];

  for (var i = 0; i < REPORT_WIZARD_FIELD_KEYS.length; i++) {
    var key = REPORT_WIZARD_FIELD_KEYS[i];
    row.push(fields[key] != null ? String(fields[key]) : '');
  }

  row.push(data.pageUrl || '');
  row.push(JSON.stringify(data.answers || []));

  sheet.appendRow(row);
  return jsonOut({ ok: true });
}

/* ═══════════════════════════════════════════════════════════════
 * 86 單元認領矩陣 — unit-claim-matrix 分頁（以「單元碼」為主鍵 upsert）
 * action: unit-claim-matrix
 * • 前端一次送出全部單元狀態（data.units 陣列）
 * • 已存在單元碼 → 覆寫該列；不存在 → 新增列（last-write-wins）
 * • 讀取請走 doGet(?action=unit-claim-matrix)
 * ⚠️ 修改後請重新部署 Web App（見檔案頂部說明）
 * ═══════════════════════════════════════════════════════════════ */

function handleUnitClaimMatrix(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(UNIT_CLAIM_SHEET_NAME) || ss.insertSheet(UNIT_CLAIM_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(UNIT_CLAIM_HEADERS);
  }

  var units = data.units || [];
  var updater = data.name || '';
  var timeStr = formatTaiwanTime_(data.timestamp);

  // 建立「單元碼 → 列號」對照，達成 upsert
  var codeToRow = {};
  var lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    var codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < codes.length; i++) {
      codeToRow[String(codes[i][0])] = i + 2;
    }
  }

  var updated = 0;
  var appended = 0;
  for (var j = 0; j < units.length; j++) {
    var u = units[j] || {};
    var row = [
      u.code || '',
      u.title || '',
      u.module || '',
      u.lead || '',
      u.collab || '',
      u.review || '',
      u.status || '',
      timeStr,
      updater
    ];
    var existingRow = codeToRow[String(u.code)];
    if (existingRow) {
      sheet.getRange(existingRow, 1, 1, row.length).setValues([row]);
      updated++;
    } else {
      sheet.appendRow(row);
      codeToRow[String(u.code)] = sheet.getLastRow();
      appended++;
    }
  }

  return jsonOut({ ok: true, updated: updated, appended: appended, total: units.length });
}

/** doGet 讀取目前 unit-claim-matrix 全部單元（供前端「同步最新」載入） */
function getUnitClaimMatrix_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(UNIT_CLAIM_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, units: [] });
  }
  var values = sheet.getRange(2, 1, sheet.getLastRow() - 1, UNIT_CLAIM_HEADERS.length).getValues();
  var units = values.map(function (r) {
    return {
      code: r[0],
      title: r[1],
      module: r[2],
      lead: r[3],
      collab: r[4],
      review: r[5],
      status: r[6],
      updatedAt: r[7],
      updatedBy: r[8]
    };
  });
  return jsonOut({ ok: true, units: units });
}

/* ═══════════════════════════════════════════════════════════════
 * 經費編列表 — expenses 分頁（整份結構化 JSON 文件，每次儲存新增一版）
 * action: expenses
 * • 前端一次送出整份經費狀態（data.state：meta＋rows＋staff＋版本）
 * • 每次儲存「新增一列」保留歷史（審計軌跡），不覆寫舊版
 * • 讀取請走 doGet(?action=expenses) → 回傳最後一列（最新版）的資料 JSON
 * ⚠️ 修改後請重新部署 Web App（見檔案頂部說明）
 * ═══════════════════════════════════════════════════════════════ */

function handleExpenses(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_SHEET_NAME) || ss.insertSheet(EXPENSE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EXPENSE_HEADERS);
  }

  var state = data.state || {};
  var version = data.version || (state && state.dataVersion) || '';
  var updater = data.name || '';

  sheet.appendRow([
    formatTaiwanTime_(data.timestamp),
    version,
    updater,
    JSON.stringify(state)
  ]);

  return jsonOut({ ok: true, version: version, rows: sheet.getLastRow() - 1 });
}

/** doGet 讀取 expenses 最新一版（最後一列）的資料 JSON（供前端「同步最新」載入） */
function getExpenses_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, state: null });
  }
  var lastRow = sheet.getLastRow();
  var row = sheet.getRange(lastRow, 1, 1, EXPENSE_HEADERS.length).getValues()[0];
  var state = null;
  try {
    state = row[3] ? JSON.parse(row[3]) : null;
  } catch (e) {
    state = null;
  }
  return jsonOut({
    ok: true,
    updatedAt: row[0],
    version: row[1],
    updatedBy: row[2],
    state: state
  });
}

function handleExpenseFinance(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_FINANCE_SHEET_NAME) || ss.insertSheet(EXPENSE_FINANCE_SHEET_NAME);

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EXPENSE_FINANCE_HEADERS);
  }

  var state = data.state || {};
  var version = data.version || (state && state.dataVersion) || '';
  var updater = data.name || '';

  sheet.appendRow([
    formatTaiwanTime_(data.timestamp),
    version,
    updater,
    JSON.stringify(state)
  ]);

  return jsonOut({ ok: true, version: version, rows: sheet.getLastRow() - 1 });
}

function getExpenseFinance_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_FINANCE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, state: null });
  }
  var lastRow = sheet.getLastRow();
  var row = sheet.getRange(lastRow, 1, 1, EXPENSE_FINANCE_HEADERS.length).getValues()[0];
  var state = null;
  try {
    state = row[3] ? JSON.parse(row[3]) : null;
  } catch (e) {
    state = null;
  }
  return jsonOut({
    ok: true,
    updatedAt: row[0],
    version: row[1],
    updatedBy: row[2],
    state: state
  });
}

function getLatestExpenseFinanceState_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_FINANCE_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return { state: null, row: null };
  }
  var row = sheet.getRange(sheet.getLastRow(), 1, 1, EXPENSE_FINANCE_HEADERS.length).getValues()[0];
  var state = null;
  try {
    state = row[3] ? JSON.parse(row[3]) : null;
  } catch (e) {
    state = null;
  }
  return { state: state, row: row };
}

function appendExpenseFinanceState_(state, updater) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_FINANCE_SHEET_NAME) || ss.insertSheet(EXPENSE_FINANCE_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EXPENSE_FINANCE_HEADERS);
  }
  var version = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  state.dataVersion = version;
  state.updatedAt = new Date().toISOString();
  sheet.appendRow([
    formatTaiwanTime_(new Date().toISOString()),
    version,
    updater || '',
    JSON.stringify(state)
  ]);
  return version;
}

function findExpensePerson_(state, personId) {
  var people = state && state.personnel ? state.personnel : [];
  for (var i = 0; i < people.length; i++) {
    if (people[i].id === personId) return people[i];
  }
  return null;
}

function publicExpensePerson_(person) {
  return {
    id: person.id || '',
    name: person.name || '',
    role: person.role || '',
    email: person.email || '',
    bank: person.bank || '',
    account: person.account || '',
    note: person.note || '',
    notifyPayment: person.notifyPayment !== false,
    profileUpdatedAt: person.profileUpdatedAt || ''
  };
}

function getExpensePersonProfile_(e) {
  var personId = e && e.parameter ? (e.parameter.personId || '') : '';
  var accessCode = e && e.parameter ? (e.parameter.accessCode || '') : '';
  var latest = getLatestExpenseFinanceState_();
  var person = findExpensePerson_(latest.state, personId);
  if (!person || !person.accessCode || person.accessCode !== accessCode) {
    return jsonOut({ ok: false, error: '人員ID或登入碼錯誤' });
  }
  return jsonOut({ ok: true, person: publicExpensePerson_(person) });
}

function handleExpensePersonProfile(data) {
  var personId = data.personId || '';
  var accessCode = data.accessCode || '';
  var profile = data.profile || {};
  var latest = getLatestExpenseFinanceState_();
  var state = latest.state;
  var person = findExpensePerson_(state, personId);
  if (!person || !person.accessCode || person.accessCode !== accessCode) {
    return jsonOut({ ok: false, error: '人員ID或登入碼錯誤' });
  }

  person.email = profile.email || '';
  person.bank = profile.bank || '';
  person.account = profile.account || '';
  person.note = profile.note || person.note || '';
  person.notifyPayment = profile.notifyPayment !== false;
  person.profileUpdatedAt = new Date().toISOString();

  var version = appendExpenseFinanceState_(state, '個人資料維護：' + (person.name || person.id));
  return jsonOut({ ok: true, version: version, person: publicExpensePerson_(person) });
}

function handleExpenseTransferNotify(data) {
  var transfer = data.transfer || {};
  var person = data.person || {};
  var email = person.email || '';
  if (!email) {
    return jsonOut({ ok: false, error: '收款人尚未設定 Email' });
  }
  if (person.notifyPayment === false) {
    return jsonOut({ ok: false, error: '收款人未啟用撥款通知' });
  }
  sendExpenseTransferEmail_(transfer, person, formatTaiwanTime_(data.timestamp));
  return jsonOut({ ok: true });
}

function handleExpenseEntrySubmission(data) {
  var op = data.operation || 'submit';
  if (op === 'markImported') {
    return markExpenseEntrySubmission_(data);
  }
  return createExpenseEntrySubmission_(data);
}

function getOrCreateExpenseEntrySubmissionsSheet_(ss) {
  var sheet = ss.getSheetByName(EXPENSE_ENTRY_SUBMISSIONS_SHEET_NAME) || ss.insertSheet(EXPENSE_ENTRY_SUBMISSIONS_SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(EXPENSE_ENTRY_SUBMISSION_HEADERS);
  }
  return sheet;
}

function createExpenseEntrySubmission_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateExpenseEntrySubmissionsSheet_(ss);
  var submission = data.submission || {};
  var submissionId = submission.id || data.submissionId || ('sub-' + new Date().getTime());
  var timeStr = formatTaiwanTime_(data.timestamp);

  sheet.appendRow([
    submissionId,
    timeStr,
    submission.personId || '',
    submission.submitter || '',
    submission.date || '',
    submission.category || '',
    Number(submission.amount) || 0,
    submission.note || '',
    submission.eventId || '',
    '待匯入',
    '',
    JSON.stringify(submission),
    data.pageUrl || ''
  ]);

  try {
    sendExpenseEntrySubmissionEmail_(submission, timeStr, data.pageUrl || '');
  } catch (mailErr) {
    Logger.log('工讀生支出送審通知信失敗: ' + mailErr);
  }

  return jsonOut({ ok: true, submissionId: submissionId, rows: sheet.getLastRow() - 1 });
}

function getExpenseEntrySubmissions_() {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(EXPENSE_ENTRY_SUBMISSIONS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, submissions: [] });
  }

  var rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, EXPENSE_ENTRY_SUBMISSION_HEADERS.length).getValues();
  var submissions = rows.map(function (r) {
    var payload = {};
    try {
      payload = r[11] ? JSON.parse(r[11]) : {};
    } catch (e) {
      payload = {};
    }
    return {
      id: r[0],
      submittedAt: r[1],
      personId: r[2],
      submitter: r[3],
      date: r[4],
      category: r[5],
      amount: Number(r[6]) || 0,
      note: r[7],
      eventId: r[8],
      status: r[9] || '待匯入',
      importedAt: r[10],
      pageUrl: r[12],
      payload: payload
    };
  });

  return jsonOut({ ok: true, submissions: submissions });
}

function markExpenseEntrySubmission_(data) {
  var submissionId = data.submissionId || '';
  if (!submissionId) {
    return jsonOut({ ok: false, error: '缺少 submissionId' });
  }

  var ss = getSpreadsheet_();
  var sheet = getOrCreateExpenseEntrySubmissionsSheet_(ss);
  if (sheet.getLastRow() < 2) {
    return jsonOut({ ok: false, error: '找不到送審資料' });
  }

  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (ids[i][0] === submissionId) {
      var rowNum = i + 2;
      sheet.getRange(rowNum, 10).setValue(data.status || '已匯入');
      sheet.getRange(rowNum, 11).setValue(formatTaiwanTime_(data.timestamp));
      return jsonOut({ ok: true, submissionId: submissionId });
    }
  }

  return jsonOut({ ok: false, error: '找不到送審資料：' + submissionId });
}

/* ═══════════════════════════════════════════════════════════════
 * 出席名單管理 — roster-groups / roster-members 分頁
 * action: roster-admin（POST）｜doGet ?action=roster（讀取全部）
 * • 群組 CRUD、成員 CRUD、批次貼上匯入
 * • memberId 為跨群組連動主鍵：刪除／更新會同步所有引用列
 * • 活動 preset 以 rosterGroupIds 引用 groupId，簽到頁 GET 合併名單
 * ⚠️ 修改後請重新部署 Web App（見檔案頂部說明）
 * ═══════════════════════════════════════════════════════════════ */

function handleRosterAdmin(data) {
  var op = data.operation || '';
  if (op === 'createGroup') return rosterCreateGroup_(data);
  if (op === 'updateGroup') return rosterUpdateGroup_(data);
  if (op === 'deleteGroup') return rosterDeleteGroup_(data);
  if (op === 'createMember') return rosterCreateMember_(data);
  if (op === 'updateMember') return rosterUpdateMember_(data);
  if (op === 'deleteMember') return rosterDeleteMember_(data);
  if (op === 'bulkImport') return rosterBulkImport_(data);
  if (op === 'linkMember') return rosterLinkMember_(data);
  if (op === 'seed') return rosterSeedInitial_(data);
  if (op === 'normalizeMemberIds') return rosterNormalizeMemberIds_(data);
  return jsonOut({ ok: false, error: '未知 roster operation: ' + op });
}

function getOrCreateRosterGroupsSheet_(ss) {
  var sheet = ss.getSheetByName(ROSTER_GROUPS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_GROUPS_SHEET_NAME);
    sheet.appendRow(ROSTER_GROUP_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(ROSTER_GROUP_HEADERS);
  }
  return sheet;
}

function getOrCreateRosterMembersSheet_(ss) {
  var sheet = ss.getSheetByName(ROSTER_MEMBERS_SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(ROSTER_MEMBERS_SHEET_NAME);
    sheet.appendRow(ROSTER_MEMBER_HEADERS);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(ROSTER_MEMBER_HEADERS);
  }
  return sheet;
}

function rosterUuid_() {
  return Utilities.getUuid();
}

function rosterNormalizeName_(name) {
  return String(name || '').replace(/\s/g, '').trim();
}

function rosterIsUuid_(id) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(id || ''));
}

/** 群組 memberId 前綴，例：1150730-editorial-observers → 730o */
function rosterMemberIdPrefix_(groupId) {
  var known = {
    '1150730-editorial-committee': '730c',
    '1150730-editorial-observers': '730o',
    '1150630-evaluation-committee': '630c',
    '1150630-evaluation-observers': '630o'
  };
  if (known[groupId]) return known[groupId];
  var g = String(groupId || '');
  var dateMatch = g.match(/(\d{6})/);
  var short = dateMatch ? dateMatch[1].slice(1) : g.replace(/[^a-z0-9]/gi, '').slice(0, 4);
  var kind = g.indexOf('observers') >= 0 ? 'o' : 'c';
  return (short || 'mbr') + kind;
}

function rosterMaxSeqForPrefix_(sheet, prefix, extraIds) {
  var max = 0;
  var re = new RegExp('^' + String(prefix).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '-(\\d+)$');
  if (sheet && sheet.getLastRow() >= 2) {
    var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    for (var i = 0; i < vals.length; i++) {
      var m = String(vals[i][0]).match(re);
      if (m) {
        var n = parseInt(m[1], 10);
        if (n > max) max = n;
      }
    }
  }
  if (extraIds) {
    extraIds.forEach(function (id) {
      var m2 = String(id).match(re);
      if (m2) {
        var n2 = parseInt(m2[1], 10);
        if (n2 > max) max = n2;
      }
    });
  }
  return max;
}

function rosterNextSequentialMemberId_(sheet, groupId, reservedIds) {
  var prefix = rosterMemberIdPrefix_(groupId);
  var next = rosterMaxSeqForPrefix_(sheet, prefix, reservedIds) + 1;
  var id = prefix + '-' + String(next).padStart(3, '0');
  if (reservedIds) reservedIds.push(id);
  return id;
}

function rosterFindMemberIdByName_(sheet, name) {
  if (!sheet || sheet.getLastRow() < 2) return '';
  var target = rosterNormalizeName_(name);
  if (!target) return '';
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).getValues();
  var fallback = '';
  for (var i = 0; i < vals.length; i++) {
    if (rosterNormalizeName_(vals[i][2]) !== target) continue;
    var id = String(vals[i][0] || '');
    if (!id) continue;
    if (!rosterIsUuid_(id)) return id;
    if (!fallback) fallback = id;
  }
  return fallback;
}

function rosterResolveMemberId_(sheet, groupId, name, explicitId, reservedIds) {
  if (explicitId && String(explicitId).trim()) return String(explicitId).trim();
  var byName = rosterFindMemberIdByName_(sheet, name);
  if (byName) return byName;
  return rosterNextSequentialMemberId_(sheet, groupId, reservedIds);
}

function rosterMemberInGroup_(sheet, memberId, groupId) {
  var rows = rosterMemberRowsByGroupId_(sheet, groupId);
  for (var i = 0; i < rows.length; i++) {
    if (String(sheet.getRange(rows[i], 1).getValue()) === String(memberId)) return true;
  }
  return false;
}

function rosterReadAll_() {
  var ss = getSpreadsheet_();
  var gSheet = ss.getSheetByName(ROSTER_GROUPS_SHEET_NAME);
  var mSheet = ss.getSheetByName(ROSTER_MEMBERS_SHEET_NAME);
  var groups = [];
  var members = [];

  if (gSheet && gSheet.getLastRow() >= 2) {
    var gVals = gSheet.getRange(2, 1, gSheet.getLastRow() - 1, ROSTER_GROUP_HEADERS.length).getValues();
    groups = gVals.map(function (r) {
      return {
        groupId: String(r[0] || ''),
        name: String(r[1] || ''),
        committee: String(r[2] || ''),
        rosterKind: String(r[3] || 'committee'),
        sortOrder: Number(r[4]) || 0,
        description: String(r[5] || '')
      };
    }).filter(function (g) { return g.groupId; });
    groups.sort(function (a, b) { return a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'zh-Hant'); });
  }

  if (mSheet && mSheet.getLastRow() >= 2) {
    var mVals = mSheet.getRange(2, 1, mSheet.getLastRow() - 1, ROSTER_MEMBER_HEADERS.length).getValues();
    members = mVals.map(function (r) {
      return {
        memberId: String(r[0] || ''),
        groupId: String(r[1] || ''),
        name: String(r[2] || ''),
        org: String(r[3] || ''),
        title: String(r[4] || ''),
        role: String(r[5] || ''),
        attendance: String(r[6] || '出席'),
        sortOrder: Number(r[7]) || 0
      };
    }).filter(function (m) { return m.memberId && m.groupId; });
  }

  return { groups: groups, members: members };
}

function getRoster_() {
  var data = rosterReadAll_();
  return jsonOut({ ok: true, groups: data.groups, members: data.members });
}

function rosterFindGroupRow_(sheet, groupId) {
  if (!sheet || sheet.getLastRow() < 2) return 0;
  var ids = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]) === String(groupId)) return i + 2;
  }
  return 0;
}

function rosterMemberRowsByMemberId_(sheet, memberId) {
  var rows = [];
  if (!sheet || sheet.getLastRow() < 2) return rows;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(memberId)) rows.push(i + 2);
  }
  return rows;
}

function rosterMemberRowsByGroupId_(sheet, groupId) {
  var rows = [];
  if (!sheet || sheet.getLastRow() < 2) return rows;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][1]) === String(groupId)) rows.push(i + 2);
  }
  return rows;
}

function rosterNextMemberSort_(sheet, groupId) {
  var max = 0;
  if (!sheet || sheet.getLastRow() < 2) return 1;
  var vals = sheet.getRange(2, 1, sheet.getLastRow() - 1, ROSTER_MEMBER_HEADERS.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][1]) === String(groupId)) {
      var s = Number(vals[i][7]) || 0;
      if (s > max) max = s;
    }
  }
  return max + 1;
}

function rosterCreateGroup_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterGroupsSheet_(ss);
  var groupId = String(data.groupId || '').trim() || rosterUuid_();
  if (rosterFindGroupRow_(sheet, groupId)) {
    return jsonOut({ ok: false, error: '群組 ID 已存在：' + groupId });
  }
  var row = [
    groupId,
    data.name || '',
    data.committee || '',
    data.rosterKind || 'committee',
    Number(data.sortOrder) || sheet.getLastRow(),
    data.description || ''
  ];
  sheet.appendRow(row);
  return jsonOut({ ok: true, groupId: groupId });
}

function rosterUpdateGroup_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterGroupsSheet_(ss);
  var groupId = String(data.groupId || '');
  var rowNum = rosterFindGroupRow_(sheet, groupId);
  if (!rowNum) return jsonOut({ ok: false, error: '找不到群組：' + groupId });
  var existing = sheet.getRange(rowNum, 1, 1, ROSTER_GROUP_HEADERS.length).getValues()[0];
  sheet.getRange(rowNum, 1, 1, ROSTER_GROUP_HEADERS.length).setValues([[
    groupId,
    data.name != null ? data.name : existing[1],
    data.committee != null ? data.committee : existing[2],
    data.rosterKind != null ? data.rosterKind : existing[3],
    data.sortOrder != null ? Number(data.sortOrder) : existing[4],
    data.description != null ? data.description : existing[5]
  ]]);
  return jsonOut({ ok: true, groupId: groupId });
}

function rosterDeleteGroup_(data) {
  var ss = getSpreadsheet_();
  var gSheet = getOrCreateRosterGroupsSheet_(ss);
  var mSheet = getOrCreateRosterMembersSheet_(ss);
  var groupId = String(data.groupId || '');
  var rowNum = rosterFindGroupRow_(gSheet, groupId);
  if (!rowNum) return jsonOut({ ok: false, error: '找不到群組：' + groupId });

  var memberRows = rosterMemberRowsByGroupId_(mSheet, groupId);
  for (var i = memberRows.length - 1; i >= 0; i--) {
    mSheet.deleteRow(memberRows[i]);
  }
  gSheet.deleteRow(rowNum);
  return jsonOut({ ok: true, groupId: groupId, deletedMembers: memberRows.length });
}

function rosterCreateMember_(data) {
  var ss = getSpreadsheet_();
  getOrCreateRosterGroupsSheet_(ss);
  var sheet = getOrCreateRosterMembersSheet_(ss);
  var groupId = String(data.groupId || '');
  if (!rosterFindGroupRow_(ss.getSheetByName(ROSTER_GROUPS_SHEET_NAME), groupId)) {
    return jsonOut({ ok: false, error: '找不到群組：' + groupId });
  }
  var name = String(data.name || '').trim();
  if (!name) return jsonOut({ ok: false, error: '請填姓名' });
  var existingId = rosterFindMemberIdByName_(sheet, name);
  var memberId = rosterResolveMemberId_(sheet, groupId, name, data.memberId);
  if (rosterMemberInGroup_(sheet, memberId, groupId)) {
    return jsonOut({ ok: false, error: '此成員已在該群組中（' + memberId + '）' });
  }
  var row = [
    memberId,
    groupId,
    name,
    data.org || '',
    data.title || '',
    data.role || '',
    data.attendance || '出席',
    Number(data.sortOrder) || rosterNextMemberSort_(sheet, groupId)
  ];
  sheet.appendRow(row);
  return jsonOut({ ok: true, memberId: memberId, groupId: groupId, linked: !!(existingId && existingId === memberId) });
}

function rosterUpdateMember_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterMembersSheet_(ss);
  var memberId = String(data.memberId || '');
  var rows = rosterMemberRowsByMemberId_(sheet, memberId);
  if (!rows.length) return jsonOut({ ok: false, error: '找不到成員：' + memberId });

  var first = sheet.getRange(rows[0], 1, 1, ROSTER_MEMBER_HEADERS.length).getValues()[0];
  var name = data.name != null ? data.name : first[2];
  var org = data.org != null ? data.org : first[3];
  var title = data.title != null ? data.title : first[4];
  var role = data.role != null ? data.role : first[5];
  var attendance = data.attendance != null ? data.attendance : first[6];

  for (var i = 0; i < rows.length; i++) {
    var cur = sheet.getRange(rows[i], 1, 1, ROSTER_MEMBER_HEADERS.length).getValues()[0];
    sheet.getRange(rows[i], 1, 1, ROSTER_MEMBER_HEADERS.length).setValues([[
      memberId,
      cur[1],
      name,
      org,
      title,
      role,
      attendance,
      data.sortOrder != null ? Number(data.sortOrder) : cur[7]
    ]]);
  }
  return jsonOut({ ok: true, memberId: memberId, updatedRows: rows.length });
}

function rosterDeleteMember_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterMembersSheet_(ss);
  var memberId = String(data.memberId || '');
  var rows = rosterMemberRowsByMemberId_(sheet, memberId);
  if (!rows.length) return jsonOut({ ok: false, error: '找不到成員：' + memberId });
  for (var i = rows.length - 1; i >= 0; i--) {
    sheet.deleteRow(rows[i]);
  }
  return jsonOut({ ok: true, memberId: memberId, deletedRows: rows.length });
}

function rosterLinkMember_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterMembersSheet_(ss);
  var memberId = String(data.memberId || '');
  var groupId = String(data.groupId || '');
  var rows = rosterMemberRowsByMemberId_(sheet, memberId);
  if (!rows.length) return jsonOut({ ok: false, error: '找不到成員：' + memberId });
  if (!rosterFindGroupRow_(ss.getSheetByName(ROSTER_GROUPS_SHEET_NAME), groupId)) {
    return jsonOut({ ok: false, error: '找不到群組：' + groupId });
  }
  var src = sheet.getRange(rows[0], 1, 1, ROSTER_MEMBER_HEADERS.length).getValues()[0];
  var dup = rosterMemberRowsByGroupId_(sheet, groupId);
  for (var i = 0; i < dup.length; i++) {
    var cur = sheet.getRange(dup[i], 1, 1, 1).getValue();
    if (String(cur) === memberId) {
      return jsonOut({ ok: false, error: '成員已在該群組中' });
    }
  }
  sheet.appendRow([
    memberId,
    groupId,
    src[2],
    src[3],
    src[4],
    src[5],
    data.attendance != null ? data.attendance : src[6],
    Number(data.sortOrder) || rosterNextMemberSort_(sheet, groupId)
  ]);
  return jsonOut({ ok: true, memberId: memberId, groupId: groupId });
}

function rosterParseImportLine_(line, defaults) {
  var parts = line.split('\t');
  if (parts.length === 1) parts = line.split(',');
  if (parts.length === 1) parts = [line.trim()];
  return {
    name: (parts[0] || '').trim(),
    org: (parts[1] || defaults.org || '').trim(),
    title: (parts[2] || defaults.title || '').trim(),
    role: (parts[3] || defaults.role || '').trim(),
    attendance: (parts[4] || defaults.attendance || '出席').trim()
  };
}

function rosterBulkImport_(data) {
  var ss = getSpreadsheet_();
  getOrCreateRosterGroupsSheet_(ss);
  var sheet = getOrCreateRosterMembersSheet_(ss);
  var groupId = String(data.groupId || '');
  if (!rosterFindGroupRow_(ss.getSheetByName(ROSTER_GROUPS_SHEET_NAME), groupId)) {
    return jsonOut({ ok: false, error: '找不到群組：' + groupId });
  }
  var text = String(data.text || '');
  var lines = text.split(/\r?\n/).map(function (l) { return l.trim(); }).filter(function (l) { return l; });
  var defaults = {
    org: data.defaultOrg || '',
    title: data.defaultTitle || '',
    role: data.defaultRole || '',
    attendance: data.defaultAttendance || '出席'
  };
  var added = 0;
  var skipped = 0;
  var sort = rosterNextMemberSort_(sheet, groupId);
  var reservedIds = [];
  for (var i = 0; i < lines.length; i++) {
    var m = rosterParseImportLine_(lines[i], defaults);
    if (!m.name) continue;
    var memberId = rosterResolveMemberId_(sheet, groupId, m.name, '', reservedIds);
    if (rosterMemberInGroup_(sheet, memberId, groupId)) {
      skipped++;
      continue;
    }
    sheet.appendRow([
      memberId,
      groupId,
      m.name,
      m.org,
      m.title,
      m.role,
      m.attendance,
      sort++
    ]);
    added++;
  }
  return jsonOut({ ok: true, groupId: groupId, added: added, skipped: skipped });
}

function rosterSeedInitial_(data) {
  if (data.force !== true) {
    var existing = rosterReadAll_();
    if (existing.groups.length) {
      return jsonOut({ ok: false, error: '已有群組資料；若要覆寫請傳 force:true', groupCount: existing.groups.length });
    }
  }

  var ss = getSpreadsheet_();
  var gSheet = getOrCreateRosterGroupsSheet_(ss);
  var mSheet = getOrCreateRosterMembersSheet_(ss);

  if (data.force === true) {
    while (gSheet.getLastRow() > 1) gSheet.deleteRow(2);
    while (mSheet.getLastRow() > 1) mSheet.deleteRow(2);
  }

  var seed = getRosterSeedData_();
  var memberCount = 0;
  for (var i = 0; i < seed.groups.length; i++) {
    var g = seed.groups[i];
    gSheet.appendRow([
      g.groupId,
      g.name,
      g.committee,
      g.rosterKind,
      g.sortOrder,
      g.description || ''
    ]);
    var members = seed.members[g.groupId] || [];
    for (var j = 0; j < members.length; j++) {
      var m = members[j];
      mSheet.appendRow([
        m.memberId || rosterUuid_(),
        g.groupId,
        m.name,
        m.org || '',
        m.title || '',
        m.role || '',
        m.attendance || '出席',
        m.sortOrder != null ? m.sortOrder : j + 1
      ]);
      memberCount++;
    }
  }
  return jsonOut({ ok: true, groups: seed.groups.length, members: memberCount });
}

/** 0730 教材編審＋630 評核預設群組（與 repo preset / members.js 對齊） */
function getRosterSeedData_() {
  var editorialCommittee = [
    { name: '張祐倉', org: '長榮大學健康科學學院', title: '職能導向培訓與 ICAP 文件編修', role: '編審委員', attendance: '出席' },
    { name: '甘士照', org: '崑山科技大學', title: '大專院校財務與活動管理教學', role: '教材講師', attendance: '出席' },
    { name: '沈煒庭', org: '永和區公所社會人文課／台北媽祖文創協會', title: '地方宗教文化推廣與媽祖信仰活動', role: '教材講師', attendance: '出席' },
    { name: '郭純學', org: '南寶企管顧問有限公司', title: '企業與非營利組織 TTQS 輔導', role: '教材講師', attendance: '出席' },
    { name: '凃佩君', org: '群羿堂策略整合行銷有限公司', title: '營運長', role: '教材講師', attendance: '出席' },
    { name: '洪家祥', org: '如魚得水管理顧問有限公司', title: '地方創生與組織策略顧問', role: '教材講師', attendance: '出席' },
    { name: '蔡靜枝', org: '益和永續股份有限公司', title: '永續發展與地方協力網絡推動', role: '教材講師', attendance: '出席' },
    { name: '林伯奇', org: '新港奉天宮世界媽祖文化研究暨文獻中心', title: '媽祖文化研究與大型宗教儀典', role: '教材講師', attendance: '出席' },
    { name: '王明堂', org: '高苑工商', title: '宮廟管理教育與教材審查', role: '編審委員', attendance: '出席' },
    { name: '陳家誼', org: '利貞法律事務所', title: '宗教團體與宮廟行政法制諮詢', role: '教材講師', attendance: '出席' },
    { name: '蔣馥蓁', org: '國立政治大學華人宗教研究中心', title: '華人宗教與道教儀式學術研究', role: '教材講師', attendance: '出席' },
    { name: '胡家綾', org: '禾寅有限公司', title: '地方文化課程與體驗活動規劃', role: '教材講師', attendance: '出席' },
    { name: '李芳文', org: '安永聯合會計師事務所', title: '教材與財務制度審查', role: '編審委員', attendance: '出席' },
    { name: '鄭詠紜', org: '宮廟從業培訓與品質管理小組', title: '宮廟現場廟務輔導與培訓品質管理', role: '教材講師', attendance: '出席' },
    { name: '林宗德', org: '墩點文史工作室', title: '地方文史調查與文化資產田野', role: '教材講師', attendance: '出席' }
  ];
  var editorialObservers = [
    { name: '陳瑞宏', org: '臺灣道法總會', title: '總會長', role: '列席人員', attendance: '出席' },
    { name: '李豐楙', org: '中央研究院／政治大學', title: '院士；名譽講座教授', role: '專家顧問', attendance: '出席' },
    { name: '張珣', org: '中央研究院民族學研究所', title: '研究員兼前所長', role: '專家顧問', attendance: '出席' },
    { name: '林美容', org: '慈濟大學宗教與人文研究所', title: '教授', role: '專家顧問', attendance: '出席' },
    { name: '黃發保', org: '臺灣道法總會', title: '秘書長', role: '列席人員', attendance: '出席' },
    { name: '楊成林', org: '臺灣道法總會', title: '副秘書長', role: '列席人員', attendance: '出席' },
    { name: '王芯庭', org: '臺灣道法總會', title: '助理', role: '專案工作人員', attendance: '出席' }
  ];
  var evalCommittee = [
    { name: '林清淇', org: '內政部宗教禮制司', title: '前司長', role: '召集委員', attendance: '出席' },
    { name: '吳永猛', org: '臺灣法教會／文化大學', title: '前理事長／前副校長', role: '評核委員', attendance: '視訊' },
    { name: '薄喬萍', org: '義守大學', title: '前院長', role: '評核委員', attendance: '出席' },
    { name: '李樑堅', org: '義守大學', title: '前副校長', role: '評核委員', attendance: '視訊' },
    { name: '鄭卜五', org: '高雄師範大學', title: '教授', role: '評核委員', attendance: '視訊' },
    { name: '鄭志明', org: '輔仁大學', title: '教授', role: '評核委員', attendance: '視訊' },
    { name: '陳美華', org: '台灣宗教學會', title: '前理事長', role: '評核委員', attendance: '出席' },
    { name: '高超文', org: '木柵指南宮', title: '主任委員', role: '評核委員', attendance: '出席' },
    { name: '鄭詠紜', org: '臺灣道法總會', title: '不分區會長', role: '評核委員', attendance: '出席' },
    { name: '王世任', org: '承天宮', title: '興建主任委員', role: '評核委員', attendance: '出席' },
    { name: '詹博雅', org: '凌霄寶殿武龍宮', title: '顧問', role: '評核委員', attendance: '出席' },
    { name: '郭昭廷', org: '開封宮包公廟', title: '前主任委員', role: '評核委員', attendance: '出席' },
    { name: '黃國彰', org: '中華關聖文化世界弘揚協會', title: '理事長', role: '評核委員', attendance: '出席' },
    { name: '黃志華', org: '五里林護天府', title: '主任委員', role: '評核委員', attendance: '出席' },
    { name: '蔡鴻祺', org: '中華世界全民念佛會', title: '會長', role: '評核委員', attendance: '出席' },
    { name: '洪家祥', org: '如魚得水顧問公司', title: '總經理', role: '評核委員', attendance: '請假' }
  ];
  var evalObserversExtra = [
    { name: '陳瑞宏', org: '臺灣道法總會', title: '總會長', role: '列席人員', attendance: '出席' },
    { name: '李豐楙', org: '中央研究院／政治大學', title: '院士；名譽講座教授', role: '專家顧問', attendance: '出席' },
    { name: '張珣', org: '中央研究院民族學研究所', title: '研究員兼前所長', role: '專家顧問', attendance: '出席' },
    { name: '林美容', org: '慈濟大學宗教與人文研究所', title: '教授', role: '專家顧問', attendance: '出席' },
    { name: '黃發保', org: '臺灣道法總會', title: '秘書長', role: '列席人員', attendance: '出席' },
    { name: '楊成林', org: '臺灣道法總會', title: '副秘書長', role: '列席人員', attendance: '出席' },
    { name: '張聰明', org: '臺灣道法總會', title: '監事長', role: '列席人員', attendance: '出席' },
    { name: '陳昭良', org: '臺灣道法總會', title: '副監事長', role: '列席人員', attendance: '出席' },
    { name: '黃子瑜', org: '臺灣道法總會', title: '北區會長', role: '列席人員', attendance: '出席' },
    { name: '郭益富', org: '臺灣道法總會', title: '東區會長', role: '列席人員', attendance: '出席' },
    { name: '張祐倉', org: '臺灣道法總會', title: '主任委員', role: '列席人員', attendance: '出席' },
    { name: '王芯庭', org: '臺灣道法總會', title: '助理', role: '列席人員', attendance: '出席' }
  ];

  function withIds(list, prefix) {
    return list.map(function (m, idx) {
      var copy = {};
      for (var k in m) copy[k] = m[k];
      copy.memberId = prefix + '-' + String(idx + 1).padStart(3, '0');
      copy.sortOrder = idx + 1;
      return copy;
    });
  }

  /** 跨群組共用 memberId（連動刪改）；以 730 群組前綴為準 */
  var SHARED_MEMBER_IDS = {
    '陳瑞宏': '730o-001',
    '李豐楙': '730o-002',
    '張珣': '730o-003',
    '林美容': '730o-004',
    '黃發保': '730o-005',
    '楊成林': '730o-006',
    '王芯庭': '730o-007',
    '張祐倉': '730c-001',
    '洪家祥': '730c-006',
    '鄭詠紜': '730c-014'
  };

  function applySharedIds(membersByGroup) {
    for (var gid in membersByGroup) {
      if (!membersByGroup.hasOwnProperty(gid)) continue;
      membersByGroup[gid] = membersByGroup[gid].map(function (m) {
        if (SHARED_MEMBER_IDS[m.name]) m.memberId = SHARED_MEMBER_IDS[m.name];
        return m;
      });
    }
    return membersByGroup;
  }

  var members = applySharedIds({
    '1150730-editorial-committee': withIds(editorialCommittee, '730c'),
    '1150730-editorial-observers': withIds(editorialObservers, '730o'),
    '1150630-evaluation-committee': withIds(evalCommittee, '630c'),
    '1150630-evaluation-observers': withIds(evalObserversExtra, '630o')
  });

  return {
    groups: [
      { groupId: '1150730-editorial-committee', name: '730 教材講師／編審委員', committee: '教材編審委員會', rosterKind: 'committee', sortOrder: 1, description: '115/07/30 M1 Demo 主名單' },
      { groupId: '1150730-editorial-observers', name: '730 列席與工作人員', committee: '教材編審委員會', rosterKind: 'observers', sortOrder: 2, description: '總會長＋五位固定顧問＋工作人員' },
      { groupId: '1150630-evaluation-committee', name: '630 評核委員', committee: '評核委員會', rosterKind: 'committee', sortOrder: 3, description: '115/06/30 第一次評核委員會' },
      { groupId: '1150630-evaluation-observers', name: '630 列席與工作人員', committee: '評核委員會', rosterKind: 'observers', sortOrder: 4, description: '總會幹部與工作人員' }
    ],
    members: members
  };
}

/**
 * 將 UUID 或不一致的 memberId 整理為 {prefix}-{NNN}；
 * 同名成員合併為同一 memberId（跨群組連動）。
 */
function rosterNormalizeMemberIds_(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateRosterMembersSheet_(ss);
  if (sheet.getLastRow() < 2) {
    return jsonOut({ ok: true, updated: 0, merged: 0 });
  }

  var lastRow = sheet.getLastRow();
  var vals = sheet.getRange(2, 1, lastRow, ROSTER_MEMBER_HEADERS.length).getValues();
  var byName = {};
  var updated = 0;
  var merged = 0;

  for (var i = 0; i < vals.length; i++) {
    var nameKey = rosterNormalizeName_(vals[i][2]);
    if (!nameKey) continue;
    var id = String(vals[i][0] || '');
    if (!byName[nameKey]) {
      byName[nameKey] = { ids: {}, best: id, isUuid: rosterIsUuid_(id) };
    }
    byName[nameKey].ids[id] = true;
    var entry = byName[nameKey];
    if (!rosterIsUuid_(id) && (entry.isUuid || id.length < entry.best.length)) {
      entry.best = id;
      entry.isUuid = false;
    } else if (entry.isUuid && rosterIsUuid_(id) && id < entry.best) {
      entry.best = id;
    }
  }

  var canonical = {};
  var reservedByPrefix = {};
  for (var nameKey2 in byName) {
    if (!byName.hasOwnProperty(nameKey2)) continue;
    var e = byName[nameKey2];
    var ids = Object.keys(e.ids);
    if (ids.length > 1) merged++;
    if (!e.isUuid && e.best && !rosterIsUuid_(e.best)) {
      canonical[nameKey2] = e.best;
      continue;
    }
    for (var j = 0; j < vals.length; j++) {
      if (rosterNormalizeName_(vals[j][2]) !== nameKey2) continue;
      var gid = String(vals[j][1] || '');
      var prefix = rosterMemberIdPrefix_(gid);
      if (!reservedByPrefix[prefix]) reservedByPrefix[prefix] = [];
      canonical[nameKey2] = rosterNextSequentialMemberId_(sheet, gid, reservedByPrefix[prefix]);
      break;
    }
  }

  for (var r = 0; r < vals.length; r++) {
    var nk = rosterNormalizeName_(vals[r][2]);
    if (!nk || !canonical[nk]) continue;
    if (String(vals[r][0]) !== canonical[nk]) {
      vals[r][0] = canonical[nk];
      updated++;
    }
  }

  if (updated) {
    sheet.getRange(2, 1, vals.length + 1, ROSTER_MEMBER_HEADERS.length).setValues(vals);
  }
  return jsonOut({ ok: true, updated: updated, merged: merged });
}

/** 簽到／簽退固定寫入「工作表1」，避免與「填答紀錄」分頁混淆 */
function getOrCreateSignSheet_(ss) {
  var sheet = ss.getSheetByName(SIGN_SHEET_NAME);
  if (!sheet) {
    var first = ss.getSheets()[0];
    if (first && first.getName() !== FORM_SHEET_NAME) {
      first.setName(SIGN_SHEET_NAME);
      sheet = first;
    } else {
      sheet = ss.insertSheet(SIGN_SHEET_NAME);
    }
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(SIGN_HEADERS);
  } else if (sheet.getLastColumn() < 5) {
    sheet.getRange(1, 5).setValue('截圖連結');
  }
  return sheet;
}

function formatTaiwanTime_(isoOrEmpty) {
  var d = isoOrEmpty ? new Date(isoOrEmpty) : new Date();
  if (isNaN(d.getTime())) {
    d = new Date();
  }
  return Utilities.formatDate(d, 'Asia/Taipei', 'yyyy/M/d ahh:mm:ss');
}

/** 簽到專用：存 Drive 並回傳檔案 blob 供寄信附件（檔名純英文） */
function saveSignImage_(base64) {
  var ts = Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd_HHmmss');
  var blob = imageBase64ToBlob_(base64, 'checkin_' + ts + '.jpg');
  if (!blob) {
    return null;
  }
  var folderName = 'meet-checkin-截圖';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  var file = folder.createFile(blob);
  return {
    url: file.getUrl(),
    blob: file.getBlob()
  };
}

function saveImageToDrive_(base64, filename) {
  if (!base64 || base64.indexOf('data:image') !== 0) {
    return '';
  }
  var folderName = 'meet-checkin-截圖';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);

  var parts = base64.split(',');
  var blob = Utilities.newBlob(
    Utilities.base64Decode(parts[1]),
    'image/jpeg',
    filename + '_' + new Date().getTime() + '.jpg'
  );
  return folder.createFile(blob).getUrl();
}

/** 僅供簽到寄信附件使用，不影響 saveImageToDrive_ */
function imageBase64ToBlob_(base64, filename) {
  if (!base64 || base64.indexOf('data:image') !== 0) {
    return null;
  }
  var parts = base64.split(',');
  return Utilities.newBlob(
    Utilities.base64Decode(parts[1]),
    'image/jpeg',
    filename
  );
}

/**
 * 簽到／簽退驗證通知信（與第一版相同：主旨含姓名、內文含時間／身份、附截圖）
 * 僅由 handleSignInOut 呼叫，不影響填答流程。
 */
function sendSignEmail_(data, timeStr, imageBlob, imageUrl) {
  if (!NOTIFY_EMAIL) {
    return;
  }

  var action = data.action || '簽到';
  var isSignIn = action === '簽到';
  var subject = '【' + (isSignIn ? '報到成功' : '簽退成功') + '】' +
    MEETING_TITLE + ' - ' + (data.name || '');

  var bodyLines = [
    '系統通知',
    '',
    (isSignIn ? '報到時間' : '簽退時間') + '：' + timeStr,
    '與會姓名：' + (data.name || ''),
    '身份別：' + (data.role || ''),
    '錄影授權：' + (data.consent ? '已同意' : '未同意')
  ];

  if (data.source) {
    bodyLines.push('簽到來源：' + data.source);
  }
  if (data.org) {
    bodyLines.push('單位：' + data.org);
  }
  if (data.title) {
    bodyLines.push('職稱：' + data.title);
  }
  if (imageUrl) {
    bodyLines.push('', '截圖雲端備份：' + imageUrl);
  }

  var options = { name: '宮廟管理師會議報到系統' };
  if (imageBlob) {
    options.attachments = [imageBlob];
  }

  MailApp.sendEmail(NOTIFY_EMAIL, subject, bodyLines.join('\n'), options);
}

function sendExpenseEntrySubmissionEmail_(submission, timeStr, pageUrl) {
  if (!NOTIFY_EMAIL) {
    return;
  }

  var reviewUrl = 'https://chatgptcjcu-boop.github.io/meet-checkin/expenses/expense-entry.html?organizer=1';
  var subject = '【經費送審】' + (submission.submitter || '工讀生') + ' $' + (Number(submission.amount) || 0);
  var bodyLines = [
    '系統通知：有新的工讀生經費送審，請進入經費管理確認後匯入總帳。',
    '',
    '提交時間：' + timeStr,
    '登錄人：' + (submission.submitter || ''),
    '日期：' + (submission.date || ''),
    '類別：' + (submission.category || ''),
    '金額：' + (Number(submission.amount) || 0),
    '說明：' + (submission.note || ''),
    '會議ID：' + (submission.eventId || ''),
    '',
    '審核入口：' + reviewUrl
  ];

  MailApp.sendEmail(NOTIFY_EMAIL, subject, bodyLines.join('\n'), {
    name: '宮廟管理師經費管理系統'
  });
}

function sendExpenseTransferEmail_(transfer, person, timeStr) {
  var subject = '【撥款通知】今日已撥付款項：' + (transfer.purpose || transfer.type || '經費款項');
  var account = person.account || '';
  var masked = account ? '末五碼 ' + account.slice(-5) : '未填帳號';
  var bodyLines = [
    (person.name || '您好') + ' 您好：',
    '',
    '系統通知：今日已撥付款項，請留存本通知作為撥款通知憑據。',
    '',
    '通知時間：' + timeStr,
    '收款人：' + (person.name || ''),
    '身分：' + (person.role || ''),
    '撥款日期：' + (transfer.date || ''),
    '撥款方式：' + (transfer.type || ''),
    '撥付款項：' + (transfer.purpose || ''),
    '金額：' + (Number(transfer.amount) || 0),
    '收款銀行：' + (person.bank || ''),
    '收款帳號：' + masked,
    '',
    '若您未收到款項，或帳戶資料需更正，請回覆本信或聯繫主辦單位。'
  ];
  if (transfer.note) {
    bodyLines.splice(12, 0, '備註：' + transfer.note);
  }

  var options = { name: '宮廟管理師經費管理系統' };
  if (NOTIFY_EMAIL) {
    options.cc = NOTIFY_EMAIL;
  }
  MailApp.sendEmail(person.email, subject, bodyLines.join('\n'), options);
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 瀏覽器開啟 /exec 可測試部署是否上線。
 * ?action=unit-claim-matrix → 回傳目前 86 單元認領矩陣（供前端「同步最新」）。
 * ?action=expenses          → 回傳經費編列表最新一版（供前端「同步最新」）。
 * ?action=expense-finance   → 回傳核銷總帳最新一版。
 * ?action=expense-entry-submissions → 回傳工讀生支出送審清單。
 * ?action=expense-person-profile → 以 personId/accessCode 讀取個人收款資料。
 * ?action=roster            → 回傳出席名單全部群組＋成員（供 roster-admin 與簽到頁）。
 */
function doGet(e) {
  var action = e && e.parameter ? (e.parameter.action || '') : '';
  if (action === 'unit-claim-matrix') {
    return getUnitClaimMatrix_();
  }
  if (action === 'expenses') {
    return getExpenses_();
  }
  if (action === 'expense-finance') {
    return getExpenseFinance_();
  }
  if (action === 'expense-entry-submissions') {
    return getExpenseEntrySubmissions_();
  }
  if (action === 'expense-person-profile') {
    return getExpensePersonProfile_(e);
  }
  if (action === 'roster') {
    return getRoster_();
  }
  return jsonOut({ ok: true, service: 'meet-checkin', time: new Date().toISOString() });
}

function testSignIn() {
  Logger.log(doPost(mockPost_({
    action: '簽到',
    name: 'GAS簽到測試',
    role: '評核委員',
    consent: true,
    timestamp: new Date().toISOString()
  })).getContent());
}

/** 編輯器執行：測試寄信＋附件（確認 MailApp 附件是否正常） */
function testSignInEmailWithImage() {
  var tinyJpeg =
    'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wCEAAkGBxISEhUQEhIVFhUVFRUVFRUVFRUWFxUXFhUYHSggGBolGxUVITEhJSkrLi4uFx8zODMtNygtLisBCgoKDg0OGxAQGy0lHyUtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLf/AABEIAAEAAQMBIgACEQEDEQH/xAAbAAACAwEBAQAAAAAAAAAAAAADBAECBQYAB//EAD0QAAIBAwMCBQMDAwQDAgcAAAECAwAEERIhMQVBBhMiUWEycYGRoQcjQrHB0fAVJGLh8SQzQ1Jyc//EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwDdwAP/2Q==';
  var saved = saveSignImage_(tinyJpeg);
  sendSignEmail_({
    action: '簽到',
    name: '附件測試',
    role: '評核委員',
    consent: true,
    source: 'GAS測試'
  }, formatTaiwanTime_(new Date().toISOString()), saved ? saved.blob : null, saved ? saved.url : '');
}

/** 編輯器執行此函式，快速測試寄信（不含截圖） */
function testSignInEmail() {
  sendSignEmail_({
    action: '簽到',
    name: '郵件測試',
    role: '評核委員',
    consent: true,
    source: 'GAS測試'
  }, formatTaiwanTime_(new Date().toISOString()), null, '');
}

function testFormSubmit() {
  Logger.log(doPost(mockPost_({
    action: '填答-正文',
    name: 'GAS填答測試',
    role: '評核委員',
    formType: '填答-正文',
    timestamp: new Date().toISOString(),
    answerCount: 1,
    answers: [{ title: '1-1 出席確認', fields: [{ label: '委員姓名', value: 'GAS填答測試' }] }],
    pageUrl: 'manual-test'
  })).getContent());
}

function testReportWizardWorksheet() {
  Logger.log(doPost(mockPost_({
    action: 'icap-report-worksheet',
    formType: 'icap-report-worksheet',
    name: 'GAS報告精靈測試',
    role: '講師',
    timestamp: new Date().toISOString(),
    fields: {
      '講師姓名': 'GAS報告精靈測試',
      '服務單位': '測試單位',
      '課程名稱': '宮廟管理師職能導向課程',
      '訓練需求': '測試訓練需求',
      '填寫章節': '整合版'
    },
    answers: [{ title: '壹、課程資訊', fields: [{ label: '訓練需求', value: '測試訓練需求' }] }],
    pageUrl: 'manual-test'
  })).getContent());
}

function testInstructorWorksheet() {
  Logger.log(doPost(mockPost_({
    action: '730-instructor',
    formType: '730-instructor',
    name: 'GAS講師測試',
    role: '講師',
    timestamp: new Date().toISOString(),
    demoUnit: 'M1-1.1',
    eventDate: '115/07/30',
    fields: {
      '講師姓名': 'GAS講師測試',
      '服務單位宮廟': '測試宮廟',
      '示範單元': 'M1-1.1',
      '活動日期': '115/07/30',
      '緒論導入': '測試緒論'
    },
    answers: [{ title: '0-1 基本資料', fields: [{ label: '講師姓名', value: 'GAS講師測試' }] }],
    pageUrl: 'manual-test'
  })).getContent());
}

function testUnitClaimMatrix() {
  /* 寫入兩筆單元後再讀回，驗證 upsert 與 doGet 皆正常 */
  Logger.log(doPost(mockPost_({
    action: 'unit-claim-matrix',
    name: 'GAS矩陣測試',
    timestamp: new Date().toISOString(),
    units: [
      { code: 'M1-1.1', title: '緒論－為何寺廟需要法律定位？', module: '模組一', lead: '主辦示範', collab: '', review: '王委員', status: 'done' },
      { code: 'M1-1.2', title: '執行中樞－管理/董事委員會的定位與職責', module: '模組一', lead: '李委員', collab: '張委員', review: '', status: 'writing' }
    ],
    pageUrl: 'manual-test'
  })).getContent());
  Logger.log(getUnitClaimMatrix_().getContent());
}

function testExpenses() {
  /* 寫入一版經費 JSON 後再讀回，驗證 append 版本與 doGet 皆正常 */
  Logger.log(doPost(mockPost_({
    action: 'expenses',
    name: 'GAS經費測試',
    timestamp: new Date().toISOString(),
    version: '20260704-000000-0001',
    state: {
      schemaVersion: 1,
      dataVersion: '20260704-000000-0001',
      updatedAt: new Date().toISOString(),
      updatedDate: '115年7月4日 00:00:00',
      meta: { meetingName: '宮廟管理師第一次評核委員會', rateAttendance: 2500, rateReview: 1830, rateHost: 3000 },
      rows: [{ item: '場地費', category: '業務費', unitPrice: 5000, qty: 1, unit: '式', note: '測試', feeType: 'biz' }],
      staff: [{ name: '王芯庭', role: '會議助理／紀錄', hours: 6, hourly: 0, transport: 0, note: '' }]
    },
    pageUrl: 'manual-test'
  })).getContent());
  Logger.log(getExpenses_().getContent());
}

function testRosterSeed() {
  Logger.log(doPost(mockPost_({
    action: 'roster-admin',
    operation: 'seed',
    force: false
  })).getContent());
  Logger.log(getRoster_().getContent());
}

function testRosterAdmin() {
  Logger.log(doPost(mockPost_({
    action: 'roster-admin',
    operation: 'createGroup',
    groupId: 'test-group',
    name: '測試群組',
    committee: '教育委員會',
    rosterKind: 'committee'
  })).getContent());
  Logger.log(doPost(mockPost_({
    action: 'roster-admin',
    operation: 'bulkImport',
    groupId: 'test-group',
    text: '測試甲\n測試乙\t單位B',
    defaultRole: '列席人員'
  })).getContent());
  Logger.log(getRoster_().getContent());
}

function testFormSubmitWeb() {
  /* 模擬網頁 hidden form 的 parameter.payload 路徑 */
  Logger.log(doPost({
    parameter: {
      payload: JSON.stringify({
        action: '填答-正文',
        name: '模擬網頁POST',
        role: '評核委員',
        formType: '填答-正文',
        timestamp: new Date().toISOString(),
        answerCount: 1,
        answers: [{ title: '1-1 出席確認', fields: [{ label: '委員姓名', value: '模擬網頁POST' }] }],
        pageUrl: 'https://chatgptcjcu-boop.github.io/meet-checkin/test',
        imageOmitted: true
      })
    }
  }).getContent());
}

function mockPost_(obj) {
  return { postData: { contents: JSON.stringify(obj) } };
}
