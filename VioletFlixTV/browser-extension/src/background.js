/* global chrome */
'use strict';

const RULE_ID_START = 1000;
const MAX_DYNAMIC_RULES = 4800;
const ONE_DAY_MINUTES = 24 * 60;
const SETTINGS_KEY = 'flixShieldSettings';
const STATS_KEY = 'flixShieldStats';
const CACHE_KEY = 'flixShieldListCache';

const DEFAULT_SETTINGS = {
  enabled: true,
  blockAds: true,
  blockTrackers: true,
  blockAnnoyances: true,
  blockPopups: true,
  cosmeticFiltering: true,
  strictVideoMode: false,
  autoRefresh: true,
  refreshIntervalHours: 24,
  maxRules: 4200,
  allowlist: [],
  customBlocklist: [],
  customAllowlist: [],
  selectedLists: [
    'easylist',
    'easyprivacy',
    'ublockBadware',
    'ublockPrivacy',
    'ublockAnnoyances',
    'fanboyAnnoyance'
  ],
  lastRefresh: 0,
  lastRuleCount: 0,
  lastError: ''
};

const FILTER_LISTS = {
  easylist: {
    label: 'EasyList',
    category: 'ads',
    url: 'https://easylist.to/easylist/easylist.txt'
  },
  easyprivacy: {
    label: 'EasyPrivacy',
    category: 'trackers',
    url: 'https://easylist.to/easylist/easyprivacy.txt'
  },
  ublockBadware: {
    label: 'uBlock Badware',
    category: 'ads',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/badware.txt'
  },
  ublockPrivacy: {
    label: 'uBlock Privacy',
    category: 'trackers',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/privacy.txt'
  },
  ublockAnnoyances: {
    label: 'uBlock Annoyances',
    category: 'annoyances',
    url: 'https://raw.githubusercontent.com/uBlockOrigin/uAssets/master/filters/annoyances.txt'
  },
  fanboyAnnoyance: {
    label: 'Fanboy Annoyance',
    category: 'annoyances',
    url: 'https://secure.fanboy.co.nz/fanboy-annoyance.txt'
  },
  fanboySocial: {
    label: 'Fanboy Social',
    category: 'annoyances',
    url: 'https://secure.fanboy.co.nz/fanboy-social.txt'
  },
  adguardTracking: {
    label: 'AdGuard Tracking Protection',
    category: 'trackers',
    url: 'https://filters.adtidy.org/extension/chromium/filters/3.txt'
  }
};

const RESOURCE_TYPES = new Set([
  'main_frame',
  'sub_frame',
  'stylesheet',
  'script',
  'image',
  'font',
  'object',
  'xmlhttprequest',
  'ping',
  'csp_report',
  'media',
  'websocket',
  'webtransport',
  'webbundle',
  'other'
]);

const OPTION_RESOURCE_MAP = {
  script: 'script',
  image: 'image',
  media: 'media',
  object: 'object',
  font: 'font',
  stylesheet: 'stylesheet',
  css: 'stylesheet',
  xhr: 'xmlhttprequest',
  xmlhttprequest: 'xmlhttprequest',
  subdocument: 'sub_frame',
  sub_frame: 'sub_frame',
  document: 'main_frame',
  popup: 'main_frame',
  ping: 'ping',
  websocket: 'websocket',
  other: 'other'
};

const CATEGORY_PRESETS = {
  ads: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media', 'object', 'other'],
  trackers: ['script', 'image', 'xmlhttprequest', 'ping', 'sub_frame', 'other'],
  annoyances: ['script', 'image', 'stylesheet', 'sub_frame', 'other'],
  custom: ['script', 'image', 'xmlhttprequest', 'sub_frame', 'media', 'stylesheet', 'font', 'other']
};

function storageGet(keys) {
  return new Promise((resolve) => chrome.storage.local.get(keys, resolve));
}

function storageSet(value) {
  return new Promise((resolve) => chrome.storage.local.set(value, resolve));
}

function getDynamicRules() {
  return new Promise((resolve) => chrome.declarativeNetRequest.getDynamicRules(resolve));
}

function updateDynamicRules(options) {
  return new Promise((resolve) => chrome.declarativeNetRequest.updateDynamicRules(options, resolve));
}

async function getSettings() {
  const stored = await storageGet(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...(stored[SETTINGS_KEY] || {}) };
}

async function saveSettings(settings) {
  await storageSet({ [SETTINGS_KEY]: { ...DEFAULT_SETTINGS, ...settings } });
}

function normalizeHost(host) {
  return String(host || '')
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .split('/')[0]
    .toLowerCase();
}

