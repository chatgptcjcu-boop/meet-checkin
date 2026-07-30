/**
 * 依台灣日期選擇簽到活動設定。
 * 一般 QR 不帶參數，會自動選擇當日 dateIso 相符的活動；
 * 主辦測試時可使用 ?event=1150730-editorial 覆寫日期。
 */
(function (global) {
  'use strict';

  /* 以本檔所在 config/ 目錄為基準，避免 root、onsite-checkin、投影頁的相對路徑不同。 */
  var scriptUrl = global.document && global.document.currentScript ? global.document.currentScript.src : '';
  var configBaseUrl = scriptUrl ? new URL('.', scriptUrl).toString() : '';

  var EVENTS = [
    { presetId: '1150630-evaluation', dateIso: '2026-06-30', path: 'events/1150630-evaluation.json' },
    { presetId: '1150730-editorial', dateIso: '2026-07-30', path: 'events/1150730-editorial.json' },
    { presetId: '1150830-evaluation', dateIso: '2026-08-30', path: 'events/1150830-evaluation.json' },
    { presetId: '1151018-editorial', dateIso: '2026-10-18', path: 'events/1151018-editorial.json' },
    { presetId: '1151025-evaluation', dateIso: '2026-10-25', path: 'events/1151025-evaluation.json' },
    { presetId: '1151115-editorial', dateIso: '2026-11-15', path: 'events/1151115-editorial.json' },
    { presetId: '1151129-evaluation', dateIso: '2026-11-29', path: 'events/1151129-evaluation.json' },
    { presetId: '1151220-editorial', dateIso: '2026-12-20', path: 'events/1151220-editorial.json' }
  ];

  function taiwanDateIso() {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());
    var values = {};
    parts.forEach(function (part) { values[part.type] = part.value; });
    return values.year + '-' + values.month + '-' + values.day;
  }

  function requestedPresetId() {
    return new URLSearchParams(global.location.search).get('event') || '';
  }

  function chooseEvent(options) {
    options = options || {};
    var presetId = options.presetId || requestedPresetId();
    var dateIso = options.dateIso || taiwanDateIso();
    var event = EVENTS.filter(function (item) {
      return presetId ? item.presetId === presetId : item.dateIso === dateIso;
    })[0];
    return { event: event || null, dateIso: dateIso, overridden: !!presetId };
  }

  function resolve(options) {
    var choice = chooseEvent(options);
    if (!choice.event) {
      return Promise.resolve({ ok: false, dateIso: choice.dateIso, reason: 'no-event' });
    }
    var configUrl = configBaseUrl ? new URL(choice.event.path, configBaseUrl).toString() : choice.event.path;
    return fetch(configUrl, { cache: 'no-cache' })
      .then(function (response) {
        if (!response.ok) throw new Error('活動設定讀取失敗');
        return response.json();
      })
      .then(function (config) {
        global.EVENT_CONFIG = config;
        return {
          ok: true,
          dateIso: choice.dateIso,
          presetId: choice.event.presetId,
          overridden: choice.overridden
        };
      });
  }

  global.MeetCheckinEventResolver = {
    resolve: resolve,
    findByDate: function (dateIso) {
      return EVENTS.filter(function (item) { return item.dateIso === dateIso; })[0] || null;
    },
    taiwanDateIso: taiwanDateIso,
    events: EVENTS.slice()
  };
})(window);
