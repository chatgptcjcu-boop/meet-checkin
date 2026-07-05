# iCAP Report Wizard — Asset Pack

可複製、可推廣的 **報告書格式精靈** 訓練模組資產包清單。技術複製見 `.cursor/skills/icap-report-wizard-kit/`。

---

## 套件內容

| 類別 | 檔案 | 說明 |
|------|------|------|
| **入口** | `index.html` | 模組首頁、使用流程、結構速覽 |
| **參考教材** | `reference/` | 勞動部 ODT 公版格式、縮圖、`source-metadata.json` 溯源 |
| **投影** | `report-wizard-slideshow.html` | 24 頁 meeting-display 簡報（含金綠主題、表1 寫作引導） |
| **學習單 hub** | `worksheets/index.html` | 分段 + 整合入口 |
| **沉浸式走讀** | `worksheets/table1`～`table5-*-walkthrough.html` | 上課逐段講解／現場練習；**不連 GAS**；localStorage 僅當次 |
| **線上表單** | `worksheets/instructor-worksheet-online.html` | 壹～伍整合填寫、提交試算表 |
| **分段練習** | `worksheets/section-01`～`05` | 可列印手寫版 |
| **提交邏輯** | `worksheets/report-wizard-submit.js` | GAS POST（no-cors） |
| **樣式** | `worksheets/worksheet-shared.css` | 分段頁共用 |
| **複製 stub** | `templates/*` | config、GAS 指標、checklist |
| **後端** | `gas/Code.gs`（repo 根） | `handleReportWizardWorksheet` |
| **設定** | `config/event.config.json` | `icapReportWorksheet` 區塊 |
| **Skill** | `.cursor/skills/icap-report-wizard-kit/` | Agent 複製 SOP |

---

## 依賴

| 依賴 | 用途 | 文件 |
|------|------|------|
| **meet-checkin-kit** | GAS 部署、Web App、試算表綁定 | `.cursor/skills/meet-checkin-kit/SKILL.md` |
| **meeting-display-deck** | 投影簡報 DOM/CSS/JS | `~/.cursor/skills/meeting-display-deck/SKILL.md` |
| **url-and-locale-standards** | 路徑英文、UI 繁中 | `~/.cursor/skills/url-and-locale-standards/SKILL.md` |
| **meeting-event-lifecycle** | 儀表板整合（可選） | `.cursor/skills/meeting-event-lifecycle/SKILL.md` |

**共用靜態資源（repo 根）：**

- `assets/meeting-display.css`
- `assets/meeting-display.js`
- `config/event.config.js`（由 `sync-config.js` 產生）

**外部 CDN（簡報／入口）：**

- Google Fonts Noto Sans TC
- Tailwind CDN（僅 `index.html` 入口頁）

---

## 線上 URL（meet-checkin 參考部署）

Base: `https://chatgptcjcu-boop.github.io/meet-checkin`

| 資產 | URL |
|------|-----|
| 模組入口 | […/training/icap-planning-report-wizard/index.html](https://chatgptcjcu-boop.github.io/meet-checkin/training/icap-planning-report-wizard/index.html) |
| 投影簡報 | […/report-wizard-slideshow.html](https://chatgptcjcu-boop.github.io/meet-checkin/training/icap-planning-report-wizard/report-wizard-slideshow.html) |
| 線上學習單 | […/worksheets/instructor-worksheet-online.html](https://chatgptcjcu-boop.github.io/meet-checkin/training/icap-planning-report-wizard/worksheets/instructor-worksheet-online.html) |
| 學習單索引 | […/worksheets/index.html](https://chatgptcjcu-boop.github.io/meet-checkin/training/icap-planning-report-wizard/worksheets/index.html) |
| 儀表板 | […/dashboard.html](https://chatgptcjcu-boop.github.io/meet-checkin/dashboard.html) |

Fork 後替換 GitHub Pages base URL。

---

## 參考教材（官方 ODT）

| 檔案 | 說明 |
|------|------|
| `reference/icap-course-planning-report-template.odt` | 勞動部公版「職能導向課程規劃與執行報告書」ODT（~32 KB） |
| `reference/icap-course-planning-report-template-thumb.png` | ODT 內建縮圖（~2 KB） |
| `reference/source-metadata.json` | 溯源：發布單位、建立／修改日期、版本說明、下載路徑 |

**溯源摘要（2026-07-05 封存）：**

- 發布單位：勞動部勞動力發展署
- 文件建立：2025-01-13（UTC+8，ODT meta）
- 最近修改：2025-04-15（UTC+8，ODT meta）
- 版本：勞動部公版格式（ODT）；檔案內無官方版次編號
- 原始檔名：`iCAP課程規劃與執行報告書格式(ODT檔).odt`

使用者請自行下載 ODT 於本機撰寫；模組入口 `index.html#reference-material` 提供縮圖、溯源與下載按鈕。

---

## 自訂變數（複製時必改）

| 變數 | 位置 | 預設（本 repo） |
|------|------|-----------------|
| 主辦單位 | 簡報封面、`index.html`、`config` `org.name` | 臺灣道法總會 |
| 計畫名稱 | 簡報、`org.footerPlan` | 宮廟管理師職能基準發展計畫 |
| 課程名稱 | `#courseName`、GAS 測試 payload | 宮廟管理師職能導向課程 |
| GAS URL | `backend.gasWebAppUrl` | 各部署不同 |
| 試算表分頁 | `sheetTab` / `REPORT_WIZARD_SHEET_NAME` | `icap-report-worksheet` |
| form action | `formType` | `icap-report-worksheet` |
| PDF 前綴 | `dateFilePrefix` | `icap-report` |
| 簡報 labels | `MeetingDisplay.init` | 18 頁（見 reference.md） |

模板：`templates/config-snippet.json`、`templates/customization-checklist.md`

---

## GAS / 試算表

- **Action：** `icap-report-worksheet`
- **Handler：** `handleReportWizardWorksheet` in `gas/Code.gs`
- **Sheet tab：** `icap-report-worksheet`
- **測試：** Apps Script 執行 `testReportWizardWorksheet`
- **部署：** 每次改 Code.gs → 管理部署 → 新版本

欄位 schema 見 `.cursor/skills/icap-report-wizard-kit/reference.md`。

---

## 儀表板整合

`dashboard.html` quick-links 已含：

- 報告書格式精靈 → `training/icap-planning-report-wizard/index.html`
- 報告書學習單 → `…/instructor-worksheet-online.html`

本模組 **不綁** active 會議 preset；與評核／編審簽到可並存。

---

## 複製快速步驟

1. 複製 `training/icap-planning-report-wizard/`
2. 依 `templates/customization-checklist.md` 改文案與 config
3. 綁定新試算表 + GAS 部署
4. `node scripts/sync-config.js` → push → 加 `.nojekyll`
5. 提交測試一筆 → 驗證試算表列

完整 10 步 SOP：`.cursor/skills/icap-report-wizard-kit/SKILL.md`  
主辦現場手冊：`.cursor/skills/icap-report-wizard-kit/playbook.md`

---

## 授權／商業使用備註

本資產包設計為 **職能導向計畫主辦方** 可 fork 套版：

- **Generic（可原樣複用）：** 目錄結構、ADDIE 導覽邏輯、表1–12 欄位 schema、GAS handler 模式
- **Localized（每計畫必改）：** 單位名稱、課程案例、試算表、GAS URL、對外 Pages URL

對外販售或推廣時，建議交付：公開 URL 兩組（簡報 + 線上表單）、playbook、試算表副本、本 ASSET-PACK.md。
