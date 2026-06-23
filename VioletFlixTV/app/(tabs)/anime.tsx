import React, { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { AnimeCard } from '@/components/ui/AnimeCard';
import { CategoryChips } from '@/components/ui/CategoryChips';
import { GenreFilterModal } from '@/components/ui/GenreFilterModal';
import { useAnime, AnimeCategory, AnimeFilters, DEFAULT_ANIME_FILTERS } from '@/hooks/useAnime';

const CATEGORIES: { key: AnimeCategory; label: string }[] = [
  { key: 'trending', label: 'Trending' },
  { key: 'popular', label: 'Popular' },
  { key: 'top_rated', label: 'Top Rated' },
  { key: 'seasonal', label: 'This Season' },
];

export default function AnimeScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [category, setCategory] = useState<AnimeCategory>('trending');
  const [filters, setFilters] = useState<AnimeFilters>(DEFAULT_ANIME_FILTERS);
  const [showFilter, setShowFilter] = useState(false);
  const { anime, loading, loadingMore, loadMore } = useAnime(category, filters);

  const activeCount = (
    filters.genres.length +
    (filters.minScore > 0 ? 1 : 0) +
    (filters.year ? 1 : 0)
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Anime</Text>
          <Text style={styles.headerSub}>Stream & Download</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.filterBtn, activeCount > 0 && styles.filterBtnActive, pressed && { opacity: 0.7 }]}
          onPress={() => setShowFilter(true)}
        >
          <MaterialIcons name="tune" size={20} color={activeCount > 0 ? Colors.animeColor : Colors.textSecondary} />
          <Text style={[styles.filterBtnText, activeCount > 0 && { color: Colors.animeColor }]}>Filter</Text>
          {activeCount > 0 ? (
            <View style={[styles.badge, { backgroundColor: Colors.animeColor }]}>
              <Text style={styles.badgeText}>{activeCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      <CategoryChips
        options={CATEGORIES}
        selected={category}
        onSelect={(k) => setCategory(k as AnimeCategory)}
        accentColor={Colors.animeColor}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.animeColor} />
        </View>
      ) : (
        <FlatList
          data={anime}
          keyExtractor={(item) => String(item.id)}
          numColumns={3}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          onEndReached={loadMore}
          onEndReachedThreshold={0.4}
          ListFooterComponent={loadingMore ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={Colors.animeColor} />
            </View>
          ) : null}
          renderItem={({ item }) => (
            <View style={styles.cardWrap}>
              <AnimeCard
                item={item}
                size="sm"
                onPress={() => router.push(`/anime/${item.id}`)}
              />
            </View>
          )}
        />
      )}

      <GenreFilterModal
        visible={showFilter}
        onClose={() => setShowFilter(false)}
        type="anime"
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
  filterBtnActive: { borderColor: Colors.animeColor, backgroundColor: 'rgba(255,215,0,0.06)' },
  filterBtnText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  badge: {
    position: 'absolute', top: -6, right: -6,
    width: 18, height: 18, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
  },
  badgeText: { color: Colors.textInverse, fontSize: 10, fontWeight: FontWeights.bold },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  grid: { paddingHorizontal: Spacing.md, paddingBottom: 16 },
  row: { justifyContent: 'space-between', marginBottom: 12 },
  cardWrap: { flex: 1, maxWidth: '31%' },
  footerLoader: { paddingVertical: 20, alignItems: 'center' },
});
