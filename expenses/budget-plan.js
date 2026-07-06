(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('budget-plan.html');
  let state = EF.loadState();
  let events = [];

  const DEFAULT_PER_MEETING = 22000;

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  function eventLabel(id) {
    const e = events.find((x) => x.id === id);
    return e ? e.date + ' ' + e.title : id;
  }

  function expensesAction() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.expenses && window.EVENT_CONFIG.expenses.action) || 'expenses';
  }

  function budgetRowsTotal(budgetState) {
    return (budgetState.rows || []).reduce((sum, r) => {
      return sum + ((Number(r.unitPrice) || 0) * (Number(r.qty) || 0));
    }, 0);
  }

  function budgetIdentityPart(v) {
    return String(v || '')
      .trim()
      .replace(/\s+/g, '')
      .replace(/[^\w\u4e00-\u9fff-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);
  }

  function budgetEventId(budgetState) {
    const meta = budgetState.meta || {};
    const name = budgetIdentityPart(meta.meetingName || '會議經費編列');
    const date = budgetIdentityPart(meta.meetingDate || '未填日期');
    return 'budget-' + date + '-' + name;
  }

  function budgetSourceKey(budgetState) {
    return 'budget-dashboard:' + budgetEventId(budgetState);
  }

  function upsertBudgetPlanFromState(budgetState) {
    const eventId = budgetEventId(budgetState);
    const sourceKey = budgetSourceKey(budgetState);
    const meetingName = (budgetState.meta && budgetState.meta.meetingName) || '會議經費編列';
    const meetingDate = (budgetState.meta && budgetState.meta.meetingDate) || '';
    const amount = budgetRowsTotal(budgetState);
    state.plans = state.plans || [];

    let plan = state.plans.find((p) => p.sourceKey === sourceKey);
    if (!plan && budgetState.dataVersion) {
      plan = state.plans.find((p) => p.source === 'budget-dashboard' && p.sourceBudgetVersion === budgetState.dataVersion);
    }
    if (!plan) {
      plan = state.plans.find((p) =>
        p.source === 'budget-dashboard' &&
        p.eventTitle === meetingName &&
        String(p.note || '').includes(meetingDate)
      );
    }
    if (!plan) {
      plan = { id: EF.uid('pl'), sourceKey };
      state.plans.push(plan);
    }

    Object.assign(plan, {
      eventId,
      eventTitle: meetingName,
      item: meetingName + '｜會議經費編列',
      amount,
      status: '編列完成',
      note: [meetingDate, '來源版本 ' + (budgetState.dataVersion || '')].filter(Boolean).join('｜'),
      source: 'budget-dashboard',
      sourceBudgetVersion: budgetState.dataVersion || '',
      updatedAt: new Date().toISOString(),
    });

    return plan;
  }

  function loadLocalBudgetState() {
    try {
      return JSON.parse(localStorage.getItem('meet-checkin-expenses-v1'));
    } catch (_) {
      return null;
    }
  }

  function syncLocalBudget(showStatus) {
    const budgetState = loadLocalBudgetState();
    if (!budgetState || !budgetState.meta || !Array.isArray(budgetState.rows)) {
      if (showStatus) setStatus('本機尚無會議經費編列資料');
      return null;
    }
    const plan = upsertBudgetPlanFromState(budgetState);
    EF.saveState(state);
    renderTable();
    try {
      sessionStorage.removeItem('meet-checkin-budget-plan-sync-needed');
    } catch (_) {}
    if (showStatus) {
      setStatus('已同步本機會議編列到動支規劃：$' + EF.fmtMoney(plan.amount) + '（請按儲存到雲端）', true);
    }
    return plan;
  }

  function fillEventSelect() {
    document.getElementById('planEvent').innerHTML = events
      .map((e) => '<option value="' + e.id + '">' + e.date + ' ' + e.committeeLabel + '｜' + e.title + '</option>')
      .join('');
  }

  function actualByEvent() {
    const map = new Map();
    (state.entries || [])
      .filter((e) => e.status !== '待審' && e.status !== '作廢')
      .forEach((e) => {
        const key = e.eventId || '';
        map.set(key, (map.get(key) || 0) + (Number(e.amount) || 0));
      });
    return map;
  }

  function renderSummary() {
    const s = EF.calcSummary(state);
    const plannedActive = (state.plans || [])
      .filter((p) => p.status !== '取消')
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
    const actualActive = (state.entries || [])
      .filter((e) => e.status !== '待審' && e.status !== '作廢')
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    document.getElementById('planSummary').innerHTML = [
      ['規劃合計', plannedActive],
      ['已核准實際', actualActive],
      ['規劃差額', plannedActive - actualActive],
      ['可動用餘額', s.available],
      ['規劃後剩餘', s.available - plannedActive],
    ]
      .map(([label, val]) => {
        const color = label.includes('剩餘') && val < 0 ? '#b91c1c' : 'var(--accent)';
        return (
          '<div class="summary-card"><div class="label">' +
          label +
          '</div><div class="val" style="color:' +
          color +
          '">$' +
          EF.fmtMoney(val) +
          '</div></div>'
        );
      })
      .join('');
  }

  function renderTable() {
    const tbody = document.querySelector('#planTable tbody');
    const rows = (state.plans || []).slice();
    const actual = actualByEvent();
    tbody.innerHTML = rows.length
      ? rows
          .map(
            (p) => {
              const used = actual.get(p.eventId || '') || 0;
              const diff = (Number(p.amount) || 0) - used;
              return (
                '<tr><td>' +
                eventLabel(p.eventId) +
                '</td><td>' +
                (p.item || '') +
                '</td><td>$' +
                EF.fmtMoney(p.amount) +
                '</td><td>$' +
                EF.fmtMoney(used) +
                '</td><td style="color:' +
                (diff < 0 ? '#b91c1c' : 'var(--green)') +
                '">$' +
                EF.fmtMoney(diff) +
                '</td><td>' +
                (p.status || '') +
                '</td><td>' +
                (p.note || '') +
                '</td><td class="no-print"><button type="button" class="btn-sm del-plan" data-id="' +
                p.id +
                '">刪除</button></td></tr>'
              );
            }
          )
          .join('')
      : '<tr><td colspan="8" style="text-align:center;color:#64748b">尚無規劃，可按「從會議清單帶入」</td></tr>';

    tbody.querySelectorAll('.del-plan').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.plans = state.plans.filter((x) => x.id !== btn.dataset.id);
        EF.saveState(state);
        renderTable();
        renderSummary();
      });
    });
    renderSummary();
  }

  function seedFromEvents() {
    if (state.plans.length && !confirm('已有規劃資料，確定重新帶入？（會清空現有規劃）')) return;
    state.plans = events.map((e) => ({
      id: EF.uid('pl'),
      eventId: e.id,
      eventTitle: e.title,
      item: '會議業務費（場地、餐費、工讀、委員費等）',
      amount: DEFAULT_PER_MEETING,
      status: e.status === 'completed' ? '已動支' : '規劃中',
      note: e.committeeLabel + ' 第' + (e.meetingNumber || '') + '場',
    }));
    EF.saveState(state);
    renderTable();
    setStatus('已從 ' + events.length + ' 場會議帶入預估列（每場 $' + EF.fmtMoney(DEFAULT_PER_MEETING) + '，請依實際調整）', true);
  }

  document.getElementById('planForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const eventId = document.getElementById('planEvent').value;
    state.plans.push({
      id: EF.uid('pl'),
      eventId,
      eventTitle: events.find((e) => e.id === eventId)?.title || '',
      item: document.getElementById('planItem').value.trim(),
      amount: Number(document.getElementById('planAmount').value) || 0,
      status: document.getElementById('planStatus').value,
      note: document.getElementById('planNote').value.trim(),
    });
    EF.saveState(state);
    document.getElementById('planItem').value = '';
    document.getElementById('planAmount').value = '';
    document.getElementById('planNote').value = '';
    renderTable();
  });

  document.getElementById('btnSeed').addEventListener('click', seedFromEvents);

  document.getElementById('btnSyncLocalBudget').addEventListener('click', () => {
    syncLocalBudget(true);
  });

  document.getElementById('btnSyncBudget').addEventListener('click', async () => {
    const url = EF.gasUrl();
    if (!url) {
      setStatus('尚未設定 GAS 網址');
      return;
    }
    setStatus('讀取會議經費編列最新版…');
    try {
      const res = await fetch(url + '?action=' + encodeURIComponent(expensesAction()), { cache: 'no-cache' });
      const json = await res.json();
      if (!json.ok || !json.state) throw new Error(json.error || '雲端尚無會議經費編列資料');
      const plan = upsertBudgetPlanFromState(json.state);
      EF.saveState(state);
      renderTable();
      setStatus('已同步會議編列到動支規劃：$' + EF.fmtMoney(plan.amount) + '（請按儲存到雲端）', true);
    } catch (e) {
      setStatus('同步失敗：' + e.message);
    }
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    try {
      await EF.saveCloud(state, '動支規劃');
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

  renderTable();

  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      renderTable();
    }
    try {
      if (sessionStorage.getItem('meet-checkin-budget-plan-sync-needed') === '1') {
        syncLocalBudget(true);
      }
    } catch (_) {}
  });
})();
