/**
 * 視訊委員填答手冊 — 提交至 Google 試算表（與簽到共用 GAS）
 * formType: '填答-正文' | '填答-附錄'
 */
(function () {
  const GAS_URL =
    'https://script.google.com/macros/s/AKfycbwYmxBxC34KK02UFW54hSX-VneckfVVm6rsTyEhCtCkamVvHmTf023EpmCydHyAsbV2WA/exec';

  function getMemberFromUrl() {
    const p = new URLSearchParams(window.location.search);
    return {
      name: p.get('name') ? decodeURIComponent(p.get('name')) : '',
      role: p.get('role') ? decodeURIComponent(p.get('role')) : '評核委員',
    };
  }

  function collectAnswers(root) {
    const blocks = [];
    root.querySelectorAll('.q, .scope-body, .resolution').forEach((el, idx) => {
      const titleEl = el.querySelector('.q-title, .res-title, .scope-head');
      const title = titleEl ? titleEl.textContent.trim() : `區塊${idx + 1}`;
      const entry = { title, fields: [] };

      el.querySelectorAll('.field').forEach((field) => {
        const label = field.querySelector('label');
        const labelText = label ? label.textContent.trim() : '';
        const inputs = field.querySelectorAll('input, textarea, select');
        inputs.forEach((inp) => {
          if (inp.type === 'radio' || inp.type === 'checkbox') {
            if (inp.checked) {
              const val =
                inp.value ||
                (inp.parentElement ? inp.parentElement.textContent.trim() : '已選');
              entry.fields.push({ label: labelText || '選項', value: val });
            }
          } else if (inp.value && inp.value.trim()) {
            entry.fields.push({ label: labelText, value: inp.value.trim() });
          }
        });
      });

      el.querySelectorAll(':scope > .opts').forEach((opts) => {
        const checked = [];
        opts.querySelectorAll('input:checked').forEach((inp) => {
          const t = inp.parentElement ? inp.parentElement.textContent.trim() : inp.value;
          checked.push(t);
        });
        if (checked.length) entry.fields.push({ label: '選項', value: checked.join('、') });
      });

      el.querySelectorAll(':scope > textarea.online-textarea, :scope > textarea.write-box').forEach((ta) => {
        if (ta.value.trim()) entry.fields.push({ label: title, value: ta.value.trim() });
      });

      if (entry.fields.length) blocks.push(entry);
    });

    /* 附錄：86 單元必要度 */
    root.querySelectorAll('.units-full tbody tr').forEach((tr) => {
      const code = tr.querySelector('.code');
      const title = tr.querySelector('.title');
      const need = tr.querySelector('.need input:checked');
      const note = tr.querySelector('.note-input');
      if (!code || !need) return;
      blocks.push({
        title: `單元 ${code.textContent.trim()}`,
        fields: [
          { label: '名稱', value: title ? title.textContent.trim() : '' },
          { label: '必要度', value: need.value || need.parentElement.textContent.trim() },
          ...(note && note.value.trim() ? [{ label: '備註', value: note.value.trim() }] : []),
        ],
      });
    });

    return blocks;
  }

  function resolveMemberName(root, urlName) {
    if (urlName) return urlName;
    const first = root.querySelector('.online-input, input.write-line');
    if (first && first.value.trim()) return first.value.trim();
    return '（未填姓名）';
  }

  function sendToGas(payload) {
    return fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    }).then(() => {
      console.log('資料已送出！');
    });
  }

  window.printFormPdf = function () {
    const ok = document.getElementById('submitSuccess');
    if (ok) ok.style.display = 'none';
    window.print();
  };

  function showSubmitSuccess(memberName, formType) {
    const ok = document.getElementById('submitSuccess');
    if (ok) {
      ok.style.display = 'flex';
      document.getElementById('submitSuccessName').textContent = memberName;
      document.getElementById('submitSuccessType').textContent = formType;
    } else {
      alert(
        '寫入成功！填答紀錄已傳送至主辦單位試算表。\n\n請使用瀏覽器「列印 → 另存 PDF」留存佐證。'
      );
    }
  }

  /** 檔名用台灣日期（避免 UTC 凌晨仍顯示前一日） */
  function taiwanDateStr(iso) {
    return new Date(iso).toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' });
  }

  function downloadJson(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.submitMeetingForm = async function (formType) {
    const root = document.querySelector('.doc') || document.body;
    const urlInfo = getMemberFromUrl();
    const memberName = resolveMemberName(root, urlInfo.name);
    const answers = collectAnswers(root);

    if (answers.length === 0) {
      alert('尚未填寫任何內容，請先完成填答再提交。');
      return;
    }

    const overlay = document.getElementById('submitOverlay');
    if (overlay) overlay.style.display = 'flex';

    let screenshot = '';
    if (typeof html2canvas !== 'undefined') {
      try {
        const canvas = await html2canvas(root, {
          backgroundColor: '#ffffff',
          scale: 0.75,
          useCORS: true,
          logging: false,
        });
        screenshot = canvas.toDataURL('image/jpeg', 0.55);
      } catch (e) {
        console.warn('截圖失敗', e);
      }
    }

    const record = {
      action: formType,
      name: memberName,
      role: urlInfo.role,
      formType: formType,
      timestamp: new Date().toISOString(),
      answerCount: answers.length,
      answers: answers,
      pageUrl: window.location.href,
      image: screenshot,
    };

    const filename = `宮廟管理師填答_${formType}_${memberName}_${taiwanDateStr(record.timestamp)}.json`;
    downloadJson(record, filename);

    /* 傳 GAS：只送文字答案，不送截圖（JSON 備份仍含截圖） */
    const gasPayload = { ...record };
    delete gasPayload.image;
    gasPayload.imageOmitted = true;

    try {
      await sendToGas(gasPayload);
      try {
        localStorage.setItem(`meet-checkin-${formType}-${memberName}`, JSON.stringify(record));
      } catch (e) {}
      if (overlay) overlay.style.display = 'none';
      showSubmitSuccess(memberName, formType);
    } catch (error) {
      console.error('網路錯誤：', error);
      if (overlay) overlay.style.display = 'none';
      alert('傳送失敗，請檢查網路連線。JSON 備份已下載至您的裝置。');
    }
  };

  /* 固定提交列 */
  document.addEventListener('DOMContentLoaded', () => {
    const formType = document.body.dataset.formType;
    if (!formType) return;

    const bar = document.createElement('div');
    bar.id = 'submitBar';
    bar.innerHTML = `
      <div class="submit-bar-inner">
        <span class="submit-bar-label">${formType}</span>
        <button type="button" class="submit-btn" onclick="submitMeetingForm('${formType}')">提交填答紀錄</button>
        <a href="./index.html" class="submit-back">返回專區</a>
      </div>`;
    document.body.appendChild(bar);

    const overlay = document.createElement('div');
    overlay.id = 'submitOverlay';
    overlay.innerHTML = `<div class="submit-spinner"></div><p>正在打包填答紀錄並傳送…</p>`;
    document.body.appendChild(overlay);

    const success = document.createElement('div');
    success.id = 'submitSuccess';
    success.innerHTML = `
      <div class="submit-success-box">
        <h3>填答紀錄已送出</h3>
        <p><strong id="submitSuccessName"></strong>｜<span id="submitSuccessType"></span></p>
        <p class="submit-success-note">已傳送至主辦單位 Google 試算表，並自動下載 JSON 備份至您的裝置。</p>
        <p class="submit-success-pdf"><strong>請列印另存 PDF</strong>，作為與現場紙本相同的佐證資料留存（正文、附錄各存一份）。</p>
        <p class="submit-success-note">若另需附錄，請完成後同樣點「提交填答紀錄」。會議結束請至首頁簽退。</p>
        <div class="submit-success-actions">
          <button type="button" class="submit-print-btn" onclick="printFormPdf()">列印／存 PDF</button>
          <button type="button" class="submit-close-btn" onclick="document.getElementById('submitSuccess').style.display='none'">關閉</button>
        </div>
      </div>`;
    document.body.appendChild(success);
  });
})();
