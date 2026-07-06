(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('ledger-overview.html');

  function render(state) {
    const s = EF.calcSummary(state);
    document.getElementById('summaryCards').innerHTML = [
      ['已入帳', s.deposits, 'var(--green)'],
      ['已核准實際', s.entriesLogged, '#6366f1'],
      ['待付款', s.unpaidEntries, '#b45309'],
      ['已匯出／出帳', s.transfersOut, '#0f766e'],
      ['規劃動支', s.planned, '#64748b'],
      ['預算餘額', s.available, s.available >= 0 ? 'var(--green)' : '#b91c1c'],
      ['帳戶現金餘額', s.cashBalance, s.cashBalance >= 0 ? 'var(--green)' : '#b91c1c'],
    ]
      .map(
        ([label, val, color]) =>
          '<div class="summary-card"><div class="label">' +
          label +
          '</div><div class="val" style="color:' +
          color +
          '">$' +
          EF.fmtMoney(val) +
          '</div></div>'
      )
      .join('');

    const depBody = document.querySelector('#depositTable tbody');
    depBody.innerHTML = (state.ledger.deposits || [])
      .map(
        (d) =>
          '<tr><td>' +
          EF.formatDateZh(d.date) +
          '</td><td>$' +
          EF.fmtMoney(d.amount) +
          '</td><td>' +
          (d.note || '') +
          '</td></tr>'
      )
      .join('');

    const recent = []
      .concat(
        (state.transfers || []).map((t) => ({
          date: t.date,
          type: '匯款出帳',
          who: t.personName || t.purpose,
          amount: t.amount,
          status: t.status || '已登記',
        }))
      )
      .concat(
        (state.entries || []).map((e) => ({
          date: e.date,
          type: '記帳',
          who: e.submitter + '／' + (e.category || ''),
          amount: e.amount,
          status: e.status || '待審',
        }))
      )
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 12);

    document.querySelector('#recentTable tbody').innerHTML = recent.length
      ? recent
          .map(
            (r) =>
              '<tr><td>' +
              EF.formatDateZh(r.date) +
              '</td><td>' +
              r.type +
              '</td><td>' +
              r.who +
              '</td><td>$' +
              EF.fmtMoney(r.amount) +
              '</td><td>' +
              r.status +
              '</td></tr>'
          )
          .join('')
      : '<tr><td colspan="5" style="text-align:center;color:#64748b">尚無紀錄</td></tr>';
  }

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  let state = EF.loadState();
  render(state);

  document.getElementById('btnSync').addEventListener('click', async () => {
    setStatus('同步中…');
    try {
      const cloud = await EF.syncCloud();
      state = cloud || EF.loadState();
      render(state);
      setStatus('已同步雲端最新資料 ✓', true);
    } catch (e) {
      setStatus('同步失敗：' + e.message);
    }
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    setStatus('儲存中…');
    try {
      await EF.saveCloud(state, '總帳概覽');
      setStatus('已儲存到雲端 ✓', true);
    } catch (e) {
      setStatus('儲存失敗：' + e.message);
    }
  });

  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      render(state);
    }
  });
})();
