/**
 * 730 講師學習單 — 提交至 Google 試算表（與 remote-members 共用 GAS）
 * formType / action: '730-instructor'
 */
(function () {
  function cfg() {
    return window.EVENT_CONFIG || {};
  }

  function wsCfg() {
    return cfg().instructorWorksheet730 || {};
  }

  function gasUrl() {
    return cfg().backend?.gasWebAppUrl || '';
  }

  function formType() {
    return wsCfg().formType || '730-instructor';
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
    const ws = wsCfg();
    return {
      講師姓名: val('coverName') || val('fieldName'),
      服務單位宮廟: val('coverTemple') || val('fieldTemple'),
      示範單元: ws.demoUnit || 'M1-1.1',
      活動日期: ws.dateDisplay || '115/07/30',
      職稱: val('fieldTitle'),
      聯絡電話: val('fieldPhone'),
      Email: val('fieldEmail'),
      出席方式: val('fieldAttendance'),
      編審經驗: radioVal('exp'),
      Demo目的理解: checkedLabels('input[name="demoGoal"]'),
      壹章簽名日期: val('sec1SignDate'),
      緒論導入: val('contentIntro'),
      核心概念: val('contentCore'),
      案例故事: val('contentCase'),
      演練活動: val('contentActivity'),
      總結: val('contentSummary'),
      步驟1: val('step1'),
      步驟2: val('step2'),
      步驟3: val('step3'),
      步驟4: val('step4'),
      步驟5: val('step5'),
      步驟6: val('step6'),
      最難教段落: val('hardestSegment'),
      ABCD_A: val('abcdA'),
      ABCD_B: val('abcdB'),
      ABCD_C: val('abcdC'),
      ABCD_D: val('abcdD'),
      B欄可評量: radioVal('abcd'),
      修訂說明: val('abcdNote'),
      教學方式: checkedLabels('input[name="methods"]'),
      時間比例: val('methodRatio'),
      學習單設計: val('worksheetInClass'),
      學習單產出: val('worksheetTakeaway'),
      選擇題1: val('mc1'),
      選擇題2: val('mc2'),
      簡答題1: val('shortAnswer1'),
      勾選建檔: val('checklistArchive'),
      Rubrics達標描述: val('rubricPassDesc'),
      Rubrics達標分數: val('rubricPassScore'),
      Rubrics待加強描述: val('rubricNeedDesc'),
      Rubrics待加強分數: val('rubricNeedScore'),
      流程理解: checkedLabels('input[name="workflow"]'),
      協作平台: val('collabPlatform'),
      陸章簽名日期: val('sec6SignDate'),
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
    if (!ok) {
      alert('寫入成功！講師學習單已傳送至主辦單位試算表。');
      return;
    }
    ok.style.display = 'flex';
    document.getElementById('submitSuccessName').textContent = memberName;
    document.getElementById('submitSuccessDate').textContent = dateStr;
    const hint = document.getElementById('submitPdfHint');
    if (hint) {
      const prefix = wsCfg().dateFilePrefix || cfg().event?.dateFilePrefix || '1150730';
      hint.textContent = '建議檔名：' + prefix + '_講師學習單_' + memberName + '_' + dateStr + '.pdf';
    }
  }

  window.submitInstructorWorksheet = async function () {
    const root = document.querySelector('.doc') || document.body;
    const urlInfo = getMemberFromUrl();
    const memberName = resolveMemberName(urlInfo.name);
    const answers = collectAnswers(root);
    const fields = collectFlatFields();

    if (answers.length === 0 && !fields['講師姓名']) {
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
      demoUnit: fields['示範單元'],
      eventDate: fields['活動日期'],
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

    const bar = document.createElement('div');
    bar.id = 'submitBar';
    bar.innerHTML =
      '<div class="submit-bar-inner">' +
      '<span class="submit-bar-label">講師學習單｜線上填寫</span>' +
      '<button type="button" class="submit-btn" onclick="submitInstructorWorksheet()">提交學習單</button>' +
      '<a href="./index.html" class="submit-back">返回索引</a>' +
      '</div>';
    document.body.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.id = 'submitOverlay';
    overlay.innerHTML = '<div class="submit-spinner"></div><p>正在傳送講師學習單…</p>';
    document.body.appendChild(overlay);

    const success = document.createElement('div');
    success.id = 'submitSuccess';
    success.innerHTML =
      '<div class="submit-success-box">' +
      '<h3>講師學習單已送出</h3>' +
      '<p><strong id="submitSuccessName"></strong>｜<span id="submitSuccessDate"></span></p>' +
      '<p class="submit-success-note">答案已寫入主辦單位 Google 試算表（分頁 instructor-730）。</p>' +
      '<p class="submit-success-pdf"><strong>建議備份（可選）</strong></p>' +
      '<ol class="submit-success-steps">' +
      '<li>點下方「列印／存 PDF」留存個人副本</li>' +
      '<li>會議結束前亦可交回紙本簽名版給工作人員</li>' +
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
