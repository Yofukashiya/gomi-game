/* 小さいマスコット。低ポリの動物をコードで組んで、ドラッグで回せて、
   クリックで跳ねて喋る。
   ponytail: WebGLコンテキストは1個だけ。表示中のステージは常に1枚なので、
   同じ canvas を使い回して中身だけ差し替える。 */
const PETS = (() => {
  let ren, scene, cam, box, bubble, model = null, kind = null, stop = null;
  const st = { t: 0, spin: 0, drag: null, vy: 0, y: 0, blink: 0, look: 0, hop: 0 };

  const mat = (c, glow) => new THREE.MeshStandardMaterial({
    color: c, roughness: .7, flatShading: true,
    emissive: glow ? c : 0x000000, emissiveIntensity: glow ? .55 : 0,
  });
  const box3 = (g, w, h, d, x, y, z, c, glow) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(c, glow));
    m.position.set(x, y, z); g.add(m); return m;
  };
  const ball = (g, r, x, y, z, c, glow) => {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(c, glow));
    m.position.set(x, y, z); g.add(m); return m;
  };

  /* ── 動物たち。parts に入れた物だけアニメーションする ── */
  const BUILD = {
    raccoon(g) {                                   // たぬき（記事のゲームと同じ作り）
      const grey = 0x8d99ae, dark = 0x2b3245, light = 0xdfe6f5;
      box3(g, 1.15, .78, 1.5, 0, .78, 0, grey);                    // 胴
      const head = box3(g, .84, .7, .68, 0, 1.28, .82, grey);
      box3(head, .86, .24, .1, 0, .02, .3, dark);                  // 泥棒マスク
      const el = ball(head, .09, -.19, .04, .34, light, 1);
      const er = ball(head, .09, .19, .04, .34, light, 1);
      box3(head, .3, .22, .22, 0, -.16, .34, light);               // 鼻先
      box3(head, .1, .1, .1, 0, -.14, .45, dark);
      box3(head, .2, .26, .12, -.3, .38, 0, grey);                 // 耳
      box3(head, .2, .26, .12, .3, .38, 0, grey);
      const tail = new THREE.Group(); tail.position.set(0, .95, -.78); g.add(tail);
      for (let i = 0; i < 5; i++)                                   // 縞しっぽ
        box3(tail, .34 - i * .03, .34 - i * .03, .3, 0, i * .1, -i * .26, i % 2 ? dark : light);
      const legs = [[-.36, .52], [.36, .52], [-.36, -.5], [.36, -.5]]
        .map(([x, z]) => box3(g, .24, .55, .24, x, .28, z, dark));
      return { head, tail, eyes: [el, er], legs };
    },
    cat(g) {                                        // ねこ
      const fur = 0xffb37b, dark = 0x8c5230, light = 0xfff3e6;
      box3(g, 1, .72, 1.35, 0, .8, 0, fur);
      const head = box3(g, .82, .72, .7, 0, 1.32, .7, fur);
      const el = ball(head, .1, -.19, .05, .34, 0x5ff2a8, 1);
      const er = ball(head, .1, .19, .05, .34, 0x5ff2a8, 1);
      box3(head, .22, .16, .16, 0, -.18, .34, light);
      box3(head, .06, .06, .06, 0, -.12, .44, dark);
      const e1 = box3(head, .24, .3, .1, -.26, .44, 0, fur);        // 三角耳
      const e2 = box3(head, .24, .3, .1, .26, .44, 0, fur);
      e1.rotation.z = .25; e2.rotation.z = -.25;
      const tail = new THREE.Group(); tail.position.set(0, 1, -.7); g.add(tail);
      for (let i = 0; i < 6; i++)
        box3(tail, .16, .16, .24, 0, i * .16, -i * .16, i % 2 ? dark : fur);
      const legs = [[-.32, .46], [.32, .46], [-.32, -.44], [.32, -.44]]
        .map(([x, z]) => box3(g, .22, .58, .22, x, .3, z, light));
      return { head, tail, eyes: [el, er], legs };
    },
    dog(g) {                                        // いぬ
      const fur = 0xd9c39a, dark = 0x6b563a, light = 0xfffaf0;
      box3(g, 1.15, .8, 1.5, 0, .82, 0, fur);
      const head = box3(g, .86, .74, .74, 0, 1.34, .78, fur);
      const el = ball(head, .1, -.2, .06, .36, 0x3b2a18, 1);
      const er = ball(head, .1, .2, .06, .36, 0x3b2a18, 1);
      box3(head, .34, .28, .3, 0, -.16, .42, light);                // マズル
      box3(head, .14, .12, .1, 0, -.08, .58, 0x2b3245);
      const e1 = box3(head, .18, .38, .12, -.42, .12, 0, dark);     // 垂れ耳
      const e2 = box3(head, .18, .38, .12, .42, .12, 0, dark);
      const tail = new THREE.Group(); tail.position.set(0, 1.05, -.76); g.add(tail);
      for (let i = 0; i < 4; i++) box3(tail, .2, .2, .24, 0, i * .2, -i * .1, fur);
      const legs = [[-.38, .5], [.38, .5], [-.38, -.48], [.38, -.48]]
        .map(([x, z]) => box3(g, .26, .6, .26, x, .3, z, light));
      return { head, tail, eyes: [el, er], legs, ears: [e1, e2] };
    },
    trio(g) {                                       // まとめ用：3匹並ぶ
      const parts = { heads: [], tails: [], eyes: [], legs: [] };
      [['raccoon', -1.7], ['cat', 0], ['dog', 1.7]].forEach(([k, x], i) => {
        const sub = new THREE.Group(); sub.position.set(x, 0, 0);
        sub.scale.setScalar(.74); sub.rotation.y = (i - 1) * .35; g.add(sub);
        const p = BUILD[k](sub);
        parts.heads.push(p.head); parts.tails.push(p.tail);
        parts.eyes.push(...p.eyes); parts.legs.push(...p.legs);
      });
      return { head: parts.heads[1], tail: parts.tails[1], eyes: parts.eyes,
               legs: parts.legs, group: g, heads: parts.heads, tails: parts.tails };
    },
  };

  function build(k) {
    if (model) { scene.remove(model.g); }
    const g = new THREE.Group();
    const parts = (BUILD[k] || BUILD.raccoon)(g);
    g.position.y = -.85;
    g.scale.setScalar(k === 'trio' ? 1 : .95);
    scene.add(g);
    model = { g, parts };
    kind = k;
    st.spin = k === 'trio' ? 0 : -.35;
  }

  function init() {
    box = document.createElement('div');
    box.id = 'pet';
    box.innerHTML = '<canvas id="pet-canvas"></canvas><div class="pet-say" id="pet-say"></div>';
    document.body.appendChild(box);
    bubble = box.querySelector('#pet-say');
    const cv = box.querySelector('#pet-canvas');

    ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(38, 1, .1, 50);
    cam.position.set(0, 1.15, 7.4); cam.lookAt(0, .5, 0);
    scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x101830, 1.25));
    const dl = new THREE.DirectionalLight(0xffffff, 1.15); dl.position.set(2, 5, 4); scene.add(dl);
    const rim = new THREE.PointLight(0xff5cc8, 1.5, 10); rim.position.set(-3, 1.5, 2); scene.add(rim);

    /* drag to spin, click to make it hop and talk */
    let moved = 0;
    cv.addEventListener('pointerdown', (e) => {
      st.drag = { x: e.clientX, s: st.spin }; moved = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 合成イベント等 */ }
      cv.classList.add('grab');
    });
    cv.addEventListener('pointermove', (e) => {
      st.look = Math.max(-1, Math.min(1, (e.clientX - cv.getBoundingClientRect().left) / cv.clientWidth * 2 - 1));
      if (!st.drag) return;
      const d = e.clientX - st.drag.x; moved = Math.max(moved, Math.abs(d));
      st.spin = st.drag.s + d * .012;
    });
    const up = () => { if (st.drag && moved < 5) poke(); st.drag = null; cv.classList.remove('grab'); };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => { st.drag = null; cv.classList.remove('grab'); });
    addEventListener('resize', resize);
  }

  function poke() {
    st.vy = 3.4; st.hop = 1;                       // ジャンプ＋一回転
    const say = document.querySelector('.stage.on')?.dataset.petSay;
    if (!say) return;
    bubble.textContent = say;
    bubble.classList.remove('on'); void bubble.offsetWidth; bubble.classList.add('on');
  }

  function resize() {
    if (!ren || !box) return;
    const r = box.querySelector('#pet-canvas').getBoundingClientRect();
    if (!r.width) return;
    ren.setSize(r.width, r.height, false);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  }

  function frame(dt) {
    st.t += dt;
    const p = model.parts;

    /* 上下に呼吸 + クリックのジャンプ */
    st.vy -= 11 * dt; st.y = Math.max(0, st.y + st.vy * dt);
    if (st.y === 0) st.vy = 0;
    model.g.position.y = -.9 + st.y + Math.sin(st.t * 2.1) * .035;

    /* 回転：ドラッグしていない間はゆっくり戻りつつ揺れる */
    if (!st.drag) st.spin += Math.sin(st.t * .6) * dt * .12;
    if (st.hop > 0) { st.hop -= dt * 1.6; model.g.rotation.y = st.spin + (1 - Math.max(0, st.hop)) * Math.PI * 2; }
    else model.g.rotation.y = st.spin;

    /* しっぽを振る（跳ねた直後は速く） */
    const wag = Math.sin(st.t * (st.y > 0 ? 16 : 5.2)) * (st.y > 0 ? .5 : .28);
    (p.tails || [p.tail]).forEach((t, i) => { if (t) t.rotation.z = wag * (i % 2 ? -1 : 1); });

    /* 顔をカーソルの方へ + たまに瞬き */
    (p.heads || [p.head]).forEach(h => {
      if (!h) return;
      h.rotation.y = st.look * .34;
      h.rotation.z = Math.sin(st.t * 1.3) * .05;
    });
    st.blink -= dt;
    if (st.blink < 0) st.blink = 2.4 + Math.random() * 2.6;
    const shut = st.blink < .12 ? .12 : 1;
    p.eyes.forEach(e => e.scale.y = shut);

    /* 歩く脚（跳ねている間だけ） */
    p.legs.forEach((l, i) => { l.rotation.x = st.y > 0 ? Math.sin(st.t * 14 + i) * .5 : 0; });

    ren.render(scene, cam);
  }

  function onStage(el) {
    const k = el.dataset.pet;
    if (!k) { if (box) box.classList.remove('on'); stopLoop(); return; }
    if (!ren) init();
    box.classList.toggle('pet-left', el.dataset.petPos === 'left');
    box.classList.toggle('pet-big', k === 'trio');
    box.classList.add('on');
    bubble.classList.remove('on');
    if (k !== kind) build(k);
    resize();
    if (stop) return;                              /* 既に回っている */
    let last = performance.now(), alive = true;
    (function tick(t) {
      if (!alive) return;
      const dt = Math.min(.05, (t - last) / 1000); last = t;
      frame(dt); requestAnimationFrame(tick);
    })(last);
    stop = () => { alive = false; };
  }
  function stopLoop() { if (stop) { stop(); stop = null; } }

  return { onStage };
})();
window.PETS = PETS;
