import { useState, useEffect, useCallback } from 'react';
import {
  getPopularMovies, getTopRatedMovies, getNowPlayingMovies,
  getUpcomingMovies, getTrendingMovies, discoverMovies, TMDBItem,
} from '@/services/tmdbService';

export type MovieCategory = 'popular' | 'top_rated' | 'now_playing' | 'upcoming' | 'trending';

export interface MovieFilters {
  genres: number[];
  minRating: number;
  yearFrom: number | null;
  yearTo: number | null;
  sortBy: string;
}

export const DEFAULT_MOVIE_FILTERS: MovieFilters = {
  genres: [],
  minRating: 0,
  yearFrom: null,
  yearTo: null,
  sortBy: 'popularity.desc',
};

export function useMovies(category: MovieCategory = 'popular', filters: MovieFilters = DEFAULT_MOVIE_FILTERS) {
  const [movies, setMovies] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = filters.genres.length > 0 || filters.minRating > 0 || filters.yearFrom !== null || filters.yearTo !== null;

  const load = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) { setLoading(true); } else { setLoadingMore(true); }
    try {
      let res: { results: TMDBItem[]; total_pages: number };

      if (hasFilters) {
        const params: Record<string, string> = { page: String(pageNum), sort_by: filters.sortBy };
        if (filters.genres.length > 0) params['with_genres'] = filters.genres.join(',');
        if (filters.minRating > 0) params['vote_average.gte'] = String(filters.minRating);
        if (filters.yearFrom) params['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
        if (filters.yearTo) params['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
        res = await discoverMovies(params);
      } else {
        switch (category) {
          case 'popular': res = await getPopularMovies(pageNum); break;
          case 'top_rated': res = await getTopRatedMovies(pageNum); break;
          case 'now_playing': res = await getNowPlayingMovies(); break;
          case 'upcoming': res = await getUpcomingMovies(); break;
          case 'trending': res = await getTrendingMovies('week'); break;
          default: res = await getPopularMovies(pageNum);
        }
      }

      if (reset || pageNum === 1) {
        setMovies(res.results);
      } else {
        setMovies(prev => [...prev, ...res.results]);
      }
      setHasMore(pageNum < (res.total_pages || 1));
      setPage(pageNum);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading movies');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [category, hasFilters, filters]);

  useEffect(() => {
    load(1, true);
  }, [load]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore) load(page + 1);
  }, [loadingMore, hasMore, page, load]);

  return { movies, loading, loadingMore, hasMore, error, loadMore, refresh: () => load(1, true) };
}
