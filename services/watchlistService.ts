import AsyncStorage from '@react-native-async-storage/async-storage';

const WATCHLIST_KEY = 'violetflixtv_watchlist';
const HISTORY_KEY = 'violetflixtv_history';
const DOWNLOADS_KEY = 'violetflixtv_downloads';

export type MediaType = 'movie' | 'tv' | 'anime';

export interface WatchlistItem {
  id: string; // `${type}-${id}`
  mediaId: number;
  mediaType: MediaType;
  title: string;
  posterUrl: string | null;
  rating: number;
  addedAt: number;
  genres?: string[];
  year?: string;
}

export interface HistoryItem extends WatchlistItem {
  progress: number; // 0-100
  episode?: number;
  season?: number;
  watchedAt: number;
}

export interface DownloadItem extends WatchlistItem {
  episode?: number;
  season?: number;
  episodeName?: string;
  size: string;
  status: 'queued' | 'completed' | 'failed';
  progress: number;
  sourceUrl?: string;
  downloadedAt: number;
}

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getWatchlist(): Promise<WatchlistItem[]> {
  const raw = await AsyncStorage.getItem(WATCHLIST_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToWatchlist(item: Omit<WatchlistItem, 'addedAt'>): Promise<void> {
  const list = await getWatchlist();
  const exists = list.find(i => i.id === item.id);
  if (!exists) {
    list.unshift({ ...item, addedAt: Date.now() });
    await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(list));
  }
}

export async function removeFromWatchlist(id: string): Promise<void> {
  const list = await getWatchlist();
  const filtered = list.filter(i => i.id !== id);
  await AsyncStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
}

export async function isInWatchlist(id: string): Promise<boolean> {
  const list = await getWatchlist();
  return list.some(i => i.id === id);
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getHistory(): Promise<HistoryItem[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addToHistory(item: Omit<HistoryItem, 'watchedAt' | 'addedAt'>): Promise<void> {
  const list = await getHistory();
  const idx = list.findIndex(i => i.id === item.id);
  if (idx !== -1) list.splice(idx, 1);
  list.unshift({ ...item, addedAt: Date.now(), watchedAt: Date.now() });
  const trimmed = list.slice(0, 100);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(trimmed));
}

export async function clearHistory(): Promise<void> {
  await AsyncStorage.removeItem(HISTORY_KEY);
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export async function getDownloads(): Promise<DownloadItem[]> {
  const raw = await AsyncStorage.getItem(DOWNLOADS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export async function addDownload(item: Omit<DownloadItem, 'downloadedAt' | 'addedAt'>): Promise<void> {
  const list = await getDownloads();
  list.unshift({ ...item, addedAt: Date.now(), downloadedAt: Date.now() });
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
}

export async function updateDownload(id: string, update: Partial<DownloadItem>): Promise<void> {
  const list = await getDownloads();
  const idx = list.findIndex(i => i.id === id);
  if (idx !== -1) {
    list[idx] = { ...list[idx], ...update };
    await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(list));
  }
}

export async function removeDownload(id: string): Promise<void> {
  const list = await getDownloads();
  const filtered = list.filter(i => i.id !== id);
  await AsyncStorage.setItem(DOWNLOADS_KEY, JSON.stringify(filtered));
}
