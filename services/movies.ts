import { getEpisodeResource, getMediaDetail, searchMedia } from './providers';

export async function searchMovies(query: string, locale = 'en') {
  return searchMedia(query, 'movie', locale);
}

export async function movieDetail(detailPath: string, locale = 'en') {
  return getMediaDetail(detailPath, locale);
}

export async function movieStream(detailPath: string, locale = 'en') {
  const details = await getMediaDetail(detailPath, locale);
  return getEpisodeResource({
    subjectId: String(details.subjectId),
    detailPath: details.detailPath || detailPath,
    se: 1,
    ep: 1,
    locale,
  });
}

export async function movieDownload(detailPath: string, locale = 'en') {
  return movieStream(detailPath, locale);
}

export async function movieSubtitles(detailPath: string, locale = 'en') {
  const details = await getMediaDetail(detailPath, locale);
  return details.subtitles || [];
}
