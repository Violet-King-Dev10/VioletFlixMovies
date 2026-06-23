import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { TMDB_IMAGE } from '@/constants/config';

export interface MediaCardProps {
  id: number;
  title: string;
  posterUrl: string | null;
  rating?: number;
  year?: string;
  type?: 'movie' | 'tv' | 'anime';
  isAnime?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 110, height: 165 },
  md: { width: 140, height: 210 },
  lg: { width: 170, height: 255 },
};

function MediaCardComponent({
  title, posterUrl, rating, year, type = 'movie',
  onPress, style, size = 'md',
}: MediaCardProps) {
  const { width, height } = SIZES[size];
  const imageUri = posterUrl
    ? (posterUrl.startsWith('http') ? posterUrl : TMDB_IMAGE(posterUrl, 'w342'))
    : null;
  const typeColor = type === 'anime' ? Colors.animeColor : type === 'tv' ? Colors.seriesColor : Colors.movieColor;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, { width }, pressed && styles.pressed, style]}
    >
      <View style={[styles.posterWrap, { width, height }]}>
        {imageUri ? (
          <Image
            source={{ uri: imageUri }}
            style={styles.poster}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={styles.noPoster}>
            <MaterialIcons name="movie" size={32} color={Colors.textMuted} />
          </View>
        )}
        <View style={styles.gradient} />
        {rating !== undefined && rating > 0 && (
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={10} color={Colors.accent} />
            <Text style={styles.ratingText}>{(rating / 10).toFixed(1)}</Text>
          </View>
        )}
        <View style={[styles.typeDot, { backgroundColor: typeColor }]} />
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {year ? <Text style={styles.year}>{year}</Text> : null}
    </Pressable>
  );
}

export const MediaCard = memo(MediaCardComponent);

const styles = StyleSheet.create({
  container: { marginRight: 10 },
  pressed: { opacity: 0.75, transform: [{ scale: 0.96 }] },
  posterWrap: {
    borderRadius: Radii.md,
    overflow: 'hidden',
    backgroundColor: Colors.surfaceCard,
    ...Shadows.card,
  },
  poster: { width: '100%', height: '100%' },
  noPoster: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
    backgroundColor: 'transparent',
  },
  ratingBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: Radii.full,
    paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  ratingText: {
    color: Colors.accent, fontSize: FontSizes.xs,
    fontWeight: FontWeights.bold,
  },
  typeDot: {
    position: 'absolute', bottom: 6, left: 6,
    width: 6, height: 6, borderRadius: 3,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginTop: 6, lineHeight: 17,
  },
  year: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
});
