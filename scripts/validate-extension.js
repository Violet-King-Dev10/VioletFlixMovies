#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const extensionDir = path.join(root, 'browser-extension');
const manifestPath = path.join(extensionDir, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const requiredFiles = [
  manifest.background.service_worker,
  manifest.action.default_popup,
  manifest.options_page,
  ...manifest.content_scripts.flatMap((script) => script.js),
  'src/popup.js',
  'src/options.js',
  'styles/popup.css',
  'styles/options.css'
];

for (const relativePath of requiredFiles) {
  const fullPath = path.join(extensionDir, relativePath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Missing extension asset: ${relativePath}`);
  }
}

for (const relativePath of requiredFiles.filter((file) => file.endsWith('.js'))) {
  execFileSync(process.execPath, ['--check', path.join(extensionDir, relativePath)], { stdio: 'inherit' });
}

if (manifest.manifest_version !== 3) throw new Error('Extension must use Manifest V3.');
if (!manifest.permissions.includes('declarativeNetRequest')) throw new Error('Missing declarativeNetRequest permission.');
if (!manifest.permissions.includes('alarms')) throw new Error('Missing alarms permission for daily refresh.');

console.log('VioletFlixTV Shield extension manifest and scripts are valid.');
