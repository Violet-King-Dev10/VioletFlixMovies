import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { getTrendingMovies, getPopularMovies, getNowPlayingMovies, TMDBItem } from '@/services/tmdbService';
import { getTrendingAnime, getPopularAnime, AniListMedia } from '@/services/anilistService';

const HOME_CACHE_KEY = 'violetflixtv_home_cache';
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export interface HomeData {
  heroItems: TMDBItem[];
  trendingMovies: TMDBItem[];
  nowPlaying: TMDBItem[];
  popularMovies: TMDBItem[];
  trendingAnime: AniListMedia[];
  popularAnime: AniListMedia[];
}

interface CacheEntry {
  data: HomeData;
  timestamp: number;
}

const EMPTY: HomeData = {
  heroItems: [], trendingMovies: [], nowPlaying: [],
  popularMovies: [], trendingAnime: [], popularAnime: [],
};

async function readCache(): Promise<CacheEntry | null> {
  try {
    const raw = await AsyncStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    return entry;
  } catch {
    return null;
  }
}

async function writeCache(data: HomeData): Promise<void> {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    await AsyncStorage.setItem(HOME_CACHE_KEY, JSON.stringify(entry));
  } catch {
    // silently fail
  }
}

async function fetchFresh(): Promise<HomeData> {
  const [trending, nowPlaying, popular, anTrending, anPopular] = await Promise.all([
    getTrendingMovies('week'),
    getNowPlayingMovies(),
    getPopularMovies(),
    getTrendingAnime(1, 10),
    getPopularAnime(1, 10),
  ]);
  return {
    heroItems: trending.results.slice(0, 10),
    trendingMovies: trending.results.slice(0, 20),
    nowPlaying: nowPlaying.results.slice(0, 15),
    popularMovies: popular.results.slice(0, 20),
    trendingAnime: anTrending.media.slice(0, 10),
    popularAnime: anPopular.media.slice(0, 20),
  };
}

export function useHome() {
  const [data, setData] = useState<HomeData>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [isStale, setIsStale] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Network state listener
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      if (mountedRef.current) {
        setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
      }
    });
    // Fetch initial state
    NetInfo.fetch().then((state: NetInfoState) => {
      if (mountedRef.current) {
        setIsOffline(!(state.isConnected && state.isInternetReachable !== false));
      }
    });
    return () => unsubscribe();
  }, []);

  const load = useCallback(async (forceRefresh = false) => {
    if (!mountedRef.current) return;
    setError(null);

    // Step 1: Load from cache immediately
    const cached = await readCache();
    const cacheAge = cached ? Date.now() - cached.timestamp : Infinity;
    const cacheValid = cacheAge < CACHE_TTL;

    if (cached && !forceRefresh) {
      if (mountedRef.current) {
        setData(cached.data);
        setLoading(false);
        setIsStale(!cacheValid);
      }
    } else {
      if (mountedRef.current) setLoading(true);
    }

    // Step 2: Check network
    const netState = await NetInfo.fetch();
    const online = netState.isConnected && netState.isInternetReachable !== false;

    if (!online) {
      if (mountedRef.current) {
        setIsOffline(true);
        setLoading(false);
        if (!cached) {
          setError('No internet connection and no cached data available.');
        }
      }
      return;
    }

    // Step 3: Fetch fresh data in background (or foreground if no cache)
    if (!cacheValid || forceRefresh || !cached) {
      try {
        const fresh = await fetchFresh();
        await writeCache(fresh);
        if (mountedRef.current) {
          setData(fresh);
          setIsStale(false);
          setError(null);
        }
      } catch (e: unknown) {
        if (mountedRef.current) {
          // Only show error if we have no data to show
          if (!cached) {
            setError(e instanceof Error ? e.message : 'Failed to load content');
          }
          // If we have cached data, silently fail the background refresh
        }
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    }
  }, []);

  const refresh = useCallback(() => load(true), [load]);

  useEffect(() => {
    load(false);
  }, [load]);

  return { ...data, loading, error, isOffline, isStale, refresh };
}
