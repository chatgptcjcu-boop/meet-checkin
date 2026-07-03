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

  function buildState() {
    return {
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

  function saveState() {
    const saved = loadState();
    const state = enrichExpenseState(buildState(), { previousDataVersion: saved?.dataVersion });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateVersionUI(state);
    alert('已儲存（版本 ' + state.dataVersion + '）');
  }

  function exportState() {
    const saved = loadState();
    const state = enrichExpenseState(buildState(), { previousDataVersion: saved?.dataVersion });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'meet-checkin-expenses-' + state.dataVersion + '.json';
    a.click();
    URL.revokeObjectURL(a.href);
    updateVersionUI(state);
  }

  function applyImport(data, mode) {
    const saved = loadState();
    let next;
    if (mode === 'merge' && saved) {
      next = enrichExpenseState({
        meta: { ...saved.meta, ...data.meta },
        rows: saved.rows,
        staff: saved.staff,
      }, { previousDataVersion: saved?.dataVersion });
    } else {
      next = enrichExpenseState({
        meta: data.meta,
        rows: data.rows,
        staff: data.staff,
      }, { previousDataVersion: saved?.dataVersion });
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    location.reload();
  }

  function importState(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data || typeof data !== 'object' || !data.meta) throw new Error('invalid');

        const importSchema = data.schemaVersion ?? 0;
        const importVersion = data.dataVersion ?? '（未知）';
        const importDate = data.updatedDate || (data.updatedAt ? data.updatedAt.slice(0, 10) : '（未知）');
        if (importSchema > EXPENSE_SCHEMA_VERSION) {
          alert('無法匯入：檔案結構版本（' + importSchema + '）較新，請先更新頁面程式。');
          return;
        }

        const saved = loadState();
        const localVersion = saved?.dataVersion ?? '（無）';
        const localDate = saved?.updatedDate ?? '（無）';
        let msg = '匯入檔：' + importVersion + '（' + importDate + '）\n';
        msg += '本頁範本：' + EXPENSE_PAGE_RELEASE + '（' + EXPENSE_PAGE_RELEASE_DATE + '）\n';
        if (saved) msg += '本機儲存：' + localVersion + '（' + localDate + '）\n';

        const cmpImportVsLocal = saved ? compareDataVersions(importVersion, localVersion) : 0;
        const isLegacy = !parseDataVersion(importVersion);
        const versionDiff = isLegacy
          || importSchema < EXPENSE_SCHEMA_VERSION
          || (saved && cmpImportVsLocal !== 0);

        if (versionDiff) {
          msg += '\n⚠ 版本或結構與目前預設不同。\n';
          msg += '按「確定」→ 完全取代本機資料\n';
          msg += '按「取消」→ 可選擇僅合併基本資料';
          if (confirm(msg)) {
            applyImport(data, 'replace');
          } else if (confirm('僅合併會議基本資料（meta），保留本機費用明細與工作人員？')) {
            applyImport(data, 'merge');
          }
          return;
        }

        if (saved) {
          msg += '\n確定以匯入檔完全取代本機資料？';
          if (confirm(msg)) applyImport(data, 'replace');
        } else {
          msg += '\n確定匯入？';
          if (confirm(msg)) applyImport(data, 'replace');
        }
      } catch (_) {
        alert('匯入失敗：檔案格式不正確');
      }
    };
    reader.readAsText(file);
  }

  function renderSyncBanner(saved) {
    const banner = document.getElementById('syncBanner');
    if (!banner) return;
    if (!saved) {
      banner.hidden = true;
      return;
    }
    const issues = [];
    if (!saved.dataVersion) {
      issues.push('本機資料無版本資訊，建議按「儲存」或「匯出」更新');
    } else if (!parseDataVersion(saved.dataVersion)) {
      issues.push('本機為舊版格式（' + saved.dataVersion + '），建議重新儲存以產生新版本號');
    } else if ((saved.schemaVersion ?? 0) < EXPENSE_SCHEMA_VERSION) {
      issues.push('本機結構版本較舊，建議重新儲存以升級');
    }
    if (issues.length) {
      banner.textContent = issues.join('；');
      banner.hidden = false;
    } else {
      banner.hidden = true;
    }
  }

  function updateVersionUI(saved) {
    renderSyncBanner(saved);
    applyExpenseEnvTheme();
    renderExpenseVersionBar();
    const topTag = document.getElementById('topVersionTag');
    if (topTag) topTag.textContent = saved?.dataVersion || '未儲存';

    const versionEl = document.getElementById('syncVersion');
    const updatedEl = document.getElementById('syncUpdated');
    if (!versionEl || !updatedEl) return;
    if (!saved) {
      versionEl.textContent = '本機版本：尚未儲存（按儲存後產生 日期-時間-流水號）';
      updatedEl.textContent = '最後更新：（尚無紀錄）';
      return;
    }
    versionEl.textContent = '本機資料：' + (saved.dataVersion || '（舊格式）') + '｜格式 schema v' + (saved.schemaVersion ?? 0);
    updatedEl.textContent = '最後更新：' + (saved.updatedDate || (saved.updatedAt ? formatUpdatedDateTimeZhTW(saved.updatedAt) : '（尚無紀錄）'));
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

  const CLOUD_AT_KEY = STORAGE_KEY + ':cloudAt';

  function gasUrl() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.backend && window.EVENT_CONFIG.backend.gasWebAppUrl) || '';
  }

  function expensesAction() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.expenses && window.EVENT_CONFIG.expenses.action) || 'expenses';
  }

  function nowStr() {
    return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Taipei' }).slice(0, 16);
  }

  function setCloudStatus(msg, kind) {
    const el = document.getElementById('cloudStatus');
    if (!el) return;
    el.className = kind || '';
    el.textContent = msg || '';
  }

  function renderCloudSavedAt() {
    const el = document.getElementById('cloudSavedAt');
    if (!el) return;
    const t = localStorage.getItem(CLOUD_AT_KEY);
    el.textContent = '最後雲端儲存時間：' + (t || '（尚無紀錄）');
  }

  /** 把整份雲端狀態套回表單（雲端為準；清空後重建列） */
  function applyStateToForm(state) {
    if (!state) return;
    if (state.meta) {
      Object.entries(state.meta).forEach(([k, v]) => {
        const el = document.getElementById(k);
        if (el) el.value = v;
      });
    }
    body.innerHTML = '';
    const rows = state.rows?.length ? state.rows : DEFAULT_BUDGET_ROWS;
    rows.forEach((r, i) => addRow(r, i + 1));
    staffBody.innerHTML = '';
    const staff = state.staff?.length ? state.staff : DEFAULT_STAFF;
    staff.forEach(addStaff);
    syncFeeRows();
    recalc();
  }

  /** 儲存到雲端：no-cors POST 整份 state（同 unit-claim-matrix 模式），並同步本機 */
  async function saveCloud() {
    const url = gasUrl();
    const btn = document.getElementById('btnSaveCloud');
    if (!url) { setCloudStatus('尚未設定雲端網址（GAS URL）', 'err'); return; }

    const prev = loadState();
    const state = enrichExpenseState(buildState(), { previousDataVersion: prev?.dataVersion });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    updateVersionUI(state);

    const name = document.getElementById('cloudEditorName')?.value.trim() || '';
    const payload = {
      action: expensesAction(),
      name,
      timestamp: new Date().toISOString(),
      version: state.dataVersion,
      state,
      pageUrl: location.href,
    };

    const orig = btn.textContent;
    btn.disabled = true;
    btn.textContent = '☁ 儲存中…';
    setCloudStatus('正在寫入雲端試算表…', '');
    try {
      await fetch(url, {
        method: 'POST',
        mode: 'no-cors',
        cache: 'no-cache',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
      });
      const t = nowStr();
      localStorage.setItem(CLOUD_AT_KEY, t);
      renderCloudSavedAt();
      setCloudStatus('已儲存到雲端 ✓（分頁 expenses，版本 ' + state.dataVersion + '，' + t + '）', 'ok');
    } catch (e) {
      setCloudStatus('雲端儲存失敗：' + e.message + '（本機已儲存，稍後可重試或改用「⬇ 匯出」備份）', 'err');
    } finally {
      btn.disabled = false;
      btn.textContent = orig;
    }
  }

  /** 同步最新：GET 讀取雲端最新一版 state 並套回表單 */
  async function syncCloud(silent) {
    const url = gasUrl();
    if (!url) { if (!silent) setCloudStatus('尚未設定雲端網址（GAS URL）', 'err'); return; }
    if (!silent) setCloudStatus('正在讀取雲端最新資料…', '');
    try {
      const res = await fetch(url + '?action=' + encodeURIComponent(expensesAction()), { method: 'GET', cache: 'no-cache' });
      const json = await res.json();
      if (json && json.ok && json.state) {
        const cloud = json.state;
        const local = loadState();
        const cloudVer = cloud.dataVersion || '';
        const localVer = local?.dataVersion || '';
        const cmp = local ? compareDataVersions(cloudVer, localVer) : 1;

        if (silent && cmp <= 0) {
          if (cmp < 0) {
            setCloudStatus('本機資料較新（' + localVer + '），未覆蓋；如需上傳請按「☁ 儲存到雲端」。', '');
          }
          return;
        }
        if (!silent && cmp < 0) {
          if (!confirm('雲端版本（' + cloudVer + '）比本機（' + localVer + '）舊，確定用雲端覆蓋本機？')) {
            setCloudStatus('已取消同步（保留本機資料）', '');
            return;
          }
        }

        applyStateToForm(cloud);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
        updateVersionUI(cloud);
        setCloudStatus('已同步雲端資料 ✓（版本 ' + (cloudVer || '未知') + '，更新者 ' + (json.updatedBy || '—') + '）', 'ok');
      } else if (!silent) {
        setCloudStatus('雲端尚無資料，可先按「☁ 儲存到雲端」建立第一版。', '');
      }
    } catch (e) {
      if (!silent) setCloudStatus('同步失敗：' + e.message + '（顯示本機資料）', 'err');
    }
  }

  /** 密碼閘通過後才自動讀取雲端（auth.js 使用同一 sessionStorage 鍵） */
  function whenAuthed(cb) {
    const AUTH_KEY = 'meet-checkin-expenses-auth-v1';
    if (sessionStorage.getItem(AUTH_KEY)) { cb(); return; }
    const iv = setInterval(() => {
      if (sessionStorage.getItem(AUTH_KEY)) { clearInterval(iv); cb(); }
    }, 400);
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

    document.getElementById('btnSaveCloud').onclick = saveCloud;
    document.getElementById('btnSyncCloud').onclick = () => syncCloud(false);
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
    updateVersionUI(saved);
    renderCloudSavedAt();

    /* 開啟頁面（密碼通過後）自動讀取雲端最新版；失敗或較舊則沿用本機 */
    whenAuthed(() => syncCloud(true));
  }

  init();
})();
