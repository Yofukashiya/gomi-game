/* deck engine: navigation, HUD, presenter notes, overview, EXP */
const DECK = (() => {
  const S = { i: 0, stages: [], exp: 0, lv: 1, world: null, hooks: [], seen: new Set() };
  const $ = (s) => document.querySelector(s);

  /* stage hooks: DECK.on('ジャンプ', {enter(el), leave(el)}) */
  function on(match, fns) { S.hooks.push({ match, fns }); }
  function hooksFor(el) {
    const t = el.dataset.title || '';
    return S.hooks.filter(h => t.includes(h.match)).map(h => h.fns);
  }

  /* game-style stage announcement on every move; bigger when the WORLD changes */
  function levelCard(to, n) {
    const el = $('#levelcard'); if (!el) return;
    const w = to.dataset.world || '';
    const big = w !== S.world; S.world = w;
    el.querySelector('i').textContent = big ? w : `STAGE ${String(n).padStart(2, '0')}`;
    el.querySelector('b').textContent = to.dataset.title || '';
    el.classList.remove('on', 'big');
    void el.offsetWidth;                       /* restart the CSS animation */
    el.classList.add('on'); if (big) el.classList.add('big');
  }

  function levelUp() {
    const lv = 1 + Math.floor(S.exp / 60);
    if (lv > S.lv) { S.lv = lv; toast(`⬆ LEVEL UP  Lv.${lv}`); document.body.classList.add('lvflash');
      setTimeout(() => document.body.classList.remove('lvflash'), 700); }
  }

  function toast(msg) {
    const t = $('#toast');
    t.textContent = msg; t.classList.add('on');
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove('on'), 1400);
  }

  function exp(n, why) {
    S.exp += n;
    $('#hud-exp').textContent = S.exp;
    toast(`+${n} EXP　${why || ''}`);
    levelUp();
  }
  /* award once per key — keeps the HUD honest when a stage is revisited */
  function expOnce(key, n, why) { if (!S.seen.has(key)) { S.seen.add(key); exp(n, why); } }

  function go(n, dir) {
    n = Math.max(0, Math.min(S.stages.length - 1, n));
    if (n === S.i && S.stages[n].classList.contains('on')) return;
    const from = S.stages[S.i], to = S.stages[n];
    if (from && from !== to) hooksFor(from).forEach(f => f.leave && f.leave(from));
    S.stages.forEach(s => s.classList.remove('on'));
    to.classList.add('on');
    S.i = n;
    history.replaceState(null, '', '#' + n);
    $('#hud-stage').textContent = `${n} / ${S.stages.length - 1}`;
    $('#hud-world').textContent = to.dataset.world || '';
    $('#hud-fill').style.width = (n / (S.stages.length - 1) * 100) + '%';
    $('#notes-body').textContent = to.dataset.note || '（メモなし）';
    document.querySelectorAll('.ov').forEach((b, k) => b.classList.toggle('cur', k === n));
    if (window.WORLD3D) {
      WORLD3D.setWorld(to.dataset.world);
      WORLD3D.pause(to.classList.contains('boss-stage'));   /* mini-game owns the GPU */
    }
    levelCard(to, n);
    hooksFor(to).forEach(f => f.enter && f.enter(to));
    to.scrollTop = 0;
  }

  function init() {
    S.stages = [...document.querySelectorAll('.stage')];

    /* overview */
    const ov = $('#ov-grid');
    S.stages.forEach((s, k) => {
      const b = document.createElement('button');
      b.className = 'ov';
      b.innerHTML = `<small>${String(k).padStart(2, '0')} · ${s.dataset.world}</small><b>${s.dataset.title}</b>`;
      b.onclick = () => { $('#overview').classList.remove('on'); go(k); };
      ov.appendChild(b);
    });

    const notes = $('#notes'), overview = $('#overview');
    $('#btn-notes').onclick = () => notes.classList.toggle('on');
    $('#btn-map').onclick = () => overview.classList.toggle('on');
    $('#nav-prev').onclick = () => go(S.i - 1, -1);
    $('#nav-next').onclick = () => go(S.i + 1, 1);

    addEventListener('keydown', (e) => {
      const typing = /^(INPUT|TEXTAREA)$/.test(e.target.tagName);
      if (e.key === 'Escape') { overview.classList.remove('on'); notes.classList.remove('on'); return; }
      if (e.key === 'n' || e.key === 'N') { notes.classList.toggle('on'); return; }
      if (e.key === 'g' || e.key === 'G') { overview.classList.toggle('on'); return; }
      if (e.key === 'f' || e.key === 'F') {
        (document.fullscreenElement ? document.exitFullscreen() : document.body.requestFullscreen()).catch(() => {});
        return;
      }
      if (typing) return;
      /* arrows drive the mini-game on the boss stage — leave it with G */
      const boss = S.stages[S.i].classList.contains('boss-stage');
      if (e.key === 'ArrowRight' || e.key === 'PageDown') { if (!boss) go(S.i + 1, 1); e.preventDefault(); }
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') { if (!boss) go(S.i - 1, -1); e.preventDefault(); }
      if (e.key === 'Enter' && S.i === 0) go(1, 1);
      /* Space advances only where it isn't the game button */
      if (e.key === ' ' && !S.stages[S.i].classList.contains('lab-stage')
        && !S.stages[S.i].classList.contains('boss-stage')) { go(S.i + 1, 1); e.preventDefault(); }
    });

    $('#press-start').onclick = () => go(1, 1);
    if (window.WORLD3D) WORLD3D.init();
    LABS.install(DECK);
    BOSS.install(DECK);
    go(Math.max(0, Math.min(S.stages.length - 1, parseInt(location.hash.slice(1), 10) || 0)));
  }

  return { init, on, go, exp, expOnce, toast, get index() { return S.i; } };
})();
