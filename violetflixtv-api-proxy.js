// violetflixtv-api-proxy.js — FULL FIX
// Express proxy backend for VioletFlixTV
// Covers: movies, TV, anime search + metadata + streaming + downloads
//
// Deploy: npm install express cors, then node violetflixtv-api-proxy.js
// Default port: 4000

const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// --- SOURCES ---
const OMNISAVE_BASE = 'https://videodownloader.site';   // movies + TV
const JIKAN_BASE = 'https://api.jikan.moe/v4';           // anime search + metadata
const ANIKOTO_BASE = 'https://anikotoapi.site';          // anime catalog + embed IDs
const MEGAPLAY_BASE = 'https://megaplay.buzz/stream';    // anime streaming

// ============================================================
//  MOVIES — search, details, download, stream embed
// ============================================================

app.get('/api/search/movie', async (req, res) => {
  try {
    const q = req.query.q || 'avengers';
    const r = await fetch(`${OMNISAVE_BASE}/search?q=${encodeURIComponent(q)}&type=movie`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/search/tv', async (req, res) => {
  try {
    const q = req.query.q || 'breaking bad';
    const r = await fetch(`${OMNISAVE_BASE}/search?q=${encodeURIComponent(q)}&type=tv`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/movie/:id', async (req, res) => {
  try {
    const r = await fetch(`${OMNISAVE_BASE}/details?subject_id=${req.params.id}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/tv/:id', async (req, res) => {
  try {
    const detailPath = req.query.path || '';
    let url = `${OMNISAVE_BASE}/details?subject_id=${req.params.id}`;
    if (detailPath) url += `&detail_path=${encodeURIComponent(detailPath)}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/download', async (req, res) => {
  try {
    const { subject_id, season, episode, resolution } = req.query;
    if (!subject_id) return res.status(400).json({ error: 'subject_id required' });
    let url = `${OMNISAVE_BASE}/download?subject_id=${subject_id}`;
    if (season) url += `&season=${season}`;
    if (episode) url += `&episode=${episode}`;
    if (resolution) url += `&preferred_resolution=${resolution}`;
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stream/movie', async (req, res) => {
  try {
    const { tmdb_id } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'tmdb_id required' });
    res.json({
      embed: `https://embed.su/embed/movie/${tmdb_id}`,
      alternatives: [
        `https://vidsrc.to/embed/movie/${tmdb_id}`,
        `https://2embed.org/embed/movie/${tmdb_id}`
      ]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/stream/tv', async (req, res) => {
  try {
    const { tmdb_id, season, episode } = req.query;
    if (!tmdb_id) return res.status(400).json({ error: 'tmdb_id required' });
    const s = season || 1;
    const e = episode || 1;
    res.json({
      embed: `https://embed.su/embed/tv/${tmdb_id}/${s}/${e}`,
      alternatives: [
        `https://vidsrc.to/embed/tv/${tmdb_id}/${s}/${e}`,
        `https://2embed.org/embed/tv/${tmdb_id}/${s}/${e}`
      ]
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
//  ANIME — search, details, episodes, streaming
// ============================================================

// Search anime via Jikan (MyAnimeList)
app.get('/api/anime/search', async (req, res) => {
  try {
    const q = req.query.q || 'naruto';
    const page = req.query.page || 1;
    const r = await fetch(`${JIKAN_BASE}/anime?q=${encodeURIComponent(q)}&page=${page}&sfw`);
    const data = await r.json();
    // Simplify response shape
    res.json({
      results: (data.data || []).map(a => ({
        mal_id: a.mal_id,
        title: a.title,
        title_english: a.title_english,
        synopsis: a.synopsis,
        image: a.images?.jpg?.large_image_url,
        score: a.score,
        episodes: a.episodes,
        status: a.status,
        genres: (a.genres || []).map(g => g.name),
        type: a.type,
        year: a.year,
        season: a.season
      })),
      pagination: data.pagination
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anime full details
app.get('/api/anime/:id', async (req, res) => {
  try {
    const r = await fetch(`${JIKAN_BASE}/anime/${req.params.id}/full`);
    const data = await r.json();
    if (!data.data) return res.status(404).json({ error: 'Not found' });
    const a = data.data;
    res.json({
      mal_id: a.mal_id,
      title: a.title,
      title_english: a.title_english,
      title_japanese: a.title_japanese,
      synopsis: a.synopsis,
      background: a.background,
      image: a.images?.jpg?.large_image_url,
      trailer: a.trailer?.url,
      score: a.score,
      scored_by: a.scored_by,
      rank: a.rank,
      popularity: a.popularity,
      episodes: a.episodes,
      status: a.status,
      airing: a.airing,
      aired_from: a.aired?.from,
      aired_to: a.aired?.to,
      duration: a.duration,
      rating: a.rating,
      genres: (a.genres || []).map(g => g.name),
      studios: (a.studios || []).map(s => s.name),
      producers: (a.producers || []).map(p => p.name),
      type: a.type,
      season: a.season,
      year: a.year,
      relations: (a.relations || []).map(r => ({
        relation: r.relation,
        entries: r.entry?.map(e => ({ mal_id: e.mal_id, name: e.name, type: e.type }))
      })),
      theme_openings: a.theme?.openings || [],
      theme_endings: a.theme?.endings || []
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anime episode list
app.get('/api/anime/:id/episodes', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const r = await fetch(`${JIKAN_BASE}/anime/${req.params.id}/episodes?page=${page}`);
    const data = await r.json();
    res.json({
      episodes: (data.data || []).map(e => ({
        mal_id: e.mal_id,
        title: e.title,
        title_japanese: e.title_japanese,
        episode_number: e.mal_id, // incremental
        aired: e.aired,
        synopsis: e.synopsis,
        forum_url: e.url
      })),
      pagination: data.pagination
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anime streaming embed URL
// Uses Anikoto for embed IDs + MegaPlay for player endpoints
app.get('/api/anime/stream', async (req, res) => {
  try {
    const { mal_id, episode, lang } = req.query;
    const ep = episode || 1;
    const language = (lang || 'sub').toLowerCase();

    if (mal_id) {
      // Try MegaPlay direct by MAL ID
      res.json({
        player: `${MEGAPLAY_BASE}/mal/${mal_id}/${ep}/${language}`,
        embed: `https://vidlink.pro/anime/${mal_id}?ep=${ep}&lang=${language}`,
        note: 'MegaPlay may require browser headers. VidLink as fallback.'
      });
      return;
    }

    // Fallback: try Anikoto search
    const animeTitle = req.query.q;
    if (!animeTitle && !mal_id) {
      return res.status(400).json({ error: 'Need mal_id or anime title (q)' });
    }

    // Search Anikoto for the anime embed ID
    const searchR = await fetch(`${ANIKOTO_BASE}/search?q=${encodeURIComponent(animeTitle)}`);
    const searchData = await searchR.json();

    res.json({
      search_results: searchData?.data?.slice(0, 5) || [],
      note: 'Pick a result and use its embed_id or mal_id to get stream URLs'
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anikoto catalog browse (recent anime)
app.get('/api/anime/catalog', async (req, res) => {
  try {
    const page = req.query.page || 1;
    const type = req.query.type || 'recent'; // recent, series
    let url = `${ANIKOTO_BASE}/catalog?page=${page}`;
    if (type === 'series') url += '&type=series';
    const r = await fetch(url);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Anikoto series details (embed IDs for streaming)
app.get('/api/anime/series/:id', async (req, res) => {
  try {
    const r = await fetch(`${ANIKOTO_BASE}/series/${req.params.id}`);
    const data = await r.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ============================================================
//  HEALTH
// ============================================================

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), uptime: process.uptime() });
});

app.listen(PORT, () => {
  console.log(`✅ VioletFlixTV API proxy running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/api/health`);
  console.log(`   Movie search: http://localhost:${PORT}/api/search/movie?q=`);
  console.log(`   Anime search: http://localhost:${PORT}/api/anime/search?q=`);
  console.log(`   Anime stream: http://localhost:${PORT}/api/anime/stream?mal_id=&episode=&lang=`);
});
