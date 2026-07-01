#!/usr/bin/env node
/**
 * 將 config/event.config.json 同步為 config/event.config.js
 * 用法：node scripts/sync-config.js
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const jsonPath = path.join(root, 'config', 'event.config.json');
const jsPath = path.join(root, 'config', 'event.config.js');

const config = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
const banner =
  '/** 由 config/event.config.json 自動產生 — 執行 node scripts/sync-config.js 同步 */\n';
const body =
  banner + 'window.EVENT_CONFIG = ' + JSON.stringify(config, null, 2) + ';\n';

fs.writeFileSync(jsPath, body, 'utf8');
console.log('已同步 → config/event.config.js');
