import React, { useState, useRef, useCallback, memo, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Dimensions,
  FlatList, ViewToken, GestureResponderEvent,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { TMDBItem } from '@/services/tmdbService';
import { TMDB_IMAGE } from '@/constants/config';

const { width } = Dimensions.get('window');
const HERO_HEIGHT = 480;
const AUTO_SCROLL_INTERVAL = 4500;

interface HeroBannerProps {
  items: TMDBItem[];
  onPress?: (item: TMDBItem) => void;
  onPlayPress?: (item: TMDBItem) => void;
}

function HeroBannerComponent({ items, onPress, onPlayPress }: HeroBannerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const onViewable = useCallback(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems.length > 0) {
      setActiveIndex(viewableItems[0].index ?? 0);
    }
  }, []);

  // Auto-scroll every 4.5 seconds
  useEffect(() => {
    if (items.length <= 1) return;
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => {
        const next = (prev + 1) % items.length;
        flatRef.current?.scrollToIndex({ index: next, animated: true });
        return next;
      });
    }, AUTO_SCROLL_INTERVAL);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [items.length]);

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatRef}
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onViewableItemsChanged={onViewable}
        viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
        keyExtractor={(item) => String(item.id)}
        getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
        renderItem={({ item }) => {
          const backdropUri = item.backdrop_path
            ? TMDB_IMAGE(item.backdrop_path, 'w1280')
            : null;
          const title = item.title || item.name || '';
          const year = (item.release_date || item.first_air_date || '').slice(0, 4);
          return (
            <Pressable
              style={styles.slide}
              onPress={() => onPress?.(item)}
            >
              {backdropUri ? (
                <Image source={{ uri: backdropUri }} style={styles.backdrop} contentFit="cover" />
              ) : (
                <View style={[styles.backdrop, styles.backdropFallback]} />
              )}
              <LinearGradient
                colors={['transparent', 'rgba(0,0,0,0.5)', 'rgba(10,10,10,0.95)']}
                style={styles.gradient}
              />
              <View style={styles.info}>
                <View style={styles.badges}>
                  <View style={styles.badge}>
                    <MaterialIcons name="star" size={12} color={Colors.accent} />
                    <Text style={styles.badgeText}>{item.vote_average.toFixed(1)}</Text>
                  </View>
                  {year ? <View style={styles.yearBadge}><Text style={styles.yearText}>{year}</Text></View> : null}
                </View>
                <Text style={styles.title} numberOfLines={2}>{title}</Text>
                <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text>
                <View style={styles.actions}>
                  <Pressable
                    style={({ pressed }) => [styles.playBtn, pressed && { opacity: 0.85 }]}
                    onPress={(event: GestureResponderEvent) => {
                      event.stopPropagation();
                      onPlayPress?.(item);
                    }}
                  >
                    <MaterialIcons name="play-arrow" size={20} color={Colors.textInverse} />
                    <Text style={styles.playText}>Watch Now</Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.infoBtn, pressed && { opacity: 0.7 }]}
                    onPress={(event: GestureResponderEvent) => {
                      event.stopPropagation();
                      onPress?.(item);
                    }}
                  >
                    <MaterialIcons name="info-outline" size={20} color={Colors.textPrimary} />
                    <Text style={styles.infoText}>Details</Text>
                  </Pressable>
                </View>
              </View>
            </Pressable>
          );
        }}
      />
      {/* Dot indicators */}
      <View style={styles.dots}>
        {items.map((_, i) => (
          <Pressable
            key={i}
            onPress={() => {
              flatRef.current?.scrollToIndex({ index: i, animated: true });
              setActiveIndex(i);
            }}
          >
            <View style={[styles.dot, i === activeIndex && styles.dotActive]} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export const HeroBanner = memo(HeroBannerComponent);

const styles = StyleSheet.create({
  container: { height: HERO_HEIGHT },
  slide: { width, height: HERO_HEIGHT },
  backdrop: { position: 'absolute', width: '100%', height: '100%' },
  backdropFallback: { backgroundColor: Colors.surfaceElevated },
  gradient: { position: 'absolute', left: 0, right: 0, bottom: 0, height: HERO_HEIGHT * 0.75 },
  info: {
    position: 'absolute', bottom: 60, left: Spacing.md, right: Spacing.md,
  },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.full,
  },
  badgeText: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  yearBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.full,
  },
  yearText: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  title: {
    color: Colors.textPrimary, fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.black, lineHeight: 36, marginBottom: 8,
  },
  overview: {
    color: Colors.textSecondary, fontSize: FontSizes.sm,
    lineHeight: 20, marginBottom: 16,
  },
  actions: { flexDirection: 'row', gap: 12 },
  playBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20, paddingVertical: 10,
    borderRadius: Radii.md,
  },
  playText: { color: Colors.textInverse, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  infoBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16, paddingVertical: 10,
    borderRadius: Radii.md,
  },
  infoText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  dots: {
    position: 'absolute', bottom: 32, left: 0, right: 0,
    flexDirection: 'row', justifyContent: 'center', gap: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.textMuted },
  dotActive: { width: 18, backgroundColor: Colors.primary },
});
