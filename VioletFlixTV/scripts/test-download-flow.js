#!/usr/bin/env node
'use strict';

const assert = require('assert/strict');
const { handleApiRequest } = require('./api-proxy');

function makeResponse() {
  return {
    statusCode: 0,
    headers: {},
    body: '',
    writeHead(statusCode, headers) {
      this.statusCode = statusCode;
      this.headers = headers;
    },
    end(body) {
      this.body = body;
    },
    json() {
      return JSON.parse(this.body || '{}');
    }
  };
}

async function request(path) {
  const req = { method: 'GET', url: path, headers: { host: 'localhost:4000' } };
  const res = makeResponse();
  const handled = await handleApiRequest(req, res);
  assert.equal(handled, true, `${path} should be handled by the API proxy`);
  return res;
}

async function main() {
  const calls = [];
  const headersByUrl = new Map();
  const originalFetch = global.fetch;

  global.fetch = async (url, options = {}) => {
    const requestUrl = String(url);
    calls.push(requestUrl);
    headersByUrl.set(requestUrl, options.headers || {});
    const parsed = new URL(requestUrl);

    if (parsed.pathname === '/search' && parsed.searchParams.get('type') === 'tv') {
      assert.equal(parsed.searchParams.get('q'), 'naruto');
      return Response.json({ items: [{ subject_id: 'omni-naruto', title: 'Naruto' }] });
    }

    if (parsed.pathname === '/search' && parsed.searchParams.get('type') === 'movie') {
      assert.equal(parsed.searchParams.get('q'), 'avengers');
      return Response.json({ data: [{ subject_id: 'omni-avengers', title: 'Avengers' }] });
    }

    if (parsed.pathname === '/download' && parsed.searchParams.get('subject_id') === 'omni-naruto') {
      assert.equal(options.headers?.Referer, 'https://videodownloader.site/');
      assert.equal(options.headers?.Origin, 'https://videodownloader.site');
      assert.equal(parsed.searchParams.get('season'), '1');
      assert.equal(parsed.searchParams.get('episode'), '1');
      assert.equal(parsed.searchParams.has('detail_path'), false);
      return Response.json({
        subject: { title: 'Naruto', cover_url: 'https://cdn.example/naruto.jpg' },
        downloads: [{ resolution: 1080, size: '123 MB', url: 'https://cdn.example/naruto-s1e1.mp4' }],
        subtitles: [{ language_name: 'English', url: 'https://cdn.example/naruto-s1e1.vtt' }]
      });
    }

    if (parsed.pathname === '/download' && parsed.searchParams.get('subject_id') === 'omni-avengers') {
      assert.equal(parsed.searchParams.has('season'), false);
      assert.equal(parsed.searchParams.has('episode'), false);
      return Response.json({
        subject: { title: 'Avengers' },
        downloads: [{ resolution: '720p', size: '1.2 GB', url: 'https://cdn.example/avengers.mp4' }]
      });
    }

    if (parsed.pathname === '/download' && parsed.searchParams.get('subject_id') === 'omni-fallback') {
      return Response.json({ subject: { title: 'Fallback Movie' }, downloads: [] });
    }

    if (parsed.pathname === '/api/subject/omni-fallback/downloads') {
      return Response.json([
        {
          resolution: 480,
          url: 'https://cdn.example/fallback.mp4',
          headers: { Referer: 'https://custom.example/', headersUserAgent: 'CustomAgent/1.0' }
        }
      ]);
    }

    throw new Error(`Unexpected upstream URL: ${requestUrl}`);
  };

  try {
    const animeSearch = await request('/api/search/tv?q=naruto');
    assert.equal(animeSearch.statusCode, 200);
    assert.equal(animeSearch.json().results[0].subject_id, 'omni-naruto');

    const animeDownload = await request('/api/download?subject_id=omni-naruto&season=1&episode=1');
    assert.equal(animeDownload.statusCode, 200);
    assert.equal(animeDownload.json().downloads[0].url, 'https://cdn.example/naruto-s1e1.mp4');
    assert.equal(animeDownload.json().subtitles[0].lang, 'English');

    const movieSearch = await request('/api/search/movie?q=avengers');
    assert.equal(movieSearch.statusCode, 200);
    assert.equal(movieSearch.json().results[0].subject_id, 'omni-avengers');

    const movieDownload = await request('/api/download?subject_id=omni-avengers');
    assert.equal(movieDownload.statusCode, 200);
    assert.equal(movieDownload.json().downloads[0].url, 'https://cdn.example/avengers.mp4');
    assert.equal(movieDownload.json().downloads[0].headers.Referer, 'https://videodownloader.site/');
    assert.match(movieDownload.json().downloads[0].headers['User-Agent'], /Chrome\/124/);

    const fallbackDownload = await request('/api/download?subject_id=omni-fallback');
    assert.equal(fallbackDownload.statusCode, 200);
    assert.equal(fallbackDownload.json().downloads[0].url, 'https://cdn.example/fallback.mp4');
    assert.equal(fallbackDownload.json().downloads[0].resolution, '480p');
    assert.equal(fallbackDownload.json().downloads[0].headers.Referer, 'https://custom.example/');
    assert.equal(fallbackDownload.json().downloads[0].headers['User-Agent'], 'CustomAgent/1.0');

    assert.equal(
      headersByUrl.get('https://videodownloader.site/search?q=naruto&type=tv').Referer,
      'https://videodownloader.site/'
    );

    const animeStream = await request('/api/anime/stream?mal_id=20&episode=1&lang=sub');
    assert.equal(animeStream.statusCode, 200);
    assert.equal(animeStream.json().sources[0].name, 'MegaPlay');
    assert.equal(animeStream.json().player, 'https://megaplay.buzz/stream/mal/20/1/sub');

    assert.deepEqual(calls, [
      'https://videodownloader.site/search?q=naruto&type=tv',
      'https://videodownloader.site/download?subject_id=omni-naruto&season=1&episode=1',
      'https://videodownloader.site/search?q=avengers&type=movie',
      'https://videodownloader.site/download?subject_id=omni-avengers',
      'https://videodownloader.site/download?subject_id=omni-fallback',
      'https://videodownloader.site/api/subject/omni-fallback/downloads'
    ]);
  } finally {
    global.fetch = originalFetch;
  }

  console.log('Movie and anime OmniSave download flows are wired correctly.');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
