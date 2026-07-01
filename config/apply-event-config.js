/**
 * meet-checkin-kit — 讀取 window.EVENT_CONFIG 並套用至 data-event 元素
 * 使用前請先載入 config/event.config.js
 */
(function (global) {
  'use strict';

  function getEventConfig() {
    return global.EVENT_CONFIG || {};
  }

  function getByPath(obj, path) {
    if (!path) return undefined;
    return path.split('.').reduce(function (cur, key) {
      return cur && cur[key] !== undefined ? cur[key] : undefined;
    }, obj);
  }

  function contactDisplay(cfg) {
    var c = cfg.contact || {};
    var parts = [];
    if (c.name) parts.push(c.name);
    if (c.phone) parts.push(c.phone);
    return parts.join(' ');
  }

  function contactLine(cfg) {
    var c = cfg.contact || {};
    var ch = c.channel || 'Line';
    return ch + ' 傳給 ' + contactDisplay(cfg);
  }

  function buildPdfFilename(formType, memberName, dateStr) {
    var cfg = getEventConfig();
    var prefix = (cfg.event && cfg.event.dateFilePrefix) || 'event';
    return prefix + '_填答_' + formType + '_' + memberName + '_' + dateStr + '.pdf';
  }

  function applyDataEventBindings(root) {
    var cfg = getEventConfig();
    var scope = root || document;
    scope.querySelectorAll('[data-event]').forEach(function (el) {
      var key = el.getAttribute('data-event');
      var val = getByPath(cfg, key);
      if (val === undefined || val === null) return;
      if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
        el.value = val;
      } else if (el.tagName === 'A' && (key === 'meet.url' || key.endsWith('.url'))) {
        el.href = val;
      } else {
        el.textContent = val;
      }
    });
    scope.querySelectorAll('[data-event-html]').forEach(function (el) {
      var key = el.getAttribute('data-event-html');
      var val = getByPath(cfg, key);
      if (val !== undefined && val !== null) el.innerHTML = val;
    });
    scope.querySelectorAll('[data-event-contact]').forEach(function (el) {
      el.textContent = contactDisplay(cfg);
    });
    scope.querySelectorAll('[data-event-contact-line]').forEach(function (el) {
      el.textContent = contactLine(cfg);
    });
  }

  function applyDocumentMeta() {
    var cfg = getEventConfig();
    var seo = cfg.seo || {};
    if (seo.checkInPageTitle) document.title = seo.checkInPageTitle;
    function setMeta(prop, content) {
      if (!content) return;
      var el = document.querySelector('meta[property="' + prop + '"]');
      if (el) el.setAttribute('content', content);
    }
    setMeta('og:title', seo.ogTitle);
    setMeta('og:description', seo.ogDescription);
  }

  function populateRoleSelect(selectId) {
    var cfg = getEventConfig();
    var sel = document.getElementById(selectId);
    if (!sel || !cfg.signIn || !cfg.signIn.roles) return;
    var placeholder = sel.querySelector('option[disabled]');
    sel.innerHTML = '';
    if (placeholder) sel.appendChild(placeholder);
    else {
      var ph = document.createElement('option');
      ph.value = '';
      ph.disabled = true;
      ph.selected = true;
      ph.textContent = '請選擇您的身份';
      sel.appendChild(ph);
    }
    cfg.signIn.roles.forEach(function (role) {
      var opt = document.createElement('option');
      opt.value = role;
      opt.textContent = role;
      sel.appendChild(opt);
    });
  }

  function initEventConfig(options) {
    options = options || {};
    if (options.meta !== false) applyDocumentMeta();
    applyDataEventBindings(document);
    if (options.roleSelectId) populateRoleSelect(options.roleSelectId);
  }

  global.MeetCheckinConfig = {
    get: getEventConfig,
    getByPath: function (path) {
      return getByPath(getEventConfig(), path);
    },
    contactDisplay: function () {
      return contactDisplay(getEventConfig());
    },
    contactLine: function () {
      return contactLine(getEventConfig());
    },
    buildPdfFilename: buildPdfFilename,
    apply: applyDataEventBindings,
    init: initEventConfig,
  };
})(typeof window !== 'undefined' ? window : globalThis);