function parseFilterLine(line, category, id) {
  const raw = String(line || '').trim();
  if (!raw || raw.startsWith('!') || raw.startsWith('[') || raw.includes('##') || raw.includes('#@#')) return null;
  if (raw.startsWith('@@')) return null;

  const parts = raw.split('$');
  let pattern = parts[0].trim();
  const optionText = parts.slice(1).join('$').toLowerCase();
  if (!pattern || pattern.length < 3) return null;
  if (pattern.includes('*') && pattern.replace(/[\*\^\|\.\/-]/g, '').length < 3) return null;

  const condition = { resourceTypes: [...CATEGORY_PRESETS[category]] || [...CATEGORY_PRESETS.custom] };

  if (optionText) {
    const options = optionText.split(',').map((option) => option.trim()).filter(Boolean);
    const resources = [];
    const domains = [];
    const excludedDomains = [];
    let thirdParty = false;

    for (const option of options) {
      if (option.startsWith('~')) {
        const resource = OPTION_RESOURCE_MAP[option.slice(1)];
        if (resource) continue;
      }

      if (option === 'third-party' || option === '3p') thirdParty = true;
      if (OPTION_RESOURCE_MAP[option]) resources.push(OPTION_RESOURCE_MAP[option]);
      if (option.startsWith('domain=')) {
        for (const domainPart of option.slice(7).split('|')) {
          const normalized = normalizeHost(domainPart.replace(/^~/, ''));
          if (!normalized) continue;
          if (domainPart.startsWith('~')) excludedDomains.push(normalized);
          else domains.push(normalized);
        }
      }
    }

    if (resources.length > 0) condition.resourceTypes = [...new Set(resources)].filter((type) => RESOURCE_TYPES.has(type));
    if (domains.length > 0) condition.initiatorDomains = domains.slice(0, 50);
    if (excludedDomains.length > 0) condition.excludedInitiatorDomains = excludedDomains.slice(0, 50);
    if (thirdParty) condition.domainType = 'thirdParty';
  }

  if (condition.resourceTypes.length === 0) return null;

  pattern = pattern.replace(/^\|\|/, '').replace(/^\|/, '').replace(/\|$/, '').replace(/\^/g, '/');
  pattern = pattern.replace(/\*/g, '');
  pattern = pattern.replace(/^https?:\/\//, '');
  pattern = pattern.trim();

  if (!pattern || pattern.length < 3 || pattern.length > 240) return null;
  if (/^[a-z0-9.-]+\/$/i.test(pattern)) pattern = pattern.slice(0, -1);

  condition.urlFilter = pattern;
  return {
    id,
    priority: category === 'custom' ? 3 : 1,
    action: { type: 'block' },
    condition
  };
}

function domainRule(domain, id, actionType) {
  const host = normalizeHost(domain);
  if (!host) return null;
  return {
    id,
    priority: actionType === 'allow' ? 10 : 4,
    action: { type: actionType },
    condition: {
      requestDomains: [host],
      resourceTypes: [...RESOURCE_TYPES]
    }
  };
}


function applyAllowlistExclusions(rule, allowDomains) {
  if (!rule || rule.action?.type !== 'block' || allowDomains.length === 0) return rule;
  rule.condition.excludedInitiatorDomains = [
    ...new Set([...(rule.condition.excludedInitiatorDomains || []), ...allowDomains])
  ].slice(0, 100);
  return rule;
}

function isCategoryEnabled(category, settings) {
  if (category === 'ads') return settings.blockAds;
  if (category === 'trackers') return settings.blockTrackers;
  if (category === 'annoyances') return settings.blockAnnoyances;
  return true;
}

async function fetchList(listId) {
  const list = FILTER_LISTS[listId];
  if (!list) return '';
  const response = await fetch(list.url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`${list.label} failed with ${response.status}`);
  return response.text();
}

async function buildRules(settings, cache) {
  if (!settings.enabled) return [];

  let nextId = RULE_ID_START;
  const rules = [];
  const allowDomains = [...new Set([...(settings.allowlist || []), ...(settings.customAllowlist || [])].map(normalizeHost).filter(Boolean))];
  const selectedLists = settings.selectedLists.filter((id) => FILTER_LISTS[id] && isCategoryEnabled(FILTER_LISTS[id].category, settings));

  for (const domain of settings.customAllowlist) {
    const rule = domainRule(domain, nextId, 'allow');
    if (rule) {
      rules.push(rule);
      nextId += 1;
    }
  }

  for (const domain of settings.allowlist) {
    const rule = domainRule(domain, nextId, 'allow');
    if (rule) {
      rules.push(rule);
      nextId += 1;
    }
  }

  for (const pattern of settings.customBlocklist) {
    const rule = parseFilterLine(pattern, 'custom', nextId);
    if (rule) {
      rules.push(applyAllowlistExclusions(rule, allowDomains));
      nextId += 1;
    }
  }

  const usableRuleBudget = Math.min(Number(settings.maxRules) || DEFAULT_SETTINGS.maxRules, MAX_DYNAMIC_RULES);
  for (const listId of selectedLists) {
    const list = FILTER_LISTS[listId];
    const text = cache[listId]?.text || '';
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      if (rules.length >= usableRuleBudget) return rules;
      const rule = parseFilterLine(line, list.category, nextId);
      if (!rule) continue;
      rules.push(applyAllowlistExclusions(rule, allowDomains));
      nextId += 1;
    }
  }

  return rules;
}

