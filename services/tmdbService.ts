import { TMDB_CONFIG } from '@/constants/config';

const BASE = TMDB_CONFIG.BASE_URL;
const KEY = TMDB_CONFIG.API_KEY;

async function get<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const query = new URLSearchParams({ api_key: KEY, ...params }).toString();
  const res = await fetch(`${BASE}${endpoint}?${query}`);
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

// ─── Movies ──────────────────────────────────────────────────────────────────

export async function getTrendingMovies(timeWindow: 'day' | 'week' = 'week') {
  return get<TMDBListResponse>(`/trending/movie/${timeWindow}`);
}

export async function getPopularMovies(page = 1) {
  return get<TMDBListResponse>('/movie/popular', { page: String(page) });
}

export async function getTopRatedMovies(page = 1) {
  return get<TMDBListResponse>('/movie/top_rated', { page: String(page) });
}

export async function getNowPlayingMovies() {
  return get<TMDBListResponse>('/movie/now_playing');
}

export async function getUpcomingMovies() {
  return get<TMDBListResponse>('/movie/upcoming');
}

export async function getMovieDetails(id: number) {
  return get<TMDBMovieDetail>(`/movie/${id}`, { append_to_response: 'videos,credits,similar,recommendations' });
}

export async function discoverMovies(params: Record<string, string> = {}) {
  return get<TMDBListResponse>('/discover/movie', params);
}

// ─── TV / Series ──────────────────────────────────────────────────────────────

export async function getTrendingTV(timeWindow: 'day' | 'week' = 'week') {
  return get<TMDBListResponse>(`/trending/tv/${timeWindow}`);
}

export async function getPopularTV(page = 1) {
  return get<TMDBListResponse>('/tv/popular', { page: String(page) });
}

export async function getTopRatedTV(page = 1) {
  return get<TMDBListResponse>('/tv/top_rated', { page: String(page) });
}

export async function getOnTheAirTV(page = 1) {
  return get<TMDBListResponse>('/tv/on_the_air', { page: String(page) });
}

export async function getAiringTodayTV(page = 1) {
  return get<TMDBListResponse>('/tv/airing_today', { page: String(page) });
}

export async function getTVDetails(id: number) {
  return get<TMDBTVDetail>(`/tv/${id}`, { append_to_response: 'videos,credits,similar' });
}

export async function getTVSeasonDetails(tvId: number, season: number) {
  return get<TMDBSeason>(`/tv/${tvId}/season/${season}`);
}

export async function discoverTV(params: Record<string, string> = {}) {
  return get<TMDBListResponse>('/discover/tv', params);
}

// ─── Search ───────────────────────────────────────────────────────────────────

export async function searchMulti(query: string, page = 1) {
  return get<TMDBListResponse>('/search/multi', { query, page: String(page) });
}

export async function searchMovies(query: string, params: Record<string, string> = {}, page = 1) {
  return get<TMDBListResponse>('/search/movie', { query, page: String(page), ...params });
}

export async function searchTV(query: string, params: Record<string, string> = {}, page = 1) {
  return get<TMDBListResponse>('/search/tv', { query, page: String(page), ...params });
}

// ─── Genres ──────────────────────────────────────────────────────────────────

export async function getMovieGenres() {
  return get<{ genres: TMDBGenre[] }>('/genre/movie/list');
}

export async function getTVGenres() {
  return get<{ genres: TMDBGenre[] }>('/genre/tv/list');
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TMDBItem {
  id: number;
  title?: string;
  name?: string;
  original_title?: string;
  original_name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  genre_ids?: number[];
  media_type?: string;
  popularity: number;
  networks?: TMDBNetwork[];
  number_of_seasons?: number;
  number_of_episodes?: number;
  in_production?: boolean;
}

export interface TMDBListResponse {
  page: number;
  results: TMDBItem[];
  total_pages: number;
  total_results: number;
}

export interface TMDBGenre {
  id: number;
  name: string;
}

export interface TMDBNetwork {
  id: number;
  name: string;
  logo_path: string | null;
  origin_country: string;
}

export interface TMDBVideo {
  id: string;
  key: string;
  name: string;
  site: string;
  type: string;
}

export interface TMDBMovieDetail extends TMDBItem {
  runtime: number;
  genres: TMDBGenre[];
  tagline: string;
  status: string;
  budget: number;
  revenue: number;
  videos: { results: TMDBVideo[] };
  credits: { cast: TMDBCastMember[]; crew: TMDBCastMember[] };
  similar: TMDBListResponse;
  recommendations: TMDBListResponse;
}

export interface TMDBTVDetail extends TMDBItem {
  number_of_seasons: number;
  number_of_episodes: number;
  genres: TMDBGenre[];
  tagline: string;
  status: string;
  seasons: TMDBSeasonMeta[];
  videos: { results: TMDBVideo[] };
  credits: { cast: TMDBCastMember[] };
  similar: TMDBListResponse;
  networks: TMDBNetwork[];
}

export interface TMDBSeasonMeta {
  id: number;
  name: string;
  season_number: number;
  episode_count: number;
  poster_path: string | null;
  air_date: string;
}

export interface TMDBSeason {
  id: number;
  name: string;
  season_number: number;
  episodes: TMDBEpisode[];
}

export interface TMDBEpisode {
  id: number;
  name: string;
  episode_number: number;
  season_number: number;
  overview: string;
  still_path: string | null;
  air_date: string;
  vote_average: number;
  runtime: number;
}

export interface TMDBCastMember {
  id: number;
  name: string;
  character?: string;
  job?: string;
  profile_path: string | null;
}
