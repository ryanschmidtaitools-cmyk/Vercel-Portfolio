(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function getCircularOffset(index, activeIndex, total) {
    var offset = index - activeIndex;
    var half = Math.floor(total / 2);
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

    this.init();
  }

  CircularCarousel.prototype.init = function () {
    var self = this;

    this.container.classList.add('circular-carousel');
    this.track.classList.add('circular-carousel__track');

    // --- aria-live region for slide announcements ---
    this.liveRegion = document.createElement('div');
    this.liveRegion.setAttribute('aria-live', 'polite');
    this.liveRegion.setAttribute('aria-atomic', 'true');
    this.liveRegion.className = 'carousel-live-region';
    this.liveRegion.style.cssText = 'position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;';
    this.container.appendChild(this.liveRegion);

    // --- pause/play button ---
    this.pauseBtn = document.createElement('button');
    this.pauseBtn.className = 'carousel-pause-btn';
    this.pauseBtn.setAttribute('aria-label', 'Pause slideshow');
    this.pauseBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>';
    this.container.appendChild(this.pauseBtn);

    this.pauseBtn.addEventListener('click', function () {
      if (self.isPaused) {
        self.isPaused = false;
        self.pauseBtn.setAttribute('aria-label', 'Pause slideshow');
        self.pauseBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><rect x="3" y="2" width="4" height="12" rx="1"/><rect x="9" y="2" width="4" height="12" rx="1"/></svg>';
        if (!reducedMotion) self.startAutoplay();
      } else {
        self.isPaused = true;
        self.pauseBtn.setAttribute('aria-label', 'Play slideshow');
        self.pauseBtn.innerHTML = '<svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2.5v11l9-5.5z"/></svg>';
        self.stopAutoplay();
      }
    });

    this.slides.forEach(function (slide, i) {
      slide.classList.add('circular-carousel__slide');
      slide.setAttribute('data-index', i);
      slide.setAttribute('tabindex', '0');
      slide.style.position = 'absolute';
      slide.style.top = '50%';
      slide.style.left = '50%';
      slide.style.margin = '0';
      slide.style.willChange = 'transform, opacity';
      slide.style.cursor = 'pointer';

      var media = slide.querySelector(':scope > img, :scope > video');
      if (media && !media.closest('.image-splitter')) {
        media.style.width = '100%';
        media.style.height = 'auto';
        media.style.display = 'block';
        media.style.borderRadius = 'var(--radius-lg, 18px)';
        media.style.pointerEvents = 'none';
      }

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.position = 'absolute';
        figcaption.style.bottom = '-2.25rem';
        figcaption.style.left = '0';
        figcaption.style.right = '0';
        figcaption.style.textAlign = 'center';
        figcaption.style.fontSize = 'var(--fs-sm)';
        figcaption.style.color = 'var(--text-secondary)';
        figcaption.style.pointerEvents = 'none';
        figcaption.style.transition = 'opacity 0.4s ease';
      }

      slide.addEventListener('click', function () {
        self.handleSlideClick(i);
      });
    });

    this.container.addEventListener('mouseenter', function () {
      self.isPaused = true;
      self.stopAutoplay();
    });

    this.container.addEventListener('mouseleave', function () {
      self.isPaused = false;
      if (!reducedMotion) self.startAutoplay();
    });

    // Swipe support
    this.container.style.touchAction = 'pan-y';
    var swipeStartX = 0;
    this.container.addEventListener('pointerdown', function (e) {
      swipeStartX = e.clientX;
    });
    this.container.addEventListener('pointerup', function (e) {
      var dx = e.clientX - swipeStartX;
      if (Math.abs(dx) > 30) {
        if (dx < 0) self.next();
        else self.prev();
      }
    });

    this.render();

    if (!reducedMotion) {
      this.startAutoplay();
    }
  };

  CircularCarousel.prototype.getTransform = function (offset) {
    var abs = Math.abs(offset);
    var spacing = Math.min(220, window.innerWidth * 0.14);
    var x = offset * spacing;
    var scale = Math.max(0.35, 1 - abs * 0.2);
    var opacity = Math.max(0.08, 1 - abs * 0.25);
    var zIndex = Math.round(30 - abs * 7);
    return { x: x, scale: scale, opacity: opacity, zIndex: zIndex };
  };

  CircularCarousel.prototype.render = function () {
    var self = this;
    this.slides.forEach(function (slide, i) {
      var offset = getCircularOffset(i, self.activeIndex, self.total);
      var t = self.getTransform(offset);

      slide.style.transform = 'translateX(' + t.x + 'px) translateY(-50%) scale(' + t.scale + ')';
      slide.style.opacity = t.opacity;
      slide.style.zIndex = t.zIndex;
      slide.style.pointerEvents = offset === 0 ? 'auto' : 'pointer';
      slide.classList.toggle('circular-carousel__slide--active', offset === 0);

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.opacity = offset === 0 ? '1' : '0';
      }
    });

    // Announce the active slide
    var activeSlide = this.slides[this.activeIndex];
    var slideLabel = activeSlide ? activeSlide.querySelector('figcaption') : null;
    var announcement = 'Slide ' + (this.activeIndex + 1) + ' of ' + this.total;
    if (slideLabel) {
      announcement += ': ' + slideLabel.textContent.trim();
    }
    if (this.liveRegion) {
      this.liveRegion.textContent = announcement;
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
    }, 650);
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

  CircularCarousel.prototype.startAutoplay = function () {
    if (this.isPaused || reducedMotion) return;
    var self = this;
    this.stopAutoplay();
    this.autoplayTimer = setInterval(function () {
      self.next();
    }, 3500);
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
    if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && document.activeElement.closest('.circular-carousel')) {
      var carousel = document.activeElement.closest('.circular-carousel');
      var instance = carousel && carousel.__circularInstance;
      if (!instance) return;
      e.preventDefault();
      if (e.key === 'ArrowLeft') instance.prev();
      else instance.next();
    }
  });
})();
