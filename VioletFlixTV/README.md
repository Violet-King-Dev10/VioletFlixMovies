# Welcome to violetflixtv

violetflixtv is a React Native and Expo streaming discovery app for movies, TV series, and anime, with cross-platform support for iOS, Android, and Web environments.

## Getting Started

### 1. Install Dependencies

```bash
npm install
# or
yarn install
```

### 2. Start the Project

- Start the development server (choose your platform):

```bash
npm run dev           # Start Expo development server
npm run start         # Serve the production web build from dist/
npm run android       # Launch Android emulator
npm run ios           # Launch iOS simulator
npm run web           # Start the Expo web development server
npm run build         # Export the production web build
```

- Reset the project (clear cache, etc.):

```bash
npm run reset-project
```

### 3. Lint the Code

```bash
npm run lint
```


## APK Download Protection

The production static server (`npm run start`) includes a lightweight guard for Android package files (`.apk` and `.aab`):

- Requests with missing or known scraper-style user agents are rejected before a package file is served.
- Package responses include `X-Robots-Tag: noindex, nofollow, noarchive, nosnippet` and `Cache-Control: private, no-store`.
- For stronger protection, set `APP_PACKAGE_DOWNLOAD_TOKEN` in production and only share download links that include `?download_token=<token>` or send the same value in the `X-Download-Token` header.

No server-side check can make a public APK impossible to copy once a real user downloads it. For sensitive builds, prefer private distribution channels, short-lived signed URLs, rate limiting at the CDN/WAF layer, and Android Play Integrity checks inside the app.

## Main Dependencies

- React Native: 0.79.4
- React: 19.0.0
- Expo: ~53.0.12
- Expo Router: ~5.1.0
- Supabase: ^2.50.0
- Other commonly used libraries:
  - @expo/vector-icons
  - react-native-paper
  - react-native-calendars
  - lottie-react-native
  - react-native-webview
  - and more

For a full list of dependencies, see [package.json](./package.json).

## Development Tools

- TypeScript: ~5.8.3
- ESLint: ^9.25.0
- @babel/core: ^7.25.2

## Contributing

1. Fork this repository
2. Create a new branch (`git checkout -b main`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/your-feature`)
5. Open a Pull Request

## License

This project is private ("private": true). For collaboration inquiries, please contact the author.

---

Feel free to add project screenshots, API documentation, feature descriptions, or any other information as needed.

## Browser Extension: VioletFlixTV Shield

This repo includes a Manifest V3 browser extension in [`browser-extension/`](./browser-extension) for reducing ads, trackers, popups, and cosmetic ad containers while browsing streaming pages.

### Features

- Popup window with quick controls to turn protection on/off, pause the current site, block ads, block trackers, block annoyances, block popups, enable cosmetic hiding, and use stricter video-page cleanup.
- EasyList-style network filtering powered by Chrome/Edge/Brave `declarativeNetRequest` dynamic rules.
- Built-in list sources include EasyList, EasyPrivacy, uBlock Badware, uBlock Privacy, uBlock Annoyances, Fanboy Annoyance/Social, and optional AdGuard Tracking Protection.
- Automatic filter refreshes once per day by default, plus a manual **Refresh lists** button.
- Advanced settings page for selecting lists, changing refresh interval, tuning the rule budget, and adding custom allow/block rules.

### Load it locally

1. Open `chrome://extensions`, `edge://extensions`, or `brave://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select the `browser-extension/` folder.
4. Pin **VioletFlixTV Shield** and use the popup to adjust blocking for the current site.

### Validate extension files

```bash
npm run extension:validate
```

The validator checks the Manifest V3 wiring, required extension assets, and JavaScript syntax.

## OmniSave Download Flow

Movie, TV, and anime direct downloads resolve through the local API proxy and OmniSave IDs:

- Search movies with `/api/search/movie?q=avengers` and use the returned `subject_id`.
- Search TV/anime with `/api/search/tv?q=naruto` and use the returned `subject_id`; this is an OmniSave subject ID, not a MAL ID.
- Download movies with `/api/download?subject_id=<subject_id>`.
- Download TV/anime episodes with `/api/download?subject_id=<subject_id>&season=1&episode=1`.

The frontend anime download button follows that TV/anime path by searching OmniSave TV results first, then requesting episode MP4 URLs from `/api/download`.
