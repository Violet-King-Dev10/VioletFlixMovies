import React, { useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { useWatchlist } from '@/hooks/useWatchlist';
import { getSupabaseClient, useAlert, useAuth } from '@/template';
import { TMDB_IMAGE } from '@/constants/config';

type ProfileTab = 'watchlist' | 'history' | 'downloads';
const ADMIN_EMAIL = 'akewusholaabdulbakri101@gmail.com';

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user, logout } = useAuth();
  const { showAlert } = useAlert();
  const { watchlist, history, downloads, loading, cancelDownload, clearAllHistory } = useWatchlist();
  const [activeTab, setActiveTab] = useState<ProfileTab>('watchlist');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user) return;
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('user_profiles')
      .select('avatar_url, username')
      .eq('id', user.id)
      .maybeSingle();
    if (data) {
      setAvatarUrl(data.avatar_url);
      setNewUsername(data.username || '');
    } else {
      setAvatarUrl(null);
      setNewUsername(user.email?.split('@')[0] || '');
    }
  }, [user]);

  React.useEffect(() => {
    if (user) {
      loadProfile();
    }
  }, [loadProfile, user]);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { showAlert('Permission required', 'Camera roll permission is needed'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.8, base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!user) return;
    setUploadingAvatar(true);
    try {
      const supabase = getSupabaseClient();
      const contentType = asset.mimeType || 'image/jpeg';
      const extension = contentType.split('/')[1] || 'jpg';
      const fileName = `${user.id}/avatar-${Date.now()}.${extension}`;
      const response = await fetch(asset.uri);
      const arrayBuffer = await response.arrayBuffer();

      if (!arrayBuffer.byteLength) { showAlert('Error', 'Could not read image'); return; }

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, arrayBuffer, { contentType, upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);
      const { error: profileError } = await supabase.from('user_profiles').upsert({
        id: user.id,
        email: user.email,
        username: newUsername || user.email?.split('@')[0],
        avatar_url: publicUrl,
        updated_at: new Date().toISOString(),
      });
      if (profileError) throw profileError;

      setAvatarUrl(publicUrl);
      showAlert('Success', 'Profile picture updated');
    } catch (e: any) {
      showAlert('Upload Failed', e.message || 'Could not upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSaveUsername = async () => {
    if (!user || !newUsername.trim()) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('user_profiles').upsert({
      id: user.id,
      email: user.email,
      username: newUsername.trim(),
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      showAlert('Save Failed', error.message || 'Could not update username');
      return;
    }
    setEditingUsername(false);
    showAlert('Saved', 'Username updated');
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/login');
  };

  const navigateToItem = (mediaType: string, id: number) => {
    if (mediaType === 'movie') router.push(`/movie/${id}`);
    else if (mediaType === 'tv') router.push(`/tv/${id}`);
    else if (mediaType === 'anime') router.push(`/anime/${id}`);
  };

  const TABS: { key: ProfileTab; label: string; icon: string; count: number }[] = [
    { key: 'watchlist', label: 'Watchlist', icon: 'bookmark', count: watchlist.length },
    { key: 'history', label: 'History', icon: 'history', count: history.length },
    { key: 'downloads', label: 'Downloads', icon: 'download', count: downloads.length },
  ];

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Profile Header */}
      <View style={styles.profileHeader}>
        <Pressable style={styles.avatarWrap} onPress={handlePickAvatar} disabled={uploadingAvatar}>
          {uploadingAvatar ? (
            <ActivityIndicator color={Colors.primary} />
          ) : avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatarImg} contentFit="cover" />
          ) : (
            <MaterialIcons name="person" size={36} color={Colors.textMuted} />
          )}
          <View style={styles.avatarEdit}>
            <MaterialIcons name="camera-alt" size={12} color="#fff" />
          </View>
        </Pressable>
        <View style={styles.userDetails}>
          {editingUsername ? (
            <View style={styles.usernameEdit}>
              <TextInput
                style={styles.usernameInput}
                value={newUsername}
                onChangeText={setNewUsername}
                autoFocus
                onBlur={handleSaveUsername}
                onSubmitEditing={handleSaveUsername}
              />
              <Pressable onPress={handleSaveUsername}>
                <MaterialIcons name="check" size={18} color={Colors.success} />
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => user && setEditingUsername(true)} style={styles.usernameRow}>
              <Text style={styles.userName}>
                {user ? (newUsername || user.email?.split('@')[0]) : 'Guest User'}
              </Text>
              {user ? <MaterialIcons name="edit" size={14} color={Colors.textMuted} style={{ marginLeft: 6 }} /> : null}
            </Pressable>
          )}
          <Text style={styles.userEmail}>{user ? user.email : 'Sign in to sync your data'}</Text>
          {user && user.email === ADMIN_EMAIL ? (
            <Pressable onPress={() => router.push('/admin')} style={styles.adminBtn}>
              <MaterialIcons name="admin-panel-settings" size={14} color={Colors.primary} />
              <Text style={styles.adminBtnText}>VioletFlixTV Admin</Text>
            </Pressable>
          ) : null}
        </View>
        {user ? (
          <Pressable onPress={handleLogout} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={20} color={Colors.textMuted} />
          </Pressable>
        ) : (
          <Pressable onPress={() => router.push('/login')} style={styles.signInBtn}>
            <Text style={styles.signInText}>Sign In</Text>
          </Pressable>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{watchlist.length}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{history.length}</Text>
          <Text style={styles.statLabel}>Watched</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{downloads.filter(d => d.status === 'completed').length}</Text>
          <Text style={styles.statLabel}>Downloaded</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <MaterialIcons
              name={tab.icon as keyof typeof MaterialIcons.glyphMap}
              size={18}
              color={activeTab === tab.key ? Colors.primary : Colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}{tab.count > 0 ? ` (${tab.count})` : ''}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator size="large" color={Colors.primary} /></View>
      ) : (
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Watchlist */}
          {activeTab === 'watchlist' && (
            watchlist.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="bookmark-border" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyText}>Your watchlist is empty</Text>
                <Text style={styles.emptyHint}>{user ? 'Save movies and anime to watch later' : 'Sign in to sync your watchlist'}</Text>
              </View>
            ) : (
              watchlist.map(item => {
                const imageUri = item.posterUrl
                  ? (item.posterUrl.startsWith('http') ? item.posterUrl : TMDB_IMAGE(item.posterUrl, 'w185'))
                  : null;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}
                    onPress={() => navigateToItem(item.mediaType, item.mediaId)}
                  >
                    <View style={styles.itemPoster}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.posterImg} contentFit="cover" transition={200} />
                      ) : (
                        <View style={[styles.posterImg, styles.noPoster]}>
                          <MaterialIcons name="movie" size={20} color={Colors.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                      <View style={styles.itemMeta}>
                        <View style={[styles.typeTag, {
                          backgroundColor: item.mediaType === 'anime' ? Colors.animeColor : item.mediaType === 'tv' ? Colors.seriesColor : Colors.movieColor
                        }]}>
                          <Text style={[styles.typeText, item.mediaType === 'anime' && { color: Colors.textInverse }]}>{item.mediaType.toUpperCase()}</Text>
                        </View>
                        {item.year ? <Text style={styles.metaText}>{item.year}</Text> : null}
                        {item.rating > 0 ? (
                          <View style={styles.ratingRow}>
                            <MaterialIcons name="star" size={12} color={Colors.accent} />
                            <Text style={styles.ratingText}>{(item.rating / 10).toFixed(1)}</Text>
                          </View>
                        ) : null}
                      </View>
                    </View>
                  </Pressable>
                );
              })
            )
          )}

          {/* History */}
          {activeTab === 'history' && (
            history.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="history" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No watch history yet</Text>
                <Text style={styles.emptyHint}>Start watching to build your history</Text>
              </View>
            ) : (
              <>
                <Pressable style={styles.clearBtn} onPress={clearAllHistory}>
                  <MaterialIcons name="delete-outline" size={16} color={Colors.primary} />
                  <Text style={styles.clearText}>Clear History</Text>
                </Pressable>
                {history.map(item => {
                  const imageUri = item.posterUrl
                    ? (item.posterUrl.startsWith('http') ? item.posterUrl : TMDB_IMAGE(item.posterUrl, 'w185'))
                    : null;
                  return (
                    <Pressable
                      key={`${item.id}-${item.watchedAt}`}
                      style={({ pressed }) => [styles.listItem, pressed && { opacity: 0.7 }]}
                      onPress={() => navigateToItem(item.mediaType, item.mediaId)}
                    >
                      <View style={styles.itemPoster}>
                        {imageUri ? (
                          <Image source={{ uri: imageUri }} style={styles.posterImg} contentFit="cover" transition={200} />
                        ) : (
                          <View style={[styles.posterImg, styles.noPoster]}>
                            <MaterialIcons name="movie" size={20} color={Colors.textMuted} />
                          </View>
                        )}
                        {item.progress > 0 ? (
                          <View style={styles.progressBarWrap}>
                            <View style={[styles.progressBar, { width: `${item.progress}%` as any }]} />
                          </View>
                        ) : null}
                      </View>
                      <View style={styles.itemInfo}>
                        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
                        {item.episode ? <Text style={styles.episodeInfo}>Episode {item.episode}</Text> : null}
                        <Text style={styles.watchedTime}>{new Date(item.watchedAt).toLocaleDateString()}</Text>
                      </View>
                    </Pressable>
                  );
                })}
              </>
            )
          )}

          {/* Downloads */}
          {activeTab === 'downloads' && (
            downloads.length === 0 ? (
              <View style={styles.emptyWrap}>
                <MaterialIcons name="download" size={56} color={Colors.textMuted} />
                <Text style={styles.emptyText}>No downloads yet</Text>
                <Text style={styles.emptyHint}>Open download links when a source provides one</Text>
              </View>
            ) : (
              downloads.map(item => {
                const imageUri = item.posterUrl
                  ? (item.posterUrl.startsWith('http') ? item.posterUrl : TMDB_IMAGE(item.posterUrl, 'w185'))
                  : null;
                return (
                  <View key={item.id} style={styles.listItem}>
                    <View style={styles.itemPoster}>
                      {imageUri ? (
                        <Image source={{ uri: imageUri }} style={styles.posterImg} contentFit="cover" transition={200} />
                      ) : (
                        <View style={[styles.posterImg, styles.noPoster]}>
                          <MaterialIcons name="movie" size={20} color={Colors.textMuted} />
                        </View>
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                      {item.episodeName ? <Text style={styles.episodeInfo}>{item.episodeName}</Text> : null}
                      <View style={styles.downloadStatus}>
                        <View style={[styles.statusBadge, item.status === 'completed' ? styles.statusComplete : styles.statusFail]}>
                          <Text style={styles.statusText}>{item.status === 'completed' ? 'Link Ready' : 'Unavailable'}</Text>
                        </View>
                      </View>
                    </View>
                    <Pressable style={styles.cancelBtn} onPress={() => cancelDownload(item.id)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <MaterialIcons name="close" size={18} color={Colors.textMuted} />
                    </Pressable>
                  </View>
                );
              })
            )
          )}
          <View style={{ height: 32 }} />
          {/* Community Links */}
          <View style={communityStyles.section}>
            <Text style={communityStyles.sectionTitle}>Join Our Community</Text>
            <View style={communityStyles.linksRow}>
              <Pressable
                style={[communityStyles.linkBtn, { backgroundColor: 'rgba(0,136,204,0.12)', borderColor: 'rgba(0,136,204,0.3)' }]}
                onPress={() => require('expo-web-browser').openBrowserAsync('https://t.me/VIOLETCRASHERTECH1')}
              >
                <Text style={communityStyles.linkEmoji}>✈️</Text>
                <Text style={communityStyles.linkText}>Telegram Channel</Text>
              </Pressable>
              <Pressable
                style={[communityStyles.linkBtn, { backgroundColor: 'rgba(37,211,102,0.12)', borderColor: 'rgba(37,211,102,0.3)' }]}
                onPress={() => require('expo-web-browser').openBrowserAsync('https://whatsapp.com/channel/0029VbBWaQyCxoAx2YLzfu0a')}
              >
                <Text style={communityStyles.linkEmoji}>💬</Text>
                <Text style={communityStyles.linkText}>WhatsApp Channel</Text>
              </Pressable>
            </View>
          </View>
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </View>
  );
}

const communityStyles = {
  section: {
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: 'rgba(124,58,237,0.08)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,58,237,0.2)',
  },
  sectionTitle: {
    color: '#a0a0b0',
    fontSize: 11,
    fontWeight: '700' as const,
    letterSpacing: 1,
    marginBottom: 12,
    textTransform: 'uppercase' as const,
  },
  linksRow: {
    flexDirection: 'row' as const,
    gap: 10,
  },
  linkBtn: {
    flex: 1,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  linkEmoji: { fontSize: 16 },
  linkText: { color: '#ffffff', fontSize: 12, fontWeight: '600' as const },
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  profileHeader: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing.md,
    paddingHorizontal: Spacing.md, paddingBottom: Spacing.md,
  },
  avatarWrap: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surfaceElevated,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: Colors.border, overflow: 'hidden',
    position: 'relative',
  },
  avatarImg: { width: 64, height: 64 },
  avatarEdit: {
    position: 'absolute', bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center',
  },
  userDetails: { flex: 1 },
  usernameRow: { flexDirection: 'row', alignItems: 'center' },
  usernameEdit: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  usernameInput: {
    color: Colors.textPrimary, fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    borderBottomWidth: 1, borderBottomColor: Colors.primary,
    paddingVertical: 2, flex: 1,
  },
  userName: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  userEmail: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 2 },
  adminBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    marginTop: 4, alignSelf: 'flex-start',
    backgroundColor: 'rgba(229,9,20,0.1)', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: Radii.full, borderWidth: 1, borderColor: 'rgba(229,9,20,0.3)',
  },
  adminBtnText: { color: Colors.primary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  logoutBtn: { padding: 8 },
  signInBtn: {
    backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.md,
  },
  signInText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  statsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: Colors.surfaceCard, marginHorizontal: Spacing.md,
    borderRadius: Radii.lg, paddingVertical: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  statBox: { alignItems: 'center' },
  statValue: { color: Colors.textPrimary, fontSize: FontSizes.xxl, fontWeight: FontWeights.black },
  statLabel: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  tabs: { flexDirection: 'row', paddingHorizontal: Spacing.md, gap: 4, marginBottom: Spacing.md },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4,
    paddingVertical: 8, borderRadius: Radii.sm, borderWidth: 1, borderColor: Colors.border,
    backgroundColor: Colors.surfaceCard,
  },
  tabActive: { backgroundColor: 'rgba(229, 9, 20, 0.12)', borderColor: Colors.primary },
  tabText: { color: Colors.textMuted, fontSize: FontSizes.xs, fontWeight: FontWeights.medium },
  tabTextActive: { color: Colors.primary },
  content: { flex: 1, paddingHorizontal: Spacing.md },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80, gap: 8 },
  emptyText: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.semibold },
  emptyHint: { color: Colors.textMuted, fontSize: FontSizes.sm },
  clearBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    alignSelf: 'flex-end', marginBottom: Spacing.sm, padding: 4,
  },
  clearText: { color: Colors.primary, fontSize: FontSizes.sm },
  listItem: {
    flexDirection: 'row', gap: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.borderSubtle,
  },
  itemPoster: { width: 60, height: 90, position: 'relative' },
  posterImg: { width: 60, height: 90, borderRadius: Radii.sm },
  noPoster: { backgroundColor: Colors.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  itemInfo: { flex: 1, justifyContent: 'center' },
  itemTitle: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.semibold, marginBottom: 6 },
  itemMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  typeTag: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radii.xs },
  typeText: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  metaText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  ratingText: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  progressBarWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    height: 3, backgroundColor: Colors.border, borderRadius: 2,
  },
  progressBar: { height: 3, backgroundColor: Colors.primary, borderRadius: 2 },
  episodeInfo: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 4 },
  watchedTime: { color: Colors.textMuted, fontSize: FontSizes.xs },
  downloadStatus: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  dlProgressWrap: { flex: 1, height: 4, backgroundColor: Colors.border, borderRadius: 2 },
  dlProgress: { height: 4, backgroundColor: Colors.downloadColor, borderRadius: 2 },
  dlPercent: { color: Colors.downloadColor, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radii.xs },
  statusComplete: { backgroundColor: 'rgba(46,204,113,0.15)' },
  statusFail: { backgroundColor: 'rgba(229,9,20,0.15)' },
  statusText: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  cancelBtn: { justifyContent: 'center', paddingLeft: 8 },
});
