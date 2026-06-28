#!/bin/bash
# 完成 gh auth 後執行此腳本，一鍵部署至 GitHub Pages
set -euo pipefail
export PATH="$HOME/bin:$PATH"
cd "$(dirname "$0")"

if ! gh auth status &>/dev/null; then
  echo "錯誤：gh 尚未登入。請執行：gh auth login --hostname github.com --git-protocol https --web"
  exit 1
fi

gh repo create meet-checkin --public --source=. --remote=origin --push 2>/dev/null || {
  git remote add origin https://github.com/chatgptcjcu-boop/meet-checkin.git 2>/dev/null || true
  git push -u origin main
}

gh api repos/chatgptcjcu-boop/meet-checkin/pages -X POST \
  -f build_type=legacy -f source[branch]=main -f source[path]=/ 2>/dev/null || \
gh api repos/chatgptcjcu-boop/meet-checkin/pages -X PUT \
  -f build_type=legacy -f source[branch]=main -f source[path]=/

echo "等待 GitHub Pages 上線..."
for i in $(seq 1 36); do
  CODE=$(curl -sI -o /dev/null -w "%{http_code}" https://chatgptcjcu-boop.github.io/meet-checkin/)
  if [ "$CODE" = "200" ]; then
    echo "上線成功：https://chatgptcjcu-boop.github.io/meet-checkin/"
    exit 0
  fi
  sleep 5
done
echo "Pages 可能仍在建置中，請稍後再試：https://chatgptcjcu-boop.github.io/meet-checkin/"
