import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { TMDB_IMAGE } from '@/constants/config';
import { HistoryItem } from '@/services/watchlistService';

interface ContinueWatchingRowProps {
  items: HistoryItem[];
  onPress: (item: HistoryItem) => void;
}

export function ContinueWatchingRow({ items, onPress }: ContinueWatchingRowProps) {
  if (!items || items.length === 0) return null;

  const recent = items.slice(0, 5);

  const getTypeColor = (mediaType: string) => {
    if (mediaType === 'anime') return Colors.animeColor;
    if (mediaType === 'tv') return Colors.seriesColor;
    return Colors.primary;
  };

  const getTypeLabel = (item: HistoryItem) => {
    if (item.mediaType === 'anime') return 'Anime';
    if (item.mediaType === 'tv') return 'Series';
    return 'Movie';
  };

  const getEpisodeLabel = (item: HistoryItem) => {
    if (item.episode && item.season) return `S${item.season} · E${item.episode}`;
    if (item.episode) return `Episode ${item.episode}`;
    return null;
  };

  const getProgressPercent = (item: HistoryItem) => {
    const p = item.progress ?? 0;
    return Math.min(Math.max(p, 0), 100);
  };

  return (
    <View style={styles.section}>
      {/* Section Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.headerDot} />
          <Text style={styles.title}>Continue Watching</Text>
        </View>
        <Text style={styles.count}>{recent.length} item{recent.length !== 1 ? 's' : ''}</Text>
      </View>

      {/* Horizontal Scroll */}
      <View style={styles.scrollOuter}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {recent.map((item) => {
            const typeColor = getTypeColor(item.mediaType);
            const episodeLabel = getEpisodeLabel(item);
            const progress = getProgressPercent(item);
            const posterUri = item.posterUrl
              ? item.posterUrl.startsWith('http')
                ? item.posterUrl
                : TMDB_IMAGE(item.posterUrl, 'w342')
              : null;

            return (
              <Pressable
                key={`${item.id}-${item.watchedAt}`}
                style={({ pressed }) => [styles.card, pressed && { opacity: 0.8, transform: [{ scale: 0.96 }] }]}
                onPress={() => onPress(item)}
              >
                {/* Poster */}
                <View style={styles.posterWrap}>
                  {posterUri ? (
                    <Image
                      source={{ uri: posterUri }}
                      style={styles.poster}
                      contentFit="cover"
                      transition={200}
                    />
                  ) : (
                    <View style={[styles.poster, styles.noPoster]}>
                      <MaterialIcons name="movie" size={28} color={Colors.textMuted} />
                    </View>
                  )}

                  {/* Bottom gradient */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.85)']}
                    style={styles.gradient}
                  />

                  {/* Play button overlay */}
                  <View style={styles.playOverlay}>
                    <View style={[styles.playBtn, { borderColor: typeColor }]}>
                      <MaterialIcons name="play-arrow" size={22} color={typeColor} />
                    </View>
                  </View>

                  {/* Type badge */}
                  <View style={[styles.typeBadge, { backgroundColor: typeColor + '22', borderColor: typeColor + '55' }]}>
                    <Text style={[styles.typeBadgeText, { color: typeColor }]}>{getTypeLabel(item)}</Text>
                  </View>

                  {/* Episode label */}
                  {episodeLabel ? (
                    <View style={styles.episodeBadge}>
                      <Text style={styles.episodeBadgeText}>{episodeLabel}</Text>
                    </View>
                  ) : null}

                  {/* Progress bar */}
                  <View style={styles.progressTrack}>
                    <View
                      style={[
                        styles.progressFill,
                        { width: `${progress}%` as any, backgroundColor: typeColor },
                      ]}
                    />
                  </View>
                </View>

                {/* Info */}
                <View style={styles.info}>
                  <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                  <View style={styles.metaRow}>
                    {progress > 0 ? (
                      <Text style={[styles.progressText, { color: typeColor }]}>
                        {Math.round(progress)}%
                      </Text>
                    ) : (
                      <Text style={styles.newText}>Start watching</Text>
                    )}
                    {item.rating > 0 ? (
                      <View style={styles.ratingRow}>
                        <MaterialIcons name="star" size={10} color={Colors.accent} />
                        <Text style={styles.ratingText}>{(item.rating / 10).toFixed(1)}</Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const CARD_WIDTH = 140;
const POSTER_HEIGHT = 200;

const styles = StyleSheet.create({
  section: {
    marginBottom: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerDot: {
    width: 4,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.primary,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  count: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
  },
  scrollOuter: {
    minHeight: POSTER_HEIGHT + 56,
  },
  scrollContent: {
    paddingHorizontal: Spacing.md,
    gap: 12,
  },
  card: {
    width: CARD_WIDTH,
  },
  posterWrap: {
    width: CARD_WIDTH,
    height: POSTER_HEIGHT,
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceCard,
    position: 'relative',
    ...Shadows.card,
  },
  poster: {
    width: '100%',
    height: '100%',
  },
  noPoster: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 90,
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 9,
    fontWeight: FontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  episodeBadge: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    paddingHorizontal: 8,
  },
  episodeBadgeText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 10,
    fontWeight: FontWeights.semibold,
    textAlign: 'center',
  },
  progressTrack: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  progressFill: {
    height: 3,
    borderRadius: 0,
    minWidth: 4,
  },
  info: {
    marginTop: 8,
    paddingHorizontal: 2,
  },
  itemTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    lineHeight: 18,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  newText: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  ratingText: {
    color: Colors.accent,
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
});
