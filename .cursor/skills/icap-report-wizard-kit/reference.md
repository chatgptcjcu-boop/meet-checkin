# icap-report-wizard-kit — reference

詳細複製檢查表、試算表 schema、檔案樹。主 SKILL 見 [SKILL.md](SKILL.md)。

---

## 檔案樹（參考實作）

```
training/icap-planning-report-wizard/
├── ASSET-PACK.md                          # 資產包清單（對外說明）
├── index.html                             # 模組入口（連簡報、學習單、儀表板）
├── report-wizard-slideshow.html           # 18 頁 meeting-display 投影
├── templates/                             # 複製用 stub
│   ├── config-snippet.json
│   ├── gas-handler-snippet.gs
│   └── customization-checklist.md
└── worksheets/
    ├── index.html                         # 學習單 hub
    ├── instructor-worksheet-online.html   # ★ 線上整合提交
    ├── report-wizard-submit.js            # GAS POST 邏輯
    ├── worksheet-shared.css               # 分段頁共用樣式
    ├── section-01-course-info.html        # 壹、課程資訊（列印）
    ├── section-02-analysis.html           # 表1–2
    ├── section-03-design.html             # 表3–5
    ├── section-04-resources.html          # 表6–8
    └── section-05-implementation.html     # 表9–12

gas/Code.gs                                # handleReportWizardWorksheet（共用後端）
config/event.config.json                   # icapReportWorksheet + backend.gasWebAppUrl
config/event.config.js                     # sync-config 產物（前端載入）
dashboard.html                             # quick-links 訓練模組入口
assets/meeting-display.css                 # 簡報共用主題
assets/meeting-display.js                  # MeetingDisplay.init
```

---

## 簡報投影片對照（18 頁）

| # | label（MeetingDisplay） | 內容概要 |
|---|-------------------------|----------|
| 1 | 封面 | 計畫名、報告書標題 |
| 2 | 如何使用 | 精靈導覽說明 |
| 3 | 報告書總地圖 | ADDIE × 報告書結構 |
| 4 | 封面申請欄位 | 案號、日期、單位 |
| 5 | 職能依據與類型 | 職能基準、課程類型 |
| 6 | 壹課程資訊總覽 | 章節導覽 |
| 7 | 需求簡介目的 | 1000 字欄位提示 |
| 8 | 時數級別對象 | 時數、級別、對象、先備 |
| 9 | 表1 職能表 | T/P/K/S |
| 10 | 表2 課程地圖 | 單元脈絡 |
| 11 | 表3 教學目標 | ABCD |
| 12 | 表4-5 內容方法 | 單元、教法 |
| 13 | 表6-8 資源師資評量 | 三角檢核 |
| 14 | 表9-12 實施評估 | I·E 階段 |
| 15 | 參佐證ADDIE | 佐證對照 |
| 16 | 利益關係人 | 參與紀錄 |
| 17 | 地雷Checklist | 交件前自查 |
| 18 | 結語下一步 | iCAP 平台核對 |

CSS 路徑（自 `training/icap-planning-report-wizard/`）：`../../assets/meeting-display.css`

---

## Google 試算表 schema — `icap-report-worksheet`

**分頁名：** `icap-report-worksheet`（GAS 常數 `REPORT_WIZARD_SHEET_NAME`）

**標題列（首次提交自動建立）：**

| 欄序 | 欄名 | 來源 |
|------|------|------|
| 1 | 提交時間 | `formatTaiwanTime_(timestamp)` |
| 2 | 身份 | `data.role`（預設「講師」） |
| 3–32 | 見下表 `REPORT_WIZARD_FIELD_KEYS` | `data.fields[key]` |
| 33 | 頁面URL | `data.pageUrl` |
| 34 | 結構化答案JSON | `JSON.stringify(data.answers)` |

### REPORT_WIZARD_FIELD_KEYS（與前端 fields 鍵名一致）

```
講師姓名, 服務單位, 課程名稱,
訓練需求, 課程簡介, 課程目的,
課程時數, 職能級別, 主要對象, 先備條件,
表1_職能任務, 表1_行為指標P, 表1_知識技能,
表2_課程地圖,
表3_A對象, 表3_B行為, 表3_C條件, 表3_D標準, 表3_對應職能,
表4_單元內容, 表5_教學方法,
表6_教材資源, 表7_師資安排, 表8_評量方式,
表9_執行人員, 表10_試辦成果, 表11_學習證據, 表12_結訓標準,
填寫章節, 簽名日期
```

### 線上表單 input id → fields 鍵名（report-wizard-submit.js）

