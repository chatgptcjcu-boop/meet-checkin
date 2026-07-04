---
name: meet-checkin-kit
description: >-
  Deploy and maintain meet-checkin: GitHub Pages static frontend + Google Apps
  Script + Google Sheets (no self-hosted DB). Covers sign-in/sign-out, form
  submit, fetch no-cors, hidden form POST, GAS redeploy, PDF print workflow,
  and troubleshooting. Use when building or fixing event check-in systems,
  GAS Web App POST from static sites, meet-checkin repo, 視訊簽到, 填答手冊,
  or Google 試算表回傳.
---

# meet-checkin-kit

GitHub Pages 靜態前端 + GAS Web App + Google 試算表。無自建資料庫；試算表即資料儲存。

## 架構速覽

```
index.html（入口分流）
├── onsite-checkin/（現場簽到）← QR 投影 onsite-projector.html
│   ├── 名單點選簽到/簽退
│   └── 其他現場人員（身份別+姓名+拍照）
└── video-checkin/（視訊簽到）
    └── 名單點選 → 拍照 → remote-members 填答專區
```

**路徑英文、畫面中文**（必守）：目錄/URL 用 `onsite-checkin` 等英文 kebab-case；按鈕、標題、投影文案用繁體「現場簽到」。詳見 `url-and-locale-standards` skill。

| 分頁 | action 值 | 用途 |
|------|-----------|------|
| 工作表1 | `簽到` / `簽退` | 報到時間、姓名、身份別、錄影授權 |
| 填答紀錄 | `填答-正文` / `填答-附錄` | 結構化 JSON 答案 |

## 關鍵設計決策（勿隨意改壞）

1. **GAS 必須從試算表開啟**：試算表 → 擴充功能 → Apps Script。勿用獨立「未命名專案」。
2. **`SPREADSHEET_ID` 建議留空**：`getSpreadsheet_()` 優先 `getActiveSpreadsheet()`。
3. **簽到送出**：`index.html` 用 **hidden form POST**（最可靠）；fetch no-cors 為備援。
4. **填答送出**：`submit-form.js` 用 **fetch + mode: no-cors + text/plain**；成功以「fetch 未 throw」判定。
5. **委員端不下载 JSON**：主辦靠試算表；委員靠 **列印 PDF + 親簽 + Line 回傳**。
6. **每次改 `gas/Code.gs` 必須 GAS 新版本部署**；前端 `GAS_URL` 須與最新部署 URL 一致。
7. **靜態資源加 `?v=` 快取參數**：改 JS/CSS 後 bump 版本，請使用者硬刷新。

---

## 部署 SOP

### Phase 0：前置

- [ ] Google 帳號（主辦）
- [ ] GitHub 帳號 + repo（或任何靜態託管）
- [ ] 活動文案、填答手冊 HTML、Meet 連結、主辦聯絡方式

### Phase 1：Google 試算表

1. 新建試算表，第一分頁可命名 **工作表1**（或由 GAS 自動建立）。
2. 可預建 **填答紀錄** 分頁（或由 GAS 首次提交時自動建立）。
3. 試算表 → **擴充功能 → Apps Script**。
4. 刪除預設程式，貼上 repo 的 `gas/Code.gs` 全文。
5. 確認 `SPREADSHEET_ID = ''`（留空）。
6. 儲存專案（建議命名：`meet-checkin-活動名`）。

### Phase 2：GAS 測試（部署前）

在 Apps Script 編輯器依序執行：

| 函式 | 驗證 |
|------|------|
| `testSignIn` | 工作表1 新增簽到列 |
| `testFormSubmit` | 填答紀錄新增列（postData 路徑） |
| `testFormSubmitWeb` | 填答紀錄新增列（parameter.payload 路徑） |

檢視 **執行紀錄** 應為 `{"ok":true}`；試算表有對應列。

### Phase 3：GAS Web App 部署

1. **部署 → 新增部署 → 類型：Web 應用程式**
2. **執行身分**：我
3. **存取權**：任何人（含匿名）
4. 複製 **Web 應用程式 URL**（結尾 `/exec`）

**之後每次改 Code.gs：**

部署 → **管理部署** → 編輯（鉛筆）→ 版本選 **新版本** → 部署。

