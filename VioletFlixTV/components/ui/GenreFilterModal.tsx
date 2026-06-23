import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView,
  ActivityIndicator, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { getMovieGenres, getTVGenres, TMDBGenre } from '@/services/tmdbService';
import { getAnimeGenres } from '@/services/anilistService';
import { MovieFilters, DEFAULT_MOVIE_FILTERS } from '@/hooks/useMovies';
import { AnimeFilters, DEFAULT_ANIME_FILTERS } from '@/hooks/useAnime';
import { TVFilters, DEFAULT_TV_FILTERS } from '@/hooks/useTV';

type FilterType = 'movie' | 'tv' | 'anime';

const RATINGS = [0, 5, 6, 7, 8, 9];
const YEARS = [null, 2024, 2023, 2022, 2021, 2020, 2019, 2015, 2010, 2000];
const SORT_OPTIONS_TMDB = [
  { key: 'popularity.desc', label: 'Most Popular' },
  { key: 'vote_average.desc', label: 'Highest Rated' },
  { key: 'release_date.desc', label: 'Newest First' },
  { key: 'release_date.asc', label: 'Oldest First' },
];
const SORT_OPTIONS_ANIME = [
  { key: 'TRENDING_DESC', label: 'Trending' },
  { key: 'POPULARITY_DESC', label: 'Most Popular' },
  { key: 'SCORE_DESC', label: 'Highest Rated' },
  { key: 'START_DATE_DESC', label: 'Newest First' },
  { key: 'START_DATE', label: 'Oldest First' },
];

interface Props {
  visible: boolean;
  onClose: () => void;
  type: FilterType;
  currentFilters: MovieFilters | AnimeFilters | TVFilters;
  onApply: (filters: any) => void;
}

