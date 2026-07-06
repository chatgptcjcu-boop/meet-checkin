(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('expense-entry.html');

  let state = EF.loadState();
  let events = [];

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
      .map((p) => '<option value="' + p.id + '">' + p.name + '（' + p.role + '）</option>')
      .join('');
  }

  function fillEventSelect() {
    const sel = document.getElementById('eventId');
    sel.innerHTML =
      '<option value="">—</option>' +
      events
        .map((e) => '<option value="' + e.id + '">' + e.date + ' ' + e.title + '</option>')
        .join('');
  }

  function renderTable() {
    const tbody = document.querySelector('#entryTable tbody');
    const rows = (state.entries || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = rows.length
      ? rows
          .map((e) => {
            const person = (state.personnel || []).find((p) => p.id === e.personId);
            return (
              '<tr data-id="' +
              e.id +
              '"><td>' +
              EF.formatDateZh(e.date) +
              '</td><td>' +
              (person ? person.name : e.submitter) +
              '</td><td>' +
              (e.category || '') +
              '</td><td>$' +
              EF.fmtMoney(e.amount) +
              '</td><td>' +
              (e.note || '') +
              '</td><td><select class="entry-status no-print" data-id="' +
              e.id +
              '"><option' +
              (e.status === '待審' ? ' selected' : '') +
              '>待審</option><option' +
              (e.status === '已核准' ? ' selected' : '') +
              '>已核准</option><option' +
              (e.status === '已匯款' ? ' selected' : '') +
              '>已匯款</option><option' +
              (e.status === '作廢' ? ' selected' : '') +
              '>作廢</option></select><span class="print-only">' +
              (e.status || '待審') +
              '</span></td><td class="no-print"><button type="button" class="btn-sm del-entry" data-id="' +
              e.id +
              '">刪除</button></td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="7" style="text-align:center;color:#64748b">尚無登錄</td></tr>';

    tbody.querySelectorAll('.entry-status').forEach((sel) => {
      sel.addEventListener('change', () => {
        const entry = state.entries.find((x) => x.id === sel.dataset.id);
        if (entry) {
          entry.status = sel.value;
          persist();
        }
      });
    });
    tbody.querySelectorAll('.del-entry').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('確定刪除此筆？')) return;
        state.entries = state.entries.filter((x) => x.id !== btn.dataset.id);
        persist();
        renderTable();
      });
    });
  }

  document.getElementById('entryDate').value = new Date().toISOString().slice(0, 10);

  document.getElementById('entryForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const personId = document.getElementById('submitter').value;
    const person = (state.personnel || []).find((p) => p.id === personId);
    state.entries.push({
      id: EF.uid('ent'),
      personId,
      submitter: person ? person.name : '',
      date: document.getElementById('entryDate').value,
      category: document.getElementById('category').value,
      amount: Number(document.getElementById('amount').value) || 0,
      note: document.getElementById('note').value.trim(),
      eventId: document.getElementById('eventId').value,
      status: '待審',
    });
    persist();
    document.getElementById('amount').value = '';
    document.getElementById('note').value = '';
    renderTable();
    setStatus('已登錄（記得按「儲存到雲端」）', true);
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    try {
      await EF.saveCloud(state, document.getElementById('submitter').selectedOptions[0]?.text || '');
      setStatus('已儲存到雲端 ✓', true);
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

  fillPersonnelSelect();
  renderTable();

  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      fillPersonnelSelect();
      renderTable();
    }
  });
})();
