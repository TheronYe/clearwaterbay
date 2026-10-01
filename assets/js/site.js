(function () {
  'use strict';

  /**
   * 33 Clear Water Bay — 全站交互层。
   * 职责：移动菜单、主视觉视频自适应、区段入场动画、法律/私隐弹窗。
   * 约束（流程文档 §11.4 / §11.8）：
   * - 弹窗只切换 hidden 状态，绝不从 DOM 移除，且必须可真实滚动、可重开；
   * - 所有动画仅在 prefers-reduced-motion: no-preference 时启用；
   * - 不观察会改变自身尺寸的动画主体，避免 IntersectionObserver 反复触发。
   */

  var doc = document;
  var reduceMotionMQ = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  var reducedMotion = reduceMotionMQ ? reduceMotionMQ.matches : false;

  /* ---------- 1. 头部滚动状态 ---------- */
  (function initHeader() {
    var header = doc.querySelector('[data-header]');
    if (!header) return;
    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 24);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  })();

  /* ---------- 2. 移动菜单（可开、可关、面板内可滚动） ---------- */
  (function initMenu() {
    var toggle = doc.querySelector('[data-menu-toggle]');
    var menu = doc.getElementById('mobile-menu');
    if (!toggle || !menu) return;

    var open = false;
    function setOpen(next) {
      open = next;
      menu.hidden = !next;
      doc.body.classList.toggle('menu-open', next);
      toggle.setAttribute('aria-expanded', String(next));
      toggle.classList.toggle('is-open', next);
      var label = next
        ? toggle.getAttribute('data-label-close')
        : toggle.getAttribute('data-label-open');
      if (label) toggle.setAttribute('aria-label', label);
      if (next) {
        var first = menu.querySelector('a[href], button');
        if (first) first.focus();
      }
    }

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!open);
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a[href]')) setOpen(false);
    });
    doc.addEventListener('click', function (e) {
      if (open && !menu.contains(e.target) && !toggle.contains(e.target)) setOpen(false);
    });
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && open) {
        setOpen(false);
        toggle.focus();
      }
    });
  })();

  /* ---------- 3. 主视觉视频：桌面 / 平板 / 手机三档自适应（官方站同款规则） ---------- */
  (function initHeroVideo() {
    var video = doc.querySelector('.hero-video');
    if (!video) return;

    var desktop = video.getAttribute('data-video-desktop');
    var tablet = video.getAttribute('data-video-tablet');
    var mobile = video.getAttribute('data-video-mobile');
    if (!desktop && !tablet && !mobile) return;

    var current = '';
    function variant() {
      var w = window.innerWidth;
      var h = window.innerHeight;
      if (w >= h) return 'desktop';
      if (w <= 767) return 'mobile';
      return 'tablet';
    }
    function apply() {
      if (reducedMotion) return; // 用户偏好减少动效：仅显示封面图，不播放
      var next = variant();
      var src = next === 'desktop' ? desktop : next === 'mobile' ? mobile : (tablet || desktop);
      if (!src || next === current) return;
      current = next;
      video.src = src;
      video.load();
      var play = video.play();
      if (play && typeof play.catch === 'function') play.catch(function () {});
    }

    apply();
    var timer = 0;
    window.addEventListener('resize', function () {
      window.clearTimeout(timer);
      timer = window.setTimeout(apply, 150);
    });
    window.addEventListener('orientationchange', apply);

    // 滚出视口即暂停，节省资源
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(
        function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              if (!reducedMotion) {
                var p = video.play();
                if (p && typeof p.catch === 'function') p.catch(function () {});
              }
            } else if (video.pause) {
              video.pause();
            }
          });
        },
        { threshold: 0.02 }
      ).observe(video);
    }
  })();

  /* ---------- 4. 区段入场动画（离开视口移除状态，重入可重播） ---------- */
  (function initReveal() {
    var items = doc.querySelectorAll('[data-reveal]');
    if (!items.length) return;

    if (!('IntersectionObserver' in window) || reducedMotion) {
      for (var i = 0; i < items.length; i++) items[i].classList.add('in-view');
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (en) {
          if (en.isIntersecting) en.target.classList.add('in-view');
          else en.target.classList.remove('in-view');
        });
      },
      { threshold: 0.16, rootMargin: '0px 0px -4% 0px' }
    );
    for (var j = 0; j < items.length; j++) io.observe(items[j]);
  })();

  /* ---------- 5. 弹窗：保留 DOM、可真实滚动、可重开（§11.4） ---------- */
  (function initModals() {
    var FOCUSABLE = 'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';
    var current = null;
    var lastFocus = null;

    function open(modal, opener) {
      if (current) close(current, true);
      current = modal;
      lastFocus = opener || doc.activeElement;
      modal.hidden = false;
      doc.body.classList.add('modal-open');
      void modal.offsetWidth; // 强制回流，让入场过渡生效
      modal.classList.add('is-open');
      var first = modal.querySelector(FOCUSABLE);
      if (first) first.focus();
    }

    function close(modal, silent) {
      if (!modal) return;
      modal.classList.remove('is-open');
      modal.hidden = true;
      if (current === modal) {
        current = null;
        doc.body.classList.remove('modal-open');
        if (!silent && lastFocus && typeof lastFocus.focus === 'function') lastFocus.focus();
        lastFocus = null;
      }
    }

    var openers = doc.querySelectorAll('[data-modal-open]');
    for (var i = 0; i < openers.length; i++) {
      openers[i].addEventListener('click', function () {
        var id = this.getAttribute('data-modal-open');
        var modal = doc.getElementById('modal-' + id);
        if (modal) open(modal, this);
      });
    }

    doc.addEventListener('click', function (e) {
      if (!current) return;
      if (e.target.closest('[data-modal-close]')) {
        close(current);
        return;
      }
      if (e.target === current) close(current); // 点击遮罩关闭
    });

    doc.addEventListener('keydown', function (e) {
      if (!current) return;
      if (e.key === 'Escape') {
        close(current);
        return;
      }
      if (e.key === 'Tab') {
        var list = Array.prototype.slice
          .call(current.querySelectorAll(FOCUSABLE))
          .filter(function (el) { return el.offsetParent !== null; });
        if (!list.length) return;
        var firstEl = list[0];
        var lastEl = list[list.length - 1];
        if (e.shiftKey && doc.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        } else if (!e.shiftKey && doc.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    });
  })();
})();
