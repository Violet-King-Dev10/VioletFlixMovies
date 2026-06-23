import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, Pressable, Linking, Platform,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Radii, FontSizes, FontWeights } from '@/constants/theme';

const PWA_DISMISSED_KEY = 'vflixtv_pwa_dismissed';

export function PWAInstallBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const dismissed = localStorage.getItem(PWA_DISMISSED_KEY);
    const lastDismissed = dismissed ? Date.now() - parseInt(dismissed) : Infinity;

    const isInstalled = window.matchMedia?.('(display-mode: standalone)').matches;
    if (isInstalled) return;

    const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    const handler = (e: Event) => {
      e.preventDefault();
      (window as any).__vftvInstallPrompt = e;
      if (lastDismissed > 3 * 24 * 60 * 60 * 1000) setTimeout(() => setShow(true), 4000);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isIOS && lastDismissed > 3 * 24 * 60 * 60 * 1000) {
      setTimeout(() => setShow(true), 5000);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(PWA_DISMISSED_KEY, String(Date.now()));
    setShow(false);
  };

  const install = async () => {
    const prompt = (window as any).__vftvInstallPrompt;
    if (prompt?.prompt) {
      prompt.prompt();
      const { outcome } = await prompt.userChoice;
      if (outcome === 'accepted') { setShow(false); return; }
    }
    dismiss();
  };

  if (!show) return null;

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFillObject} onPress={dismiss} />
      <View style={styles.sheet}>
        <Pressable onPress={dismiss} style={styles.closeBtn}>
          <MaterialIcons name="close" size={16} color="#999" />
        </Pressable>

        <View style={styles.iconWrap}>
          <View style={styles.icon}>
            <Text style={styles.iconLetter}>V</Text>
          </View>
          <View style={styles.iconDot}>
            <View style={styles.iconDotInner} />
          </View>
        </View>

        <Text style={styles.title}>Get the VioletFlixTV App</Text>
        <Text style={styles.subtitle}>
          Faster streaming & smoother experience —{'\n'}install our app for the best viewing.
        </Text>

        <Pressable style={({ pressed }) => [styles.installBtn, pressed && { opacity: 0.85 }]} onPress={install}>
          <MaterialIcons name="download" size={20} color="#fff" />
          <Text style={styles.installBtnText}>Download App</Text>
        </Pressable>

        <Text style={styles.followLabel}>FOLLOW US</Text>
        <View style={styles.socialRow}>
          <Pressable
            style={[styles.socialBtn, styles.telegramBtn]}
            onPress={() => Linking.openURL('https://t.me/VIOLETCRASHERTECH1')}
          >
            <Text style={styles.socialIcon}>✈️</Text>
            <Text style={styles.telegramText}>Telegram</Text>
          </Pressable>
          <Pressable
            style={[styles.socialBtn, styles.whatsappBtn]}
            onPress={() => Linking.openURL('https://whatsapp.com/channel/0029VbBWaQyCxoAx2YLzfu0a')}
          >
            <Text style={styles.socialIcon}>💬</Text>
            <Text style={styles.whatsappText}>WhatsApp</Text>
          </Pressable>
        </View>

        <Pressable onPress={dismiss} style={styles.laterBtn}>
          <Text style={styles.laterText}>Maybe Later</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end', alignItems: 'center', zIndex: 900,
  },
  sheet: {
    width: '100%', maxWidth: 420,
    backgroundColor: '#0f1020',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 28, alignItems: 'center',
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: -20 },
    shadowOpacity: 0.4, shadowRadius: 40, elevation: 30,
  },
  closeBtn: {
    position: 'absolute', top: 14, right: 14,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  iconWrap: { position: 'relative', marginBottom: 20 },
  icon: {
    width: 80, height: 80, borderRadius: 22,
    backgroundColor: '#7c3aed',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.7, shadowRadius: 20, elevation: 16,
  },
  iconLetter: { color: '#fff', fontSize: 36, fontWeight: '900' },
  iconDot: {
    position: 'absolute', bottom: -2, right: -2,
    width: 20, height: 20, borderRadius: 10,
    backgroundColor: '#4ade80',
    borderWidth: 2, borderColor: '#0f1020',
    alignItems: 'center', justifyContent: 'center',
  },
  iconDotInner: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#86efac' },
  title: { color: '#fff', fontSize: FontSizes.xl, fontWeight: FontWeights.black, marginBottom: 8, textAlign: 'center' },
  subtitle: { color: '#888', fontSize: FontSizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  installBtn: {
    width: '100%', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: '#7c3aed', paddingVertical: 16, borderRadius: 18, marginBottom: 20,
    shadowColor: '#7c3aed', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5, shadowRadius: 12, elevation: 10,
  },
  installBtnText: { color: '#fff', fontSize: FontSizes.base, fontWeight: FontWeights.black },
  followLabel: { color: '#555', fontSize: 10, fontWeight: FontWeights.bold, letterSpacing: 2, marginBottom: 12 },
  socialRow: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 16 },
  socialBtn: {
    flex: 1, paddingVertical: 12, borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1,
  },
  telegramBtn: { backgroundColor: 'rgba(34,158,217,0.15)', borderColor: 'rgba(34,158,217,0.35)' },
  whatsappBtn: { backgroundColor: 'rgba(37,211,102,0.15)', borderColor: 'rgba(37,211,102,0.35)' },
  socialIcon: { fontSize: 16 },
  telegramText: { color: '#229ED9', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  whatsappText: { color: '#25D366', fontSize: FontSizes.sm, fontWeight: FontWeights.bold },
  laterBtn: { paddingVertical: 8 },
  laterText: { color: '#555', fontSize: FontSizes.sm },
});
