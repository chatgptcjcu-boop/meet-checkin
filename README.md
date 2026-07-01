# meet-checkin-kit

**零伺服器視訊會議簽到 + 線上填答套組**  
GitHub Pages 靜態前端 × Google Apps Script × Google 試算表（無自建資料庫）

---

## 功能

- 視訊 **簽到／簽退**（相機大頭照 + 試算表寫入）
- **填答手冊**線上填寫 → 結構化答案寫入試算表
- **列印 PDF + 親簽**回傳主辦（與現場紙本相同佐證流程）
- 主辦 **零後端維運**、月費趨近於零

## 5 分鐘設定新活動

```bash
# 1. 改設定
vim config/event.config.json
node scripts/sync-config.js

# 2. GAS：試算表 → 擴充功能 → 貼上 gas/Code.gs → 部署 Web App

# 3. 上線
git push origin main
```

詳見 [docs/SETUP.md](docs/SETUP.md) 與 [.cursor/skills/meet-checkin-kit/SKILL.md](.cursor/skills/meet-checkin-kit/SKILL.md)。

## 目錄結構

```
meet-checkin/
├── config/                 ← ★ 改這裡就能換活動
│   ├── event.config.json
│   ├── event.config.js
│   └── apply-event-config.js
├── index.html              ← 簽到／簽退
├── gas/Code.gs             ← 試算表後端
├── 視訊委員/               ← 委員專區 + 填答手冊
├── scripts/sync-config.js
├── docs/
│   ├── SETUP.md
│   └── COMMERCIAL-KIT.md   ← 商業套版說明與定價
└── .cursor/skills/meet-checkin-kit/
```

## 線上示範

https://chatgptcjcu-boop.github.io/meet-checkin/

## 授權與商用

見 [docs/COMMERCIAL-KIT.md](docs/COMMERCIAL-KIT.md)。

## 技術棧

| 層 | 技術 |
|----|------|
| 前端 | 靜態 HTML / JS |
| 託管 | GitHub Pages（或任何靜態 CDN） |
| 後端 | Google Apps Script Web App |
| 資料 | Google 試算表 + Drive（截圖） |

---

> **套版化進度 v1.0**：活動設定已抽至 `config/`；填答題目仍為 HTML 模板（Tier 2 將 JSON 化）。
