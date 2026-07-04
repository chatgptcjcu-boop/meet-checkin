# meet-checkin-kit — Reference

## 試算表欄位對照

### 工作表1（簽到／簽退）

| 欄 | 來源 |
|----|------|
| 報到時間 | `formatTaiwanTime_(timestamp)` 台灣時區 |
| 姓名 | `data.name` |
| 身份別 | `data.role` |
| 錄影授權 | `data.consent ? '已同意' : '未同意'` |

### 填答紀錄

| 欄 | 來源 |
|----|------|
| 提交時間 | `formatTaiwanTime_(timestamp)` |
| 動作 | `data.action` |
| 姓名 | `data.name` |
| 身份 | `data.role` |
| 答題數 | `data.answerCount` |
| 結構化答案(JSON) | `JSON.stringify(data.answers)` |
| 頁面URL | `data.pageUrl` |
| 截圖連結 | Drive URL（僅當 payload 含 `data.image`） |

---

## Payload 範例

### 簽到

```json
{
  "action": "簽到",
  "name": "王小明",
  "role": "評核委員",
  "consent": true,
  "timestamp": "2026-06-30T02:00:00.000Z",
  "image": "data:image/jpeg;base64,/9j/..."
}
```

### 填答-正文

```json
{
  "action": "填答-正文",
  "name": "王小明",
  "role": "評核委員",
  "formType": "填答-正文",
  "timestamp": "2026-06-30T04:30:00.000Z",
  "answerCount": 2,
  "answers": [
    {
      "title": "1-1 出席確認",
      "fields": [
        { "label": "委員姓名", "value": "王小明" },
        { "label": "選項", "value": "確認出席" }
      ]
    }
  ],
  "pageUrl": "https://example.github.io/meet-checkin/remote-members/填答手冊-正文.html?name=..."
}
```

---

## collectAnswers 對應的 HTML 結構

`submit-form.js` 掃描以下選擇器：

| 選擇器 | 用途 |
|--------|------|
| `.q`, `.scope-body`, `.resolution` | 題塊 |
| `.field` + input/textarea/select | 欄位 |
| `.opts` + input:checked | 單選／複選群組 |
| `.online-textarea`, `.write-box` | 長文 |
| `.units-full tbody tr` | 附錄 86 單元（`.code`, `.title`, `.need input:checked`, `.note-input`） |

新增題型時須維持上述 class，或同步改 `collectAnswers`。

---

## GAS 部署 URL 格式

```
https://script.google.com/macros/s/{DEPLOYMENT_ID}/exec
```

- `/dev` 為測試用，**不要用於正式前端**
- 每次「新版本」部署後 ID 通常不變；「新增部署」才會產生新 ID

---

## 快取版本慣例

填答手冊 HTML 底部：

```html
<link rel="stylesheet" href="./submit-form.css?v=YYYYMMDDx">
<script src="./submit-form.js?v=YYYYMMDDx"></script>
```

改 JS/CSS 時遞增 suffix（如 `20260629d` → `20260629e`）。

---

## 疑難排解決策樹

```
試算表無資料？
├─ GAS testSignIn / testFormSubmit 失敗 → 修 Code.gs / 試算表綁定
├─ GAS 測試 OK、網頁不行 → 查前端 GAS URL、快取、action 字串
└─ 網頁 Console 403 → 填答確認 no-cors；簽到確認 hidden form

簽到有、填答無？
└─ 填 answers 是否為空？action 是否為 填答-正文/附錄？

成功提示有、試算表無？
└─ no-cors 假陽性 → 後端日誌 + 重新部署 GAS
```

---

## 套版化待辦（非本 skill 必要步驟）

- [ ] `config/event.config.json` 抽離 GAS URL、Meet、聯絡人
- [ ] 統一 `sendToBackend()` 抽象
- [ ] GAS shared secret 防濫用
- [ ] JSON schema 驅動表單生成（取代巨型 HTML）
