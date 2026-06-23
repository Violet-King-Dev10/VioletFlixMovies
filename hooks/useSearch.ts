import { useState, useCallback, useRef } from 'react';
import { searchMovies, searchTV, TMDBItem, discoverMovies, discoverTV } from '@/services/tmdbService';
import { searchAnime, browseAnime, AniListMedia } from '@/services/anilistService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SEARCH_HISTORY_KEY = 'violetflixtv_search_history';

export type SearchFilter = 'all' | 'movies' | 'tv' | 'anime';
export type SortOption = 'popularity' | 'rating' | 'newest' | 'oldest';

export interface AdvancedFilters {
  yearFrom: number | null;
  yearTo: number | null;
  minRating: number;
  genres: number[];
  animeGenres: string[];
  sortBy: SortOption;
}

export const DEFAULT_FILTERS: AdvancedFilters = {
  yearFrom: null,
  yearTo: null,
  minRating: 0,
  genres: [],
  animeGenres: [],
  sortBy: 'popularity',
};

export interface SearchResult {
  movies: TMDBItem[];
  tv: TMDBItem[];
  anime: AniListMedia[];
}

function buildTMDBSortParam(sort: SortOption): string {
  switch (sort) {
    case 'rating': return 'vote_average.desc';
    case 'newest': return 'release_date.desc';
    case 'oldest': return 'release_date.asc';
    default: return 'popularity.desc';
  }
}

function buildAniListSortParam(sort: SortOption): string {
  switch (sort) {
    case 'rating': return 'SCORE_DESC';
    case 'newest': return 'START_DATE_DESC';
    case 'oldest': return 'START_DATE';
    default: return 'POPULARITY_DESC';
  }
}

export function useSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult>({ movies: [], tv: [], anime: [] });
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<SearchFilter>('all');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>(DEFAULT_FILTERS);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeFilterCount = (
    (advancedFilters.yearFrom ? 1 : 0) +
    (advancedFilters.yearTo ? 1 : 0) +
    (advancedFilters.minRating > 0 ? 1 : 0) +
    (advancedFilters.genres.length > 0 ? 1 : 0) +
    (advancedFilters.animeGenres.length > 0 ? 1 : 0) +
    (advancedFilters.sortBy !== 'popularity' ? 1 : 0)
  );

  const loadHistory = useCallback(async () => {
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    setSearchHistory(raw ? JSON.parse(raw) : []);
  }, []);

  const saveToHistory = useCallback(async (term: string) => {
    if (!term.trim()) return;
    const raw = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
    const history: string[] = raw ? JSON.parse(raw) : [];
    const updated = [term, ...history.filter(h => h !== term)].slice(0, 20);
    await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updated));
    setSearchHistory(updated);
  }, []);

  const clearHistory = useCallback(async () => {
    await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
    setSearchHistory([]);
  }, []);

  const search = useCallback(async (term: string, filters: AdvancedFilters = advancedFilters) => {
    if (!term.trim()) {
      setResults({ movies: [], tv: [], anime: [] });
      return;
    }
    setLoading(true);
    try {
      const tmdbParams: Record<string, string> = {};
      if (filters.yearFrom) tmdbParams['primary_release_date.gte'] = `${filters.yearFrom}-01-01`;
      if (filters.yearTo) tmdbParams['primary_release_date.lte'] = `${filters.yearTo}-12-31`;
      if (filters.minRating > 0) tmdbParams['vote_average.gte'] = String(filters.minRating);
      if (filters.genres.length > 0) tmdbParams['with_genres'] = filters.genres.join(',');
      tmdbParams['sort_by'] = buildTMDBSortParam(filters.sortBy);

      const aniFilters = {
        genres: filters.animeGenres,
        minScore: filters.minRating > 0 ? filters.minRating * 10 : undefined,
        year: filters.yearFrom || undefined,
        sort: buildAniListSortParam(filters.sortBy),
      };

      const [movies, tv, animeRes] = await Promise.all([
        searchMovies(term, tmdbParams).then(r => r.results.slice(0, 10)),
        searchTV(term, {}).then(r => r.results.slice(0, 10)),
        searchAnime(term, 1, aniFilters).then(r => r.media.slice(0, 10)),
      ]);
      setResults({ movies, tv, anime: animeRes });
      await saveToHistory(term);
    } catch {
      setResults({ movies: [], tv: [], anime: [] });
    } finally {
      setLoading(false);
    }
  }, [advancedFilters, saveToHistory]);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 500);
  }, [search]);

  const applyFilters = useCallback((filters: AdvancedFilters) => {
    setAdvancedFilters(filters);
    if (query.trim()) {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => search(query, filters), 300);
    }
  }, [query, search]);

  const totalResults = results.movies.length + results.tv.length + results.anime.length;

  return {
    query, setQuery: handleQueryChange, results, loading,
    filter, setFilter, totalResults,
    searchHistory, loadHistory, clearHistory,
    advancedFilters, applyFilters, activeFilterCount,
  };
}
