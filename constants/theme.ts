// VioletFlixTV Design System
export const Colors = {
  // Base
  background: '#0a0a0a',
  surface: '#111111',
  surfaceElevated: '#1a1a1a',
  surfaceCard: '#161616',
  border: '#2a2a2a',
  borderSubtle: '#1e1e1e',

  // Brand
  primary: '#E50914',
  primaryDark: '#b0060f',
  primaryGlow: 'rgba(229, 9, 20, 0.2)',
  accent: '#FFD700',
  accentGlow: 'rgba(255, 215, 0, 0.15)',

  // Text
  textPrimary: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textMuted: '#666666',
  textInverse: '#0a0a0a',

  // Semantic
  success: '#2ECC71',
  warning: '#F39C12',
  info: '#3498DB',
  error: '#E50914',

  // Special
  overlay: 'rgba(0,0,0,0.7)',
  overlayLight: 'rgba(0,0,0,0.4)',
  overlayStrong: 'rgba(0,0,0,0.85)',
  frosted: 'rgba(26,26,26,0.9)',

  // Categories
  animeColor: '#FFD700',
  movieColor: '#E50914',
  seriesColor: '#3498DB',
  downloadColor: '#2ECC71',
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const Radii = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
};

export const FontSizes = {
  xs: 11,
  sm: 13,
  md: 15,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 30,
  hero: 36,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  black: '900' as const,
};

export const Shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  glow: {
    shadowColor: '#E50914',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  },
  hero: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 16,
  },
};
