/* global chrome */
'use strict';

let state = null;

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function lines(value) {
  return String(value || '').split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function formatDate(timestamp) {
  if (!timestamp) return 'Never refreshed';
  return new Date(timestamp).toLocaleString();
}

function setStatus(message, tone) {
  const el = document.getElementById('status');
  el.textContent = message || '';
  el.dataset.tone = tone || '';
}

function renderListChoices(settings, lists) {
  const container = document.getElementById('listChoices');
  container.textContent = '';
  Object.entries(lists).forEach(([id, list]) => {
    const label = document.createElement('label');
    label.className = 'list-choice';
    const checked = settings.selectedLists.includes(id) ? 'checked' : '';
    label.innerHTML = `<input type="checkbox" value="${id}" ${checked}> <strong>${list.label}</strong><span>${list.category}</span>`;
    container.appendChild(label);
  });
}

function render(nextState) {
  state = nextState;
  const settings = state.settings;
  renderListChoices(settings, state.lists);
  document.getElementById('autoRefresh').checked = Boolean(settings.autoRefresh);
  document.getElementById('refreshIntervalHours').value = settings.refreshIntervalHours;
  document.getElementById('maxRules').value = settings.maxRules;
  document.getElementById('customAllowlist').value = (settings.customAllowlist || []).join('\n');
  document.getElementById('customBlocklist').value = (settings.customBlocklist || []).join('\n');
  document.getElementById('allowlist').value = (settings.allowlist || []).join('\n');
  document.getElementById('ruleCount').textContent = `${settings.lastRuleCount || 0} rules`;
  document.getElementById('lastRefresh').textContent = formatDate(settings.lastRefresh);
  setStatus(settings.lastError || 'Settings loaded.', settings.lastError ? 'warn' : '');
}

function collectPatch() {
  const selectedLists = [...document.querySelectorAll('#listChoices input:checked')].map((input) => input.value);
  return {
    selectedLists,
    autoRefresh: document.getElementById('autoRefresh').checked,
    refreshIntervalHours: Number(document.getElementById('refreshIntervalHours').value) || 24,
    maxRules: Number(document.getElementById('maxRules').value) || 4200,
    customAllowlist: lines(document.getElementById('customAllowlist').value),
    customBlocklist: lines(document.getElementById('customBlocklist').value),
    allowlist: lines(document.getElementById('allowlist').value)
  };
}

async function load() {
  render(await send({ action: 'getState' }));
}

document.getElementById('save').addEventListener('click', async () => {
  setStatus('Saving and rebuilding rules…');
  const response = await send({ action: 'updateSettings', patch: collectPatch() });
  render({ ...state, settings: response.settings });
});

document.getElementById('refresh').addEventListener('click', async () => {
  setStatus('Downloading lists…');
  const response = await send({ action: 'refreshNow' });
  render({ ...state, settings: response.settings });
});

load();
