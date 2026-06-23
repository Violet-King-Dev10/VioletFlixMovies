import React, { memo } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Colors, Radii, Spacing } from '@/constants/theme';
import { useEffect, useRef } from 'react';

function SkeletonBox({ width, height, style }: { width: number | string; height: number; style?: object }) {
  const anim = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);
  return (
    <Animated.View
      style={[{ width, height, backgroundColor: Colors.surfaceElevated, borderRadius: Radii.md, opacity: anim }, style]}
    />
  );
}

function LoadingGridComponent({ count = 6 }: { count?: number }) {
  return (
    <View style={styles.container}>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={styles.item}>
          <SkeletonBox width={140} height={210} />
          <SkeletonBox width={110} height={12} style={{ marginTop: 8 }} />
          <SkeletonBox width={70} height={10} style={{ marginTop: 4 }} />
        </View>
      ))}
    </View>
  );
}

export const LoadingGrid = memo(LoadingGridComponent);

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row', flexWrap: 'wrap',
    paddingHorizontal: Spacing.md, gap: 12,
  },
  item: { marginBottom: 8 },
});
