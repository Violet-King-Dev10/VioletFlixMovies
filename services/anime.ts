export type AnimeSearchResult = {
  title: string;
  slug: string;
  url: string;
  poster?: string;
  mal_id?: number;
  title_english?: string | null;
  synopsis?: string | null;
  score?: number | null;
  episodes?: number | null;
  status?: string | null;
  genres?: string[];
  type?: string | null;
  year?: number | null;
  season?: string | null;
};

export type AnimeEpisode = {
  num: number;
  slug: string;
  token: string;
  langs?: number;
  filler?: boolean;
  title?: string | null;
  aired?: string | null;
  synopsis?: string | null;
};

export type AnimeStreamLink = {
  id: string;
  url: string;
};

export type AnimeStreamResponse = {
  player?: string;
  embed?: string;
  search_results?: unknown[];
  note?: string;
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

function apiUrl(path: string, params: Record<string, string | number | undefined> = {}) {
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
  if (!res.ok) throw new Error(`VioletFlixTV anime API ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function searchAnimeProvider(query: string): Promise<AnimeSearchResult[]> {
  const data = await fetchApiJson('/api/anime/search', { q: query });
  const results = Array.isArray(data) ? data : Array.isArray(data?.results) ? data.results : [];
  return results.map((anime: Record<string, unknown>) => {
    const malId = Number(anime.mal_id || 0) || undefined;
    const title = String(anime.title_english || anime.title || 'Untitled');
    return {
      ...anime,
      mal_id: malId,
      title,
      slug: malId ? String(malId) : title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      url: malId ? apiUrl(`/api/anime/${malId}`) : '',
      poster: typeof anime.image === 'string' ? anime.image : undefined,
    } as AnimeSearchResult;
  });
}

export const searchAnime = searchAnimeProvider;

export async function animeDetail(slug: string) {
  return fetchApiJson(`/api/anime/${encodeURIComponent(slug)}`);
}

export async function animeEpisodes(malId: string): Promise<AnimeEpisode[]> {
  const data = await fetchApiJson(`/api/anime/${encodeURIComponent(malId)}/episodes`);
  const episodes = Array.isArray(data) ? data : Array.isArray(data?.episodes) ? data.episodes : [];
  return episodes.map((episode: Record<string, unknown>, index: number) => {
    const num = Number(episode.episode_number || episode.mal_id || index + 1);
    return {
      num,
      slug: String(episode.mal_id || num),
      token: String(episode.mal_id || num),
      title: typeof episode.title === 'string' ? episode.title : null,
      aired: typeof episode.aired === 'string' ? episode.aired : null,
      synopsis: typeof episode.synopsis === 'string' ? episode.synopsis : null,
    };
  });
}

export async function animeStream({
  malId,
  episode = 1,
  lang = 'sub',
  title,
}: {
  malId?: string | number | null;
  episode?: string | number;
  lang?: string;
  title?: string | null;
}): Promise<AnimeStreamResponse> {
  return fetchApiJson('/api/anime/stream', {
    mal_id: malId || undefined,
    episode,
    lang,
    q: title || undefined,
  });
}

export async function animeStreams(token: string): Promise<AnimeStreamLink[]> {
  const data = await animeStream({ malId: token });
  return [data.player, data.embed]
    .filter((url): url is string => typeof url === 'string' && url.length > 0)
    .map((url, index) => ({ id: index === 0 ? 'megaplay' : index === 1 ? 'vidsrc' : `alternate-${index}`, url }));
}

export async function animeStreamView(linkId: string) {
  return { id: linkId };
}
