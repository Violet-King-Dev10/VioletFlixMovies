import { getSupabaseClient } from '@/template';
import { WatchlistItem, HistoryItem, DownloadItem } from './watchlistService';

// ─── Watchlist ────────────────────────────────────────────────────────────────

export async function getCloudWatchlist(userId: string): Promise<WatchlistItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('watchlist')
    .select('*')
    .eq('user_id', userId)
    .order('added_at', { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    mediaId: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterUrl: row.poster_url,
    rating: row.rating,
    addedAt: new Date(row.added_at).getTime(),
    genres: row.genres,
    year: row.year,
  }));
}

export async function addCloudWatchlist(userId: string, item: Omit<WatchlistItem, 'addedAt'>): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('watchlist').upsert({
    id: item.id,
    user_id: userId,
    media_id: item.mediaId,
    media_type: item.mediaType,
    title: item.title,
    poster_url: item.posterUrl,
    rating: item.rating,
    year: item.year,
    genres: item.genres,
  });
}

export async function removeCloudWatchlist(userId: string, id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('watchlist').delete().eq('id', id).eq('user_id', userId);
}

export async function isInCloudWatchlist(userId: string, id: string): Promise<boolean> {
  const supabase = getSupabaseClient();
  const { data } = await supabase
    .from('watchlist')
    .select('id')
    .eq('id', id)
    .eq('user_id', userId)
    .maybeSingle();
  return Boolean(data);
}

// ─── History ──────────────────────────────────────────────────────────────────

export async function getCloudHistory(userId: string): Promise<HistoryItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('watch_history')
    .select('*')
    .eq('user_id', userId)
    .order('watched_at', { ascending: false })
    .limit(100);
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    mediaId: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterUrl: row.poster_url,
    rating: row.rating,
    addedAt: new Date(row.watched_at).getTime(),
    episode: row.episode,
    season: row.season,
    progress: row.progress,
    watchedAt: new Date(row.watched_at).getTime(),
  }));
}

export async function addCloudHistory(userId: string, item: Omit<HistoryItem, 'watchedAt' | 'addedAt'>): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('watch_history').upsert({
    id: item.id,
    user_id: userId,
    media_id: item.mediaId,
    media_type: item.mediaType,
    title: item.title,
    poster_url: item.posterUrl,
    rating: item.rating,
    episode: item.episode,
    season: item.season,
    progress: item.progress,
  });
}

export async function clearCloudHistory(userId: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('watch_history').delete().eq('user_id', userId);
}

// ─── Downloads ────────────────────────────────────────────────────────────────

export async function getCloudDownloads(userId: string): Promise<DownloadItem[]> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('downloads')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return (data || []).map(row => ({
    id: row.id,
    mediaId: row.media_id,
    mediaType: row.media_type,
    title: row.title,
    posterUrl: row.poster_url,
    rating: row.rating,
    addedAt: new Date(row.created_at).getTime(),
    episode: row.episode,
    season: row.season,
    episodeName: row.episode_name,
    size: row.size,
    status: row.status,
    progress: row.progress,
    downloadedAt: new Date(row.created_at).getTime(),
    sourceUrl: row.source_url,
  }));
}

export async function addCloudDownload(userId: string, item: Omit<DownloadItem, 'downloadedAt' | 'addedAt'>): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('downloads').upsert({
    id: item.id,
    user_id: userId,
    media_id: item.mediaId,
    media_type: item.mediaType,
    title: item.title,
    poster_url: item.posterUrl,
    rating: item.rating,
    episode: item.episode,
    season: item.season,
    episode_name: item.episodeName,
    size: item.size,
    status: item.status,
    progress: item.progress,
    source_url: item.sourceUrl,
  });
}

export async function removeCloudDownload(userId: string, id: string): Promise<void> {
  const supabase = getSupabaseClient();
  await supabase.from('downloads').delete().eq('id', id).eq('user_id', userId);
}
