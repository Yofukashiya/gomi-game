/* 小さいマスコット。低ポリの動物をコードで組んで、触ると反応する。
   ponytail: WebGLコンテキストは1個だけ。表示中のステージは常に1枚なので、
   同じ canvas を使い回して中身だけ差し替える。

   反応：部位ごとに違う（頭=縮む / しっぽ=跳ねて一回転 / お腹=でんぐり返し /
   脚=お座り）、連打すると怒って最後は逃げる、何も無い所を押すとコインが落ちて
   拾いに行く、ドラッグは慣性つき、ダブルクリックで別の動物に変身。 */
const PETS = (() => {
  const KINDS = ['raccoon', 'cat', 'dog'];
  let ren, scene, cam, box, bubble, ray, pointer;
  let model = null, kind = null, stop = null, coin = null, parts = [], puffs = [];

  const st = {
    t: 0, spin: -.35, spinVel: 0, drag: null, moved: 0,
    y: 0, vy: 0, look: 0, blink: 0, x: 0, targetX: 0,
    mood: 'idle', moodT: 0, squash: 1, shake: 0,
    combo: 0, lastClick: -9, clicks: 0, sayIdx: 0,
  };

  /* ── building blocks ───────────────────────────────────────── */
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

  const BUILD = {
    raccoon(g) {
      const grey = 0x8d99ae, dark = 0x2b3245, light = 0xdfe6f5;
      const body = box3(g, 1.15, .78, 1.5, 0, .78, 0, grey);
      const head = box3(g, .84, .7, .68, 0, 1.28, .82, grey);
      box3(head, .86, .24, .1, 0, .02, .3, dark);
      const el = ball(head, .09, -.19, .04, .34, light, 1);
      const er = ball(head, .09, .19, .04, .34, light, 1);
      box3(head, .3, .22, .22, 0, -.16, .34, light);
      box3(head, .1, .1, .1, 0, -.14, .45, dark);
      box3(head, .2, .26, .12, -.3, .38, 0, grey);
      box3(head, .2, .26, .12, .3, .38, 0, grey);
      const tail = new THREE.Group(); tail.position.set(0, .95, -.78); g.add(tail);
      for (let i = 0; i < 5; i++)
        box3(tail, .34 - i * .03, .34 - i * .03, .3, 0, i * .1, -i * .26, i % 2 ? dark : light);
      const legs = [[-.36, .52], [.36, .52], [-.36, -.5], [.36, -.5]]
        .map(([x, z]) => box3(g, .24, .55, .24, x, .28, z, dark));
      return { head, tail, body, eyes: [el, er], legs };
    },
    cat(g) {
      const fur = 0xffb37b, dark = 0x8c5230, light = 0xfff3e6;
      const body = box3(g, 1, .72, 1.35, 0, .8, 0, fur);
      const head = box3(g, .82, .72, .7, 0, 1.32, .7, fur);
      const el = ball(head, .1, -.19, .05, .34, 0x5ff2a8, 1);
      const er = ball(head, .1, .19, .05, .34, 0x5ff2a8, 1);
      box3(head, .22, .16, .16, 0, -.18, .34, light);
      box3(head, .06, .06, .06, 0, -.12, .44, dark);
      const e1 = box3(head, .24, .3, .1, -.26, .44, 0, fur);
      const e2 = box3(head, .24, .3, .1, .26, .44, 0, fur);
      e1.rotation.z = .25; e2.rotation.z = -.25;
      const tail = new THREE.Group(); tail.position.set(0, 1, -.7); g.add(tail);
      for (let i = 0; i < 6; i++)
        box3(tail, .16, .16, .24, 0, i * .16, -i * .16, i % 2 ? dark : fur);
      const legs = [[-.32, .46], [.32, .46], [-.32, -.44], [.32, -.44]]
        .map(([x, z]) => box3(g, .22, .58, .22, x, .3, z, light));
      return { head, tail, body, eyes: [el, er], legs };
    },
    dog(g) {
      const fur = 0xd9c39a, dark = 0x6b563a, light = 0xfffaf0;
      const body = box3(g, 1.15, .8, 1.5, 0, .82, 0, fur);
      const head = box3(g, .86, .74, .74, 0, 1.34, .78, fur);
      const el = ball(head, .1, -.2, .06, .36, 0x3b2a18, 1);
      const er = ball(head, .1, .2, .06, .36, 0x3b2a18, 1);
      box3(head, .34, .28, .3, 0, -.16, .42, light);
      box3(head, .14, .12, .1, 0, -.08, .58, 0x2b3245);
      box3(head, .18, .38, .12, -.42, .12, 0, dark);
      box3(head, .18, .38, .12, .42, .12, 0, dark);
      const tail = new THREE.Group(); tail.position.set(0, 1.05, -.76); g.add(tail);
      for (let i = 0; i < 4; i++) box3(tail, .2, .2, .24, 0, i * .2, -i * .1, fur);
      const legs = [[-.38, .5], [.38, .5], [-.38, -.48], [.38, -.48]]
        .map(([x, z]) => box3(g, .26, .6, .26, x, .3, z, light));
      return { head, tail, body, eyes: [el, er], legs };
    },
    trio(g) {
      const acc = { heads: [], tails: [], eyes: [], legs: [] };
      [['raccoon', -1.7], ['cat', 0], ['dog', 1.7]].forEach(([k, x], i) => {
        const sub = new THREE.Group(); sub.position.set(x, 0, 0);
        sub.scale.setScalar(.74); sub.rotation.y = (i - 1) * .35; g.add(sub);
        const p = BUILD[k](sub);
        acc.heads.push(p.head); acc.tails.push(p.tail);
        acc.eyes.push(...p.eyes); acc.legs.push(...p.legs);
      });
      return { head: acc.heads[1], tail: acc.tails[1], eyes: acc.eyes, legs: acc.legs,
               heads: acc.heads, tails: acc.tails };
    },
  };

  /* every mesh knows which body part it is, so a click can react to it */
  function tagParts(p) {
    const tag = (obj, name) => obj && obj.traverse(o => { if (o.isMesh) o.userData.part = name; });
    if (p.body) tag(p.body, 'belly');
    p.legs.forEach(l => tag(l, 'leg'));
    (p.tails || [p.tail]).forEach(t => tag(t, 'tail'));
    (p.heads || [p.head]).forEach(h => tag(h, 'head'));
  }

  /* ── emoji particles ──────────────────────────────────────── */
  const texCache = {};
  function emojiTex(ch) {
    if (texCache[ch]) return texCache[ch];
    const c = document.createElement('canvas'); c.width = c.height = 72;
    const g = c.getContext('2d');
    g.font = '56px "Apple Color Emoji","Segoe UI Emoji",sans-serif';
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(ch, 36, 40);
    return (texCache[ch] = new THREE.CanvasTexture(c));
  }
  function puff(ch, n, spread) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(ch), transparent: true }));
      s.position.set(st.x + (Math.random() - .5) * spread, .8 + Math.random() * .9, .6);
      s.scale.setScalar(.55);
      s.userData = { vx: (Math.random() - .5) * 1.7, vy: 1.4 + Math.random() * 1.6, life: 1 };
      scene.add(s); puffs.push(s);
    }
  }

  /* ── moods ────────────────────────────────────────────────── */
  function say(force) {
    const raw = document.querySelector('.stage.on')?.dataset.petSay;
    const lines = (raw || '').split('|').map(s => s.trim()).filter(Boolean);
    const line = force || lines[st.sayIdx++ % Math.max(1, lines.length)];
    if (!line) return;
    bubble.textContent = line;
    bubble.classList.remove('on'); void bubble.offsetWidth; bubble.classList.add('on');
  }
  const mood = (m, secs) => { st.mood = m; st.moodT = secs; };

  function react(part) {
    st.clicks++;
    if (st.clicks === 10 && window.DECK) DECK.expOnce('pet-trophy', 20, '🏆 隠し：マスコットを10回いじった');

    /* 連打への反応：3回で怒る、5回で逃げる */
    st.combo = (st.t - st.lastClick < 1.1) ? st.combo + 1 : 1;
    st.lastClick = st.t;
    if (st.combo >= 5) { mood('flee', 3.2); puff('💨', 5, .9); say('もう無理！ちょっと離れる…'); return; }
    if (st.combo >= 3) { mood('angry', 1.6); st.shake = 1; puff('💢', 4, .8); say('連打しすぎ！'); return; }

    switch (part) {
      case 'head':  st.squash = .68; mood('tilt', 1.1); puff('💤', 2, .5); say(); break;
      case 'tail':  st.vy = 4.2; mood('spin', .9); puff('❗', 2, .5); say('しっぽ触った！'); break;
      case 'belly': st.vy = 3.4; mood('flip', 1); puff('⭐', 4, .8); say(); break;
      case 'leg':   mood('sit', 1.6); say('お座り'); break;
      default:      st.vy = 3.6; mood('spin', .8); puff('⭐', 3, .7); say();
    }
  }

  function fetchCoin(worldX) {                        /* 何も無い所をクリック → 餌やり */
    if (coin) scene.remove(coin);
    coin = new THREE.Mesh(new THREE.CylinderGeometry(.22, .22, .07, 12), mat(0xffd166, true));
    coin.rotation.x = Math.PI / 2;
    coin.position.set(Math.max(-2.4, Math.min(2.4, worldX)), .25, .3);
    scene.add(coin);
    mood('fetch', 6);
    say('それ拾ってくる！');
  }

  /* ── build / init ─────────────────────────────────────────── */
  function build(k) {
    if (model) scene.remove(model.g);
    const g = new THREE.Group();
    const p = (BUILD[k] || BUILD.raccoon)(g);
    tagParts(p);
    g.position.y = -.85;
    g.scale.setScalar(k === 'trio' ? 1 : .95);
    scene.add(g);
    model = { g, parts: p };
    kind = k;
    parts = [];
    g.traverse(o => { if (o.isMesh) parts.push(o); });
    st.spin = k === 'trio' ? 0 : -.35;
    st.spinVel = 0; st.x = 0; st.targetX = 0; st.squash = 1;
    st.mood = 'idle'; st.moodT = 0;
  }

  function init() {
    box = document.createElement('div');
    box.id = 'pet';
    const cv = document.createElement('canvas'); cv.id = 'pet-canvas';
    bubble = document.createElement('div'); bubble.className = 'pet-say'; bubble.id = 'pet-say';
    box.append(cv, bubble);
    document.body.appendChild(box);

    ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
    ren.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    scene = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(38, 1, .1, 50);
    cam.position.set(0, 1.15, 7.4); cam.lookAt(0, .5, 0);
    scene.add(new THREE.HemisphereLight(0xbcd6ff, 0x101830, 1.25));
    const dl = new THREE.DirectionalLight(0xffffff, 1.15); dl.position.set(2, 5, 4); scene.add(dl);
    const rim = new THREE.PointLight(0xff5cc8, 1.5, 10); rim.position.set(-3, 1.5, 2); scene.add(rim);
    ray = new THREE.Raycaster(); pointer = new THREE.Vector2();

    const local = (e) => {
      const r = cv.getBoundingClientRect();
      return { nx: ((e.clientX - r.left) / r.width) * 2 - 1, ny: -((e.clientY - r.top) / r.height) * 2 + 1 };
    };
    const hitPart = (e) => {
      const { nx, ny } = local(e);
      pointer.set(nx, ny); ray.setFromCamera(pointer, cam);
      const h = ray.intersectObjects(parts, false)[0];
      return h ? (h.object.userData.part || 'body') : null;
    };

    cv.addEventListener('pointerdown', (e) => {
      st.drag = { x: e.clientX, s: st.spin }; st.moved = 0;
      try { cv.setPointerCapture(e.pointerId); } catch (_) { /* 合成イベント */ }
      cv.classList.add('grab');
    });
    cv.addEventListener('pointermove', (e) => {
      const { nx } = local(e);
      st.look = Math.max(-1, Math.min(1, nx));
      if (st.mood === 'idle') st.targetX = nx * 1.5;            /* カーソルの方へ寄る */
      if (!st.drag) return;
      const d = e.clientX - st.drag.x;
      st.moved = Math.max(st.moved, Math.abs(d));
      const next = st.drag.s + d * .012;
      st.spinVel = next - st.spin;                              /* 離した時の慣性用 */
      st.spin = next;
    });
    cv.addEventListener('pointerup', (e) => {
      const wasDrag = st.drag && st.moved >= 5;
      st.drag = null; cv.classList.remove('grab');
      if (wasDrag) return;                                      /* 慣性に任せる */
      st.spinVel = 0;
      const part = hitPart(e);
      if (part) react(part); else fetchCoin(local(e).nx * 3.2);
    });
    cv.addEventListener('pointercancel', () => { st.drag = null; cv.classList.remove('grab'); });
    cv.addEventListener('dblclick', () => {                      /* 変身 */
      if (kind === 'trio') return;
      puff('✨', 6, 1);
      build(KINDS[(KINDS.indexOf(kind) + 1) % KINDS.length]);
      say('変身！');
    });
    addEventListener('resize', resize);
  }

  function resize() {
    if (!ren || !box) return;
    const r = box.querySelector('#pet-canvas').getBoundingClientRect();
    if (!r.width) return;
    ren.setSize(r.width, r.height, false);
    cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
  }

  /* ── frame ────────────────────────────────────────────────── */
  function frame(dt) {
    st.t += dt;
    const p = model.parts, g = model.g;
    if (st.moodT > 0 && (st.moodT -= dt) <= 0) st.mood = 'idle';

    /* 横移動 */
    if (st.mood === 'flee') st.targetX = st.moodT > 1.1 ? 7 : 0;   /* 逃げて戻る */
    else if (st.mood === 'fetch' && coin) st.targetX = coin.position.x;
    else if (st.mood !== 'idle') st.targetX = st.x;
    const dx = st.targetX - st.x;
    const speed = st.mood === 'flee' ? 9 : st.mood === 'fetch' ? 3.4 : 1.1;
    st.x += Math.max(-speed * dt, Math.min(speed * dt, dx));
    const walking = Math.abs(dx) > .06;

    /* コインを拾う */
    if (coin && Math.abs(coin.position.x - st.x) < .4) {
      scene.remove(coin); coin = null; st.vy = 3.2; puff('⭐', 4, .7);
      mood('spin', .8); say('うまい！');
      if (window.DECK) DECK.expOnce('pet-coin', 8, 'マスコットに餌をあげた');
    }

    /* 縦：呼吸＋ジャンプ */
    st.vy -= 11 * dt; st.y = Math.max(0, st.y + st.vy * dt);
    if (st.y === 0) st.vy = 0;
    const bob = Math.sin(st.t * 2.1) * .035 + (walking ? Math.abs(Math.sin(st.t * 9)) * .07 : 0);
    g.position.set(st.x, -.85 + st.y + bob, 0);

    /* 回転：ドラッグの慣性 → ゆらぎ */
    if (!st.drag) {
      st.spin += st.spinVel;
      st.spinVel *= .94;
      if (Math.abs(st.spinVel) < .0015) { st.spinVel = 0; st.spin += Math.sin(st.t * .6) * dt * .12; }
    }
    let rotY = st.spin;
    if (st.mood === 'spin') rotY += (1 - st.moodT / .9) * Math.PI * 2;
    if (st.mood === 'flee') rotY = Math.PI / 2 * (st.moodT > 1.1 ? 1 : -1);
    else if (st.mood === 'fetch' && walking) rotY = dx > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.rotation.y = rotY;

    /* でんぐり返し / 首かしげ / 怒りの震え / お座り */
    g.rotation.x = st.mood === 'flip' ? (1 - st.moodT) * Math.PI * 2 : 0;
    g.rotation.z = st.mood === 'tilt' ? Math.sin(st.moodT * 6) * .22
      : st.mood === 'angry' ? Math.sin(st.t * 40) * .06 * Math.max(0, st.shake) : 0;
    if (st.shake > 0) st.shake -= dt * .8;
    st.squash += (1 - st.squash) * Math.min(1, dt * 6);
    const sit = st.mood === 'sit' ? .78 : 1;
    g.scale.set(.95, .95 * st.squash * sit, .95);

    /* しっぽ */
    const rate = st.mood === 'angry' ? 22 : st.mood === 'flee' ? 14 : st.y > 0 ? 16 : 5.2;
    const amp = st.mood === 'angry' ? .55 : st.y > 0 ? .5 : .28;
    const wag = Math.sin(st.t * rate) * amp;
    (p.tails || [p.tail]).forEach((t, i) => { if (t) t.rotation.z = wag * (i % 2 ? -1 : 1); });

    /* 顔 */
    (p.heads || [p.head]).forEach(h => {
      if (!h) return;
      h.rotation.y = st.mood === 'idle' ? st.look * .34 : 0;
      h.rotation.z = st.mood === 'tilt' ? .4 : Math.sin(st.t * 1.3) * .05;
    });
    st.blink -= dt; if (st.blink < 0) st.blink = 2.4 + Math.random() * 2.6;
    const shut = st.blink < .12 ? .12 : 1;
    p.eyes.forEach(e => {
      e.scale.y = shut;
      e.material.emissiveIntensity = st.mood === 'angry' ? 1.4 : .55;
      e.material.emissive.setHex(st.mood === 'angry' ? 0xff3355 : e.material.color.getHex());
    });

    /* 脚 */
    p.legs.forEach((l, i) => {
      l.rotation.x = (walking || st.y > 0) ? Math.sin(st.t * (walking ? 11 : 14) + i) * .5 : 0;
    });

    /* コインとパーティクル */
    if (coin) coin.rotation.z += dt * 5;
    for (let i = puffs.length - 1; i >= 0; i--) {
      const s = puffs[i], d = s.userData;
      d.vy -= 3.4 * dt; d.life -= dt * .9;
      s.position.x += d.vx * dt; s.position.y += d.vy * dt;
      s.material.opacity = Math.max(0, d.life);
      if (d.life <= 0) { scene.remove(s); puffs.splice(i, 1); }
    }

    ren.render(scene, cam);
  }

  function onStage(el) {
    const k = el.dataset.pet;
    if (!k) { if (box) box.classList.remove('on'); if (stop) { stop(); stop = null; } return; }
    if (!ren) init();
    box.classList.toggle('pet-left', el.dataset.petPos === 'left');
    box.classList.toggle('pet-big', k === 'trio');
    box.classList.add('on');
    bubble.classList.remove('on');
    st.sayIdx = 0; st.combo = 0;
    if (k !== kind) build(k);
    resize();
    if (stop) return;
    let last = performance.now(), alive = true;
    (function tick(t) {
      if (!alive) return;
      const dt = Math.min(.05, (t - last) / 1000); last = t;
      frame(dt); requestAnimationFrame(tick);
    })(last);
    stop = () => { alive = false; };
  }

  /* rAF が止まる環境でも状態遷移を確認できるテスト用フック */
  const _test = {
    st, react, step: (dt) => frame(dt),
    get kind() { return kind; }, get hasCoin() { return !!coin; },
    get puffs() { return puffs.length; },
  };

  return { onStage, _test };
})();
window.PETS = PETS;