async function refreshRules(forceFetch) {
  const settings = await getSettings();
  const stored = await storageGet([CACHE_KEY, STATS_KEY]);
  const cache = stored[CACHE_KEY] || {};
  const now = Date.now();
  const errors = [];

  if (settings.enabled) {
    for (const listId of settings.selectedLists) {
      const list = FILTER_LISTS[listId];
      const stale = !cache[listId]?.updatedAt || now - cache[listId].updatedAt > ONE_DAY_MINUTES * 60 * 1000;
      if (!list || !isCategoryEnabled(list.category, settings) || (!forceFetch && !stale)) continue;
      try {
        cache[listId] = { text: await fetchList(listId), updatedAt: now };
      } catch (error) {
        errors.push(error instanceof Error ? error.message : `Unable to fetch ${listId}`);
      }
    }
  }

  const rules = await buildRules(settings, cache);
  const existing = await getDynamicRules();
  await updateDynamicRules({
    removeRuleIds: existing.map((rule) => rule.id),
    addRules: rules
  });

  const nextSettings = {
    ...settings,
    lastRefresh: now,
    lastRuleCount: rules.length,
    lastError: errors.join(' • ')
  };
  await storageSet({
    [SETTINGS_KEY]: nextSettings,
    [CACHE_KEY]: cache,
    [STATS_KEY]: {
      ...(stored[STATS_KEY] || {}),
      lastRefresh: now,
      ruleCount: rules.length,
      errors
    }
  });
  await scheduleRefresh(nextSettings);
  return nextSettings;
}

async function scheduleRefresh(settings) {
  await chrome.alarms.clear('refreshLists');
  if (!settings.autoRefresh || !settings.enabled) return;
  chrome.alarms.create('refreshLists', {
    periodInMinutes: Math.max(60, Number(settings.refreshIntervalHours || 24) * 60),
    delayInMinutes: 5
  });
}

async function updateSettings(patch, refresh) {
  const settings = await getSettings();
  const next = { ...settings, ...patch };
  await saveSettings(next);
  await scheduleRefresh(next);
  if (refresh) return refreshRules(false);
  return next;
}

async function getTabHost(tabId) {
  if (!tabId) return '';
  const tab = await new Promise((resolve) => chrome.tabs.get(tabId, resolve));
  try {
    return normalizeHost(new URL(tab.url || '').hostname);
  } catch {
    return '';
  }
}

chrome.runtime.onInstalled.addListener(() => {
  getSettings().then((settings) => saveSettings(settings).then(() => refreshRules(true)));
});

chrome.runtime.onStartup.addListener(() => {
  getSettings().then((settings) => scheduleRefresh(settings).then(() => refreshRules(false)));
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshLists') refreshRules(true);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const action = message?.action;
  if (action === 'getState') {
    Promise.all([getSettings(), storageGet(STATS_KEY), getTabHost(message.tabId || sender.tab?.id)]).then(([settings, stats, host]) => {
      sendResponse({ settings, stats: stats[STATS_KEY] || {}, host, lists: FILTER_LISTS });
    });
    return true;
  }

  if (action === 'updateSettings') {
    updateSettings(message.patch || {}, true).then((settings) => sendResponse({ settings }));
    return true;
  }

  if (action === 'refreshNow') {
    refreshRules(true).then((settings) => sendResponse({ settings }));
    return true;
  }

  if (action === 'toggleSite') {
    getSettings().then(async (settings) => {
      const host = normalizeHost(message.host || await getTabHost(message.tabId));
      const allowlist = new Set(settings.allowlist || []);
      if (allowlist.has(host)) allowlist.delete(host);
      else if (host) allowlist.add(host);
      const next = await updateSettings({ allowlist: [...allowlist] }, true);
      sendResponse({ settings: next, host });
    });
    return true;
  }

  return false;
});
