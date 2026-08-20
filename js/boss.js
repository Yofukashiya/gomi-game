/* FINAL BOSS: DEADLINE DASH — 3D mini-game (Three.js, no audio) */
const BOSS = (() => {
  const $ = (s) => document.querySelector(s);
  const R = 26;                 // half-size of the play field
  let ren, scene, cam, cv;
  let player, box3, feats = [], bugs = [];
  let keys = {}, st = null, stop = null, ready = false;
  let touch = { on: false, ax: 0, az: 0, dash: false, id: null, ox: 0, oy: 0 };

  const rnd = (a, b) => a + Math.random() * (b - a);
  const spot = () => { // random spot, not too close to the release box
    let x, z;
    do { x = rnd(-R + 3, R - 3); z = rnd(-R + 3, R - 3); } while (Math.hypot(x, z - (R - 6)) < 8);
    return [x, z];
  };

  function gridTexture() { // ponytail: procedural, so the deck needs no image files
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#0a1024'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(60,224,255,.30)'; g.lineWidth = 2;
    g.strokeRect(0, 0, 256, 256);
    g.strokeStyle = 'rgba(60,224,255,.10)';
    for (let i = 32; i < 256; i += 32) {
      g.beginPath(); g.moveTo(i, 0); g.lineTo(i, 256); g.moveTo(0, i); g.lineTo(256, i); g.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(R / 2, R / 2);
    return t;
  }

  const mat = (color, emissive, i) => new THREE.MeshStandardMaterial({
    color, roughness: .6, flatShading: true,
    emissive: emissive || 0x000000, emissiveIntensity: i || 0
  });

  function makeDev() {
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(1, 1.2, .8), mat(0x3ce0ff, 0x1b6d80, .5));
    body.position.y = 1; g.add(body);
    const head = new THREE.Mesh(new THREE.BoxGeometry(.8, .7, .75), mat(0xffe0bd));
    head.position.y = 2; g.add(head);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(.9, .25, .85), mat(0xff5cc8));
    cap.position.y = 2.42; g.add(cap);
    [-.35, .35].forEach(x => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(.28, .8, .28), mat(0x2b3a63));
      l.position.set(x, .4, 0); g.add(l);
    });
    g.userData.stack = new THREE.Group(); g.userData.stack.position.y = 1.8;
    g.add(g.userData.stack);
    return g;
  }

  function makeFeature() {
    const m = new THREE.Mesh(new THREE.OctahedronGeometry(.45), mat(0xffd166, 0xffd166, .8));
    m.position.y = .9; return m;
  }

  function makeBug() {
    const g = new THREE.Group();
    const b = new THREE.Mesh(new THREE.BoxGeometry(1, .7, 1.3), mat(0x2a1030, 0xff2d8a, .55));
    b.position.y = .6; g.add(b);
    [-.4, .4].forEach(x => [-.4, .4].forEach(z => {
      const l = new THREE.Mesh(new THREE.BoxGeometry(.16, .5, .16), mat(0x59125f));
      l.position.set(x * 1.2, .3, z); g.add(l);
    }));
    [-.25, .25].forEach(x => {
      const e = new THREE.Mesh(new THREE.BoxGeometry(.16, .16, .1), mat(0xff5cc8, 0xff5cc8, 1));
      e.position.set(x, .8, .68); g.add(e);
    });
    return g;
  }

  function build() {
    ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true });
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x04060f);
    scene.fog = new THREE.Fog(0x04060f, 26, 62);
    cam = new THREE.PerspectiveCamera(52, 1, .1, 220);

    scene.add(new THREE.HemisphereLight(0x6ea8ff, 0x0a0f20, .9));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(12, 22, 8); scene.add(dl);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(R * 2, R * 2),
      new THREE.MeshStandardMaterial({ map: gridTexture(), roughness: .9 }));
    floor.rotation.x = -Math.PI / 2; scene.add(floor);

    /* walls */
    for (let i = 0; i < 4; i++) {
      const w = new THREE.Mesh(new THREE.BoxGeometry(R * 2, 2, .6), mat(0x1a2450, 0x3ce0ff, .12));
      w.position.set(i < 2 ? 0 : (i === 2 ? -R : R), 1, i < 2 ? (i ? -R : R) : 0);
      if (i >= 2) w.rotation.y = Math.PI / 2;
      scene.add(w);
    }
    /* obstacles: server racks */
    for (let i = 0; i < 12; i++) {
      const h = rnd(2, 4.5);
      const m = new THREE.Mesh(new THREE.BoxGeometry(rnd(1.4, 3), h, rnd(1.4, 3)), mat(0x141d3c, 0x2a63ff, .1));
      const [x, z] = spot(); m.position.set(x, h / 2, z); scene.add(m);
    }
    /* release box */
    box3 = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 4), mat(0x5ff2a8, 0x1d7a4d, .45));
    crate.position.y = 1.2; box3.add(crate);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(3.2, .12, 6, 28), mat(0x5ff2a8, 0x5ff2a8, 1));
    ring.rotation.x = Math.PI / 2; ring.position.y = .1; box3.add(ring);
    box3.position.set(0, 0, R - 6); scene.add(box3);

    player = makeDev(); scene.add(player);

    for (let i = 0; i < 14; i++) { const f = makeFeature(); const [x, z] = spot(); f.position.set(x, .9, z); feats.push(f); scene.add(f); }
    for (let i = 0; i < 6; i++) { const b = makeBug(); const [x, z] = spot(); b.position.set(x, 0, z); b.userData.dir = rnd(0, 7); bugs.push(b); scene.add(b); }
    ready = true;
  }

  function reset() {
    st = { t: 60, score: 0, carry: 0, over: false, px: 0, pz: R - 12, vx: 0, vz: 0, hitCool: 0 };
    player.position.set(st.px, 0, st.pz);
    cam.position.set(st.px, 15, st.pz + 17);   /* snap, don't lerp in from origin */
    cam.lookAt(st.px, 1.4, st.pz);
    player.userData.stack.clear();
    feats.forEach(f => { const [x, z] = spot(); f.position.set(x, .9, z); f.visible = true; });
    bugs.forEach(b => { const [x, z] = spot(); b.position.set(x, 0, z); });
  }

  function stack() {
    const s = player.userData.stack; s.clear();
    for (let i = 0; i < st.carry; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(.26), mat(0xffd166, 0xffd166, .9));
      m.position.set(0, i * .45, -.2); s.add(m);
    }
  }

  function finish(msg, sub) {
    st.over = true;
    const best = Math.max(st.score, +(localStorage.getItem('dd-best') || 0));
    localStorage.setItem('dd-best', best);
    sub += `<br><span style="color:var(--yl)">🏆 ベスト ${best} pt</span>`;
    const ov = $('#boss-overlay');
    ov.classList.remove('hide');
    ov.innerHTML = `<h3>${msg}</h3><p>${sub}</p><button class="btn big" id="boss-again">↻ もう一度</button>
      <div class="lb" id="boss-lb"></div>`;
    $('#boss-again').onclick = start;
    if (window.SCORES) SCORES.afterGame(st.score, $('#boss-lb'));
  }

  function step(dt) {
    ren.render(scene, cam);
    if (!st || st.over) return;

    /* input: keyboard or touch stick */
    const sp = ((keys.shift || touch.dash) ? 17 : 10);
    let ax = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    let az = (keys.down ? 1 : 0) - (keys.up ? 1 : 0);
    if (touch.on) { ax = touch.ax; az = touch.az; }
    const l = Math.hypot(ax, az) || 1;
    if (l > 1) { ax /= l; az /= l; } else if (!touch.on && l) { ax /= l; az /= l; }
    st.vx += (ax * sp - st.vx) * Math.min(1, dt * 9);
    st.vz += (az * sp - st.vz) * Math.min(1, dt * 9);
    st.px = Math.max(-R + 2, Math.min(R - 2, st.px + st.vx * dt));
    st.pz = Math.max(-R + 2, Math.min(R - 2, st.pz + st.vz * dt));
    player.position.set(st.px, 0, st.pz);
    if (ax || az) player.rotation.y = Math.atan2(st.vx, st.vz);

    /* camera follows */
    cam.position.lerp(new THREE.Vector3(st.px, 15, st.pz + 17), Math.min(1, dt * 4));
    cam.lookAt(st.px, 1.4, st.pz);

    /* pickups */
    for (const f of feats) {
      f.rotation.y += dt * 2; f.position.y = .9 + Math.sin(performance.now() / 320 + f.id) * .12;
      if (f.visible && st.carry < 6 && Math.hypot(f.position.x - st.px, f.position.z - st.pz) < 1.5) {
        f.visible = false; st.carry++; stack();
      }
    }
    /* deliver */
    if (st.carry && Math.hypot(st.px - box3.position.x, st.pz - box3.position.z) < 3.4) {
      st.score += st.carry * 10; st.carry = 0; stack();
      /* respawn used features so the field never empties */
      feats.filter(f => !f.visible).slice(0, 4).forEach(f => { const [x, z] = spot(); f.position.set(x, .9, z); f.visible = true; });
    }
    /* bugs: wander, then chase inside 11 units */
    for (const b of bugs) {
      const d = Math.hypot(b.position.x - st.px, b.position.z - st.pz);
      if (d < 11) {
        const a = Math.atan2(st.px - b.position.x, st.pz - b.position.z);
        b.position.x += Math.sin(a) * 6.4 * dt; b.position.z += Math.cos(a) * 6.4 * dt;
        b.rotation.y = a;
      } else {
        b.userData.dir += (Math.random() - .5) * dt * 3;
        b.position.x += Math.sin(b.userData.dir) * 3.4 * dt;
        b.position.z += Math.cos(b.userData.dir) * 3.4 * dt;
        b.rotation.y = b.userData.dir;
        if (Math.abs(b.position.x) > R - 2 || Math.abs(b.position.z) > R - 2) b.userData.dir += Math.PI;
      }
      if (d < 1.7 && st.hitCool <= 0) {
        st.hitCool = 1.4;
        const lost = Math.ceil(st.carry / 2);
        st.carry -= lost; stack();
        if (lost) DECK.toast(`🐛 バグ！ ⭐${lost} をロスト`);
      }
    }
    if (st.hitCool > 0) st.hitCool -= dt;
    box3.rotation.y += dt * .4;

    /* clock */
    st.t -= dt;
    $('#boss-time').textContent = Math.max(0, st.t).toFixed(1);
    $('#boss-score').textContent = st.score;
    $('#boss-carry').textContent = st.carry;
    if (st.t <= 0) {
      const rank = st.score >= 200 ? 'S ⭐⭐⭐ 神ジャンプ調整者' : st.score >= 120 ? 'A ⭐⭐ リードエンジニア'
        : st.score >= 60 ? 'B ⭐ 戦力' : 'C 見習い';
      finish(`納品 ${st.score} pt`, `RANK ${rank}<br>締切は待ってくれない。`);
      DECK.expOnce('boss', 20, 'FINAL BOSS クリア');
    }
  }

  function resize() {
    if (!ren) return;
    const r = cv.getBoundingClientRect();
    ren.setSize(r.width, r.height, false);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  }

  function start() {
    $('#boss-overlay').classList.add('hide');
    reset();
  }

  function install(D) {
    cv = $('#boss-canvas');
    const K = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right', ShiftLeft: 'shift', ShiftRight: 'shift' };
    addEventListener('keydown', e => {
      if (!$('.stage.on')?.classList.contains('boss-stage')) return;
      if (K[e.code]) { keys[K[e.code]] = true; e.preventDefault(); }
    });
    addEventListener('keyup', e => { if (K[e.code]) keys[K[e.code]] = false; });
    addEventListener('resize', resize);
    $('#boss-start').onclick = start;

    /* ── touch controls (phones): dynamic stick + DASH ── */
    const stick = $('#boss-stick'), knob = $('#boss-knob'), dash = $('#boss-dash');
    const MAXR = 46;
    cv.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || !st || st.over) return;
      touch.on = true; touch.id = e.pointerId; touch.ox = e.clientX; touch.oy = e.clientY;
      const r = cv.getBoundingClientRect();
      stick.style.left = (e.clientX - r.left) + 'px';
      stick.style.top = (e.clientY - r.top) + 'px';
      stick.classList.add('on');
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 合成イベント等 */ }
    });
    cv.addEventListener('pointermove', (e) => {
      if (!touch.on || e.pointerId !== touch.id) return;
      let dx = e.clientX - touch.ox, dy = e.clientY - touch.oy;
      const d = Math.hypot(dx, dy) || 1, k = Math.min(1, d / MAXR);
      touch.ax = (dx / d) * k; touch.az = (dy / d) * k;
      knob.style.transform = `translate(${(dx / d) * k * MAXR}px,${(dy / d) * k * MAXR}px)`;
    });
    const endTouch = (e) => {
      if (e.pointerId !== touch.id) return;
      touch.on = false; touch.ax = touch.az = 0; touch.id = null;
      stick.classList.remove('on'); knob.style.transform = '';
    };
    cv.addEventListener('pointerup', endTouch);
    cv.addEventListener('pointercancel', endTouch);
    dash.addEventListener('pointerdown', (e) => { touch.dash = true; e.preventDefault(); });
    dash.addEventListener('pointerup', () => touch.dash = false);
    dash.addEventListener('pointercancel', () => touch.dash = false);

    D.on('FINAL BOSS', {
      enter() {
        if (!ready) { build(); reset(); }
        resize();
        if (window.SCORES) SCORES.watch($('#boss-lb-idle'));
        if (location.search.includes('boss=1')) start();   /* headless smoke test hook */
        let last = performance.now(); let alive = true;
        (function tick(t) {
          if (!alive) return;
          const dt = Math.min(.05, (t - last) / 1000); last = t;
          step(dt); requestAnimationFrame(tick);
        })(last);
        stop = () => { alive = false; };
      },
      leave() { stop && stop(); if (window.SCORES) SCORES.unwatch(); keys = {}; touch.on = false; touch.ax = touch.az = 0; touch.dash = false; }
    });
  }
  return { install };
})();
