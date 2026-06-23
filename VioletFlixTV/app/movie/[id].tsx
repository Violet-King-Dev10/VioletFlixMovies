import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, FlatList,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { getMovieDetails, TMDBMovieDetail } from '@/services/tmdbService';
import { TMDB_IMAGE } from '@/constants/config';
import { MediaCard } from '@/components/ui/MediaCard';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAlert } from '@/template';
import { resolveDownloadSource } from '@/services/downloadResolver';
import { triggerSecureDownload } from '@/services/secureDownload';

export default function MovieDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { addItem, removeItem, checkInWatchlist, addHistoryItem, startDownload } = useWatchlist();

  const [movie, setMovie] = useState<TMDBMovieDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);

  const loadMovie = useCallback(async () => {
    const movieId = Number(id);

    if (!id || !Number.isFinite(movieId)) {
      setMovie(null);
      setError('This movie link is invalid. Please go back and choose the movie again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getMovieDetails(movieId);
      setMovie(data);

      try {
        const wl = await checkInWatchlist(`movie-${id}`);
        setInWatchlist(wl);
      } catch {
        setInWatchlist(false);
      }
    } catch {
      setMovie(null);
      setError('We could not load this movie right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [checkInWatchlist, id]);

  useEffect(() => {
    loadMovie();
  }, [loadMovie]);

  const toggleWatchlist = useCallback(async () => {
    if (!movie) return;
    const itemId = `movie-${movie.id}`;

    try {
      if (inWatchlist) {
        await removeItem(itemId);
        setInWatchlist(false);
      } else {
        await addItem({
          id: itemId, mediaId: movie.id, mediaType: 'movie',
          title: movie.title || '',
          posterUrl: movie.poster_path,
          rating: movie.vote_average * 10,
          year: (movie.release_date || '').slice(0, 4),
          genres: movie.genres?.map(g => g.name),
        });
        setInWatchlist(true);
      }
    } catch {
      showAlert('Watchlist Error', 'Unable to update your watchlist right now.');
    }
  }, [movie, inWatchlist, addItem, removeItem, showAlert]);

  const handleWatch = useCallback(async () => {
    if (!movie) return;
    const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');

    try {
      await addHistoryItem({
        id: `movie-${movie.id}`, mediaId: movie.id, mediaType: 'movie',
        title: movie.title || '',
        posterUrl: movie.poster_path,
        rating: movie.vote_average * 10,
        progress: 0,
      });
    } catch {
      // History should never block playback.
    }

    try {
      router.push(`/player/${movie.id}?type=movie&title=${encodeURIComponent(movie.title || '')}${trailer ? `&trailerKey=${trailer.key}` : ''}`);
    } catch {
      showAlert('Playback Error', 'Unable to open the player. Please try again.');
    }
  }, [movie, addHistoryItem, router, showAlert]);

  const handleWatchTrailer = useCallback(async () => {
    if (!movie) return;
    const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
    if (!trailer) {
      showAlert('No Trailer', 'No trailer available for this movie');
      return;
    }

    try {
      router.push(`/player/${movie.id}?type=movie&title=${encodeURIComponent(movie.title || 'Movie trailer')}&trailerKey=${trailer.key}&trailer=1`);
    } catch {
      showAlert('Trailer Error', 'Unable to open the trailer right now.');
    }
  }, [movie, router, showAlert]);

  const handleDownload = useCallback(async () => {
    if (!movie) return;
    let sourceUrl: string | null = null;
    try {
      const releaseYear = (movie.release_date || '').slice(0, 4);
      const source = await resolveDownloadSource({
        type: 'movie',
        id: movie.id,
        title: movie.title || '',
        titles: [movie.original_title],
        year: releaseYear,
      });
      sourceUrl = source?.url || null;
    } catch {
      sourceUrl = null;
    }
    try {
      await startDownload({
        id: `movie-dl-${movie.id}`,
        mediaId: movie.id, mediaType: 'movie',
        title: movie.title || '',
        posterUrl: movie.poster_path,
        rating: movie.vote_average * 10,
        size: `${Math.round((movie.runtime || 120) * 1.5)} MB`,
        status: sourceUrl ? 'completed' : 'failed',
        progress: sourceUrl ? 100 : 0,
        sourceUrl: sourceUrl || undefined,
      });
      if (sourceUrl) await triggerSecureDownload({ url: sourceUrl, fileName: `${movie.title || 'movie'}.mp4` });
    } catch {
      showAlert('Download Error', 'Unable to start the download right now. Please try again.');
      return;
    }

    showAlert(
      sourceUrl ? 'Download Link Ready' : 'Download Unavailable',
      sourceUrl
        ? `Started a protected download for "${movie.title}".`
        : 'No download source is available yet. Use Watch Now to stream this movie.',
    );
  }, [movie, startDownload, showAlert]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (error || !movie) {
    return (
      <View style={styles.errorWrap}>
        <MaterialIcons name="error-outline" size={48} color={Colors.primary} />
        <Text style={styles.errorTitle}>Movie did not load</Text>
        <Text style={styles.errorText}>
          {error || 'Movie details are unavailable. Please go back and choose the movie again.'}
        </Text>
        <View style={styles.errorActions}>
          <Pressable style={({ pressed }) => [styles.retryBtn, pressed && { opacity: 0.85 }]} onPress={loadMovie}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
          <Pressable style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.75 }]} onPress={() => router.back()}>
            <Text style={styles.backBtnText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const backdropUri = movie.backdrop_path ? TMDB_IMAGE(movie.backdrop_path, 'w1280') : null;
  const posterUri = movie.poster_path ? TMDB_IMAGE(movie.poster_path, 'w500') : null;
  const trailer = movie.videos?.results?.find(v => v.type === 'Trailer' && v.site === 'YouTube');
  const runtime = movie.runtime ? `${Math.floor(movie.runtime / 60)}h ${movie.runtime % 60}m` : 'N/A';
  const year = (movie.release_date || '').slice(0, 4);

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      <View style={styles.backdropWrap}>
        {backdropUri ? (
          <Image source={{ uri: backdropUri }} style={styles.backdrop} contentFit="cover" />
        ) : (
          <View style={[styles.backdrop, styles.backdropFallback]} />
        )}
        <LinearGradient colors={['transparent', Colors.background]} style={styles.backdropGrad} />
      </View>

      <View style={styles.content}>
        <View style={styles.posterRow}>
          {posterUri ? (
            <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" />
          ) : null}
          <View style={styles.mainInfo}>
            <Text style={styles.title}>{movie.title}</Text>
            {movie.tagline ? <Text style={styles.tagline}>{movie.tagline}</Text> : null}
            <View style={styles.metaRow}>
              <Text style={styles.metaItem}>{year}</Text>
              <View style={styles.dot} />
              <Text style={styles.metaItem}>{runtime}</Text>
              {movie.vote_average > 0 ? (
                <>
                  <View style={styles.dot} />
                  <MaterialIcons name="star" size={13} color={Colors.accent} />
                  <Text style={[styles.metaItem, { color: Colors.accent }]}>{movie.vote_average.toFixed(1)}</Text>
                </>
              ) : null}
            </View>
            {movie.genres?.length > 0 ? (
              <View style={styles.genres}>
                {movie.genres.slice(0, 3).map(g => (
                  <View key={g.id} style={styles.genreTag}>
                    <Text style={styles.genreText}>{g.name}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={({ pressed }) => [styles.watchBtn, pressed && { opacity: 0.85 }]} onPress={handleWatch}>
            <MaterialIcons name="play-arrow" size={22} color={Colors.textPrimary} />
            <Text style={styles.watchBtnText}>Watch Now</Text>
          </Pressable>
          {trailer ? (
            <Pressable style={({ pressed }) => [styles.trailerBtn, pressed && { opacity: 0.8 }]} onPress={handleWatchTrailer}>
              <MaterialIcons name="movie" size={18} color={Colors.accent} />
              <Text style={styles.trailerBtnText}>Trailer</Text>
            </Pressable>
          ) : null}
          <Pressable
            style={({ pressed }) => [styles.iconBtn, inWatchlist && styles.iconBtnActive, pressed && { opacity: 0.7 }]}
            onPress={toggleWatchlist}
          >
            <MaterialIcons name={inWatchlist ? 'bookmark' : 'bookmark-border'} size={22} color={inWatchlist ? Colors.primary : Colors.textPrimary} />
          </Pressable>
          <Pressable style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]} onPress={handleDownload}>
            <MaterialIcons name="download" size={22} color={Colors.downloadColor} />
          </Pressable>
        </View>

        {/* Overview */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <Text style={styles.overview}>{movie.overview}</Text>
        </View>

        {/* Cast */}
        {movie.credits?.cast?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Cast</Text>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={movie.credits.cast.slice(0, 10)}
              keyExtractor={c => String(c.id)}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => {
                const profileUri = item.profile_path ? TMDB_IMAGE(item.profile_path, 'w185') : null;
                return (
                  <View style={styles.castItem}>
                    <View style={styles.castAvatar}>
                      {profileUri ? (
                        <Image source={{ uri: profileUri }} style={styles.castImg} contentFit="cover" />
                      ) : (
                        <MaterialIcons name="person" size={24} color={Colors.textMuted} />
                      )}
                    </View>
                    <Text style={styles.castName} numberOfLines={2}>{item.name}</Text>
                    <Text style={styles.castRole} numberOfLines={1}>{item.character}</Text>
                  </View>
                );
              }}
            />
          </View>
        ) : null}

        {/* Similar */}
        {movie.recommendations?.results?.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You May Also Like</Text>
            <FlatList
              horizontal showsHorizontalScrollIndicator={false}
              data={movie.recommendations.results.slice(0, 10)}
              keyExtractor={i => String(i.id)}
              renderItem={({ item }) => (
                <MediaCard
                  id={item.id}
                  title={item.title || item.name || ''}
                  posterUrl={item.poster_path}
                  rating={item.vote_average * 10}
                  year={(item.release_date || '').slice(0, 4)}
                  type="movie"
                  onPress={() => router.push(`/movie/${item.id}`)}
                />
              )}
            />
          </View>
        ) : null}

        <View style={{ height: insets.bottom + Spacing.xl }} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background },
  errorWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.background,
  },
  errorTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, textAlign: 'center' },
  errorText: { color: Colors.textSecondary, fontSize: FontSizes.md, lineHeight: 22, textAlign: 'center' },
  errorActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: 8 },
  retryBtn: { backgroundColor: Colors.primary, borderRadius: Radii.md, paddingHorizontal: 18, paddingVertical: 11 },
  retryBtnText: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  backBtn: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radii.md,
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: Colors.surfaceElevated,
  },
  backBtnText: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  backdropWrap: { height: 260, position: 'relative' },
  backdrop: { width: '100%', height: '100%' },
  backdropFallback: { backgroundColor: Colors.surfaceElevated },
  backdropGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  content: { paddingHorizontal: Spacing.md },
  posterRow: { flexDirection: 'row', gap: Spacing.md, marginTop: -60, marginBottom: Spacing.md },
  poster: { width: 110, height: 165, borderRadius: Radii.md, ...Shadows.card },
  mainInfo: { flex: 1, paddingTop: 40 },
  title: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: FontWeights.black, lineHeight: 26 },
  tagline: { color: Colors.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic', marginTop: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' },
  metaItem: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  genreTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  genreText: { color: Colors.textSecondary, fontSize: FontSizes.xs },
  actions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  watchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radii.md, paddingVertical: 12,
  },
  watchBtnText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  trailerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.accent,
    backgroundColor: 'rgba(255,215,0,0.08)',
  },
  trailerBtnText: { color: Colors.accent, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  iconBtn: {
    width: 48, height: 48, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderColor: Colors.primary },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
  overview: { color: Colors.textSecondary, fontSize: FontSizes.base, lineHeight: 24 },
  castItem: { width: 72, alignItems: 'center' },
  castAvatar: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', marginBottom: 6, overflow: 'hidden',
  },
  castImg: { width: 60, height: 60 },
  castName: { color: Colors.textPrimary, fontSize: FontSizes.xs, textAlign: 'center', fontWeight: FontWeights.medium },
  castRole: { color: Colors.textMuted, fontSize: 10, textAlign: 'center' },
});
