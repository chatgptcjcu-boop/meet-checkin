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

syncRegistry(preset);

execSync('node scripts/sync-config.js', { cwd: root, stdio: 'inherit' });
console.log('完成。請 push 後硬刷新瀏覽器。');

function syncRegistry(activeId) {
  const registryPath = path.join(root, 'config', 'events-registry.json');
  if (!fs.existsSync(registryPath)) return;

  const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
  const eventsDir = path.join(root, 'config', 'events');
  let changed = false;

  for (const ev of registry.events) {
    if (ev.status === 'active' && ev.id !== activeId) {
      const standby = readStandbyStatus(ev.id, eventsDir);
      ev.status = standby;
      writePresetLifecycle(ev.id, standby, eventsDir);
      changed = true;
      console.log('registry：' + ev.id + ' → ' + standby);
    }
  }

  const target = registry.events.find((e) => e.id === activeId);
  if (target && target.status !== 'active') {
    target.status = 'active';
    writePresetLifecycle(activeId, 'active', eventsDir);
    changed = true;
    console.log('registry：' + activeId + ' → active');
  }

  if (changed) {
    registry.lastUpdated = new Date().toISOString().slice(0, 10);
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
  }
}

function readStandbyStatus(presetId, eventsDir) {
  const presetPath = path.join(eventsDir, presetId + '.json');
  if (!fs.existsSync(presetPath)) return 'preparing';
  const data = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  const s = data.meta && data.meta.lifecycle && data.meta.lifecycle.status;
  if (s === 'completed') return 'completed';
  if (s === 'planned' || s === 'preparing') return s;
  return 'preparing';
}

function writePresetLifecycle(presetId, status, eventsDir) {
  const presetPath = path.join(eventsDir, presetId + '.json');
  if (!fs.existsSync(presetPath)) return;
  const data = JSON.parse(fs.readFileSync(presetPath, 'utf8'));
  if (!data.meta) data.meta = {};
  if (!data.meta.lifecycle) data.meta.lifecycle = {};
  data.meta.lifecycle.status = status;
  fs.writeFileSync(presetPath, JSON.stringify(data, null, 2) + '\n');
}
