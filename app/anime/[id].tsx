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
import { getAnimeDetail, AniListMedia } from '@/services/anilistService';
import { AnimeCard } from '@/components/ui/AnimeCard';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAlert } from '@/template';
import { resolveDownloadSource } from '@/services/downloadResolver';
import { triggerSecureDownload } from '@/services/secureDownload';

export default function AnimeDetailScreen() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(rawId) ? rawId[0] : rawId;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { showAlert } = useAlert();
  const { addItem, removeItem, checkInWatchlist, addHistoryItem, startDownload } = useWatchlist();

  const [anime, setAnime] = useState<AniListMedia | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inWatchlist, setInWatchlist] = useState(false);
  const [selectedEp, setSelectedEp] = useState(1);

  const loadAnime = useCallback(async () => {
    const animeId = Number(id);

    if (!id || !Number.isFinite(animeId)) {
      setAnime(null);
      setError('This anime link is invalid. Please go back and choose the anime again.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await getAnimeDetail(animeId);
      if (!data) {
        throw new Error('Anime not found');
      }

      setAnime(data);

      try {
        const wl = await checkInWatchlist(`anime-${id}`);
        setInWatchlist(wl);
      } catch {
        setInWatchlist(false);
      }
    } catch {
      setAnime(null);
      setError('We could not load this anime right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [checkInWatchlist, id]);

  useEffect(() => {
    loadAnime();
  }, [loadAnime]);

  const toggleWatchlist = useCallback(async () => {
    if (!anime) return;
    const itemId = `anime-${anime.id}`;
    const title = anime.title.english || anime.title.romaji;

    try {
      if (inWatchlist) {
        await removeItem(itemId);
        setInWatchlist(false);
      } else {
        await addItem({
          id: itemId, mediaId: anime.id, mediaType: 'anime',
          title, posterUrl: anime.coverImage.large,
          rating: anime.averageScore || 0,
          genres: anime.genres,
        });
        setInWatchlist(true);
      }
    } catch {
      showAlert('Watchlist Error', 'Unable to update your watchlist right now.');
    }
  }, [anime, inWatchlist, addItem, removeItem, showAlert]);

  const handleWatch = useCallback(async (ep: number) => {
    if (!anime) return;
    const title = anime.title.english || anime.title.romaji;

    try {
      await addHistoryItem({
        id: `anime-${anime.id}`, mediaId: anime.id, mediaType: 'anime',
        title, posterUrl: anime.coverImage.large,
        rating: anime.averageScore || 0,
        episode: ep, progress: 0,
      });
    } catch {
      // History should never block playback.
    }

    try {
      router.push(`/player/${anime.id}?type=anime&ep=${ep}&title=${encodeURIComponent(title)}${anime.idMal ? `&malId=${anime.idMal}` : ''}`);
    } catch {
      showAlert('Playback Error', 'Unable to open the player. Please try again.');
    }
  }, [anime, addHistoryItem, router, showAlert]);

  const handleDownload = useCallback(async (ep: number) => {
    if (!anime) return;
    const title = anime.title.english || anime.title.romaji;
    let sourceUrl: string | null = null;
    try {
      const source = await resolveDownloadSource({
        id: anime.id,
        type: 'anime',
        title,
        titles: [anime.title.english, anime.title.romaji],
        season: 1,
        episode: ep,
        malId: anime.idMal,
      });
      sourceUrl = source?.url || null;
    } catch {
      sourceUrl = null;
    }
    try {
      await startDownload({
        id: `anime-dl-${anime.id}-ep${ep}`,
        mediaId: anime.id, mediaType: 'anime',
        title, posterUrl: anime.coverImage.large,
        rating: anime.averageScore || 0,
        episode: ep, episodeName: `Episode ${ep}`,
        size: `${Math.round((anime.duration || 24) * 1.5)} MB`,
        status: sourceUrl ? 'completed' : 'failed', progress: sourceUrl ? 100 : 0,
        sourceUrl: sourceUrl || undefined,
      });
      if (sourceUrl) await triggerSecureDownload({ url: sourceUrl, fileName: `${title} Episode ${ep}.mp4` });
    } catch {
      showAlert('Download Error', 'Unable to start the download right now. Please try again.');
      return;
    }

    showAlert(
      sourceUrl ? 'Download Link Ready' : 'Download Unavailable',
      sourceUrl
        ? `Started a protected download for episode ${ep}.`
        : 'No download source is available for this episode yet. Use Play to stream it.',
    );
  }, [anime, startDownload, showAlert]);

  if (loading) {
    return (
      <View style={styles.loadingWrap}>
        <ActivityIndicator size="large" color={Colors.animeColor} />
      </View>
    );
  }

  if (error || !anime) {
    return (
      <View style={styles.emptyWrap}>
        <MaterialIcons name="error-outline" size={42} color={Colors.animeColor} />
        <Text style={styles.emptyTitle}>Anime details unavailable</Text>
        <Text style={styles.emptyText}>{error || 'We could not find this anime.'}</Text>
        <View style={styles.emptyActions}>
          <Pressable style={styles.emptyButton} onPress={loadAnime}>
            <Text style={styles.emptyButtonText}>Try Again</Text>
          </Pressable>
          <Pressable style={[styles.emptyButton, styles.emptySecondaryButton]} onPress={() => router.back()}>
            <Text style={styles.emptyButtonText}>Go Back</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const title = anime.title.english || anime.title.romaji;
  const coverImage = anime.coverImage.extraLarge || anime.coverImage.large;
  const totalEps = anime.episodes || 12;
  const episodes = Array.from({ length: Math.min(totalEps, 50) }, (_, i) => i + 1);
  const characters = anime.characters?.nodes ?? [];
  const recommendations = (anime.recommendations?.nodes ?? [])
    .map(node => node.mediaRecommendation)
    .filter((item): item is AniListMedia => Boolean(item));

  return (
    <ScrollView style={styles.root} showsVerticalScrollIndicator={false}>
      {/* Banner */}
      <View style={styles.bannerWrap}>
        {anime.bannerImage ? (
          <Image source={{ uri: anime.bannerImage }} style={styles.banner} contentFit="cover" />
        ) : (
          <Image source={{ uri: coverImage }} style={styles.banner} contentFit="cover" />
        )}
        <LinearGradient colors={['transparent', Colors.background]} style={styles.bannerGrad} />
      </View>

      <View style={styles.content}>
        <View style={styles.posterRow}>
          <Image source={{ uri: coverImage }} style={styles.poster} contentFit="cover" />
          <View style={styles.mainInfo}>
            <Text style={styles.title}>{title}</Text>
            {anime.title.romaji !== title ? (
              <Text style={styles.romaji}>{anime.title.romaji}</Text>
            ) : null}
            <View style={styles.metaRow}>
              {anime.seasonYear ? <Text style={styles.metaItem}>{anime.seasonYear}</Text> : null}
              {anime.seasonYear ? <View style={styles.dot} /> : null}
              {anime.episodes ? <Text style={styles.metaItem}>{anime.episodes} eps</Text> : null}
              {anime.averageScore ? (
                <>
                  <View style={styles.dot} />
                  <MaterialIcons name="star" size={13} color={Colors.accent} />
                  <Text style={[styles.metaItem, { color: Colors.accent }]}>
                    {(anime.averageScore / 10).toFixed(1)}
                  </Text>
                </>
              ) : null}
            </View>
            <View style={styles.statusRow}>
              <View style={[styles.statusBadge,
                { backgroundColor: anime.status === 'RELEASING' ? 'rgba(46,204,113,0.15)' : 'rgba(255,215,0,0.1)' }
              ]}>
                <View style={[styles.statusDot,
                  { backgroundColor: anime.status === 'RELEASING' ? Colors.success : Colors.accent }
                ]} />
                <Text style={[styles.statusText,
                  { color: anime.status === 'RELEASING' ? Colors.success : Colors.accent }
                ]}>
                  {anime.status === 'RELEASING' ? 'Airing' : anime.status}
                </Text>
              </View>
              {anime.format ? (
                <View style={styles.formatTag}>
                  <Text style={styles.formatText}>{anime.format.replace(/_/g, ' ')}</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.genres}>
              {anime.genres.slice(0, 3).map(g => (
                <View key={g} style={styles.genreTag}>
                  <Text style={styles.genreText}>{g}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.watchBtn, pressed && { opacity: 0.85 }]}
            onPress={() => handleWatch(1)}
          >
            <MaterialIcons name="play-arrow" size={22} color={Colors.textInverse} />
            <Text style={styles.watchBtnText}>Watch Ep 1</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.iconBtn, inWatchlist && styles.iconBtnActive, pressed && { opacity: 0.7 }]}
            onPress={toggleWatchlist}
          >
            <MaterialIcons
              name={inWatchlist ? 'bookmark' : 'bookmark-border'}
              size={22}
              color={inWatchlist ? Colors.animeColor : Colors.textPrimary}
            />
          </Pressable>
        </View>

        {/* Description */}
        {anime.description ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Synopsis</Text>
            <Text style={styles.overview}>
              {anime.description.replace(/<[^>]+>/g, '')}
            </Text>
          </View>
        ) : null}

        {/* Studio */}
        {anime.studios?.nodes?.length > 0 ? (
          <View style={styles.studioRow}>
            <MaterialIcons name="business" size={14} color={Colors.textMuted} />
            <Text style={styles.studioText}>
              {anime.studios.nodes.filter(s => s.isAnimationStudio).map(s => s.name).join(', ')}
            </Text>
          </View>
        ) : null}

        {/* Episodes */}
        {episodes.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Episodes ({totalEps})</Text>
            <View style={styles.episodeGrid}>
              {episodes.map(ep => (
                <View key={ep} style={styles.epRow}>
                  <Pressable
                    style={({ pressed }) => [
                      styles.epBtn,
                      selectedEp === ep && styles.epBtnActive,
                      pressed && { opacity: 0.7 },
                    ]}
                    onPress={() => { setSelectedEp(ep); handleWatch(ep); }}
                  >
                    <MaterialIcons
                      name="play-circle-outline"
                      size={16}
                      color={selectedEp === ep ? Colors.textInverse : Colors.textMuted}
                    />
                    <Text style={[styles.epText, selectedEp === ep && styles.epTextActive]}>
                      Ep {ep}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.epDownloadBtn}
                    onPress={() => handleDownload(ep)}
                    hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
                  >
                    <MaterialIcons name="download" size={16} color={Colors.downloadColor} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Characters */}
        {characters.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Characters</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={characters}
              keyExtractor={c => String(c.id)}
              contentContainerStyle={{ gap: 12 }}
              renderItem={({ item }) => (
                <View style={styles.castItem}>
                  <View style={styles.castAvatar}>
                    <Image source={{ uri: item.image.large }} style={styles.castImg} contentFit="cover" />
                  </View>
                  <Text style={styles.castName} numberOfLines={2}>{item.name.full}</Text>
                </View>
              )}
            />
          </View>
        ) : null}

        {/* Recommendations */}
        {recommendations.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>You May Also Like</Text>
            <FlatList
              horizontal
              showsHorizontalScrollIndicator={false}
              data={recommendations}
              keyExtractor={item => String(item.id)}
              renderItem={({ item }) => (
                <AnimeCard
                  item={item}
                  onPress={() => router.push(`/anime/${item.id}`)}
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
  emptyWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background, paddingHorizontal: Spacing.lg,
  },
  emptyTitle: {
    color: Colors.textPrimary, fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold, marginTop: Spacing.md, textAlign: 'center',
  },
  emptyText: {
    color: Colors.textSecondary, fontSize: FontSizes.sm,
    textAlign: 'center', marginTop: Spacing.xs, lineHeight: 20,
  },
  emptyActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', justifyContent: 'center', marginTop: Spacing.lg },
  emptyButton: {
    backgroundColor: Colors.animeColor,
    borderRadius: Radii.md, paddingHorizontal: Spacing.lg, paddingVertical: 12,
  },
  emptySecondaryButton: { backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border },
  emptyButtonText: { color: Colors.textInverse, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  bannerWrap: { height: 240 },
  banner: { width: '100%', height: '100%' },
  bannerGrad: { position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 },
  content: { paddingHorizontal: Spacing.md },
  posterRow: { flexDirection: 'row', gap: Spacing.md, marginTop: -60, marginBottom: Spacing.md },
  poster: { width: 110, height: 165, borderRadius: Radii.md, ...Shadows.card },
  mainInfo: { flex: 1, paddingTop: 40 },
  title: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: FontWeights.black, lineHeight: 26 },
  romaji: { color: Colors.textMuted, fontSize: FontSizes.sm, fontStyle: 'italic', marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, flexWrap: 'wrap' },
  metaItem: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.full,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  formatTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.border,
  },
  formatText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  genres: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  genreTag: {
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(255,215,0,0.1)', borderRadius: Radii.full,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.3)',
  },
  genreText: { color: Colors.animeColor, fontSize: FontSizes.xs },
  actions: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  watchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.animeColor, borderRadius: Radii.md, paddingVertical: 12,
  },
  watchBtnText: { color: Colors.textInverse, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  iconBtn: {
    width: 48, height: 48, borderRadius: Radii.md,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { borderColor: Colors.animeColor },
  section: { marginBottom: Spacing.lg },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
  overview: { color: Colors.textSecondary, fontSize: FontSizes.base, lineHeight: 24 },
  studioRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md },
  studioText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  episodeGrid: { gap: 8 },
  epRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  epBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.surfaceCard, borderRadius: Radii.sm,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border,
  },
  epBtnActive: { backgroundColor: Colors.animeColor, borderColor: Colors.animeColor },
  epText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  epTextActive: { color: Colors.textInverse },
  epDownloadBtn: {
    width: 36, height: 36, borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  castItem: { width: 72, alignItems: 'center' },
  castAvatar: {
    width: 60, height: 60, borderRadius: 30,
    overflow: 'hidden', marginBottom: 6,
  },
  castImg: { width: 60, height: 60 },
  castName: { color: Colors.textPrimary, fontSize: FontSizes.xs, textAlign: 'center', fontWeight: FontWeights.medium },
});
