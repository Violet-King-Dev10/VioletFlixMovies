const OMNISAVE_BASE = 'https://videodownloader.site';
const JIKAN_BASE = 'https://api.jikan.moe/v4';
const VIDSRC_BASE = 'https://vidsrc.to/embed';
const TWOEMBED_BASE = 'https://www.2embed.cc';
const MEGAPLAY_BASE = 'https://megaplay.buzz/stream';
const VIDLINK_BASE = 'https://vidlink.pro';
const ANIKOTO_BASE = 'https://anikotoapi.site';
const { getSportsApiResponse } = require('./sports-data');

const BLOCKED_DOWNLOAD_HOST_RE = /(?:doubleclick|googlesyndication|googleadservices|adsystem|adservice|adnxs|popads|popcash|propellerads|taboola|outbrain|trafficjunky|onclick|clickadu|exoclick|revcontent|mgid)/i;
const TRACKING_PARAM_RE = /^(?:utm_|affiliate$|aff(?:iliate)?_?id$|click_?id$|gclid$|fbclid$|yclid$|msclkid$|irclickid$|ref$|referrer$)/i;
const DOWNLOAD_FILENAME_RE = /[^a-z0-9._ -]+/gi;

function isBlockedAdUrl(url) {
  if (!url || typeof url !== 'string') return true;

  try {
    const parsed = new URL(url);
    return !/^https?:$/.test(parsed.protocol) || BLOCKED_DOWNLOAD_HOST_RE.test(parsed.hostname);
  } catch {
    return true;
  }
}

function protectUrl(url) {
  if (!url || typeof url !== 'string') return '';

  try {
    const parsed = new URL(url);
    [...parsed.searchParams.keys()].forEach((key) => {
      if (TRACKING_PARAM_RE.test(key)) parsed.searchParams.delete(key);
    });
    return parsed.toString();
  } catch {
    return url;
  }
}

function safeDownloadFilename(title, resolution) {
  const base = `${title || 'video'} ${resolution || 'video'}`
    .replace(DOWNLOAD_FILENAME_RE, '_')
    .replace(/_+/g, '_')
    .trim() || 'video';
  return `${base}.mp4`;
}

function json(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json; charset=utf-8',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': "default-src 'self'; script-src 'none'; object-src 'none'; frame-ancestors 'none';",
  });
  res.end(JSON.stringify(body));
}

