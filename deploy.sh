#!/bin/bash
# 重新部署報到頁至 ZeroDeploy（每次部署會重置 72 小時有效期）
set -euo pipefail
cd "$(dirname "$0")"

CLAIM_TOKEN_FILE=".zerodeploy-claim-token"
CLAIM_HEADER=()
if [ -f "$CLAIM_TOKEN_FILE" ]; then
  CLAIM_HEADER=(-H "X-Claim-Token: $(cat "$CLAIM_TOKEN_FILE")")
fi

RESPONSE=$(curl -sS -X POST "https://api.zerodeploy.dev/drop" \
  -H "Content-Type: text/html" \
  -H "X-Filename: index.html" \
  "${CLAIM_HEADER[@]}" \
  --data-binary @index.html)

echo "$RESPONSE" | python3 -c "
import json, sys
data = json.load(sys.stdin)
print('Live URL:', data['data']['url'])
print('Expires:', data['data']['expires_at'])
if 'claim_token' in data['data']:
    open('.zerodeploy-claim-token', 'w').write(data['data']['claim_token'])
    print('Claim token saved to .zerodeploy-claim-token')
if 'next_steps' in data and 'claim' in data['next_steps']:
    print('Claim URL:', data['next_steps']['claim']['url'])
"
