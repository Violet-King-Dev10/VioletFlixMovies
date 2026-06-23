import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, FontSizes, FontWeights } from '@/constants/theme';

interface RatingBadgeProps {
  score: number; // 0-100 for anime, 0-10 for TMDB
  isPercentage?: boolean;
}

function RatingBadgeComponent({ score, isPercentage }: RatingBadgeProps) {
  const value = isPercentage ? (score / 10).toFixed(1) : score.toFixed(1);
  const color = score >= (isPercentage ? 75 : 7.5)
    ? Colors.success
    : score >= (isPercentage ? 60 : 6)
    ? Colors.warning
    : Colors.primary;

  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <MaterialIcons name="star" size={12} color={color} />
      <Text style={[styles.text, { color }]}>{value}</Text>
    </View>
  );
}

export const RatingBadge = memo(RatingBadgeComponent);

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderWidth: 1, borderRadius: Radii.full,
    paddingHorizontal: 8, paddingVertical: 3,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  text: { fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
});
