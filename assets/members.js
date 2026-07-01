/**
 * 宮廟管理師第一次評核委員會 — 共用委員名單
 * onsite-checkin-legacy、video-checkin 皆引用此檔，勿分開維護。
 */
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
  observers: [
    { name: '陳瑞宏', org: '臺灣道法總會', title: '總會長', role: '列席人員', attendance: '出席' },
    { name: '張聰明', org: '臺灣道法總會', title: '監事長', role: '列席人員', attendance: '出席' },
    { name: '陳昭良', org: '臺灣道法總會', title: '副監事長', role: '列席人員', attendance: '出席' },
    { name: '黃子瑜', org: '臺灣道法總會', title: '北區會長', role: '列席人員', attendance: '出席' },
    { name: '郭益富', org: '臺灣道法總會', title: '東區會長', role: '列席人員', attendance: '出席' },
    { name: '張祐倉', org: '臺灣道法總會', title: '主任委員', role: '列席人員', attendance: '出席' },
    { name: '黃發保', org: '臺灣道法總會', title: '秘書長', role: '列席人員', attendance: '出席' },
    { name: '楊成林', org: '臺灣道法總會', title: '副秘書長', role: '列席人員', attendance: '出席' },
    { name: '王芯庭', org: '臺灣道法總會', title: '助理', role: '列席人員', attendance: '出席' },
  ],
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
