---
name: meeting-event-lifecycle
description: >-
  Manage meet-checkin meeting event lifecycle across dual iCAP committees:
  planned → preparing → active → completed. Covers events-registry.json schema,
  dashboard organizer workflow, switch-event.js, archiving completed events
  (0630 pattern), and adding new programs. Use when switching active events,
  registering meetings, upgrading dashboard, or onboarding a new iCAP program.
---

# meeting-event-lifecycle

meet-checkin 的**會議活動生命週期**架構：以 `config/events-registry.json` 為總表，以 `config/event.config.json` 為執行期「目前進行中」綁定，儀表板 `dashboard.html` 供主辦總覽。

**路徑英文、畫面中文**（必守）：詳見 `url-and-locale-standards` skill。  
**簽到／GAS／部署**細節見 repo 內 `meet-checkin-kit` skill。

---

## 四階段生命週期

| 狀態 | 英文鍵 | 意義 | 規則 |
|------|--------|------|------|
| 已排程 | `planned` | 日期已定，尚未啟動籌備 | 可有任意多場 |
| 籌備中 | `preparing` | 文件、名單、講義製作中 | 可有任意多場 |
| 進行中 | `active` | 全站簽到入口目前綁定的活動 | **全專案僅能有一場** |
| 已完成 | `completed` | 會議結束、資產歸檔 | 資產保留不刪 |

### 狀態轉換（典型）

```
planned → preparing → active → completed
```

- 進入 `active`：執行 `node scripts/switch-event.js <preset-id>`，並在 registry 將該活動 `status` 改為 `active`、其餘非 completed 活動改回 `preparing` 或 `planned`。
- 結案為 `completed`：更新 registry + preset 的 `meta.lifecycle.status`；**勿刪除** `08-evaluation-committee/1150630/` 等歷史資料夾。

---

## events-registry.json 結構

**路徑：** `config/events-registry.json`

```json
{
  "registryVersion": 1,
  "program": "專案全名",
  "org": "主辦單位",
  "lastUpdated": "YYYY-MM-DD",
  "lifecycleStates": ["planned", "preparing", "active", "completed"],
  "events": [ /* 每場會議一筆 */ ]
}
```

### 單一活動欄位

| 欄位 | 說明 |
|------|------|
| `id` | 唯一識別，與 preset 檔名一致，如 `1150730-editorial` |
| `committee` | 委員會英文目錄，如 `08-evaluation-committee` |
| `committeeLabel` | 繁體中文顯示名，如 `評核委員會` |
| `meetingNumber` | 該委員會第幾場（1–4） |
| `date` | 民國日期顯示，如 `115/07/30` |
| `dateIso` | ISO 日期，如 `2026-07-30` |
| `title` | 會議主題（繁體） |
| `status` | `planned` \| `preparing` \| `active` \| `completed` |
| `presetPath` | 活動 preset，如 `config/events/1150730-editorial.json` |
| `assetsPath` | 會議資料根目錄（英文 kebab-case） |
| `links` | 關鍵資產相對路徑（見下表） |

### links 常用鍵

| 鍵 | 用途 |
|----|------|
| `entry` | 全站報到入口 `index.html`（active 時有效） |
| `materials` | 會議主索引頁 |
| `handouts` | 現場發放／列印索引 |
| `slideshow` | 主投影簡報 |
| `slideshowAfternoon` | 下午場簡報（若有） |
| `dataCompilation` | 會後資料彙整區 |
| `onsiteCheckin` / `videoCheckin` | 現場／視訊簽到 |
| `qrProjector` / `qrPrint` | QR 投影／列印 |
| `prep` | 籌備入口 |
| `preset` | 對應 `config/events/*.json` |

新增活動時：在 `events` 陣列加一筆，並建立對應 `config/events/{id}.json` stub（可複製既有 preset 改日期與標題）。

---

## 固定入口 URL 與活動切換

### 委員端（不變）

委員**永遠**開啟同一 URL：

- `index.html` — 會議報到入口（現場／視訊分流）
- 背後內容由 **`config/event.config.json`**（經 `event.config.js` + `apply-event-config.js`）動態決定

### 主辦切換活動

```bash
# 1. 編輯或確認 preset
vim config/events/1150730-editorial.json

# 2. 切換為目前活動（複製 → event.config.json → sync-config.js → 同步 registry）
node scripts/switch-event.js 1150730-editorial

# 3. switch-event.js 會自動更新 events-registry.json 的 active 標記
#    結案為 completed 時仍須手動更新 registry + preset 的 lifecycle

# 4. push GitHub Pages；硬刷新
git push origin main
```

切回已結案 630 評核會（僅查閱／重現時）：

```bash
node scripts/switch-event.js 1150630-evaluation
```

> **注意：** 切換 preset 會改變全站簽到名單與 GAS 綁定；正式活動前確認 `event.roster` 與 `backend.gasWebAppUrl`。

---

