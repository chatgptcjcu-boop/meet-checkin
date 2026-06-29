/**
 * meet-checkin 完整後端
 *
 * 部署 Web App（每次改程式都要做）：
 *   部署 → 管理部署 → 編輯 → 版本「新版本」→ 部署
 *   執行身分：我 ｜ 存取權：任何人（含匿名）
 *
 * 試算表 → 擴充功能 → Apps Script 貼上此檔（勿用獨立「未命名專案」）
 */

var SPREADSHEET_ID = '';
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

/** 簽到／簽退成功後寄送通知（與第一版相同） */
var NOTIFY_EMAIL = 'chatgpt.cjcu@gmail.com';
var MEETING_TITLE = '2026宮廟管理師會議';

/** 與簽到試算表第 1 列標題一致 */
var SIGN_HEADERS = ['報到時間', '姓名', '身份別', '錄影授權'];

function doPost(e) {
  try {
    var data = parsePostData_(e);
    var action = data.action || '';

    if (action === '填答-正文' || action === '填答-附錄') {
      return handleFormSubmit(data);
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
    data.consent ? '已同意' : '未同意'
  ]);

  var imageBlob = null;
  var imageUrl = '';
  if (data.image) {
    try {
      var baseName = (data.name || 'unknown') + '_' + (data.action || '簽到');
      imageUrl = saveImageToDrive_(data.image, baseName);
      imageBlob = base64ToBlob_(data.image, baseName + '.jpg');
    } catch (imgErr) {
      Logger.log('簽到截圖失敗（列已寫入）: ' + imgErr);
    }
  }

  try {
    sendSignEmail_(data, timeStr, imageBlob, imageUrl);
  } catch (mailErr) {
    Logger.log('寄信失敗（列已寫入）: ' + mailErr);
  }

  return jsonOut({ ok: true });
}

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

function base64ToBlob_(base64, filename) {
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

function saveImageToDrive_(base64, filename) {
  var blob = base64ToBlob_(base64, filename + '_' + new Date().getTime() + '.jpg');
  if (!blob) {
    return '';
  }
  var folderName = 'meet-checkin-截圖';
  var folders = DriveApp.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(folderName);
  return folder.createFile(blob).getUrl();
}

/**
 * 寄送簽到／簽退通知信（主旨、內文格式與第一版一致，附截圖）
 * 視訊簽到、現場簽到皆走 handleSignInOut → 此函式
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

function testSignIn() {
  Logger.log(doPost(mockPost_({
    action: '簽到',
    name: 'GAS簽到測試',
    role: '評核委員',
    consent: true,
    timestamp: new Date().toISOString()
  })).getContent());
}

/** 在 Apps Script 編輯器執行此函式，測試寄信（不含截圖） */
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
