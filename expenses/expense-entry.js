(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('expense-entry.html');
  const isWorkerMode = new URLSearchParams(location.search).get('worker') === '1';

  let state = EF.loadState();
  let pendingSubmissions = [];
  let events = [];

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  function persist() {
    EF.saveState(state);
  }

  function fillPersonnelSelect() {
    const sel = document.getElementById('submitter');
    sel.innerHTML = (state.personnel || [])
      .filter((p) => p.role === '工讀生' || p.role === '專案人員')
      .map((p) => '<option value="' + esc(p.id) + '">' + esc(p.name) + '（' + esc(p.role) + '）</option>')
      .join('');
  }

  function fillEventSelect() {
    const sel = document.getElementById('eventId');
    sel.innerHTML =
      '<option value="">—</option>' +
      events
        .map((e) => '<option value="' + esc(e.id) + '">' + esc(e.date) + ' ' + esc(e.title) + '</option>')
        .join('');
  }

  function applyMode() {
    if (!isWorkerMode) return;
    document.querySelector('.top-bar h1').textContent = '工讀生支出送出';
    document.getElementById('financeNav').hidden = true;
    document.getElementById('btnSyncPending').hidden = true;
    document.getElementById('btnSaveCloud').hidden = true;
    document.getElementById('pendingPanel').hidden = true;
    document.getElementById('officialPanel').hidden = true;
    document.getElementById('entryHelp').textContent =
      '請填寫支出資料並送出給主辦審核。送出後系統會通知主辦，確認後才會匯入正式經費管理。';
  }

  function renderOfficialEntries() {
    const tbody = document.querySelector('#entryTable tbody');
    const rows = (state.entries || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = rows.length
      ? rows
          .map((e) => {
            const person = (state.personnel || []).find((p) => p.id === e.personId);
            return (
              '<tr data-id="' +
              esc(e.id) +
              '"><td>' +
              esc(EF.formatDateZh(e.date)) +
              '</td><td>' +
              esc(person ? person.name : e.submitter) +
              '</td><td>' +
              esc(e.category || '') +
              '</td><td>$' +
              esc(EF.fmtMoney(e.amount)) +
              '</td><td>' +
              esc(e.note || '') +
              '</td><td><select class="entry-status no-print" data-id="' +
              esc(e.id) +
              '"><option' +
              (e.status === '待審' ? ' selected' : '') +
              '>待審</option><option' +
              (e.status === '已核准' ? ' selected' : '') +
              '>已核准</option><option' +
              (e.status === '已排入出帳' ? ' selected' : '') +
              '>已排入出帳</option><option' +
              (e.status === '已匯款' ? ' selected' : '') +
              '>已匯款</option><option' +
              (e.status === '作廢' ? ' selected' : '') +
              '>作廢</option></select><span class="print-only">' +
              esc(e.status || '已核准') +
              '</span></td><td class="no-print"><button type="button" class="btn-sm del-entry" data-id="' +
              esc(e.id) +
              '">刪除</button></td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="7" style="text-align:center;color:#64748b">尚無正式記帳</td></tr>';

    tbody.querySelectorAll('.entry-status').forEach((sel) => {
      sel.addEventListener('change', () => {
        const entry = state.entries.find((x) => x.id === sel.dataset.id);
        if (entry) {
          entry.status = sel.value;
          if (sel.value === '已核准') {
            delete entry.transferId;
            delete entry.paidAt;
          }
          persist();
        }
      });
    });
    tbody.querySelectorAll('.del-entry').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('確定刪除此筆正式記帳？')) return;
        state.entries = state.entries.filter((x) => x.id !== btn.dataset.id);
        persist();
        renderOfficialEntries();
      });
    });
  }

  function renderPendingSubmissions() {
    const tbody = document.querySelector('#pendingTable tbody');
    const rows = pendingSubmissions
      .slice()
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

    tbody.innerHTML = rows.length
      ? rows
          .map((s) => {
            const isImported = s.status === '已匯入';
            return (
              '<tr data-id="' +
              esc(s.id) +
              '"><td>' +
              esc(s.submittedAt || '') +
              '</td><td>' +
              esc(EF.formatDateZh(s.date)) +
              '</td><td>' +
              esc(s.submitter || '') +
              '</td><td>' +
              esc(s.category || '') +
              '</td><td>$' +
              esc(EF.fmtMoney(s.amount)) +
              '</td><td>' +
              esc(s.note || '') +
              '</td><td>' +
              esc(s.status || '待匯入') +
              '</td><td><button type="button" class="btn-sm primary import-entry" data-id="' +
              esc(s.id) +
              '"' +
              (isImported ? ' disabled' : '') +
              '>' +
              (isImported ? '已匯入' : '確認收到並匯入') +
              '</button></td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="8" style="text-align:center;color:#64748b">目前沒有待審送出</td></tr>';

    tbody.querySelectorAll('.import-entry').forEach((btn) => {
      btn.addEventListener('click', () => importSubmission(btn.dataset.id));
    });
  }

  function submissionToEntry(submission) {
    const payload = submission.payload || submission;
    return {
      id: EF.uid('ent'),
      importedFromSubmissionId: submission.id,
      personId: payload.personId || submission.personId || '',
      submitter: payload.submitter || submission.submitter || '',
      date: payload.date || submission.date || '',
      category: payload.category || submission.category || '',
      amount: Number(payload.amount || submission.amount) || 0,
      note: payload.note || submission.note || '',
      eventId: payload.eventId || submission.eventId || '',
      status: '已核准',
    };
  }

  async function loadPendingSubmissions(showStatus) {
    try {
      pendingSubmissions = await EF.syncEntrySubmissions();
      renderPendingSubmissions();
      if (showStatus) setStatus('已同步送審清單 ✓', true);
    } catch (e) {
      setStatus('同步送審清單失敗：' + e.message);
    }
  }

  async function importSubmission(submissionId) {
    const submission = pendingSubmissions.find((s) => s.id === submissionId);
    if (!submission || submission.status === '已匯入') return;
    if (!confirm('確認已收到這筆資料，並匯入正式總帳？')) return;

    setStatus('匯入中…');
    try {
      const cloud = await EF.syncCloud(true);
      if (cloud) state = cloud;
      state.entries = state.entries || [];

      const exists = state.entries.some((e) => e.importedFromSubmissionId === submissionId);
      if (!exists) {
        state.entries.push(submissionToEntry(submission));
      }

      await EF.saveCloud(state, '主辦匯入工讀生記帳');
      await EF.markEntrySubmission(submissionId, '已匯入');
      persist();
      renderOfficialEntries();
      await loadPendingSubmissions(false);
      setStatus('已確認收到並匯入正式總帳 ✓', true);
    } catch (e) {
      setStatus('匯入失敗：' + e.message);
    }
  }

  document.getElementById('entryDate').value = new Date().toISOString().slice(0, 10);

  document.getElementById('entryForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const submitBtn = ev.submitter || ev.target.querySelector('button[type="submit"]');
    const personId = document.getElementById('submitter').value;
    const person = (state.personnel || []).find((p) => p.id === personId);
    const submission = {
      id: EF.uid('sub'),
      personId,
      submitter: person ? person.name : '',
      date: document.getElementById('entryDate').value,
      category: document.getElementById('category').value,
      amount: Number(document.getElementById('amount').value) || 0,
      note: document.getElementById('note').value.trim(),
      eventId: document.getElementById('eventId').value,
      status: '待匯入',
    };

    if (!submission.amount) {
      setStatus('請填寫金額');
      return;
    }

    setStatus('送出中…');
    if (submitBtn) submitBtn.disabled = true;
    try {
      await EF.submitEntrySubmission(submission);
      document.getElementById('amount').value = '';
      document.getElementById('note').value = '';
      setStatus('已送出給主辦審核，系統會寄信通知 ✓', true);
      if (!isWorkerMode) await loadPendingSubmissions(false);
    } catch (e) {
      setStatus('送出失敗：' + e.message);
    } finally {
      if (submitBtn) submitBtn.disabled = false;
    }
  });

  document.getElementById('btnSyncPending').addEventListener('click', () => {
    loadPendingSubmissions(true);
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    try {
      await EF.saveCloud(state, '記帳登錄');
      setStatus('正式總帳已儲存到雲端 ✓', true);
    } catch (e) {
      setStatus('儲存失敗：' + e.message);
    }
  });

  fetch('../config/events-registry.json')
    .then((r) => r.json())
    .then((json) => {
      events = json.events || [];
      fillEventSelect();
    })
    .catch(() => {});

  applyMode();
  fillPersonnelSelect();
  renderOfficialEntries();
  renderPendingSubmissions();

  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      fillPersonnelSelect();
      renderOfficialEntries();
    }
  });
  if (!isWorkerMode) loadPendingSubmissions(false);
})();
