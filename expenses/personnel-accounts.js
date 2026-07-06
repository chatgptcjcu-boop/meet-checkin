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

  function render() {
    const tbody = document.querySelector('#personTable tbody');
    tbody.innerHTML = (state.personnel || [])
      .map((p) => {
        const acct = [p.bank, p.account].filter(Boolean).join('／') || '—';
        return (
          '<tr><td>' +
          p.name +
          '</td><td>' +
          p.role +
          '</td><td>' +
          acct +
          '</td><td>$' +
          EF.fmtMoney(transferTotalFor(p.id)) +
          '</td><td class="no-print"><button type="button" class="btn-sm edit-person" data-id="' +
          p.id +
          '">編輯</button> <button type="button" class="btn-sm del-person" data-id="' +
          p.id +
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
        document.getElementById('pNote').value = p.note || '';
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

  document.getElementById('personForm').addEventListener('submit', (ev) => {
    ev.preventDefault();
    const editId = document.getElementById('editId').value;
    const row = {
      name: document.getElementById('pName').value.trim(),
      role: document.getElementById('pRole').value,
      bank: document.getElementById('pBank').value.trim(),
      account: document.getElementById('pAccount').value.trim(),
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
