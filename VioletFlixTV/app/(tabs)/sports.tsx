import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, FontSizes, FontWeights, Radii, Spacing } from '@/constants/theme';
import {
  getSportsDetail, getSportsLeagues, getSportsList, getSportsMatches,
  type SportDetail, type SportLeague, type SportMatch,
} from '@/services/sportsService';

const AD_GUARD_SCRIPT = `
  window.open = function () { return null; };
  document.addEventListener('click', function (event) {
    var anchor = event.target && event.target.closest ? event.target.closest('a[target="_blank"]') : null;
    if (anchor) anchor.removeAttribute('target');
  }, true);
  true;
`;

export default function SportsScreen() {
  const insets = useSafeAreaInsets();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sports, setSports] = useState<string[]>([]);
  const [selectedSport, setSelectedSport] = useState('football');
  const [matches, setMatches] = useState<SportMatch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [leagues, setLeagues] = useState<SportLeague[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<SportMatch | null>(null);
  const [detail, setDetail] = useState<SportDetail | null>(null);
  const [activeStream, setActiveStream] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamOptions = useMemo(() => detail?.stream_urls || [], [detail]);

  const loadSports = useCallback(async () => {
    try {
      const [sportList, leagueList] = await Promise.all([getSportsList(), getSportsLeagues()]);
      setSports(sportList);
      setLeagues(leagueList);
    } catch {
      setSports(['football', 'basketball', 'tennis', 'cricket', 'hockey']);
      setLeagues([]);
    }
  }, []);

  const loadMatches = useCallback(async (category: string, query = searchQuery) => {
    setLoading(true);
    setError(null);
    try {
      const liveMatches = await getSportsMatches(category, query.trim());
      setMatches(liveMatches);
    } catch {
      setMatches([]);
      setError('Unable to load live sports right now. Try again in a moment.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadSports();
  }, [loadSports]);

  useEffect(() => {
    loadMatches(selectedSport);
  }, [loadMatches, selectedSport]);

  const openMatch = useCallback(async (match: SportMatch) => {
    setSelectedMatch(match);
    setDetail(null);
    setActiveStream(null);
    setDetailLoading(true);
    try {
      const nextDetail = await getSportsDetail(match.id, selectedSport);
      setDetail(nextDetail);
      setActiveStream(nextDetail.stream_urls?.[0]?.url || null);
    } catch {
      setError('Unable to load match streams right now.');
    } finally {
      setDetailLoading(false);
    }
  }, [selectedSport]);

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Open sports sidebar"
          style={({ pressed }) => [styles.menuIconButton, pressed && styles.pressed]}
          onPress={() => setSidebarOpen(true)}
        >
          <MaterialIcons name="menu" size={24} color={Colors.textPrimary} />
        </Pressable>
        <View style={styles.headerTextWrap}>
          <Text style={styles.headerTitle}>Sports</Text>
          <Text style={styles.headerSub}>Live matches, tables & streams</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh sports"
          style={({ pressed }) => [styles.refreshButton, pressed && styles.pressed]}
          onPress={() => loadMatches(selectedSport)}
        >
          <MaterialIcons name="refresh" size={20} color={Colors.textPrimary} />
        </Pressable>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sportChips}>
        {sports.map((sport) => {
          const active = sport.toLowerCase() === selectedSport.toLowerCase();
          return (
            <Pressable
              key={sport}
              style={({ pressed }) => [styles.sportChip, active && styles.sportChipActive, pressed && styles.pressed]}
              onPress={() => setSelectedSport(sport.toLowerCase())}
            >
              <MaterialIcons name={sport.toLowerCase() === 'football' ? 'sports-soccer' : 'sports'} size={16} color={active ? Colors.textInverse : Colors.textSecondary} />
              <Text style={[styles.sportChipText, active && styles.sportChipTextActive]}>{sport}</Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.searchWrap}>
        <MaterialIcons name="search" size={18} color={Colors.textMuted} />
        <TextInput
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search teams, leagues, WWE..."
          placeholderTextColor={Colors.textMuted}
          style={styles.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          onSubmitEditing={() => loadMatches(selectedSport, searchQuery)}
        />
        {searchQuery ? (
          <Pressable accessibilityLabel="Clear sports search" onPress={() => setSearchQuery('')}>
            <MaterialIcons name="close" size={18} color={Colors.textSecondary} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Live & Upcoming</Text>
          <Text style={styles.sectionMeta}>{searchQuery ? `search: ${searchQuery}` : `${matches.length} matches`}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingCard}><ActivityIndicator color={Colors.primary} /></View>
        ) : error ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="sports" size={34} color={Colors.textMuted} />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        ) : matches.length === 0 ? (
          <View style={styles.emptyCard}>
            <MaterialIcons name="event-busy" size={34} color={Colors.textMuted} />
            <Text style={styles.emptyText}>No matches found for {selectedSport}{searchQuery ? ` matching ${searchQuery}` : ''}.</Text>
          </View>
        ) : matches.map((match) => (
          <Pressable key={String(match.id)} style={({ pressed }) => [styles.matchCard, pressed && styles.pressed]} onPress={() => openMatch(match)}>
            <View style={styles.matchLeagueRow}>
              <Text style={styles.matchLeague}>{match.league}</Text>
              <View style={styles.statusWrap}>
                {match.ad_guard_safe ? <MaterialIcons name="verified-user" size={14} color={Colors.success} /> : null}
                <Text style={styles.matchStatus}>{match.status}{match.time ? ` • ${match.time}` : ''}</Text>
              </View>
            </View>
            <View style={styles.matchTeamsRow}>
              <View style={styles.teamColumn}>
                <Text style={styles.teamName}>{match.home}</Text>
                <Text style={styles.teamName}>{match.away}</Text>
              </View>
              <View style={styles.scoreColumn}>
                <Text style={styles.scoreText}>{match.score}</Text>
                {match.minute ? <Text style={styles.minuteText}>Minute {match.minute}</Text> : null}
              </View>
            </View>
          </Pressable>
        ))}

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Top Leagues</Text>
          <Text style={styles.sectionMeta}>tables</Text>
        </View>
        <View style={styles.leagueGrid}>
          {leagues.map((league) => (
            <View key={league.id} style={styles.leagueCard}>
              <Text style={styles.leagueName}>{league.name}</Text>
              <Text style={styles.leagueCountry}>{league.country}</Text>
            </View>
          ))}
        </View>
      </ScrollView>

      <Modal visible={sidebarOpen} transparent animationType="fade" onRequestClose={() => setSidebarOpen(false)}>
        <Pressable style={styles.sidebarBackdrop} onPress={() => setSidebarOpen(false)}>
          <View style={[styles.sidebar, { paddingTop: insets.top + Spacing.lg }]}> 
            <Pressable accessibilityLabel="Sports" style={styles.sidebarIconActive} onPress={() => setSidebarOpen(false)}>
              <MaterialIcons name="sports-soccer" size={26} color={Colors.textInverse} />
            </Pressable>
          </View>
        </Pressable>
      </Modal>

      <Modal visible={Boolean(selectedMatch)} animationType="slide" onRequestClose={() => setSelectedMatch(null)}>
        <View style={[styles.detailRoot, { paddingTop: insets.top }]}> 
          <View style={styles.detailHeader}>
            <Pressable style={styles.menuIconButton} onPress={() => setSelectedMatch(null)}>
              <MaterialIcons name="close" size={24} color={Colors.textPrimary} />
            </Pressable>
            <View style={styles.headerTextWrap}>
              <Text style={styles.detailTitle} numberOfLines={1}>{selectedMatch?.home} vs {selectedMatch?.away}</Text>
              <Text style={styles.headerSub}>{selectedMatch?.league}</Text>
            </View>
          </View>

          {detailLoading ? (
            <View style={styles.loadingCard}><ActivityIndicator color={Colors.primary} /></View>
          ) : (
            <>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.streamChips}>
                {streamOptions.map((stream) => (
                  <Pressable
                    key={stream.url}
                    style={({ pressed }) => [styles.streamChip, activeStream === stream.url && styles.streamChipActive, pressed && styles.pressed]}
                    onPress={() => setActiveStream(stream.url)}
                  >
                    <MaterialIcons name="live-tv" size={16} color={activeStream === stream.url ? Colors.textInverse : Colors.textSecondary} />
                    <Text style={[styles.streamChipText, activeStream === stream.url && styles.streamChipTextActive]}>{stream.name}</Text>
                  </Pressable>
                ))}
              </ScrollView>
              <View style={styles.playerShell}>
                {activeStream ? (
                  <WebView
                    source={{ uri: activeStream }}
                    style={styles.webview}
                    setSupportMultipleWindows={false}
                    javaScriptCanOpenWindowsAutomatically={false}
                    allowsFullscreenVideo
                    injectedJavaScriptBeforeContentLoaded={AD_GUARD_SCRIPT}
                    originWhitelist={['https://*']}
                  />
                ) : (
                  <View style={styles.emptyCard}>
                    <MaterialIcons name="block" size={34} color={Colors.textMuted} />
                    <Text style={styles.emptyText}>No stream is available for this match yet.</Text>
                  </View>
                )}
              </View>
              {detail?.download_url ? (
                <Text style={styles.adGuardNote}>Ad-Guard download proxy ready: {detail.download_url}</Text>
              ) : null}
              {detail?.live_score ? <Text style={styles.adGuardNote}>Live score: {detail.live_score}</Text> : null}
              <Text style={styles.adGuardNote}>{detail?.ad_guard?.note || 'Popup guard enabled: streams are kept in this player and new windows are blocked.'}</Text>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  headerTextWrap: { flex: 1 },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSizes.xxl, fontWeight: FontWeights.black },
  headerSub: { color: Colors.textMuted, fontSize: FontSizes.sm, marginTop: 2 },
  menuIconButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  refreshButton: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary },
  pressed: { opacity: 0.72 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginHorizontal: Spacing.md, marginTop: Spacing.xs, marginBottom: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: 10, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceCard },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.sm, padding: 0 },
  sportChips: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  sportChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceCard },
  sportChipActive: { backgroundColor: Colors.accent, borderColor: Colors.accent },
  sportChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textTransform: 'capitalize', fontWeight: FontWeights.medium },
  sportChipTextActive: { color: Colors.textInverse, fontWeight: FontWeights.bold },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm, marginTop: Spacing.sm },
  sectionTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  sectionMeta: { color: Colors.textMuted, fontSize: FontSizes.xs, textTransform: 'uppercase' },
  loadingCard: { minHeight: 150, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.surfaceCard, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border },
  emptyCard: { minHeight: 150, alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.lg, backgroundColor: Colors.surfaceCard, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border },
  emptyText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center' },
  matchCard: { padding: Spacing.md, marginBottom: Spacing.sm, borderRadius: Radii.lg, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceCard },
  matchLeagueRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.sm },
  matchLeague: { flex: 1, color: Colors.textMuted, fontSize: FontSizes.xs, textTransform: 'uppercase' },
  statusWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  matchStatus: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  matchTeamsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.md },
  teamColumn: { flex: 1, gap: 6 },
  teamName: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.semibold },
  scoreColumn: { alignItems: 'flex-end', gap: 2 },
  scoreText: { color: Colors.accent, fontSize: FontSizes.xl, fontWeight: FontWeights.black },
  minuteText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  leagueGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  leagueCard: { width: '48%', padding: Spacing.md, borderRadius: Radii.md, backgroundColor: Colors.surfaceCard, borderWidth: 1, borderColor: Colors.border },
  leagueName: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  leagueCountry: { color: Colors.textMuted, fontSize: FontSizes.xs, marginTop: 4 },
  sidebarBackdrop: { flex: 1, backgroundColor: Colors.overlay },
  sidebar: { width: 82, height: '100%', alignItems: 'center', backgroundColor: Colors.surface, borderRightWidth: 1, borderRightColor: Colors.border },
  sidebarIconActive: { width: 54, height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.accent },
  detailRoot: { flex: 1, backgroundColor: Colors.background },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingHorizontal: Spacing.md, paddingBottom: Spacing.sm },
  detailTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold },
  streamChips: { gap: Spacing.sm, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm },
  streamChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radii.full, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceCard },
  streamChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  streamChipText: { color: Colors.textSecondary, fontSize: FontSizes.sm, fontWeight: FontWeights.medium },
  streamChipTextActive: { color: Colors.textPrimary, fontWeight: FontWeights.bold },
  playerShell: { flex: 1, margin: Spacing.md, borderRadius: Radii.lg, overflow: 'hidden', borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceCard },
  webview: { flex: 1, backgroundColor: Colors.background },
  adGuardNote: { color: Colors.textMuted, fontSize: FontSizes.xs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.md, textAlign: 'center' },
});
