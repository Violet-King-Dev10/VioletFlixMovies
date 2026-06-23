import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Modal, ScrollView,
  Animated, TouchableWithoutFeedback, Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radii, FontSizes, FontWeights, Shadows } from '@/constants/theme';
import { AnimeNotification } from '@/hooks/useAnimeNotifications';

interface NotificationBellProps {
  notifications: AnimeNotification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  isRead: (animeId: number, episode: number) => boolean;
}

function formatAiringTime(airingAt: number): string {
  const now = Math.floor(Date.now() / 1000);
  const diff = airingAt - now;

  if (diff < 0) {
    // Already aired
    const ago = Math.abs(diff);
    if (ago < 3600) return `${Math.floor(ago / 60)}m ago`;
    if (ago < 86400) return `${Math.floor(ago / 3600)}h ago`;
    return `${Math.floor(ago / 86400)}d ago`;
  }

  // Upcoming
  if (diff < 3600) return `In ${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `In ${Math.floor(diff / 3600)}h`;
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  return `In ${days}d ${hours}h`;
}

function isAired(airingAt: number) {
  return airingAt < Math.floor(Date.now() / 1000);
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkAllRead,
  isRead,
}: NotificationBellProps) {
  const [visible, setVisible] = useState(false);
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const shake = useCallback(() => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
    ]).start();
  }, [shakeAnim]);

  const handleOpen = () => {
    if (unreadCount > 0) shake();
    setVisible(true);
  };

  const handleClose = () => {
    setVisible(false);
    onMarkAllRead();
  };

  const handleAnimePress = (animeId: number) => {
    setVisible(false);
    onMarkAllRead();
    router.push(`/anime/${animeId}`);
  };

  const rotate = shakeAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: ['-15deg', '15deg'],
  });

  return (
    <>
      {/* Bell Button */}
      <Pressable
        onPress={handleOpen}
        hitSlop={8}
        style={({ pressed }) => [styles.bellBtn, pressed && { opacity: 0.7 }]}
      >
        <Animated.View style={{ transform: [{ rotate }] }}>
          <MaterialIcons
            name="notifications"
            size={26}
            color={unreadCount > 0 ? Colors.accent : Colors.textSecondary}
          />
        </Animated.View>
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
          </View>
        ) : null}
      </Pressable>

      {/* Notification Panel Modal */}
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={handleClose}
      >
        <TouchableWithoutFeedback onPress={handleClose}>
          <View style={styles.overlay}>
            <TouchableWithoutFeedback onPress={(e) => e.stopPropagation()}>
              <View style={[styles.panel, { marginTop: insets.top + 56 }]}>
                {/* Panel Header */}
                <View style={styles.panelHeader}>
                  <View style={styles.panelHeaderLeft}>
                    <MaterialIcons name="notifications" size={18} color={Colors.accent} />
                    <Text style={styles.panelTitle}>Episode Alerts</Text>
                    {unreadCount > 0 ? (
                      <View style={styles.unreadChip}>
                        <Text style={styles.unreadChipText}>{unreadCount} new</Text>
                      </View>
                    ) : null}
                  </View>
                  <Pressable onPress={handleClose} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color={Colors.textMuted} />
                  </Pressable>
                </View>

                {/* Content */}
                {notifications.length === 0 ? (
                  <View style={styles.emptyState}>
                    <MaterialIcons name="notifications-none" size={40} color={Colors.textMuted} />
                    <Text style={styles.emptyTitle}>No Episode Alerts</Text>
                    <Text style={styles.emptySubtitle}>
                      Add RELEASING anime to your watchlist to get notified when new episodes air.
                    </Text>
                  </View>
                ) : (
                  <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                  >
                    {notifications.map((n) => {
                      const aired = isAired(n.airingAt);
                      const read = isRead(n.animeId, n.episode);
                      return (
                        <Pressable
                          key={`${n.animeId}-${n.episode}`}
                          style={({ pressed }) => [
                            styles.notifItem,
                            !read && styles.notifItemUnread,
                            pressed && { opacity: 0.75 },
                          ]}
                          onPress={() => handleAnimePress(n.animeId)}
                        >
                          {/* Cover */}
                          <View style={styles.coverWrap}>
                            {n.coverImage ? (
                              <Image
                                source={{ uri: n.coverImage }}
                                style={styles.cover}
                                contentFit="cover"
                                transition={150}
                              />
                            ) : (
                              <View style={[styles.cover, styles.coverFallback]}>
                                <MaterialIcons name="auto-awesome" size={16} color={Colors.animeColor} />
                              </View>
                            )}
                            {!read ? <View style={styles.unreadDot} /> : null}
                          </View>

                          {/* Text */}
                          <View style={styles.notifText}>
                            <Text style={styles.notifTitle} numberOfLines={1}>{n.title}</Text>
                            <View style={styles.notifMeta}>
                              <View style={[
                                styles.epChip,
                                { backgroundColor: aired ? Colors.success + '22' : Colors.accentGlow },
                              ]}>
                                <MaterialIcons
                                  name={aired ? 'check-circle' : 'schedule'}
                                  size={10}
                                  color={aired ? Colors.success : Colors.accent}
                                />
                                <Text style={[
                                  styles.epChipText,
                                  { color: aired ? Colors.success : Colors.accent },
                                ]}>
                                  EP {n.episode}
                                </Text>
                              </View>
                              <Text style={[
                                styles.timeText,
                                { color: aired ? Colors.textSecondary : Colors.accent },
                              ]}>
                                {formatAiringTime(n.airingAt)}
                              </Text>
                            </View>
                          </View>

                          <MaterialIcons name="chevron-right" size={16} color={Colors.textMuted} />
                        </Pressable>
                      );
                    })}
                    <View style={{ height: Spacing.md }} />
                  </ScrollView>
                )}

                {/* Footer */}
                {notifications.length > 0 ? (
                  <View style={styles.panelFooter}>
                    <Text style={styles.footerHint}>
                      From your watchlisted RELEASING anime
                    </Text>
                  </View>
                ) : null}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    position: 'relative',
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.background,
  },
  badgeText: {
    color: Colors.textPrimary,
    fontSize: 9,
    fontWeight: FontWeights.black,
    lineHeight: 12,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  panel: {
    marginHorizontal: Spacing.md,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.lg,
    maxHeight: 480,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.hero,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  panelHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.bold,
  },
  unreadChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: Radii.full,
  },
  unreadChipText: {
    color: Colors.textPrimary,
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },
  list: {
    maxHeight: 360,
  },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
  },
  notifItemUnread: {
    backgroundColor: 'rgba(255, 215, 0, 0.04)',
  },
  coverWrap: {
    position: 'relative',
  },
  cover: {
    width: 44,
    height: 60,
    borderRadius: Radii.sm,
    backgroundColor: Colors.surfaceCard,
  },
  coverFallback: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -3,
    right: -3,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
    borderWidth: 2,
    borderColor: Colors.surfaceElevated,
  },
  notifText: {
    flex: 1,
    gap: 6,
  },
  notifTitle: {
    color: Colors.textPrimary,
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  notifMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  epChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radii.xs,
  },
  epChipText: {
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },
  timeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xxl,
    paddingHorizontal: Spacing.lg,
    gap: 10,
  },
  emptyTitle: {
    color: Colors.textSecondary,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  emptySubtitle: {
    color: Colors.textMuted,
    fontSize: FontSizes.sm,
    textAlign: 'center',
    lineHeight: 20,
  },
  panelFooter: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  footerHint: {
    color: Colors.textMuted,
    fontSize: FontSizes.xs,
  },
});
