export type StreamType = 'movie' | 'tv' | 'anime';

interface StreamParams {
  id: string | number;
  type: StreamType;
  season?: string | number;
  episode?: string | number;
  malId?: string | number | null;
}

export function getStreamUrl({ id, type, season = 1, episode = 1, malId }: StreamParams): string | null {
  const safeId = encodeURIComponent(String(id));
  const safeSeason = encodeURIComponent(String(season || 1));
  const safeEpisode = encodeURIComponent(String(episode || 1));

  if (type === 'movie') {
    return `https://vidsrc.to/embed/movie/${safeId}`;
  }

  if (type === 'tv') {
    return `https://vidsrc.to/embed/tv/${safeId}/${safeSeason}/${safeEpisode}`;
  }

  if (malId) {
    return `https://vidsrc.to/embed/anime/${encodeURIComponent(String(malId))}/${safeEpisode}`;
  }

  if (type === 'anime') {
    const animeId = malId || id;
    return `https://vidsrc.to/embed/anime/${encodeURIComponent(String(animeId))}/${safeEpisode}`;
  }

  return null;
}

export function getFallbackStreamUrl({ id, type, season = 1, episode = 1, malId }: StreamParams): string | null {
  const safeId = encodeURIComponent(String(id));
  const safeSeason = encodeURIComponent(String(season || 1));
  const safeEpisode = encodeURIComponent(String(episode || 1));

  if (type === 'movie') {
    return `https://vidsrc.to/embed/movie/${safeId}`;
  }

  if (type === 'tv') {
    return `https://vidsrc.to/embed/tv/${safeId}/${safeSeason}/${safeEpisode}`;
  }

  if (type === 'anime') {
    const animeId = malId || id;
    return `https://vidsrc.to/embed/anime/${encodeURIComponent(String(animeId))}/${safeEpisode}`;
  }

  return null;
}
