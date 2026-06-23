import { apiUrl } from './providers';

export type SportMatch = {
  id: string | number;
  match_id?: string | number;
  match_name?: string;
  title?: string;
  league: string;
  home: string;
  away: string;
  home_score?: number | null;
  away_score?: number | null;
  score: string;
  status: string;
  time?: string | number;
  minute?: string | number;
  category?: string;
  ad_guard_safe?: boolean;
};

export type SportLeague = {
  name: string;
  id: string;
  country: string;
};

export type SportStream = {
  name: string;
  url: string;
  type: 'embed' | 'iframe' | string;
};

export type SportDetail = {
  success: boolean;
  match_id: string | number;
  title?: string;
  live_score?: string;
  details?: unknown;
  stream_url?: string;
  stream_urls?: SportStream[];
  download_url?: string | null;
  sandbox_flags?: string;
  sandbox_settings?: string;
  ad_blocker_active?: boolean;
  ad_block_active?: boolean;
  ad_guard?: {
    sandbox: string;
    note: string;
  };
  adGuardHint?: string;
};

type SportsListResponse = {
  success?: boolean;
  status?: string;
  sports?: string[];
  categories?: string[];
};

type SportsMatchesResponse = {
  success?: boolean;
  status?: string;
  matches?: SportMatch[];
  results_count?: number;
  count?: number;
};

async function fetchSportsJson<T>(params: Record<string, string | number | undefined>) {
  const response = await fetch(apiUrl('/api/sports', params), {
    headers: { Accept: 'application/json, text/plain, */*' },
  });

  if (!response.ok) throw new Error(`Sports API ${response.status}: ${response.statusText}`);
  return response.json() as Promise<T>;
}

function splitMatchName(name = '') {
  if (!name.includes(' vs ')) return { home: name || 'Home', away: '' };
  const [home, away] = name.split(' vs ');
  return { home, away };
}

function normalizeMatch(match: SportMatch): SportMatch {
  const id = match.id || match.match_id || '';
  const title = match.title || match.match_name || '';
  const teams = splitMatchName(title);

  return {
    ...match,
    id,
    match_id: match.match_id || id,
    title: title || `${match.home || teams.home} vs ${match.away || teams.away}`,
    home: match.home || teams.home,
    away: match.away || teams.away,
    score: match.score || '?-?',
    time: match.time || (match.minute !== undefined ? `${match.minute}'` : undefined),
    ad_guard_safe: match.ad_guard_safe ?? true,
  };
}

export async function getSportsList() {
  const data = await fetchSportsJson<SportsListResponse>({ data: 'sports' });
  return data.categories || data.sports || [];
}

export async function getSportsMatches(category = 'football', q = '') {
  const data = await fetchSportsJson<SportsMatchesResponse>({ data: 'matches', category, q });
  return (data.matches || []).map(normalizeMatch);
}

export async function getSportsDetail(id: string | number, category = 'football') {
  const detail = await fetchSportsJson<SportDetail>({ data: 'detail', id, category });
  const sandbox = detail.ad_guard?.sandbox || detail.sandbox_flags || detail.sandbox_settings || 'allow-scripts allow-same-origin';

  if ((!detail.stream_urls || detail.stream_urls.length === 0) && detail.stream_url) {
    return {
      ...detail,
      ad_guard: detail.ad_guard || {
        sandbox,
        note: 'Use these sandbox flags on the iframe/WebView and keep popups disabled.',
      },
      stream_urls: [{ name: 'Ad-Guard Stream', url: detail.stream_url, type: 'embed' }],
    };
  }

  return {
    ...detail,
    ad_guard: detail.ad_guard || {
      sandbox,
      note: 'Use these sandbox flags on the iframe/WebView and keep popups disabled.',
    },
  };
}

export async function getSportsLeagues() {
  const data = await fetchSportsJson<{ success?: boolean; leagues: SportLeague[] }>({ data: 'results', category: 'leagues' });
  return data.leagues || [];
}

export async function getSportsTable(league: string) {
  const data = await fetchSportsJson<{ success?: boolean; table: unknown[] }>({ data: 'results', category: 'tables', league });
  return data.table || [];
}
