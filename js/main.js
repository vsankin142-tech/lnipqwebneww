/* ============================================================
   ПРИЗМА — digital studio · interactions
   ============================================================ */
(() => {
  'use strict';

  const doc = document;
  const root = doc.documentElement;
  const body = doc.body;
  const $  = (s, c = doc) => c.querySelector(s);
  const $$ = (s, c = doc) => Array.from(c.querySelectorAll(s));
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const lerp  = (a, b, t) => a + (b - a) * t;
  const easeOutExpo = t => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

  const isTouch  = matchMedia('(hover: none), (pointer: coarse)').matches;
  const finePtr  = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduced  = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================
     1. PRELOADER
  ========================================================== */
  const pre = $('#preloader');
  const preLogo = $('#preloaderLogo');
  const preCounter = $('#preloaderCounter');
  const preBar = $('#preloaderBar');

  // stagger letters
  if (preLogo) {
    preLogo.innerHTML = preLogo.textContent
      .split('')
      .map((ch, i) => `<span style="--i:${i}">${ch}</span>`)
      .join('');
  }

  function finishPreloader() {
    body.classList.remove('is-loading');
    body.classList.add('is-loaded');
    if (!pre) return;
    pre.classList.add('is-done');
    setTimeout(() => pre.remove(), 1400);
    startHeroCounters();
  }

  if (!pre || reduced) {
    body.classList.remove('is-loading');
    body.classList.add('is-loaded');
    if (pre) pre.remove();
    startHeroCounters();
  } else {
    const start = performance.now();
    const dur = 1750;
    const tick = now => {
      const t = clamp((now - start) / dur, 0, 1);
      const e = easeOutExpo(t);
      preCounter.textContent = String(Math.round(e * 100)).padStart(3, '0');
      preBar.style.transform = `scaleX(${e})`;
      if (t < 1) requestAnimationFrame(tick);
      else setTimeout(finishPreloader, 220);
    };
    requestAnimationFrame(tick);
  }

  /* ==========================================================
     2. SPLIT TITLE (word masks)
  ========================================================== */
  function splitWords(el) {
    const walk = node => {
      if (node.nodeType === 3) {
        const frag = doc.createDocumentFragment();
        node.textContent.split(/(\s+)/).forEach(part => {
          if (!part) return;
          if (/^\s+$/.test(part)) {
            frag.appendChild(doc.createTextNode(part));
          } else {
            const w = doc.createElement('span');
            w.className = 'word';
            const inner = doc.createElement('span');
            inner.className = 'word__in';
            inner.textContent = part;
            w.appendChild(inner);
            frag.appendChild(w);
          }
        });
        node.replaceWith(frag);
      } else if (node.nodeType === 1 && !node.classList.contains('word')) {
        Array.from(node.childNodes).forEach(walk);
      }
    };
    Array.from(el.childNodes).forEach(walk);
    $$('.word__in', el).forEach((s, i) => {
      s.style.transitionDelay = `${0.45 + i * 0.07}s`;
    });
  }

  $$('[data-split]').forEach(splitWords);

  /* ==========================================================
     3. SMOOTH (lerp) SCROLL
  ========================================================== */
  const page = $('#smoothContent');
  const useLerp = !reduced && !isTouch && !!page;
  let cur = 0, target = 0;

  function setHeight() {
    if (useLerp) root.style.height = page.scrollHeight + 'px';
  }

  if (useLerp) root.classList.add('smooth');

  let lastY = 0;
  const nav = $('#nav');
  const progressBar = $('#progress');
  const toTop = $('#toTop');
  const parallaxEls = $$('[data-speed]');

  function onFrame(y) {
    const max = Math.max(1, root.scrollHeight - innerHeight);
    if (progressBar) progressBar.style.transform = `scaleX(${clamp(y / max, 0, 1)})`;

    // nav hide / show
    if (nav) {
      nav.classList.toggle('is-scrolled', y > 40);
      if (y > lastY + 5 && y > 160 && !body.classList.contains('mmenu-open')) {
        nav.classList.add('is-hidden');
      } else if (y < lastY - 5) {
        nav.classList.remove('is-hidden');
      }
    }
    lastY = y;

    if (toTop) toTop.classList.toggle('is-visible', y > 640);

    // parallax
    if (!reduced) {
      for (const el of parallaxEls) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        const off = (r.top + r.height / 2 - innerHeight / 2) * -parseFloat(el.dataset.speed);
        el.style.translate = `0 ${off.toFixed(1)}px`;
      }
    }
  }

  if (useLerp) {
    setHeight();
    addEventListener('scroll', () => { target = scrollY; }, { passive: true });
    (function raf() {
      cur = Math.abs(target - cur) < 0.05 ? target : lerp(cur, target, 0.088);
      page.style.transform = `translate3d(0, ${-cur.toFixed(2)}px, 0)`;
      onFrame(cur);
      requestAnimationFrame(raf);
    })();
  } else {
    addEventListener('scroll', () => onFrame(scrollY), { passive: true });
    onFrame(scrollY);
  }

  const ro = new ResizeObserver(setHeight);
  ro.observe(page);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(setHeight);

  /* anchor navigation */
  $$('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (!id || id.length < 2) return;
      const el = doc.querySelector(id);
      if (!el) return;
      e.preventDefault();
      body.classList.remove('mmenu-open');
      const top = el.getBoundingClientRect().top + (useLerp ? cur : scrollY) - 60;
      window.scrollTo(0, Math.max(0, top));
    });
  });

  /* to top */
  if (toTop) {
    toTop.addEventListener('click', () =>
      window.scrollTo(0, 0)
    );
  }

  /* ==========================================================
     4. REVEAL ON SCROLL
  ========================================================== */
  const revealEls = $$('[data-reveal]');
  if (reduced) {
    revealEls.forEach(el => el.classList.add('in-view'));
  } else {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (en.isIntersecting) {
          en.target.classList.add('in-view');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.18, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(el => io.observe(el));
  }

  /* ==========================================================
     5. COUNTERS
  ========================================================== */
  function animateNum(el) {
    const end = parseFloat(el.dataset.count) || 0;
    if (reduced) { el.textContent = String(end); return; }
    const dur = 1900;
    const t0 = performance.now();
    const step = now => {
      const t = clamp((now - t0) / dur, 0, 1);
      el.textContent = String(Math.round(easeOutExpo(t) * end));
      if (t < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  function startHeroCounters() {
    // hero stats are visible right after preloader
    $$('.hero .num[data-count]').forEach((el, i) =>
      setTimeout(() => animateNum(el), i * 120)
    );
  }

  const countIO = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (en.isIntersecting) {
        animateNum(en.target);
        countIO.unobserve(en.target);
      }
    });
  }, { threshold: 0.5 });
  $$('.num[data-count]').forEach(el => {
    if (!el.closest('.hero')) countIO.observe(el);
  });

  /* ==========================================================
     6. HERO PARTICLES (canvas)
  ========================================================== */
  const canvas = $('#particles');
  if (canvas && canvas.getContext) {
    const ctx = canvas.getContext('2d');
    const hero = canvas.closest('.hero');
    const COLORS = ['124,92,255', '78,225,255', '255,78,205', '167,140,255'];
    let w = 0, h = 0, parts = [], running = true;
    const mouse = { x: -1e4, y: -1e4 };

    function resize() {
      const dpr = Math.min(devicePixelRatio || 1, 2);
      const r = hero.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = clamp(Math.round((w * h) / 15000), 36, 110);
      parts = Array.from({ length: n }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.34,
        vy: (Math.random() - 0.5) * 0.34,
        r: Math.random() * 1.7 + 0.7,
        c: COLORS[(Math.random() * COLORS.length) | 0]
      }));
    }

    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    });
    hero.addEventListener('mouseleave', () => { mouse.x = -1e4; mouse.y = -1e4; });

    new IntersectionObserver(([en]) => { running = en.isIntersecting; }, { threshold: 0.02 })
      .observe(hero);

    function draw() {
      requestAnimationFrame(draw);
      if (!running || reduced) return;
      ctx.clearRect(0, 0, w, h);

      for (const p of parts) {
        p.x += p.vx; p.y += p.vy;
        const dx = p.x - mouse.x, dy = p.y - mouse.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 130 * 130) {
          const d = Math.sqrt(d2) || 1;
          const f = ((130 - d) / 130) * 0.75;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
        if (p.x < -24) p.x = w + 24; else if (p.x > w + 24) p.x = -24;
        if (p.y < -24) p.y = h + 24; else if (p.y > h + 24) p.y = -24;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, 6.2832);
        ctx.fillStyle = `rgba(${p.c},0.85)`;
        ctx.fill();
      }

      ctx.lineWidth = 1;
      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i], b = parts[j];
          const dx = a.x - b.x, dy = a.y - b.y;
          const d2 = dx * dx + dy * dy;
          if (d2 < 110 * 110) {
            const al = (1 - Math.sqrt(d2) / 110) * 0.22;
            ctx.strokeStyle = `rgba(150,130,255,${al})`;
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }
    }

    resize();
    addEventListener('resize', resize);
    draw();
  }

  /* ==========================================================
     7. CURSOR
  ========================================================== */
  if (finePtr && !reduced) {
    const dot = $('#cursorDot');
    const ring = $('#cursorRing');
    let mx = innerWidth / 2, my = innerHeight / 2;
    let rx = mx, ry = my;
    let seen = false;

    body.classList.add('has-cursor', 'cursor-on');

    addEventListener('mousemove', e => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px)`;
      if (!seen) {
        seen = true;
        rx = mx; ry = my;
      }
    }, { passive: true });

    (function loop() {
      rx = lerp(rx, mx, 0.16);
      ry = lerp(ry, my, 0.16);
      ring.style.transform = `translate(${rx.toFixed(1)}px, ${ry.toFixed(1)}px)`;
      requestAnimationFrame(loop);
    })();

    doc.addEventListener('mousedown', () => ring.classList.add('is-down'));
    doc.addEventListener('mouseup', () => ring.classList.remove('is-down'));

    const hoverSel = 'a, button, [data-cursor="hover"]';
    $$('[data-cursor="view"]').forEach(el => {
      el.addEventListener('mouseenter', () => {
        ring.classList.add('is-view');
        const label = ring.querySelector('.cursor__label');
        if (label) label.textContent = 'Смотреть';
      });
      el.addEventListener('mouseleave', () => ring.classList.remove('is-view'));
    });
    $$(hoverSel).forEach(el => {
      el.addEventListener('mouseenter', () => {
        if (!el.closest('[data-cursor="view"]')) ring.classList.add('is-active');
      });
      el.addEventListener('mouseleave', () => ring.classList.remove('is-active'));
    });
    doc.addEventListener('mouseleave', () => body.classList.remove('cursor-on'));
    doc.addEventListener('mouseenter', () => body.classList.add('cursor-on'));
  }

  /* ==========================================================
     8. TILT CARDS
  ========================================================== */
  if (finePtr && !reduced) {
    $$('.tilt').forEach(card => {
      card.addEventListener('mousemove', e => {
        const r = card.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width;
        const py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ry', `${((px - 0.5) * 8).toFixed(2)}deg`);
        card.style.setProperty('--rx', `${((0.5 - py) * 8).toFixed(2)}deg`);
        card.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
        card.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
      });
      card.addEventListener('mouseleave', () => {
        card.style.setProperty('--rx', '0deg');
        card.style.setProperty('--ry', '0deg');
      });
    });
  }

  /* ==========================================================
     9. MAGNETIC BUTTONS
  ========================================================== */
  if (finePtr && !reduced) {
    $$('.magnetic').forEach(el => {
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        const x = e.clientX - r.left - r.width / 2;
        const y = e.clientY - r.top - r.height / 2;
        el.style.transform = `translate(${(x * 0.28).toFixed(1)}px, ${(y * 0.28).toFixed(1)}px)`;
      });
      el.addEventListener('mouseleave', () => {
        el.style.transform = '';
      });
    });
  }

  /* ==========================================================
     10. TESTIMONIALS SLIDER
  ========================================================== */
  const track = $('#tstTrack');
  if (track) {
    const slides = $$('.tst__slide', track);
    const dotsBox = $('#tstDots');
    const prev = $('#tstPrev');
    const next = $('#tstNext');
    let idx = 0, timer = null;

    slides.forEach((_, i) => {
      const b = doc.createElement('button');
      b.className = 'tst__dot' + (i === 0 ? ' is-active' : '');
      b.setAttribute('aria-label', `Отзыв ${i + 1}`);
      b.addEventListener('click', () => go(i, true));
      dotsBox.appendChild(b);
    });
    const dots = $$('.tst__dot', dotsBox);

    function go(n, manual) {
      idx = (n + slides.length) % slides.length;
      track.style.transform = `translateX(-${idx * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('is-active', i === idx));
      if (manual) restart();
    }
    function restart() {
      clearInterval(timer);
      if (!reduced) timer = setInterval(() => go(idx + 1), 5600);
    }
    prev.addEventListener('click', () => go(idx - 1, true));
    next.addEventListener('click', () => go(idx + 1, true));
    const tst = $('.tst');
    tst.addEventListener('mouseenter', () => clearInterval(timer));
    tst.addEventListener('mouseleave', restart);
    restart();
  }

  /* ==========================================================
     11. MOBILE MENU
  ========================================================== */
  const burger = $('#burger');
  if (burger) {
    const toggle = open => {
      body.classList.toggle('mmenu-open', open);
      burger.setAttribute('aria-expanded', String(open));
      if (useLerp) {
        // lock lerp scroll while menu is open
        if (open) {
          root.style.height = '100vh';
        } else {
          setHeight();
        }
      }
    };
    burger.addEventListener('click', () =>
      toggle(!body.classList.contains('mmenu-open'))
    );
  }

  /* ==========================================================
     12. EASTER EGG — Konami-lite (press "P" → rainbow pulse)
  ========================================================== */
  let presses = [];
  addEventListener('keydown', e => {
    if (e.key.toLowerCase() !== 'p') return;
    presses.push(performance.now());
    presses = presses.filter(t => performance.now() - t < 3000);
    if (presses.length >= 3) {
      presses = [];
      body.animate(
        [
          { filter: 'hue-rotate(0deg)' },
          { filter: 'hue-rotate(360deg)' },
          { filter: 'hue-rotate(0deg)' }
        ],
        { duration: 1200, easing: 'ease-in-out' }
      );
    }
  });
})();
