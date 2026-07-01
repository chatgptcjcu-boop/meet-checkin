# meet-checkin-kit 商業套版說明

## 產品定位

**meet-checkin-kit** 是給協會、學會、計畫辦公室、顧問公司的「視訊會議簽到 + 委員填答」**無伺服器套組**：

- 不需租用 VPS / 資料庫
- 資料落在主辦自己的 Google 試算表
- 前端可託管 GitHub Pages（免費）
- 委員端流程：**簽到 → 填答 → 存 PDF → 親簽回傳**

> 說明：「無資料庫」指**無自建 MySQL**；Google 試算表即託管資料儲存。

---

## 目標 repo 結構（商業套版 v1）

```
meet-checkin-kit/                    ← 可販售的乾淨模板 repo
├── README.md
├── LICENSE
├── config/
│   ├── event.config.json            ← 客戶唯一必改檔（Tier 1）
│   ├── event.config.js
│   ├── apply-event-config.js
│   └── README.md
├── public/                          ← 未來可選：與 instances 分離
│   ├── index.html                   ← 簽到
│   └── member/                      ← remote-members專區
├── gas/
│   └── Code.gs
├── templates/
│   ├── forms/
│   │   ├── handbook-body.sample.html
│   │   └── handbook-appendix.sample.html
│   └── consent/                     ← 錄影同意文案片段
├── scripts/
│   └── sync-config.js
├── docs/
│   ├── SETUP.md
│   ├── COMMERCIAL-KIT.md
│   └── SECURITY.md                  ← 待補：anti-spam、個資
├── .cursor/skills/meet-checkin-kit/
└── instances/                       ← 客戶實例（不隨套版出售）
    └── example-taoist-temple-manager/
```

**本 repo（meet-checkin）** 目前 = `instances/example-*` + 套版核心混在同一樹；v1 已完成 **config 抽離**，下一步可物理拆成 `kit/` 與 `instances/`。

---

## 方案分級與定價草稿（新台幣）

### Starter｜自助套版

| 項目 | 內容 |
|------|------|
| **定價** | **NT$ 1,980**（早鳥 NT$ 990） |
| **交付** | GitHub repo 存取、config 模板、gas/Code.gs、範例填答手冊、SETUP 文件、Cursor Skill |
| **適合** | 會偶爦辦remote-members會、有 IT 同仁能跟文件操作 |
| **不含** | 代部署、客製題目、代操 GAS |

### Standard｜代設定上線

| 項目 | 內容 |
|------|------|
| **定價** | **NT$ 8,800 / 場** |
| **交付** | Starter 全部 + 代設 GAS + GitHub Pages + 試算表分頁 + 1 次線上演練 |
| **適合** | 計畫辦公室趕上架、只改 config 與封面 |
| **加購** | 客製填答手冊 HTML（依題數報價） |

### Pro｜表單引擎 + 白牌

| 項目 | 內容 |
|------|------|
| **定價** | **NT$ 28,000 起**（或年約 NT$ 48,000 / 3 場） |
| **交付** | JSON/YAML 定義題目 → 自動生填答頁、主辦匯出腳本、可選 GAS token 防濫用 |
| **適合** | 顧問公司多場次、多計畫重複使用 |
| **狀態** | **開發中（Tier 2）** |

### 代管 Hosted（選配）

| 項目 | 內容 |
|------|------|
| **定價** | **NT$ 1,200 / 月 / 活動** 或 **NT$ 3,500 / 場全託** |
| **交付** | 代維護 GAS、試算表備份、會後匯出 PDF 清單 |
| **注意** | 個資責任需合約約定 |

---

## 與競品差異（銷售話術）

| 做法 | meet-checkin-kit | Google 表單 | 自架系統 |
|------|------------------|-------------|----------|
| 月費 | ≈ $0 | 免費 | 伺服器 + DB |
| 簽到拍照 | ✅ | 需外掛 | 需開發 |
| 紙本同款 PDF | ✅ A4 版型 | ❌ | 需設計 |
| 資料所有權 | 客戶試算表 | Google | 自建 |
| 客製 UI | HTML 可改 | 受限 | 完全 |

---

## 購買後 30 分鐘 checklist（給客戶）

1. [ ] Fork / clone repo
2. [ ] 改 `config/event.config.json`
3. [ ] `node scripts/sync-config.js`
4. [ ] 試算表綁 GAS → 部署 → URL 寫回 config
5. [ ] push → GitHub Pages
6. [ ] 試簽到 + 試填答 + 試列印 PDF

---

## 法律與免責（文案草稿）

- 本套組為**技術工具模板**，不構成法律意見。
- PDF 親簽之效力由主辦單位依會議規範自行確認。
- 個資告知、錄影同意文案請依活動性質替換 config / HTML 內容。
- 主辦須自行管理試算表與 Drive 分享權限。

---

## 路線圖

| 版本 | 內容 |
|------|------|
| **v1.0** ✅ | config 抽離、Skill、PDF 流程 |
| **v1.1** | GAS shared secret、SECURITY.md |
| **v2.0** | 表單 JSON schema、一鍵新活動 CLI |
| **v2.5** | 主辦後台（唯讀）匯出 PDF 清單 |

---

## 聯絡（模板占位）

- 產品詢問：your-email@example.com
- 示範站：https://chatgptcjcu-boop.github.io/meet-checkin/
