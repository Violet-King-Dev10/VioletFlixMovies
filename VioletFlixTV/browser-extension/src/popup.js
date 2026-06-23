/* global chrome */
'use strict';

const TOGGLES = ['enabled', 'blockAds', 'blockTrackers', 'blockAnnoyances', 'blockPopups', 'cosmeticFiltering', 'strictVideoMode'];
let state = null;
let activeTabId = null;

function send(message) {
  return new Promise((resolve) => chrome.runtime.sendMessage(message, resolve));
}

function formatRefresh(timestamp) {
  if (!timestamp) return 'Never';
  const diff = Date.now() - timestamp;
  if (diff < 60_000) return 'Just now';
  if (diff < 3_600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3_600_000)}h ago`;
  return `${Math.round(diff / 86_400_000)}d ago`;
}

function setStatus(message, tone) {
  const el = document.getElementById('status');
  el.textContent = message || '';
  el.dataset.tone = tone || '';
}

function render(nextState) {
  state = nextState;
  const settings = state.settings;
  TOGGLES.forEach((key) => {
    document.getElementById(key).checked = Boolean(settings[key]);
  });
  document.getElementById('currentHost').textContent = state.host || 'Extension page';
  const allowed = (settings.allowlist || []).includes(state.host);
  document.getElementById('toggleSite').textContent = allowed ? 'Remove allow' : 'Allowlist';
  document.getElementById('ruleCount').textContent = String(settings.lastRuleCount || state.stats.ruleCount || 0);
  document.getElementById('lastRefresh').textContent = formatRefresh(settings.lastRefresh || state.stats.lastRefresh);
  setStatus(settings.lastError || (allowed ? 'Protection is paused on this site.' : 'Protection active.'), settings.lastError ? 'warn' : '');
}

async function load() {
  const tabs = await new Promise((resolve) => chrome.tabs.query({ active: true, currentWindow: true }, resolve));
  activeTabId = tabs[0]?.id;
  const nextState = await send({ action: 'getState', tabId: activeTabId });
  render(nextState);
}

TOGGLES.forEach((key) => {
  document.addEventListener('change', async (event) => {
    if (event.target?.id !== key) return;
    setStatus('Saving…');
    const response = await send({ action: 'updateSettings', patch: { [key]: event.target.checked } });
    render({ ...state, settings: response.settings });
  });
});

document.getElementById('toggleSite').addEventListener('click', async () => {
  setStatus('Updating current site…');
  const response = await send({ action: 'toggleSite', tabId: activeTabId, host: state.host });
  render({ ...state, settings: response.settings, host: response.host || state.host });
});

document.getElementById('refresh').addEventListener('click', async () => {
  setStatus('Fetching EasyList and selected filters…');
  const response = await send({ action: 'refreshNow' });
  render({ ...state, settings: response.settings });
});

document.getElementById('openOptions').addEventListener('click', () => {
  chrome.runtime.openOptionsPage();
});

load();
