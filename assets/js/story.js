// 物語モーション「もしも」が、仕事になるまで（assets/css/story.css とセット）
(() => {
  const katas = document.querySelectorAll('.kata');
  if (!katas.length) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const canObserve = 'IntersectionObserver' in window;
  if (!reduce && canObserve) document.documentElement.classList.add('kata-ready');

  katas.forEach(kata => {
    const steps = kata.querySelectorAll('[data-kata-step]');
    const num = kata.querySelector('[data-count]');
    let visible = false, timer;

    const pressed = i => steps.forEach((b, k) => b.setAttribute('aria-pressed', String(k === i)));
    const countUp = () => {
      if (!num) return;
      const to = Number(num.dataset.count), t0 = performance.now();
      const tick = now => {
        const p = Math.min(1, (now - t0) / 1400);
        num.textContent = Math.round(to * (1 - Math.pow(1 - p, 3)));
        if (p < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };
    const finish = () => { kata.classList.add('is-done'); pressed(3); };

    const play = () => {
      if (kata.classList.contains('is-play') || kata.classList.contains('is-manual')) return;
      kata.classList.add('is-play');
      // ステップ表示を組み上がりに合わせて進める（器→スープ→麺→具の順と同じ考え方）
      [0, 1.4, 2.7, 4.1].forEach((s, i) => setTimeout(() => !kata.classList.contains('is-manual') && pressed(i), s * 1000));
      setTimeout(countUp, 4.2 * 1000);
      timer = setTimeout(finish, 7.2 * 1000);
    };

    // 段階ボタン: 押した段階まで表示（イントロは止める）
    steps.forEach((b, i) => b.addEventListener('click', () => {
      clearTimeout(timer);
      kata.classList.add('is-manual', 'is-done');
      kata.dataset.stage = i;
      pressed(i);
      if (i === 3 && num) countUp();
    }));

    if (reduce || !canObserve) {
      kata.classList.add('is-done'); pressed(3);
      if (num) num.textContent = num.dataset.count;
      return;
    }
    new IntersectionObserver(es => {
      visible = es[0].isIntersecting;
      if (visible) play();
      kata.classList.toggle('is-paused', !visible || document.hidden);
    }, { threshold: .35 }).observe(kata);
    document.addEventListener('visibilitychange', () => kata.classList.toggle('is-paused', !visible || document.hidden));
  });
})();
