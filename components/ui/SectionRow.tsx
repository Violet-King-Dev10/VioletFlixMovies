import React, { memo } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Spacing, FontSizes, FontWeights } from '@/constants/theme';

interface SectionRowProps<T> {
  title: string;
  subtitle?: string;
  data: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  keyExtractor: (item: T) => string;
  onSeeAll?: () => void;
  itemHeight?: number;
}

function SectionRowComponent<T>({
  title, subtitle, data, renderItem, keyExtractor, onSeeAll, itemHeight = 230,
}: SectionRowProps<T>) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
        {onSeeAll ? (
          <Pressable onPress={onSeeAll} style={({ pressed }) => [pressed && { opacity: 0.7 }]}>
            <View style={styles.seeAllBtn}>
              <Text style={styles.seeAllText}>See All</Text>
              <MaterialIcons name="chevron-right" size={16} color={Colors.primary} />
            </View>
          </Pressable>
        ) : null}
      </View>
      <FlatList
        horizontal
        data={data}
        keyExtractor={keyExtractor}
        renderItem={({ item, index }) => renderItem(item, index) as React.ReactElement}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.list}
        style={{ height: itemHeight }}
      />
    </View>
  );
}

export const SectionRow = memo(SectionRowComponent) as typeof SectionRowComponent;

const styles = StyleSheet.create({
  container: { marginBottom: Spacing.lg },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: Spacing.md, marginBottom: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary, fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  subtitle: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  seeAllBtn: { flexDirection: 'row', alignItems: 'center' },
  seeAllText: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  list: { paddingHorizontal: Spacing.md },
});
