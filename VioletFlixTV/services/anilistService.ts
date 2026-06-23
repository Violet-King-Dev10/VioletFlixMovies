import { ANILIST_CONFIG } from '@/constants/config';

async function query<T>(gql: string, variables: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(ANILIST_CONFIG.BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables }),
  });
  if (!res.ok) throw new Error(`AniList error: ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(json.errors[0].message);
  return json.data;
}

const ANIME_FIELDS = `
  id idMal title { romaji english } coverImage { large extraLarge color }
  bannerImage episodes averageScore popularity genres description
  startDate { year } endDate { year } status season seasonYear
  format duration studios { nodes { name isAnimationStudio } }
  nextAiringEpisode { episode airingAt }
`;

const PAGE_INFO = `pageInfo { total currentPage lastPage hasNextPage perPage }`;

export async function getTrendingAnime(page = 1, perPage = 20) {
  const gql = `
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(sort: TRENDING_DESC, type: ANIME, isAdult: false) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, { page, perPage });
  return data.Page;
}

export async function getPopularAnime(page = 1, perPage = 20) {
  const gql = `
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(sort: POPULARITY_DESC, type: ANIME, isAdult: false) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, { page, perPage });
  return data.Page;
}

export async function getSeasonalAnime(season: string, year: number, page = 1) {
  const gql = `
    query($season: MediaSeason, $year: Int, $page: Int) {
      Page(page: $page, perPage: 20) {
        ${PAGE_INFO}
        media(season: $season, seasonYear: $year, type: ANIME, sort: POPULARITY_DESC, isAdult: false) {
          ${ANIME_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, { season, year, page });
  return data.Page;
}

export async function getTopRatedAnime(page = 1, perPage = 20) {
  const gql = `
    query($page: Int, $perPage: Int) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(sort: SCORE_DESC, type: ANIME, isAdult: false, format_in: [TV, MOVIE]) {
          ${ANIME_FIELDS}
        }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, { page, perPage });
  return data.Page;
}

export async function getAnimeDetail(id: number) {
  const gql = `
    query($id: Int) {
      Media(id: $id, type: ANIME) {
        ${ANIME_FIELDS}
        relations { edges { relationType node { id title { romaji english } coverImage { large } format } } }
        characters(sort: ROLE, perPage: 12) {
          nodes { id name { full } image { large } }
        }
        recommendations(perPage: 6) {
          nodes { mediaRecommendation { ${ANIME_FIELDS} } }
        }
      }
    }
  `;
  const data = await query<{ Media: AniListMedia }>(gql, { id });
  return data.Media;
}

export async function searchAnime(searchQuery: string, page = 1, filters: AnimeSearchFilters = {}) {
  const vars: Record<string, unknown> = { search: searchQuery, page, perPage: 20 };
  let extraFilters = '';
  if (filters.genres && filters.genres.length > 0) {
    vars.genres = filters.genres;
    extraFilters += ', genre_in: $genres';
  }
  if (filters.minScore) {
    vars.minScore = filters.minScore;
    extraFilters += ', averageScore_greater: $minScore';
  }
  if (filters.year) {
    vars.year = filters.year;
    extraFilters += ', seasonYear: $year';
  }
  if (filters.sort) {
    vars.sort = [filters.sort];
    extraFilters += ', sort: $sort';
  }

  const genreParam = filters.genres && filters.genres.length > 0 ? ', $genres: [String]' : '';
  const scoreParam = filters.minScore ? ', $minScore: Int' : '';
  const yearParam = filters.year ? ', $year: Int' : '';
  const sortParam = filters.sort ? ', $sort: [MediaSort]' : '';

  const gql = `
    query($search: String, $page: Int, $perPage: Int${genreParam}${scoreParam}${yearParam}${sortParam}) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(search: $search, type: ANIME, isAdult: false${extraFilters}) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, vars);
  return data.Page;
}

export async function getAnimeGenres(): Promise<string[]> {
  const gql = `
    query {
      GenreCollection
    }
  `;
  const data = await query<{ GenreCollection: string[] }>(gql);
  return data.GenreCollection || [];
}

export async function browseAnime(filters: AnimeSearchFilters = {}, page = 1) {
  const vars: Record<string, unknown> = { page, perPage: 20 };
  let extraFilters = '';

  if (filters.genres && filters.genres.length > 0) {
    vars.genres = filters.genres;
    extraFilters += ', genre_in: $genres';
  }
  if (filters.minScore) {
    vars.minScore = filters.minScore;
    extraFilters += ', averageScore_greater: $minScore';
  }
  if (filters.year) {
    vars.year = filters.year;
    extraFilters += ', seasonYear: $year';
  }
  const sortVal = filters.sort || 'TRENDING_DESC';
  vars.sort = [sortVal];

  const genreParam = filters.genres && filters.genres.length > 0 ? ', $genres: [String]' : '';
  const scoreParam = filters.minScore ? ', $minScore: Int' : '';
  const yearParam = filters.year ? ', $year: Int' : '';

  const gql = `
    query($page: Int, $perPage: Int, $sort: [MediaSort]${genreParam}${scoreParam}${yearParam}) {
      Page(page: $page, perPage: $perPage) {
        ${PAGE_INFO}
        media(sort: $sort, type: ANIME, isAdult: false${extraFilters}) { ${ANIME_FIELDS} }
      }
    }
  `;
  const data = await query<{ Page: AniListPage }>(gql, vars);
  return data.Page;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface AnimeSearchFilters {
  genres?: string[];
  minScore?: number;
  year?: number;
  sort?: string;
}

export interface AniListMedia {
  id: number;
  idMal: number | null;
  title: { romaji: string; english: string | null };
  coverImage: { large: string; extraLarge: string; color: string | null };
  bannerImage: string | null;
  episodes: number | null;
  averageScore: number | null;
  popularity: number;
  genres: string[];
  description: string | null;
  startDate: { year: number | null };
  endDate: { year: number | null };
  status: string;
  season: string | null;
  seasonYear: number | null;
  format: string | null;
  duration: number | null;
  studios: { nodes: { name: string; isAnimationStudio: boolean }[] };
  nextAiringEpisode: { episode: number; airingAt: number } | null;
  relations?: {
    edges: { relationType: string; node: { id: number; title: { romaji: string; english: string | null }; coverImage: { large: string }; format: string } }[];
  };
  characters?: { nodes: { id: number; name: { full: string }; image: { large: string } }[] };
  recommendations?: { nodes: { mediaRecommendation: AniListMedia }[] };
}

export interface AniListPage {
  pageInfo: { total: number; currentPage: number; lastPage: number; hasNextPage: boolean; perPage: number };
  media: AniListMedia[];
}
