(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  /* ---------- header / progress / floating CTA ---------- */
  const header = $('#siteHeader');
  const progress = $('#scrollProgress');
  const floatCta = $('#floatCta');
  const contact = $('#contact');
  const onScroll = () => {
    const y = window.scrollY;
    header.classList.toggle('is-scrolled', y > 10);
    const max = document.documentElement.scrollHeight - window.innerHeight;
    progress.style.transform = `scaleX(${max > 0 ? Math.min(1, y / max) : 0})`;
    const contactTop = contact.getBoundingClientRect().top;
    floatCta.classList.toggle('is-shown', y > window.innerHeight * 0.9 && contactTop > window.innerHeight * 0.6);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- mobile nav ---------- */
  const toggle = $('#navToggle');
  const nav = $('#nav');
  const setMenu = (open) => {
    toggle.setAttribute('aria-expanded', String(open));
    toggle.setAttribute('aria-label', open ? 'メニューを閉じる' : 'メニューを開く');
    nav.classList.toggle('is-open', open);
    header.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
  };
  toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  $$('a', nav).forEach((a) => a.addEventListener('click', () => setMenu(false)));
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape') setMenu(false); });

  /* ---------- active nav link ---------- */
  const navLinks = $$('.nav > a[href^="#"]');
  const sections = navLinks.map((a) => $(a.getAttribute('href'))).filter(Boolean);
  const navObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      navLinks.forEach((a) => a.classList.toggle('is-active', a.getAttribute('href') === `#${en.target.id}`));
    });
  }, { rootMargin: '-45% 0px -50% 0px' });
  sections.forEach((s) => navObs.observe(s));

  /* ---------- reveal ---------- */
  const revealObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (en.isIntersecting) {
        en.target.classList.add('is-in');
        revealObs.unobserve(en.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealObs.observe(el));

  const pipeline = $('#pipeline');
  if (pipeline) {
    new IntersectionObserver((entries, o) => {
      entries.forEach((en) => { if (en.isIntersecting) { pipeline.classList.add('is-in'); o.disconnect(); } });
    }, { threshold: 0.3 }).observe(pipeline);
  }

  /* ---------- count up ---------- */
  const countObs = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const el = en.target;
      countObs.unobserve(el);
      const target = Number(el.dataset.count);
      if (reduceMotion) { el.textContent = target; return; }
      const dur = 1600;
      const t0 = performance.now();
      const tick = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 4);
        el.textContent = Math.round(target * eased);
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => countObs.observe(el));

  /* ---------- build log (typing demo) ---------- */
  const log = $('#buildLog');
  const status = $('#buildStatus');
  const script = [
    ['mu', '$ if-juku new "美容室の予約をLINEで受けたい"'],
    ['', 'AI   相談内容を要件に分解しています'],
    ['ok', '  ok 画面 6 / API 9 / 工程 14 に分解'],
    ['', 'KIT  開発キット line-booking を適用'],
    ['ok', '  ok 予約・変更・会員証・リマインド'],
    ['', 'TEST 自動テストを実行'],
    ['ok', '  ok 128 passed  0 failed'],
    ['', 'CHK  出荷前点検 7分野 36項目'],
    ['ok', '  ok 36 / 36 クリア'],
    ['ac', 'git push → 自動デプロイ'],
    ['ok', '  ok 公開しました  進捗画面を共有'],
  ];
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const renderAll = () => script.map(([c, t]) => `<span class="${c}">${esc(t)}</span>`).join('\n');
  const runLog = async () => {
    if (!log) return;
    if (reduceMotion) { log.innerHTML = renderAll(); status.textContent = 'deployed'; status.classList.add('is-done'); return; }
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (;;) {
      status.textContent = 'running';
      status.classList.remove('is-done');
      let done = '';
      for (const [cls, text] of script) {
        const speed = text.startsWith('  ok') ? 6 : 18;
        for (let i = 1; i <= text.length; i++) {
          log.innerHTML = `${done}<span class="${cls}">${esc(text.slice(0, i))}</span><span class="cur"></span>`;
          await sleep(speed);
        }
        done += `<span class="${cls}">${esc(text)}</span>\n`;
        await sleep(text.startsWith('  ok') ? 260 : 420);
      }
      log.innerHTML = `${done}<span class="cur"></span>`;
      status.textContent = 'deployed';
      status.classList.add('is-done');
      await sleep(5200);
    }
  };
  const heroObs = new IntersectionObserver((entries, o) => {
    entries.forEach((en) => { if (en.isIntersecting) { o.disconnect(); setTimeout(runLog, 700); } });
  });
  if (log) heroObs.observe(log);

  /* ---------- cron list progress ---------- */
  const cron = $('#cronList');
  if (cron) {
    const items = $$('li', cron);
    new IntersectionObserver((entries, o) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        o.disconnect();
        const done = document.getElementById('cronDone');
        const bar = document.getElementById('cronBar');
        const total = 20;
        items.forEach((li, i) => setTimeout(() => {
          li.classList.add('is-done');
          const n = Math.round(((i + 1) / items.length) * total);
          if (done) done.textContent = n;
          if (bar) bar.style.width = `${(n / total) * 100}%`;
        }, reduceMotion ? 0 : 500 + i * 650));
      });
    }, { threshold: 0.5 }).observe(cron);
  }

  /* ---------- tool marquee: duplicate items for a seamless loop ---------- */
  const track = $('.tool-track');
  if (track) {
    $$('.tool', track).forEach((n) => {
      const c = n.cloneNode(true);
      c.setAttribute('aria-hidden', 'true');
      track.appendChild(c);
    });
  }

  /* ---------- hero canvas: light node network ---------- */
  const canvas = $('#heroCanvas');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    let w = 0, h = 0, dpr = 1, nodes = [], raf = 0, visible = true;
    const mouse = { x: -9999, y: -9999 };
    const init = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = canvas.clientWidth; h = canvas.clientHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.round(Math.min(70, (w * h) / 22000));
      nodes = Array.from({ length: n }, () => ({
        x: Math.random() * w, y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.22, vy: (Math.random() - 0.5) * 0.22,
        r: Math.random() * 1.6 + 1, hot: Math.random() < 0.18,
      }));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      const maxD = 150;
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i];
        a.x += a.vx; a.y += a.vy;
        if (a.x < 0 || a.x > w) a.vx *= -1;
        if (a.y < 0 || a.y > h) a.vy *= -1;
        for (let j = i + 1; j < nodes.length; j++) {
          const b = nodes[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d = Math.hypot(dx, dy);
          if (d < maxD) {
            const alpha = (1 - d / maxD) * 0.32;
            ctx.strokeStyle = (a.hot || b.hot) ? `rgba(255,122,0,${alpha})` : `rgba(27,34,51,${alpha * 0.45})`;
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
        }
        const md = Math.hypot(a.x - mouse.x, a.y - mouse.y);
        if (md < 180) {
          ctx.strokeStyle = `rgba(255,122,0,${(1 - md / 180) * 0.5})`;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(mouse.x, mouse.y); ctx.stroke();
        }
        ctx.fillStyle = a.hot ? 'rgba(255,122,0,.85)' : 'rgba(27,34,51,.28)';
        ctx.beginPath(); ctx.arc(a.x, a.y, a.r, 0, Math.PI * 2); ctx.fill();
      }
      if (visible) raf = requestAnimationFrame(draw);
    };
    init(); draw();
    let rt;
    window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(init, 200); });
    canvas.parentElement.addEventListener('pointermove', (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    canvas.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -9999; });
    new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        visible = en.isIntersecting;
        cancelAnimationFrame(raf);
        if (visible) raf = requestAnimationFrame(draw);
      });
    }).observe(canvas);
  }

  /* ---------- contact form → mailto ---------- */
  const form = $('#contactForm');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = form.elements.name;
      const body = form.elements.body;
      let ok = true;
      [name, body].forEach((f) => {
        const bad = !f.value.trim();
        f.classList.toggle('is-invalid', bad);
        if (bad) ok = false;
      });
      if (!ok) {
        $('#formNote').textContent = 'お名前とご相談内容をご記入ください。';
        (name.value.trim() ? body : name).focus();
        return;
      }
      const type = form.elements.type.value;
      const subject = `【ご相談】${type}（${name.value.trim()}）`;
      const text = `お名前・会社名：${name.value.trim()}\nご相談の種類：${type}\n\n${body.value.trim()}\n`;
      window.location.href = `mailto:info@if-juku.net?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
      $('#formNote').textContent = 'メールソフトが開きます。開かない場合は info@if-juku.net へ直接お送りください。';
    });
  }
})();

/* ---------- company profile deck ---------- */
(() => {
  const track = document.getElementById('deckTrack');
  if (!track) return;
  const slides = Array.from(track.querySelectorAll('.deck-slide'));
  const prev = document.getElementById('deckPrev');
  const next = document.getElementById('deckNext');
  const count = document.getElementById('deckCount');
  let idx = 0;
  const update = () => {
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = 0, bestD = Infinity;
    slides.forEach((s, i) => {
      const c = s.offsetLeft + s.offsetWidth / 2;
      const d = Math.abs(c - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    idx = best;
    count.textContent = `${idx + 1} / ${slides.length}`;
    prev.disabled = idx === 0;
    next.disabled = idx === slides.length - 1;
  };
  const go = (i) => {
    const s = slides[Math.max(0, Math.min(slides.length - 1, i))];
    track.scrollTo({ left: s.offsetLeft - (track.clientWidth - s.offsetWidth) / 2 });
  };
  prev.addEventListener('click', () => go(idx - 1));
  next.addEventListener('click', () => go(idx + 1));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(idx + 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(idx - 1); }
  });
  window.addEventListener('resize', update);
  update();

  const lb = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const close = () => { lb.hidden = true; document.body.style.overflow = ''; };
  track.querySelectorAll('.deck-open').forEach((b) => b.addEventListener('click', () => {
    lbImg.src = b.dataset.full;
    lbImg.alt = b.querySelector('img').alt;
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    document.getElementById('lightboxClose').focus();
  }));
  document.getElementById('lightboxClose').addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  window.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
})();


/* ---------- hero: split title, rotating word, slideshow, parallax ---------- */
(() => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('.hero-title, .hero-title2').forEach((title) => { let i = 0;
  title.querySelectorAll('[data-split]').forEach((line) => {
    const text = line.textContent;
    line.textContent = '';
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.style.setProperty('--i', i++);
      s.textContent = ch;
      line.appendChild(s);
    }
  }); });

  document.querySelectorAll('.rotator').forEach((rot) => {
    const words = Array.from(rot.querySelectorAll('.rot-word'));
    const mark = rot.querySelector('.rot-mark');
    let k = 0;
    const fit = () => rot.style.setProperty('--mw', `${words[k].getBoundingClientRect().width}px`);
    setTimeout(() => { fit(); rot.classList.add('is-live'); }, 1300);
    window.addEventListener('resize', fit);
    if (!reduce) {
      setInterval(() => {
        const cur = words[k];
        cur.classList.remove('is-active');
        cur.classList.add('is-leaving');
        setTimeout(() => cur.classList.remove('is-leaving'), 600);
        k = (k + 1) % words.length;
        words[k].classList.add('is-active');
        fit();
      }, 2800);
    }
  });

  const slides = Array.from(document.querySelectorAll('#heroSlides img'));
  const cap = document.getElementById('heroCap');
  if (slides.length > 1 && !reduce) {
    let n = 0;
    setInterval(() => {
      slides[n].classList.remove('is-active');
      n = (n + 1) % slides.length;
      slides[n].classList.add('is-active');
      if (cap) {
        cap.style.opacity = 0;
        setTimeout(() => { cap.textContent = slides[n].dataset.cap || ''; cap.style.opacity = 1; }, 400);
      }
    }, 4200);
  }

  document.querySelectorAll('.drop').forEach((el) => el.addEventListener('animationend', (e) => { if (e.animationName === 'dropIn') el.classList.add('is-done'); }));
  const vis = document.getElementById('heroVisual');
  if (vis && !reduce && window.matchMedia('(pointer: fine)').matches) {
    const items = [
      [vis.querySelector('.photo-main'), 10],
      [vis.querySelector('.photo-sub-1'), 22],
      [vis.querySelector('.photo-sub-2'), 18],
    ];
    vis.closest('.hero').addEventListener('pointermove', (e) => {
      const x = e.clientX / window.innerWidth - 0.5;
      const y = e.clientY / window.innerHeight - 0.5;
      items.forEach(([el, d]) => {
        if (!el) return;
        el.style.setProperty('--px', `${(-x * d).toFixed(1)}px`);
        el.style.setProperty('--py', `${(-y * d).toFixed(1)}px`);
      });
    });
  }
})();


/* ---------- mobile deck: active slide, dots, counters, cron, nav ---------- */
(() => {
  const deck = document.getElementById('mDeck');
  if (!deck) return;
  const mq = window.matchMedia('(max-width: 768px)');
  const slides = Array.from(deck.querySelectorAll('.m-slide'));
  const dots = document.getElementById('mDots');
  slides.forEach((s) => {
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.setAttribute('aria-label', s.dataset.label || s.id);
    dots.appendChild(a);
  });
  const dotLinks = Array.from(dots.children);

  const countUp = (el) => {
    if (el.dataset.done) return; el.dataset.done = '1';
    const target = Number(el.dataset.count); const t0 = performance.now();
    const tick = (t) => { const p = Math.min(1, (t - t0) / 1200); el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))); if (p < 1) requestAnimationFrame(tick); };
    requestAnimationFrame(tick);
  };
  const runCron = (slide) => {
    if (slide.dataset.cron) return; slide.dataset.cron = '1';
    const items = slide.querySelectorAll('.m-cron li'); const bar = slide.querySelector('.m-cron-bar');
    items.forEach((li, i) => setTimeout(() => { li.classList.add('is-done'); if (bar) bar.style.width = `${((i + 1) / items.length) * 100}%`; }, 300 + i * 450));
  };
  const io = new IntersectionObserver((entries) => {
    entries.forEach((en) => {
      if (!en.isIntersecting) return;
      const s = en.target;
      s.classList.add('is-on');
      const idx = slides.indexOf(s);
      dotLinks.forEach((d, i) => d.classList.toggle('on', i === idx));
      s.querySelectorAll('[data-count]').forEach(countUp);
      if (s.querySelector('.m-cron')) runCron(s);
    });
  }, { threshold: 0.55 });
  slides.forEach((s) => io.observe(s));

  // hero slideshow (mobile)
  const ms = Array.from(deck.querySelectorAll('.m-hero .slides img'));
  if (ms.length > 1) { let n = 0; setInterval(() => { ms[n].classList.remove('is-active'); n = (n + 1) % ms.length; ms[n].classList.add('is-active'); }, 3800); }

  // menu links → mobile slides
  const map = { approach: 'm-approach', services: 'm-services', works: 'm-works', field: 'm-field', talent: 'm-talent', pricing: 'm-pricing', company: 'm-company', contact: 'm-contact', ashura: 'm-tools', top: 'm-top' };
  document.querySelectorAll('.nav a[href^="#"], .brand').forEach((a) => {
    a.addEventListener('click', (e) => {
      if (!mq.matches) return;
      const id = (a.getAttribute('href') || '#top').slice(1);
      const target = document.getElementById(map[id] || id);
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
  });
})();