## 儀表板（主辦用）

**路徑：** `dashboard.html`

自 `config/events-registry.json` 載入，分四區：

1. **目前進行中（ACTIVE）** — 入口、QR、現場／視訊簽到、簡報、講義
2. **籌備中（preparing）** — 籌備連結 + `project-progress.json` 階段標籤
3. **已排程（planned）** — 占位入口與設定檔
4. **事件管理（completed）** — 歸檔一鍵連結（0630 範本）

「**設為進行中**」按鈕會顯示並可複製：

```bash
node scripts/switch-event.js <活動-id>
```

瀏覽器無法代為執行 Node；主辦須在本機 repo 執行後 push。

輔助進度資料：`dashboard/project-progress.json`（可選，儀表板用於 phases／outputs 顯示）。

---

## 歸檔已完成活動（0630 範本）

**活動：** `1150630-evaluation`｜狀態：`completed`

### 必做

1. `config/events-registry.json` → `status: "completed"`
2. `config/events/1150630-evaluation.json` → `meta.lifecycle.status: "completed"`
3. **保留**所有資產目錄，勿覆寫：
   - `08-evaluation-committee/1150630/` — 委員填答模板
   - `08-evaluation-committee/1150630-handouts/` — 現場發放
   - `08-evaluation-committee/1150630-data-compilation/` — 資料彙整
   - `meeting-display.html` — 630 主投影簡報

### 儀表板歸檔連結

completed 區應能一鍵開啟：簡報、講義、模板、彙整區、設定檔（見 registry `links`）。

---

## 新增活動／複製到新 iCAP 專案

### 同一專案新增一場會

1. 建立資料夾：`{committee}/{date-slug}/`（英文 kebab-case）
2. 建立 stub：`config/events/{date}-{evaluation|editorial}.json`
3. 在 `config/events-registry.json` 註冊一筆 `events[]`
4. 視需要更新 `dashboard/project-progress.json`
5. 會前：`status` → `preparing` → 執行 `switch-event.js` → `active`

### 新 iCAP 雙委員會專案

1. Fork 或複製 meet-checkin repo
2. 替換 `events-registry.json` 內 `program`、`events`（通常各委員會 4 場）
3. 清空或重寫 `config/events/*.json` presets
4. 保留 `scripts/switch-event.js`、`config/apply-event-config.js` 流程
5. 依 `meet-checkin-kit` 重新綁定 GAS 試算表與 QR

---

## 與 meet-checkin-kit 的整合

| 元件 | 生命週期角色 |
|------|----------------|
| `config/events/*.json` | 各場會議 preset 模板 |
| `config/event.config.json` | **目前 active** 的執行期設定 |
| `scripts/switch-event.js` | preset → event.config 切換器 |
| `scripts/sync-config.js` | JSON → `event.config.js` |
| `index.html` + 簽到子系統 | 讀取 active config |
| `dashboard.html` | 讀取 registry，不參與簽到邏輯 |

### 修改檢查清單

| 改動 | 必做 |
|------|------|
| 改 registry `status` | 確認僅一筆 `active` |
| `switch-event.js` 切換 | 自動更新 registry active 標記 |
| 改 preset 名單／GAS | sync + push；GAS 改程式則新版本部署 |
| 改 QR 目標 URL | 重產 `assets/onsite-qrcode.png` 或更新 `paths.onsiteCheckinUrl` |
| 結案活動 | registry + preset `lifecycle`；保留 assets 目錄 |

---

## 本專案 iCAP 雙委員會一覽（115 年度）

| id | 委員會 | 日期 | status |
|----|--------|------|--------|
| `1150630-evaluation` | 評核 | 115/06/30 | completed |
| `1150830-evaluation` | 評核 | 115/08/30 | preparing |
| `1151025-evaluation` | 評核 | 115/10/25 | planned |
| `1151129-evaluation` | 評核 | 115/11/29 | planned |
| `1150730-editorial` | 編審 | 115/07/30 | **active** |
| `1151018-editorial` | 編審 | 115/10/18 | planned |
| `1151115-editorial` | 編審 | 115/11/15 | planned |
| `1151220-editorial` | 編審 | 115/12/20 | planned |

---

## Agent 守則

1. **勿刪除** `completed` 活動資產（尤其 `1150630`）。
2. 切換 `active` 時**勿破壞**現行 0730 設定，除非使用者明確要求切換。
3. registry、`preset`、`event.config.json` 三者 `status` / `presetId` 應一致。
4. 路徑一律英文 kebab-case；UI 文案繁體中文。
5. 使用者未要求時不要 `git commit` / `push`。

---

## 延伸閱讀

- 路徑與語系：`url-and-locale-standards` skill
- 簽到部署：`meet-checkin-kit` skill（`.cursor/skills/meet-checkin-kit/SKILL.md`）
- Config 欄位：`config/README.md`
- 雙機同步：`SYNC-WORKFLOW.md`
