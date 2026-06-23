import React, { useEffect, useMemo, useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, Pressable, Platform, ActivityIndicator,
  Modal, FlatList, Alert,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, FontSizes, FontWeights, Radii } from '@/constants/theme';
import { getMovieDetails } from '@/services/tmdbService';
import { getFallbackStreamUrl, StreamType } from '@/services/streamService';
import { resolveStreamSource } from '@/services/streamResolver';
import { resolveDownloadSource } from '@/services/downloadResolver';
import { triggerSecureDownload } from '@/services/secureDownload';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useAlert } from '@/template';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function safeDecodeParam(value: string | undefined, fallback: string): string {
  if (!value) return fallback;
  try { return decodeURIComponent(value); } catch { return value; }
}

function isHlsUrl(url: string | null | undefined): boolean {
  return Boolean(url && /\.m3u8(?:[?#]|$)/i.test(url));
}

function isDirectVideoUrl(url: string | null | undefined): boolean {
  return Boolean(url && /\.(?:mp4|webm|ogg)(?:[?#]|$)/i.test(url));
}

// Blocked ad redirect domains
const AD_BLOCKED_DOMAINS = [
  'doubleclick.net', 'googlesyndication.com', 'adnxs.com', 'ads.', 'tracking.',
  'popads.net', 'popcash.net', 'trafficjunky.net', 'exoclick.com', 'juicyads.com',
  'tubecorporate.com', 'adsrvr.org', 'pubmatic.com', 'openx.net', 'rubiconproject.com',
  'adform.net', 'smartadserver.com', 'tidaltv.com', 'bsw.com', 'loopme.com',
  'undertone.com', 'spotxchange.com', 'liveintent.com', 'bidswitch.net',
];

const SPEED_OPTIONS = [
  { label: '0.25x', value: 0.25 },
  { label: '0.5x', value: 0.5 },
  { label: '0.75x', value: 0.75 },
  { label: 'Normal', value: 1 },
  { label: '1.25x', value: 1.25 },
  { label: '1.5x', value: 1.5 },
  { label: '1.75x', value: 1.75 },
  { label: '2x', value: 2 },
];

function getProgressKey(id: string, type: string, ep?: string, season?: string) {
  return `vflixtv_progress_${type}_${id}${season ? `_s${season}` : ''}${ep ? `_e${ep}` : ''}`;
}

export default function PlayerScreen() {
  const params = useLocalSearchParams<{
    id?: string | string[];
    type?: StreamType | StreamType[];
    ep?: string | string[];
    season?: string | string[];
    title?: string | string[];
    trailerKey?: string | string[];
    trailer?: string | string[];
    malId?: string | string[];
  }>();
  const id = firstParam(params.id) || '';
  const type = firstParam(params.type) || 'movie';
  const ep = firstParam(params.ep);
  const season = firstParam(params.season);
  const title = firstParam(params.title);
  const trailerKey = firstParam(params.trailerKey);
  const trailer = firstParam(params.trailer);
  const malId = firstParam(params.malId);
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { startDownload } = useWatchlist();
  const { showAlert } = useAlert();

  const [showControls, setShowControls] = useState(true);
  const [streamLoaded, setStreamLoaded] = useState(false);
  const [streamFailed, setStreamFailed] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [trailerVideoKey, setTrailerVideoKey] = useState<string | null>(trailerKey || null);
  const [playingTrailer, setPlayingTrailer] = useState(trailer === '1');
  const [resolvedPrimaryUrl, setResolvedPrimaryUrl] = useState<string | null>(null);
  const [resolvingStream, setResolvingStream] = useState(true);
  const [downloadingCurrent, setDownloadingCurrent] = useState(false);

  // New features state
  const [showSpeedMenu, setShowSpeedMenu] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [savedProgress, setSavedProgress] = useState<number>(0);
  const [showNextEpisode, setShowNextEpisode] = useState(false);
  const [nextEpCountdown, setNextEpCountdown] = useState(10);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressKey = getProgressKey(id, type, ep, season);

  const streamType = (type || 'movie') as StreamType;
  const decodedTitle = safeDecodeParam(title, 'VioletFlixTV Player');
  const episodeLabel = ep ? `Episode ${ep}` : null;
  const seasonLabel = season ? `Season ${season}` : null;
  const typeColor = streamType === 'anime' ? Colors.animeColor : streamType === 'tv' ? Colors.seriesColor : Colors.primary;

  const fallbackStreamUrl = useMemo(() => getFallbackStreamUrl({ id, type: streamType, season, episode: ep, malId }), [id, streamType, season, ep, malId]);
  const streamUrl = usingFallback ? fallbackStreamUrl : resolvedPrimaryUrl;
  const trailerUrl = trailerVideoKey ? `https://www.youtube.com/embed/${encodeURIComponent(trailerVideoKey)}?autoplay=1&playsinline=1&rel=0` : null;
  const playbackUrl = playingTrailer && trailerUrl ? trailerUrl : streamUrl;

  // Load saved progress
  useEffect(() => {
    AsyncStorage.getItem(progressKey).then(val => {
      if (val) {
        const prog = parseFloat(val);
        if (prog > 30) {
          setSavedProgress(prog);
          setShowResumeBanner(true);
        }
      }
    }).catch(() => {});
  }, [progressKey]);

  // Auto-save progress every 8 seconds via injected JS
  const progressSaveScript = `
    (function() {
      if (!window._vftvProgressInterval) {
        window._vftvProgressInterval = setInterval(function() {
          var v = document.querySelector('video');
          if (v && !v.paused && v.currentTime > 0) {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'progress', currentTime: v.currentTime, duration: v.duration
            }));
          }
        }, 8000);
        // Detect episode end
        var v = document.querySelector('video');
        if (v) {
          v.addEventListener('ended', function() {
            window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ended' }));
          });
        }
      }
    })();
    true;
  `;

  // Ads guard script - blocks redirects on non-anime movie content
  const adsGuardScript = streamType !== 'anime' ? `
    (function() {
      var _blocked = ${JSON.stringify(AD_BLOCKED_DOMAINS)};
      var _origOpen = window.open;
      window.open = function(url) {
        if (!url) return null;
        var blocked = _blocked.some(function(d) { return String(url).includes(d); });
        if (blocked) { console.log('[VioletFlixTV] Ad blocked:', url); return null; }
        return null; // Block all popup opens
      };
      // Block navigation redirects
      var _origAssign = window.location.assign.bind(window.location);
      Object.defineProperty(window, 'location', {
        get: function() { return window._safeloc || location; }
      });
      // Block addEventListener for unload/beforeunload ad redirects
      var _origAEL = document.addEventListener.bind(document);
      document.addEventListener = function(type, fn, opts) {
        if (type === 'visibilitychange' || type === 'blur') return;
        return _origAEL(type, fn, opts);
      };
    })();
    true;
  ` : '';

  const handleWebViewMessage = useCallback((event: any) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'progress') {
        AsyncStorage.setItem(progressKey, String(msg.currentTime)).catch(() => {});
      } else if (msg.type === 'ended') {
        if ((streamType === 'tv' || streamType === 'anime') && ep) {
          setShowNextEpisode(true);
          setNextEpCountdown(10);
        }
      }
    } catch {}
  }, [progressKey, streamType, ep]);

  // Next episode countdown
  useEffect(() => {
    if (!showNextEpisode) return;
    countdownRef.current = setInterval(() => {
      setNextEpCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current!);
          // Navigate to next episode
          const nextEp = String((parseInt(ep || '1') || 1) + 1);
          router.replace(`/player/${id}?type=${streamType}&ep=${nextEp}&season=${season || '1'}&title=${encodeURIComponent(decodedTitle)}`);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => { if (countdownRef.current) clearInterval(countdownRef.current); };
  }, [showNextEpisode]);

  useEffect(() => {
    let mounted = true;
    if (playingTrailer) {
      setResolvingStream(false);
      setStreamLoaded(false);
      setStreamFailed(false);
      return () => { mounted = false; };
    }

    setResolvingStream(true);
    setResolvedPrimaryUrl(null);
    setStreamLoaded(false);
    setStreamFailed(false);
    setUsingFallback(false);

    resolveStreamSource({ id, type: streamType, season, episode: ep, malId, title: decodedTitle })
      .then(source => {
        if (!mounted) return;
        const resolvedUrl = source?.url || null;
        setResolvedPrimaryUrl(resolvedUrl);
        if (Platform.OS === 'web' && isHlsUrl(resolvedUrl) && fallbackStreamUrl) {
          setUsingFallback(true);
        } else if (!resolvedUrl && fallbackStreamUrl) {
          setUsingFallback(true);
        } else if (!resolvedUrl) {
          setStreamFailed(true);
        }
      })
      .catch(() => {
        if (!mounted) return;
        if (fallbackStreamUrl) setUsingFallback(true);
        else setStreamFailed(true);
      })
      .finally(() => { if (mounted) setResolvingStream(false); });

    return () => { mounted = false; };
  }, [decodedTitle, ep, fallbackStreamUrl, id, malId, playingTrailer, season, streamType]);

  useEffect(() => {
    setStreamLoaded(false);
    setStreamFailed(false);
  }, [playbackUrl]);

  useEffect(() => {
    if (!playbackUrl) {
      if (!resolvingStream) setStreamFailed(true);
      return;
    }
    const timeoutMs = streamType === 'movie' || streamType === 'tv' ? 30000 : 15000;
    const timer = setTimeout(() => { if (!streamLoaded) setStreamFailed(true); }, timeoutMs);
    return () => clearTimeout(timer);
  }, [playbackUrl, resolvingStream, streamLoaded, streamType]);

  useEffect(() => {
    if (showControls) {
      const timer = setTimeout(() => setShowControls(false), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [showControls]);

  useEffect(() => {
    if (!trailerVideoKey && id && streamType === 'movie') {
      getMovieDetails(Number(id)).then(data => {
        const t = data.videos?.results?.find((v: any) => v.type === 'Trailer' && v.site === 'YouTube');
        if (t) setTrailerVideoKey(t.key);
      }).catch(() => {});
    }
  }, [id, streamType, trailerVideoKey]);

  const handleWatchTrailer = () => {
    if (!trailerVideoKey) return;
    setPlayingTrailer(true);
    setShowControls(true);
  };

  const handleOpenExternal = async () => {
    if (!playbackUrl) return;
    try { await WebBrowser.openBrowserAsync(playbackUrl); }
    catch { showAlert('Stream Error', 'Unable to open this stream externally right now.'); }
  };

  const handleDownloadCurrent = async () => {
    if (downloadingCurrent) return;
    setDownloadingCurrent(true);
    try {
      let sourceUrl: string | null = null;
      try {
        const source = await resolveDownloadSource({ id, type: streamType, title: decodedTitle, season, episode: ep, malId });
        sourceUrl = source?.url || null;
      } catch { sourceUrl = null; }

      await startDownload({
        id: `${streamType}-dl-${id}${season ? `-s${season}` : ''}${ep ? `-e${ep}` : ''}`,
        mediaId: Number(id) || 0,
        mediaType: streamType,
        title: decodedTitle,
        posterUrl: '',
        rating: 0,
        season: season ? Number(season) || undefined : undefined,
        episode: ep ? Number(ep) || undefined : undefined,
        episodeName: episodeLabel || undefined,
        size: sourceUrl ? 'Direct link' : 'Unavailable',
        status: sourceUrl ? 'completed' : 'failed',
        progress: sourceUrl ? 100 : 0,
        sourceUrl: sourceUrl || undefined,
      });

      if (sourceUrl) {
        await triggerSecureDownload({
          url: sourceUrl,
          fileName: `${decodedTitle}${episodeLabel ? ` ${episodeLabel}` : ''}.mp4`,
        });
      }

      showAlert(
        sourceUrl ? 'Download Started' : 'Download Unavailable',
        sourceUrl
          ? `Started download for ${episodeLabel ? `${decodedTitle} ${episodeLabel}` : decodedTitle}.`
          : 'No download source is available for this title yet.',
      );
    } catch {
      showAlert('Download Error', 'Unable to start the download. Please try again.');
    } finally {
      setDownloadingCurrent(false);
    }
  };

  const handleRetry = () => {
    if (playingTrailer) { setStreamLoaded(false); setStreamFailed(false); return; }
    if (!usingFallback && fallbackStreamUrl) setUsingFallback(true);
    else { setStreamLoaded(false); setStreamFailed(false); }
  };

  const handleResume = () => {
    setShowResumeBanner(false);
    // Inject seek via postMessage after load
  };

  const handleStartOver = () => {
    setSavedProgress(0);
    setShowResumeBanner(false);
    AsyncStorage.removeItem(progressKey).catch(() => {});
  };

  const speedScript = playbackSpeed !== 1 ? `
    (function() {
      var v = document.querySelector('video');
      if (v) v.playbackRate = ${playbackSpeed};
      var obs = new MutationObserver(function() {
        var vv = document.querySelector('video');
        if (vv) vv.playbackRate = ${playbackSpeed};
      });
      obs.observe(document.body, { childList: true, subtree: true });
    })(); true;
  ` : '';

  const renderWebPlayer = () => {
    if (!playbackUrl) return null;
    const injectedScript = [adsGuardScript, progressSaveScript, speedScript].filter(Boolean).join('\n');

    if (Platform.OS === 'web') {
      if (isDirectVideoUrl(playbackUrl)) {
        return React.createElement('video' as any, {
          src: playbackUrl, style: styles.webFrame, controls: true,
          autoPlay: true, playsInline: true, title: decodedTitle,
          onCanPlay: () => setStreamLoaded(true),
          onLoadedData: () => setStreamLoaded(true),
          onError: () => { if (!usingFallback && fallbackStreamUrl) setUsingFallback(true); else setStreamFailed(true); },
        });
      }
      return React.createElement('iframe' as any, {
        src: playbackUrl, style: styles.webFrame,
        allow: 'autoplay; fullscreen; encrypted-media; picture-in-picture',
        allowFullScreen: true, frameBorder: '0', title: decodedTitle,
        onLoad: () => setStreamLoaded(true),
        sandbox: streamType !== 'anime' ? 'allow-scripts allow-same-origin allow-forms allow-presentation allow-popups-to-escape-sandbox' : undefined,
      });
    }

    return (
      <WebView
        key={playbackUrl}
        source={{ uri: playbackUrl }}
        style={styles.video}
        allowsFullscreenVideo
        allowsInlineMediaPlayback
        javaScriptEnabled
        domStorageEnabled
        mediaPlaybackRequiresUserAction={false}
        mixedContentMode="always"
        originWhitelist={['*']}
        setSupportMultipleWindows={false}
        injectedJavaScript={injectedScript || undefined}
        onMessage={handleWebViewMessage}
        onShouldStartLoadWithRequest={(request) => {
          // Block ad redirects for non-anime movies
          if (streamType !== 'anime') {
            const blocked = AD_BLOCKED_DOMAINS.some(d => request.url.includes(d));
            if (blocked) return false;
            // Allow only main stream URLs - block popup navigations
            if (request.navigationType === 'other' && request.url !== playbackUrl && !request.url.includes(new URL(playbackUrl!).hostname)) {
              return false;
            }
          }
          return true;
        }}
        startInLoadingState
        onLoadEnd={() => setStreamLoaded(true)}
        onError={() => setStreamFailed(true)}
        onHttpError={() => setStreamFailed(true)}
        renderLoading={() => <PlayerLoading />}
      />
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" hidden={Platform.OS !== 'web'} />
      <Pressable style={styles.playerArea} onPress={() => setShowControls(c => !c)}>
        {renderWebPlayer()}

        {resolvingStream || (!streamLoaded && !streamFailed) ? <PlayerLoading /> : null}

        {/* Smart Resume Banner */}
        {showResumeBanner && !playingTrailer ? (
          <View style={styles.resumeBanner}>
            <MaterialIcons name="history" size={18} color={Colors.primary} />
            <Text style={styles.resumeText}>Resume watching?</Text>
            <Pressable style={styles.resumeBtn} onPress={handleResume}>
              <Text style={styles.resumeBtnText}>Resume</Text>
            </Pressable>
            <Pressable style={styles.resumeBtnSecondary} onPress={handleStartOver}>
              <Text style={styles.resumeBtnSecondaryText}>Start Over</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Next Episode Banner */}
        {showNextEpisode ? (
          <View style={styles.nextEpisodeBanner}>
            <Text style={styles.nextEpTitle}>Next Episode in {nextEpCountdown}s</Text>
            <View style={styles.nextEpActions}>
              <Pressable
                style={[styles.nextEpBtn, { backgroundColor: typeColor }]}
                onPress={() => {
                  clearInterval(countdownRef.current!);
                  const nextEp = String((parseInt(ep || '1') || 1) + 1);
                  router.replace(`/player/${id}?type=${streamType}&ep=${nextEp}&season=${season || '1'}&title=${encodeURIComponent(decodedTitle)}`);
                }}
              >
                <MaterialIcons name="skip-next" size={18} color="#fff" />
                <Text style={styles.nextEpBtnText}>Play Now</Text>
              </Pressable>
              <Pressable
                style={styles.nextEpCancelBtn}
                onPress={() => { clearInterval(countdownRef.current!); setShowNextEpisode(false); }}
              >
                <Text style={styles.nextEpCancelText}>Cancel</Text>
              </Pressable>
            </View>
          </View>
        ) : null}

        {streamFailed ? (
          <View style={styles.messageOverlay}>
            <MaterialIcons name="wifi-off" size={44} color={typeColor} />
            <Text style={styles.messageTitle}>Stream needs another source</Text>
            <Text style={styles.messageText}>
              {streamType === 'anime'
                ? 'The anime provider could not show this episode in time. Try the backup source or open externally.'
                : playingTrailer
                  ? 'The trailer did not start. You can retry or return to the movie.'
                  : 'The current provider did not start. Try backup or open externally.'}
            </Text>
            <View style={styles.messageActions}>
              {playingTrailer || fallbackStreamUrl || usingFallback ? (
                <Pressable style={[styles.messageBtn, { backgroundColor: typeColor }]} onPress={handleRetry}>
                  <Text style={styles.messageBtnText}>{playingTrailer || usingFallback ? 'Retry' : 'Use backup'}</Text>
                </Pressable>
              ) : null}
              {playbackUrl && !playingTrailer ? (
                <Pressable style={styles.messageSecondaryBtn} onPress={handleOpenExternal}>
                  <Text style={styles.messageSecondaryText}>Open externally</Text>
                </Pressable>
              ) : null}
            </View>
          </View>
        ) : null}

        {showControls ? (
          <View style={styles.controlsOverlay} pointerEvents="box-none">
            <View style={[styles.topControls, { paddingTop: insets.top || 16 }]}>
              <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backBtn}>
                <MaterialIcons name="arrow-back" size={24} color={Colors.textPrimary} />
              </Pressable>
              <View style={styles.titleArea}>
                <Text style={styles.ctrlTitle} numberOfLines={1}>{decodedTitle}</Text>
                <Text style={styles.ctrlSub} numberOfLines={1}>
                  {[seasonLabel, episodeLabel, playingTrailer ? 'Trailer' : usingFallback ? 'Backup source' : 'Primary source'].filter(Boolean).join(' · ')}
                </Text>
              </View>
              {trailerVideoKey ? (
                <Pressable onPress={playingTrailer ? () => setPlayingTrailer(false) : handleWatchTrailer} style={styles.trailerBtn}>
                  <MaterialIcons name={playingTrailer ? 'movie' : 'play-circle-outline'} size={16} color={Colors.accent} />
                  <Text style={styles.trailerBtnText}>{playingTrailer ? 'Movie' : 'Trailer'}</Text>
                </Pressable>
              ) : null}
              {!playingTrailer ? (
                <Pressable onPress={handleDownloadCurrent} style={[styles.externalBtn, styles.downloadBtn]} disabled={downloadingCurrent}>
                  <MaterialIcons name={downloadingCurrent ? 'sync' : 'download'} size={18} color={Colors.downloadColor} />
                </Pressable>
              ) : null}
              {!playingTrailer ? (
                <Pressable onPress={handleOpenExternal} style={styles.externalBtn}>
                  <MaterialIcons name="open-in-new" size={18} color={Colors.textPrimary} />
                </Pressable>
              ) : null}
            </View>

            <View style={styles.bottomControls}>
              {/* Speed control button */}
              <Pressable style={styles.speedBtn} onPress={() => setShowSpeedMenu(true)}>
                <MaterialIcons name="speed" size={16} color={Colors.textPrimary} />
                <Text style={styles.speedBtnText}>{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</Text>
              </Pressable>

              <View style={styles.streamBadge}>
                <MaterialIcons name={streamLoaded ? 'wifi' : 'sync'} size={13} color={typeColor} />
                <Text style={[styles.streamBadgeText, { color: typeColor }]}>
                  {streamLoaded ? 'STREAM READY' : 'CONNECTING'}
                </Text>
              </View>
            </View>
          </View>
        ) : null}
      </Pressable>

      {/* Speed Menu Modal */}
      <Modal visible={showSpeedMenu} transparent animationType="fade" onRequestClose={() => setShowSpeedMenu(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setShowSpeedMenu(false)}>
          <View style={styles.speedMenu}>
            <Text style={styles.speedMenuTitle}>Playback Speed</Text>
            {SPEED_OPTIONS.map(opt => (
              <Pressable
                key={opt.value}
                style={[styles.speedOption, playbackSpeed === opt.value && styles.speedOptionActive]}
                onPress={() => { setPlaybackSpeed(opt.value); setShowSpeedMenu(false); }}
              >
                <Text style={[styles.speedOptionText, playbackSpeed === opt.value && styles.speedOptionTextActive]}>
                  {opt.label}
                </Text>
                {playbackSpeed === opt.value && <MaterialIcons name="check" size={16} color={Colors.primary} />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

function PlayerLoading() {
  return (
    <View style={styles.loadingOverlay}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>Loading stream...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  playerArea: { flex: 1 },
  video: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000' },
  webFrame: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', borderWidth: 0, backgroundColor: '#000' } as any,
  loadingOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.82)',
  },
  loadingText: { color: Colors.textSecondary, fontSize: FontSizes.sm },
  messageOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 12,
    backgroundColor: 'rgba(0,0,0,0.88)', paddingHorizontal: 28,
  },
  messageTitle: { color: Colors.textPrimary, fontSize: FontSizes.lg, fontWeight: FontWeights.bold, textAlign: 'center' },
  messageText: { color: Colors.textSecondary, fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20 },
  messageActions: { flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap', justifyContent: 'center' },
  messageBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.md },
  messageBtnText: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  messageSecondaryBtn: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radii.md,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.24)',
  },
  messageSecondaryText: { color: Colors.textPrimary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  controlsOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.28)',
    justifyContent: 'space-between',
  },
  topControls: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, gap: 12 },
  backBtn: { padding: 4 },
  titleArea: { flex: 1 },
  ctrlTitle: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.semibold },
  ctrlSub: { color: Colors.textSecondary, fontSize: FontSizes.xs, marginTop: 2 },
  trailerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,215,0,0.15)', borderRadius: Radii.full,
    paddingHorizontal: 10, paddingVertical: 5,
    borderWidth: 1, borderColor: 'rgba(255,215,0,0.4)',
  },
  trailerBtnText: { color: Colors.accent, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  externalBtn: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center',
  },
  downloadBtn: { backgroundColor: 'rgba(46,204,113,0.16)', borderWidth: 1, borderColor: 'rgba(46,204,113,0.42)' },
  bottomControls: { paddingHorizontal: 20, paddingBottom: 24, flexDirection: 'row', alignItems: 'center', gap: 10 },
  speedBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: Radii.full,
  },
  speedBtnText: { color: Colors.textPrimary, fontSize: FontSizes.xs, fontWeight: FontWeights.semibold },
  streamBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.full,
  },
  streamBadgeText: { fontSize: FontSizes.xs, fontWeight: FontWeights.bold, letterSpacing: 1 },
  // Resume banner
  resumeBanner: {
    position: 'absolute', top: 80, left: 16, right: 16,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: 'rgba(0,0,0,0.85)', borderRadius: Radii.md,
    padding: 14, borderWidth: 1, borderColor: Colors.primary,
  },
  resumeText: { color: Colors.textPrimary, fontSize: FontSizes.sm, flex: 1 },
  resumeBtn: { backgroundColor: Colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radii.sm },
  resumeBtnText: { color: '#fff', fontSize: FontSizes.xs, fontWeight: FontWeights.bold },
  resumeBtnSecondary: { paddingHorizontal: 8, paddingVertical: 6 },
  resumeBtnSecondaryText: { color: Colors.textMuted, fontSize: FontSizes.xs },
  // Next episode
  nextEpisodeBanner: {
    position: 'absolute', bottom: 60, right: 16,
    backgroundColor: 'rgba(0,0,0,0.9)', borderRadius: Radii.md,
    padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
    minWidth: 200,
  },
  nextEpTitle: { color: Colors.textPrimary, fontSize: FontSizes.base, fontWeight: FontWeights.bold, marginBottom: 12 },
  nextEpActions: { flexDirection: 'row', gap: 8 },
  nextEpBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm },
  nextEpBtnText: { color: '#fff', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  nextEpCancelBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radii.sm, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  nextEpCancelText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  // Speed menu modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  speedMenu: {
    backgroundColor: Colors.surface || '#1a1a2e', borderRadius: Radii.lg,
    paddingVertical: 8, minWidth: 200,
    borderWidth: 1, borderColor: Colors.border,
  },
  speedMenuTitle: { color: Colors.textSecondary, fontSize: FontSizes.xs, fontWeight: FontWeights.bold, paddingHorizontal: 16, paddingVertical: 8, letterSpacing: 1 },
  speedOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  speedOptionActive: { backgroundColor: 'rgba(124,58,237,0.15)' },
  speedOptionText: { color: Colors.textPrimary, fontSize: FontSizes.base },
  speedOptionTextActive: { color: Colors.primary, fontWeight: FontWeights.bold },
});
