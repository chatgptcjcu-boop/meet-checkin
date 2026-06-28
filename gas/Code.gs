/**
 * meet-checkin 完整後端
 *
 * 【重要】請從「試算表」開啟腳本，不要另建獨立專案：
 *   試算表 → 擴充功能 → Apps Script → 貼上此檔 → 部署 Web App
 *
 * 若 SPREADSHEET_ID 留空，會自動使用目前綁定的試算表（建議）
 */

var SPREADSHEET_ID = ''; // 留空 = 綁定試算表；或貼網址列 /d/ 與 /edit 之間的 ID

function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) {
    throw new Error(
      '找不到試算表。請從試算表選「擴充功能→Apps Script」建立腳本，' +
      '或在 SPREADSHEET_ID 貼上正確 ID（網址列 /d/ 後面那段）'
    );
  }
  return ss;
}

/** 與現有試算表第 1 列標題一致 */
var SIGN_HEADERS = ['報到時間', '姓名', '身份別', '錄影授權'];

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
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

function handleSignInOut(data) {
  var ss = getSpreadsheet_();
  var sheet = getOrCreateSignSheet_(ss);

  var timeStr = formatTaiwanTime_(data.timestamp);
  var consentText = data.consent ? '已同意' : '未同意';

  sheet.appendRow([
    timeStr,
    data.name || '',
    data.role || '',
    consentText
  ]);

  // 截圖存 Drive（試算表維持原 4 欄，不影響既有格式）
  if (data.image) {
    saveImageToDrive_(data.image, (data.name || 'unknown') + '_' + data.action);
  }

  return jsonOut({ ok: true });
}

function handleFormSubmit(data) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName('填答紀錄') || ss.insertSheet('填答紀錄');

  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '提交時間',
      '動作',
      '姓名',
      '身份',
      '答題數',
      '結構化答案(JSON)',
      '頁面URL',
      '截圖連結'
    ]);
  }

  var imageUrl = '';
  if (data.image) {
    imageUrl = saveImageToDrive_(
      data.image,
      (data.name || 'unknown') + '_' + (data.formType || data.action)
    );
  }

  sheet.appendRow([
    formatTaiwanTime_(data.timestamp),
    data.action || '',
    data.name || '',
    data.role || '',
    data.answerCount || (data.answers ? data.answers.length : 0),
    JSON.stringify(data.answers || []),
    data.pageUrl || '',
    imageUrl
  ]);

  return jsonOut({ ok: true });
}

/** 使用第一個工作表（你目前的「未命名的試算表」） */
function getOrCreateSignSheet_(ss) {
  var sheet = ss.getSheets()[0];
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

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/** 手動測試用：執行 testSignIn */
function testSignIn() {
  var e = {
    postData: {
      contents: JSON.stringify({
        action: '簽到',
        name: 'GAS測試',
        role: '評核委員',
        consent: true,
        timestamp: new Date().toISOString()
      })
    }
  };
  Logger.log(doPost(e).getContent());
}

/** 手動測試填答：執行 testFormSubmit → 試算表應出現「填答紀錄」分頁 */
function testFormSubmit() {
  var e = {
    postData: {
      contents: JSON.stringify({
        action: '填答-正文',
        name: 'GAS填答測試',
        role: '評核委員',
        formType: '填答-正文',
        timestamp: new Date().toISOString(),
        answerCount: 1,
        answers: [{ title: '1-1 出席確認', fields: [{ label: '委員姓名', value: 'GAS填答測試' }] }],
        pageUrl: 'manual-test'
      })
    }
  };
  Logger.log(doPost(e).getContent());
}
