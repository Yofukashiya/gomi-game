/* interactive stage widgets */
const LABS = (() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];
  const raf = [];
  function loop(fn) { // returns stop()
    let last = performance.now(), alive = true;
    (function step(t) {
      if (!alive) return;
      const dt = Math.min(0.05, (t - last) / 1000); last = t;
      fn(dt, t); requestAnimationFrame(step);
    })(last);
    return () => { alive = false; };
  }
  function fit(cv) { // css px -> device px
    const r = cv.getBoundingClientRect();
    const d = Math.min(2, devicePixelRatio || 1);
    if (r.width) { cv.width = r.width * d; cv.height = r.height * d; }
    return d;
  }

  /* ══════════ 00 title fx ══════════ */
  function titleFX(D) {
    const cv = $('#title-fx'), c = cv.getContext('2d');
    let stars = [], stop = null;
    D.on('タイトル', {
      enter() {
        fit(cv);
        stars = Array.from({ length: 90 }, () => ({
          x: Math.random() * cv.width, y: Math.random() * cv.height,
          z: Math.random() * 2 + .3, r: Math.random() * 1.6 + .4
        }));
        stop = loop(() => {
          c.clearRect(0, 0, cv.width, cv.height);
          for (const s of stars) {
            s.x -= s.z * .35; if (s.x < 0) s.x = cv.width;
            c.globalAlpha = .25 + s.z * .3;
            c.fillStyle = s.z > 1.6 ? '#ff5cc8' : '#3ce0ff';
            c.fillRect(s.x, s.y, s.r, s.r);
          }
          c.globalAlpha = 1;
        });
      },
      leave() { stop && stop(); }
    });
  }

  /* ══════════ 02 elements ══════════ */
  function elements(D) {
    const out = $('#elem-out'), base = out.innerHTML;
    $$('#elem-grid .elem').forEach(b => b.onclick = () => {
      const was = b.classList.contains('on');
      $$('#elem-grid .elem').forEach(x => x.classList.remove('on'));
      if (was) { out.innerHTML = base; return; }
      b.classList.add('on');
      out.innerHTML = b.dataset.lost;
      D.expOnce('elem' + b.textContent, 5, 'ゲームの要素');
    });
  }

  /* ══════════ 03 party ══════════ */
  function party(D) {
    const pane = $('#party-pane');
    $$('#party .pc').forEach(b => b.onclick = () => {
      $$('#party .pc').forEach(x => x.classList.remove('on'));
      b.classList.add('on');
      pane.innerHTML = `<h3>${b.dataset.icon} ${b.dataset.role}</h3>
        <p>${b.dataset.job}</p><p class="none">${b.dataset.none}</p>`;
      D.expOnce('role' + b.dataset.role, 5, b.dataset.role);
    });
  }

  /* ══════════ 04 jump lab ══════════ */
  function jumpLab(D) {
    const cv = $('#jump-canvas'), c = cv.getContext('2d');
    const P = {
      good: { jump: 12.5, grav: 60, lag: 0, coy: 120, buf: 150, t: '😍 <b>気持ちいい</b>：崖の許し（コヨーテ）と先行入力が効いている。ミスしても「自分のせい」に感じる。' },
      floaty: { jump: 16, grav: 26, lag: 0, coy: 120, buf: 150, t: '🌙 <b>月面</b>：滞空が長すぎて、空中で操作を待たされる。緊張感が消える。' },
      heavy: { jump: 7.5, grav: 120, lag: 0, coy: 0, buf: 0, t: '🧱 <b>モッサリ</b>：跳べる高さが足りず、許容もゼロ。同じコードでも別ゲーム。' },
      laggy: { jump: 12.5, grav: 60, lag: 100, coy: 120, buf: 150, t: '😩 <b>遅延100ms</b>：数値は同じ。入力が0.1秒遅れるだけで「壊れてる」と感じる。' },
      raw: { jump: 12.5, grav: 60, lag: 0, coy: 0, buf: 0, t: '🤖 <b>素の実装</b>：<code>if (接地 &amp;&amp; 押した) 跳ぶ</code> だけ。正しいのに、押したのに跳ばない感じが出る。' },
    };
    const cfg = { ...P.good };
    const st = { y: 0, vy: 0, ground: true, leftAt: -1e9, pressAt: -1e9, scroll: 0, ok: 0, miss: 0, flash: 0 };
    const ids = { jump: 's-jump', grav: 's-grav', lag: 's-lag', coy: 's-coy', buf: 's-buf' };
    const outs = { jump: 'o-jump', grav: 'o-grav', lag: 'o-lag', coy: 'o-coy', buf: 'o-buf' };
    const SPEED = 230, GAP = 118, SEG = 420;

    function sync() {
      for (const k in ids) { $('#' + ids[k]).value = cfg[k]; $('#' + outs[k]).textContent = cfg[k]; }
    }
    for (const k in ids) $('#' + ids[k]).oninput = (e) => {
      cfg[k] = +e.target.value; $('#' + outs[k]).textContent = cfg[k];
      $$('#jump-presets button').forEach(x => x.classList.remove('on'));
    };
    $$('#jump-presets button').forEach(b => b.onclick = () => {
      Object.assign(cfg, P[b.dataset.p]); sync();
      $$('#jump-presets button').forEach(x => x.classList.toggle('on', x === b));
      $('#jump-note').innerHTML = P[b.dataset.p].t;
      st.ok = st.miss = 0;
      D.expOnce('jp' + b.dataset.p, 6, 'プリセット比較');
    });

    /* gap starts at x, repeating every SEG world px */
    const onGap = (wx) => ((wx % SEG) + SEG) % SEG < GAP;

    function press() { st.pressAt = performance.now() + cfg.lag; }
    cv.onclick = press;
    addEventListener('keydown', e => {
      if (e.code === 'Space' && $('.stage.on')?.classList.contains('lab-stage')) { press(); e.preventDefault(); }
    });

    let stop = null;
    D.on('ジャンプ調整', {
      enter() {
        sync(); $('#jump-note').innerHTML = P.good.t;
        const d = fit(cv), W = cv.width, H = cv.height;
        const GY = H * .72, PX = W * .22;
        stop = loop((dt, now) => {
          /* physics (units scaled so sliders read nicely) */
          const g = cfg.grav * 20 * d, v0 = cfg.jump * 40 * d;
          st.scroll += SPEED * dt * d;
          const overGap = onGap((st.scroll + PX) / d);

          const canCoyote = !st.ground && (now - st.leftAt) < cfg.coy;
          const buffered = (now - st.pressAt) >= 0 && (now - st.pressAt) < cfg.buf;
          if ((st.ground || canCoyote) && buffered) { st.vy = -v0; st.ground = false; st.pressAt = -1e9; }

          if (!st.ground) {
            st.vy += (st.vy > 0 ? g * 1.5 : g) * dt;
            st.y += st.vy * dt;
            if (st.y >= 0 && !overGap) { st.y = 0; st.vy = 0; st.ground = true; st.ok++; }
            else if (st.y > H) { st.y = 0; st.vy = 0; st.ground = true; st.miss++; st.flash = 1; st.scroll += SEG * d; }
          } else if (overGap) { st.ground = false; st.leftAt = now; }

          /* draw */
          c.fillStyle = '#0a1024'; c.fillRect(0, 0, W, H);
          c.strokeStyle = 'rgba(60,224,255,.10)'; c.lineWidth = 1 * d;
          for (let i = 0; i < 8; i++) { const y = H * i / 8; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke(); }
          /* platforms */
          c.fillStyle = '#1d2b57';
          for (let x = -SEG * d; x < W + SEG * d; x += 4 * d) {
            const wx = (st.scroll + x) / d;
            if (!onGap(wx)) c.fillRect(x, GY, 4 * d + 1, H - GY);
          }
          c.fillStyle = '#3ce0ff';
          for (let x = -SEG * d; x < W + SEG * d; x += 4 * d) {
            const wx = (st.scroll + x) / d;
            if (!onGap(wx)) c.fillRect(x, GY, 4 * d + 1, 3 * d);
          }
          /* player */
          const py = GY + st.y - 26 * d;
          c.fillStyle = st.flash > 0 ? '#ff5cc8' : '#ffd166';
          c.fillRect(PX, py, 22 * d, 26 * d);
          c.fillStyle = '#04101c';
          c.fillRect(PX + 5 * d, py + 8 * d, 4 * d, 4 * d);
          c.fillRect(PX + 13 * d, py + 8 * d, 4 * d, 4 * d);
          if (st.flash > 0) st.flash -= dt * 3;
          /* hud */
          c.font = `${12 * d}px ui-monospace,monospace`;
          c.fillStyle = '#5ff2a8'; c.fillText(`CLEAR ${st.ok}`, 12 * d, 20 * d);
          c.fillStyle = '#ff5cc8'; c.fillText(`MISS ${st.miss}`, 12 * d, 36 * d);
          c.fillStyle = '#93a4cc';
          c.fillText(cfg.lag ? `input lag ${cfg.lag}ms` : '', W - 130 * d, 20 * d);
        });
      },
      leave() { stop && stop(); }
    });
  }

  /* ══════════ 05 code lines ══════════ */
  function codeLines(D) {
    const pane = $('#code-pane');
    $$('#jump-code .cl').forEach(l => l.onclick = () => {
      $$('#jump-code .cl').forEach(x => x.classList.remove('on'));
      l.classList.add('on');
      pane.innerHTML = `<p>${l.dataset.x}</p>`;
      D.expOnce('code' + l.dataset.x.slice(0, 6), 4, 'コード解説');
    });
  }

  /* ══════════ 06 pipeline ══════════ */
  function pipeline(D) {
    const box = $('#pipeline'), out = $('#pipe-out');
    const DATA = {
      small: {
        steps: [['DAY 1', 'アイデア', '「ゴミを分別する」だけ決める'], ['DAY 2', 'プロトタイプ', '四角が落ちてくる。触れる'],
        ['DAY 3', '遊んでみる', 'つまらない → 落下速度を変える'], ['WEEK 2', '面白い形が見えた', 'ここで初めて絵と音を足す'],
        ['WEEK 4', '実装・調整', '面白い部分だけ磨く'], ['WEEK 6', 'リリース', '小さいが完成する']],
        note: '🐣 <b>3日で遊べる</b>。方向転換のコストが安い。ゲーム制作は一方通行ではなく、プロトタイプから企画に戻る前提で組む。'
      },
      big: {
        steps: [['MONTH 1', '企画書', '100ページ。世界観・全ステージ設計'], ['MONTH 2', 'アート発注', 'キャラ・背景を大量に作る'],
        ['MONTH 3', '実装', '仕様通りに作る'], ['MONTH 4', 'ついに遊べる', '……つまらない'],
        ['MONTH 5', '手戻り', '面白くする改修は全部に波及'], ['MONTH 6', '未完成', '力尽きる（一番多い失敗）']],
        note: '🏰 <b>4ヶ月目で初めて遊べる</b>。そこでつまらなかった時、直す対象が全部になる。初心者が一番踏む罠。'
      }
    };
    function render(k) {
      const d = DATA[k];
      box.innerHTML = d.steps.map(([a, b, cc], i) =>
        `<div class="pstep ${k === 'big' ? 'bad' : ''}" style="animation-delay:${i * 70}ms">
          <span class="pd">${a}</span><h4>${b}</h4><p>${cc}</p></div>`).join('');
      out.innerHTML = d.note;
    }
    $$('.pipe-tabs button').forEach(b => b.onclick = () => {
      $$('.pipe-tabs button').forEach(x => x.classList.toggle('on', x === b));
      render(b.dataset.pipe);
      D.expOnce('pipe' + b.dataset.pipe, 5, '作る順番');
    });
    D.on('作る順番', { enter() { render($('.pipe-tabs .on').dataset.pipe); } });
  }

  /* ══════════ 07 engine tasks ══════════ */
  function engineTasks(D) {
    const box = $('#tasklist'), out = $('#eng-out');
    const T = [['🖼', '画面描画', '3D/2DをGPUに描かせる', 1], ['🧲', '物理演算', '重力・衝突・摩擦', 1],
    ['🎮', '入力処理', 'キー・パッド・タッチ', 1], ['🎞', 'アニメーション', '骨・ブレンド・遷移', 1],
    ['🔊', 'サウンド', '再生・ミキサー・3D音', 1], ['💾', 'セーブ/ロード', 'データの永続化', 1],
    ['📦', 'ビルド・配布', 'PC/スマホ/Webへ書き出し', 1], ['🛠', 'エディタ', '配置・調整のGUI', 1],
    ['🎲', 'ゲームのルール', 'ここが「作品」', 0], ['✨', '手応えの調整', 'ここが「面白さ」', 0]];
    function render(mode) {
      box.innerHTML = T.map(([i, t, s, common]) =>
        `<div class="task ${mode === 'engine' && common ? 'gone' : ''}">
          <span class="ti">${i}</span> ${t}<small>${s}</small></div>`).join('');
      out.innerHTML = mode === 'engine'
        ? '🚀 8個が消えた。残るのは <b>ゲームのルール</b> と <b>手応えの調整</b> ＝ その作品にしか無い部分。'
        : '🔧 ゼロから作ると、10個ぜんぶ自分の仕事。<b>ゲームの中身に着く前に力尽きる</b>。';
    }
    $$('.eng-toggle button').forEach(b => b.onclick = () => {
      $$('.eng-toggle button').forEach(x => x.classList.toggle('on', x === b));
      render(b.dataset.eng);
      D.expOnce('eng' + b.dataset.eng, 5, 'エンジンの正体');
    });
    D.on('エンジンの正体', { enter() { render($('.eng-toggle .on').dataset.eng); } });
  }

  /* ══════════ 08 engine quiz ══════════ */
  const ENGINES = {
    Unity: { icon: '🧩', shot: 'assets/unity-editor.jpg', cap: 'Unity Editor：Scene / Hierarchy / Inspector',
      why: '2D/3Dどちらも。スマホ・PC・Web・VRまで対応範囲が広く、C#。学習資料とアセットが圧倒的に多い。',
      bars: { '始めやすさ': 4, '3D表現': 4, '2D制作': 4, '自由度': 4, '学習資料': 5 } },
    Unreal: { icon: '🎬', shot: 'assets/unreal-editor.jpg', cap: 'Unreal Engine：情報量の多い大規模3D向けUI',
      why: 'リアルな3D表現に強い。Blueprintでノードを繋いで処理を組める。PCGやWorldbuildingも強力。映像制作にも。',
      bars: { '始めやすさ': 3, '3D表現': 5, '2D制作': 3, '自由度': 5, '学習資料': 4 } },
    Godot: { icon: '🧊', shot: 'assets/godot-editor.jpg', cap: 'Godot：軽量でシンプルなエディタ',
      why: '無料・オープンソース。2Dに強く3Dも可。GDScript / C#。軽くて起動が速く、個人開発と学習に人気。',
      bars: { '始めやすさ': 4, '3D表現': 3, '2D制作': 5, '自由度': 4, '学習資料': 3 } },
    'RPG Maker': { icon: '🗺', shot: 'assets/rpgmaker.jpg', cap: 'RPG Maker MZ：マップ編集に特化',
      why: 'マップ・会話・戦闘が最初から用意済み。プログラミング無しでも形になる。JavaScriptで拡張も可能。',
      bars: { '始めやすさ': 5, '3D表現': 1, '2D制作': 4, '自由度': 2, '学習資料': 3 } },
  };
  function engineQuiz(D) {
    const Q = [
      { q: 'Q1. 作りたいのは？', a: [['3Dで見た目重視', { Unreal: 3, Unity: 2 }], ['2D・スマホ向け', { Unity: 3, Godot: 3 }], ['会話と物語のRPG', { 'RPG Maker': 4 }]] },
      { q: 'Q2. チームは？', a: [['1人 or 少人数', { Godot: 2, Unity: 2, 'RPG Maker': 2 }], ['大人数・分業', { Unreal: 3, Unity: 2 }]] },
      { q: 'Q3. 大事なのは？', a: [['とにかく早く形にする', { 'RPG Maker': 3, Godot: 2 }], ['調べれば答えがある安心感', { Unity: 3 }], ['映像のクオリティ上限', { Unreal: 3 }], ['無料・軽い・OSS', { Godot: 3 }]] },
    ];
    const box = $('#engine-quiz'), picks = {};
    box.innerHTML = Q.map((x, i) => `<div class="q"><h3>${x.q}</h3><div class="opts">${
      x.a.map((o, j) => `<button data-q="${i}" data-a="${j}">${o[0]}</button>`).join('')}</div></div>`).join('')
      + `<div class="qresult" id="quiz-res">3問選ぶと結果が出ます。</div>`;
    box.querySelectorAll('.opts button').forEach(b => b.onclick = () => {
      const i = +b.dataset.q;
      box.querySelectorAll(`[data-q="${i}"]`).forEach(x => x.classList.toggle('on', x === b));
      picks[i] = Q[i].a[+b.dataset.a][1];
      const n = Object.keys(picks).length;
      if (n < 3) { $('#quiz-res').textContent = `${n} / 3 問`; return; }
      const sc = {};
      Object.values(picks).forEach(m => { for (const k in m) sc[k] = (sc[k] || 0) + m[k]; });
      const win = Object.entries(sc).sort((a, b2) => b2[1] - a[1])[0][0];
      const e = ENGINES[win];
      $('#quiz-res').innerHTML = `診断結果 → ${e.icon} <b>${win}</b><br>${e.why}
        <br><span class="dim" style="font-size:.85em">※ 傾向です。「有名だから」ではなく作りたい物で選ぶのが正解。</span>`;
      D.expOnce('quiz', 12, 'エンジン診断');
    });
  }

  /* ══════════ 09 compare ══════════ */
  function compare(D) {
    const tabs = $('#eng-tabs'), bars = $('#cmp-bars');
    tabs.innerHTML = Object.keys(ENGINES).map((k, i) =>
      `<button data-e="${k}" class="${i ? '' : 'on'}">${ENGINES[k].icon} ${k}</button>`).join('');
    const AX = ['始めやすさ', '3D表現', '2D制作', '自由度', '学習資料'];
    bars.innerHTML = AX.map(a => `<div class="brow"><span>${a}</span><div class="btrack"><i data-ax="${a}"></i></div></div>`).join('');
    function show(k) {
      const e = ENGINES[k];
      AX.forEach(a => bars.querySelector(`[data-ax="${a}"]`).style.width = (e.bars[a] / 5 * 100) + '%');
      $('#eng-shot').src = e.shot; $('#eng-cap').textContent = e.cap;
    }
    tabs.querySelectorAll('button').forEach(b => b.onclick = () => {
      tabs.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      show(b.dataset.e); D.expOnce('cmp' + b.dataset.e, 3, b.dataset.e);
    });
    D.on('4エンジン比較', { enter() { show(tabs.querySelector('.on').dataset.e); } });
  }

  /* ══════════ 10 AI loop ══════════ */
  function aiLoop(D) {
    const cv = $('#loop-canvas'), c = cv.getContext('2d'), s = $('#s-loop');
    let ang = 0, laps = 0, stop = null;
    const NODES = ['💡 Idea', '🔨 Try', '🎯 Feedback'];
    function stat() {
      const sec = +s.value;
      $('#o-loop').textContent = sec + '日';
      $('#loop-stat').textContent =
        `1周 ${sec}日 → 3ヶ月で 約${Math.floor(90 / sec)} 回試せる\n` +
        `当たりが10回に1回なら、期待できる当たり ${(Math.floor(90 / sec) / 10).toFixed(1)} 個`;
    }
    s.oninput = () => { stat(); D.expOnce('loop', 5, 'ループ速度'); };
    D.on('ループの回転数', {
      enter() {
        stat(); const d = fit(cv), W = cv.width, H = cv.height, R = Math.min(W, H) * .3;
        stop = loop((dt) => {
          const sec = +s.value, speed = (1 / sec) * 2.2;
          ang += dt * speed; if (ang > Math.PI * 2) { ang -= Math.PI * 2; laps++; }
          c.fillStyle = '#060a16'; c.fillRect(0, 0, W, H);
          c.strokeStyle = 'rgba(60,224,255,.35)'; c.lineWidth = 2 * d;
          c.beginPath(); c.arc(W / 2, H / 2, R, 0, Math.PI * 2); c.stroke();
          c.font = `${14 * d}px sans-serif`; c.textAlign = 'center';
          NODES.forEach((n, i) => {
            const a = -Math.PI / 2 + i * Math.PI * 2 / 3;
            const x = W / 2 + Math.cos(a) * R, y = H / 2 + Math.sin(a) * R;
            c.fillStyle = '#121a38'; c.beginPath(); c.arc(x, y, 26 * d, 0, 7); c.fill();
            c.strokeStyle = i === 2 ? '#ffd166' : '#3ce0ff'; c.stroke();
            c.fillStyle = i === 2 ? '#ffd166' : '#eaf1ff'; c.fillText(n, x, y + 5 * d);
          });
          const a = -Math.PI / 2 + ang;
          const px = W / 2 + Math.cos(a) * R, py = H / 2 + Math.sin(a) * R;
          c.fillStyle = '#ff5cc8'; c.beginPath(); c.arc(px, py, 8 * d, 0, 7); c.fill();
          c.fillStyle = '#5ff2a8'; c.font = `${13 * d}px ui-monospace,monospace`;
          c.fillText(`試行回数 ${laps}`, W / 2, H / 2 + 5 * d);
          c.fillStyle = '#93a4cc'; c.font = `${11 * d}px sans-serif`;
          c.fillText('AIが安くするのは Try', W / 2, H - 14 * d);
          c.textAlign = 'left';
        });
      },
      leave() { stop && stop(); }
    });
  }

  /* ══════════ 11 AI map ══════════ */
  function aiMap(D) {
    const M = [
      { i: '💡', t: '企画', s: 'アイデア/仕様',
        pr: '3分で遊べる2Dアクションの企画を5案。初心者がUnityで2週間で作れる規模。\n各案に「一番楽しい瞬間」を1行で。',
        out: '出力：ゲームループ案、キャラ設定、ステージ構成、想定プレイ時間。5案並べて人間が1つ選ぶ。',
        w: 'AI単体の案は平均的になりがち。<b>選ぶ・尖らせるのは人間</b>。' },
      { i: '📖', t: 'シナリオ', s: '世界観/会話',
        pr: '森の入口のNPC。プレイヤーに「奥は危ない」と伝える台詞を3パターン。\n説明口調にせず、性格が出るように。40文字以内。',
        out: '出力例：「森の奥に入るなら、光るキノコを目印にしな。戻れなくなる奴が多いんだ。」',
        w: '大量生成できるが、<b>キャラの一貫性</b>は設定シートを渡さないと崩れる。' },
      { i: '⌨️', t: 'コード', s: '実装/デバッグ',
        pr: '敵が一定距離に入ったら追跡、離れたら初期位置に戻る処理をUnity C#で。\nNavMeshは使わず、状態は enum で管理して。',
        out: '出力：State enum + 距離判定 + 補間移動。エラー文を貼れば原因説明もできる。',
        w: '<b>必ず動作確認</b>。性能・セキュリティ・ライセンスも見る。読めないコードは負債。' },
      { i: '🎨', t: '素材', s: 'ラフ/テクスチャ/SE',
        pr: 'Seamless tileable texture, top-down, even lighting,\nstylized low-poly game art, night palette — 共通STYLEを前置き',
        out: '出力：テクスチャ、UI案、アイコン、背景ラフ。ビルド時に生成してcommitすれば公開後はAPI不要。',
        w: '商用は<b>利用規約・著作権</b>を確認。絵柄の統一はプロンプト設計で作る。' },
      { i: '🐛', t: 'QA', s: 'テスト観点/自動化',
        pr: 'このジャンプ実装のテスト観点を洗い出して。壁抜け・すり抜け・連続入力・\n低フレームレート時の挙動を含めて。Playwrightの自動テストも書いて。',
        out: '出力：観点リスト＋自動テスト。スクショを撮らせると自分でバグに気づく（次のスライドで実例）。',
        w: '一番コスパが良い使い方。ただし<b>合格の基準は人間が決める</b>。' },
      { i: '🌏', t: '運用', s: '翻訳/パッチノート',
        pr: 'このUI文言を英語に。ゲーム内UIなので文字数を1.2倍以内に抑えて、\n口調はカジュアルに統一。用語집は添付の通り。',
        out: '出力：翻訳のたたき台、パッチノート、ストア文章。',
        w: '文化的なニュアンスと最終品質は人間。用語の統一は辞書を渡す。' },
    ];
    const box = $('#aimap'), pane = $('#aimap-pane');
    box.innerHTML = M.map((m, i) => `<button class="am" data-i="${i}"><i>${m.i}</i><b>${m.t}</b><small>${m.s}</small></button>`).join('');
    box.querySelectorAll('.am').forEach(b => b.onclick = () => {
      box.querySelectorAll('.am').forEach(x => x.classList.toggle('on', x === b));
      const m = M[+b.dataset.i];
      pane.innerHTML = `<b>${m.i} ${m.t}</b><div class="pr">${m.pr}</div>
        <p class="out">${m.out}</p><p class="warn">⚠ ${m.w}</p>`;
      D.expOnce('aimap' + m.t, 5, m.t);
    });
  }

  /* ══════════ 12 case study ══════════ */
  function caseStudy(D) {
    $('#case-prompt').innerHTML = `
      <p>Build this 3D game, for the browser.</p>
      <p>Make sure it is mobile-friendly (touch controls, works well on small screens).</p>
      <p>You have an OpenAI API key and access to their image generation model APIs, <span class="hl">use that for textures</span> to use with your 3D models.</p>
      <p><span class="hl">Work independently - do not ask me to make any further design decisions.</span> Make sure the game is fun, a little surprising, has good raccoon heist vibes, and is visually pleasing.</p>
      <p><span class="hl">Commit and push as often as possible</span> so I can preview your work - start with an index.html that presents a title screen, then build from there.</p>
      <p>Append to a notes.md file as you work.</p>
      <p style="color:#93a4cc;font-size:.9em">＋ 参考画像2枚だけ。以降のやり取りは無し。</p>`;
    $('#case-stats').innerHTML = [
      ['約45分', '遊べる状態まで'], ['17', 'コミット'], ['0個', '音声ファイル（音は全部コード生成）']
    ].map(([a, b]) => `<div class="stat"><b>${a}</b><small>${b}</small></div>`).join('');

    const TL = [
      ['14:49', 'リポジトリ初期化'],
      ['14:55', 'プロンプト1本＋画像2枚を投げる（以降ノータッチ）'],
      ['15:0x', 'タイトル画面だけの index.html を先にpush（すぐプレビューできる）'],
      ['15:1x', 'Three.js をリポジトリに同梱（CDN依存なし＝本番で落ちない）'],
      ['15:1x', '自作スクリプト gen_textures.py で テクスチャ7枚を生成'],
      ['15:2x', '低ポリのキャラ・車・敵をコードで生成（モデルファイル無し）'],
      ['15:29', '<b>遊べる状態に到達（約45分）</b>'],
      ['16:xx', 'Playwrightでスマホ実機相当を検証 → 致命バグ2件を自力で発見・修正'],
      ['18:xx', '敵の追加（追跡犬）、ランク、ベスト記録の保存'],
      ['20:20', '最終コミット（計17コミット）'],
    ];
    const box = $('#case-timeline');
    box.innerHTML = TL.map(([t, s]) => `<div class="tl"><time>${t}</time><span>${s}</span></div>`).join('');
    let playing = null;
    function play() {
      const rows = [...box.querySelectorAll('.tl')];
      rows.forEach(r => r.classList.remove('in'));
      clearInterval(playing); let i = 0;
      playing = setInterval(() => {
        if (i >= rows.length) { clearInterval(playing); return; }
        rows[i].classList.add('in');
        box.scrollTop = Math.max(0, rows[i].offsetTop - box.clientHeight + 40);
        i++;
      }, 520);
      D.expOnce('case', 10, '実例タイムライン');
    }
    $('#case-play').onclick = play;
    D.on('実例', { enter: play, leave() { clearInterval(playing); } });
  }

  /* ══════════ 14 3D model viewer ══════════ */
  function modelViewer(D) {
    const cv = $('#model-canvas');
    const MODELS = {
      'ロボ': {
        code: `<span class="cm">// 「低ポリのロボを作って」→ AIが書く形状コード</span>
const g = new THREE.Group();
box(1.2,1.4,.9, 0,1.6,0, <span class="st">0x8fa6d8</span>);   <span class="cm">// 胴</span>
box(.9,.8,.85, 0,2.7,0, <span class="st">0xdfe8ff</span>);   <span class="cm">// 頭</span>
box(.18,.18,.1, ±.22,2.8,.45, <span class="st">0x3ce0ff</span>); <span class="cm">// 目</span>
box(.3,1.1,.3, ±.85,1.6,0, <span class="st">0x6d7ea8</span>);  <span class="cm">// 腕</span>
box(.35,.9,.35, ±.35,.45,0, <span class="st">0x6d7ea8</span>);  <span class="cm">// 脚</span>
cyl(.06,.5, 0,3.3,0, <span class="st">0xff5cc8</span>);      <span class="cm">// アンテナ</span>`,
        build(T, add) {
          add('box', [1.2, 1.4, .9], [0, 1.6, 0], 0x8fa6d8);
          add('box', [.9, .8, .85], [0, 2.7, 0], 0xdfe8ff);
          [-.22, .22].forEach(x => add('box', [.18, .18, .1], [x, 2.8, .45], 0x3ce0ff, true));
          [-.85, .85].forEach(x => add('box', [.3, 1.1, .3], [x, 1.6, 0], 0x6d7ea8));
          [-.35, .35].forEach(x => add('box', [.35, .9, .35], [x, .45, 0], 0x6d7ea8));
          add('cyl', [.06, .5], [0, 3.3, 0], 0xff5cc8, true);
        }
      },
      'アライグマ': {
        code: `<span class="cm">// 記事のゲームと同じ作り方：モデルファイル0個</span>
box(1.1,.7,1.6, 0,.7,0, <span class="st">0x6b7280</span>);   <span class="cm">// 胴</span>
box(.7,.6,.6, 0,1.0,1.0, <span class="st">0x9aa3b2</span>);  <span class="cm">// 頭</span>
box(.72,.22,.1, 0,1.02,1.32, <span class="st">0x1b2030</span>); <span class="cm">// 泥棒マスク</span>
box(.2,.3,.15, ±.28,1.35,.95, <span class="st">0x6b7280</span>); <span class="cm">// 耳</span>
<span class="cm">// 縞しっぽ：色を交互に並べるだけ</span>
for (i=0;i&lt;5;i++) box(.3,.3,.3, 0,.9+i*.12,-1-i*.25,
    i%2 ? <span class="st">0x1b2030</span> : <span class="st">0xd7dbe4</span>);`,
        build(T, add) {
          add('box', [1.1, .7, 1.6], [0, .7, 0], 0x6b7280);
          add('box', [.7, .6, .6], [0, 1.0, 1.0], 0x9aa3b2);
          add('box', [.72, .22, .1], [0, 1.02, 1.32], 0x1b2030);
          [-.28, .28].forEach(x => add('box', [.2, .3, .15], [x, 1.35, .95], 0x6b7280));
          for (let i = 0; i < 5; i++) add('box', [.3, .3, .3], [0, .9 + i * .12, -1 - i * .25], i % 2 ? 0x1b2030 : 0xd7dbe4);
          [[-.35, .55], [.35, .55], [-.35, -.5], [.35, -.5]].forEach(([x, z]) => add('box', [.22, .5, .22], [x, .25, z], 0x4b5563));
        }
      },
      'たいまつの塔': {
        code: `<span class="cm">// 繰り返しはループで生成（手で並べない）</span>
for (let i=0;i&lt;7;i++)
  box(2-i*.22, .3, 2-i*.22, 0, i*.32, 0,
      <span class="st">0x2b3a63</span>);            <span class="cm">// 積み上げる</span>
cyl(.12,.7, 0,2.6,0, <span class="st">0x8b5a2b</span>);  <span class="cm">// 棒</span>
sphere(.28, 0,3.1,0, <span class="st">0xffd166</span>);  <span class="cm">// 炎</span>
light(<span class="st">0xffb347</span>, 0,3.1,0);        <span class="cm">// 光らせる</span>`,
        build(T, add) {
          for (let i = 0; i < 7; i++) add('box', [2 - i * .22, .3, 2 - i * .22], [0, i * .32, 0], 0x2b3a63);
          add('cyl', [.12, .7], [0, 2.6, 0], 0x8b5a2b);
          add('sphere', [.28], [0, 3.1, 0], 0xffd166, true);
        }
      },
    };

    let ren, scene, cam, group, stop = null;
    function build(name) {
      if (!ren) return;
      if (group) scene.remove(group);
      group = new THREE.Group();
      const add = (kind, dims, pos, color, glow) => {
        const g = kind === 'box' ? new THREE.BoxGeometry(...dims)
          : kind === 'cyl' ? new THREE.CylinderGeometry(dims[0], dims[0], dims[1], 8)
            : new THREE.SphereGeometry(dims[0], 10, 8);
        const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({
          color, roughness: .65, emissive: glow ? color : 0x000000, emissiveIntensity: glow ? .9 : 0, flatShading: true
        }));
        m.position.set(...pos); group.add(m);
      };
      MODELS[name].build(THREE, add);
      scene.add(group);
      $('#model-code').innerHTML = `<code>${MODELS[name].code}</code>`;
    }

    D.on('素材と3Dモデル', {
      enter() {
        if (!ren) {
          ren = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true });
          scene = new THREE.Scene();
          cam = new THREE.PerspectiveCamera(42, 1, .1, 100);
          cam.position.set(0, 2.4, 6); cam.lookAt(0, 1.3, 0);
          scene.add(new THREE.HemisphereLight(0x6ea8ff, 0x101830, 1.1));
          const dl = new THREE.DirectionalLight(0xffffff, 1.3); dl.position.set(3, 6, 4); scene.add(dl);
          const pl = new THREE.PointLight(0xff5cc8, 1.4, 14); pl.position.set(-3, 2, 3); scene.add(pl);
          const btns = $('#model-btns');
          btns.innerHTML = Object.keys(MODELS).map((k, i) => `<button class="${i ? '' : 'on'}">${k}</button>`).join('');
          btns.querySelectorAll('button').forEach(b => b.onclick = () => {
            btns.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
            build(b.textContent); D.expOnce('model' + b.textContent, 5, '3Dモデル');
          });
          build('ロボ');
        }
        const r = cv.getBoundingClientRect();
        ren.setPixelRatio(Math.min(2, devicePixelRatio || 1));
        ren.setSize(r.width, r.height, false);
        cam.aspect = r.width / Math.max(1, r.height); cam.updateProjectionMatrix();
        stop = loop((dt) => { if (group) group.rotation.y += dt * .6; ren.render(scene, cam); });
      },
      leave() { stop && stop(); }
    });
  }

  /* ══════════ 16 bug hunt ══════════ */
  function bugHunt(D) {
    const CASES = [
      {
        t: 'AIに書かせた「敵の追跡」',
        lines: [
          ['void Update() {', 0],
          ['  float d = Vector3.Distance(transform.position, player.position);', 0],
          ['  if (d < chaseRange) {', 0],
          ['    var dir = (player.position - transform.position).normalized;', 0],
          ['    transform.position += dir * speed;', 1,
            '正解。<code>speed</code> に <code>Time.deltaTime</code> を掛けていない。60fpsのPCでは快適に動くのに、144Hzのモニタでは敵が2.4倍速になる。フレームレート依存＝実機で「なぜか難しい」バグの定番。'],
          ['  } else {', 0],
          ['    transform.position = Vector3.Lerp(transform.position, home, 0.05f);', 0],
          ['  }', 0], ['}', 0],
        ],
        miss: '動きはする。だから気づきにくい。もう一度探してみて。'
      },
      {
        t: 'AIに書かせた「スコア保存」',
        lines: [
          ['function saveScore(score) {', 0],
          ['  const best = localStorage.getItem("best");', 0],
          ['  if (score > best) {', 1,
            '正解。<code>getItem</code> は<b>文字列</b>を返すので <code>9 &gt; "10"</code> が数値比較になったり、初回は <code>null</code> と比較される。<code>Number(best) || 0</code> にする。AIは型変換をさらっと飛ばす。'],
          ['    localStorage.setItem("best", score);', 0],
          ['  }', 0],
          ['  return Math.max(score, best);', 0],
          ['}', 0],
        ],
        miss: 'ここは動く。もう一度。ヒント：型。'
      },
    ];
    const box = $('#bughunt');
    box.innerHTML = CASES.map((c, i) => `<div class="hcase"><h3>${c.t}</h3>
      <pre class="code"><code>${c.lines.map(([l, bug], j) =>
      `<span class="cl" data-c="${i}" data-l="${j}" data-bug="${bug}">${l.replace(/</g, '&lt;')}</span>`).join('\n')}</code></pre>
      <p class="hres" id="hres-${i}">怪しい行をクリック。</p></div>`).join('');
    box.querySelectorAll('.cl').forEach(l => l.onclick = () => {
      const i = +l.dataset.c, res = $('#hres-' + i);
      const c = CASES[i], row = c.lines[+l.dataset.l];
      if (l.dataset.bug === '1') {
        box.querySelectorAll(`[data-c="${i}"]`).forEach(x => x.classList.remove('wrong'));
        l.classList.add('right');
        res.className = 'hres good'; res.innerHTML = '🎯 ' + row[2];
        D.expOnce('hunt' + i, 15, 'バグ発見！');
      } else {
        l.classList.add('wrong');
        res.className = 'hres bad'; res.textContent = '❌ ' + c.miss;
      }
    });
  }

  function install(D) {
    titleFX(D); elements(D); party(D); jumpLab(D); codeLines(D); pipeline(D);
    engineTasks(D); engineQuiz(D); compare(D); aiLoop(D); aiMap(D); caseStudy(D);
    modelViewer(D); bugHunt(D);
  }
  return { install };
})();
