/**
 * iCAP 報告書格式精靈講師學習單 — 提交至 Google 試算表
 * formType / action: 'icap-report-worksheet'
 */
(function () {
  function cfg() {
    return window.EVENT_CONFIG || {};
  }

  function wsCfg() {
    return cfg().icapReportWorksheet || {};
  }

  function gasUrl() {
    return cfg().backend?.gasWebAppUrl || '';
  }

  function formType() {
    return wsCfg().formType || 'icap-report-worksheet';
  }

  function getMemberFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return {
      name: p.get('name') ? decodeURIComponent(p.get('name')) : '',
      role: p.get('role') ? decodeURIComponent(p.get('role')) : '講師',
    };
  }

  function val(id) {
    const el = document.getElementById(id);
    return el && el.value ? el.value.trim() : '';
  }

  function radioVal(name) {
    const el = document.querySelector('input[name="' + name + '"]:checked');
    return el ? el.value : '';
  }

  function checkedLabels(selector) {
    const out = [];
    document.querySelectorAll(selector).forEach((inp) => {
      if (inp.checked) out.push(inp.value || (inp.parentElement ? inp.parentElement.textContent.trim() : '已選'));
    });
    return out.join('、');
  }

  function collectAnswers(root) {
    const blocks = [];
    root.querySelectorAll('.q').forEach((el, idx) => {
      const titleEl = el.querySelector('.q-title');
      const title = titleEl ? titleEl.textContent.trim() : '區塊' + (idx + 1);
      const entry = { title: title, fields: [] };

      el.querySelectorAll('.field').forEach((field) => {
        const label = field.querySelector('label');
        const labelText = label ? label.textContent.trim() : '';
        field.querySelectorAll('input, textarea, select').forEach((inp) => {
          if (inp.type === 'radio' || inp.type === 'checkbox') {
            if (inp.checked) {
              entry.fields.push({
                label: labelText || '選項',
                value: inp.value || (inp.parentElement ? inp.parentElement.textContent.trim() : '已選'),
              });
            }
          } else if (inp.value && inp.value.trim()) {
            entry.fields.push({ label: labelText, value: inp.value.trim() });
          }
        });
      });

      el.querySelectorAll(':scope > .opts').forEach((opts) => {
        const checked = [];
        opts.querySelectorAll('input:checked').forEach((inp) => {
          checked.push(inp.value || (inp.parentElement ? inp.parentElement.textContent.trim() : inp.value));
        });
        if (checked.length) entry.fields.push({ label: '選項', value: checked.join('、') });
      });

      el.querySelectorAll(':scope > textarea.online-textarea').forEach((ta) => {
        if (ta.value.trim()) entry.fields.push({ label: title, value: ta.value.trim() });
      });

      if (entry.fields.length) blocks.push(entry);
    });
    return blocks;
  }

  function collectFlatFields() {
    const section = document.body.dataset.section || '整合版';
    return {
      講師姓名: val('coverName') || val('fieldName'),
      服務單位: val('coverOrg') || val('fieldOrg'),
      課程名稱: val('courseName'),
      訓練需求: val('trainingNeed'),
      課程簡介: val('courseIntro'),
      課程目的: val('coursePurpose'),
      課程時數: val('courseHours'),
      職能級別: val('competencyLevel'),
      主要對象: val('targetAudience'),
      先備條件: val('prerequisites'),
      表1_職能任務: val('t1Task'),
      表1_行為指標P: val('t1Performance'),
      表1_知識技能: val('t1Knowledge'),
      表2_課程地圖: val('t2CourseMap'),
      表3_A對象: val('t3A'),
      表3_B行為: val('t3B'),
      表3_C條件: val('t3C'),
      表3_D標準: val('t3D'),
      表3_對應職能: val('t3Competency'),
      表4_單元內容: val('t4Content'),
      表5_教學方法: checkedLabels('input[name="t5Methods"]') || val('t5MethodsText'),
      表6_教材資源: val('t6Resources'),
      表7_師資安排: val('t7Faculty'),
      表8_評量方式: val('t8Assessment'),
      表9_執行人員: val('t9Staff'),
      表10_試辦成果: val('t10Results'),
      表11_學習證據: val('t11Evidence'),
      表12_結訓標準: val('t12Graduation'),
      填寫章節: section,
      簽名日期: val('signDate'),
    };
  }

  function resolveMemberName(urlName) {
    if (urlName) return urlName;
    const n = val('coverName') || val('fieldName');
    return n || '（未填姓名）';
  }

  function sendToGas(payload) {
    return fetch(gasUrl(), {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  }

  window.printFormPdf = function () {
    const ok = document.getElementById('submitSuccess');
    if (ok) ok.style.display = 'none';
    window.print();
  };

  function taiwanDateStr(iso) {
    return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  }

  function showSubmitSuccess(memberName, dateStr) {
    const ok = document.getElementById('submitSuccess');
    const sheetTab = wsCfg().sheetTab || 'icap-report-worksheet';
    if (!ok) {
      alert('寫入成功！講師學習單已傳送至主辦單位試算表（分頁 ' + sheetTab + '）。');
      return;
    }
    ok.style.display = 'flex';
    document.getElementById('submitSuccessName').textContent = memberName;
    document.getElementById('submitSuccessDate').textContent = dateStr;
    const note = document.getElementById('submitSuccessNote');
    if (note) note.textContent = '答案已寫入主辦單位 Google 試算表（分頁 ' + sheetTab + '）。';
    const hint = document.getElementById('submitPdfHint');
    if (hint) {
      const prefix = wsCfg().dateFilePrefix || 'icap-report';
      hint.textContent = '建議檔名：' + prefix + '_報告書學習單_' + memberName + '_' + dateStr + '.pdf';
    }
  }

  window.submitReportWizardWorksheet = async function () {
    const root = document.querySelector('.doc') || document.body;
    const urlInfo = getMemberFromUrl();
    const memberName = resolveMemberName(urlInfo.name);
    const answers = collectAnswers(root);
    const fields = collectFlatFields();

    if (answers.length === 0 && !fields['講師姓名'] && !fields['課程名稱']) {
      alert('尚未填寫任何內容，請先完成填答再提交。');
      return;
    }

    const overlay = document.getElementById('submitOverlay');
    if (overlay) overlay.style.display = 'flex';

    const ft = formType();
    const payload = {
      action: ft,
      formType: ft,
      name: memberName,
      role: urlInfo.role,
      timestamp: new Date().toISOString(),
      courseName: fields['課程名稱'],
      answerCount: answers.length,
      fields: fields,
      answers: answers,
      pageUrl: window.location.href,
    };

    try {
      await sendToGas(payload);
      if (overlay) overlay.style.display = 'none';
      showSubmitSuccess(memberName, taiwanDateStr(payload.timestamp));
    } catch (error) {
      console.error('網路錯誤：', error);
      if (overlay) overlay.style.display = 'none';
      alert('傳送失敗，請檢查網路連線。您仍可列印本頁另存 PDF，交回工作人員。');
    }
  };

  document.addEventListener('DOMContentLoaded', () => {
    const ft = document.body.dataset.formType;
    if (!ft) return;

    const backHref = document.body.dataset.backHref || './index.html';
    const bar = document.createElement('div');
    bar.id = 'submitBar';
    bar.innerHTML =
      '<div class="submit-bar-inner">' +
      '<span class="submit-bar-label">報告書講師學習單｜線上填寫</span>' +
      '<button type="button" class="submit-btn" onclick="submitReportWizardWorksheet()">提交學習單</button>' +
      '<a href="' + backHref + '" class="submit-back">返回索引</a>' +
      '</div>';
    document.body.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.id = 'submitOverlay';
    overlay.innerHTML = '<div class="submit-spinner"></div><p>正在傳送講師學習單…</p>';
    document.body.appendChild(overlay);

    const sheetTab = wsCfg().sheetTab || 'icap-report-worksheet';
    const success = document.createElement('div');
    success.id = 'submitSuccess';
    success.innerHTML =
      '<div class="submit-success-box">' +
      '<h3>講師學習單已送出</h3>' +
      '<p><strong id="submitSuccessName"></strong>｜<span id="submitSuccessDate"></span></p>' +
      '<p class="submit-success-note" id="submitSuccessNote">答案已寫入主辦單位 Google 試算表（分頁 ' + sheetTab + '）。</p>' +
      '<p class="submit-success-pdf"><strong>建議備份（可選）</strong></p>' +
      '<ol class="submit-success-steps">' +
      '<li>點下方「列印／存 PDF」留存個人副本</li>' +
      '<li>亦可交回紙本簽名版給工作人員</li>' +
      '</ol>' +
      '<p class="submit-success-filename" id="submitPdfHint"></p>' +
      '<div class="submit-success-actions">' +
      '<button type="button" class="submit-print-btn" onclick="printFormPdf()">列印／存 PDF</button>' +
      '<button type="button" class="submit-close-btn" onclick="document.getElementById(\'submitSuccess\').style.display=\'none\'">關閉</button>' +
      '</div></div>';
    document.body.appendChild(success);

    const p = new URLSearchParams(location.search);
    const name = p.get('name');
    if (name) {
      const n = decodeURIComponent(name);
      ['coverName', 'fieldName'].forEach((id) => {
        const el = document.getElementById(id);
        if (el && !el.value) el.value = n;
      });
    }
  });
})();
