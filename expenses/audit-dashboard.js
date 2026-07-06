(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('audit-dashboard.html');

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

  function activePlans(state) {
    return (state.plans || []).filter((p) => p.status !== '取消');
  }

  function entriesForEvent(state, eventId) {
    return (state.entries || []).filter((e) => e.eventId === eventId && e.status !== '待審' && e.status !== '作廢');
  }

  function transfersForEvent(state, eventId) {
    const entryIds = new Set(entriesForEvent(state, eventId).map((e) => e.id));
    return (state.transfers || []).filter((t) => {
      if (t.status === '作廢') return false;
      return (t.sourceEntryIds || []).some((id) => entryIds.has(id));
    });
  }

  function calcMeetingRows(state) {
    return activePlans(state)
      .map((p) => {
        const entries = entriesForEvent(state, p.eventId);
        const transfers = transfersForEvent(state, p.eventId);
        const actual = entries.reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const unpaid = entries
          .filter((e) => e.status === '已核准' || e.status === '已排入出帳')
          .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
        const paid = transfers.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
        const planned = Number(p.amount) || 0;
        return { plan: p, planned, actual, unpaid, paid, diff: planned - actual };
      })
      .sort((a, b) => String(a.plan.eventTitle || a.plan.item || '').localeCompare(String(b.plan.eventTitle || b.plan.item || ''), 'zh-Hant'));
  }

  function renderSummary(state) {
    const s = EF.calcSummary(state);
    const meetings = calcMeetingRows(state);
    document.getElementById('summaryCards').innerHTML = [
      ['入帳總額', '$' + EF.fmtMoney(s.deposits), 'var(--green)'],
      ['會議場次', meetings.length + ' 場', 'var(--accent)'],
      ['編列/規劃合計', '$' + EF.fmtMoney(s.planned), '#64748b'],
      ['已核准實際', '$' + EF.fmtMoney(s.entriesLogged), '#6366f1'],
      ['待付款', '$' + EF.fmtMoney(s.unpaidEntries), '#b45309'],
      ['已出帳', '$' + EF.fmtMoney(s.transfersOut), '#0f766e'],
      ['預算餘額', '$' + EF.fmtMoney(s.available), s.available >= 0 ? 'var(--green)' : '#b91c1c'],
      ['帳戶現金餘額', '$' + EF.fmtMoney(s.cashBalance), s.cashBalance >= 0 ? 'var(--green)' : '#b91c1c'],
    ]
      .map(
        ([label, val, color]) =>
          '<div class="summary-card"><div class="label">' +
          esc(label) +
          '</div><div class="val" style="color:' +
          color +
          '">' +
          esc(val) +
          '</div></div>'
      )
      .join('');
  }

  function renderMeetingTable(state) {
    const rows = calcMeetingRows(state);
    document.querySelector('#meetingTable tbody').innerHTML = rows.length
      ? rows
          .map((r) => {
            const p = r.plan;
            return (
              '<tr><td><strong>' +
              esc(p.eventTitle || p.item || p.eventId || '未命名會議') +
              '</strong><br><small>' +
              esc((p.budgetMeta && p.budgetMeta.meetingDate) || p.eventId || '') +
              '</small></td><td>$' +
              EF.fmtMoney(r.planned) +
              '</td><td>$' +
              EF.fmtMoney(r.actual) +
              '</td><td>$' +
              EF.fmtMoney(r.unpaid) +
              '</td><td>$' +
              EF.fmtMoney(r.paid) +
              '</td><td style="color:' +
              (r.diff < 0 ? '#b91c1c' : 'var(--green)') +
              '">$' +
              EF.fmtMoney(r.diff) +
              '</td><td>' +
              esc(p.sourceBudgetVersion || p.source || '手動規劃') +
              '</td></tr>'
            );
          })
          .join('')
      : '<tr><td colspan="7" style="text-align:center;color:#64748b">尚無會議編列或動支規劃資料</td></tr>';
  }

  function renderDetails(state) {
    const plans = activePlans(state).filter((p) => (p.budgetRowsSnapshot || []).length);
    document.getElementById('detailWrap').innerHTML = plans.length
      ? plans
          .map((p) => {
            const rows = p.budgetRowsSnapshot || [];
            const detailRows = rows
              .map((r) => {
                const total = (Number(r.unitPrice) || 0) * (Number(r.qty) || 0);
                return (
                  '<tr><td>' +
                  esc(r.item || '') +
                  '</td><td>' +
                  esc(r.category || '') +
                  '</td><td>$' +
                  EF.fmtMoney(r.unitPrice) +
                  '</td><td>' +
                  esc(r.qty || 0) +
                  '</td><td>$' +
                  EF.fmtMoney(total) +
                  '</td><td>' +
                  esc(r.note || '') +
                  '</td></tr>'
                );
              })
              .join('');
            return (
              '<details open><summary><strong>' +
              esc(p.eventTitle || p.item || '會議編列') +
              '</strong>｜$' +
              EF.fmtMoney(p.amount) +
              '｜' +
              esc(p.sourceBudgetVersion || '') +
              '</summary><table class="sheet" style="margin-top:0.6rem"><thead><tr><th>項目</th><th>類別</th><th>單價</th><th>數量</th><th>小計</th><th>備註</th></tr></thead><tbody>' +
              detailRows +
              '</tbody></table></details>'
            );
          })
          .join('')
      : '<p class="note">目前的動支規劃沒有會議編列明細快照。請在「會議經費編列」重新儲存，或在「動支規劃」同步本機/雲端會議編列後儲存。</p>';
  }

  function render(state) {
    renderSummary(state);
    renderMeetingTable(state);
    renderDetails(state);
  }

  let state = EF.loadState();
  render(state);

  document.getElementById('btnSync').addEventListener('click', async () => {
    setStatus('同步中…');
    try {
      state = (await EF.syncCloud()) || EF.loadState();
      render(state);
      setStatus('已同步雲端總帳 ✓', true);
    } catch (e) {
      setStatus('同步失敗：' + e.message);
    }
  });

  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      render(state);
    }
  });
})();
