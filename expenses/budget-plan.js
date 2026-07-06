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
  });
})();
