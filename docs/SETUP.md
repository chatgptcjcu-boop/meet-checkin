# 部署指南（SETUP）

完整 SOP 亦見 `.cursor/skills/meet-checkin-kit/SKILL.md`。

## 1. 複製專案

```bash
git clone https://github.com/YOUR/meet-checkin.git my-event-checkin
cd my-event-checkin
```

## 2. 設定 config

編輯 `config/event.config.json`：

- `backend.gasWebAppUrl` — 稍後 GAS 部署後填入
- `meet.url` — Google Meet
- `contact` — PDF 回傳對象
- `event.*` / `org.*` — 活動文案

```bash
node scripts/sync-config.js
```

## 3. Google 試算表 + GAS

1. 新建試算表
2. **擴充功能 → Apps Script**（勿用獨立專案）
3. 貼上 `gas/Code.gs`，`SPREADSHEET_ID` 留空
4. 執行 `testSignIn`、`testFormSubmit` 確認寫入
5. **部署 → Web 應用程式**（執行身分：我；存取：任何人）
6. 複製 `/exec` URL → 寫入 `config/event.config.json` → 再 sync

## 4. GitHub Pages

Repository → Settings → Pages → Branch: **main** / **/**

```bash
git add config/ index.html remote-members/
git commit -m "設定新活動"
git push origin main
```

## 5. 驗收

- [ ] 簽到 → 工作表1
- [ ] 填答正文／附錄 → 填答紀錄
- [ ] 列印 PDF 版面正常
- [ ] 硬刷新後 config 文案正確

## 6. 自訂填答內容

複製 `remote-members/填答手冊-正文.html` 修改題目，或保留範本僅改封面（已由 config 注入）。

---

**常見錯誤**：GAS 未新版本部署、GAS URL 不一致、瀏覽器快取舊 JS → 見 SKILL 故障排除章。
