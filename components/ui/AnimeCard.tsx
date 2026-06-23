import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, ViewStyle } from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { AniListMedia } from '@/services/anilistService';

interface AnimeCardProps {
  item: AniListMedia;
  onPress?: () => void;
  style?: ViewStyle;
  size?: 'sm' | 'md' | 'lg';
}

const SIZES = {
  sm: { width: 110, height: 165 },
  md: { width: 140, height: 210 },
  lg: { width: 170, height: 255 },
};

function AnimeCardComponent({ item, onPress, style, size = 'md' }: AnimeCardProps) {
  const { width, height } = SIZES[size];
  const title = item.title.english || item.title.romaji;
  const score = item.averageScore ? (item.averageScore / 10).toFixed(1) : null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.container, { width }, pressed && styles.pressed, style]}
    >
      <View style={[styles.posterWrap, { width, height }]}>
        <Image
          source={{ uri: item.coverImage.extraLarge || item.coverImage.large }}
          style={styles.poster}
          contentFit="cover"
          transition={200}
        />
        {score ? (
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={10} color={Colors.accent} />
            <Text style={styles.ratingText}>{score}</Text>
          </View>
        ) : null}
        <View style={[styles.typeDot, { backgroundColor: Colors.animeColor }]} />
        {item.format ? (
          <View style={styles.formatBadge}>
            <Text style={styles.formatText}>{item.format.replace(/_/g, ' ')}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.title} numberOfLines={2}>{title}</Text>
      {item.episodes ? <Text style={styles.meta}>{item.episodes} eps</Text> : null}
    </Pressable>
  );
}

export const AnimeCard = memo(AnimeCardComponent);

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
  ratingBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: Radii.full,
    paddingHorizontal: 6, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  ratingText: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  typeDot: {
    position: 'absolute', bottom: 6, left: 6,
    width: 6, height: 6, borderRadius: 3,
  },
  formatBadge: {
    position: 'absolute', bottom: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: Radii.xs,
    paddingHorizontal: 4, paddingVertical: 2,
  },
  formatText: { color: Colors.textSecondary, fontSize: 9, fontWeight: FontWeights.medium },
  title: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
    marginTop: 6, lineHeight: 17,
  },
  meta: { color: Colors.animeColor, fontSize: FontSizes.xs, marginTop: 2 },
});
