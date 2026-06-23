import React, { createContext, useState, useCallback, useEffect, ReactNode } from 'react';
import {
  WatchlistItem, HistoryItem, DownloadItem,
  getWatchlist, addToWatchlist, removeFromWatchlist, isInWatchlist,
  getHistory, addToHistory, clearHistory,
  getDownloads, addDownload, removeDownload,
} from '@/services/watchlistService';
import {
  getCloudWatchlist, addCloudWatchlist, removeCloudWatchlist, isInCloudWatchlist,
  getCloudHistory, addCloudHistory, clearCloudHistory,
  getCloudDownloads, addCloudDownload, removeCloudDownload,
} from '@/services/supabaseWatchlistService';
import { getSupabaseClient } from '@/template';

interface WatchlistContextType {
  watchlist: WatchlistItem[];
  history: HistoryItem[];
  downloads: DownloadItem[];
  loading: boolean;
  addItem: (item: Omit<WatchlistItem, 'addedAt'>) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  checkInWatchlist: (id: string) => Promise<boolean>;
  addHistoryItem: (item: Omit<HistoryItem, 'watchedAt' | 'addedAt'>) => Promise<void>;
  clearAllHistory: () => Promise<void>;
  startDownload: (item: Omit<DownloadItem, 'downloadedAt' | 'addedAt'>) => Promise<void>;
  cancelDownload: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const WatchlistContext = createContext<WatchlistContextType | undefined>(undefined);


function getSafeSupabaseClient() {
  try {
    return getSupabaseClient();
  } catch (error) {
    console.warn('[WatchlistProvider] Supabase unavailable, using local storage:', error);
    return null;
  }
}

export function WatchlistProvider({ children }: { children: ReactNode }) {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [downloads, setDownloads] = useState<DownloadItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSafeSupabaseClient();
    if (!supabase) {
      setUserId(null);
      return undefined;
    }

    supabase.auth.getSession()
      .then(({ data }) => {
        setUserId(data.session?.user?.id || null);
      })
      .catch(error => {
        console.warn('[WatchlistProvider] Failed to read Supabase session:', error);
        setUserId(null);
      });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_ev, session) => {
      setUserId(session?.user?.id || null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      if (userId) {
        try {
          const [wl, hist, dl] = await Promise.all([
            getCloudWatchlist(userId),
            getCloudHistory(userId),
            getCloudDownloads(userId),
          ]);
          setWatchlist(wl);
          setHistory(hist);
          setDownloads(dl);
          return;
        } catch (error) {
          console.warn('[WatchlistProvider] Cloud refresh failed, falling back to local storage:', error);
        }
      }

      const [wl, hist, dl] = await Promise.all([getWatchlist(), getHistory(), getDownloads()]);
      setWatchlist(wl);
      setHistory(hist);
      setDownloads(dl);
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to refresh saved media:', error);
      setWatchlist([]);
      setHistory([]);
      setDownloads([]);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const addItem = useCallback(async (item: Omit<WatchlistItem, 'addedAt'>) => {
    try {
      if (userId) {
        await addCloudWatchlist(userId, item);
        setWatchlist(await getCloudWatchlist(userId));
        return;
      }

      await addToWatchlist(item);
      setWatchlist(await getWatchlist());
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to update watchlist:', error);
    }
  }, [userId]);

  const removeItem = useCallback(async (id: string) => {
    try {
      if (userId) {
        await removeCloudWatchlist(userId, id);
        setWatchlist(await getCloudWatchlist(userId));
        return;
      }

      await removeFromWatchlist(id);
      setWatchlist(await getWatchlist());
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to remove watchlist item:', error);
    }
  }, [userId]);

  const checkInWatchlist = useCallback(async (id: string) => {
    try {
      if (userId) return isInCloudWatchlist(userId, id);
      return isInWatchlist(id);
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to check watchlist state:', error);
      return false;
    }
  }, [userId]);

  const addHistoryItem = useCallback(async (item: Omit<HistoryItem, 'watchedAt' | 'addedAt'>) => {
    try {
      if (userId) {
        await addCloudHistory(userId, item);
        setHistory(await getCloudHistory(userId));
        return;
      }

      await addToHistory(item);
      setHistory(await getHistory());
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to save watch history:', error);
    }
  }, [userId]);

  const clearAllHistory = useCallback(async () => {
    try {
      if (userId) {
        await clearCloudHistory(userId);
      } else {
        await clearHistory();
      }
      setHistory([]);
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to clear watch history:', error);
    }
  }, [userId]);

  const startDownload = useCallback(async (item: Omit<DownloadItem, 'downloadedAt' | 'addedAt'>) => {
    const downloadItem = {
      ...item,
      status: item.sourceUrl ? 'completed' as const : 'failed' as const,
      progress: item.sourceUrl ? 100 : 0,
    };

    try {
      if (userId) {
        await addCloudDownload(userId, downloadItem);
        setDownloads(await getCloudDownloads(userId));
        return;
      }

      await addDownload(downloadItem);
      setDownloads(await getDownloads());
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to save download item:', error);
    }
  }, [userId]);

  const cancelDownload = useCallback(async (id: string) => {
    try {
      if (userId) {
        await removeCloudDownload(userId, id);
        setDownloads(await getCloudDownloads(userId));
        return;
      }

      await removeDownload(id);
      setDownloads(await getDownloads());
    } catch (error) {
      console.warn('[WatchlistProvider] Failed to remove download item:', error);
    }
  }, [userId]);

  return (
    <WatchlistContext.Provider
      value={{
        watchlist, history, downloads, loading,
        addItem, removeItem, checkInWatchlist,
        addHistoryItem, clearAllHistory,
        startDownload, cancelDownload, refreshAll,
      }}
    >
      {children}
    </WatchlistContext.Provider>
  );
}
