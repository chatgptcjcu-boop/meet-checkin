/**
 * 將此段程式「貼入」您現有簽到用 Google Apps Script 的 doPost(e) 中
 * （與簽到／簽退同一個部署網址，meet-checkin 已設定該 URL）
 *
 * 試算表建議新增工作表：「填答紀錄」
 * 欄位：時間戳記 | 動作 | 姓名 | 身份 | 表單類型 | 答題數 | 結構化答案(JSON) | 截圖連結或內嵌
 */

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var ss = SpreadsheetApp.openById('YOUR_SPREADSHEET_ID'); // ← 改成您的試算表 ID
    var action = data.action || '';

    if (action === '填答-正文' || action === '填答-附錄') {
      return handleFormSubmit(ss, data);
    }

    // ……保留您原有的簽到／簽退處理……
    // return handleSignInOut(ss, data);

  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ ok: false, error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleFormSubmit(ss, data) {
  var sheet = ss.getSheetByName('填答紀錄') || ss.insertSheet('填答紀錄');
  if (sheet.getLastRow() === 0) {
    sheet.appendRow([
      '時間戳記', '動作', '姓名', '身份', '表單類型', '答題數', '結構化答案(JSON)', '頁面URL', '截圖'
    ]);
  }

  var imageCell = '';
  if (data.image && data.image.indexOf('data:image') === 0) {
    imageCell = saveImageToDrive(data.image, data.name + '_' + data.formType);
  }

  sheet.appendRow([
    data.timestamp || new Date().toISOString(),
    data.action,
    data.name,
    data.role || '',
    data.formType || data.action,
    data.answerCount || (data.answers ? data.answers.length : 0),
    JSON.stringify(data.answers || []),
    data.pageUrl || '',
    imageCell
  ]);

  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function saveImageToDrive(base64, filename) {
  var folder = DriveApp.getFoldersByName('meet-checkin-填答截圖').hasNext()
    ? DriveApp.getFoldersByName('meet-checkin-填答截圖').next()
    : DriveApp.createFolder('meet-checkin-填答截圖');
  var parts = base64.split(',');
  var blob = Utilities.newBlob(Utilities.base64Decode(parts[1]), 'image/jpeg', filename + '.jpg');
  var file = folder.createFile(blob);
  return file.getUrl();
}
