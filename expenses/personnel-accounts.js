(function () {
  const EF = window.ExpenseFinance;
  document.getElementById('financeNav').innerHTML = EF.renderFinanceNav('personnel-accounts.html');
  let state = EF.loadState();

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  function transferTotalFor(personId) {
    return (state.transfers || [])
      .filter((t) => t.personId === personId && t.status !== '作廢')
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);
  }

  function esc(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function makeAccessCode() {
    return Math.random().toString(36).slice(2, 6).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function gasUrl() {
    return (window.EVENT_CONFIG && window.EVENT_CONFIG.backend && window.EVENT_CONFIG.backend.gasWebAppUrl) || '';
  }

  function profileUrl(person) {
    const url = new URL('./profile.html', location.href);
    url.searchParams.set('personId', person.id);
    return url.href;
  }

  function mergeRosterMembers(members, groups) {
    const groupById = new Map((groups || []).map((g) => [g.groupId, g]));
    const byMemberId = new Map();

    (members || []).forEach((m) => {
      if (!m.memberId || !m.name) return;
      const group = groupById.get(m.groupId);
      const cur = byMemberId.get(m.memberId) || {
        id: m.memberId,
        name: m.name,
        role: m.role || '',
        org: m.org || '',
        title: m.title || '',
        rosterGroups: [],
      };
      if (!cur.role && m.role) cur.role = m.role;
      if (!cur.org && m.org) cur.org = m.org;
      if (!cur.title && m.title) cur.title = m.title;
      if (group) cur.rosterGroups.push(group.name || group.groupId);
      byMemberId.set(m.memberId, cur);
    });

    let added = 0;
    let updated = 0;
    state.personnel = state.personnel || [];

    byMemberId.forEach((rosterPerson) => {
      let person = state.personnel.find((p) => p.id === rosterPerson.id);
      if (!person) {
        person = state.personnel.find((p) => p.name === rosterPerson.name && !p.rosterMemberId);
      }

      const row = {
        id: rosterPerson.id,
        rosterMemberId: rosterPerson.id,
        name: rosterPerson.name,
        role: rosterPerson.role || '其他',
        org: rosterPerson.org || '',
        title: rosterPerson.title || '',
        note:
          [rosterPerson.org, rosterPerson.title].filter(Boolean).join('／') +
          (rosterPerson.rosterGroups.length ? '｜' + rosterPerson.rosterGroups.join('、') : ''),
      };

      if (person) {
        Object.assign(person, row, {
          email: person.email || '',
          accessCode: person.accessCode || makeAccessCode(),
          bank: person.bank || '',
          account: person.account || '',
          notifyPayment: person.notifyPayment !== false,
        });
        updated++;
      } else {
        state.personnel.push({
          ...row,
          email: '',
          accessCode: makeAccessCode(),
          bank: '',
          account: '',
          notifyPayment: true,
        });
        added++;
      }
    });

    return { added, updated };
  }

  function render() {
    const tbody = document.querySelector('#personTable tbody');
    tbody.innerHTML = (state.personnel || [])
      .map((p) => {
        const acct = [p.bank, EF.maskAccount(p.account)].filter(Boolean).join('／') || '—';
        return (
          '<tr><td><code>' +
          esc(p.id) +
          '</code></td><td>' +
          esc(p.name) +
          '</td><td>' +
          esc(p.role) +
          '</td><td>' +
          esc(p.email || '—') +
          '</td><td>' +
          esc(acct) +
          '</td><td>$' +
          EF.fmtMoney(transferTotalFor(p.id)) +
          '</td><td class="no-print"><button type="button" class="btn-sm edit-person" data-id="' +
          esc(p.id) +
          '">編輯</button> <button type="button" class="btn-sm copy-profile" data-id="' +
          esc(p.id) +
          '">複製入口</button> <button type="button" class="btn-sm del-person" data-id="' +
          esc(p.id) +
          '">刪除</button></td></tr>'
        );
      })
      .join('');

    tbody.querySelectorAll('.edit-person').forEach((btn) => {
      btn.addEventListener('click', () => {
        const p = state.personnel.find((x) => x.id === btn.dataset.id);
        if (!p) return;
        document.getElementById('editId').value = p.id;
        document.getElementById('pName').value = p.name;
        document.getElementById('pRole').value = p.role;
        document.getElementById('pBank').value = p.bank || '';
        document.getElementById('pAccount').value = p.account || '';
        document.getElementById('pEmail').value = p.email || '';
        document.getElementById('pAccessCode').value = p.accessCode || '';
        document.getElementById('pNote').value = p.note || '';
      });
    });
    tbody.querySelectorAll('.copy-profile').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const p = state.personnel.find((x) => x.id === btn.dataset.id);
        if (!p) return;
        const text =
          '個人資料維護入口：' +
          profileUrl(p) +
          '\n人員ID：' +
          p.id +
          '\n登入碼：' +
          (p.accessCode || '尚未設定');
        try {
          await navigator.clipboard.writeText(text);
          setStatus('已複製個人入口與登入資訊 ✓', true);
        } catch (_) {
          prompt('請複製個人入口與登入資訊', text);
        }
      });
    });
    tbody.querySelectorAll('.del-person').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (!confirm('確定刪除此人員？')) return;
        state.personnel = state.personnel.filter((x) => x.id !== btn.dataset.id);
        EF.saveState(state);
        render();
      });
    });
  }

  function resetForm() {
    document.getElementById('editId').value = '';
    document.getElementById('personForm').reset();
  }

  document.getElementById('btnResetForm').addEventListener('click', resetForm);
  document.getElementById('btnGenerateCode').addEventListener('click', () => {
    document.getElementById('pAccessCode').value = makeAccessCode();
  });

  document.getElementById('btnImportRoster').addEventListener('click', async () => {
    if (!confirm('從出席名單同步委員與工作人員？既有 Email、登入碼、銀行帳號會保留。')) return;
    const url = gasUrl();
    if (!url) {
      setStatus('尚未設定 GAS 網址');
      return;
    }
    setStatus('同步出席名單中…');
    try {
      const res = await fetch(url + '?action=roster', { cache: 'no-cache' });
      const json = await res.json();
      if (!json.ok) throw new Error(json.error || '載入出席名單失敗');
      const result = mergeRosterMembers(json.members || [], json.groups || []);
      EF.saveState(state);
      render();
      setStatus('已同步出席名單：新增 ' + result.added + ' 人、更新 ' + result.updated + ' 人（請按儲存到雲端）', true);
    } catch (e) {
      setStatus('同步失敗：' + e.message);
    }
  });

  document.getElementById('personForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const editId = document.getElementById('editId').value;
    const row = {
      name: document.getElementById('pName').value.trim(),
      role: document.getElementById('pRole').value,
      bank: document.getElementById('pBank').value.trim(),
      account: document.getElementById('pAccount').value.trim(),
      email: document.getElementById('pEmail').value.trim(),
      accessCode: document.getElementById('pAccessCode').value.trim() || makeAccessCode(),
      note: document.getElementById('pNote').value.trim(),
    };
    if (editId) {
      const p = state.personnel.find((x) => x.id === editId);
      if (p) Object.assign(p, row);
    } else {
      state.personnel.push({ id: EF.uid('p'), ...row });
    }
    EF.saveState(state);
    resetForm();
    render();
    setStatus('已更新人員（記得按「儲存到雲端」）', true);
  });

  document.getElementById('btnSaveCloud').addEventListener('click', async () => {
    try {
      await EF.saveCloud(state, '人員帳戶');
      setStatus('已儲存到雲端 ✓', true);
    } catch (e) {
      setStatus('儲存失敗：' + e.message);
    }
  });

  render();
  EF.syncCloud(true).then((cloud) => {
    if (cloud) {
      state = cloud;
      render();
    }
  });
})();
