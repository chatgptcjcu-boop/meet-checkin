/**
 * 共用委員名單（630 評核委員會預設）
 * onsite-checkin、video-checkin 皆引用此檔。
 * 若 config/event.config.js 的 event.roster 有資料，會覆蓋 committee / observers。
 */

/** 每次會議出席名單：總會長之後固定五位（上層審閱顧問＋總會幹部） */
window.MANDATORY_OBSERVERS_AFTER_CHAIRMAN = [
  { name: '李豐楙', org: '中央研究院／政治大學', title: '院士；名譽講座教授', role: '專家顧問', attendance: '出席' },
  { name: '張珣', org: '中央研究院民族學研究所', title: '研究員兼前所長', role: '專家顧問', attendance: '出席' },
  { name: '林美容', org: '慈濟大學宗教與人文研究所', title: '教授', role: '專家顧問', attendance: '出席' },
  { name: '黃發保', org: '臺灣道法總會', title: '秘書長', role: '列席人員', attendance: '出席' },
  { name: '楊成林', org: '臺灣道法總會', title: '副秘書長', role: '列席人員', attendance: '出席' },
];

window.DEFAULT_CHAIRMAN_OBSERVER = {
  name: '陳瑞宏', org: '臺灣道法總會', title: '總會長', role: '列席人員', attendance: '出席',
};

/** 將 mandatory 五位插入總會長之後，並移除重複項；保留雲端名單既有 memberId */
window.mergeMandatoryObservers = function (observers) {
  var list = Array.isArray(observers) ? observers.slice() : [];
  var byName = {};
  list.forEach(function (m) { if (m && m.name) byName[m.name] = m; });
  var mandatoryNames = {};
  window.MANDATORY_OBSERVERS_AFTER_CHAIRMAN.forEach(function (m) { mandatoryNames[m.name] = true; });
  var chairman = null;
  var rest = [];
  list.forEach(function (m) {
    if (m.title === '總會長') chairman = m;
    else if (!mandatoryNames[m.name]) rest.push(m);
  });
  if (!chairman) chairman = Object.assign({}, window.DEFAULT_CHAIRMAN_OBSERVER);
  else if (!chairman.memberId && byName[chairman.name] && byName[chairman.name].memberId) {
    chairman = Object.assign({}, chairman, { memberId: byName[chairman.name].memberId });
  }
  var mandatory = window.MANDATORY_OBSERVERS_AFTER_CHAIRMAN.map(function (m) {
    var existing = byName[m.name];
    if (existing && existing.memberId) {
      return Object.assign({}, m, { memberId: existing.memberId });
    }
    return m;
  });
  return [chairman].concat(mandatory, rest);
};

window.MEMBER_ROSTER = {
  meetingTitle: '2026宮廟管理師職能基準 iCAP推動與職能導向課程發展',
  meetingDate: '115年6月30日',
  committee: [
    { name: '林清淇', org: '內政部宗教禮制司', title: '前司長', role: '召集委員', attendance: '出席' },
    { name: '吳永猛', org: '臺灣法教會／文化大學', title: '前理事長／前副校長', role: '評核委員', attendance: '視訊' },
    { name: '薄喬萍', org: '義守大學', title: '前院長', role: '評核委員', attendance: '出席' },
    { name: '李樑堅', org: '義守大學', title: '前副校長', role: '評核委員', attendance: '視訊' },
    { name: '鄭卜五', org: '高雄師範大學', title: '教授', role: '評核委員', attendance: '視訊' },
    { name: '鄭志明', org: '輔仁大學', title: '教授', role: '評核委員', attendance: '視訊' },
    { name: '陳美華', org: '台灣宗教學會', title: '前理事長', role: '評核委員', attendance: '出席' },
    { name: '高超文', org: '木柵指南宮', title: '主任委員', role: '評核委員', attendance: '出席' },
    { name: '鄭詠紜', org: '臺灣道法總會', title: '不分區會長', role: '評核委員', attendance: '出席' },
    { name: '王世任', org: '承天宮', title: '興建主任委員', role: '評核委員', attendance: '出席' },
    { name: '詹博雅', org: '凌霄寶殿武龍宮', title: '顧問', role: '評核委員', attendance: '出席' },
    { name: '郭昭廷', org: '開封宮包公廟', title: '前主任委員', role: '評核委員', attendance: '出席' },
    { name: '黃國彰', org: '中華關聖文化世界弘揚協會', title: '理事長', role: '評核委員', attendance: '出席' },
    { name: '黃志華', org: '五里林護天府', title: '主任委員', role: '評核委員', attendance: '出席' },
    { name: '蔡鴻祺', org: '中華世界全民念佛會', title: '會長', role: '評核委員', attendance: '出席' },
    { name: '洪家祥', org: '如魚得水顧問公司', title: '總經理', role: '評核委員', attendance: '請假' },
  ],
  observers: window.mergeMandatoryObservers([
    { name: '陳瑞宏', org: '臺灣道法總會', title: '總會長', role: '列席人員', attendance: '出席' },
    { name: '張聰明', org: '臺灣道法總會', title: '監事長', role: '列席人員', attendance: '出席' },
    { name: '陳昭良', org: '臺灣道法總會', title: '副監事長', role: '列席人員', attendance: '出席' },
    { name: '黃子瑜', org: '臺灣道法總會', title: '北區會長', role: '列席人員', attendance: '出席' },
    { name: '郭益富', org: '臺灣道法總會', title: '東區會長', role: '列席人員', attendance: '出席' },
    { name: '張祐倉', org: '臺灣道法總會', title: '主任委員', role: '列席人員', attendance: '出席' },
    { name: '王芯庭', org: '臺灣道法總會', title: '助理', role: '列席人員', attendance: '出席' },
  ]),
};

