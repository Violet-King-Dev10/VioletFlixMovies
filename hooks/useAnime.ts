import { useState, useEffect, useCallback } from 'react';
import {
  getTrendingAnime, getPopularAnime, getTopRatedAnime,
  getSeasonalAnime, browseAnime, AniListMedia, AniListPage,
} from '@/services/anilistService';

export type AnimeCategory = 'trending' | 'popular' | 'top_rated' | 'seasonal';

export interface AnimeFilters {
  genres: string[];
  minScore: number;
  year: number | null;
  sortBy: string;
}

export const DEFAULT_ANIME_FILTERS: AnimeFilters = {
  genres: [],
  minScore: 0,
  year: null,
  sortBy: 'TRENDING_DESC',
};

const now = new Date();
const currentYear = now.getFullYear();
const seasons = ['WINTER', 'SPRING', 'SUMMER', 'FALL'];
const currentSeason = seasons[Math.floor(now.getMonth() / 3)];

export function useAnime(category: AnimeCategory = 'trending', filters: AnimeFilters = DEFAULT_ANIME_FILTERS) {
  const [anime, setAnime] = useState<AniListMedia[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const hasFilters = filters.genres.length > 0 || filters.minScore > 0 || filters.year !== null;

  const load = useCallback(async (pageNum = 1, reset = false) => {
    if (pageNum === 1) { setLoading(true); } else { setLoadingMore(true); }
    try {
      let res: AniListPage;

      if (hasFilters) {
        res = await browseAnime({
          genres: filters.genres,
          minScore: filters.minScore > 0 ? filters.minScore * 10 : undefined,
          year: filters.year || undefined,
          sort: filters.sortBy,
        }, pageNum);
      } else {
        switch (category) {
          case 'trending': res = await getTrendingAnime(pageNum); break;
          case 'popular': res = await getPopularAnime(pageNum); break;
          case 'top_rated': res = await getTopRatedAnime(pageNum); break;
          case 'seasonal': res = await getSeasonalAnime(currentSeason, currentYear, pageNum); break;
          default: res = await getTrendingAnime(pageNum);
        }
      }

      if (reset || pageNum === 1) {
        setAnime(res.media);
      } else {
        setAnime(prev => [...prev, ...res.media]);
      }
      setHasMore(res.pageInfo.hasNextPage);
      setPage(pageNum);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error loading anime');
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

  return { anime, loading, loadingMore, hasMore, error, loadMore, refresh: () => load(1, true) };
}
