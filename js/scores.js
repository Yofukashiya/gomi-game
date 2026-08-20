/* shared scoreboard for DEADLINE DASH.
   Supabase REST only — no SDK, no build step. Leave CONFIG empty and the
   deck silently falls back to the local best score. */
const SCORES = (() => {
  const CONFIG = {
    url: 'https://wwllodbzsvzbhtknajbe.supabase.co',
    key: 'sb_publishable_vN8q0YaCzHdOTpsHhEo3IQ_8_R05PLG',   // publishable key: クライアント配布前提のキー
    table: 'scores',
  };
  const on = () => !!(CONFIG.url && CONFIG.key);
  const H = () => ({ apikey: CONFIG.key, Authorization: 'Bearer ' + CONFIG.key, 'Content-Type': 'application/json' });
  let poll = null;

  const name = () => localStorage.getItem('dd-name') || '';
  const setName = (n) => localStorage.setItem('dd-name', String(n).slice(0, 12));

  async function submit(score) {
    if (!on() || !name()) return null;
    const r = await fetch(`${CONFIG.url}/rest/v1/${CONFIG.table}`, {
      method: 'POST', headers: { ...H(), Prefer: 'return=minimal' },
      body: JSON.stringify({ name: name(), score: Math.max(0, Math.round(score)) }),
    });
    if (!r.ok) throw new Error('submit ' + r.status);
    return true;
  }

  async function top(n = 10) {
    if (!on()) return [];
    const r = await fetch(
      `${CONFIG.url}/rest/v1/${CONFIG.table}?select=name,score&order=score.desc&limit=${n}`,
      { headers: H() });
    if (!r.ok) throw new Error('top ' + r.status);
    return r.json();
  }

  function render(el, rows, mine) {
    if (!el) return;
    const msg = (t) => { el.textContent = ''; const p = document.createElement('p');
      p.className = 'lb-off'; p.textContent = t; el.appendChild(p); };
    if (!on()) return msg('スコアボードは未設定（ローカルのベストのみ）');
    if (!rows.length) return msg('まだ誰も納品していません');
    /* names come from other attendees — build with textContent, never innerHTML */
    el.textContent = '';
    const h = document.createElement('h4'); h.textContent = '🏆 LEADERBOARD'; el.appendChild(h);
    rows.forEach((r, i) => {
      const row = document.createElement('div');
      row.className = 'lb-row' + (r.name === mine ? ' me' : '');
      const rank = document.createElement('b'); rank.textContent = i + 1;
      const who = document.createElement('span'); who.textContent = String(r.name).slice(0, 12);
      const pts = document.createElement('i'); pts.textContent = Number(r.score) || 0;
      row.append(rank, who, pts); el.appendChild(row);
    });
  }

  async function refresh(el) {
    try { render(el, await top(), name()); }
    catch (e) {
      el.textContent = '';
      const p = document.createElement('p'); p.className = 'lb-off';
      p.textContent = `スコアボードに接続できません（${e.message}）`; el.appendChild(p);
    }
  }

  /* live-ish: re-read every 3s while the boss stage is on screen */
  function watch(el) {
    if (!on()) { render(el, []); return; }
    refresh(el); clearInterval(poll); poll = setInterval(() => refresh(el), 3000);
  }
  function unwatch() { clearInterval(poll); poll = null; }

  async function afterGame(score, el) {
    if (!on()) { render(el, []); return; }
    if (!name()) { askName(el, score); return; }
    try { await submit(score); } catch (e) { /* 表示は続ける */ }
    refresh(el);
  }

  function askName(el, score) {
    el.innerHTML = `<h4>スコアを登録</h4>
      <div class="lb-form"><input id="lb-name" maxlength="12" placeholder="名前（12文字まで）">
      <button class="btn" id="lb-send">登録</button></div>`;
    el.querySelector('#lb-send').onclick = async () => {
      const v = el.querySelector('#lb-name').value.trim();
      if (!v) return;
      setName(v);
      try { await submit(score); } catch (e) { /* noop */ }
      refresh(el);
    };
  }

  return { on, submit, top, watch, unwatch, afterGame, name, setName, CONFIG };
})();
window.SCORES = SCORES;
