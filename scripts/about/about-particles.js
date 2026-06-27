// Mentorship Counter: Particle Number Formation
// SPEC: about-interactive-enhancements.md

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Reduced-motion fallback: simple counter increment ───────────────────────
  function runCounter(spanEl) {
    const text  = spanEl.textContent.trim();
    const match = text.match(/(\d+)/);
    if (!match) return;
    const target = parseInt(match[1], 10);
    const hasPlus = text.includes('+');
    const start = performance.now();
    const dur   = 900;
    function tick(now) {
      const p = Math.min((now - start) / dur, 1);
      // Ease out cubic
      const ep = 1 - Math.pow(1 - p, 3);
      spanEl.textContent = Math.round(ep * target) + (hasPlus ? '+' : '');
      if (p < 1) requestAnimationFrame(tick);
      else spanEl.textContent = text;
    }
    requestAnimationFrame(tick);
  }

  // ─── Sample pixel positions from text rendered to offscreen canvas ────────────
  function samplePoints(text, w, h, density) {
    const off = Object.assign(document.createElement('canvas'), { width: w, height: h });
    const cx  = off.getContext('2d');
    cx.fillStyle = '#000';
    cx.font = `700 ${Math.round(h * 0.82)}px "IBM Plex Sans", system-ui, sans-serif`;
    cx.textAlign    = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, w / 2, h / 2);
    const data = cx.getImageData(0, 0, w, h).data;
    const pts  = [];
    for (let y = 0; y < h; y += density) {
      for (let x = 0; x < w; x += density) {
        if (data[(y * w + x) * 4 + 3] > 128) pts.push({ x, y });
      }
    }
    return pts;
  }

  // ─── Particle ─────────────────────────────────────────────────────────────────
  function makeParticle(target, cw, ch, index, total) {
    // Stream in from a random screen edge
    let x, y;
    switch (Math.floor(Math.random() * 4)) {
      case 0: x = Math.random() * cw; y = -24;      break; // top
      case 1: x = cw + 24;            y = Math.random() * ch; break; // right
      case 2: x = Math.random() * cw; y = ch + 24;  break; // bottom
      default:x = -24;                y = Math.random() * ch; break; // left
    }
    return {
      x, y,
      tx: target.x,
      ty: target.y,
      // Slight variance so they don't all arrive at exactly the same rate
      ease:    0.075 + Math.random() * 0.045,
      radius:  1.4 + Math.random() * 1.1,
      // Stagger start: spread over the first 600 ms
      startAt: (index / total) * 0.6,
      // Overshoot — particles spring past target then settle
      overshootX: (Math.random() - 0.5) * 8,
      overshootY: (Math.random() - 0.5) * 8,
      phase: 'travel', // 'travel' | 'overshoot' | 'settle'
    };
  }

  function updateParticle(p, elapsed) {
    if (elapsed < p.startAt) return;

    if (p.phase === 'travel') {
      const dx = p.tx - p.x, dy = p.ty - p.y;
      p.x += dx * p.ease;
      p.y += dy * p.ease;
      if (Math.abs(dx) < 0.8 && Math.abs(dy) < 0.8) {
        // Reached target — apply overshoot offset
        p.x = p.tx + p.overshootX;
        p.y = p.ty + p.overshootY;
        p.phase = 'settle';
      }
    } else {
      // Settle back to exact target
      p.x += (p.tx - p.x) * 0.14;
      p.y += (p.ty - p.y) * 0.14;
    }
  }

  function isSettled(p) {
    return p.phase === 'settle' &&
      Math.abs(p.tx - p.x) < 0.3 &&
      Math.abs(p.ty - p.y) < 0.3;
  }

  // ─── Full particle animation ──────────────────────────────────────────────────
  function runParticles(spanEl) {
    const text = spanEl.textContent.trim();
    const rect = spanEl.getBoundingClientRect();
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    const lw   = Math.round(rect.width);
    const lh   = Math.round(rect.height);

    // ── Capture color BEFORE hiding text ──
    const color = getComputedStyle(spanEl).color;

    // Canvas overlay
    const cvs = document.createElement('canvas');
    cvs.width  = lw * dpr;
    cvs.height = lh * dpr;
    cvs.style.cssText =
      `position:absolute;top:0;left:0;width:${lw}px;height:${lh}px;pointer-events:none;`;
    spanEl.style.position = 'relative';
    spanEl.style.color    = 'transparent'; // hide text while canvas animates
    spanEl.appendChild(cvs);

    const cx = cvs.getContext('2d');
    cx.scale(dpr, dpr);

    // Sample points — cap particle count at 600 for performance
    const density = Math.max(2, Math.round(lw / 80));
    const rawPts  = samplePoints(text, lw, lh, density);
    const MAX     = 600;
    const pts     = rawPts.length > MAX
      ? rawPts.filter((_, i) => i % Math.ceil(rawPts.length / MAX) === 0)
      : rawPts;

    if (pts.length === 0) {
      // Nothing to render (font not loaded etc.) — restore text immediately
      spanEl.style.color = '';
      cvs.remove();
      return;
    }

    const particles = pts.map((p, i) => makeParticle(p, lw, lh, i, pts.length));

    let startTime = null;

    function frame(now) {
      if (!startTime) startTime = now;
      const elapsed = (now - startTime) / 1000;

      cx.clearRect(0, 0, lw, lh);
      cx.fillStyle = color;

      let doneCount = 0;
      for (const p of particles) {
        updateParticle(p, elapsed);
        cx.beginPath();
        cx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        cx.fill();
        if (isSettled(p)) doneCount++;
      }

      // Wait until all particles settled AND at least 1.2 s have passed
      if (doneCount === particles.length && elapsed >= 1.2) {
        cvs.style.transition = 'opacity 0.3s ease';
        cvs.style.opacity    = '0';
        setTimeout(() => { spanEl.style.color = ''; cvs.remove(); }, 320);
        return;
      }
      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);
  }

  // ─── Wait for font, then observe ─────────────────────────────────────────────
  function init() {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting || entry.target.dataset.animated) return;
        entry.target.dataset.animated = 'true';
        io.unobserve(entry.target);
        if (reducedMotion) runCounter(entry.target);
        else               runParticles(entry.target);
      });
    }, { threshold: 0.6 });

    document.querySelectorAll('[data-animate] .metric-highlight').forEach(el => io.observe(el));
  }

  // Ensure IBM Plex Sans is loaded before sampling text pixels
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(init);
  } else {
    // Fallback for browsers without FontFaceSet
    window.addEventListener('load', init);
  }

})();
