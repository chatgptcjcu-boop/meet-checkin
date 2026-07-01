/**
 * 會議投影簡報控制器｜一頁一投影片，同 meeting-display.html 架構
 * 用法：MeetingDisplay.init({ labels, onShow, hotkeys })
 */
(function (global) {
  'use strict';

  function init(options) {
    options = options || {};
    const slides = Array.from(document.querySelectorAll('.slide'));
    const select = document.getElementById('slideSelect');
    const counter = document.getElementById('counter');
    const counterCtrl = document.getElementById('counterCtrl');
    const labels = options.labels || [];
    let idx = 0;

    if (!slides.length || !select) return;

    slides.forEach(function (s, i) {
      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = (i + 1) + '. ' + (labels[i] || s.dataset.id || 'Slide ' + (i + 1));
      select.appendChild(opt);
    });

    function show(i) {
      idx = Math.max(0, Math.min(slides.length - 1, i));
      slides.forEach(function (s, j) {
        s.classList.toggle('active', j === idx);
      });
      select.value = idx;
      const t = (idx + 1) + ' / ' + slides.length;
      if (counter) counter.textContent = t;
      if (counterCtrl) counterCtrl.textContent = t;
      if (typeof options.onShow === 'function') {
        options.onShow(idx, slides);
      }
    }

    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnFs = document.getElementById('btnFs');

    if (btnPrev) btnPrev.onclick = function () { show(idx - 1); };
    if (btnNext) btnNext.onclick = function () { show(idx + 1); };
    select.onchange = function () { show(Number(select.value)); };
    if (btnFs) {
      btnFs.onclick = function () {
        document.documentElement.requestFullscreen?.();
      };
    }

    document.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        e.preventDefault();
        show(idx + 1);
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        e.preventDefault();
        show(idx - 1);
      } else if (e.key === 'Home') {
        show(0);
      } else if (e.key === 'End') {
        show(slides.length - 1);
      } else if (options.hotkeys && Object.prototype.hasOwnProperty.call(options.hotkeys, e.key)) {
        show(options.hotkeys[e.key]);
      } else if (e.key >= '1' && e.key <= '9' && options.numberKeys !== false) {
        const n = Number(e.key) - 1;
        if (n < slides.length) show(n);
      }
    });

    show(0);
  }

  global.MeetingDisplay = { init: init };
})(window);