async function upstreamJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cache-Control': 'no-cache',
      Pragma: 'no-cache',
      Referer: `${OMNISAVE_BASE}/`,
      Origin: OMNISAVE_BASE,
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    },
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Upstream ${response.status}: ${response.statusText || text}`);
  }

  return response.json();
}

async function handleSportsApi(searchParams, res) {
  const query = Object.fromEntries(searchParams.entries());
  const { statusCode, body } = await getSportsApiResponse(query);
  json(res, statusCode, body);
  return true;
}

function normalizeDownloadPayload(data, downloads) {
  const downloadItems = Array.isArray(downloads) ? downloads : [];
  const title = data?.subject?.title || data?.title || 'Unknown Title';

  return {
    success: true,
    title,
    poster: data?.subject?.cover_url || data?.poster || '',
    adGuardActive: true,
    downloads: downloadItems
      .filter((download) => download?.url && !isBlockedAdUrl(download.url))
      .map((download) => {
        const sourceHeaders = download.headers || {};
        const referer = sourceHeaders.Referer || sourceHeaders.referer || `${OMNISAVE_BASE}/`;
        const userAgent = sourceHeaders.headersUserAgent
          || sourceHeaders['User-Agent']
          || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
        const headers = {
          ...sourceHeaders,
          Referer: referer,
          'User-Agent': userAgent,
        };
        const resolution = download.resolution
          ? `${download.resolution}${String(download.resolution).toLowerCase().endsWith('p') ? '' : 'p'}`
          : 'Unknown';
        const url = protectUrl(download.url);

        return {
          resolution,
          size: download.size || 'Unknown',
          url,
          safeUrl: `/api/download-file?url=${encodeURIComponent(url)}&filename=${encodeURIComponent(safeDownloadFilename(title, resolution))}`,
          shouldDownload: true,
          fileName: safeDownloadFilename(title, resolution),
          referer: headers.Referer,
          userAgent: headers['User-Agent'],
          headers,
        };
      }),
    subtitles: (data?.subtitles || []).map((subtitle) => ({
      lang: subtitle.language_name || subtitle.lang,
      code: subtitle.language_code || subtitle.code,
      url: subtitle.url,
    })),
  };
}

function normalizeMovieSearch(data) {
  const list = Array.isArray(data)
    ? data
    : data?.data || data?.results || data?.items || data?.subjects || [];

  if (!Array.isArray(list)) return data;

  return {
    results: list.map((item) => {
      const subjectId = item.subject_id || item.subjectId || item.id || item.tmdb_id;
      return {
        ...item,
        subject_id: subjectId,
        subjectId,
        detailPath: item.detail_path || item.detailPath,
        title: item.title || item.name,
        poster: item.poster || item.cover || item.image,
      };
    }),
  };
}

const MOVIE_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Family', 'Fantasy', 'History', 'Horror', 'Music', 'Mystery', 'Romance',
  'Sci-Fi', 'Thriller', 'War', 'Western',
];

const TV_GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Documentary', 'Drama',
  'Family', 'Fantasy', 'History', 'Horror', 'Mystery', 'Romance', 'Sci-Fi',
  'Thriller', 'War', 'Western',
];

function unwrapItems(data) {
  if (Array.isArray(data)) return data;
  return data?.data || data?.items || data?.results || data?.subjects || [];
}

function normalizeMovieItem(item) {
  const subjectId = item.subject_id || item.subjectId || item.id || item.tmdb_id;
  return {
    ...item,
    subject_id: subjectId,
    subjectId,
    detailPath: item.detail_path || item.detailPath,
    title: item.title || item.name,
    poster: item.poster || item.cover || item.image,
  };
}

function normalizeAnimeSummary(anime, { trimSynopsis = false } = {}) {
  const synopsis = anime.synopsis || '';
  return {
    mal_id: anime.mal_id,
    title: anime.title,
    title_english: anime.title_english,
    image: anime.images?.jpg?.large_image_url || anime.images?.jpg?.image_url,
    score: anime.score,
    rank: anime.rank,
    episodes: anime.episodes,
    status: anime.status,
    airing: anime.airing,
    type: anime.type,
    year: anime.year,
    season: anime.season,
    genres: (anime.genres || []).map((genre) => genre.name),
    synopsis: trimSynopsis && synopsis ? `${synopsis.substring(0, 200)}${synopsis.length > 200 ? '...' : ''}` : synopsis,
  };
}

function uniqueItems(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.subject_id || item.subjectId || item.id || item.tmdb_id || item.title || item.name;
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function searchOmnisave(query, type, page) {
  const url = new URL('/search', OMNISAVE_BASE);
  url.searchParams.set('q', query);
  url.searchParams.set('type', type);
  if (page) url.searchParams.set('page', page);
  return upstreamJson(url.toString());
}

async function searchOmnisaveItems(query, type, page) {
  const data = await searchOmnisave(query, type, page);
  return unwrapItems(data).map(normalizeMovieItem);
}

async function collectOmnisaveSearches(searches, limit) {
  const settled = await Promise.allSettled(searches.map(({ query, type, page }) => searchOmnisaveItems(query, type, page)));
  const items = settled.flatMap((result) => result.status === 'fulfilled' ? result.value : []);
  return uniqueItems(items).slice(0, limit);
}

async function trendingMovies() {
  const year = new Date().getFullYear();
  return collectOmnisaveSearches([
    { query: String(year), type: 'movie' },
    { query: String(year - 1), type: 'movie' },
    { query: 'action', type: 'movie' },
  ], 30);
}

async function trendingTV() {
  const year = new Date().getFullYear();
  return collectOmnisaveSearches([
    { query: 'series', type: 'tv' },
    { query: String(year), type: 'tv' },
    { query: String(year - 1), type: 'tv' },
  ], 24);
}

async function trendingAnime() {
  const data = await upstreamJson(`${JIKAN_BASE}/top/anime?filter=airing&limit=25`);
  return (data.data || []).map((anime) => normalizeAnimeSummary(anime, { trimSynopsis: true }));
}

function routeParams(pathname, prefix) {
  if (!pathname.startsWith(prefix)) return null;
  const rest = pathname.slice(prefix.length).replace(/^\//, '');
  return rest ? rest.split('/').map(decodeURIComponent) : [];
}

async function handleApiRequest(req, res) {
  if (!req.url) return false;
  const requestUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const { pathname, searchParams } = requestUrl;

  if (!pathname.startsWith('/api/')) return false;

  if (req.method === 'OPTIONS') {
    json(res, 204, {});
    return true;
  }

  if (req.method !== 'GET') {
    json(res, 405, { error: 'Method Not Allowed' });
    return true;
  }

  try {
    if (pathname === '/api/sports') {
      return handleSportsApi(searchParams, res);
    }

    if (pathname === '/api/sports/download') {
      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': 'video/mp4',
        'Content-Disposition': 'attachment; filename="match_replay.mp4"',
        'X-Content-Type-Options': 'nosniff',
        'X-Ad-Guard': 'active',
      });
      res.end('Binary data would be piped here...');
      return true;
    }

    if (pathname === '/api/search/movie' || pathname === '/api/search/tv') {
      const type = pathname.endsWith('/tv') ? 'tv' : 'movie';
      const q = searchParams.get('q') || searchParams.get('query') || (type === 'movie' ? 'avengers' : 'breaking bad');
      const data = await upstreamJson(`${OMNISAVE_BASE}/search?q=${encodeURIComponent(q)}&type=${type}`).catch(() => null);
      json(res, 200, data ? normalizeMovieSearch(data) : { results: [], source: 'unavailable', warning: 'Movie provider is currently unavailable' });
      return true;
    }

    const movieParts = routeParams(pathname, '/api/movie');
    if (movieParts?.length === 1) {
      const data = await upstreamJson(`${OMNISAVE_BASE}/details?subject_id=${encodeURIComponent(movieParts[0])}`);
      json(res, 200, data);
      return true;
    }

    const tvParts = routeParams(pathname, '/api/tv');
    if (tvParts?.length === 1) {
      const detailPath = searchParams.get('path') || '';
      const url = new URL('/details', OMNISAVE_BASE);
      url.searchParams.set('subject_id', tvParts[0]);
      if (detailPath) url.searchParams.set('detail_path', detailPath);
      const data = await upstreamJson(url.toString());
      json(res, 200, data);
      return true;
    }


    if (pathname === '/api/download-file') {
      const target = protectUrl(searchParams.get('url') || '');
      if (isBlockedAdUrl(target)) {
        json(res, 400, { success: false, error: 'Blocked unsafe download URL.', adGuardActive: true });
        return true;
      }

      const requestedName = (searchParams.get('filename') || 'video.mp4')
        .replace(DOWNLOAD_FILENAME_RE, '_')
        .replace(/_+/g, '_')
        .trim() || 'video.mp4';
      const upstream = await fetch(target, {
        headers: {
          Accept: 'video/*, application/octet-stream, */*',
          Referer: `${OMNISAVE_BASE}/`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        },
        redirect: 'follow',
      });

      if (!upstream.ok) {
        json(res, upstream.status, { success: false, error: `Download provider error: ${upstream.status}`, adGuardActive: true });
        return true;
      }

      res.writeHead(200, {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': upstream.headers.get('content-type') || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${requestedName.replace(/"/g, '')}"`,
        'X-Content-Type-Options': 'nosniff',
        'X-Ad-Guard': 'active',
        ...(upstream.headers.get('content-length') ? { 'Content-Length': upstream.headers.get('content-length') } : {}),
      });

      if (upstream.body && typeof upstream.body.pipe === 'function') {
        upstream.body.pipe(res);
      } else if (upstream.body) {
        const { Readable } = require('stream');
        Readable.fromWeb(upstream.body).pipe(res);
      } else {
        res.end();
      }
      return true;
    }

    if (pathname === '/api/download') {
      const subjectId = searchParams.get('subject_id');
      const detailPath = searchParams.get('detail_path');
      const mediaType = searchParams.get('type') || 'movie';
      const resolution = searchParams.get('resolution');
      const season = searchParams.get('season');
      const episode = searchParams.get('episode');

      if (!subjectId) {
        json(res, 400, { error: 'subject_id required' });
        return true;
      }

      // Try the working aoneroom internal API
      const AONEROOM_API = 'https://aoneroom.com';
      async function tryAoneroom() {
        try {
          const apiUrl = new URL('/api/download', AONEROOM_API);
          apiUrl.searchParams.set('subject_id', subjectId);
          if (detailPath) apiUrl.searchParams.set('detail_path', detailPath);
          if (season) apiUrl.searchParams.set('season', season);
          if (episode) apiUrl.searchParams.set('episode', episode);
          if (resolution) apiUrl.searchParams.set('preferred_resolution', resolution);
          return await upstreamJson(apiUrl.toString());
        } catch { return null; }
      }

      // Try vidlink.pro API for direct video source
      async function tryVidlink() {
        try {
          const tmdbMatch = subjectId.match(/tt\d+/);
          if (!tmdbMatch && !detailPath) return null;
          const vidSources = [];
          if (tmdbMatch) {
            vidSources.push(
              `${VIDLINK_BASE}/movie/${tmdbMatch[0]}`,
              `${VIDSRC_BASE}/movie/${tmdbMatch[0]}`
            );
          }
          if (vidSources.length === 0) return null;
          return {
            subject: { title: detailPath || 'Movie' },
            downloads: vidSources.map((url, i) => ({
              resolution: i === 0 ? 1080 : 720,
              url,
              headers: {
                Referer: 'https://vidlink.pro/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })),
            subtitles: []
          };
        } catch { return null; }
      }

      async function tryAnimeStream() {
        try {
          if (mediaType !== 'tv' && mediaType !== 'anime') return null;
          const malMatch = subjectId.match(/^(\d+)$/);
          if (!malMatch) return null;
          const ep = episode || '1';
          const sources = [
            { name: 'MegaPlay', url: `${MEGAPLAY_BASE}/mal/${malMatch[1]}/${ep}/sub` },
            { name: 'VidSrc', url: `${VIDSRC_BASE}/anime/${malMatch[1]}/${ep}` },
            { name: 'VidLink', url: `${VIDLINK_BASE}/anime/${malMatch[1]}?ep=${ep}&lang=sub` }
          ];
          return {
            subject: { title: detailPath || 'Anime' },
            downloads: sources.map((s, i) => ({
              resolution: i === 0 ? 1080 : 720,
              url: s.url,
              headers: {
                Referer: s.name === 'MegaPlay' ? 'https://megaplay.buzz/' : 'https://vidsrc.to/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            })),
            subtitles: []
          };
        } catch { return null; }
      }

      try {
        // Chain: try aoneroom API first, then vidlink, then anime, then fallback
        let data = await tryAoneroom();
        let downloads = data?.downloads || null;

        if (!downloads || (Array.isArray(downloads) && downloads.length === 0)) {
          data = await tryVidlink();
          downloads = data?.downloads || null;
        }

        if (!downloads || (Array.isArray(downloads) && downloads.length === 0)) {
          data = await tryAnimeStream();
          downloads = data?.downloads || null;
        }

        if (Array.isArray(downloads) && downloads.length > 0) {
          json(res, 200, normalizeDownloadPayload(data, downloads));
          return true;
        }

        // Last resort: use stream endpoints
        const tmdbMatch = subjectId.match(/tt\d+/);
        if (tmdbMatch) {
          const isTv = mediaType === 'tv';
          const streamPath = isTv ? '/api/stream/tv' : '/api/stream/movie';
          const streamRes = await fetch(`http://localhost:${PORT}${streamPath}?tmdb_id=${tmdbMatch[0]}${isTv ? `&season=${season || 1}&episode=${episode || 1}` : ''}`, {
            headers: { Accept: 'application/json' }
          });
          if (streamRes.ok) {
            const streamData = await streamRes.json();
            const streamDownloads = (streamData.sources || []).map((s, i) => ({
              resolution: i === 0 ? '1080p' : '720p',
              size: 'Stream',
              url: s.url,
              headers: {
                Referer: s.url.includes('vidsrc') ? 'https://vidsrc.to/' : 'https://vidlink.pro/',
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
              }
            }));
            json(res, 200, normalizeDownloadPayload({ subject: { title: detailPath || 'Content' } }, streamDownloads));
            return true;
          }
        }

        json(res, 404, { success: false, error: 'No direct download links found for this content.', adGuardActive: true });
      } catch (error) {
        json(res, 500, {
          success: false,
          error: `Provider error: ${error instanceof Error ? error.message : 'Provider unavailable'}`,
          hint: 'All download providers failed. The upstream API might be down.',
        });
      }
      return true;
    }

    if (pathname === '/api/stream/movie') {
      const tmdbId = searchParams.get('tmdb_id');
      if (!tmdbId) {
        json(res, 400, { error: 'tmdb_id required' });
        return true;
      }
      const safeTmdbId = encodeURIComponent(tmdbId);
      const sources = [
        { name: 'VidSrc', url: `${VIDSRC_BASE}/movie/${safeTmdbId}` },
        { name: '2Embed', url: `${TWOEMBED_BASE}/embed/${safeTmdbId}` },
        { name: 'MegaPlay', url: `${VIDLINK_BASE}/movie/${safeTmdbId}` },
      ];
      json(res, 200, {
        sources,
        embed: sources[0].url,
        alternatives: sources.slice(1).map((source) => source.url),
      });
      return true;
    }

    if (pathname === '/api/stream/tv') {
      const tmdbId = searchParams.get('tmdb_id');
      if (!tmdbId) {
        json(res, 400, { error: 'tmdb_id required' });
        return true;
      }
      const season = searchParams.get('season') || '1';
      const episode = searchParams.get('episode') || '1';
      const safeTmdbId = encodeURIComponent(tmdbId);
      const safeSeason = encodeURIComponent(season);
      const safeEpisode = encodeURIComponent(episode);
      const sources = [
        { name: 'VidSrc', url: `${VIDSRC_BASE}/tv/${safeTmdbId}/${safeSeason}/${safeEpisode}` },
        { name: '2Embed', url: `${TWOEMBED_BASE}/embedtv/${safeTmdbId}&s=${safeSeason}&e=${safeEpisode}` },
        { name: 'MegaPlay', url: `${VIDLINK_BASE}/tv/${safeTmdbId}/${safeSeason}/${safeEpisode}` },
      ];
      json(res, 200, {
        sources,
        embed: sources[0].url,
        alternatives: sources.slice(1).map((source) => source.url),
      });
      return true;
    }

    if (pathname === '/api/anime/search') {
      const q = searchParams.get('q') || searchParams.get('query') || 'naruto';
      const page = searchParams.get('page') || '1';
      try {
        const data = await upstreamJson(`${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&page=${encodeURIComponent(page)}&sfw`);
        json(res, 200, {
          results: (data.data || []).map((anime) => ({
            mal_id: anime.mal_id,
            title: anime.title,
            title_english: anime.title_english,
            synopsis: anime.synopsis,
            image: anime.images?.jpg?.large_image_url,
            score: anime.score,
            episodes: anime.episodes,
            status: anime.status,
            genres: (anime.genres || []).map((genre) => genre.name),
            type: anime.type,
            year: anime.year,
            season: anime.season,
          })),
          pagination: data.pagination,
          source: 'jikan',
        });
      } catch {
        json(res, 200, {
          results: [],
          pagination: { current_page: Number(page) || 1, has_next_page: false },
          source: 'jikan',
          warning: 'Jikan anime search is currently unavailable',
        });
      }
      return true;
    }

    if (pathname === '/api/anime/stream') {
      const malId = searchParams.get('mal_id');
      const episode = searchParams.get('episode') || '1';
      const language = (searchParams.get('lang') || 'sub').toLowerCase();
      if (malId) {
        const safeMalId = encodeURIComponent(malId);
        const safeEpisode = encodeURIComponent(episode);
        const safeLanguage = encodeURIComponent(language);
        const sources = [
          { name: 'MegaPlay', url: `${MEGAPLAY_BASE}/mal/${safeMalId}/${safeEpisode}/${safeLanguage}` },
          { name: 'VidSrc', url: `${VIDSRC_BASE}/anime/${safeMalId}/${safeEpisode}` },
          { name: 'VidLink', url: `${VIDLINK_BASE}/anime/${safeMalId}?ep=${safeEpisode}&lang=${safeLanguage}` },
        ];
        json(res, 200, {
          sources,
          player: sources[0].url,
          embed: sources[2].url,
          alternatives: sources.slice(1).map((source) => source.url),
          note: 'MegaPlay by MAL ID with VidSrc and VidLink fallbacks.',
        });
        return true;
      }

      const animeTitle = searchParams.get('q') || searchParams.get('title');
      if (animeTitle) {
        const searchData = await upstreamJson(`${ANIKOTO_BASE}/search?q=${encodeURIComponent(animeTitle)}`).catch(() => ({ data: [] }));
        json(res, 200, {
          search_results: (searchData?.data || []).slice(0, 5),
          note: 'Pick a result and use its embed_id or mal_id to get stream URLs',
        });
        return true;
      }

      json(res, 400, { error: 'mal_id required' });
      return true;
    }

    if (pathname === '/api/anime/catalog') {
      const page = searchParams.get('page') || '1';
      const type = searchParams.get('type') || 'recent';
      const url = new URL('/catalog', ANIKOTO_BASE);
      url.searchParams.set('page', page);
      if (type === 'series') url.searchParams.set('type', 'series');
      const data = await upstreamJson(url.toString());
      json(res, 200, data);
      return true;
    }

    const animeSeriesParts = routeParams(pathname, '/api/anime/series');
    if (animeSeriesParts?.length === 1) {
      const data = await upstreamJson(`${ANIKOTO_BASE}/series/${encodeURIComponent(animeSeriesParts[0])}`);
      json(res, 200, data);
      return true;
    }

    if (pathname === '/api/trending/movies') {
      json(res, 200, { results: await trendingMovies(), source: 'omniget' });
      return true;
    }

    if (pathname === '/api/trending/tv') {
      json(res, 200, { results: await trendingTV(), source: 'omniget' });
      return true;
    }

    if (pathname === '/api/trending/anime') {
      json(res, 200, { results: await trendingAnime(), source: 'jikan' });
      return true;
    }

    if (pathname === '/api/trending/all' || pathname === '/api/homepage') {
      const [movies, tv, anime] = await Promise.allSettled([trendingMovies(), trendingTV(), trendingAnime()]);
      const payload = {
        movies: movies.status === 'fulfilled' ? movies.value.slice(0, 10) : [],
        tv: tv.status === 'fulfilled' ? tv.value.slice(0, 10) : [],
        anime: anime.status === 'fulfilled' ? anime.value.slice(0, 10) : [],
      };
      json(res, 200, pathname === '/api/homepage'
        ? { trending_movies: payload.movies, trending_tv: payload.tv, trending_anime: payload.anime }
        : payload);
      return true;
    }

    if (pathname === '/api/browse/movies' || pathname === '/api/browse/series') {
      const type = pathname.endsWith('/series') ? 'tv' : 'movie';
      const genre = searchParams.get('genre') || (type === 'tv' ? 'series' : 'action');
      const page = searchParams.get('page') || '1';
      const data = await searchOmnisave(genre, type, page);
      json(res, 200, normalizeMovieSearch(data));
      return true;
    }

    if (pathname === '/api/search/all') {
      const q = searchParams.get('q') || searchParams.get('query') || 'avengers';
      const [movies, tv, anime] = await Promise.allSettled([
        searchOmnisaveItems(q, 'movie'),
        searchOmnisaveItems(q, 'tv'),
        upstreamJson(`${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&limit=10&sfw`).catch(() => ({ data: [] })),
      ]);
      json(res, 200, {
        movies: movies.status === 'fulfilled' ? movies.value.slice(0, 10) : [],
        tv: tv.status === 'fulfilled' ? tv.value.slice(0, 10) : [],
        anime: anime.status === 'fulfilled' ? (anime.value.results || (anime.value.data || []).map((item) => normalizeAnimeSummary(item))).slice(0, 10) : [],
      });
      return true;
    }

    if (pathname === '/api/genres/movies') {
      json(res, 200, { genres: MOVIE_GENRES });
      return true;
    }

    if (pathname === '/api/genres/tv') {
      json(res, 200, { genres: TV_GENRES });
      return true;
    }

    if (pathname === '/api/genres/anime') {
      const data = await upstreamJson(`${JIKAN_BASE}/genres/anime`);
      json(res, 200, {
        genres: (data.data || []).map((genre) => ({
          mal_id: genre.mal_id,
          name: genre.name,
          count: genre.count,
        })),
      });
      return true;
    }

    if (pathname === '/api/seasonal/anime') {
      const now = new Date();
      const year = searchParams.get('year') || String(now.getFullYear());
      const seasons = ['winter', 'spring', 'summer', 'fall'];
      const season = (searchParams.get('season') || seasons[Math.floor(now.getMonth() / 3)]).toLowerCase();
      const data = await upstreamJson(`${JIKAN_BASE}/seasons/${encodeURIComponent(year)}/${encodeURIComponent(season)}`);
      json(res, 200, {
        season,
        year,
        results: (data.data || []).slice(0, 30).map((anime) => ({
          ...normalizeAnimeSummary(anime, { trimSynopsis: true }),
          studios: (anime.studios || []).map((studio) => studio.name),
          source: anime.source,
        })),
        pagination: data.pagination,
      });
      return true;
    }

    const recommendationParts = routeParams(pathname, '/api/recommendations/anime');
    if (recommendationParts?.length === 1) {
      const data = await upstreamJson(`${JIKAN_BASE}/anime/${encodeURIComponent(recommendationParts[0])}/recommendations`);
      json(res, 200, {
        recommendations: (data.data || []).slice(0, 15).map((rec) => ({
          mal_id: rec.entry?.mal_id,
          title: rec.entry?.title,
          image: rec.entry?.images?.jpg?.image_url || rec.entry?.images?.jpg?.large_image_url,
          url: rec.entry?.url,
          votes: rec.votes,
        })),
      });
      return true;
    }

    if (pathname === '/api/anime/random') {
      const data = await upstreamJson(`${JIKAN_BASE}/random/anime`);
      const anime = data.data;
      json(res, 200, anime ? normalizeAnimeSummary(anime) : { error: 'Not found' });
      return true;
    }

    if (pathname === '/api/latest/movies' || pathname === '/api/latest/tv') {
      const type = pathname.endsWith('/tv') ? 'tv' : 'movie';
      const year = new Date().getFullYear();
      const items = await searchOmnisaveItems(String(year), type);
      json(res, 200, { results: items.slice(0, 25), year });
      return true;
    }

    if (pathname === '/api/popular/movies') {
      const items = await collectOmnisaveSearches([
        { query: 'action', type: 'movie' },
        { query: 'comedy', type: 'movie' },
        { query: 'drama', type: 'movie' },
      ], 30);
      json(res, 200, { results: items });
      return true;
    }

    if (pathname === '/api/top/anime') {
      const page = searchParams.get('page') || '1';
      const data = await upstreamJson(`${JIKAN_BASE}/top/anime?page=${encodeURIComponent(page)}&limit=25`);
      json(res, 200, {
        results: (data.data || []).map((anime) => normalizeAnimeSummary(anime)),
        pagination: data.pagination,
      });
      return true;
    }

    if (pathname === '/api/upcoming/anime') {
      const data = await upstreamJson(`${JIKAN_BASE}/seasons/now?filter=tv&limit=25`);
      json(res, 200, {
        results: (data.data || []).map((anime) => normalizeAnimeSummary(anime, { trimSynopsis: true })),
      });
      return true;
    }

    const animeParts = routeParams(pathname, '/api/anime');
    if (animeParts?.length === 1) {
      if (!/^\d+$/.test(animeParts[0])) {
        json(res, 404, { error: 'Not Found' });
        return true;
      }
      const data = await upstreamJson(`${JIKAN_BASE}/anime/${encodeURIComponent(animeParts[0])}/full`);
      if (!data.data) {
        json(res, 404, { error: 'Not found' });
        return true;
      }
      const anime = data.data;
      json(res, 200, {
        mal_id: anime.mal_id,
        title: anime.title,
        title_english: anime.title_english,
        title_japanese: anime.title_japanese,
        synopsis: anime.synopsis,
        background: anime.background,
        image: anime.images?.jpg?.large_image_url,
        trailer: anime.trailer?.url,
        score: anime.score,
        scored_by: anime.scored_by,
        rank: anime.rank,
        popularity: anime.popularity,
        episodes: anime.episodes,
        status: anime.status,
        airing: anime.airing,
        aired_from: anime.aired?.from,
        aired_to: anime.aired?.to,
        duration: anime.duration,
        rating: anime.rating,
        genres: (anime.genres || []).map((genre) => genre.name),
        studios: (anime.studios || []).map((studio) => studio.name),
        producers: (anime.producers || []).map((producer) => producer.name),
        type: anime.type,
        season: anime.season,
        year: anime.year,
        relations: (anime.relations || []).map((relation) => ({
          relation: relation.relation,
          entries: relation.entry?.map((entry) => ({ mal_id: entry.mal_id, name: entry.name, type: entry.type })),
        })),
        theme_openings: anime.theme?.openings || [],
        theme_endings: anime.theme?.endings || [],
      });
      return true;
    }

    if (animeParts?.length === 2 && animeParts[1] === 'episodes') {
      if (!/^\d+$/.test(animeParts[0])) {
        json(res, 404, { error: 'Not Found' });
        return true;
      }
      const page = searchParams.get('page') || '1';
      const data = await upstreamJson(`${JIKAN_BASE}/anime/${encodeURIComponent(animeParts[0])}/episodes?page=${encodeURIComponent(page)}`);
      json(res, 200, {
        episodes: (data.data || []).map((episode) => ({
          mal_id: episode.mal_id,
          title: episode.title,
          title_japanese: episode.title_japanese,
          episode_number: episode.mal_id,
          aired: episode.aired,
          synopsis: episode.synopsis,
          forum_url: episode.url,
        })),
        pagination: data.pagination,
      });
      return true;
    }

    if (animeParts?.length === 2 && animeParts[1] === 'characters') {
      if (!/^\d+$/.test(animeParts[0])) {
        json(res, 404, { error: 'Not Found' });
        return true;
      }
      const data = await upstreamJson(`${JIKAN_BASE}/anime/${encodeURIComponent(animeParts[0])}/characters`);
      json(res, 200, {
        characters: (data.data || []).slice(0, 30).map((item) => ({
          character: {
            mal_id: item.character?.mal_id,
            name: item.character?.name,
            image: item.character?.images?.jpg?.image_url,
            role: item.role,
          },
          voice_actors: (item.voice_actors || []).map((actor) => ({
            person: {
              mal_id: actor.person?.mal_id,
              name: actor.person?.name,
              image: actor.person?.images?.jpg?.image_url,
            },
            language: actor.language,
          })),
        })),
      });
      return true;
    }


    if (pathname === '/api/health') {
      json(res, 200, { status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
      return true;
    }

    json(res, 404, { error: 'Not Found' });
    return true;
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Unknown error' });
    return true;
  }
}

module.exports = { handleApiRequest };
