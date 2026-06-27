// Mentorship Aside: Ink Reveal
// SPEC: about-interactive-enhancements.md

(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ─── Inject CSS ───────────────────────────────────────────────────────────────
  // These rules only activate once the script runs — no FOUC risk.
  const style = document.createElement('style');
  style.textContent = `
    [data-ink-reveal] .ink-reveal-svg {
      display: block;
      width: 100%;
      height: 2px;
      overflow: visible;
      margin-bottom: clamp(8px, 0.65rem, 12px);
    }

    [data-ink-reveal] .ink-line {
      stroke-dasharray: 400;
      stroke-dashoffset: 1000;
      transition: none;
    }

    [data-ink-reveal].is-visible .ink-line {
      stroke-dashoffset: 0;
      transition: stroke-dashoffset 0.65s cubic-bezier(0.4, 0, 0.2, 1);
    }

    [data-ink-reveal] p {
      opacity: 0;
      transform: translateY(5px);
      transition: none;
    }

    [data-ink-reveal].is-visible p {
      opacity: 1;
      transform: translateY(0);
      transition: opacity 0.5s ease 0.55s, transform 0.5s ease 0.55s;
    }

    /* Reduced motion: snap immediately, no transitions */
    @media (prefers-reduced-motion: reduce) {
      [data-ink-reveal] .ink-line,
      [data-ink-reveal] p,
      [data-ink-reveal].is-visible .ink-line,
      [data-ink-reveal].is-visible p {
        transition: none !important;
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);

  // ─── Inject SVG + data-ink-reveal attribute into every <aside> ───────────────
  // The HTML doesn't have data-ink-reveal or the SVG markup — we add them here
  // so the HTML stays clean and the enhancement is fully self-contained.
  document.querySelectorAll('aside').forEach(aside => {
    aside.setAttribute('data-ink-reveal', '');

    if (aside.querySelector('.ink-reveal-line')) return;

    // Build SVG ink line — uses a long path so stroke-dasharray covers any width
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 1000 10');
    svg.setAttribute('preserveAspectRatio', 'none');
    svg.setAttribute('aria-hidden', 'true');
    svg.classList.add('ink-reveal-svg');

    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '0');
    line.setAttribute('y1', '5');
    line.setAttribute('x2', '1000');
    line.setAttribute('y2', '5');
    line.setAttribute('stroke', 'currentColor');
    line.setAttribute('stroke-width', '1.5');
    line.setAttribute('stroke-linecap', 'round');
    line.style.opacity = '0.3';
    line.classList.add('ink-line');

    svg.appendChild(line);
    aside.insertBefore(svg, aside.firstChild);
  });

  // ─── IntersectionObserver — use forEach, not destructuring ───────────────────
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      el.classList.add('is-visible');
      io.unobserve(el);
    });
  }, { threshold: 0.7 });

  // Lowered threshold fallback: if the aside is taller than the viewport,
  // 0.7 may never fire. Use a secondary observer at 0.3 as a safety net.
  const ioFallback = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const el = entry.target;
      if (!el.classList.contains('is-visible')) {
        el.classList.add('is-visible');
      }
      ioFallback.unobserve(el);
    });
  }, { threshold: 0.3 });

  document.querySelectorAll('[data-ink-reveal]').forEach(el => {
    io.observe(el);
    ioFallback.observe(el);
  });

})();
