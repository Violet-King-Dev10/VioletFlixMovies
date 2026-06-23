
import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ANILIST_CONFIG } from '@/constants/config';

const NOTIFICATIONS_KEY = 'violetflixtv_anime_notifications';
const READ_KEY = 'violetflixtv_notifications_read';
const CACHE_KEY = 'violetflixtv_notifications_cache';
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export interface AnimeNotification {
  animeId: number;
  title: string;
  episode: number;
  airingAt: number;    // unix timestamp (seconds)
  coverImage: string | null;
}

interface CacheEntry {
  data: AnimeNotification[];
  timestamp: number;
}

async function fetchAiringForIds(ids: number[]): Promise<AnimeNotification[]> {
  if (ids.length === 0) return [];

  const gql = `
    query($ids: [Int]) {
      Page(perPage: 50) {
        media(id_in: $ids, type: ANIME, status: RELEASING) {
          id
          title { romaji english }
          coverImage { large }
          nextAiringEpisode { episode airingAt }
        }
      }
    }
  `;

  const res = await fetch(ANILIST_CONFIG.BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ query: gql, variables: { ids } }),
  });

  if (!res.ok) return [];
  const json = await res.json();
  if (json.errors || !json.data?.Page?.media) return [];

  const now = Math.floor(Date.now() / 1000);
  const notifications: AnimeNotification[] = [];

  for (const media of json.data.Page.media) {
    if (!media.nextAiringEpisode) continue;
    const { episode, airingAt } = media.nextAiringEpisode;
    // Only include episodes airing within the next 7 days, or recently aired (last 3 days)
    const diffDays = (airingAt - now) / 86400;
    if (diffDays < -3 || diffDays > 7) continue;

    notifications.push({
      animeId: media.id,
      title: media.title.english || media.title.romaji,
      episode,
      airingAt,
      coverImage: media.coverImage?.large || null,
    });
  }

  // Sort: recently aired first, then upcoming
  return notifications.sort((a, b) => {
    const now = Math.floor(Date.now() / 1000);
    const aDiff = Math.abs(a.airingAt - now);
    const bDiff = Math.abs(b.airingAt - now);
    return aDiff - bDiff;
  });
}

export function useAnimeNotifications(watchlistAnimeIds: number[]) {
  const [notifications, setNotifications] = useState<AnimeNotification[]>([]);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);

  // Load persisted read state
  useEffect(() => {
    AsyncStorage.getItem(READ_KEY).then((raw) => {
      if (raw) {
        try {
          const arr: string[] = JSON.parse(raw);
          setReadIds(new Set(arr));
        } catch {
          // ignore
        }
      }
    });
  }, []);

  const fetchNotifications = useCallback(async () => {
    if (watchlistAnimeIds.length === 0) {
      setNotifications([]);
      return;
    }

    // Check cache
    const cacheRaw = await AsyncStorage.getItem(CACHE_KEY);
    if (cacheRaw) {
      try {
        const cache: CacheEntry = JSON.parse(cacheRaw);
        if (Date.now() - cache.timestamp < CACHE_TTL) {
          setNotifications(cache.data);
          return;
        }
      } catch {
        // stale or corrupt, re-fetch
      }
    }

    setLoading(true);
    try {
      const data = await fetchAiringForIds(watchlistAnimeIds);
      setNotifications(data);
      const entry: CacheEntry = { data, timestamp: Date.now() };
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry));
    } catch {
      // silently fail, use stale cache if available
    } finally {
      setLoading(false);
    }
  }, [watchlistAnimeIds.join(',')]); // The error message indicates an "Unused eslint-disable directive". This means the original `// eslint-disable-line` comment was not actually suppressing any active ESLint rule for the line it was on. Removing it will not introduce a new error, but rather remove a redundant comment.

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  // Unread count: notifications not yet marked read
  const unreadCount = notifications.filter(
    (n) => !readIds.has(`${n.animeId}-${n.episode}`)
  ).length;

  const markAllRead = useCallback(async () => {
    const newReadIds = new Set(readIds);
    notifications.forEach((n) => newReadIds.add(`${n.animeId}-${n.episode}`));
    setReadIds(newReadIds);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(Array.from(newReadIds)));
  }, [notifications, readIds]);

  const isRead = useCallback(
    (animeId: number, episode: number) => readIds.has(`${animeId}-${episode}`),
    [readIds]
  );

  return {
    notifications,
    unreadCount,
    loading,
    markAllRead,
    isRead,
    refresh: fetchNotifications,
  };
}
