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
 * • unit-claim-matrix     → handleUnitClaimMatrix（86 單元認領矩陣，分頁 unit-claim-matrix，以單元碼 upsert）
 *                           讀取：doGet ?action=unit-claim-matrix 回傳目前全部單元 JSON
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
/** 86 單元認領矩陣分頁（英文 tab 名；以單元碼為主鍵 upsert，last-write-wins） */
var UNIT_CLAIM_SHEET_NAME = 'unit-claim-matrix';

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
    if (action === 'unit-claim-matrix') {
      return handleUnitClaimMatrix(data);
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

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 瀏覽器開啟 /exec 可測試部署是否上線。
 * ?action=unit-claim-matrix → 回傳目前 86 單元認領矩陣（供前端「同步最新」）。
 */
function doGet(e) {
  var action = e && e.parameter ? (e.parameter.action || '') : '';
  if (action === 'unit-claim-matrix') {
    return getUnitClaimMatrix_();
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
