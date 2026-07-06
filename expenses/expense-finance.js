/** 經費核銷總帳／人員／動支規劃 — 共用資料與雲端同步 */
(function () {
  const STORAGE_KEY = 'meet-checkin-expense-finance-v1';
  const CLOUD_AT_KEY = STORAGE_KEY + ':cloudAt';
  const SCHEMA_VERSION = 1;

  function uid(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 6);
  }

  function gasUrl() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.backend && window.EVENT_CONFIG.backend.gasWebAppUrl) || '';
  }

  function financeAction() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.expenseFinance && window.EVENT_CONFIG.expenseFinance.action) || 'expense-finance';
  }

  function entrySubmissionAction() {
    return 'expense-entry-submission';
  }

  function entrySubmissionsAction() {
    return 'expense-entry-submissions';
  }

  function defaultState() {
    return {
      schemaVersion: SCHEMA_VERSION,
      dataVersion: '',
      updatedAt: '',
      ledger: {
        deposits: [
          {
            id: 'dep-seed-200k',
            date: '2026-07-01',
            amount: 200000,
            note: '計畫第一期入帳（可動用資金）',
            category: '入帳',
          },
        ],
      },
      personnel: [
        { id: 'p-wa', name: '工讀生A', role: '工讀生', bank: '', account: '', note: '現場簽到、會務' },
        { id: 'p-wb', name: '工讀生B', role: '工讀生', bank: '', account: '', note: '現場簽到、攝影紀錄' },
        { id: 'p-staff', name: '王芯庭', role: '專案人員', bank: '', account: '', note: '會議助理／紀錄' },
      ],
      entries: [],
      transfers: [],
      plans: [],
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && parsed.schemaVersion === SCHEMA_VERSION) return parsed;
      }
    } catch (_) {}
    return defaultState();
  }

  function saveState(state) {
    state.updatedAt = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return state;
  }

  function sum(arr, fn) {
    return arr.reduce((s, x) => s + (Number(fn(x)) || 0), 0);
  }

  function calcSummary(state) {
    const deposits = sum(state.ledger.deposits || [], (d) => d.amount);
    const transfersOut = sum(
      (state.transfers || []).filter((t) => t.status !== '作廢'),
      (t) => t.amount
    );
    const entriesLogged = sum(
      (state.entries || []).filter((e) => e.status !== '作廢'),
      (e) => e.amount
    );
    const planned = sum(state.plans || [], (p) => p.amount);
    const available = deposits - transfersOut - entriesLogged;
    return { deposits, transfersOut, entriesLogged, planned, available };
  }

  function fmtMoney(n) {
    return Math.round(Number(n) || 0).toLocaleString('zh-TW');
  }

  function formatDateZh(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.getFullYear() - 1911 + '年' + (d.getMonth() + 1) + '月' + d.getDate() + '日';
  }

  async function syncCloud(silent) {
    const url = gasUrl();
    if (!url) {
      if (!silent) throw new Error('尚未設定 GAS 網址');
      return null;
    }
    const res = await fetch(url + '?action=' + encodeURIComponent(financeAction()), { cache: 'no-cache' });
    const json = await res.json();
    if (json && json.ok && json.state) {
      saveState(json.state);
      if (json.updatedAt) localStorage.setItem(CLOUD_AT_KEY, json.updatedAt);
      return json.state;
    }
    return null;
  }

  async function saveCloud(state, editorName) {
    const url = gasUrl();
    if (!url) throw new Error('尚未設定 GAS 網址');
    state.dataVersion = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
    saveState(state);
    const payload = {
      action: financeAction(),
      name: editorName || '',
      timestamp: new Date().toISOString(),
      version: state.dataVersion,
      state,
      pageUrl: location.href,
    };
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
    localStorage.setItem(CLOUD_AT_KEY, new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 16));
    return state;
  }

  async function postGas(payload) {
    const url = gasUrl();
    if (!url) throw new Error('尚未設定 GAS 網址');
    await fetch(url, {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload),
    });
  }

  async function submitEntrySubmission(submission) {
    await postGas({
      action: entrySubmissionAction(),
      timestamp: new Date().toISOString(),
      submission,
      pageUrl: location.href,
    });
  }

  async function syncEntrySubmissions() {
    const url = gasUrl();
    if (!url) throw new Error('尚未設定 GAS 網址');
    const res = await fetch(url + '?action=' + encodeURIComponent(entrySubmissionsAction()), { cache: 'no-cache' });
    const json = await res.json();
    if (json && json.ok && Array.isArray(json.submissions)) return json.submissions;
    return [];
  }

  async function markEntrySubmission(submissionId, status) {
    await postGas({
      action: entrySubmissionAction(),
      operation: 'markImported',
      submissionId,
      status: status || '已匯入',
      timestamp: new Date().toISOString(),
    });
  }

  function renderFinanceNav(active) {
    const links = [
      ['index.html', '入口'],
      ['ledger-overview.html', '總帳概覽'],
      ['expense-entry.html', '記帳登錄'],
      ['personnel-accounts.html', '人員帳戶'],
      ['transfers.html', '匯款出帳'],
      ['budget-plan.html', '動支規劃'],
      ['budget-dashboard.html', '會議編列'],
    ];
    return (
      '<nav class="finance-nav no-print">' +
      links
        .map(([href, label]) => {
          const cls = active === href ? ' class="active"' : '';
          return '<a href="./' + href + '"' + cls + '>' + label + '</a>';
        })
        .join('') +
      '</nav>'
    );
  }

  window.ExpenseFinance = {
    STORAGE_KEY,
    CLOUD_AT_KEY,
    uid,
    defaultState,
    loadState,
    saveState,
    calcSummary,
    fmtMoney,
    formatDateZh,
    syncCloud,
    saveCloud,
    submitEntrySubmission,
    syncEntrySubmissions,
    markEntrySubmission,
    renderFinanceNav,
    gasUrl,
  };
})();
