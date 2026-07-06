(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('transfers.html');
  let state = EF.loadState();

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  function fillPersonnel() {
    document.getElementById('personId').innerHTML = (state.personnel || [])
      .map((p) => '<option value="' + p.id + '">' + p.name + '（' + p.role + '）</option>')
      .join('');
  }

  function render() {
    const tbody = document.querySelector('#transferTable tbody');
    const rows = (state.transfers || []).slice().sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    tbody.innerHTML = rows.length
      ? rows
          .map((t) => {
            const person = (state.personnel || []).find((p) => p.id === t.personId);
            return (
              '<tr><td>' +
              EF.formatDateZh(t.date) +
              '</td><td>' +
              (person ? person.name : t.personName || '—') +
              '</td><td>' +
              (t.type || '') +
              '</td><td>' +
              (t.purpose || '') +
              '</td><td>$' +
              EF.fmtMoney(t.amount) +
              '</td><td>' +
              (t.status || '已登記') +
              '</td><td class="no-print"><button type="button" class="btn-sm void-t" data-id="' +
              t.id +
              '">作廢</button></td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="7" style="text-align:center;color:#64748b">尚無出帳</td></tr>';

    tbody.querySelectorAll('.void-t').forEach((btn) => {
      btn.addEventListener('click', () => {
        const t = state.transfers.find((x) => x.id === btn.dataset.id);
        if (t && confirm('確定作廢此筆？')) {
          t.status = '作廢';
          EF.saveState(state);
          render();
        }
      });
    });
  }

  document.getElementById('tDate').value = new Date().toISOString().slice(0, 10);

  document.getElementById('transferForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const personId = document.getElementById('personId').value;
    const person = (state.personnel || []).find((p) => p.id === personId);
    state.transfers.push({
      id: EF.uid('tr'),
      personId,
      personName: person ? person.name : '',
      date: document.getElementById('tDate').value,
      amount: Number(document.getElementById('tAmount').value) || 0,
      type: document.getElementById('tType').value,
      purpose: document.getElementById('tPurpose').value.trim(),
      note: document.getElementById('tNote').value.trim(),
      status: '已登記',
    });
    EF.saveState(state);
    document.getElementById('tAmount').value = '';
    document.getElementById('tPurpose').value = '';
    document.getElementById('tNote').value = '';
    render();
    setStatus('已登記出帳', true);
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    try {
      await EF.saveCloud(state, '出帳紀錄');
      setStatus('已儲存到雲端 ✓', true);
    } catch (e) {
      setStatus('儲存失敗：' + e.message);
    }
  });

  fillPersonnel();
  render();
  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      fillPersonnel();
      render();
    }
  });
})();
