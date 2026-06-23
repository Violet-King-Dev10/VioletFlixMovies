/* global chrome */
'use strict';

const STYLE_ID = 'violetflixtv-shield-style';
const DEFAULT_HIDE_SELECTORS = [
  '[id^="ad_"]',
  '[id*="_ad_"]',
  '[id*="ads"]',
  '[class^="ad-"]',
  '[class*=" ad-"]',
  '[class*="adsbygoogle"]',
  '[class*="advert"]',
  '[class*="banner-ad"]',
  '[class*="popup"]',
  '[class*="sponsor"]',
  'iframe[src*="doubleclick"]',
  'iframe[src*="googlesyndication"]',
  'iframe[src*="adservice"]',
  'iframe[src*="taboola"]',
  'iframe[src*="outbrain"]'
];

const STREAMING_HIDE_SELECTORS = [
  '.modal-backdrop',
  '.overlay-ad',
  '.preroll',
  '.vast-ad',
  '.video-ads',
  '[class*="skip-ad"]',
  '[class*="ad-container"]'
];

let currentSettings = null;
let observer = null;

function normalizeHost(host) {
  return String(host || '').replace(/^www\./, '').toLowerCase();
}

function isAllowed(settings) {
  const host = normalizeHost(location.hostname);
  return (settings.allowlist || []).some((domain) => host === normalizeHost(domain) || host.endsWith(`.${normalizeHost(domain)}`));
}

function applyCosmeticFilters(settings) {
  const existing = document.getElementById(STYLE_ID);
  if (existing) existing.remove();

  if (!settings.enabled || !settings.cosmeticFiltering || isAllowed(settings)) return;

  const selectors = [...DEFAULT_HIDE_SELECTORS];
  if (settings.blockAnnoyances) selectors.push(...STREAMING_HIDE_SELECTORS);
  if (settings.strictVideoMode) {
    selectors.push('[class*="recommended"]', '[class*="related"]', '[class*="newsletter"]');
  }

  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `${selectors.join(',\n')} { display: none !important; visibility: hidden !important; }`;
  (document.documentElement || document.head).appendChild(style);
}

function closePopups(settings) {
  if (!settings.enabled || !settings.blockPopups || isAllowed(settings)) return;
  const suspicious = document.querySelectorAll('[role="dialog"], .modal, .popup, .pop-up, [class*="interstitial"]');
  suspicious.forEach((node) => {
    const rect = node.getBoundingClientRect();
    const text = (node.textContent || '').toLowerCase();
    const looksAdLike = text.includes('advert') || text.includes('sponsor') || text.includes('continue to') || rect.width > window.innerWidth * 0.45;
    if (looksAdLike) node.remove();
  });
}

function startObserver(settings) {
  if (observer) observer.disconnect();
  if (!settings.enabled || isAllowed(settings)) return;

  observer = new MutationObserver(() => closePopups(settings));
  observer.observe(document.documentElement, { childList: true, subtree: true });
}

function applySettings(settings) {
  currentSettings = settings;
  applyCosmeticFilters(settings);
  closePopups(settings);
  startObserver(settings);
}

function loadSettings() {
  chrome.runtime.sendMessage({ action: 'getState' }, (state) => {
    if (chrome.runtime.lastError || !state?.settings) return;
    applySettings(state.settings);
  });
}

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes.flixShieldSettings?.newValue) return;
  applySettings(changes.flixShieldSettings.newValue);
});

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadSettings, { once: true });
} else {
  loadSettings();
}

window.addEventListener('pageshow', () => {
  if (currentSettings) applySettings(currentSettings);
});
