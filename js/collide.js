/* ★ 当たり判定ラボ — why objects fall through walls (tunnelling), in 3D.
   Discrete overlap test vs. swept-segment test, with the sampled frame
   positions drawn as ghosts so the gap between frames is visible. */
const COLLIDE = (() => {
  const $ = (s) => document.querySelector(s);
  const W = .35, R = .5;                 // wall half-thickness, ball radius
  let ren, scene, cam, ball, wall, ghosts = [], gi = 0, stop = null;
  let st = { x: -12, v: 26, dir: 1, prev: -12, hit: 0, pass: 0, mode: 'discrete', flash: 0 };

  function init() {
    const cv = $('#collide-canvas');
    ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(40, 2, .1, 200);
    cam.position.set(0, 7, 26); cam.lookAt(0, 0, 0);

    scene.add(new THREE.HemisphereLight(0x6ea8ff, 0x101830, 1.2));
    const dl = new THREE.DirectionalLight(0xffffff, 1.1); dl.position.set(6, 12, 8); scene.add(dl);

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(60, 14),
      new THREE.MeshStandardMaterial({ color: 0x121a38, roughness: .9 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = -R; scene.add(floor);
    const g = new THREE.GridHelper(60, 60, 0x2a3f70, 0x1b2848);
    g.position.y = -R + .01; scene.add(g);

    wall = new THREE.Mesh(new THREE.BoxGeometry(W * 2, 4, 6),
      new THREE.MeshStandardMaterial({ color: 0xff5cc8, emissive: 0x5c1240, emissiveIntensity: .8, flatShading: true }));
    wall.position.y = 1.4; scene.add(wall);

    ball = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 1),
      new THREE.MeshStandardMaterial({ color: 0x3ce0ff, emissive: 0x0d5b73, emissiveIntensity: .7, flatShading: true }));
    scene.add(ball);

    /* ghost trail = one marker per simulated frame */
    for (let i = 0; i < 60; i++) {
      const m = new THREE.Mesh(new THREE.SphereGeometry(.16, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xffd166, transparent: true, opacity: .5 }));
      m.visible = false; ghosts.push(m); scene.add(m);
    }
  }

  function ghost(x) {
    const m = ghosts[gi = (gi + 1) % ghosts.length];
    m.position.set(x, 0, 0); m.visible = true;
  }

  function step(dt) {
    const v = st.v * st.dir;
    st.prev = st.x;
    st.x += v * dt;
    ghost(st.x);

    const band = W + R;
    if (st.mode === 'discrete') {
      /* only looks at where the ball IS this frame */
      if (Math.abs(st.x) < band) { st.x = st.dir > 0 ? -band : band; st.dir *= -1; st.hit++; st.flash = 1; }
      else if (Math.sign(st.prev) !== Math.sign(st.x) && Math.abs(st.prev) > band) { st.pass++; st.flash = -1; }
    } else {
      /* swept test: did the segment prev→x cross the wall band? */
      const lo = Math.min(st.prev, st.x), hi = Math.max(st.prev, st.x);
      if (lo < band && hi > -band) { st.x = st.dir > 0 ? -band : band; st.dir *= -1; st.hit++; st.flash = 1; }
    }
    if (st.x > 16) { st.x = -16; st.dir = 1; } else if (st.x < -16) { st.x = 16; st.dir = -1; }

    ball.position.x = st.x;
    ball.rotation.z -= dt * st.v * .1;
    wall.material.emissiveIntensity = st.flash > 0 ? 2.4 : .8;
    wall.material.color.setHex(st.flash < 0 ? 0x8a3f6f : 0xff5cc8);
    if (st.flash > 0) st.flash -= dt * 3; else if (st.flash < 0) st.flash += dt * 3;

    $('#col-hit').textContent = st.hit;
    $('#col-pass').textContent = st.pass;
    $('#col-step').textContent = (st.v / 60).toFixed(2);
    ren.render(scene, cam);
  }

  function resize() {
    const cv = $('#collide-canvas'), r = cv.getBoundingClientRect();
    ren.setSize(r.width, r.height, false);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  }

  function install(D) {
    const speed = $('#s-colspeed');
    const note = $('#col-note');
    const NOTE = {
      discrete: '離散判定：<b>その瞬間に重なっているか</b>だけを見る。1フレームの移動距離が壁の厚さを超えると、壁の手前と奥にワープして<b>すり抜ける</b>。これが「壁抜けバグ」。',
      swept: '連続判定（CCD）：<b>前フレームから今フレームまでの線を</b>壁と交差判定する。速度をいくら上げてもすり抜けない。代わりに計算量は増える。',
    };
    speed.oninput = () => {
      st.v = +speed.value; $('#o-colspeed').textContent = st.v;
      st.hit = st.pass = 0; ghosts.forEach(g => g.visible = false);
      D.expOnce('col-speed', 6, '速度を上げた');
    };
    document.querySelectorAll('#col-modes button').forEach(b => b.onclick = () => {
      document.querySelectorAll('#col-modes button').forEach(x => x.classList.toggle('on', x === b));
      st.mode = b.dataset.m; st.hit = st.pass = 0;
      note.innerHTML = NOTE[st.mode];
      D.expOnce('col-' + st.mode, 8, '判定方式を切替');
    });

    D.on('当たり判定', {
      enter() {
        if (!ren) { init(); note.innerHTML = NOTE.discrete; $('#o-colspeed').textContent = st.v; speed.value = st.v; }
        resize();
        let last = performance.now(), alive = true;
        (function tick(t) {
          if (!alive) return;
          const dt = Math.min(.05, (t - last) / 1000); last = t;
          step(dt); requestAnimationFrame(tick);
        })(last);
        stop = () => { alive = false; };
      },
      leave() { stop && stop(); }
    });
  }
  /* deterministic hook for automated checks (rAF is throttled in headless) */
  function _test(mode, v, frames) {
    const keep = { ...st };
    st.mode = mode; st.v = v; st.x = -12; st.dir = 1; st.prev = -12; st.hit = 0; st.pass = 0;
    for (let i = 0; i < frames; i++) step(1 / 60);
    const out = { hit: st.hit, pass: st.pass, stepPerFrame: v / 60 };
    Object.assign(st, keep); return out;
  }

  return { install, _test };
})();
window.COLLIDE = COLLIDE;
