import React, { useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList,
  Pressable, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { useSearch, SearchFilter, AdvancedFilters, DEFAULT_FILTERS, SortOption } from '@/hooks/useSearch';
import { TMDB_IMAGE } from '@/constants/config';
import { TMDBItem } from '@/services/tmdbService';
import { AniListMedia } from '@/services/anilistService';

const FILTERS: { key: SearchFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'movies', label: 'Movies' },
  { key: 'tv', label: 'TV Series' },
  { key: 'anime', label: 'Anime' },
];

const HOT_SEARCHES = ['Attack on Titan', 'Avengers', 'Naruto', 'One Piece', 'The Batman', 'Demon Slayer'];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = [null, ...Array.from({ length: 30 }, (_, i) => CURRENT_YEAR - i)];
const SORT_OPTIONS: { key: SortOption; label: string }[] = [
  { key: 'popularity', label: 'Most Popular' },
  { key: 'rating', label: 'Top Rated' },
  { key: 'newest', label: 'Newest' },
  { key: 'oldest', label: 'Oldest' },
];

function FilterPanel({
  visible,
  onClose,
  filters,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  filters: AdvancedFilters;
  onApply: (f: AdvancedFilters) => void;
}) {
  const [local, setLocal] = React.useState(filters);

  React.useEffect(() => {
    if (visible) setLocal(filters);
  }, [visible]);

  const accentColor = Colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={panelStyles.overlay}>
        <Pressable style={panelStyles.backdrop} onPress={onClose} />
        <View style={panelStyles.sheet}>
          <View style={panelStyles.header}>
            <Text style={panelStyles.title}>Advanced Filters</Text>
            <View style={panelStyles.headerRight}>
              <Pressable onPress={() => setLocal({ ...DEFAULT_FILTERS })}>
                <Text style={panelStyles.reset}>Reset</Text>
              </Pressable>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={panelStyles.scroll}>
            {/* Sort */}
            <Text style={panelStyles.sLabel}>Sort By</Text>
            <View style={panelStyles.row}>
              {SORT_OPTIONS.map(s => (
                <Pressable
                  key={s.key}
                  style={[panelStyles.chip, local.sortBy === s.key && { backgroundColor: accentColor, borderColor: accentColor }]}
                  onPress={() => setLocal({ ...local, sortBy: s.key })}
                >
                  <Text style={[panelStyles.chipText, local.sortBy === s.key && panelStyles.chipActive]}>{s.label}</Text>
                </Pressable>
              ))}
            </View>

            {/* Rating */}
            <Text style={panelStyles.sLabel}>Min Rating</Text>
            <View style={panelStyles.row}>
              {[0, 5, 6, 7, 8, 9].map(r => (
                <Pressable
                  key={r}
                  style={[panelStyles.chip, local.minRating === r && { backgroundColor: accentColor, borderColor: accentColor }]}
                  onPress={() => setLocal({ ...local, minRating: r })}
                >
                  {r === 0 ? (
                    <Text style={[panelStyles.chipText, local.minRating === r && panelStyles.chipActive]}>All</Text>
                  ) : (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      <MaterialIcons name="star" size={11} color={local.minRating === r ? '#fff' : Colors.accent} />
                      <Text style={[panelStyles.chipText, local.minRating === r && panelStyles.chipActive]}>{r}+</Text>
                    </View>
                  )}
                </Pressable>
              ))}
            </View>

            {/* Year From */}
            <Text style={panelStyles.sLabel}>Year From</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: Spacing.md }}>
                {YEAR_OPTIONS.slice(0, 15).map(y => (
                  <Pressable
                    key={String(y)}
                    style={[panelStyles.chip, local.yearFrom === y && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => setLocal({ ...local, yearFrom: y })}
                  >
                    <Text style={[panelStyles.chipText, local.yearFrom === y && panelStyles.chipActive]}>
                      {y === null ? 'Any' : String(y)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            {/* Year To */}
            <Text style={panelStyles.sLabel}>Year To</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: Spacing.md }}>
                {YEAR_OPTIONS.slice(0, 15).map(y => (
                  <Pressable
                    key={String(y)}
                    style={[panelStyles.chip, local.yearTo === y && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => setLocal({ ...local, yearTo: y })}
                  >
                    <Text style={[panelStyles.chipText, local.yearTo === y && panelStyles.chipActive]}>
                      {y === null ? 'Any' : String(y)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <View style={{ height: 16 }} />
          </ScrollView>
          <View style={panelStyles.footer}>
            <Pressable
              style={({ pressed }) => [panelStyles.applyBtn, pressed && { opacity: 0.85 }]}
              onPress={() => { onApply(local); onClose(); }}
            >
              <Text style={panelStyles.applyText}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function SearchScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const {
    query, setQuery, results, loading, filter, setFilter, totalResults,
    searchHistory, loadHistory, clearHistory,
    advancedFilters, applyFilters, activeFilterCount,
  } = useSearch();
  const [showFilterPanel, setShowFilterPanel] = React.useState(false);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const goMovie = (id: number) => router.push(`/movie/${id}`);
  const goTV = (id: number) => router.push(`/tv/${id}`);
  const goAnime = (id: number) => router.push(`/anime/${id}`);

  const getFilteredResults = () => {
    switch (filter) {
      case 'movies': return { movies: results.movies, tv: [], anime: [] };
      case 'tv': return { movies: [], tv: results.tv, anime: [] };
      case 'anime': return { movies: [], tv: [], anime: results.anime };
      default: return results;
    }
  };

  const filtered = getFilteredResults();

  const renderMovieItem = ({ item }: { item: TMDBItem }) => {
    const imageUri = item.poster_path ? TMDB_IMAGE(item.poster_path, 'w185') : null;
    const isTV = Boolean(item.name && !item.title);
    return (
      <Pressable
        style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
        onPress={() => isTV ? goTV(item.id) : goMovie(item.id)}
      >
        <View style={styles.resultPoster}>
          {imageUri ? (
            <Image source={{ uri: imageUri }} style={styles.posterImg} contentFit="cover" transition={200} />
          ) : (
            <View style={[styles.posterImg, styles.noPoster]}>
              <MaterialIcons name="movie" size={20} color={Colors.textMuted} />
            </View>
          )}
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{item.title || item.name}</Text>
          <View style={styles.resultMeta}>
            <View style={[styles.typeTag, { backgroundColor: isTV ? Colors.seriesColor : Colors.movieColor }]}>
              <Text style={styles.typeText}>{isTV ? 'TV' : 'Movie'}</Text>
            </View>
            {item.vote_average > 0 ? (
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={12} color={Colors.accent} />
                <Text style={styles.rating}>{item.vote_average.toFixed(1)}</Text>
              </View>
            ) : null}
            <Text style={styles.year}>{(item.release_date || item.first_air_date || '').slice(0, 4)}</Text>
          </View>
          <Text style={styles.overview} numberOfLines={2}>{item.overview}</Text>
        </View>
      </Pressable>
    );
  };

  const renderAnimeItem = ({ item }: { item: AniListMedia }) => {
    const title = item.title.english || item.title.romaji;
    return (
      <Pressable
        style={({ pressed }) => [styles.resultItem, pressed && { opacity: 0.7 }]}
        onPress={() => goAnime(item.id)}
      >
        <View style={styles.resultPoster}>
          <Image source={{ uri: item.coverImage.large }} style={styles.posterImg} contentFit="cover" transition={200} />
        </View>
        <View style={styles.resultInfo}>
          <Text style={styles.resultTitle} numberOfLines={2}>{title}</Text>
          <View style={styles.resultMeta}>
            <View style={[styles.typeTag, { backgroundColor: Colors.animeColor }]}>
              <Text style={[styles.typeText, { color: Colors.textInverse }]}>Anime</Text>
            </View>
            {item.averageScore ? (
              <View style={styles.ratingRow}>
                <MaterialIcons name="star" size={12} color={Colors.accent} />
                <Text style={styles.rating}>{(item.averageScore / 10).toFixed(1)}</Text>
              </View>
            ) : null}
            {item.format ? <Text style={styles.year}>{item.format}</Text> : null}
          </View>
          {item.description ? (
            <Text style={styles.overview} numberOfLines={2}>
              {item.description.replace(/<[^>]+>/g, '')}
            </Text>
          ) : null}
        </View>
      </Pressable>
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchBox}>
          <MaterialIcons name="search" size={22} color={Colors.textMuted} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="Search movies, anime, series..."
            placeholderTextColor={Colors.textMuted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery('')}>
              <MaterialIcons name="close" size={20} color={Colors.textMuted} />
            </Pressable>
          ) : null}
        </View>
        <Pressable
          style={[styles.filterBtn, activeFilterCount > 0 && styles.filterBtnActive]}
          onPress={() => setShowFilterPanel(true)}
        >
          <MaterialIcons name="tune" size={20} color={activeFilterCount > 0 ? Colors.primary : Colors.textMuted} />
          {activeFilterCount > 0 ? (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          ) : null}
        </Pressable>
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {FILTERS.map(f => (
          <Pressable
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key)}
          >
            <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Content */}
      {!query ? (
        <ScrollView style={styles.discoveryArea} showsVerticalScrollIndicator={false}>
          <Text style={styles.sectionTitle}>Hot Searches</Text>
          <View style={styles.hotGrid}>
            {HOT_SEARCHES.map(term => (
              <Pressable
                key={term}
                style={({ pressed }) => [styles.hotTag, pressed && { opacity: 0.7 }]}
                onPress={() => setQuery(term)}
              >
                <MaterialIcons name="local-fire-department" size={14} color={Colors.primary} />
                <Text style={styles.hotText}>{term}</Text>
              </Pressable>
            ))}
          </View>

          {searchHistory.length > 0 ? (
            <View style={styles.historySection}>
              <View style={styles.historyHeader}>
                <Text style={styles.sectionTitle}>Recent Searches</Text>
                <Pressable onPress={clearHistory}>
                  <Text style={styles.clearText}>Clear All</Text>
                </Pressable>
              </View>
              {searchHistory.slice(0, 8).map(term => (
                <Pressable
                  key={term}
                  style={({ pressed }) => [styles.historyItem, pressed && { opacity: 0.7 }]}
                  onPress={() => setQuery(term)}
                >
                  <MaterialIcons name="history" size={18} color={Colors.textMuted} />
                  <Text style={styles.historyText}>{term}</Text>
                  <MaterialIcons name="north-west" size={14} color={Colors.textMuted} style={styles.historyArrow} />
                </Pressable>
              ))}
            </View>
          ) : null}
        </ScrollView>
      ) : loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Searching...</Text>
        </View>
      ) : totalResults === 0 ? (
        <View style={styles.emptyWrap}>
          <MaterialIcons name="search-off" size={56} color={Colors.textMuted} />
          <Text style={styles.emptyText}>{`No results for "${query}"`}</Text>
          <Text style={styles.emptyHint}>Try different keywords or filters</Text>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} style={styles.resultsArea}>
          <Text style={styles.resultsCount}>{`${totalResults} results for "${query}"`}</Text>
          {filtered.movies.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Movies</Text>
              {filtered.movies.map(item => renderMovieItem({ item }))}
            </>
          ) : null}
          {filtered.tv.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>TV Series</Text>
              {filtered.tv.map(item => renderMovieItem({ item }))}
            </>
          ) : null}
          {filtered.anime.length > 0 ? (
            <>
              <Text style={styles.sectionLabel}>Anime</Text>
              {filtered.anime.map(item => renderAnimeItem({ item }))}
            </>
          ) : null}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Advanced Filter Panel */}
      <FilterPanel
        visible={showFilterPanel}
        onClose={() => setShowFilterPanel(false)}
        filters={advancedFilters}
        onApply={applyFilters}
      />
    </KeyboardAvoidingView>
  );
}

const panelStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface, borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl, maxHeight: '80%',
    borderWidth: 1, borderColor: Colors.border,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  title: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  reset: { color: Colors.primary, fontSize: FontSizes.sm },
  scroll: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sLabel: {
    color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  chipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  chipActive: { color: '#fff' },
  footer: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  applyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radii.md,
    paddingVertical: 14, alignItems: 'center',
  },
  applyText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  searchRow: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, flexDirection: 'row', gap: 8 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base },
  filterBtn: {
    width: 48, height: 48, borderRadius: Radii.md, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceElevated, borderWidth: 1, borderColor: Colors.border,
    position: 'relative',
  },
  filterBtnActive: { borderColor: Colors.primary, backgroundColor: 'rgba(229,9,20,0.08)' },
  filterBadge: {
    position: 'absolute', top: -4, right: -4,
    width: 16, height: 16, borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  filterBadgeText: { color: '#fff', fontSize: 9, fontWeight: FontWeights.bold },
  filterScroll: { maxHeight: 52 },
  filterRow: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1,
    borderColor: Colors.border, backgroundColor: Colors.surfaceCard,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  filterTextActive: { color: Colors.textPrimary },
  discoveryArea: { flex: 1, paddingHorizontal: Spacing.md, marginTop: Spacing.md },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, marginBottom: Spacing.sm },
  hotGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.lg },
  hotTag: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.surfaceElevated, paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
  },
  hotText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  historySection: {},
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.sm },
  clearText: { color: Colors.primary, fontSize: FontSizes.sm },
  historyItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  historyText: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.base },
  historyArrow: { marginLeft: 'auto' },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.md },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8 },
  emptyText: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptyHint: { color: Colors.textMuted, fontSize: FontSizes.sm },
  resultsArea: { flex: 1, paddingHorizontal: Spacing.md },
  resultsCount: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: Spacing.sm, marginBottom: Spacing.md },
  sectionLabel: {
    color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.bold,
    marginTop: Spacing.md, marginBottom: Spacing.sm,
    paddingBottom: Spacing.xs, borderBottomWidth: 2, borderBottomColor: Colors.primary,
  },
  resultItem: {
    flexDirection: 'row', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  resultPoster: { width: 60, height: 90 },
  posterImg: { width: 60, height: 90, borderRadius: Radii.sm },
  noPoster: { backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  resultInfo: { flex: 1 },
  resultTitle: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.semibold, marginBottom: 6 },
  resultMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radii.xs },
  typeText: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  rating: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  year: { color: Colors.textMuted, fontSize: FontSizes.xs },
  overview: { color: Colors.textMuted, fontSize: FontSizes.sm, lineHeight: 18 },
});
