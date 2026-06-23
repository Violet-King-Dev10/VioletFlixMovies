// API Configuration
export const TMDB_CONFIG = {
  BASE_URL: 'https://api.themoviedb.org/3',
  IMAGE_BASE: 'https://image.tmdb.org/t/p',
  POSTER_SIZES: {
    small: 'w185',
    medium: 'w342',
    large: 'w500',
    original: 'original',
  },
  BACKDROP_SIZES: {
    small: 'w300',
    medium: 'w780',
    large: 'w1280',
    original: 'original',
  },
  // Public demo key - limited usage
  API_KEY: '4e44d9029b1270a757cddc766a1bcb63',
};

export const ANILIST_CONFIG = {
  BASE_URL: 'https://graphql.anilist.co',
};

export const TMDB_IMAGE = (path: string, size = 'w500') =>
  path ? `${TMDB_CONFIG.IMAGE_BASE}/${size}${path}` : null;

export const PLACEHOLDER_POSTER =
  'https://via.placeholder.com/300x450/111111/666666?text=No+Poster';
export const PLACEHOLDER_BACKDROP =
  'https://via.placeholder.com/1280x720/111111/666666?text=No+Backdrop';
