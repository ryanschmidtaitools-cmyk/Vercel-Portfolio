(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function ImageSplitter(container) {
    this.container = container;
    this.viewport = container.querySelector('.splitter-viewport');
    this.after = container.querySelector('.splitter-after');
    this.handle = container.querySelector('.splitter-handle');
    if (!this.viewport || !this.after || !this.handle) return;

    this.isDragging = false;
    this.position = parseFloat(container.getAttribute('data-splitter-initial')) || 50;

    this.init();
  }

  ImageSplitter.prototype.init = function () {
    var self = this;

    this.container.classList.add('splitter-initialized');

    this.update(this.position);

    this.handle.addEventListener('mousedown', function (e) {
      e.preventDefault();
      self.isDragging = true;
      self.container.classList.add('is-dragging');
    });

    document.addEventListener('mousemove', function (e) {
      if (!self.isDragging) return;
      self.onPointerMove(e.clientX);
    });

    document.addEventListener('mouseup', function () {
      if (self.isDragging) {
        self.isDragging = false;
        self.container.classList.remove('is-dragging');
      }
    });

    this.handle.addEventListener('touchstart', function (e) {
      self.isDragging = true;
      self.container.classList.add('is-dragging');
    }, { passive: true });

    document.addEventListener('touchmove', function (e) {
      if (!self.isDragging) return;
      self.onPointerMove(e.touches[0].clientX);
    }, { passive: true });

    document.addEventListener('touchend', function () {
      if (self.isDragging) {
        self.isDragging = false;
        self.container.classList.remove('is-dragging');
      }
    });

    this.handle.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        var step = e.key === 'ArrowLeft' ? -2 : 2;
        self.update(Math.max(0, Math.min(100, self.position + step)));
      }
    });
  };

  ImageSplitter.prototype.onPointerMove = function (clientX) {
    var rect = this.viewport.getBoundingClientRect();
    var x = clientX - rect.left;
    var percent = (x / rect.width) * 100;
    percent = Math.max(0, Math.min(100, percent));
    this.update(percent);
  };

  ImageSplitter.prototype.update = function (percent) {
    this.position = percent;

    if (reducedMotion) {
      this.after.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
      this.handle.style.transform = 'translateX(-50%)';
      this.handle.style.left = percent + '%';
    } else {
      this.after.style.clipPath = 'inset(0 0 0 ' + percent + '%)';
      this.handle.style.left = percent + '%';
    }
  };

  document.addEventListener('DOMContentLoaded', function () {
    var splitters = document.querySelectorAll('[data-splitter]');
    splitters.forEach(function (el) {
      new ImageSplitter(el);
    });
  });
})();
