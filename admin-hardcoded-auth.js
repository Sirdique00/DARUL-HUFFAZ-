/* DH_HARDCODED_ADMIN_AUTH_V3 */
(() => {
  'use strict';
  const USERNAME = 'Sirdique';
  const PASSWORD = '*9781place#';
  const PIN = '009781';
  const $ = id => document.getElementById(id);
  let approvedPin = '';
  let busy = false;

  function showError(message) { alert(message); }

  function prepareLoginPage(pin) {
    approvedPin = pin;
    const user = $('adminUser');
    const pass = $('adminPass');
    if (!user || !pass) return;
    user.value = USERNAME;
    pass.value = PASSWORD;
    user.readOnly = true;
    pass.readOnly = true;
    user.style.background = '#f0fdf4';
    pass.style.background = '#f0fdf4';
    const pinField = $('adminLoginPin');
    if (pinField) {
      pinField.value = pin;
      pinField.readOnly = true;
      pinField.style.background = '#f0fdf4';
    }
    const title = $('loginPage')?.querySelector('h2');
    if (title) title.textContent = 'Admin Login — Verified';
    const noteId = 'dhAdminCredentialNote';
    if (!$(noteId)) {
      const note = document.createElement('div');
      note.id = noteId;
      note.style.cssText = 'margin:10px 0;padding:12px;border:1px solid #bbf7d0;border-radius:10px;background:#f0fdf4;color:#166534;font-size:13px;line-height:1.5;text-align:center;font-weight:700';
      note.textContent = '✓ PIN verified. Admin username and password have been revealed automatically.';
      pass.parentNode.insertAdjacentElement('afterend', note);
    }
    if (typeof showPage === 'function') showPage('loginPage');
  }

  async function verifyPinAndReveal(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (busy) return;
    const pin = String($('adminPin')?.value || '').trim();
    if (pin !== PIN) return showError('PIN ba daidai ba.');
    busy = true;
    const btn = $('verifyPinBtn');
    const old = btn?.innerText;
    if (btn) { btn.disabled = true; btn.innerText = 'Ana tabbatar da PIN...'; }
    try {
      const result = await supabaseClient.functions.invoke('verify-admin-gate', { body: { pin } });
      if (result?.error || result?.data?.success !== true) throw new Error('PIN ba daidai ba.');
      prepareLoginPage(pin);
    } catch (err) {
      console.error(err);
      showError('PIN ba daidai ba ko an kasa tabbatar da shi.');
    } finally {
      busy = false;
      if (btn) { btn.disabled = false; btn.innerText = old || 'Continue'; }
    }
  }

  async function login(e) {
    e.preventDefault();
    e.stopImmediatePropagation();
    if (busy) return;
    if (approvedPin !== PIN) return showError('Da farko ka tabbatar da PIN daga matakin baya.');
    busy = true;
    const btn = $('verifyLoginBtn');
    const old = btn?.innerText;
    if (btn) { btn.disabled = true; btn.innerText = 'Ana shiga Dashboard...'; }
    try {
      const result = await supabaseClient.functions.invoke('admin-hardcoded-login', {
        body: { username: USERNAME, password: PASSWORD, pin: approvedPin }
      });
      if (result?.error || !result?.data?.success || !result?.data?.session?.access_token || !result?.data?.session?.refresh_token) {
        throw new Error(result?.data?.error || result?.error?.message || 'ADMIN_LOGIN_FAILED');
      }
      const sessionResult = await supabaseClient.auth.setSession(result.data.session);
      if (sessionResult?.error) throw sessionResult.error;
      if (typeof showPage === 'function') showPage('adminDashboard');
      if (typeof loadDashboardData === 'function') await loadDashboardData();
    } catch (err) {
      console.error(err);
      showError('An kasa shiga Admin Dashboard: ' + (err?.message || err));
    } finally {
      busy = false;
      if (btn) { btn.disabled = false; btn.innerText = old || 'Login ➔'; }
    }
  }

  function bind() {
    const pinBtn = $('verifyPinBtn');
    if (pinBtn && !pinBtn.dataset.dhHardcodedGate) {
      pinBtn.dataset.dhHardcodedGate = '1';
      pinBtn.addEventListener('click', verifyPinAndReveal, true);
    }
    const loginBtn = $('verifyLoginBtn');
    if (loginBtn && !loginBtn.dataset.dhHardcodedLogin) {
      loginBtn.dataset.dhHardcodedLogin = '1';
      loginBtn.addEventListener('click', login, true);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
  new MutationObserver(bind).observe(document.documentElement, { subtree: true, childList: true });
})();