/** 現場出席者可點選名單簽到 */
window.isOnsiteMember = function (m) {
  return m.attendance === '出席';
};

/** 視訊出席者可點選名單簽到 */
window.isVideoMember = function (m) {
  return m.attendance === '視訊';
};

/** 其他現場人員（不在名單上）可選身份別 */
window.GUEST_ROLES = [
  '專家顧問',
  '專案工作人員',
  '列席人員',
  '觀摩來賓',
];

window.attendanceBadge = function (att) {
  if (att === '出席') return '<span class="badge badge-onsite">出席</span>';
  if (att === '請假') return '<span class="badge badge-leave">請假</span>';
  return '<span class="badge badge-video">視訊</span>';
};

/** 若 EVENT_CONFIG.event.roster 存在，覆蓋名單（須先載入 event.config.js） */
window.applyConfigRoster = function () {
  var cfg = window.EVENT_CONFIG;
  if (!cfg || !cfg.event || !cfg.event.roster) return;
  var r = cfg.event.roster;
  if (r.rosterGroupIds && (r.rosterGroupIds.committee || r.rosterGroupIds.observers)) {
    return;
  }
  window.MEMBER_ROSTER = {
    meetingTitle: r.meetingTitle || (cfg.event.tagline || window.MEMBER_ROSTER.meetingTitle),
    meetingDate: r.meetingDate || (cfg.event.dateRoc || window.MEMBER_ROSTER.meetingDate),
    committee: Array.isArray(r.committee) ? r.committee : window.MEMBER_ROSTER.committee,
    observers: window.mergeMandatoryObservers(
      Array.isArray(r.observers) ? r.observers : window.MEMBER_ROSTER.observers
    ),
  };
  if (cfg.signIn && cfg.signIn.guestRoles && cfg.signIn.guestRoles.length) {
    window.GUEST_ROLES = cfg.signIn.guestRoles.slice();
  }
};

/** 將 GAS roster 群組合併為簽到用 committee / observers */
window.applyRosterFromCloudData = function (data, rosterGroupIds) {
  var cfg = window.EVENT_CONFIG || {};
  var r = (cfg.event && cfg.event.roster) || {};
  var groups = data.groups || [];
  var members = data.members || [];
  var byGroup = {};
  members.forEach(function (m) {
    if (!byGroup[m.groupId]) byGroup[m.groupId] = [];
    byGroup[m.groupId].push(m);
  });

  function pickMembers(ids) {
    var list = [];
    (ids || []).forEach(function (gid) {
      var ms = (byGroup[gid] || []).slice().sort(function (a, b) {
        return (a.sortOrder || 0) - (b.sortOrder || 0);
      });
      ms.forEach(function (m) {
        list.push({
          memberId: m.memberId,
          name: m.name,
          org: m.org || '',
          title: m.title || '',
          role: m.role || '',
          attendance: m.attendance || '出席',
        });
      });
    });
    return list;
  }

  var committee = pickMembers(rosterGroupIds.committee);
  var observers = pickMembers(rosterGroupIds.observers);
  observers = window.mergeMandatoryObservers(observers);

  window.MEMBER_ROSTER = {
    meetingTitle: r.meetingTitle || (cfg.event && cfg.event.tagline) || window.MEMBER_ROSTER.meetingTitle,
    meetingDate: r.meetingDate || (cfg.event && cfg.event.dateRoc) || window.MEMBER_ROSTER.meetingDate,
    committee: committee.length ? committee : window.MEMBER_ROSTER.committee,
    observers: observers.length ? observers : window.MEMBER_ROSTER.observers,
  };
  if (cfg.signIn && cfg.signIn.guestRoles && cfg.signIn.guestRoles.length) {
    window.GUEST_ROLES = cfg.signIn.guestRoles.slice();
  }
};

/**
 * 若 preset 設有 rosterGroupIds，從 GAS GET ?action=roster 載入名單。
 * 失敗時保留 inline roster 或 members.js 預設（向後相容）。
 */
window.loadRosterFromCloud = function (callback) {
  var cfg = window.EVENT_CONFIG;
  if (!cfg || !cfg.event || !cfg.event.roster) {
    if (callback) callback(false);
    return Promise.resolve(false);
  }
  var rg = cfg.event.roster.rosterGroupIds;
  if (!rg || (!rg.committee && !rg.observers)) {
    if (callback) callback(false);
    return Promise.resolve(false);
  }
  var url = cfg.backend && cfg.backend.gasWebAppUrl;
  if (!url) {
    window.applyConfigRoster();
    if (callback) callback(false);
    return Promise.resolve(false);
  }

  return fetch(url + '?action=roster', { method: 'GET', cache: 'no-cache' })
    .then(function (res) { return res.json(); })
    .then(function (json) {
      if (!json || !json.ok) {
        window.applyConfigRoster();
        return false;
      }
      window.applyRosterFromCloudData(json, rg);
      return true;
    })
    .catch(function () {
      window.applyConfigRoster();
      return false;
    })
    .then(function (ok) {
      if (callback) callback(ok);
      return ok;
    });
};

/** 簽到頁初始化：先試雲端名單，再 renderList */
window.initCheckinRoster = function (renderFn) {
  window.applyConfigRoster();
  return window.loadRosterFromCloud(function () {
    if (typeof renderFn === 'function') renderFn();
  });
};

if (window.EVENT_CONFIG) {
  window.applyConfigRoster();
}
