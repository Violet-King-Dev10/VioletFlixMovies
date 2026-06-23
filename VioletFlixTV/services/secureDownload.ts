import { Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { apiUrl } from './providers';

type SecureDownloadParams = {
  url: string;
  fileName: string;
};

function cleanFileName(fileName: string) {
  const cleaned = fileName
    .replace(/[^a-z0-9._ -]+/gi, '_')
    .replace(/_+/g, '_')
    .trim();
  return cleaned || 'video.mp4';
}

export function proxiedDownloadUrl(url: string, fileName: string) {
  return apiUrl('/api/download-file', {
    url,
    filename: cleanFileName(fileName),
  });
}

export async function triggerSecureDownload({ url, fileName }: SecureDownloadParams) {
  const safeFileName = cleanFileName(fileName);
  const downloadUrl = proxiedDownloadUrl(url, safeFileName);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const anchor = document.createElement('a');
    anchor.href = downloadUrl;
    anchor.download = safeFileName;
    anchor.target = '_self';
    anchor.rel = 'noopener noreferrer';
    anchor.addEventListener('click', (event) => event.stopPropagation());

    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return;
  }

  await WebBrowser.openBrowserAsync(downloadUrl);
}