export function GenreFilterModal({ visible, onClose, type, currentFilters, onApply }: Props) {
  const [genres, setGenres] = useState<{ id: string | number; name: string }[]>([]);
  const [loadingGenres, setLoadingGenres] = useState(false);
  const [localFilters, setLocalFilters] = useState(currentFilters);

  useEffect(() => {
    if (visible) {
      setLocalFilters(currentFilters);
      loadGenres();
    }
  }, [visible, type]);

  const loadGenres = async () => {
    setLoadingGenres(true);
    try {
      if (type === 'movie') {
        const { genres: g } = await getMovieGenres();
        setGenres(g);
      } else if (type === 'tv') {
        const { genres: g } = await getTVGenres();
        setGenres(g);
      } else {
        const g = await getAnimeGenres();
        setGenres(g.map(name => ({ id: name, name })));
      }
    } catch {
      setGenres([]);
    } finally {
      setLoadingGenres(false);
    }
  };

  const toggleGenre = (id: string | number) => {
    if (type === 'anime') {
      const f = localFilters as AnimeFilters;
      const genreStr = String(id);
      setLocalFilters({
        ...f,
        genres: f.genres.includes(genreStr)
          ? f.genres.filter(g => g !== genreStr)
          : [...f.genres, genreStr],
      });
    } else {
      const f = localFilters as MovieFilters | TVFilters;
      const genreNum = Number(id);
      setLocalFilters({
        ...f,
        genres: (f.genres as number[]).includes(genreNum)
          ? (f.genres as number[]).filter(g => g !== genreNum)
          : [...(f.genres as number[]), genreNum],
      });
    }
  };

  const isGenreSelected = (id: string | number): boolean => {
    if (type === 'anime') {
      return (localFilters as AnimeFilters).genres.includes(String(id));
    }
    return ((localFilters as MovieFilters | TVFilters).genres as number[]).includes(Number(id));
  };

  const handleReset = () => {
    if (type === 'anime') setLocalFilters({ ...DEFAULT_ANIME_FILTERS });
    else if (type === 'movie') setLocalFilters({ ...DEFAULT_MOVIE_FILTERS });
    else setLocalFilters({ ...DEFAULT_TV_FILTERS });
  };

  const sortOptions = type === 'anime' ? SORT_OPTIONS_ANIME : SORT_OPTIONS_TMDB;
  const accentColor = type === 'anime' ? Colors.animeColor : type === 'tv' ? Colors.seriesColor : Colors.primary;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filter & Sort</Text>
            <View style={styles.sheetActions}>
              <Pressable onPress={handleReset} style={styles.resetBtn}>
                <Text style={styles.resetText}>Reset</Text>
              </Pressable>
              <Pressable onPress={onClose}>
                <MaterialIcons name="close" size={22} color={Colors.textPrimary} />
              </Pressable>
            </View>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {/* Sort */}
            <Text style={styles.sectionLabel}>Sort By</Text>
            <View style={styles.sortGrid}>
              {sortOptions.map(opt => {
                const currentSort = type === 'anime'
                  ? (localFilters as AnimeFilters).sortBy
                  : (localFilters as MovieFilters | TVFilters).sortBy;
                const isActive = currentSort === opt.key;
                return (
                  <Pressable
                    key={opt.key}
                    style={[styles.sortChip, isActive && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => setLocalFilters({ ...localFilters, sortBy: opt.key })}
                  >
                    <Text style={[styles.sortChipText, isActive && styles.sortChipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* Min Rating */}
            <Text style={styles.sectionLabel}>Minimum Rating</Text>
            <View style={styles.ratingRow}>
              {RATINGS.map(r => {
                const currentRating = type === 'anime'
                  ? (localFilters as AnimeFilters).minScore
                  : (localFilters as MovieFilters | TVFilters).minRating;
                const isActive = currentRating === r;
                return (
                  <Pressable
                    key={r}
                    style={[styles.ratingChip, isActive && { backgroundColor: accentColor, borderColor: accentColor }]}
                    onPress={() => {
                      if (type === 'anime') {
                        setLocalFilters({ ...localFilters, minScore: r });
                      } else {
                        setLocalFilters({ ...localFilters, minRating: r });
                      }
                    }}
                  >
                    {r === 0 ? (
                      <Text style={[styles.ratingChipText, isActive && styles.ratingChipTextActive]}>All</Text>
                    ) : (
                      <View style={styles.ratingInner}>
                        <MaterialIcons name="star" size={11} color={isActive ? Colors.textInverse : Colors.accent} />
                        <Text style={[styles.ratingChipText, isActive && styles.ratingChipTextActive]}>{r}+</Text>
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Year */}
            <Text style={styles.sectionLabel}>Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: Spacing.md }}>
              <View style={{ flexDirection: 'row', gap: 8, paddingRight: Spacing.md }}>
                {YEARS.map(y => {
                  const currentYear = type === 'anime'
                    ? (localFilters as AnimeFilters).year
                    : (localFilters as MovieFilters | TVFilters).yearFrom;
                  const isActive = currentYear === y;
                  return (
                    <Pressable
                      key={String(y)}
                      style={[styles.yearChip, isActive && { backgroundColor: accentColor, borderColor: accentColor }]}
                      onPress={() => {
                        if (type === 'anime') {
                          setLocalFilters({ ...localFilters, year: y });
                        } else {
                          setLocalFilters({ ...localFilters, yearFrom: y, yearTo: y ? y + 4 : null });
                        }
                      }}
                    >
                      <Text style={[styles.yearChipText, isActive && styles.yearChipTextActive]}>
                        {y === null ? 'All' : String(y)}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </ScrollView>

            {/* Genres */}
            <Text style={styles.sectionLabel}>Genres</Text>
            {loadingGenres ? (
              <ActivityIndicator size="small" color={accentColor} style={{ marginBottom: Spacing.md }} />
            ) : (
              <View style={styles.genreGrid}>
                {genres.map(genre => {
                  const selected = isGenreSelected(genre.id);
                  return (
                    <Pressable
                      key={String(genre.id)}
                      style={[styles.genreChip, selected && { backgroundColor: accentColor, borderColor: accentColor }]}
                      onPress={() => toggleGenre(genre.id)}
                    >
                      <Text style={[styles.genreChipText, selected && styles.genreChipTextActive]}>
                        {genre.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Apply Button */}
          <View style={styles.applyWrap}>
            <Pressable
              style={({ pressed }) => [styles.applyBtn, { backgroundColor: accentColor }, pressed && { opacity: 0.85 }]}
              onPress={() => { onApply(localFilters); onClose(); }}
            >
              <Text style={[styles.applyText, type === 'anime' && { color: Colors.textInverse }]}>Apply Filters</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: Radii.xl, borderTopRightRadius: Radii.xl,
    maxHeight: '85%', borderWidth: 1, borderColor: Colors.border,
  },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  sheetActions: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  resetBtn: { paddingHorizontal: 4 },
  resetText: { color: Colors.primary, fontSize: FontSizes.sm },
  scrollContent: { paddingHorizontal: Spacing.md, paddingTop: Spacing.md },
  sectionLabel: {
    color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold,
    marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.8,
  },
  sortGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  sortChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  sortChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  sortChipTextActive: { color: '#fff' },
  ratingRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.md, flexWrap: 'wrap' },
  ratingChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
    minWidth: 52, alignItems: 'center',
  },
  ratingInner: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  ratingChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  ratingChipTextActive: { color: '#fff' },
  yearChip: {
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  yearChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  yearChipTextActive: { color: '#fff' },
  genreGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: Spacing.md },
  genreChip: {
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceElevated,
  },
  genreChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  genreChipTextActive: { color: '#fff' },
  applyWrap: { padding: Spacing.md, borderTopWidth: 1, borderTopColor: Colors.border },
  applyBtn: {
    borderRadius: Radii.md, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  applyText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
});
