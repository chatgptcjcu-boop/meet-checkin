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

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function personName(personId, fallback) {
    const person = (state.personnel || []).find((p) => p.id === personId);
    return person ? person.name : fallback || '—';
  }

  function fillPersonnel() {
    document.getElementById('personId').innerHTML = (state.personnel || [])
      .map((p) => {
        const ready = p.email && p.bankCode && p.bank && p.branch && p.account && p.accountName ? ' ✓' : ' ⚠';
        return '<option value="' + esc(p.id) + '">' + esc(p.name) + '（' + esc(p.role) + '）' + ready + '</option>';
      })
      .join('');
  }

  function payableEntries() {
    return (state.entries || []).filter((e) => e.status === '已核准' && !e.transferId);
  }

  function groupedPayables() {
    const groups = new Map();
    payableEntries().forEach((e) => {
      const key = e.personId || '__unknown__';
      if (!groups.has(key)) {
        groups.set(key, { personId: e.personId || '', name: personName(e.personId, e.submitter), entries: [], amount: 0 });
      }
      const g = groups.get(key);
      g.entries.push(e);
      g.amount += Number(e.amount) || 0;
    });
    return Array.from(groups.values()).sort((a, b) => b.amount - a.amount);
  }

  function renderPayables() {
    const groups = groupedPayables();
    const total = groups.reduce((sum, g) => sum + g.amount, 0);
    const count = groups.reduce((sum, g) => sum + g.entries.length, 0);
    document.getElementById('payableSummary').innerHTML = [
      ['待付支領人', groups.length + ' 人'],
      ['待付筆數', count + ' 筆'],
      ['待付金額', '$' + EF.fmtMoney(total)],
    ]
      .map(
        ([label, val]) =>
          '<div class="summary-card"><div class="label">' +
          label +
          '</div><div class="val">' +
          val +
          '</div></div>'
      )
      .join('');

    const tbody = document.querySelector('#payableTable tbody');
    tbody.innerHTML = groups.length
      ? groups
          .map((g) => {
            const details = g.entries
              .map((e) => esc(EF.formatDateZh(e.date) + ' ' + (e.category || '') + ' $' + EF.fmtMoney(e.amount) + ' ' + (e.note || '')))
              .join('<br>');
            return (
              '<tr><td>' +
              esc(g.name) +
              '</td><td>' +
              g.entries.length +
              '</td><td>$' +
              EF.fmtMoney(g.amount) +
              '</td><td>' +
              details +
              '</td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="4" style="text-align:center;color:#64748b">目前沒有已核准且未出帳的記帳明細</td></tr>';
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
              esc(EF.formatDateZh(t.date)) +
              '</td><td>' +
              esc(person ? person.name : t.personName || '—') +
              '</td><td>' +
              esc(t.type || '') +
              '</td><td>' +
              esc(t.purpose || '') +
              (t.sourceEntryIds && t.sourceEntryIds.length ? '<br><small>含記帳 ' + t.sourceEntryIds.length + ' 筆</small>' : '') +
              '</td><td>$' +
              EF.fmtMoney(t.amount) +
              '</td><td>' +
              esc(t.status || '待撥款') +
              (t.notifiedAt ? '<br><small>通知：' + esc(t.notifiedAt) + '</small>' : '') +
              '</td><td class="no-print"><button type="button" class="btn-sm primary notify-t" data-id="' +
              esc(t.id) +
              '"' +
              (t.status === '已通知撥款' ? ' disabled' : '') +
              '>通知撥款</button> <button type="button" class="btn-sm void-t" data-id="' +
              esc(t.id) +
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
          (state.entries || []).forEach((e) => {
            if ((t.sourceEntryIds || []).includes(e.id) && e.status !== '作廢') {
              e.status = '已核准';
              delete e.transferId;
            }
          });
          EF.saveState(state);
          render();
          renderPayables();
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
      sourceEntryIds: [],
    });
    EF.saveState(state);
    document.getElementById('tAmount').value = '';
    document.getElementById('tPurpose').value = '';
    document.getElementById('tNote').value = '';
    render();
    renderPayables();
    setStatus('已登記出帳', true);
  });

  document.getElementById('btnCreateTransfers').addEventListener('click', () => {
    const groups = groupedPayables();
    if (!groups.length) {
      setStatus('沒有可產生匯款的已核准記帳');
      return;
    }
    if (!confirm('依支領人產生 ' + groups.length + ' 筆匯款出帳？')) return;

    groups.forEach((g) => {
      const transferId = EF.uid('tr');
      state.transfers = state.transfers || [];
      state.transfers.push({
        id: transferId,
        personId: g.personId,
        personName: g.name,
        date: new Date().toISOString().slice(0, 10),
        amount: g.amount,
        type: '匯款',
        purpose: '代墊支出／業務費彙總（' + g.entries.length + ' 筆）',
        note: g.entries.map((e) => (e.category || '') + ':' + (e.note || '')).filter(Boolean).join('；'),
        status: '待撥款',
        sourceEntryIds: g.entries.map((e) => e.id),
      });
      g.entries.forEach((e) => {
        e.status = '已排入出帳';
        e.transferId = transferId;
      });
    });

    EF.saveState(state);
    render();
    renderPayables();
    setStatus('已依支領人產生匯款批次（請確認後儲存到雲端）', true);
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
    if (!person.bankCode || !person.bank || !person.branch || !person.account || !person.accountName) {
      setStatus('收款人銀行代碼、銀行、分行、帳號或戶名未完整，請先確認帳戶資料');
      return;
    }
    if (!confirm('確認今日已撥付款項，並寄送 Email 通知給 ' + person.name + '？')) return;

    setStatus('寄送撥款通知中…');
    try {
      transfer.status = '已通知撥款';
      transfer.notifiedAt = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 16);
      (state.entries || []).forEach((e) => {
        if ((transfer.sourceEntryIds || []).includes(e.id)) {
          e.status = '已匯款';
          e.transferId = transfer.id;
          e.paidAt = transfer.notifiedAt;
        }
      });
      EF.saveState(state);
      await EF.saveCloud(state, '撥款通知');
      await EF.notifyTransfer(transfer, person);
      render();
      renderPayables();
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
  renderPayables();
  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      fillPersonnel();
      render();
      renderPayables();
    }
  });
})();
