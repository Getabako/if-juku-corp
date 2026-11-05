/* ページ切り替えの演出（アクセス解析 → デジタル空間が開く）
   body[data-page] が "home"（普通のホームページ）か "ai"（アイのページ）。
   相手のページへのリンクを押すと幕が閉じ、着いた側でアクセス解析の演出から幕が開く。 */
(() => {
  const html = document.documentElement;
  const page = document.body.dataset.page;
  const ss = {
    get: (k) => { try { return sessionStorage.getItem(k); } catch { return null; } },
    set: (k, v) => { try { sessionStorage.setItem(k, v); } catch {} },
    del: (k) => { try { sessionStorage.removeItem(k); } catch {} },
  };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const hex = () => '0x' + Math.floor(Math.random() * 0xffff).toString(16).toUpperCase().padStart(4, '0');

  function el(tag, cls, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (parent) parent.appendChild(e); return e; }

  function shell() {
    const root = el('div', 'portal');
    root.setAttribute('aria-hidden', 'true');
    const slices = el('div', 'portal-slices', root);
    for (let i = 0; i < 12; i++) {
      const s = el('i', '', slices);
      s.style.transitionDelay = `${Math.abs(i - 5.5) * 28}ms`;   // 真ん中から外へ順に開く
    }
    return root;
  }

  /* 文字の雨（数字・カタカナ・記号が降る） */
  function rain(canvas) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const W = canvas.width = innerWidth * dpr, H = canvas.height = innerHeight * dpr;
    const fs = 15 * dpr, cols = Math.ceil(W / (fs * 1.15));
    const chars = '01アイエフジュクAIif塾{}<>/=+*#カタチヲツクル'.split('');
    const drops = Array.from({ length: cols }, () => Math.random() * -40);
    const speed = Array.from({ length: cols }, () => 0.35 + Math.random() * 0.75);
    ctx.font = `${fs}px "JetBrains Mono", ui-monospace, monospace`;
    let alive = true;
    (function tick() {
      if (!alive) return;
      ctx.fillStyle = 'rgba(14, 22, 40, .22)';
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < cols; i++) {
        const y = drops[i] * fs;
        const c = chars[(Math.random() * chars.length) | 0];
        const r = Math.random();
        ctx.fillStyle = r > .975 ? '#FFFFFF' : r > .86 ? 'rgba(255,138,31,.9)' : 'rgba(57,201,192,.55)';
        ctx.fillText(c, i * fs * 1.15, y);
        drops[i] += speed[i];
        if (y > H && Math.random() > .96) drops[i] = Math.random() * -8;
      }
      requestAnimationFrame(tick);
    })();
    return () => { alive = false; };
  }

  function deviceLine() {
    const w = innerWidth, h = innerHeight;
    const ua = navigator.userAgent;
    const touch = matchMedia('(pointer: coarse)').matches;
    const short = Math.min(screen.width || w, screen.height || h);
    const kind = /iPad|Tablet/i.test(ua) || (touch && short >= 600) ? 'タブレット' : /Mobi|Android|iPhone/i.test(ua) || touch ? 'スマホ' : 'PC';
    return `${kind} ${w}×${h}`;
  }
  function clock() { return new Date().toLocaleTimeString('ja-JP', { hour12: false }); }

  const SCRIPTS = {
    home: (from) => ({
      emblem: { src: 'assets/img/brand/ifjuku-logo.png', face: false },
      title: 'ACCESS ANALYZING', done: 'ようこそ、if塾へ',
      duration: 2300,
      lines: [
        ['接続を受け付けました', clock()],
        ['端末を解析中', deviceLine()],
        ['経路を確認', from === 'ai' ? 'アイの案内から' : '直接アクセス'],
        ['安全な接続', 'OK'],
        ['デジタル空間を展開', 'OK'],
      ],
    }),
    ai: () => ({
      emblem: { src: 'assets/img/chara/ai-face.png', face: true },
      title: 'CALLING AI', done: 'アイにつながりました',
      duration: 1700,
      lines: [
        ['呼び出しを受け付けました', clock()],
        ['端末を解析中', deviceLine()],
        ['アイを起動中', 'OK'],
        ['声と表情を準備', 'OK'],
      ],
    }),
  };

  function setTitle(node, text) {
    node.textContent = '';
    [...text].forEach((ch, i) => { const s = el('span', 'gl', node); s.textContent = ch === ' ' ? '\u00A0' : ch; s.style.animationDelay = `${i * 22}ms`; });
  }

  async function enter(from) {
    const cfg = SCRIPTS[page](from);
    const root = shell();
    const fx = el('div', 'portal-fx', root);
    const canvas = el('canvas', 'portal-rain', fx);
    el('div', 'portal-floor', fx);
    el('div', 'portal-scan', fx);
    for (const c of ['tl', 'tr', 'bl', 'br']) el('div', `portal-corner ${c}`, fx);
    const hexL = el('div', 'portal-hex l', fx), hexR = el('div', 'portal-hex r', fx);
    const core = el('div', 'portal-core', fx);
    const ring = el('div', 'portal-ring', core);
    const C = 2 * Math.PI * 47;
    ring.innerHTML = `<svg viewBox="0 0 100 100">
      <circle class="r1" cx="50" cy="50" r="49" fill="none" stroke="rgba(57,201,192,.5)" stroke-width=".6" stroke-dasharray="2 3"/>
      <circle class="r2" cx="50" cy="50" r="44" fill="none" stroke="rgba(255,138,31,.55)" stroke-width="1.2" stroke-dasharray="18 7 3 7"/>
      <circle cx="50" cy="50" r="47" fill="none" stroke="rgba(255,255,255,.08)" stroke-width="2"/>
      <circle class="prog" cx="50" cy="50" r="47" fill="none" stroke="#39C9C0" stroke-width="2" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
    </svg>`;
    const emb = el('div', 'portal-emblem' + (cfg.emblem.face ? ' face' : ''), ring);
    const img = el('img', '', emb); img.src = cfg.emblem.src; img.alt = '';
    const title = el('div', 'portal-title', core);
    const log = el('ul', 'portal-log', core);
    const meter = el('div', 'portal-meter', core);
    const barI = el('i', '', el('div', 'portal-bar', meter));
    const pct = el('div', 'portal-pct', meter);
    el('div', 'portal-flash', root);
    const skip = el('button', 'portal-skip', root); skip.type = 'button'; skip.textContent = 'スキップ';
    document.body.appendChild(root);
    html.classList.remove('portal-on');
    setTitle(title, cfg.title);

    const stopRain = rain(canvas);
    const prog = ring.querySelector('.prog');
    let skipped = false, t0 = performance.now();
    const hexTimer = setInterval(() => {
      hexL.textContent = Array.from({ length: 6 }, () => `${hex()} ${hex()} ${hex()}`).join('\n');
      hexR.textContent = Array.from({ length: 6 }, () => `${hex()}  ${(Math.random() * 999).toFixed(1).padStart(5, '0')}`).join('\n');
    }, 90);
    let raf;
    (function meterTick() {
      const k = Math.min(1, (performance.now() - t0) / cfg.duration);
      const e = 1 - Math.pow(1 - k, 2.2);
      barI.style.width = `${e * 100}%`;
      pct.textContent = `${String(Math.round(e * 100)).padStart(3, '0')}%`;
      prog.style.strokeDashoffset = String(C * (1 - e));
      if (k < 1 && !skipped) raf = requestAnimationFrame(meterTick);
    })();
    const open = async () => {
      if (root.classList.contains('is-open')) return;
      skipped = true; cancelAnimationFrame(raf);
      barI.style.width = '100%'; pct.textContent = '100%'; prog.style.strokeDashoffset = '0';
      root.classList.add('is-open');
      await sleep(760);
      clearInterval(hexTimer); stopRain(); root.remove();
    };
    skip.addEventListener('click', open);

    // ログを一文字ずつ打つ
    const per = (cfg.duration - 300) / cfg.lines.length;
    for (const [label, value] of cfg.lines) {
      if (skipped) return;
      const li = el('li', 'cur', log);
      const start = performance.now();
      for (let i = 1; i <= label.length; i++) {
        if (skipped) return;
        li.textContent = label.slice(0, i);
        await sleep(Math.min(26, (per * 0.45) / label.length));
      }
      li.append(' ');
      await sleep(Math.max(60, per * 0.3));
      const v = el('span', 'ok', li); v.textContent = value;
      li.classList.remove('cur');
      if (log.children.length > 5) log.firstElementChild.remove();
      const rest = per - (performance.now() - start);
      if (rest > 0) await sleep(rest);
    }
    if (skipped) return;
    setTitle(title, cfg.done);
    await sleep(520);
    open();
  }

  function leave(href, target) {
    const root = shell();
    root.classList.add('is-closing');
    const msg = el('div', 'portal-leave', root);
    el('span', '', msg).textContent = target === 'ai' ? 'アイを呼び出しています' : 'ホームページへ接続しています';
    document.body.appendChild(root);
    ss.set('portal', target);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('is-shut')));
    setTimeout(() => { location.href = href; }, 820);
  }

  function linkKind(url) {
    if (url.origin !== location.origin) return null;
    if (/\/home\.html$/.test(url.pathname)) return 'home';
    if (/\/$|\/index\.html$/.test(url.pathname)) return 'ai';
    return null;
  }

  // 相手のページへのリンクで幕を閉じる
  document.addEventListener('click', (e) => {
    if (reduce || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target.closest('a[href]');
    if (!a || (a.target && a.target !== '_self') || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    const kind = linkKind(url);
    if (!kind || kind === page) return;
    e.preventDefault();
    leave(url.href, kind);
  });

  // 戻るボタンでキャッシュから復元されたときは幕を外す
  addEventListener('pageshow', (e) => { if (e.persisted) { document.querySelectorAll('.portal').forEach((p) => p.remove()); html.classList.remove('portal-on'); } });

  // 着いた側の演出
  const came = ss.get('portal');
  if (html.classList.contains('portal-on')) {
    const from = came === page ? (page === 'home' ? 'ai' : 'home') : 'direct';
    ss.del('portal');
    if (page === 'home') ss.set('portalSeen', '1');
    if (reduce) html.classList.remove('portal-on'); else enter(from);
  }
})();
