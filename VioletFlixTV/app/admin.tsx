import React, { useState } from 'react';
import {
  View, Text, StyleSheet, Pressable,
  ActivityIndicator, ScrollView, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { getSupabaseClient, useAlert, useAuth } from '@/template';

const ADMIN_EMAIL = 'akewusholaabdulbakri101@gmail.com';

interface MediaBreakdown {
  movie: number;
  tv: number;
  anime: number;
}

interface AdminStats {
  totalUsers: number;
  totalWatchlistItems: number;
  totalHistoryItems: number;
  totalDownloads: number;
  completedDownloads: number;
  failedDownloads: number;
  recentStreams: number;
  recentDownloads: number;
  streamBreakdown: MediaBreakdown;
  downloadBreakdown: MediaBreakdown;
}

interface UserRow {
  id: string;
  email: string;
  username: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at?: string;
}

export default function AdminScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const [tab, setTab] = useState<'dashboard' | 'users' | 'settings'>('dashboard');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchUser, setSearchUser] = useState('');
  const isAdmin = user?.email === ADMIN_EMAIL;

  const loadStats = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const [usersRes, watchlistRes, historyRes, downloadsRes, historyRowsRes, downloadRowsRes] = await Promise.all([
        supabase.from('user_profiles').select('id', { count: 'exact', head: true }),
        supabase.from('watchlist').select('id', { count: 'exact', head: true }),
        supabase.from('watch_history').select('id', { count: 'exact', head: true }),
        supabase.from('downloads').select('id', { count: 'exact', head: true }),
        supabase.from('watch_history').select('media_type, watched_at').limit(1000),
        supabase.from('downloads').select('media_type, status, created_at').limit(1000),
      ]);

      const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const emptyBreakdown: MediaBreakdown = { movie: 0, tv: 0, anime: 0 };
      const streamBreakdown = { ...emptyBreakdown };
      const downloadBreakdown = { ...emptyBreakdown };
      const historyRows = historyRowsRes.data || [];
      const downloadRows = downloadRowsRes.data || [];

      historyRows.forEach(row => {
        const mediaType = row.media_type as keyof MediaBreakdown;
        if (mediaType in streamBreakdown) streamBreakdown[mediaType] += 1;
      });
      downloadRows.forEach(row => {
        const mediaType = row.media_type as keyof MediaBreakdown;
        if (mediaType in downloadBreakdown) downloadBreakdown[mediaType] += 1;
      });

      setStats({
        totalUsers: usersRes.count || 0,
        totalWatchlistItems: watchlistRes.count || 0,
        totalHistoryItems: historyRes.count || 0,
        totalDownloads: downloadsRes.count || 0,
        completedDownloads: downloadRows.filter(row => row.status === 'completed').length,
        failedDownloads: downloadRows.filter(row => row.status === 'failed').length,
        recentStreams: historyRows.filter(row => row.watched_at && new Date(row.watched_at).getTime() >= weekAgo).length,
        recentDownloads: downloadRows.filter(row => row.created_at && new Date(row.created_at).getTime() >= weekAgo).length,
        streamBreakdown,
        downloadBreakdown,
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const supabase = getSupabaseClient();
      const { data } = await supabase
        .from('user_profiles')
        .select('id, email, username, avatar_url, is_admin')
        .order('email');
      setUsers(data || []);
    } finally {
      setLoading(false);
    }
  };

  const toggleAdmin = async (userId: string, currentValue: boolean) => {
    const supabase = getSupabaseClient();
    await supabase.from('user_profiles').update({ is_admin: !currentValue }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_admin: !currentValue } : u));
    showAlert('Updated', `Admin status updated`);
  };

  React.useEffect(() => {
    if (!isAdmin) return;
    if (tab === 'dashboard') loadStats();
    else if (tab === 'users') loadUsers();
  }, [tab, isAdmin]);

  const [adminPassword, setAdminPassword] = React.useState('');
  const [adminUnlocked, setAdminUnlocked] = React.useState(false);
  const [pwError, setPwError] = React.useState('');
  const ADMIN_PASSWORD = 'VioletFlixTV@2025';

  const handleAdminLogin = () => {
    if (adminPassword === ADMIN_PASSWORD) {
      setAdminUnlocked(true);
      setPwError('');
    } else {
      setPwError('Incorrect password. Try again.');
    }
  };

  // Check admin access
  if (!isAdmin || !adminUnlocked) {
    return (
      <View style={[styles.root, styles.center, { paddingTop: insets.top }]}>
        <MaterialIcons name="admin-panel-settings" size={64} color={Colors.primary} />
        <Text style={styles.accessTitle}>VioletFlixTV Admin Portal</Text>
        <Text style={styles.accessSub}>
          {!isAdmin ? 'Sign in with the admin email first, then enter the portal password.' : 'Enter admin portal password'}
        </Text>
        {isAdmin ? (
          <>
            <View style={styles.pwInputWrap}>
              <MaterialIcons name="lock" size={18} color={Colors.textMuted} />
              <TextInput
                style={styles.pwInput}
                placeholder="Admin portal password"
                placeholderTextColor={Colors.textMuted}
                value={adminPassword}
                onChangeText={t => { setAdminPassword(t); setPwError(''); }}
                secureTextEntry
              />
            </View>
            {pwError ? <Text style={styles.pwError}>{pwError}</Text> : null}
            <Pressable style={styles.backBtn} onPress={handleAdminLogin}>
              <Text style={styles.backBtnText}>Enter Admin Portal</Text>
            </Pressable>
          </>
        ) : null}
        <Pressable style={[styles.backBtn, { marginTop: 8, backgroundColor: 'transparent', borderWidth: 1, borderColor: Colors.border }]} onPress={() => router.back()}>
          <Text style={[styles.backBtnText, { color: Colors.textMuted }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }


  const filteredUsers = users.filter(u =>
    u.email.toLowerCase().includes(searchUser.toLowerCase()) ||
    (u.username || '').toLowerCase().includes(searchUser.toLowerCase())
  );

  const TABS = [
    { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
    { key: 'users', label: 'Users', icon: 'people' },
    { key: 'settings', label: 'Settings', icon: 'settings' },
  ] as const;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backIcon}>
          <MaterialIcons name="arrow-back" size={22} color={Colors.textPrimary} />
        </Pressable>
        <View>
          <Text style={styles.headerTitle}>VioletFlixTV Admin Portal</Text>
          <Text style={styles.headerSub}>{user.email}</Text>
        </View>
        <View style={styles.adminBadge}>
          <MaterialIcons name="verified" size={14} color={Colors.primary} />
          <Text style={styles.adminBadgeText}>ADMIN</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(t => (
          <Pressable
            key={t.key}
            style={[styles.tabBtn, tab === t.key && styles.tabBtnActive]}
            onPress={() => setTab(t.key)}
          >
            <MaterialIcons
              name={t.icon as keyof typeof MaterialIcons.glyphMap}
              size={18}
              color={tab === t.key ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabText, tab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Dashboard */}
        {tab === 'dashboard' && (
          <>
            <Text style={styles.sectionTitle}>Platform Overview</Text>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : stats ? (
              <>
                <View style={styles.statsGrid}>
                  <View style={styles.statCard}>
                    <MaterialIcons name="people" size={28} color={Colors.info} />
                    <Text style={styles.statValue}>{stats.totalUsers}</Text>
                    <Text style={styles.statLabel}>Total Users</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons name="bookmark" size={28} color={Colors.primary} />
                    <Text style={styles.statValue}>{stats.totalWatchlistItems}</Text>
                    <Text style={styles.statLabel}>Watchlist Items</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons name="history" size={28} color={Colors.accent} />
                    <Text style={styles.statValue}>{stats.totalHistoryItems}</Text>
                    <Text style={styles.statLabel}>Watch History</Text>
                  </View>
                  <View style={styles.statCard}>
                    <MaterialIcons name="download" size={28} color={Colors.success} />
                    <Text style={styles.statValue}>{stats.totalDownloads}</Text>
                    <Text style={styles.statLabel}>Downloads</Text>
                  </View>
                </View>
                <Pressable style={styles.refreshBtn} onPress={loadStats}>
                  <MaterialIcons name="refresh" size={18} color={Colors.primary} />
                  <Text style={styles.refreshText}>Refresh Stats</Text>
                </Pressable>

                <Text style={styles.sectionTitle}>Streaming & Download Analysis</Text>
                <View style={styles.analysisGrid}>
                  <View style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <MaterialIcons name="play-circle-filled" size={22} color={Colors.movieColor} />
                      <Text style={styles.analysisTitle}>Streams</Text>
                    </View>
                    <Text style={styles.analysisValue}>{stats.totalHistoryItems}</Text>
                    <Text style={styles.analysisHint}>{stats.recentStreams} in the last 7 days</Text>
                    {(['movie', 'tv', 'anime'] as const).map(type => (
                      <View key={`streams-${type}`} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{type.toUpperCase()}</Text>
                        <View style={styles.breakdownTrack}>
                          <View style={[styles.breakdownFill, {
                            width: `${stats.totalHistoryItems ? Math.round((stats.streamBreakdown[type] / stats.totalHistoryItems) * 100) : 0}%` as any,
                            backgroundColor: type === 'anime' ? Colors.animeColor : type === 'tv' ? Colors.seriesColor : Colors.movieColor,
                          }]} />
                        </View>
                        <Text style={styles.breakdownValue}>{stats.streamBreakdown[type]}</Text>
                      </View>
                    ))}
                  </View>
                  <View style={styles.analysisCard}>
                    <View style={styles.analysisHeader}>
                      <MaterialIcons name="download-done" size={22} color={Colors.downloadColor} />
                      <Text style={styles.analysisTitle}>Downloads</Text>
                    </View>
                    <Text style={styles.analysisValue}>{stats.totalDownloads}</Text>
                    <Text style={styles.analysisHint}>{stats.recentDownloads} in the last 7 days</Text>
                    <View style={styles.statusSplit}>
                      <Text style={styles.statusGood}>{stats.completedDownloads} ready</Text>
                      <Text style={styles.statusBad}>{stats.failedDownloads} failed</Text>
                    </View>
                    {(['movie', 'tv', 'anime'] as const).map(type => (
                      <View key={`downloads-${type}`} style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>{type.toUpperCase()}</Text>
                        <View style={styles.breakdownTrack}>
                          <View style={[styles.breakdownFill, {
                            width: `${stats.totalDownloads ? Math.round((stats.downloadBreakdown[type] / stats.totalDownloads) * 100) : 0}%` as any,
                            backgroundColor: type === 'anime' ? Colors.animeColor : type === 'tv' ? Colors.seriesColor : Colors.movieColor,
                          }]} />
                        </View>
                        <Text style={styles.breakdownValue}>{stats.downloadBreakdown[type]}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                {/* Quick Actions */}
                <Text style={styles.sectionTitle}>Quick Actions</Text>
                <View style={styles.actionsList}>
                  {[
                    { icon: 'people', label: 'Manage Users', action: () => setTab('users') },
                    { icon: 'settings', label: 'Platform Settings', action: () => setTab('settings') },
                    { icon: 'logout', label: 'Sign Out', action: async () => { await logout(); router.replace('/login'); } },
                  ].map(item => (
                    <Pressable
                      key={item.label}
                      style={({ pressed }) => [styles.actionItem, pressed && { opacity: 0.7 }]}
                      onPress={item.action}
                    >
                      <View style={styles.actionIcon}>
                        <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={Colors.primary} />
                      </View>
                      <Text style={styles.actionLabel}>{item.label}</Text>
                      <MaterialIcons name="chevron-right" size={20} color={Colors.textMuted} />
                    </Pressable>
                  ))}
                </View>
              </>
            ) : null}
          </>
        )}

        {/* Users */}
        {tab === 'users' && (
          <>
            <View style={styles.searchBox}>
              <MaterialIcons name="search" size={20} color={Colors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search users..."
                placeholderTextColor={Colors.textMuted}
                value={searchUser}
                onChangeText={setSearchUser}
              />
            </View>
            <Text style={styles.userCount}>{filteredUsers.length} users</Text>
            {loading ? (
              <ActivityIndicator size="large" color={Colors.primary} style={{ marginTop: 40 }} />
            ) : filteredUsers.map(u => (
              <View key={u.id} style={styles.userRow}>
                <View style={styles.userAvatar}>
                  {u.avatar_url ? (
                    <Image source={{ uri: u.avatar_url }} style={styles.avatarImg} contentFit="cover" />
                  ) : (
                    <MaterialIcons name="person" size={22} color={Colors.textMuted} />
                  )}
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userEmail} numberOfLines={1}>{u.email}</Text>
                  <Text style={styles.userName}>{u.username || 'No username'}</Text>
                </View>
                <View style={styles.userActions}>
                  {u.is_admin ? (
                    <View style={styles.adminPill}>
                      <Text style={styles.adminPillText}>Admin</Text>
                    </View>
                  ) : null}
                  {u.email !== ADMIN_EMAIL ? (
                    <Pressable
                      style={styles.toggleBtn}
                      onPress={() => toggleAdmin(u.id, u.is_admin)}
                    >
                      <MaterialIcons
                        name={u.is_admin ? 'remove-circle-outline' : 'add-circle-outline'}
                        size={22}
                        color={u.is_admin ? Colors.error : Colors.success}
                      />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))}
          </>
        )}

        {/* Settings */}
        {tab === 'settings' && (
          <>
            <Text style={styles.sectionTitle}>Platform Settings</Text>
            {[
              { icon: 'movie', label: 'Content Source: TMDB + AniList', value: 'Active' },
              { icon: 'cloud', label: 'VioletFlixTV Cloud Backend', value: 'Connected' },
              { icon: 'security', label: 'Row Level Security', value: 'Enabled' },
              { icon: 'storage', label: 'Avatar Storage Bucket', value: 'Public' },
              { icon: 'api', label: 'TMDB API Version', value: 'v3' },
              { icon: 'dns', label: 'AniList GraphQL', value: 'v2' },
            ].map(item => (
              <View key={item.label} style={styles.settingRow}>
                <MaterialIcons name={item.icon as keyof typeof MaterialIcons.glyphMap} size={20} color={Colors.primary} />
                <Text style={styles.settingLabel}>{item.label}</Text>
                <View style={styles.settingValue}>
                  <Text style={styles.settingValueText}>{item.value}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        <View style={{ height: insets.bottom + 32 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  center: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  accessTitle: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: FontWeights.bold },
  accessSub: { color: Colors.textMuted, fontSize: FontSizes.sm },
  backBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 24, paddingVertical: 10,
    borderRadius: Radii.md, marginTop: 8,
  },
  backBtnText: { color: Colors.textPrimary, fontWeight: FontWeights.bold },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm,
  },
  backIcon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSizes.xl, fontWeight: FontWeights.black },
  headerSub: { color: Colors.textMuted, fontSize: FontSizes.xs },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginLeft: 'auto', backgroundColor: 'rgba(229,9,20,0.12)',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radii.full,
    borderWidth: 1, borderColor: Colors.primary,
  },
  adminBadgeText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 4, marginBottom: Spacing.md },
  tabBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  tabBtnActive: { backgroundColor: 'rgba(229,9,20,0.12)', borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  tabTextActive: { color: Colors.primary },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  sectionTitle: {
    color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold,
    marginBottom: Spacing.md, marginTop: Spacing.sm,
  },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: Spacing.md },
  statCard: {
    flex: 1, minWidth: '45%', alignItems: 'center',
    backgroundColor: Colors.surfaceCard, borderRadius: Radii.lg,
    padding: Spacing.md, gap: 6, borderWidth: 1, borderColor: Colors.border,
  },
  statValue: { color: Colors.textPrimary, fontSize: FontSizes.xxxl, fontWeight: FontWeights.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSizes.sm },
  refreshBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    alignSelf: 'flex-start', padding: 8, marginBottom: Spacing.md,
  },
  refreshText: { color: Colors.primary, fontSize: FontSizes.sm },
  analysisGrid: { gap: 12, marginBottom: Spacing.lg },
  analysisCard: {
    backgroundColor: Colors.surfaceCard, borderRadius: Radii.lg,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  analysisTitle: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.bold },
  analysisValue: { color: Colors.textPrimary, fontSize: FontSizes.xxxl, fontWeight: FontWeights.black },
  analysisHint: { color: Colors.textMuted, fontSize: FontSizes.xs, marginBottom: 12 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  breakdownLabel: { width: 46, color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  breakdownTrack: { flex: 1, height: 7, borderRadius: Radii.full, backgroundColor: Colors.border, overflow: 'hidden' },
  breakdownFill: { height: 7, borderRadius: Radii.full },
  breakdownValue: { width: 28, textAlign: 'right', color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  statusSplit: { flexDirection: 'row', gap: 12, marginBottom: 4 },
  statusGood: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  statusBad: { color: Colors.error, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  actionsList: { gap: 8, marginBottom: Spacing.lg },
  actionItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceCard, borderRadius: Radii.md,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.border,
  },
  actionIcon: {
    width: 36, height: 36, borderRadius: Radii.sm,
    backgroundColor: 'rgba(229,9,20,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  actionLabel: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.medium },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.md,
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: Colors.border, marginBottom: 8,
  },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base },
  userCount: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 12 },
  userRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  userAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarImg: { width: 44, height: 44 },
  userInfo: { flex: 1 },
  userEmail: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  userName: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  userActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  adminPill: {
    backgroundColor: 'rgba(229,9,20,0.12)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.primary,
  },
  adminPillText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  pwInputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceElevated, borderRadius: Radii.md,
    paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.border,
    width: '80%', marginTop: 16,
  },
  pwInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base },
  pwError: { color: Colors.error || '#ef4444', fontSize: FontSizes.sm, marginTop: 4 },
  toggleBtn: { padding: 4 },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  settingLabel: { flex: 1, color: Colors.textSecondary, fontSize: FontSizes.sm },
  settingValue: {
    backgroundColor: 'rgba(46,204,113,0.1)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.xs,
  },
  settingValueText: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
});
