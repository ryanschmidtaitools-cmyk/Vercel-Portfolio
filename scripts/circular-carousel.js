(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function HorizontalCarousel(container) {
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

  HorizontalCarousel.prototype.init = function () {
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
      slide.style.cursor = 'pointer';

      var media = slide.querySelector(':scope > img, :scope > video');
      if (media && !media.closest('.image-splitter')) {
        media.style.pointerEvents = 'none';
        media.style.width = '100%';
        media.style.height = 'auto';
      }

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.position = 'absolute';
        figcaption.style.bottom = '2rem';
        figcaption.style.left = '0';
        figcaption.style.right = '0';
        figcaption.style.textAlign = 'center';
        figcaption.style.fontSize = 'var(--fs-sm)';
        figcaption.style.color = 'var(--text-secondary)';
        figcaption.style.padding = '0 var(--space-6)';
        figcaption.style.pointerEvents = 'none';
        figcaption.style.transition = 'opacity 0.4s ease';
        figcaption.style.border = 'none';
        figcaption.style.background = 'transparent';
        figcaption.style.boxShadow = 'none';
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
      if (Math.abs(dx) > 50) {
        if (dx < 0) self.next();
        else self.prev();
      }
    });

    this.render();

    if (!reducedMotion) {
      this.startAutoplay();
    }
  };

  HorizontalCarousel.prototype.render = function () {
    var self = this;
    var translateX = -(this.activeIndex * 100);
    
    this.track.style.transition = reducedMotion ? 'none' : 'transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    this.track.style.transform = 'translateX(' + translateX + '%)';

    this.slides.forEach(function (slide, i) {
      slide.classList.toggle('circular-carousel__slide--active', i === self.activeIndex);
      slide.style.pointerEvents = i === self.activeIndex ? 'auto' : 'pointer';

      var figcaption = slide.querySelector('figcaption');
      if (figcaption) {
        figcaption.style.opacity = i === self.activeIndex ? '1' : '0';
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

  HorizontalCarousel.prototype.goTo = function (index) {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.activeIndex = (index + this.total) % this.total;
    this.render();
    var self = this;
    setTimeout(function () {
      self.isTransitioning = false;
    }, 650);
  };

  HorizontalCarousel.prototype.next = function () {
    this.goTo(this.activeIndex + 1);
  };

  HorizontalCarousel.prototype.prev = function () {
    this.goTo(this.activeIndex - 1);
  };

  HorizontalCarousel.prototype.handleSlideClick = function (index) {
    if (index === this.activeIndex) return;
    this.goTo(index);
  };

  HorizontalCarousel.prototype.startAutoplay = function () {
    if (this.isPaused || reducedMotion) return;
    var self = this;
    this.stopAutoplay();
    this.autoplayTimer = setInterval(function () {
      self.next();
    }, 4000);
  };

  HorizontalCarousel.prototype.stopAutoplay = function () {
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var carousels = document.querySelectorAll('.dh-carousel');
    carousels.forEach(function (el) {
      el.__circularInstance = new HorizontalCarousel(el);
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
