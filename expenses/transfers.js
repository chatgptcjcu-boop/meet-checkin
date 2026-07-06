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
      .map((p) => {
        const ready = p.email && p.bank && p.account ? ' ✓' : ' ⚠';
        return '<option value="' + p.id + '">' + p.name + '（' + p.role + '）' + ready + '</option>';
      })
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
              (t.status || '待撥款') +
              (t.notifiedAt ? '<br><small>通知：' + t.notifiedAt + '</small>' : '') +
              '</td><td class="no-print"><button type="button" class="btn-sm primary notify-t" data-id="' +
              t.id +
              '"' +
              (t.status === '已通知撥款' ? ' disabled' : '') +
              '>通知撥款</button> <button type="button" class="btn-sm void-t" data-id="' +
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
    tbody.querySelectorAll('.notify-t').forEach((btn) => {
      btn.addEventListener('click', () => notifyTransfer(btn.dataset.id));
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
      status: '待撥款',
    });
    EF.saveState(state);
    document.getElementById('tAmount').value = '';
    document.getElementById('tPurpose').value = '';
    document.getElementById('tNote').value = '';
    render();
    setStatus('已登記出帳', true);
  });

  async function notifyTransfer(id) {
    const transfer = (state.transfers || []).find((t) => t.id === id);
    if (!transfer || transfer.status === '作廢') return;
    const person = (state.personnel || []).find((p) => p.id === transfer.personId);
    if (!person) {
      setStatus('找不到收款人');
      return;
    }
    if (!person.email) {
      setStatus('收款人尚未設定 Email，請先到人員帳戶或個人入口補齊');
      return;
    }
    if (!person.bank || !person.account) {
      setStatus('收款人銀行或帳號未完整，請先確認帳戶資料');
      return;
    }
    if (!confirm('確認今日已撥付款項，並寄送 Email 通知給 ' + person.name + '？')) return;

    setStatus('寄送撥款通知中…');
    try {
      transfer.status = '已通知撥款';
      transfer.notifiedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 16);
      EF.saveState(state);
      await EF.saveCloud(state, '撥款通知');
      await EF.notifyTransfer(transfer, person);
      render();
      setStatus('已寄送撥款通知並儲存總帳 ✓', true);
    } catch (e) {
      setStatus('通知失敗：' + e.message);
    }
  }

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
