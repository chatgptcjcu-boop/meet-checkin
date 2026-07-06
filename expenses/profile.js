(function () {
  const EF = window.ExpenseFinance;
  const qs = new URLSearchParams(location.search);
  let currentPersonId = qs.get('personId') || '';
  let currentAccessCode = '';
  let currentProfile = null;

  function setStatus(msg, ok) {
    const el = document.getElementById('status');
    el.hidden = !msg;
    el.textContent = msg || '';
    el.className = 'sync-banner no-print' + (ok ? ' ok' : msg ? ' err' : '');
  }

  function fillProfile(person) {
    currentProfile = person;
    document.getElementById('pName').value = person.name || '';
    document.getElementById('pRole').value = person.role || '';
    document.getElementById('pEmail').value = person.email || '';
    document.getElementById('pBank').value = person.bank || '';
    document.getElementById('pAccount').value = person.account || '';
    document.getElementById('pNote').value = person.note || '';
    document.getElementById('pNotifyPayment').checked = person.notifyPayment !== false;
    document.getElementById('profilePanel').hidden = false;
  }

  async function loadProfile(personId, accessCode) {
    const url = EF.gasUrl();
    if (!url) throw new Error('尚未設定 GAS 網址');
    const api = new URL(url);
    api.searchParams.set('action', 'expense-person-profile');
    api.searchParams.set('personId', personId);
    api.searchParams.set('accessCode', accessCode);
    const res = await fetch(api.toString(), { cache: 'no-cache' });
    const json = await res.json();
    if (!json.ok) throw new Error(json.error || '登入失敗');
    currentPersonId = personId;
    currentAccessCode = accessCode;
    fillProfile(json.person);
  }

  async function saveProfile() {
    if (!currentPersonId || !currentAccessCode || !currentProfile) {
      throw new Error('請先登入');
    }
    await fetch(EF.gasUrl(), {
      method: 'POST',
      mode: 'no-cors',
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action: 'expense-person-profile',
        personId: currentPersonId,
        accessCode: currentAccessCode,
        timestamp: new Date().toISOString(),
        profile: {
          email: document.getElementById('pEmail').value.trim(),
          bank: document.getElementById('pBank').value.trim(),
          account: document.getElementById('pAccount').value.trim(),
          note: document.getElementById('pNote').value.trim(),
          notifyPayment: document.getElementById('pNotifyPayment').checked,
        },
        pageUrl: location.href,
      }),
    });
  }

  document.getElementById('personId').value = currentPersonId;

  document.getElementById('loginForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setStatus('讀取中…');
    try {
      await loadProfile(
        document.getElementById('personId').value.trim(),
        document.getElementById('accessCode').value.trim()
      );
      setStatus('已讀取個人資料 ✓', true);
    } catch (e) {
      setStatus(e.message);
    }
  });

  document.getElementById('profileForm').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    setStatus('儲存中…');
    try {
      await saveProfile();
      setStatus('已送出儲存。請主辦端同步雲端後確認資料。', true);
    } catch (e) {
      setStatus('儲存失敗：' + e.message);
    }
  });

  document.getElementById('btnClearAccount').addEventListener('click', () => {
    if (!confirm('確定清除銀行與帳號？')) return;
    document.getElementById('pBank').value = '';
    document.getElementById('pAccount').value = '';
  });
})();
