const APP_PACKAGE_RE = /\.(?:apk|aab)$/i;
const KNOWN_BOT_RE = /(?:bot|crawler|spider|scraper|curl|wget|python-requests|httpclient|libwww|headless|phantomjs|selenium|playwright|puppeteer|scrapy|facebookexternalhit|discordbot|telegrambot|slurp|bingpreview)/i;

function getHeader(req, name) {
  const value = req.headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

function isAppPackagePath(pathname) {
  return APP_PACKAGE_RE.test(pathname);
}

function isLikelyBot(req) {
  const userAgent = getHeader(req, 'user-agent') || '';
  return !userAgent || KNOWN_BOT_RE.test(userAgent);
}

function hasValidPackageToken(req, requestUrl) {
  const expected = process.env.APP_PACKAGE_DOWNLOAD_TOKEN;
  if (!expected) return true;

  const provided = getHeader(req, 'x-download-token')
    || requestUrl.searchParams.get('download_token')
    || requestUrl.searchParams.get('token');

  return provided === expected;
}

function packageDownloadBlock(req, requestUrl) {
  if (!isAppPackagePath(requestUrl.pathname)) return null;

  if (isLikelyBot(req)) {
    return {
      statusCode: 403,
      body: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    };
  }

  if (!hasValidPackageToken(req, requestUrl)) {
    return {
      statusCode: 403,
      body: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      },
    };
  }

  return null;
}

function packageDownloadHeaders(filePath, headers) {
  if (!isAppPackagePath(filePath)) return headers;

  return {
    ...headers,
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'Cache-Control': 'private, no-store',
  };
}

module.exports = {
  packageDownloadBlock,
  packageDownloadHeaders,
};
