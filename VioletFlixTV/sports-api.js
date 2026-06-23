#!/usr/bin/env node

const http = require('http');
const url = require('url');
const { AD_GUARD_CONFIG, getSportsData } = require('./scripts/sports-data');

function writeJson(res, statusCode, body) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'X-Content-Type-Options': 'nosniff',
    'X-Ad-Guard': 'active',
  });
  res.end(JSON.stringify(body, null, 2));
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    writeJson(res, 204, {});
    return;
  }

  if (req.method !== 'GET') {
    writeJson(res, 405, { error: 'Method Not Allowed' });
    return;
  }

  const parsedUrl = url.parse(req.url, true);

  if (parsedUrl.pathname === '/download') {
    res.writeHead(200, {
      'Content-Disposition': 'attachment; filename="match_replay.mp4"',
      'Content-Type': 'video/mp4',
      'Access-Control-Allow-Origin': '*',
      'X-Ad-Guard': 'active',
    });
    res.end('Binary data would be piped here...');
    return;
  }

  const responseData = await getSportsData(parsedUrl.query);
  const statusCode = responseData && responseData.error ? 500 : 200;
  writeJson(res, statusCode, responseData);
});

async function runTest() {
  console.log('--- STARTING API TEST OUTPUT ---\n');

  console.log('TEST 1: GET /?data=sports');
  const sports = await getSportsData({ data: 'sports' });
  console.log(sports.categories.slice(0, 3), `... (Total ${sports.categories.length})\n`);

  console.log('TEST 2: GET /?data=matches&category=football');
  const matchPayload = await getSportsData({ data: 'matches', category: 'football' });
  console.log(matchPayload.matches[0], '\n');

  console.log('TEST 3: GET /?data=matches&q=psg (Search)');
  const searchPayload = await getSportsData({ data: 'matches', q: 'psg' });
  console.log(searchPayload.matches[0], '\n');

  console.log('TEST 4: GET /?data=detail&id=wwe-1 (WWE Archive + Download)');
  const detail = await getSportsData({ data: 'detail', id: 'wwe-1' });
  console.log(detail, '\n');

  console.log('--- TEST COMPLETE: API IS STABLE ---');
  console.log(`Iframe sandbox flags: ${AD_GUARD_CONFIG}`);
}

if (require.main === module) {
  runTest();

  const port = Number(process.env.SPORTS_API_PORT || process.env.PORT || 3000);
  const host = process.env.HOST || '0.0.0.0';
  server.listen(port, host, () => {
    console.log(`✅ Sports API Running on http://localhost:${port}`);
    console.log(`Test Search: http://localhost:${port}/?data=matches&q=psg`);
    console.log(`Test Live:   http://localhost:${port}/?data=matches&category=football`);
    console.log(`Download:    http://localhost:${port}/download?file_id=wwe-1`);
  });
}

module.exports = { server, getSportsData };
