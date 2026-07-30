# 新活動設定（config）

## 快速開始

1. 選擇或編輯 **`config/events/{date}-{type}.json`** preset
2. 切換為目前活動：

```bash
node scripts/switch-event.js 1150730-editorial
# 複製 preset → event.config.json，並執行 sync-config.js
```

若無 Node.js，可手動複製 JSON 到 `event.config.json`，再以 Python 同步：

```bash
python3 -c "import json; p='config/event.config.json'; c=json.load(open(p)); open('config/event.config.js','w').write('/** auto */\nwindow.EVENT_CONFIG = '+json.dumps(c,ensure_ascii=False,indent=2)+';\n')"
```

3. 更新 `event.roster` 名單（或沿用 `assets/members.js` 預設）
4. push GitHub Pages，硬刷新瀏覽器

## 現場 QR 的日期自動選擇

`onsite-checkin/` 會依 **Asia/Taipei 當日日期**，從 `config/events/` 自動載入
`event.dateIso` 相符的活動與出席名單。QR 圖固定不必逐場更換。

永久 QR 入口為：`https://chatgptcjcu-boop.github.io/meet-checkin/`。首頁會先顯示
當日會議，再引導使用者進入現場或視訊簽到；投影版與列印版 QR 也使用同一網址。

投影頁 `onsite-projector.html` 右上角可由主辦選擇會議日期。選擇已建立的日期後，
畫面會更新會議名稱與 QR；該 QR 會帶入 `?event={presetId}`，確保參與者的首頁與
簽到名單都對應主辦選定的活動，而不是受手機日期影響。

- 當日有活動：載入該活動的標題、身份選項、GAS URL 與名單。
- 當日無活動：停止簽到並顯示「今日沒有可簽到的會議」，不沿用上一場名單。
- 主辦測試：可在簽到網址加上 `?event=1150730-editorial`，強制載入指定 preset。

新增活動時，除了建立 `config/events/{preset}.json`，也要在
`config/event-resolver.js` 的 `EVENTS` 清單加入其 `presetId`、`dateIso` 與檔案路徑。

## 活動 preset 一覽

| preset 檔名 | 活動 | 日期 |
|-------------|------|------|
| `1150630-evaluation.json` | 宮廟管理師第一次評核委員會 | 115/06/30 |
| `1150730-editorial.json` | 教材編審委員會 M1 Demo（第一場） | 115/07/30 |

切回 630 評核會：

```bash
node scripts/switch-event.js 1150630-evaluation
```

## 欄位說明

| 路徑 | 用途 |
|------|------|
| `org.*` | 主辦單位、頁首頁尾 |
| `event.*` | 會議名稱、日期、PDF 檔名前綴 |
| `event.roster` | 簽到名單；`rosterGroupIds` 優先從 GAS 載入，否則 inline committee/observers 覆蓋 `members.js` |
| `rosterAdmin.*` | 出席名單管理頁與 GAS action（`roster-admin/index.html`） |
| `backend.gasWebAppUrl` | GAS Web App `/exec` URL |
| `meet.url` | Google Meet 連結 |
| `contact.*` | 簽名 PDF 回傳對象 |
| `signIn.roles` | 其他現場人員身份別下拉 |
| `signIn.committeeLabel` | 名單區塊標題（如「評核委員」「編審委員與教材講師」） |
| `signIn.observersLabel` | 列席區塊標題 |
| `signIn.guestRoles` | 其他現場人員可選身份 |
| `signIn.memberPortalPath` | 視訊簽到成功導向路徑 |
| `paths.onsiteCheckinUrl` | QR 列印頁顯示的完整 URL |
| `seo.*` | 各頁 title / OG 標籤 |

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
- `data-sign-in-label="committee"` → `signIn.committeeLabel`
- `data-sign-in-label="observers"` → `signIn.observersLabel`
- `data-event-date-line` → `{dateRoc}｜現場簽到`

## 路徑英文、畫面中文

- **URL / 目錄**：英文 kebab-case（如 `onsite-checkin/`）
- **使用者可見文案**：繁體中文（如「現場簽到」）
- 詳見全域 skill：`url-and-locale-standards`

## 尚未 config 化

填答手冊**題目內文**（各 `.q` 區塊）仍須直接編輯 HTML，或等待 Tier 2 表單 JSON 引擎。