> 同一部署 ID 的 URL 通常不變；若新建部署則 URL 會變，前端兩處都要改。

### Phase 4：前端設定 GAS URL

更新以下常數為 Phase 3 的 URL：

| 檔案 | 常數名 |
|------|--------|
| `index.html` | `GOOGLE_APP_SCRIPT_URL` |
| `remote-members/submit-form.js` | `GAS_URL` |

同時依活動修改（非 GAS）：

- `index.html`：`googleMeetUrl`、標題、日期、OG 標籤
- `remote-members/index.html`：Meet 連結、第三步驟文案、助理 Line
- 填答手冊 HTML：活動名稱、日期、題目內容

### Phase 5：GitHub Pages

```bash
cd /path/to/meet-checkin
git add -A && git commit -m "更新活動設定" && git push origin main
```

- Settings → Pages → Source: **main** / **root**
- 上線 URL 通常為 `https://<user>.github.io/<repo>/`
- 等待 1–3 分鐘；用 **硬刷新**（Cmd+Shift+R）測試

或使用 `deploy-github-pages.sh`（需 `gh auth login`）。

### Phase 6：端對端驗收

| # | 步驟 | 預期 |
|---|------|------|
| 1 | 開啟 `index.html`，簽到 | 工作表1 新列；簽到照在 Drive `meet-checkin-截圖` |
| 2 | 簽到成功 | 導向 `remote-members/index.html?name=…&role=…` |
| 3 | 填答正文 → 提交 | 填答紀錄新列；成功視窗有「列印／存 PDF」 |
| 4 | 列印 PDF | A4 版面；底部提交列不印出 |
| 5 | 填答附錄 → 提交 | 填答紀錄第二列（同姓名、不同 action） |
| 6 | 返回首頁簽退 | 工作表1 簽退列 |

---

## 前端送出模式（實作參考）

### 簽到／簽退（index.html）

```javascript
// 優先：hidden form POST → parameter.payload
const form = document.createElement('form');
form.method = 'POST';
form.action = GOOGLE_APP_SCRIPT_URL;
form.target = 'gas_hidden_frame';
input.name = 'payload';
input.value = JSON.stringify(postData);
form.submit();

// 備援：sendBeacon → fetch no-cors
```

`postData` 欄位：`action`, `name`, `role`, `consent`, `timestamp`, `image`（base64 JPEG）

### 填答（submit-form.js）

```javascript
fetch(GAS_URL, {
  method: 'POST',
  mode: 'no-cors',
  headers: { 'Content-Type': 'text/plain;charset=utf-8' },
  body: JSON.stringify({
    action: formType,        // '填答-正文' | '填答-附錄'
    name, role, formType,
    timestamp, answerCount, answers, pageUrl
  }),
});
```

`answers` 結構：`[{ title, fields: [{ label, value }] }]`

### GAS parsePostData_

同時支援：

- `e.postData.contents`（fetch / sendBeacon）
- `e.parameter.payload`（hidden form）

---

## 委員操作流程（文案標準）

1. 首頁 **簽到** → 進入remote-members專區
2. 填寫 **正文**、**附錄** → 各點「提交填答紀錄」
3. 成功後 **列印／存 PDF**（正文、附錄各一份）
4. 列印後 **簽名欄親簽** → Line 傳主辦
5. 會議結束 → 首頁 **簽退**

委員**不需要** JSON 檔；主辦以試算表 + 簽名 PDF 歸檔。

---

## 主辦會後歸檔

```
活動資料夾/
├── 01_簽到簽退/     ← 工作表1 匯出
├── 02_填答PDF/      ← 委員 Line 回傳
└── 03_填答紀錄/     ← 填答紀錄分頁匯出（含 JSON 欄）
```

試算表「填答紀錄」第 6 欄 `結構化答案(JSON)` 即機器可讀備份，無需委員端 JSON。

---

## 修改檢查清單

改動類型 | 必做
---------|------
改 **`config/event.config.json`** | `node scripts/sync-config.js` → push → 硬刷新
改 `gas/Code.gs` | GAS 新版本部署 + 跑 test 函式
改 GAS URL | 只改 config JSON，sync 後 push（無需改 index/submit-form）
改 `submit-form.js` / `.css` | bump `?v=` in 填答手冊 HTML
改填答手冊題目 | 編輯 HTML；確認 `.q` / `.scope-body` / `.resolution` / `.units-full` 選擇器仍有效
推 GitHub Pages | push main → 等 1–3 分鐘 → 硬刷新

