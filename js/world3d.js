/* persistent Three.js backdrop: the deck sits inside a slowly drifting low-poly world.
   Colour + camera shift per WORLD so each act of the talk feels like a new level. */
const WORLD3D = (() => {
  let ren, scene, cam, grid, shapes = [], target = null, cur = null, alive = false;

  const MOODS = {
    TITLE:  { a: 0x3ce0ff, b: 0xff5cc8, fog: 0x05080f, y: 6, spin: .04 },
    AGENDA: { a: 0x3ce0ff, b: 0xa68bff, fog: 0x05080f, y: 8, spin: .05 },
    'WORLD 1': { a: 0x3ce0ff, b: 0x2aa9ff, fog: 0x050b16, y: 5, spin: .06 },
    'WORLD 2': { a: 0xff5cc8, b: 0xa68bff, fog: 0x120716, y: 7, spin: .05 },
    'WORLD 3': { a: 0x5ff2a8, b: 0x3ce0ff, fog: 0x04120f, y: 6, spin: .07 },
    FINAL:  { a: 0xff5cc8, b: 0xffd166, fog: 0x120711, y: 9, spin: .12 },
    END:    { a: 0xffd166, b: 0x3ce0ff, fog: 0x0a0a14, y: 4, spin: .03 },
  };

  function mesh(i) {
    const g = i % 4 === 0 ? new THREE.IcosahedronGeometry(1)
      : i % 4 === 1 ? new THREE.BoxGeometry(1.4, 1.4, 1.4)
        : i % 4 === 2 ? new THREE.OctahedronGeometry(1.1)
          : new THREE.TorusGeometry(.8, .28, 6, 10);
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({
      color: 0x3ce0ff, wireframe: true, transparent: true, opacity: .42
    }));
    const side = Math.random() < .5 ? -1 : 1;
    m.position.set(side * (8 + Math.random() * 42), Math.random() * 30 - 6, -Math.random() * 90 - 14);
    m.userData = { s: .1 + Math.random() * .5, r: Math.random() * 6, d: .3 + Math.random() * .9 };
    m.scale.setScalar(.6 + Math.random() * 2.2);
    return m;
  }

  function init() {
    const cv = document.getElementById('bg3d');
    if (!cv || !window.THREE) return;
    ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(1.5, devicePixelRatio || 1));
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x05080f, 40, 130);
    cam = new THREE.PerspectiveCamera(55, 1, .1, 300);
    cam.position.set(0, 6, 18);

    grid = new THREE.GridHelper(300, 60, 0x3ce0ff, 0x16345c);
    grid.material.transparent = true; grid.material.opacity = .38;
    grid.position.y = -8; scene.add(grid);

    for (let i = 0; i < 34; i++) { const m = mesh(i); shapes.push(m); scene.add(m); }

    resize(); addEventListener('resize', resize);
    alive = true;
    let last = performance.now();
    (function tick(t) {
      if (!alive) return;
      const dt = Math.min(.05, (t - last) / 1000); last = t;
      step(dt); requestAnimationFrame(tick);
    })(last);
  }

  function resize() {
    if (!ren) return;
    ren.setSize(innerWidth, innerHeight, false);
    cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  }

  const lerpC = (m, hex, k) => m.color.lerp(new THREE.Color(hex), k);

  function step(dt) {
    if (!ren) return;
    const T = target || MOODS.TITLE;
    for (const m of shapes) {
      m.rotation.x += dt * m.userData.s * T.spin * 8;
      m.rotation.y += dt * m.userData.s * T.spin * 11;
      m.position.z += dt * m.userData.d;              /* drift toward camera */
      if (m.position.z > 10) { m.position.z = -100; m.position.x = (Math.random() < .5 ? -1 : 1) * (8 + Math.random() * 42); }
      lerpC(m.material, m.userData.r > 3 ? T.b : T.a, Math.min(1, dt * 1.2));
    }
    lerpC(grid.material, T.a, Math.min(1, dt * 1.2));
    scene.fog.color.lerp(new THREE.Color(T.fog), Math.min(1, dt * 1.2));
    cam.position.y += (T.y - cam.position.y) * Math.min(1, dt * 1.4);
    cam.lookAt(0, 2, -20);
    ren.render(scene, cam);
  }

  function setWorld(name) {
    if (name === cur) return;
    cur = name; target = MOODS[name] || MOODS.TITLE;
  }
  /* pause the backdrop while the 3D mini-game owns the GPU */
  function pause(p) { alive = !p; if (!p) { let last = performance.now(); (function tick(t) { if (!alive) return; const dt = Math.min(.05, (t - last) / 1000); last = t; step(dt); requestAnimationFrame(tick); })(last); } }

  return { init, setWorld, pause };
})();
window.WORLD3D = WORLD3D;   /* top-level const is not a window property */
