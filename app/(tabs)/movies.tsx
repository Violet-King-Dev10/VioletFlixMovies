import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, ScrollView, Modal,
  FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights, Radii } from '@/constants/theme';
import { MediaCard } from '@/components/ui/MediaCard';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { GenreFilterModal } from '@/components/ui/GenreFilterModal';
import { useMovies, MovieCategory, MovieFilters, DEFAULT_MOVIE_FILTERS } from '@/hooks/useMovies';
import { getMovieGenres } from '@/services/tmdbService';

const CATEGORIES: { key: MovieCategory; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'now_playing', label: 'In Theaters' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'upcoming', label: 'Upcoming' },
];

export default function MoviesScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<MovieCategory>('trending');
  const [filters, setFilters] = useState<MovieFilters>(DEFAULT_MOVIE_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const { movies, loading, loadingMore, loadMore } = useMovies(category, filters);

  const activeCount = (
    filters.genres.length +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.yearFrom ? 1 : 0) +
    (filters.yearTo ? 1 : 0)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Movies</Text>
          <Text style={styles.headerSub}>Discover & Stream</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.filterBtn, activeCount > 0 && styles.filterBtnActive, pressed && { opacity: 0.7 }]}
          onPress={() => setShowFilter(true)}
        >
          <MaterialIcons name="tune" size={20} color={activeCount > 0 ? Colors.primary : Colors.textSecondary} />
          <Text style={[styles.filterBtnText, activeCount > 0 && styles.filterBtnTextActive]}>Filter</Text>
          {activeCount > 0 ? (
            <View style={styles.badge}><Text style={styles.badgeText}>{activeCount}</Text></View>
          ) : null}
        </Pressable>
      </View>

      {/* Category Chips */}
      <CategoryChips
        options={CATEGORIES}
        selected={category}
        onSelect={(k) => setCategory(k as MovieCategory)}
        accentColor={Colors.primary}
      />

      {/* Grid */}
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={movies}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.primary} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <MediaCard
              id={item.id}
              title={item.title || item.name || ''}
              posterUrl={item.poster_path}
              rating={item.vote_average * 10}
              year={(item.release_date || '').slice(0, 4)}
              type="movie"
              size="sm"
              onPress={() => router.push(`/movie/${item.id}`)}
              style={{ marginRight: 0, flex: 1, maxWidth: '31%' }}
            />
          )}
        />
      )}

      {/* Genre Filter Modal */}
      <GenreFilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        type="movie"
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
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(229,9,20,0.08)' },
  filterBtnText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  filterBtnTextActive: { color: Colors.primary },
  badge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: FontWeights.bold },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 16 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
