/* DH_SUPABASE_CODE_GENERATOR_V5 */
(() => {
  'use strict';
  const MAX_ACTIVE = 40;
  const BATCH_SIZE = 10;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const el = id => document.getElementById(id);
  let historyBusy = false;

  function findButton() {
    for (const id of ['generateCodesBtn','generateCodeBtn','generateCodeButton','createCodeBtn']) {
      const b = el(id); if (b) return b;
    }
    return [...document.querySelectorAll('button')].find(b => /generate\s*(registration\s*)?codes?|generate\s*code|create\s*code/i.test((b.innerText || b.textContent || '').trim()));
  }

  async function copyText(text, successMessage) {
    if (!text) return alert('Babu code da za a kwafa.');
    try {
      if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(text);
      else { const ta=document.createElement('textarea'); ta.value=text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); }
      alert(successMessage || 'An kwafe code.');
    } catch (e) { console.error(e); alert('An kasa kwafa code.'); }
  }

  async function copyActiveCodes() {
    if (!window.supabaseClient) return alert('Supabase client bai shirya ba.');
    try {
      const { data, error } = await supabaseClient.from('codes').select('code').eq('is_used', false).order('created_at', { ascending:false }).limit(40);
      if (error) throw error;
      const codes = (data || []).map(x => x.code).filter(Boolean);
      if (!codes.length) return alert('Babu active/unused code da za a kwafa.');
      await copyText(codes.join('\n'), `An kwafe ${codes.length} active code(s) kawai.`);
    } catch (e) { console.error(e); alert('An kasa dauko active codes.'); }
  }

  async function copyOne(code) { await copyText(code, `An kwafe: ${code}`); }

  async function deleteOne(id, code, isUsed) {
    if (isUsed) return alert('Wannan code an riga an yi amfani da shi. Ba za a iya goge shi ba domin a adana history.');
    if (!window.supabaseClient) return alert('Supabase client bai shirya ba.');
    if (!confirm(`Kana tabbatar da goge wannan active code?\n\n${code}`)) return;
    try {
      const { error } = await supabaseClient.from('codes').delete().eq('id', id).eq('is_used', false);
      if (error) throw error;
      await loadHistory();
      alert(`An goge: ${code}`);
    } catch (e) { console.error(e); alert(`An kasa goge code: ${e?.message || e}`); }
  }

  function ensurePanel(btn) {
    let panel = el('dhCodeGeneratorPanel');
    if (panel) return panel;
    panel = document.createElement('div');
    panel.id = 'dhCodeGeneratorPanel';
    panel.style.cssText = 'margin:18px 0;padding:18px;border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.05)';
    panel.innerHTML = `
      <div style="font-weight:800;color:#064e3b;font-size:18px;margin-bottom:6px">🔐 Registration Codes</div>
      <div style="font-size:13px;color:#64748b;margin-bottom:12px">Maximum active codes: <b>40</b> • Every Generate click creates exactly <b>10</b> codes.</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
        <label style="font-size:13px;font-weight:700">Generate batch
          <input id="dhCodeCount" type="number" value="10" disabled style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:8px;background:#f8fafc">
        </label>
        <label style="font-size:13px;font-weight:700">Level
          <select id="dhCodeLevel" style="width:100%;box-sizing:border-box;padding:10px;margin-top:5px;border:1px solid #cbd5e1;border-radius:8px">
            <option value="beginner">Beginner</option><option value="intermediate" selected>Intermediate</option><option value="advance">Advance</option>
          </select>
        </label>
      </div>
      <div id="dhCodeResult" style="margin-top:12px"></div>
      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
        <button type="button" id="dhRefreshCodes" style="flex:1;min-width:140px">🔄 Refresh History</button>
        <button type="button" id="dhCopyCodes" style="flex:1;min-width:140px">📋 Copy All Active</button>
      </div>
      <div id="dhCodeHistory" style="margin-top:14px;overflow:auto"></div>`;
    btn.parentNode.insertBefore(panel, btn.nextSibling);
    el('dhRefreshCodes').onclick = loadHistory;
    el('dhCopyCodes').onclick = copyActiveCodes;
    return panel;
  }

  async function generate(btn) {
    ensurePanel(btn);
    const level = el('dhCodeLevel')?.value || 'intermediate';
    const result = el('dhCodeResult');
    const old = btn.innerText;
    btn.disabled = true; btn.innerText = 'Ana generating...';
    result.innerHTML = '<div style="padding:10px;color:#64748b">Ana duba active codes sannan ana samar da 10 a Supabase...</div>';
    try {
      if (!window.supabaseClient) throw new Error('Supabase client bai shirya ba.');
      const { data, error } = await supabaseClient.functions.invoke('generate-registration-codes', { body: { count: BATCH_SIZE, level } });
      if (error) throw error;
      if (!data?.success) throw new Error(data?.message || data?.error || 'GENERATION_FAILED');
      result.innerHTML = `<div style="font-weight:800;color:#047857;margin-bottom:8px">✅ An samar da ${data.count} ${esc(level)} code(s). Active: ${data.active_after}/${MAX_ACTIVE}</div><div style="display:grid;gap:6px">${(data.codes || []).map(x => `<div data-code="${esc(x.code)}" style="font-family:monospace;font-weight:800;padding:9px 11px;border:1px solid #d1fae5;border-radius:8px;background:#f0fdf4;display:flex;align-items:center;gap:7px;flex-wrap:wrap"><span style="flex:1;min-width:170px">${esc(x.code)}</span><span style="font-family:inherit;font-weight:600;color:#047857">ACTIVE</span><button type="button" data-copy-code="${esc(x.code)}" style="padding:5px 9px">📋 Copy</button><button type="button" data-delete-id="${esc(x.id)}" data-delete-code="${esc(x.code)}" style="padding:5px 9px">🗑️ Delete</button></div>`).join('')}</div>`;
      bindRowButtons();
      await loadHistory();
    } catch (e) {
      console.error(e);
      const msg = e?.message || String(e);
      result.innerHTML = `<div style="padding:10px;border-radius:8px;background:#fef2f2;color:#b91c1c">❌ ${esc(msg)}</div>`;
      await loadHistory();
    } finally { btn.disabled = false; btn.innerText = old || 'Generate Code'; }
  }

  function bindRowButtons() {
    document.querySelectorAll('#dhCodeHistory [data-copy-code], #dhCodeResult [data-copy-code]').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1'; b.onclick = () => copyOne(b.dataset.copyCode);
    });
    document.querySelectorAll('#dhCodeHistory [data-delete-id], #dhCodeResult [data-delete-id]').forEach(b => {
      if (b.dataset.bound) return;
      b.dataset.bound = '1'; b.onclick = () => deleteOne(b.dataset.deleteId, b.dataset.deleteCode, b.dataset.used === 'true');
    });
  }

  async function loadHistory() {
    if (historyBusy || !window.supabaseClient || !el('dhCodeHistory')) return;
    historyBusy = true;
    try {
      const { data, error } = await supabaseClient.from('codes').select('id,code,level,is_used,used_by,used_at,created_at').order('created_at', { ascending:false }).limit(1000);
      if (error) throw error;
      const rows = data || [];
      const active = rows.filter(x => !x.is_used).length;
      el('dhCodeHistory').innerHTML = `<div style="font-weight:800;margin-bottom:8px;color:#0f172a">Code History (${rows.length}) • Active ${active}/${MAX_ACTIVE}</div><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr><th style="text-align:left;padding:7px;border-bottom:1px solid #e2e8f0">Code</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Level</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Status</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Used At</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Created</th><th style="padding:7px;border-bottom:1px solid #e2e8f0">Action</th></tr></thead><tbody>${rows.map(x => `<tr><td style="padding:7px;border-bottom:1px solid #f1f5f9;font-family:monospace;font-weight:700">${esc(x.code)}</td><td style="padding:7px;text-align:center;border-bottom:1px solid #f1f5f9">${esc(x.level)}</td><td style="padding:7px;text-align:center;border-bottom:1px solid #f1f5f9;font-weight:800">${x.is_used ? 'USED' : 'ACTIVE'}</td><td style="padding:7px;border-bottom:1px solid #f1f5f9">${x.used_at ? esc(new Date(x.used_at).toLocaleString()) : '—'}</td><td style="padding:7px;border-bottom:1px solid #f1f5f9">${esc(new Date(x.created_at).toLocaleString())}</td><td style="padding:7px;text-align:center;border-bottom:1px solid #f1f5f9;white-space:nowrap"><button type="button" data-copy-code="${esc(x.code)}">📋 Copy</button> <button type="button" data-delete-id="${esc(x.id)}" data-delete-code="${esc(x.code)}" data-used="${x.is_used ? 'true' : 'false'}" ${x.is_used ? 'disabled title="Used code history cannot be deleted"' : ''}>🗑️ Delete</button></td></tr>`).join('')}</tbody></table>`;
      bindRowButtons();
    } catch (e) { console.warn('Code history:', e); }
    finally { historyBusy = false; }
  }

  function bind() {
    const btn = findButton();
    if (!btn) return;
    ensurePanel(btn);
    if (btn.dataset.dhCodeV5) return;
    btn.dataset.dhCodeV5 = '1';
    btn.addEventListener('click', e => { e.preventDefault(); e.stopImmediatePropagation(); generate(btn); }, true);
    loadHistory();
  }

  function boot() { bind(); setTimeout(bind, 500); setTimeout(bind, 1500); setTimeout(bind, 3000); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
  new MutationObserver(bind).observe(document.documentElement, { subtree:true, childList:true });
})();
