# iCAP 報告書格式精靈 — 複製自訂檢查表

複製 `training/icap-planning-report-wizard/` 到新計畫時逐項勾選。技術細節見 `.cursor/skills/icap-report-wizard-kit/`。

---

## 單位／課程文案（繁體中文 UI）

- [ ] `index.html` — 主標、副標、主辦單位
- [ ] `report-wizard-slideshow.html` — 封面、計畫名稱、案例文案
- [ ] `worksheets/instructor-worksheet-online.html` — 頁首、預設課程名稱
- [ ] `worksheets/section-01`～`05` — 各段標題（若保留分段頁）
- [ ] `config/event.config.json` → `org.name`、`org.footerPlan`

---

## 簡報（meeting-display）

- [ ] CSS 路徑 `../../assets/meeting-display.css` 層數正確
- [ ] JS 路徑 `../../assets/meeting-display.js` 層數正確
- [ ] slide 數量 = `MeetingDisplay.init({ labels: [...] }).length`（目前 18）
- [ ] 首張 slide 有 `class="slide … active"`
- [ ] 分段學習單「對應簡報第 N 頁」連結已更新

---

## Google 試算表 + GAS

- [ ] 新建試算表（或指定既有表）
- [ ] 試算表 → 擴充功能 → Apps Script → 貼上含 handler 的 `Code.gs`
- [ ] `SPREADSHEET_ID` 留空（建議）或填正確 ID
- [ ] 執行 `testReportWizardWorksheet` → 試算表分頁 `icap-report-worksheet` 有測試列
- [ ] Web App 部署：執行身分「我」、存取「任何人」
- [ ] 複製 `/exec` URL

---

## Config 與前端

- [ ] `backend.gasWebAppUrl` 設為新部署 URL
- [ ] `icapReportWorksheet` 區塊（見 `templates/config-snippet.json`）
- [ ] `node scripts/sync-config.js`
- [ ] 線上學習單 HTML 載入 `event.config.js`（路徑深度正確）
- [ ] 若改 `report-wizard-submit.js` → bump HTML 內 `?v=`

---

## 部署與整合

- [ ] repo 根目錄有 `.nojekyll`
- [ ] `dashboard.html` quick-links 指向新模組路徑
- [ ] （可選）`events-registry.json` 加訓練模組 link
- [ ] push GitHub Pages → 硬刷新驗收

---

## 端對端驗收

- [ ] 開啟投影簡報 — 金綠主題、←→ 切頁正常
- [ ] 線上學習單填寫 → 提交 → 試算表新列
- [ ] 列印 PDF 流程正常
- [ ] 簡報第 17 頁 Checklist 與 iCAP 平台差異說明仍保留

---

## 對外交付（推廣／販售資產包）

- [ ] 提供公開 URL：模組入口、投影、線上學習單
- [ ] 提供 `ASSET-PACK.md` + playbook（繁中 SOP）
- [ ] 提供試算表副本或主辦編輯權限
- [ ] 說明 generic vs localized 項目（見 SKILL.md 商業複製章節）
