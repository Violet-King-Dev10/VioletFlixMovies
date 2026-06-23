import React from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable, RefreshControl } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights } from '@/constants/theme';
import { HeroBanner } from '@/components/ui/HeroBanner';
import { SectionRow } from '@/components/ui/SectionRow';
import { MediaCard } from '@/components/ui/MediaCard';
import { AnimeCard } from '@/components/ui/AnimeCard';
import { ContinueWatchingRow } from '@/components/ui/ContinueWatchingRow';
import { NotificationBell } from '@/components/ui/NotificationBell';
import { useHome } from '@/hooks/useHome';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAnimeNotifications } from '@/hooks/useAnimeNotifications';
import { TMDBItem } from '@/services/tmdbService';
import { AniListMedia } from '@/services/anilistService';
import { TMDB_IMAGE } from '@/constants/config';

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { heroItems, trendingMovies, nowPlaying, popularMovies, trendingAnime, popularAnime, loading, error, isOffline, isStale, refresh } = useHome();
  const { history, watchlist } = useWatchlist();

  // Extract anime IDs from watchlist for notification checking
  const watchlistAnimeIds = watchlist
    .filter(i => i.mediaType === 'anime')
    .map(i => i.mediaId);

  const { notifications, unreadCount, markAllRead, isRead } = useAnimeNotifications(watchlistAnimeIds);

  const goMovie = (item: TMDBItem) => router.push(`/movie/${item.id}`);
  const goTV = (item: TMDBItem) => router.push(`/tv/${item.id}`);
  const goAnime = (item: AniListMedia) => router.push(`/anime/${item.id}`);

  if (loading) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading VioletFlixTV...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="error-outline" size={48} color={Colors.primary} />
        <Text style={styles.errorText}>{error}</Text>
        <Pressable style={styles.retryBtn} onPress={refresh}>
          <Text style={styles.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        {/* App Bar */}
        <View style={[styles.appBar, { paddingTop: insets.top + 8 }]}>
          <Text style={styles.logo}>
            <Text style={styles.logoBrand}>VioletFlix</Text>
            <Text style={styles.logoAccent}>TV</Text>
          </Text>
          <View style={styles.appBarActions}>
            <NotificationBell
              notifications={notifications}
              unreadCount={unreadCount}
              onMarkAllRead={markAllRead}
              isRead={isRead}
            />
            <Pressable onPress={() => router.push('/(tabs)/search')}>
              <MaterialIcons name="search" size={26} color={Colors.textPrimary} />
            </Pressable>
          </View>
        </View>

        {/* Offline / Stale Banner */}
        {(isOffline || isStale) ? (
          <View style={[styles.offlineBanner, isOffline ? styles.offlineBannerOffline : styles.offlineBannerStale]}>
            <MaterialIcons
              name={isOffline ? 'wifi-off' : 'cloud-done'}
              size={14}
              color={isOffline ? Colors.warning : Colors.textMuted}
            />
            <Text style={[styles.offlineBannerText, { color: isOffline ? Colors.warning : Colors.textMuted }]}>
              {isOffline ? 'You are offline — showing cached content' : 'Showing cached content · Pull to refresh'}
            </Text>
          </View>
        ) : null}

        {/* Hero */}
        {heroItems.length > 0 ? (
          <HeroBanner
            items={heroItems}
            onPress={goMovie}
            onPlayPress={(item) => router.push(`/player/${item.id}?type=movie`)}
          />
        ) : null}

        {/* Continue Watching */}
        <ContinueWatchingRow
          items={history}
          onPress={(item) => {
            if (item.mediaType === 'movie') router.push(`/player/${item.mediaId}?type=movie&title=${encodeURIComponent(item.title)}`);
            else if (item.mediaType === 'tv') router.push(`/player/${item.mediaId}?type=tv&title=${encodeURIComponent(item.title)}${item.episode ? `&ep=${item.episode}` : ''}${item.season ? `&season=${item.season}` : ''}`);
            else router.push(`/player/${item.mediaId}?type=anime&title=${encodeURIComponent(item.title)}${item.episode ? `&ep=${item.episode}` : ''}`);
          }}
        />

        {/* Now Playing */}
        <SectionRow
          title="Now Playing"
          subtitle="In theaters now"
          data={nowPlaying}
          keyExtractor={i => String(i.id)}
          onSeeAll={() => router.push('/(tabs)/movies')}
          renderItem={(item) => (
            <MediaCard
              key={item.id}
              id={item.id}
              title={item.title || item.name || ''}
              posterUrl={item.poster_path}
              rating={item.vote_average * 10}
              year={(item.release_date || '').slice(0, 4)}
              type="movie"
              onPress={() => goMovie(item)}
            />
          )}
        />

        {/* Trending Anime */}
        <SectionRow
          title="Trending Anime"
          subtitle="Hot right now"
          data={trendingAnime}
          keyExtractor={i => String(i.id)}
          onSeeAll={() => router.push('/(tabs)/anime')}
          renderItem={(item) => (
            <AnimeCard key={item.id} item={item} onPress={() => goAnime(item)} />
          )}
        />

        {/* Trending Movies */}
        <SectionRow
          title="Trending Movies"
          subtitle="This week"
          data={trendingMovies}
          keyExtractor={i => String(i.id)}
          onSeeAll={() => router.push('/(tabs)/movies')}
          renderItem={(item) => (
            <MediaCard
              key={item.id}
              id={item.id}
              title={item.title || item.name || ''}
              posterUrl={item.poster_path}
              rating={item.vote_average * 10}
              year={(item.release_date || '').slice(0, 4)}
              type={item.media_type === 'tv' ? 'tv' : 'movie'}
              onPress={() => item.media_type === 'tv' ? goTV(item) : goMovie(item)}
            />
          )}
        />

        {/* Popular Anime */}
        <SectionRow
          title="Popular Anime"
          subtitle="Fan favorites"
          data={popularAnime}
          keyExtractor={i => String(i.id)}
          onSeeAll={() => router.push('/(tabs)/anime')}
          renderItem={(item) => (
            <AnimeCard key={item.id} item={item} onPress={() => goAnime(item)} />
          )}
        />

        {/* Popular Movies */}
        <SectionRow
          title="Popular Movies"
          subtitle="Everyone is watching"
          data={popularMovies}
          keyExtractor={i => String(i.id)}
          onSeeAll={() => router.push('/(tabs)/movies')}
          renderItem={(item) => (
            <MediaCard
              key={item.id}
              id={item.id}
              title={item.title || item.name || ''}
              posterUrl={item.poster_path}
              rating={item.vote_average * 10}
              year={(item.release_date || '').slice(0, 4)}
              type="movie"
              onPress={() => goMovie(item)}
            />
          )}
        />

        <View style={{ height: Spacing.xl }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  appBar: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10,
    backgroundColor: 'transparent',
  },
  appBarActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  logo: { fontSize: FontSizes.xxl },
  logoBrand: { color: Colors.textPrimary, fontWeight: FontWeights.black },
  logoAccent: { color: Colors.primary, fontWeight: FontWeights.black },
  center: { flex: 1, backgroundColor: Colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, textAlign: 'center', paddingHorizontal: 32 },
  retryBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: 8, marginTop: 8,
  },
  retryText: { color: Colors.textPrimary, fontWeight: FontWeights.bold },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: Spacing.md,
    marginTop: 4,
  },
  offlineBannerOffline: {
    backgroundColor: 'rgba(243, 156, 18, 0.1)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(243, 156, 18, 0.2)',
  },
  offlineBannerStale: {
    backgroundColor: 'rgba(102,102,102,0.08)',
  },
  offlineBannerText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
});
