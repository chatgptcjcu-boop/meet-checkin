#!/usr/bin/env node
/**
 * 切換活動設定：複製 config/events/{preset}.json → event.config.json，再執行 sync-config.js
 * 用法：node scripts/switch-event.js 1150730-editorial
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const root = path.join(__dirname, '..');
const preset = process.argv[2];

if (!preset) {
  console.error('用法：node scripts/switch-event.js <preset-id>');
  console.error('範例：node scripts/switch-event.js 1150730-editorial');
  const dir = path.join(root, 'config', 'events');
  if (fs.existsSync(dir)) {
    const presets = fs.readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace(/\.json$/, ''));
    if (presets.length) console.error('可用 preset：', presets.join(', '));
  }
  process.exit(1);
}

const src = path.join(root, 'config', 'events', preset + '.json');
const dest = path.join(root, 'config', 'event.config.json');

if (!fs.existsSync(src)) {
  console.error('找不到 preset：', src);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log('已切換 → config/event.config.json（來源：' + preset + '.json）');

execSync('node scripts/sync-config.js', { cwd: root, stdio: 'inherit' });
console.log('完成。請 push 後硬刷新瀏覽器。');
