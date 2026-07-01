# 雙機協作同步指南｜meet-checkin

> **核心原則：** GitHub 是「唯一真相來源」。兩台電腦的工作都必須 `pull` → 編輯 → `commit` → `push`，才算真正同步。

## 儲存庫資訊

| 項目 | 值 |
|------|-----|
| 遠端 | `https://github.com/chatgptcjcu-boop/meet-checkin.git` |
| 預設分支 | `main` |
| 靜態網站 | `https://chatgptcjcu-boop.github.io/meet-checkin/` |
| 專案總覽 | `dashboard.html` |

## 什麼該進 Git、什麼不該

| 應 commit | 不應 commit |
|-----------|-------------|
| `08-評核委員會/`、`09-教材編審委員會/` | `.cursor/`（已在 .gitignore） |
| `dashboard.html`、`SYNC-WORKFLOW.md` | `.zerodeploy-claim-token` |
| `config/`、`docs/`、`scripts/` | 委員掃描 PDF（含個資，放本機或加密雲端） |
| HTML 模板、議程、進度 JSON | Google 試算表金鑰、GAS 私密 token |

**委員掃描檔：** 建議放 `08-評核委員會/1150630-資料彙整/members/*/scans/` 本機，或另用 Google Drive／加密資料夾；**勿 push 含個資 PDF 至公開 repo**。

## 換機器開始工作（標準流程）

```bash
# 1. 第一次在此機器使用（僅一次）
git clone https://github.com/chatgptcjcu-boop/meet-checkin.git
cd meet-checkin

# 2. 每次開工前（兩台都要做）
git pull origin main

# 3. 工作完成後
git status
git add <檔案或資料夾>
git commit -m "說明這次改了什麼、為什麼"
git push origin main

# 4. 確認 GitHub Pages 更新（HTML 變更後等 1–3 分鐘）
# 瀏覽器硬刷新：https://chatgptcjcu-boop.github.io/meet-checkin/dashboard.html
```

## 另一台電腦已經有舊版 repo

```bash
cd ~/Projects/meet-checkin
git pull origin main
```

若 `pull` 衝突：先不要強制覆蓋，用編輯器解決衝突後再 commit。

## 常見狀況

| 狀況 | 處理 |
|------|------|
| 本機有改動，忘記 push 就換機 | 回原機器 `git push`；新機器 `git pull` |
| `git pull` 說 already up to date 但檔案不見 | 可能在另一分支或未 commit；執行 `git status`、`git log -3` |
| GitHub 有檔案，本機沒有 | `git pull origin main` |
| 改了 HTML 但網站沒更新 | 確認已 push 到 main；Pages 等 1–3 分鐘；Cmd+Shift+R 硬刷新 |
| 只有一台 commit 了 config | 另一台 `git pull` 後執行 `node scripts/sync-config.js`（若改過 event.config.json） |

## 建議每日收尾 Checklist

- [ ] `git status` 無意外未追蹤的重要檔案
- [ ] 已 `commit` + `push`
- [ ] 更新 `dashboard/project-progress.json` 的 `lastUpdated` 與進度
- [ ] 掃描 PDF 已備份（本機／Drive），未誤 push 公開 repo

## 相關連結

- 專案儀表板：[`dashboard.html`](dashboard.html)
- 評核委員會：[`08-評核委員會/index.html`](08-評核委員會/index.html)
- 教材編審委員會：[`09-教材編審委員會/index.html`](09-教材編審委員會/index.html)
