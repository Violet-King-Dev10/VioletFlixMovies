import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { GenreFilterModal } from '@/components/ui/GenreFilterModal';
import { useTV, TVCategory, TVFilters, DEFAULT_TV_FILTERS } from '@/hooks/useTV';
import { TMDB_IMAGE } from '@/constants/config';
import { TMDBItem } from '@/services/tmdbService';

const CATEGORIES: { key: TVCategory; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'on_the_air', label: 'On Air' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'airing_today', label: 'Today' },
];

const NETWORK_COLORS: Record<string, string> = {
  Netflix: '#E50914',
  HBO: '#5B2D8E',
  'Disney+': '#1D6FA4',
  'Apple TV+': '#555555',
  'Amazon Prime Video': '#00A8E0',
  Hulu: '#1CE783',
  'BBC One': '#B80000',
  NBC: '#FFCD00',
  ABC: '#000080',
};

function TVCard({ item, onPress }: { item: TMDBItem; onPress: () => void }) {
  const posterUri = item.poster_path ? TMDB_IMAGE(item.poster_path, 'w342') : null;
  const year = (item.first_air_date || '').slice(0, 4);
  const rating = item.vote_average > 0 ? item.vote_average.toFixed(1) : null;

  return (
    <Pressable
      style={({ pressed }) => [styles.card, pressed && { opacity: 0.75, transform: [{ scale: 0.97 }] }]}
      onPress={onPress}
    >
      <View style={styles.posterWrap}>
        {posterUri ? (
          <Image source={{ uri: posterUri }} style={styles.poster} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.poster, styles.noPoster]}>
            <MaterialIcons name="tv" size={28} color={Colors.textMuted} />
          </View>
        )}
        {rating ? (
          <View style={styles.ratingBadge}>
            <MaterialIcons name="star" size={10} color={Colors.accent} />
            <Text style={styles.ratingText}>{rating}</Text>
          </View>
        ) : null}
        <View style={[styles.typeDot, { backgroundColor: Colors.seriesColor }]} />
        {item.in_production ? (
          <View style={styles.airingBadge}>
            <View style={styles.airingDot} />
            <Text style={styles.airingText}>LIVE</Text>
          </View>
        ) : null}
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={2}>{item.name || item.title}</Text>
        <View style={styles.meta}>
          {year ? <Text style={styles.year}>{year}</Text> : null}
          {item.number_of_seasons ? (
            <>
              {year ? <View style={styles.dot} /> : null}
              <Text style={styles.seasons}>{item.number_of_seasons}S</Text>
            </>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export default function TVSeriesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<TVCategory>('trending');
  const [filters, setFilters] = useState<TVFilters>(DEFAULT_TV_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const { shows, loading, loadingMore, loadMore } = useTV(category, filters);

  const activeCount = (
    filters.genres.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.yearFrom ? 1 : 0)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>TV Series</Text>
          <Text style={styles.headerSub}>Ongoing & Classic Shows</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.filterBtn, activeCount > 0 && styles.filterBtnActive, pressed && { opacity: 0.7 }]}
          onPress={() => setShowFilter(true)}
        >
          <MaterialIcons name="tune" size={20} color={activeCount > 0 ? Colors.seriesColor : Colors.textSecondary} />
          <Text style={[styles.filterBtnText, activeCount > 0 && { color: Colors.seriesColor }]}>Filter</Text>
          {activeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: Colors.seriesColor }]}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <CategoryChips
        options={CATEGORIES}
        selected={category}
        onSelect={(k) => setCategory(k as TVCategory)}
        accentColor={Colors.seriesColor}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.seriesColor} />
        </View>
      ) : (
        <FlatList
          data={shows}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.seriesColor} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <TVCard item={item} onPress={() => router.push(`/tv/${item.id}`)} />
            </View>
          )}
        />
      )}

      <GenreFilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        type="tv"
        currentFilters={filters}
        onApply={(f) => setFilters(f)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSizes.xxl, fontWeight: FontWeights.black },
  headerSub: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
  filterBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radii.md, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceCard, position: 'relative',
  },
  filterBtnActive: { borderColor: Colors.seriesColor, backgroundColor: 'rgba(52,152,219,0.08)' },
  filterBtnText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  badge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: FontWeights.bold },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 16 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  cardWrap: { flex: 1, maxWidth: '31%' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
  card: { flex: 1 },
  posterWrap: {
    height: 155, borderRadius: Radii.md,
    overflow: 'hidden', backgroundColor: Colors.surfaceCard,
    ...Shadows.card, position: 'relative',
  },
  poster: { width: '100%', height: '100%' },
  noPoster: { alignItems: 'center', justifyContent: 'center' },
  ratingBadge: {
    position: 'absolute', top: 6, right: 6,
    backgroundColor: 'rgba(0,0,0,0.8)',
    borderRadius: Radii.full,
    paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 2,
  },
  ratingText: { color: Colors.accent, fontSize: 9, fontWeight: FontWeights.bold },
  typeDot: {
    position: 'absolute', bottom: 6, left: 6,
    width: 6, height: 6, borderRadius: 3,
  },
  airingBadge: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(46,204,113,0.2)',
    borderRadius: Radii.xs,
    paddingHorizontal: 5, paddingVertical: 2,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderColor: Colors.success,
  },
  airingDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: Colors.success },
  airingText: { color: Colors.success, fontSize: 8, fontWeight: FontWeights.bold },
  info: { marginTop: 6 },
  title: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium, lineHeight: 17 },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  year: { color: Colors.textMuted, fontSize: FontSizes.xs },
  seasons: { color: Colors.seriesColor, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  dot: { width: 3, height: 3, borderRadius: 2, backgroundColor: Colors.textMuted },
});
