# 新活動設定（config）

## 快速開始

1. 編輯 **`event.config.json`**（活動名稱、日期、GAS URL、Meet、聯絡人）
2. 同步執行檔：

```bash
node scripts/sync-config.js
```

若無 Node.js，請手動將 JSON 內容貼入 `event.config.js` 的 `window.EVENT_CONFIG = { ... }`。

3. push GitHub Pages，硬刷新瀏覽器

## 欄位說明

| 路徑 | 用途 |
|------|------|
| `org.*` | 主辦單位、頁首頁尾 |
| `event.*` | 會議名稱、日期、PDF 檔名前綴 |
| `backend.gasWebAppUrl` | GAS Web App `/exec` URL |
| `meet.url` | Google Meet 連結 |
| `contact.*` | 簽名 PDF 回傳對象 |
| `signIn.roles` | 簽到身份別下拉選單 |
| `signIn.memberPortalPath` | 簽到成功導向路徑 |
| `seo.*` | 簽到頁 title / OG 標籤 |

## HTML 綁定

在元素上加 `data-event="event.title"` 等屬性，載入：

```html
<script src="config/event.config.js"></script>
<script src="config/apply-event-config.js"></script>
<script>MeetCheckinConfig.init();</script>
```

特殊屬性：

- `data-event-contact` → 聯絡人姓名 + 電話
- `data-event-contact-line` → 「Line 傳給 …」完整句

## 尚未 config 化

填答手冊**題目內文**（各 `.q` 區塊）仍須直接編輯 HTML，或等待 Tier 2 表單 JSON 引擎。
