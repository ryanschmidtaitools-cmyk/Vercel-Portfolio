(function () {
  'use strict';

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCircularOffset(index, activeIndex, total) {
    let offset = index - activeIndex;
    const half = Math.floor(total / 2);
    if (offset > half) offset -= total;
    if (offset < -half) offset += total;
    return offset;
  }

  function CircularCarousel(container) {
    this.container = container;
    this.track = container.querySelector('.dh-track');
    if (!this.track) return;
    this.slides = Array.from(this.track.querySelectorAll('.dh-slide'));
    this.total = this.slides.length;
    if (this.total < 2) return;

    this.activeIndex = 0;
    this.isPaused = false;
    this.isTransitioning = false;
    this.autoplayTimer = null;
    this.pauseOnHover = true;

    this.navPrev = container.querySelector('.dh-prev');
    this.navNext = container.querySelector('.dh-next');
    this.dots = container.querySelector('.dh-dots');

    this.init();
  }

  CircularCarousel.prototype.init = function () {
    this.container.classList.add('circular-carousel');
    this.track.classList.add('circular-carousel__track');

    this.slides.forEach(function (slide, i) {
      slide.classList.add('circular-carousel__slide');
      slide.setAttribute('data-index', i);
      slide.style.position = 'absolute';
      slide.style.inset = '0';
      slide.style.margin = 'auto';
      slide.style.width = 'clamp(440px, 48vw, 680px)';
      slide.style.height = 'auto';
      slide.style.transformStyle = 'preserve-3d';
      slide.style.willChange = 'transform, opacity';
      slide.style.cursor = 'pointer';

      var img = slide.querySelector('img, video');
      if (img) {
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.display = 'block';
        img.style.borderRadius = 'var(--radius-lg, 18px)';
        img.style.boxShadow = 'var(--shadow-1)';
        img.style.pointerEvents = 'none';
      }

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.position = 'absolute';
        figcaption.style.bottom = '-2rem';
        figcaption.style.left = '0';
        figcaption.style.right = '0';
        figcaption.style.textAlign = 'center';
        figcaption.style.fontSize = 'var(--fs-sm)';
        figcaption.style.color = 'var(--text-secondary)';
        figcaption.style.pointerEvents = 'none';
      }

      slide.addEventListener('click', this.handleSlideClick.bind(this, i));
    }, this);

    this.container.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseLeave.bind(this));

    if (this.navPrev) {
      this.navPrev.addEventListener('click', function (e) {
        e.preventDefault();
        this.prev();
      }.bind(this));
      this.navPrev.style.position = 'absolute';
      this.navPrev.style.left = '0.5rem';
      this.navPrev.style.zIndex = '10';
    }

    if (this.navNext) {
      this.navNext.addEventListener('click', function (e) {
        e.preventDefault();
        this.next();
      }.bind(this));
      this.navNext.style.position = 'absolute';
      this.navNext.style.right = '0.5rem';
      this.navNext.style.zIndex = '10';
    }

    this.render();

    if (!reducedMotion) {
      this.startAutoplay();
    }
  };

  CircularCarousel.prototype.getTransform = function (offset) {
    var distance = Math.abs(offset);
    var angleStep = 0.45;
    var angle = offset * angleStep;
    var radius = 400;

    var x = radius * Math.sin(angle);
    var z = -radius * (1 - Math.cos(angle));

    var opacity = Math.max(0.15, 1 - distance * 0.3);
    var rotateY = -angle * (180 / Math.PI);
    var zIndex = Math.round(30 - distance * 7);

    return { x: x, z: z, opacity: opacity, rotateY: rotateY, zIndex: zIndex };
  };

  CircularCarousel.prototype.render = function () {
    var self = this;
    this.slides.forEach(function (slide, i) {
      var offset = getCircularOffset(i, self.activeIndex, self.total);
      var t = self.getTransform(offset);

      slide.style.transform = 'translateX(' + t.x + 'px) translateZ(' + t.z + 'px) rotateY(' + t.rotateY + 'deg)';
      slide.style.opacity = t.opacity;
      slide.style.zIndex = t.zIndex;
      slide.style.pointerEvents = offset === 0 ? 'auto' : 'pointer';

      var img = slide.querySelector('img, video');
      if (img) {
        img.style.filter = offset === 0 ? 'brightness(1.05) contrast(1.05)' : 'brightness(0.8) contrast(0.95)';
        img.style.boxShadow = offset === 0 ? '0 12px 48px rgba(0, 0, 0, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.25)';
      }

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.opacity = offset === 0 ? '1' : '0';
      }

      slide.classList.toggle('circular-carousel__slide--active', offset === 0);
    });

    if (this.dots) {
      var dotButtons = this.dots.querySelectorAll('button');
      dotButtons.forEach(function (btn, i) {
        btn.setAttribute('aria-selected', i === self.activeIndex ? 'true' : 'false');
      });
    }
  };

  CircularCarousel.prototype.goTo = function (index) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.activeIndex = (index + this.total) % this.total;
    this.render();
    var self = this;
    setTimeout(function () {
      self.isTransitioning = false;
    }, 1200);
  };

  CircularCarousel.prototype.next = function () {
    this.goTo(this.activeIndex + 1);
  };

  CircularCarousel.prototype.prev = function () {
    this.goTo(this.activeIndex - 1);
  };

  CircularCarousel.prototype.handleSlideClick = function (index) {
    if (index === this.activeIndex) return;
    this.goTo(index);
  };

  CircularCarousel.prototype.handleMouseEnter = function () {
    this.isPaused = true;
    this.stopAutoplay();
  };

  CircularCarousel.prototype.handleMouseLeave = function () {
    this.isPaused = false;
    if (!reducedMotion) {
      this.startAutoplay();
    }
  };

  CircularCarousel.prototype.startAutoplay = function () {
    if (this.isPaused || reducedMotion) return;
    var self = this;
    this.stopAutoplay();
    this.autoplayTimer = setInterval(function () {
      if (self.isPaused) return;
      self.next();
    }, 3000);
  };

  CircularCarousel.prototype.stopAutoplay = function () {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var carousels = document.querySelectorAll('.dh-carousel');
    carousels.forEach(function (el) {
      el.__circularInstance = new CircularCarousel(el);
    });
  });

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement.closest('.dh-track')) {
      var active = document.activeElement;
      var carousel = active && active.closest('.circular-carousel');
      if (!carousel) return;
      var instance = carousel.__circularInstance;
      if (!instance) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') instance.prev();
      else instance.next();
    }
  });
})();
