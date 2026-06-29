/** 經費頁面密碼閘（sessionStorage，關閉分頁後需重新輸入） */
(function () {
  const AUTH_KEY = 'meet-checkin-expenses-auth-v1';
  const PASS_HASH = '4976f0fe46a1a5d8f0fa99cbe09a273b34e8386c9f4c73fa99e390ddc3181c64';

  async function sha256(msg) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(msg));
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  function authed() {
    return sessionStorage.getItem(AUTH_KEY) === PASS_HASH;
  }

  function grant() {
    sessionStorage.setItem(AUTH_KEY, PASS_HASH);
  }

  function buildGate() {
    if (document.getElementById('expense-auth-gate')) return;

    const gate = document.createElement('div');
    gate.id = 'expense-auth-gate';
    gate.innerHTML = `
      <style>
        #expense-auth-gate {
          position: fixed; inset: 0; z-index: 99999;
          background: linear-gradient(145deg, #0f172a 0%, #1e3a5f 55%, #0f766e 100%);
          display: flex; align-items: center; justify-content: center;
          font-family: 'Noto Sans TC', 'PingFang TC', sans-serif;
          padding: 1rem;
        }
        #expense-auth-gate .card {
          background: #fff; border-radius: 14px; padding: 1.75rem 1.5rem;
          max-width: 22rem; width: 100%; box-shadow: 0 20px 50px rgb(0 0 0 / 0.35);
        }
        #expense-auth-gate h2 { margin: 0 0 0.35rem; font-size: 1.05rem; color: #1e3a5f; }
        #expense-auth-gate p { margin: 0 0 1rem; font-size: 0.82rem; color: #64748b; line-height: 1.55; }
        #expense-auth-gate label { display: block; font-size: 0.78rem; font-weight: 700; color: #334155; margin-bottom: 0.35rem; }
        #expense-auth-gate input {
          width: 100%; padding: 0.55rem 0.65rem; border: 1px solid #cbd5e1;
          border-radius: 8px; font-size: 0.95rem; margin-bottom: 0.75rem;
        }
        #expense-auth-gate button {
          width: 100%; padding: 0.6rem; border: none; border-radius: 8px;
          background: #1e3a5f; color: #fff; font-weight: 700; cursor: pointer; font-size: 0.9rem;
        }
        #expense-auth-gate button:hover { background: #0f2744; }
        #expense-auth-gate .err { color: #b91c1c; font-size: 0.78rem; min-height: 1.1rem; margin-top: 0.35rem; }
        #expense-auth-gate .hint { font-size: 0.72rem; color: #94a3b8; margin-top: 0.85rem; text-align: center; }
      </style>
      <div class="card">
        <h2>經費編列與簽收單</h2>
        <p>本區僅供指定人員閱讀。請輸入存取密碼。</p>
        <form id="expense-auth-form">
          <label for="expense-auth-pw">密碼</label>
          <input id="expense-auth-pw" type="password" autocomplete="current-password" required autofocus>
          <button type="submit">進入</button>
          <div class="err" id="expense-auth-err" aria-live="polite"></div>
        </form>
        <p class="hint">關閉瀏覽器分頁後需重新輸入密碼</p>
      </div>`;

    const root = document.body || document.documentElement;
    root.appendChild(gate);

    const form = gate.querySelector('#expense-auth-form');
    const input = gate.querySelector('#expense-auth-pw');
    const err = gate.querySelector('#expense-auth-err');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.textContent = '';
      const hash = await sha256(input.value);
      if (hash === PASS_HASH) {
        grant();
        gate.remove();
      } else {
        err.textContent = '密碼錯誤，請再試一次';
        input.value = '';
        input.focus();
      }
    });

    input.focus();
  }

  if (authed()) return;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buildGate);
  } else {
    buildGate();
  }
})();
