import { animeStream, searchAnime } from './anime';
import { getStreamResource } from './providers';
import { getStreamUrl, StreamType } from './streamService';

export type ResolvedStreamSource = {
  url: string;
  provider: 'flix-api' | 'megaplay' | 'vidsrc';
};

type ResolveStreamParams = {
  id: string | number;
  type: StreamType;
  title?: string | null;
  season?: string | number;
  episode?: string | number;
  malId?: string | number | null;
};

const URL_RE = /https?:\/\/[^\s"'<>\\]+/gi;

function cleanTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function stringsFromUnknown(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 8 || value == null) return out;

  if (typeof value === 'string') {
    out.push(value);
    const decoded = value.replace(/\\\//g, '/');
    if (decoded !== value) out.push(decoded);
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach(item => stringsFromUnknown(item, out, depth + 1));
    return out;
  }

  if (typeof value === 'object') {
    Object.values(value as Record<string, unknown>).forEach(item => stringsFromUnknown(item, out, depth + 1));
  }

  return out;
}

function urlPriority(url: string) {
  if (/\.m3u8(?:\?|$)/i.test(url)) return 0;
  if (/\.mp4(?:\?|$)/i.test(url)) return 1;
  if (/vidsrc/i.test(url)) return 2;
  if (/megaplay/i.test(url)) return 4;
  if (/embed|stream|player|watch|download/i.test(url)) return 3;
  return 5;
}

export function extractBestUrl(value: unknown): string | null {
  const urls = stringsFromUnknown(value)
    .flatMap(item => item.match(URL_RE) || [])
    .map(item => item.replace(/[),.]+$/, ''))
    .filter((item, index, list) => list.indexOf(item) === index)
    .filter(item => !/\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i.test(item))
    .sort((a, b) => urlPriority(a) - urlPriority(b));

  return urls[0] || null;
}

function firstStreamUrl(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (Array.isArray(record.sources)) {
      const sourceUrl = record.sources
        .map(item => item && typeof item === 'object' ? (item as Record<string, unknown>).url : null)
        .find((url): url is string => typeof url === 'string' && url.length > 0);
      if (sourceUrl) return sourceUrl;
    }
    if (typeof record.embed === 'string' && record.embed) return record.embed;
    if (Array.isArray(record.alternatives)) {
      const alternative = record.alternatives.find(item => typeof item === 'string' && item);
      if (typeof alternative === 'string') return alternative;
    }
  }

  return extractBestUrl(value);
}

async function resolveMovieEmbedSource(tmdbId: string | number): Promise<ResolvedStreamSource | null> {
  const data = await getStreamResource({ type: 'movie', tmdbId });
  const url = firstStreamUrl(data);
  return url ? { url, provider: 'flix-api' } : null;
}

async function resolveTVEmbedSource(
  tmdbId: string | number,
  season: string | number = 1,
  episode: string | number = 1,
): Promise<ResolvedStreamSource | null> {
  const data = await getStreamResource({ type: 'tv', tmdbId, season, episode });
  const url = firstStreamUrl(data);
  return url ? { url, provider: 'flix-api' } : null;
}

export async function resolveAnimeStreamSource(
  title?: string | null,
  episode: string | number = 1,
  malId?: string | number | null,
): Promise<ResolvedStreamSource | null> {
  if (!title?.trim() && !malId) return null;

  let resolvedMalId = malId ? String(malId) : null;

  if (!resolvedMalId && title?.trim()) {
    const results = await searchAnime(title);
    const target = cleanTitle(title);
    const match = results.find(item => cleanTitle(item.title) === target) || results[0];
    resolvedMalId = match?.mal_id ? String(match.mal_id) : match?.slug || null;
  }

  const data = await animeStream({ malId: resolvedMalId, title, episode, lang: 'sub' });
  const url = extractBestUrl(data.player) || extractBestUrl(data.embed) || extractBestUrl(data);
  if (!url) return null;
  return { url, provider: /megaplay/i.test(url) ? 'megaplay' : 'vidsrc' };
}

export async function resolveStreamSource(params: ResolveStreamParams): Promise<ResolvedStreamSource | null> {
  if (params.type === 'movie') {
    const movieSource = await resolveMovieEmbedSource(params.id);
    if (movieSource) return movieSource;
  }

  if (params.type === 'tv') {
    const tvSource = await resolveTVEmbedSource(params.id, params.season, params.episode);
    if (tvSource) return tvSource;
  }

  if (params.type === 'anime') {
    const animeSource = await resolveAnimeStreamSource(params.title, params.episode, params.malId);
    if (animeSource) return animeSource;
  }

  const fallbackUrl = getStreamUrl(params);
  return fallbackUrl ? { url: fallbackUrl, provider: 'vidsrc' } : null;
}
