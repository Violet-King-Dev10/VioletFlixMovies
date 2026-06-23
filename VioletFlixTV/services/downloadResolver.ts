import { getEpisodeResource, searchMedia } from './providers';
import type { MediaKind, MediaSearchResult } from './providers';

export type DownloadKind = MediaKind | 'anime';

export type ResolvedDownloadSource = {
  url: string;
  provider: 'omnisave';
  fallback?: boolean;
  subjectId?: string;
};

type ResolveDownloadParams = {
  id?: string | number;
  title?: string | null;
  titles?: (string | null | undefined)[];
  type: DownloadKind;
  season?: string | number;
  episode?: string | number;
  malId?: string | number | null;
  year?: string | number | null;
};

const STREAM_ONLY_HOST_RE = /(?:megaplay|vidsrc|embed\.su|multiembed|2embed|player|watch)/i;
const DOWNLOAD_HINT_RE = /(?:download|dl=|attachment|\.mp4(?:\?|$)|\.mkv(?:\?|$)|\.avi(?:\?|$)|\.mov(?:\?|$)|\.m4v(?:\?|$)|\.zip(?:\?|$))/i;
const AD_HOST_RE = /(?:doubleclick|googlesyndication|googleadservices|adsystem|adservice|adnxs|popads|popcash|propellerads|taboola|outbrain|trafficjunky|onclick|clickadu|exoclick|revcontent|mgid)/i;

function cleanTitle(value: string) {
  return value
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function uniqueTitleCandidates(params: ResolveDownloadParams) {
  const baseTitles = [params.title, ...(params.titles || [])]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  const year = params.year ? String(params.year).trim() : '';
  const rawTitles = year
    ? baseTitles.flatMap(value => [`${value} ${year}`, value])
    : baseTitles;
  const seen = new Set<string>();
  return rawTitles.filter((value) => {
    const key = cleanTitle(value);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function stringsFromUnknown(value: unknown, out: string[] = [], depth = 0): string[] {
  if (depth > 8 || value == null) return out;

  if (typeof value === 'string') {
    out.push(value.replace(/\\\//g, '/'));
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

function directDownloadUrls(value: unknown): string[] {
  if (!value || typeof value !== 'object') return [];
  const downloads = (value as { downloads?: unknown }).downloads;
  if (!Array.isArray(downloads)) return [];
  return downloads
    .map((download) => download && typeof download === 'object' ? (download as { url?: unknown }).url : null)
    .filter((url): url is string => typeof url === 'string' && url.length > 0);
}

function pickDownloadUrl(value: unknown): string | null {
  const urls = [...directDownloadUrls(value), ...stringsFromUnknown(value)
    .flatMap(item => item.match(/https?:\/\/[^\s"'<>\\]+/gi) || [])]
    .map(item => item.replace(/[),.]+$/, ''))
    .filter((item, index, list) => list.indexOf(item) === index)
    .filter(item => !/\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/i.test(item))
    .filter(item => !AD_HOST_RE.test(item));

  return urls.find(url => DOWNLOAD_HINT_RE.test(url))
    || urls.find(url => !STREAM_ONLY_HOST_RE.test(url) && !/embed|watch|stream|player/i.test(url))
    || null;
}

function subjectIdFrom(item: MediaSearchResult | undefined) {
  return item?.subjectId || item?.subject_id || item?.id || item?.detailPath || item?.detail_path;
}

function searchResultTitle(item: MediaSearchResult) {
  return String(item.title || item.name || '');
}

function searchResultYear(item: MediaSearchResult) {
  const record = item as Record<string, unknown>;
  const rawYear = record.year || record.release_year || record.releaseYear || record.date || record.release_date;
  const match = typeof rawYear === 'string' || typeof rawYear === 'number'
    ? String(rawYear).match(/\d{4}/)
    : null;
  return match?.[0] || null;
}

function sortOmnisaveResults(results: MediaSearchResult[], normalizedTitle: string, year?: string) {
  return [...results]
    .filter(item => subjectIdFrom(item))
    .sort((a, b) => {
      const titleA = cleanTitle(searchResultTitle(a));
      const titleB = cleanTitle(searchResultTitle(b));
      const score = (title: string, item: MediaSearchResult) => {
        let value = 0;
        if (title === normalizedTitle) value += 8;
        if (title.includes(normalizedTitle) || normalizedTitle.includes(title)) value += 4;
        if (year && searchResultYear(item) === year) value += 2;
        return value;
      };
      return score(titleB, b) - score(titleA, a);
    });
}

async function findOmnisaveSubjects(params: ResolveDownloadParams, mediaType: MediaKind) {
  const titleCandidates = uniqueTitleCandidates(params);
  const year = params.year ? String(params.year).match(/\d{4}/)?.[0] : undefined;
  const seen = new Set<string>();
  const subjects: { match: MediaSearchResult; subjectId: string }[] = [];

  for (const title of titleCandidates) {
    const results = await searchMedia(title, mediaType);
    if (results.length === 0) continue;

    for (const match of sortOmnisaveResults(results, cleanTitle(title.replace(/\b\d{4}\b/g, '').trim()), year).slice(0, 8)) {
      const subjectId = subjectIdFrom(match);
      if (!subjectId || seen.has(String(subjectId))) continue;
      seen.add(String(subjectId));
      subjects.push({ match, subjectId: String(subjectId) });
    }
  }

  return subjects;
}

async function resolveOmnisaveDownload(params: ResolveDownloadParams): Promise<ResolvedDownloadSource | null> {
  const mediaType: MediaKind = params.type === 'movie' ? 'movie' : 'tv';
  const subjects = await findOmnisaveSubjects(params, mediaType);

  // OmniSave downloads require its own subject_id from /api/search/{movie|tv}.
  // Anime is downloaded through the TV search flow; MAL/AniList IDs are only streaming metadata.
  for (const resolved of subjects) {
    try {
      const data = await getEpisodeResource({
        subjectId: resolved.subjectId,
        detailPath: resolved.match?.detailPath || resolved.match?.detail_path,
        type: mediaType,
        se: mediaType === 'tv' ? Number(params.season) || 1 : undefined,
        ep: mediaType === 'tv' ? Number(params.episode) || 1 : undefined,
      });
      const url = pickDownloadUrl(data);
      if (url) return { url, provider: 'omnisave', subjectId: resolved.subjectId };
    } catch {
      // Keep trying later OmniSave search results when one candidate has no download payload.
    }
  }

  return null;
}

export async function resolveDownloadSource(params: ResolveDownloadParams): Promise<ResolvedDownloadSource | null> {
  // Do not fall back to stream/player embeds for downloads: those URLs can open playback
  // pages or ad popups instead of a Save dialog. Only return OmniSave direct links.
  return resolveOmnisaveDownload(params);
}

export function isDownloadableUrl(url: string | null | undefined): url is string {
  return Boolean(url && !AD_HOST_RE.test(url) && (DOWNLOAD_HINT_RE.test(url) || (!STREAM_ONLY_HOST_RE.test(url) && !/embed|watch|stream|player/i.test(url))));
}
