import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Spacing, Radii, FontSizes, FontWeights } from '@/constants/theme';
import { useAuth, useAlert } from '@/template';

type AuthMode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { signInWithPassword, signUpWithPassword, sendOTP, verifyOTPAndLogin, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) { showAlert('Missing fields', 'Please enter email and password'); return; }
    const { error } = await signInWithPassword(email, password);
    if (error) { showAlert('Login Failed', error); return; }
    router.replace('/(tabs)');
  };

  const handleSendOTP = async () => {
    if (!email) { showAlert('Email required', 'Please enter your email'); return; }
    if (password !== confirmPassword) { showAlert('Password mismatch', 'Passwords do not match'); return; }
    if (password.length < 6) { showAlert('Weak password', 'Password must be at least 6 characters'); return; }
    const { error } = await sendOTP(email);
    if (error) { showAlert('OTP Failed', error); return; }
    setOtpSent(true);
    setMode('otp');
    showAlert('OTP Sent', 'Check your email for the verification code');
  };

  const handleVerifyOTP = async () => {
    if (!otp) { showAlert('Enter OTP', 'Please enter the verification code'); return; }
    const { error } = await verifyOTPAndLogin(email, otp, { password });
    if (error) { showAlert('Verification Failed', error); return; }
    router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient
        colors={['#0a0a0a', '#1a0505', '#0a0a0a']}
        style={StyleSheet.absoluteFillObject}
      />
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo */}
        <View style={styles.logoWrap}>
          <MaterialIcons name="movie-filter" size={52} color={Colors.primary} />
          <Text style={styles.logo}>
            <Text style={styles.logoBrand}>VioletFlix</Text>
            <Text style={styles.logoAccent}>TV</Text>
          </Text>
          <Text style={styles.logoSub.*Movies, Anime & Series</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          {/* Mode Header */}
          <Text style={styles.cardTitle}>
            {mode === 'login' ? 'Sign In' : mode === 'register' ? 'Create Account' : 'Verify Email'}
          </Text>
          <Text style={styles.cardSub}>
            {mode === 'login' ? 'Welcome back to VioletFlixTV' : mode === 'register' ? 'Join millions of viewers' : `Code sent to ${email}`}
          </Text>

          {/* OTP mode */}
          {mode === 'otp' ? (
            <>
              <View style={styles.inputWrap}>
                <MaterialIcons name="vpn-key" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="4-digit verification code"
                  placeholderTextColor={Colors.textMuted}
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={4}
                  autoFocus
                />
              </View>
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={handleVerifyOTP}
                disabled={operationLoading}
              >
                {operationLoading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.primaryBtnText}>Verify & Create Account</Text>
                )}
              </Pressable>
              <Pressable onPress={() => setMode('register')} style={styles.linkBtn}>
                <Text style={styles.linkText}>Resend code</Text>
              </Pressable>
            </>
          ) : (
            <>
              {/* Email */}
              <View style={styles.inputWrap}>
                <MaterialIcons name="email" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Email address"
                  placeholderTextColor={Colors.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>

              {/* Password */}
              <View style={styles.inputWrap}>
                <MaterialIcons name="lock" size={20} color={Colors.textMuted} />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={Colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPass}
                />
                <Pressable onPress={() => setShowPass(s => !s)}>
                  <MaterialIcons name={showPass ? 'visibility-off' : 'visibility'} size={20} color={Colors.textMuted} />
                </Pressable>
              </View>

              {/* Confirm password for register */}
              {mode === 'register' ? (
                <View style={styles.inputWrap}>
                  <MaterialIcons name="lock-outline" size={20} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    placeholder="Confirm password"
                    placeholderTextColor={Colors.textMuted}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showPass}
                  />
                </View>
              ) : null}

              {/* Primary Action */}
              <Pressable
                style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                onPress={mode === 'login' ? handleLogin : handleSendOTP}
                disabled={operationLoading}
              >
                {operationLoading ? <ActivityIndicator color="#fff" /> : (
                  <Text style={styles.primaryBtnText}>
                    {mode === 'login' ? 'Sign In' : 'Send Verification Code'}
                  </Text>
                )}
              </Pressable>

              {/* Toggle mode */}
              <View style={styles.toggleRow}>
                <Text style={styles.toggleText}>
                  {mode === 'login' ? "Don't have an account?" : 'Already have an account?'}
                </Text>
                <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
                  <Text style={styles.toggleLink}>
                    {mode === 'login' ? ' Sign Up' : ' Sign In'}
                  </Text>
                </Pressable>
              </View>
            </>
          )}
        </View>

        {/* Skip */}
        <Pressable onPress={() => router.replace('/(tabs)')} style={styles.skipBtn}>
          <Text style={styles.skipText}>Continue without account</Text>
          <MaterialIcons name="arrow-forward" size={16} color={Colors.textMuted} />
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  scroll: { paddingHorizontal: Spacing.md },
  logoWrap: { alignItems: 'center', marginBottom: 40, gap: 8 },
  logo: { fontSize: FontSizes.hero },
  logoBrand: { color: Colors.textPrimary, fontWeight: FontWeights.black },
  logoAccent: { color: Colors.primary, fontWeight: FontWeights.black },
  logoSub: { color: Colors.textMuted, fontSize: FontSizes.sm },
  card: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radii.xl, padding: Spacing.lg,
    borderWidth: 1, borderColor: Colors.border, gap: 14,
  },
  cardTitle: { color: Colors.textPrimary, fontSize: FontSizes.xxl, fontWeight: FontWeights.black },
  cardSub: { color: Colors.textMuted, fontSize: FontSizes.sm, marginBottom: 4 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radii.md, paddingHorizontal: 14, paddingVertical: 13,
    borderWidth: 1, borderColor: Colors.border,
  },
  input: { flex: 1, color: Colors.textPrimary, fontSize: FontSizes.base },
  primaryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radii.md, paddingVertical: 14,
    alignItems: 'center', justifyContent: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: Colors.textPrimary, fontSize: FontSizes.md, fontWeight: FontWeights.bold },
  toggleRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 4 },
  toggleText: { color: Colors.textMuted, fontSize: FontSizes.sm },
  toggleLink: { color: Colors.primary, fontSize: FontSizes.sm, fontWeight: FontWeights.semibold },
  linkBtn: { alignItems: 'center' },
  linkText: { color: Colors.primary, fontSize: FontSizes.sm },
  skipBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    marginTop: 24, paddingVertical: 12,
  },
  skipText: { color: Colors.textMuted, fontSize: FontSizes.sm },
});
