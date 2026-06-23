import React, { memo } from 'react';
import { ScrollView, Pressable, Text, StyleSheet, View } from 'react-native';
import { Colors, Radii, FontSizes, FontWeights, Spacing } from '@/constants/theme';

interface ChipOption {
  key: string;
  label: string;
}

interface CategoryChipsProps {
  options: ChipOption[];
  selected: string;
  onSelect: (key: string) => void;
  accentColor?: string;
}

function CategoryChipsComponent({ options, selected, onSelect, accentColor }: CategoryChipsProps) {
  const accent = accentColor || Colors.primary;
  return (
    <View style={styles.outer}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.inner}
      >
        {options.map(opt => {
          const isSelected = opt.key === selected;
          return (
            <Pressable
              key={opt.key}
              onPress={() => onSelect(opt.key)}
              style={({ pressed }) => [
                styles.chip,
                isSelected ? { backgroundColor: accent, borderColor: accent } : styles.chipDefault,
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={[styles.chipText, isSelected ? styles.chipTextActive : styles.chipTextDefault]}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export const CategoryChips = memo(CategoryChipsComponent);

const styles = StyleSheet.create({
  outer: { height: 52 },
  inner: { paddingHorizontal: Spacing.md, gap: 8, alignItems: 'center' },
  chip: {
    height: 36, borderRadius: Radii.full,
    paddingHorizontal: 16, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1,
  },
  chipDefault: {
    backgroundColor: Colors.surfaceElevated, borderColor: Colors.border,
  },
  chipText: { fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  chipTextActive: { color: Colors.textPrimary },
  chipTextDefault: { color: Colors.textSecondary },
});