## 設定檔（套版 v1）

新活動優先改 **`config/events/{date}-{type}.json`** preset，再執行：

```bash
node scripts/switch-event.js 1150730-editorial
```

（複製 → `event.config.json` → `sync-config.js`）

執行期載入 `config/event.config.js` + `apply-event-config.js`；HTML 用 `data-event="event.title"` 綁定。  
詳見 [config/README.md](../../config/README.md) 與 [docs/COMMERCIAL-KIT.md](../../docs/COMMERCIAL-KIT.md)。

---

## 會議雙軌簽到架構（必讀）

完整流程：

```
index.html（入口分流）
├── onsite-checkin/（現場簽到）← QR 投影 onsite-projector.html
│   ├── 名單點選簽到/簽退
│   └── 其他現場人員（身份別+姓名+拍照）
└── video-checkin/（視訊簽到）
    └── 名單點選 → 拍照 → remote-members 填答專區
```

### 檔案對照表

| 用途 | 路徑 | 顯示名稱 |
|------|------|----------|
| 入口 | `index.html` | 會議報到入口 |
| 現場簽到 | `onsite-checkin/` | 現場簽到 |
| 視訊簽到 | `video-checkin/` | 視訊簽到 |
| QR 投影 | `onsite-projector.html` | 現場簽到 QR（投影） |
| QR 列印 | `onsite-qr-print.html` | 現場簽到 QR（列印） |
| 舊 QR 書籤 | `onsite-checkin-legacy/` | 自動導向 `onsite-checkin/` |
| 名單 | `config event.roster` 或 `assets/members.js` | — |
| 填答 | `remote-members/` | 委員專區 |
| GAS | `gas/Code.gs` | — |

### QR Code 注意事項

- 靜態圖 `assets/onsite-qrcode.png` **可能仍編碼舊 URL**（如 `onsite-checkin-legacy/`）。
- 路徑改名或換活動後，主辦須**重新產生 QR 圖**（指向 `paths.onsiteCheckinUrl`），或暫用 `onsite-checkin-legacy/` 轉址 stub。
- 列印/投影頁的 URL 文字已由 config 動態更新；**圖片本身需手動換檔**。

---

## 新活動切換 SOP

1. 複製或編輯 `config/events/{date}-{type}.json`（例：`1150730-editorial.json`）
2. `node scripts/switch-event.js {preset}`（例：`1150730-editorial`）
3. 更新名單：`event.roster.committee` / `observers`（或改 `assets/members.js` 後移除 config roster）
4. 若 URL 變更 → 重新產生 `assets/onsite-qrcode.png`
5. `git push`；若改 `gas/Code.gs` → GAS **新版本部署**
6. 端對端測試四項：**現場簽到**、**視訊簽到**、**填答提交**、**投影 QR 掃描**

切回 630 評核會：`node scripts/switch-event.js 1150630-evaluation`

---

## 故障排除

### 試算表完全沒有新列

| 可能原因 | 處理 |
|----------|------|
| 前端 GAS URL 是舊版／打錯 | 對照 GAS「管理部署」最新 `/exec` URL |
| GAS 改程式後未重新部署 | 管理部署 → 新版本 → 部署 |
| 用了獨立 Apps Script 專案 | 改從**試算表**開 Apps Script 並重貼 Code.gs |
| `Illegal spreadsheet id` | ID 大小寫錯（如 `FKEZ` vs `FKEz`）；或改 `SPREADSHEET_ID = ''` |
| 瀏覽器快取舊 JS | 硬刷新；確認 `submit-form.js?v=` 已 bump |

### Console 403 / CORS 紅字（填答）

- **填答**：應使用 `mode: 'no-cors'`；403 紅字可消失；**不能**讀取 GAS JSON 回應。
- **簽到**：維持 hidden form POST；勿改成需讀回應的 cors fetch。
- 若仍失敗：確認 GAS 存取權為「任何人」。

### 前端顯示成功但試算表無資料

