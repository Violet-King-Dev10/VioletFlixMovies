export type MediaKind = 'movie' | 'tv';

export type MediaSearchResult = {
  subjectId?: string | number;
  subject_id?: string | number;
  detailPath?: string;
  detail_path?: string;
  title?: string;
  name?: string;
  poster?: string;
  cover?: string;
  image?: string;
  [key: string]: unknown;
};

export type MediaDetail = MediaSearchResult & {
  subjectId: string | number;
  subject_id?: string | number;
  detailPath?: string;
  subtitles?: unknown[];
};

export type EpisodeResourceParams = {
  subjectId: string;
  detailPath?: string;
  type?: MediaKind;
  se?: number;
  ep?: number;
  locale?: string;
  resolution?: string;
};

const API_BASE_URL =
  typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_FLIX_API_BASE_URL
    ? process.env.EXPO_PUBLIC_FLIX_API_BASE_URL
    : '';

function defaultApiBase() {
  if (typeof window === 'undefined') return 'http://localhost:4000';
  const isLocalDev = ['localhost', '127.0.0.1'].includes(window.location.hostname) && window.location.port !== '4000';
  return isLocalDev ? 'http://localhost:4000' : window.location.origin;
}

export function apiUrl(path: string, params: Record<string, string | number | undefined> = {}) {
  const base = API_BASE_URL || defaultApiBase();
  const url = new URL(path, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
  });
  return url.toString();
}

async function fetchApiJson(path: string, params: Record<string, string | number | undefined> = {}) {
  const res = await fetch(apiUrl(path, params), {
    headers: { Accept: 'application/json, text/plain, */*' },
  });
  if (!res.ok) throw new Error(`VioletFlixTV API ${res.status}: ${res.statusText}`);
  return res.json();
}

function unwrapList(data: unknown): MediaSearchResult[] {
  if (Array.isArray(data)) return data as MediaSearchResult[];
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as MediaSearchResult[];
    if (Array.isArray(record.results)) return record.results as MediaSearchResult[];
    if (Array.isArray(record.items)) return record.items as MediaSearchResult[];
    if (Array.isArray(record.subjects)) return record.subjects as MediaSearchResult[];
  }
  return [];
}

function normalizeSearchItem(item: MediaSearchResult): MediaSearchResult {
  const subjectId = item.subjectId || item.subject_id || item.id as string | number | undefined;
  return {
    ...item,
    subjectId,
    subject_id: item.subject_id || subjectId,
    detailPath: item.detailPath || item.detail_path,
    title: item.title || item.name,
    poster: item.poster || item.cover || item.image,
  };
}

export async function searchMedia(query: string, type: MediaKind = 'movie', _locale = 'en'): Promise<MediaSearchResult[]> {
  const data = await fetchApiJson(`/api/search/${type}`, { q: query });
  return unwrapList(data).map(normalizeSearchItem);
}

export async function getMediaDetail(subjectIdOrPath: string, _locale = 'en'): Promise<MediaDetail> {
  const data = await fetchApiJson(`/api/movie/${encodeURIComponent(subjectIdOrPath)}`);
  const detail = data && typeof data === 'object' && 'data' in data
    ? (data as { data: MediaDetail }).data
    : data as MediaDetail;
  const subjectId = detail.subjectId || detail.subject_id || subjectIdOrPath;
  return { ...detail, subjectId, detailPath: detail.detailPath || detail.detail_path || subjectIdOrPath };
}


export type StreamResource = {
  embed?: string;
  alternatives?: string[];
  [key: string]: unknown;
};

export async function getStreamResource({
  type,
  tmdbId,
  season = 1,
  episode = 1,
}: {
  type: MediaKind;
  tmdbId: string | number;
  season?: string | number;
  episode?: string | number;
}): Promise<StreamResource> {
  const path = type === 'tv' ? '/api/stream/tv' : '/api/stream/movie';
  return fetchApiJson(path, {
    tmdb_id: tmdbId,
    season: type === 'tv' ? season : undefined,
    episode: type === 'tv' ? episode : undefined,
  });
}

export async function getEpisodeResource({
  subjectId,
  detailPath,
  type,
  se,
  ep,
  resolution,
}: EpisodeResourceParams) {
  const isMovie = type === 'movie';
  return fetchApiJson('/api/download', {
    subject_id: subjectId,
    detail_path: detailPath,
    type,
    season: isMovie ? undefined : se,
    episode: isMovie ? undefined : ep,
    resolution,
  });
}
