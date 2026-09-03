/* DH_SUPABASE_CODE_GENERATOR_V4 */
(() => {
  'use strict';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const el = id => document.getElementById(id);
  let historyBusy = false;

  function findButton() {
    for (const id of ['generateCodesBtn','generateCodeBtn','generateCodeButton','createCodeBtn']) {
      const b = el(id); if (b) return b;
    }
    return [...document.querySelectorAll('button')].find(b => /generate\s*(registration\s*)?codes?|generate\s*code|create\s*code/i.test((b.innerText || b.textContent || '').trim()));
  }

  function getActiveCodes() {
    return [...document.querySelectorAll('#dhCodeHistory [data-code][data-active="true"]')]
      .map(x => x.dataset.code)
      .filter(Boolean);
  }

  async function copyActiveCodes() {
    let codes = getActiveCodes();
    if (!codes.length && window.supabaseClient) {
      try {
        const { data, error } = await supabaseClient.from('codes').select('code').eq('is_used', false).order('created_at', { ascending:false }).limit(1000);
        if (!error) codes = (data || []).map(x => x.code).filter(Boolean);
      } catch (e) { console.warn('Active codes copy:', e); }
    }
    if (!codes.length) return alert('Babu active/unused code da za a kwafa.');
    const text = codes.join('\n');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove(); }
      alert(`An kwafe ${codes.length} active code(s) kawai.`);
    } catch (e) { console.error(e); alert('An kasa kwafa codes.'); }
  }

  function ensurePanel(btn) {
    let panel = el('dhCodeGeneratorPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'dhCodeGeneratorPanel';
    panel.style.cssText = 'margin:18px 0;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.05)';
    panel.innerHTML = `
      <div style="font-weight:800;color:#064e3b;font-size:18px;margin-bottom:12px">🔐 Registration Codes</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label style="font-size:13px;font-weight:700">Number of codes
          <input id="dhCodeCount" type="number" min="1" max="100" value="10" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:8px">
        </label>
        <label style="font-size:13px;font-weight:700">Level
          <select id="dhCodeLevel" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="advance">Advance</option>
          </select>
        </label>
      </div>
      <div id="dhCodeResult" style="margin-top:12px"></div>
      <div style="display:flex;gap:8px;margin-top:12px">
        <button type="button" id="dhRefreshCodes" style="flex:1">🔄 Refresh History</button>
        <button type="button" id="dhCopyCodes" style="flex:1">📋 Copy All Active</button>
      </div>
      <div id="dhCodeHistory" style="margin-top:14px;overflow:auto"></div>`;
    btn.parentNode.insertBefore(panel, btn.nextSibling);
    el('dhRefreshCodes').onclick = loadHistory;
    el('dhCopyCodes').onclick = copyActiveCodes;
    return panel;
  }

  async function generate(btn) {
    const panel = ensurePanel(btn);
    const count = Math.min(100, Math.max(1, Number(el('dhCodeCount')?.value || 10)));
    const level = el('dhCodeLevel')?.value || 'intermediate';
    const result = el('dhCodeResult');
    const old = btn.innerText;
    btn.disabled = true; btn.innerText = 'Ana generating...';
    result.innerHTML = '<div style="padding:10px;color:#64748b">Ana samar da codes a Supabase...</div>';
    try {
      if (!window.supabaseClient) throw new Error('Supabase client bai shirya ba.');
      const { data, error } = await supabaseClient.functions.invoke('generate-registration-codes', { body: { count, level } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.error || 'GENERATION_FAILED');
      result.innerHTML = `<div style="font-weight:800;color:#047857;margin-bottom:8px">✅ An samar da ${data.count} ${esc(level)} code(s).</div><div style="display:grid;gap:6px">${(data.codes || []).map(x => `<div data-code="${esc(x.code)}" style="font-family:monospace;font-weight:800;padding:9px 11px;border:1px solid #d1fae5;border-radius:8px;background:#f0fdf4">${esc(x.code)} <span style="float:right;font-family:inherit;font-weight:600;color:#64748b">ACTIVE</span></div>`).join('')}</div>`;
      await loadHistory();
    } catch (e) {
      console.error(e);
      result.innerHTML = `<div style="padding:10px;border-radius:8px;background:#fef2f2;color:#b91c1c">❌ An kasa generating: ${esc(e?.message || e)}</div>`;
    } finally { btn.disabled = false; btn.innerText = old || 'Generate Code'; }
  }

  async function loadHistory() {
    if (historyBusy || !window.supabaseClient || !el('dhCodeHistory')) return;
    historyBusy = true;
    try {
      const { data, error } = await supabaseClient.from('codes').select('id,code,level,is_used,used_by,used_at,created_at').order('created_at', { ascending:false }).limit(1000);
      if (error) throw error;
      el('dhCodeHistory').innerHTML = `<div style="font-weight:800;margin-bottom:8px;color:#0f172a">Code History (${data?.length || 0})</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid #e2e8f0">Code</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Level</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Status</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Used At</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Created</th></tr></thead><tbody>${(data || []).map(x => `<tr><td data-code="${esc(x.code)}" data-active="${x.is_used ? 'false' : 'true'}" style="padding:7px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700">${esc(x.code)}</td><td style="padding:7px;text-align:center;border-bottom:1px solid #f1f5f9">${esc(x.level)}</td><td style="padding:7px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:800">${x.is_used ? 'USED' : 'ACTIVE'}</td><td style="padding:7px;border-bottom:1px solid #f1f5f9">${x.used_at ? esc(new Date(x.used_at).toLocaleString()) : '—'}</td><td style="padding:7px;border-bottom:1px solid #f1f5f9">${esc(new Date(x.created_at).toLocaleString())}</td></tr>`).join('')}</tbody></table>`;
    } catch (e) { console.warn('Code history:', e); }
    finally { historyBusy = false; }
  }

  function bind() {
    const btn = findButton();
    if (!btn) return;
    ensurePanel(btn);
    if (btn.dataset.dhCodeV4) return;
    btn.dataset.dhCodeV4 = '1';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); generate(btn); }, true);
    loadHistory();
  }

  function boot() { bind(); setTimeout(bind, 500); setTimeout(bind, 1500); setTimeout(bind, 3000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  new MutationObserver(bind).observe(document.documentElement, { subtree:true, childList:true });
})();