- `no-cors` 下成功 UI 代表「請求已發出」，**不保證** GAS 寫入。
- 用 GAS `testFormSubmit` / `testFormSubmitWeb` 確認後端正常。
- 再從網頁提交，對照試算表時間戳。

### 只有簽到有、填答沒有（或相反）

- 確認 `action` 字串完全一致：`簽到` `簽退` `填答-正文` `填答-附錄`
- 填答需 `answers.length > 0` 才會提交

### 簽到照有、填答截圖欄空白

- 目前填答**刻意不送** `image`（`imageOmitted`）；佐證靠 PDF。
- 若需恢復：在 `submit-form.js` 保留 `image` 欄位送 GAS。

### 相機無法使用

- LINE / FB 內建瀏覽器常封鎖相機 → 提示改用 Safari / Chrome
- 無相機裝置：簽到仍可送出（無照片列仍寫入）
- 需 HTTPS（GitHub Pages 已滿足）

### PDF 列印版面問題

- 確認 `@media print` 存在於填答手冊 `<style>`
- `#submitBar`, `#submitSuccess` 在 print 時 `display: none`
- 附錄表格過長：可調 `.units-full` 字級或 `@page margin`

### GAS 執行錯誤

- **執行紀錄**（Apps Script）查看 stack trace
- Drive 配額／授權：首次部署需同意 Drive 權限
- 截圖失敗不影響列寫入（Code.gs 已 try/catch）

### GitHub Pages 未更新

- 確認 push 到 **main** 且 Pages source 正確
- 私有 repo 需 GitHub Pro 才能 Pages
- CDN 快取：URL 加 query 或等數分鐘

---

## 安全與濫用（紅隊備忘）

- GAS「任何人可 POST」→ 可被灌假資料；正式活動可加 shared secret（GAS 驗證 + 前端帶 token）。
- 試算表勿設公開編輯；僅主辦可讀。
- 簽到照含個資 → Drive 資料夾權限僅主辦。
- 前端 GAS URL 必然暴露；勿在 GAS 硬編碼機密。

---

## Agent 實作守則

1. **簽到流程已驗證成功時不要改** `index.html` 的 hidden form 邏輯，除非使用者明確要求。
2. 改 GAS 後提醒使用者：**新版本部署**（非只儲存程式）。
3. 改前端 JS/CSS 後：**bump `?v=`** 並建議 push GitHub Pages。
4. 不要恢復委員端自動 JSON 下載，除非使用者要求。
5. 新活動複製 repo 時，優先抽離硬編碼到 config（長期套版化方向）。
6. Commit 訊息用繁體中文、聚焦 why；使用者未要求不要 push。

---

##  repo 檔案索引

| 路徑 | 用途 | 顯示名稱 |
|------|------|----------|
| `index.html` | 入口分流（現場 / 視訊） | 會議報到入口 |
| `onsite-checkin/` | 現場名單簽到 + 其他現場人員 | 現場簽到 |
| `video-checkin/` | 視訊名單簽到 | 視訊簽到 |
| `onsite-projector.html` | 會場 QR 投影 | 現場簽到 QR（投影） |
| `onsite-qr-print.html` | A4 QR 列印 | 現場簽到 QR（列印） |
| `config/events/*.json` | 活動 preset | — |
| `scripts/switch-event.js` | 切換 preset | — |
| `assets/members.js` | 預設名單（config roster 可覆蓋） | — |
| `assets/checkin.js` | 相機 + GAS 送出 | — |
| `meeting-display.html` | 會議主投影簡報 | — |
| `remote-members/` | 填答專區 | 委員專區 |
| `gas/Code.gs` | 唯一後端（doPost） | — |
| `deploy-info.json` | 線上 URL 對照 | — |
| `08-evaluation-committee/` | 630 評核現場紙本 | — |
| `09-editorial-committee/` | 730 教材編審資料 | — |

---

## 延伸閱讀

詳細 payload 範例與試算表欄位對照見 [reference.md](reference.md)。

**現場投影簡報**（一頁一投影片、金綠主題）必讀全域 skill：`~/.cursor/skills/meeting-display-deck/SKILL.md`（與 [url-and-locale-standards](~/.cursor/skills/url-and-locale-standards/SKILL.md) 搭配）。
