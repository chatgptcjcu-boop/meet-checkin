(function () {
  const body = document.getElementById('budgetBody');
  const staffBody = document.getElementById('staffBody');

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (_) {}
    return null;
  }

  function buildState(bumpVersion) {
    const saved = loadState();
    const prev = getExpenseVersionMeta(saved);
    const now = new Date().toISOString();
    return {
      schemaVersion: EXPENSE_SCHEMA_VERSION,
      version: bumpVersion ? Math.max(prev.version, 0) + 1 : prev.version,
      updatedAt: bumpVersion || !saved?.updatedAt ? now : saved.updatedAt,
      meta: {
        planName: document.getElementById('planName').value,
        meetingName: document.getElementById('meetingName').value,
        meetingDate: document.getElementById('meetingDate').value,
        orgName: document.getElementById('orgName').value,
        rateAttendance: Number(document.getElementById('rateAttendance').value),
        rateReview: Number(document.getElementById('rateReview').value),
        rateHost: Number(document.getElementById('rateHost').value),
        reviewDesc: document.getElementById('reviewDesc').value,
        hostDesc: document.getElementById('hostDesc').value,
      },
      rows: collectRows(),
      staff: collectStaff(),
    };
  }

  function exportFilename(state) {
    const meta = getExpenseVersionMeta(state);
    const dateStr = meta.updatedAt
      ? meta.updatedAt.slice(0, 10)
      : new Date().toISOString().slice(0, 10);
    return 'meet-checkin-expenses-v' + meta.version + '-' + dateStr + '.json';
  }

  function updateSyncPanel(state) {
    const versionEl = document.getElementById('syncVersion');
    const updatedEl = document.getElementById('syncUpdated');
    if (!versionEl || !updatedEl) return;
    const meta = getExpenseVersionMeta(state);
    if (!state) {
      versionEl.textContent = '本機版本：尚未儲存（預設資料，版本 0）';
      updatedEl.textContent = '最後更新：（尚無紀錄）';
      return;
    }
    versionEl.textContent = '本機版本：' + meta.version + '（格式 v' + meta.schemaVersion + '）';
    updatedEl.textContent = '最後更新：' + fmtExpenseUpdatedAt(meta.updatedAt);
  }

  function saveState() {
    const state = buildState(true);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateSyncPanel(state);
    alert('已儲存至本機瀏覽器（版本 ' + state.version + '）');
  }

  function exportState() {
    const saved = loadState();
    const state = buildState(false);
    if (!saved) state.updatedAt = new Date().toISOString();
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportFilename(state);
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object') throw new Error('invalid');

        const imported = getExpenseVersionMeta(data);
        if (imported.schemaVersion > EXPENSE_SCHEMA_VERSION) {
          alert('無法匯入：檔案格式版本（' + imported.schemaVersion + '）較新，請先更新頁面程式。');
          return;
        }

        const current = loadState();
        const local = getExpenseVersionMeta(current);
        const cmp = compareExpenseVersions(data, current);

        let msg = '匯入檔：版本 ' + imported.version + '，' + fmtExpenseUpdatedAt(imported.updatedAt) + '\n';
        if (current) {
          msg += '本機：版本 ' + local.version + '，' + fmtExpenseUpdatedAt(local.updatedAt) + '\n\n';
          if (cmp > 0) {
            msg += '匯入檔較新。確定匯入？';
          } else if (cmp < 0) {
            msg += '⚠ 匯入檔較舊，將覆蓋較新的本機資料。仍要繼續？';
          } else {
            msg += '版本相同。匯入將覆蓋本機資料。仍要繼續？';
          }
        } else {
          msg += '\n確定匯入？';
        }
        if (!confirm(msg)) return;

        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        location.reload();
      } catch (_) {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
  }

  function rowTotal(r) {
    return (Number(r.unitPrice) || 0) * (Number(r.qty) || 0);
  }

  function collectRows() {
    return [...body.querySelectorAll('tr')].map((tr) => ({
      item: tr.querySelector('.col-item').value,
      category: tr.querySelector('.col-cat').value,
      unitPrice: Number(tr.querySelector('.col-price').value) || 0,
      qty: Number(tr.querySelector('.col-qty').value) || 0,
      unit: tr.querySelector('.col-unit').value,
      note: tr.querySelector('.col-note').value,
      feeType: tr.dataset.feeType || 'biz',
    }));
  }

  function collectStaff() {
    return [...staffBody.querySelectorAll('tr')].map((tr) => ({
      name: tr.querySelector('.st-name').value,
      role: tr.querySelector('.st-role').value,
      hours: Number(tr.querySelector('.st-hours').value) || 0,
      hourly: Number(tr.querySelector('.st-hourly').value) || 0,
      transport: Number(tr.querySelector('.st-transport').value) || 0,
      note: tr.querySelector('.st-note')?.value || '',
    }));
  }

  function addRow(data, idx) {
    const tr = document.createElement('tr');
    tr.dataset.feeType = data.feeType || 'biz';
    tr.innerHTML = `
      <td class="num">${idx}</td>
      <td><input class="col-item" value="${esc(data.item)}"></td>
      <td><select class="col-cat">
        <option ${data.category === '業務費' ? 'selected' : ''}>業務費</option>
        <option ${data.category === '出席費' ? 'selected' : ''}>出席費</option>
        <option ${data.category === '審查費' ? 'selected' : ''}>審查費</option>
        <option ${data.category === '主持費' ? 'selected' : ''}>主持費</option>
        <option ${data.category === '人事費' ? 'selected' : ''}>人事費</option>
        <option ${data.category === '其他' ? 'selected' : ''}>其他</option>
      </select></td>
      <td><input type="number" class="col-price" min="0" step="1" value="${data.unitPrice}"></td>
      <td><input type="number" class="col-qty" min="0" step="1" value="${data.qty}"></td>
      <td><input class="col-unit" value="${esc(data.unit)}"></td>
      <td class="num col-total">0</td>
      <td><input class="col-note" value="${esc(data.note || '')}"></td>
      <td class="no-print"><button type="button" class="btn-sm danger btn-del">✕</button></td>`;
    body.appendChild(tr);
    tr.querySelectorAll('input, select').forEach((el) => el.addEventListener('input', recalc));
    tr.querySelector('.btn-del').onclick = () => { tr.remove(); renumber(); recalc(); };
    recalc();
  }

  function addStaff(data) {
    const tr = document.createElement('tr');
    const sub = data.hours * data.hourly + data.transport;
    tr.innerHTML = `
      <td><input class="st-name" value="${esc(data.name)}"></td>
      <td><input class="st-role" value="${esc(data.role)}"></td>
      <td><input type="number" class="st-hours" min="0" step="0.5" value="${data.hours}"></td>
      <td><input type="number" class="st-hourly" min="0" step="1" value="${data.hourly}"></td>
      <td><input type="number" class="st-transport" min="0" step="1" value="${data.transport}"></td>
      <td class="num st-sub">${fmtMoney(sub)}</td>`;
    staffBody.appendChild(tr);
    tr.querySelectorAll('input').forEach((el) => el.addEventListener('input', () => {
      const h = Number(tr.querySelector('.st-hours').value) || 0;
      const r = Number(tr.querySelector('.st-hourly').value) || 0;
      const t = Number(tr.querySelector('.st-transport').value) || 0;
      tr.querySelector('.st-sub').textContent = fmtMoney(h * r + t);
    }));
  }

  function esc(s) {
    return String(s).replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function renumber() {
    [...body.querySelectorAll('tr')].forEach((tr, i) => { tr.querySelector('td').textContent = i + 1; });
  }

  function syncFeeRows() {
    const n = eligibleCount();
    const att = Number(document.getElementById('rateAttendance').value) || 0;
    const rev = Number(document.getElementById('rateReview').value) || 0;
    const host = Number(document.getElementById('rateHost').value) || 0;
    body.querySelectorAll('tr').forEach((tr) => {
      if (tr.dataset.feeType === 'attendance') {
        tr.querySelector('.col-price').value = att;
        tr.querySelector('.col-qty').value = n;
      }
      if (tr.dataset.feeType === 'review') {
        tr.querySelector('.col-price').value = rev;
        tr.querySelector('.col-qty').value = n;
      }
      if (tr.dataset.feeType === 'host') {
        tr.querySelector('.col-price').value = host;
        tr.querySelector('.col-qty').value = 1;
      }
    });
    recalc();
  }

  function recalc() {
    let biz = 0;
    let fees = 0;
    body.querySelectorAll('tr').forEach((tr) => {
      const price = Number(tr.querySelector('.col-price').value) || 0;
      const qty = Number(tr.querySelector('.col-qty').value) || 0;
      const total = price * qty;
      tr.querySelector('.col-total').textContent = fmtMoney(total);
      const ft = tr.dataset.feeType;
      if (ft === 'attendance' || ft === 'review' || ft === 'host') fees += total;
      else biz += total;
    });
    document.getElementById('subtotalBiz').textContent = fmtMoney(biz);
    document.getElementById('subtotalFees').textContent = fmtMoney(fees);
    document.getElementById('grandTotal').textContent = fmtMoney(biz + fees);

    const n = eligibleCount();
    const att = Number(document.getElementById('rateAttendance').value) || 0;
    const rev = Number(document.getElementById('rateReview').value) || 0;
    const host = Number(document.getElementById('rateHost').value) || 0;
    document.getElementById('feeHeadcount').textContent = n + ' 人';
    document.getElementById('feePreview').textContent = fmtMoney(n * (att + rev)) + ' 元（不含主持費 ' + fmtMoney(host) + ' 元）';

    document.getElementById('summaryCards').innerHTML = [
      ['場地+餐費', findRowTotal(['場地', '餐費', '包廂'])],
      ['工讀+交通', findRowTotal(['工讀', '交通'])],
      ['主持費', findRowTotal(['主持人', '張祐倉'])],
      ['委員費用', fees - findRowTotal(['主持人', '張祐倉'])],
      ['合計', biz + fees],
    ].map(([l, v]) => `<div class="summary-card"><div class="label">${l}</div><div class="val">$${fmtMoney(v)}</div></div>`).join('');
  }

  function findRowTotal(keywords) {
    let sum = 0;
    body.querySelectorAll('tr').forEach((tr) => {
      const item = tr.querySelector('.col-item').value;
      if (keywords.some((k) => item.includes(k))) {
        sum += (Number(tr.querySelector('.col-price').value) || 0) * (Number(tr.querySelector('.col-qty').value) || 0);
      }
    });
    return sum;
  }

  function init() {
    const saved = loadState();
    if (saved?.meta) {
      Object.entries(saved.meta).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el) el.value = v;
      });
    }
    let rows = saved?.rows?.length ? saved.rows : DEFAULT_BUDGET_ROWS;
    if (saved?.rows?.length && !rows.some((r) => r.feeType === 'host')) {
      const hostRow = DEFAULT_BUDGET_ROWS.find((r) => r.feeType === 'host');
      if (hostRow) {
        const idx = rows.findIndex((r) => r.feeType === 'review');
        rows = rows.slice();
        rows.splice(idx >= 0 ? idx + 1 : rows.length, 0, hostRow);
      }
    }
    rows.forEach((r, i) => addRow(r, i + 1));
    const staff = saved?.staff?.length ? saved.staff : DEFAULT_STAFF;
    staff.forEach(addStaff);

    ['rateAttendance', 'rateReview', 'rateHost'].forEach((id) => {
      document.getElementById(id).addEventListener('input', () => { syncFeeRows(); recalc(); });
    });
    const hostDescEl = document.getElementById('hostDesc');
    if (hostDescEl) hostDescEl.addEventListener('input', () => {});

    document.getElementById('btnSave').onclick = saveState;
    document.getElementById('btnExport').onclick = exportState;
    document.getElementById('btnImport').onclick = () => document.getElementById('importFile').click();
    document.getElementById('importFile').onchange = (e) => {
      const f = e.target.files?.[0];
      if (f) importState(f);
      e.target.value = '';
    };
    document.getElementById('btnReset').onclick = () => {
      if (confirm('還原預設？將清除本機儲存。')) {
        localStorage.removeItem(STORAGE_KEY);
        location.reload();
      }
    };
    document.getElementById('btnAddRow').onclick = () => addRow({ item: '', category: '業務費', unitPrice: 0, qty: 1, unit: '式', note: '', feeType: 'biz' }, body.children.length + 1);
    document.getElementById('btnSyncFees').onclick = syncFeeRows;
    document.getElementById('btnAddStaff').onclick = () => addStaff({ name: '', role: '', hours: 0, hourly: 200, transport: 0 });
    syncFeeRows();
    recalc();
    updateSyncPanel(saved);
  }

  init();
})();
