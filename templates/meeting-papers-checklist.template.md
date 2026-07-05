# 會議紙本必備清單（模板）

複製到 `{committee}/{date-slug}/` 或 `{date}-handouts/` 籌備時使用。每場會議**至少**應備齊下列三類紙本（路徑依活動調整）。

## 必備（每場會議）

| # | 項目 | 對象 | 典型路徑鍵 | 備註 |
|---|------|------|------------|------|
| 1 | **一頁式議程**（投影＋列印） | 全體＋主持 | `links.agendaOnePage` / `links.agendaPrint` | 投影版與 A4 列印版各一 |
| 2 | **講師／委員資料包** | 動手填寫者 | `links.handouts` | 評核：填答手冊；編審：講師學習單 |
| 3 | **列席／旁聽資料包** | 非講師、非委員 | `links.observerPack` | 見證、提供意見；**不含** Phase／填答表 |

## 依活動加選

| 項目 | 對象 | 備註 |
|------|------|------|
| 主持者腳本 | 主席／facilitator | 勿發放講師 |
| 評量／附錄 | 講師（Phase 4 等） | 列席包不含 |
| QR 列印 | 現場報到 | `links.qrPrint` |
| 彩排手冊 | 主辦 | 可數位閱讀 |

## events-registry 登錄範例

```json
"links": {
  "handouts": "{path}/1150730-handouts/print-index.html",
  "observerPack": "{path}/1150730-handouts/observer-pack/index.html",
  "agendaPrint": "{path}/1150730-handouts/agenda-one-page-print.html"
},
"meetingPapers": {
  "required": [
    { "id": "agenda-one-page", "label": "一頁式議程（投影+列印）", "pathKey": "agendaPrint" },
    { "id": "member-handouts", "label": "講師／委員資料包", "pathKey": "handouts" },
    { "id": "observer-pack", "label": "列席／旁聽資料包", "pathKey": "observerPack" }
  ]
}
```

## 0630 對照

- 委員包：`08-evaluation-committee/1150630-handouts/`
- 列席包：`onsite-print/guests/`（索引入口：`1150630-handouts/observer-pack/`）

## 0730 對照

- 講師包：`09-editorial-committee/1150730-m1-demo/1150730-handouts/`
- 列席包：`09-editorial-committee/1150730-m1-demo/1150730-handouts/observer-pack/`
