const AD_GUARD_CONFIG = 'allow-scripts allow-same-origin';
const STREAM_BASE = process.env.SPORTS_STREAM_BASE_URL || 'https://vidsrc.me/embed/sports';

const SPORTS_CATEGORIES = ['football', 'wwe', 'basketball', 'tennis', 'ufc'];

const LIVE_DATA = [
  {
    id: '101',
    home: 'PSG',
    away: 'Real Madrid',
    home_score: 2,
    away_score: 1,
    status: 'LIVE',
    minute: '74',
    category: 'football',
    league: 'Champions League',
    stream: 'https://example.com/stream1',
  },
  {
    id: '102',
    home: 'Arsenal',
    away: 'Liverpool',
    home_score: 0,
    away_score: 0,
    status: 'UPCOMING',
    minute: '0',
    category: 'football',
    league: 'Premier League',
    stream: 'https://example.com/stream2',
  },
  {
    id: 'wwe-1',
    home: 'Roman Reigns',
    away: 'Cody Rhodes',
    home_score: null,
    away_score: null,
    status: 'LIVE',
    minute: '0',
    category: 'wwe',
    league: 'WrestleMania',
    stream: 'https://archive.org/download/wwe_sample/match.mp4',
  },
];

const SPORTS_LEAGUES = [
  { name: 'Champions League', id: 'UCL', country: 'Europe' },
  { name: 'Premier League', id: 'PL', country: 'England' },
  { name: 'WrestleMania', id: 'WWE-WM', country: 'WWE' },
];

const LEAGUE_TABLES = {
  PL: [
    { rank: 1, team: 'Man City', played: 20, points: 50, mp: 20, pts: 50 },
    { rank: 2, team: 'Liverpool', played: 20, points: 48, mp: 20, pts: 48 },
  ],
  default: [
    { rank: 1, team: 'Man City', played: 20, points: 50, mp: 20, pts: 50 },
    { rank: 2, team: 'Liverpool', played: 20, points: 48, mp: 20, pts: 48 },
  ],
};

function normalizeCategory(category) {
  return String(category || '').trim().toLowerCase();
}

function cleanStreamUrl(rawUrl) {
  if (!rawUrl) return null;

  try {
    const cleanUrl = new URL(rawUrl);
    ['affiliate', 'pop', 'utm_source', 'utm_medium', 'utm_campaign'].forEach((param) => {
      cleanUrl.searchParams.delete(param);
    });
    return cleanUrl.toString();
  } catch {
    return null;
  }
}

function fallbackStreamUrl(id) {
  return `${STREAM_BASE.replace(/\/$/, '')}/${encodeURIComponent(id)}`;
}

function formatScore(match) {
  if (match.status === 'UPCOMING') return '?-?';
  if (match.home_score === null || match.away_score === null) return 'Live';
  return `${match.home_score}-${match.away_score}`;
}

function formatMinute(match) {
  if (match.status === 'UPCOMING') return '0\'';
  return `${match.minute || '0'}'`;
}

function toMatchResult(match) {
  const title = `${match.home} vs ${match.away}`;

  return {
    match_id: match.id,
    match_name: title,
    id: match.id,
    title,
    home: match.home,
    away: match.away,
    home_score: match.home_score,
    away_score: match.away_score,
    score: formatScore(match),
    status: match.status,
    time: formatMinute(match),
    minute: match.minute,
    category: match.category,
    league: match.league,
    ad_guard_safe: true,
  };
}

function findMatch(id) {
  return LIVE_DATA.find((match) => match.id === id);
}

function getMatches({ category, q } = {}) {
  const normalizedCategory = normalizeCategory(category);
  const query = String(q || '').trim().toLowerCase();
  let matches = LIVE_DATA;

  if (normalizedCategory) {
    matches = matches.filter((match) => match.category === normalizedCategory);
  }

  if (query) {
    matches = matches.filter((match) => (
      match.home.toLowerCase().includes(query)
      || match.away.toLowerCase().includes(query)
      || match.league.toLowerCase().includes(query)
    ));
  }

  return matches;
}

function getDownloadPath(id) {
  return `/download?file_id=${encodeURIComponent(id)}`;
}

function getProxyDownloadPath(id) {
  return `/api/sports/download?file_id=${encodeURIComponent(id)}`;
}

function getMatchDetail(match, { proxyDownload = false } = {}) {
  const safeStream = cleanStreamUrl(match.stream) || fallbackStreamUrl(match.id);
  const downloadUrl = proxyDownload ? getProxyDownloadPath(match.id) : getDownloadPath(match.id);

  return {
    match_id: match.id,
    title: `${match.home} vs ${match.away}`,
    live_score: formatScore(match),
    stream_url: safeStream,
    stream_urls: [
      { name: 'Ad-Guard Stream', url: safeStream, type: 'embed' },
    ],
    download_url: downloadUrl,
    sandbox_flags: AD_GUARD_CONFIG,
    sandbox_settings: AD_GUARD_CONFIG,
    ad_blocker_active: true,
    ad_block_active: true,
    ad_guard: {
      sandbox: AD_GUARD_CONFIG,
      note: 'Use these sandbox flags on the iframe/WebView and keep popups disabled.',
    },
    adGuardHint: 'Render streams in a sandboxed iframe/WebView and disable multiple windows to block popups.',
  };
}

async function getSportsData(query = {}, options = {}) {
  const data = query.data || 'sports';
  const category = normalizeCategory(query.category);
  const id = query.id ? String(query.id) : '';
  const q = query.q ? String(query.q) : '';
  const league = query.league ? String(query.league) : '';

  if (data === 'sports') {
    return {
      status: 'success',
      categories: SPORTS_CATEGORIES,
      sports: SPORTS_CATEGORIES,
    };
  }

  if (data === 'matches') {
    const matches = getMatches({ category, q }).map(toMatchResult);
    return {
      status: 'success',
      category: category || 'all',
      results_count: matches.length,
      count: matches.length,
      matches,
    };
  }

  if (data === 'detail' && id) {
    const match = findMatch(id);
    if (!match) return { error: 'Match not found' };
    return getMatchDetail(match, options);
  }

  if (data === 'results' && category === 'leagues') {
    return {
      status: 'success',
      leagues: SPORTS_LEAGUES,
    };
  }

  if (data === 'results' && category === 'tables') {
    return {
      status: 'success',
      league: league || 'PL',
      table: LEAGUE_TABLES[league] || LEAGUE_TABLES.default,
    };
  }

  return { error: 'Invalid endpoint' };
}

async function getSportsApiResponse(query = {}) {
  const payload = await getSportsData(query, { proxyDownload: true });

  if (payload && typeof payload === 'object' && payload.error) {
    return { statusCode: payload.error === 'Match not found' ? 404 : 400, body: payload };
  }

  return { statusCode: 200, body: { success: true, ...payload } };
}

module.exports = {
  AD_GUARD_CONFIG,
  LIVE_DATA,
  SPORTS_CATEGORIES,
  cleanStreamUrl,
  getSportsData,
  getSportsApiResponse,
};
