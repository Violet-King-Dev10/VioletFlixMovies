import { useState, useEffect, useCallback } from 'react';
import {
  getTrendingTV, getPopularTV, getTopRatedTV, getOnTheAirTV,
  getAiringTodayTV, discoverTV, TMDBItem,
} from '@/services/tmdbService';

export type TVCategory = 'trending' | 'popular' | 'top_rated' | 'on_the_air' | 'airing_today';

export interface TVFilters {
  genres: number[];
  minRating: number;
  yearFrom: number | null;
  yearTo: number | null;
  sortBy: string;
}

export const DEFAULT_TV_FILTERS: TVFilters = {
  genres: [],
  minRating: 0,
  yearFrom: null,
  yearTo: null,
  sortBy: 'popularity.desc',
};

export function useTV(category: TVCategory = 'trending', filters: TVFilters = DEFAULT_TV_FILTERS) {
  const [shows, setShows] = useState<TMDBItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = filters.genres.length > 0 || filters.minRating > 0 || filters.yearFrom !== null;

  const load = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) { setLoading(true); } else { setLoadingMore(true); }
    try {
      let res: { results: TMDBItem[]; total_pages: number };

      if (hasFilters) {
        const params: Record<string, string> = { page: String(pageNum), sort_by: filters.sortBy };
        if (filters.genres.length > 0) params['with_genres'] = filters.genres.join(',');
        if (filters.minRating > 0) params['vote_average.gte'] = String(filters.minRating);
        if (filters.yearFrom) params['first_air_date.gte'] = `${filters.yearFrom}-01-01`;
        if (filters.yearTo) params['first_air_date.lte'] = `${filters.yearTo}-12-31`;
        res = await discoverTV(params);
      } else {
        switch (category) {
          case 'trending': res = await getTrendingTV('week'); break;
          case 'popular': res = await getPopularTV(pageNum); break;
          case 'top_rated': res = await getTopRatedTV(pageNum); break;
          case 'on_the_air': res = await getOnTheAirTV(pageNum); break;
          case 'airing_today': res = await getAiringTodayTV(pageNum); break;
          default: res = await getTrendingTV('week');
        }
      }

      if (reset || pageNum === 1) {
        setShows(res.results);
      } else {
        setShows(prev => [...prev, ...res.results]);
      }
      setHasMore(pageNum < (res.total_pages || 1));
      setPage(pageNum);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading series');
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

  return { shows, loading, loadingMore, hasMore, error, loadMore, refresh: () => load(1, true) };
}