| input id | fields 鍵 |
|----------|-----------|
| coverName / fieldName | 講師姓名 |
| coverOrg / fieldOrg | 服務單位 |
| courseName | 課程名稱 |
| trainingNeed | 訓練需求 |
| courseIntro | 課程簡介 |
| coursePurpose | 課程目的 |
| courseHours | 課程時數 |
| competencyLevel | 職能級別 |
| targetAudience | 主要對象 |
| prerequisites | 先備條件 |
| t1Task, t1Performance, t1Knowledge | 表1_* |
| t2CourseMap | 表2_課程地圖 |
| t3A–t3D, t3Competency | 表3_* |
| t4Content | 表4_單元內容 |
| t5Methods (checkbox) / t5MethodsText | 表5_教學方法 |
| t6Resources–t12Graduation | 表6–12 |
| body dataset.section | 填寫章節 |
| signDate | 簽名日期 |

---

## GAS 程式位置（gas/Code.gs）

| 項目 | 約略行號 | 符號 |
|------|----------|------|
| 分頁常數 | 50 | `REPORT_WIZARD_SHEET_NAME` |
| 欄位鍵陣列 | 87–99 | `REPORT_WIZARD_FIELD_KEYS` |
| doPost 路由 | 121–122 | `action === 'icap-report-worksheet'` |
| Handler | 294–318 | `handleReportWizardWorksheet` |
| 測試函式 | 1321–1337 | `testReportWizardWorksheet` |

> 行號隨 repo 演進可能偏移；以符號名搜尋為準。

---

## event.config.json — icapReportWorksheet

```json
"icapReportWorksheet": {
  "formType": "icap-report-worksheet",
  "sheetTab": "icap-report-worksheet",
  "dateFilePrefix": "icap-report",
  "onlineFormPath": "training/icap-planning-report-wizard/worksheets/instructor-worksheet-online.html"
}
```

另需同檔：

```json
"backend": {
  "gasWebAppUrl": "https://script.google.com/macros/s/…/exec"
}
```

HTML 需載入 config（與 meet-checkin 其他表單相同）：

```html
<script src="../../config/event.config.js"></script>
```

（路徑深度依 HTML 位置調整 `../` 層數。）

---

## 複製檢查表（完整）

### Phase A — 內容

- [ ] 複製 `training/icap-planning-report-wizard/` 整包
- [ ] 替換主辦單位、計畫名稱（index、slideshow 封面）
- [ ] 替換預設課程名稱（instructor-worksheet-online.html）
- [ ] 審閱 18 頁簡報文案是否符合在地 ODT 格式
- [ ] 更新 `MeetingDisplay.init` labels 與 slide 數一致
- [ ] 分段 section 頁「對應簡報第 N 頁」連結正確

### Phase B — 後端

- [ ] 新建或指定 Google 試算表
- [ ] 試算表 → Apps Script 貼上含 handler 的 Code.gs
- [ ] `SPREADSHEET_ID` 留空（建議）或填正確 ID
- [ ] 執行 `testReportWizardWorksheet` → `{"ok":true}`
- [ ] Web App 部署：執行身分「我」、存取「任何人」
- [ ] 複製 `/exec` URL 至 `backend.gasWebAppUrl`

### Phase C — 前端整合

- [ ] `icapReportWorksheet` 區塊寫入 preset / event.config.json
- [ ] `node scripts/sync-config.js`
- [ ] 確認 instructor HTML 載入 `event.config.js`
- [ ] `report-wizard-submit.js?v=` bump（若改 JS）
- [ ] dashboard.html 加入模組連結

### Phase D — 部署驗收

- [ ] repo 根目錄有 `.nojekyll`
- [ ] push GitHub Pages → 硬刷新
- [ ] 開啟 slideshow → CSS 正常、←→ 切頁
- [ ] 線上學習單提交一筆 → 試算表新列
- [ ] 列印 PDF 流程正常

### Phase E — 可選 registry

- [ ] `events-registry.json` 某 event `links` 加訓練模組路徑（非 active 綁定）
- [ ] 對外 README / 推廣頁列出公開 URL

---

## 對外 URL 範本（meet-checkin）

Base: `https://chatgptcjcu-boop.github.io/meet-checkin`

| 資產 | 路徑 |
|------|------|
| 模組入口 | `/training/icap-planning-report-wizard/index.html` |
| 投影簡報 | `/training/icap-planning-report-wizard/report-wizard-slideshow.html` |
| 線上學習單 | `/training/icap-planning-report-wizard/worksheets/instructor-worksheet-online.html` |
| 學習單索引 | `/training/icap-planning-report-wizard/worksheets/index.html` |

Fork 後替換 `<user>.github.io/<repo>/` 前綴。

---

## 與 iCAP 平台申請的差異（文案標準）

- 本模組對齊 **勞動部 ODT「職能導向課程規劃與執行報告書」** 紙本／檔案格式。
- **iCAP 課程認證** 請以職能發展應用平台線上欄位為準；內容應一致，欄位名稱與上傳介面可能不同。
- 簡報第 17 頁 Checklist、模組 index 的 alert 區塊須保留此差異說明。
