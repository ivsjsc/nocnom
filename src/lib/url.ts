export const getSafeExternalUrl = (value?: string) => {
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
};

const ensureHttpScheme = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('//')) return 'https:' + trimmed;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  if (/^(?:www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:[/:?#]|$)/i.test(trimmed)) {
    return 'https://' + trimmed;
  }

  return trimmed;
};

const googleDriveFileId = (url: URL) => {
  const pathMatch = url.pathname.match(/\/file\/d\/([^/]+)/i);
  if (pathMatch?.[1]) return pathMatch[1];

  return url.searchParams.get('id');
};

const githubRawUrl = (url: URL) => {
  if (url.hostname !== 'github.com') return null;

  const parts = url.pathname.split('/').filter(Boolean);
  const blobIndex = parts.indexOf('blob');
  if (blobIndex !== 2 || parts.length < 5) return null;

  const [owner, repository] = parts;
  const ref = parts[3];
  const filePath = parts.slice(4).join('/');

  return `https://raw.githubusercontent.com/${owner}/${repository}/${ref}/${filePath}`;
};

const dropboxRawUrl = (url: URL) => {
  if (!/(^|\.)dropbox\.com$/i.test(url.hostname)) return null;

  const raw = new URL(url.toString());
  raw.hostname = 'dl.dropboxusercontent.com';
  raw.searchParams.delete('dl');
  raw.searchParams.delete('raw');
  return raw.toString();
};

/**
 * Normalizes a user supplied image URL without proxying it through our app.
 * This handles common share-link formats that are not directly renderable by <img>.
 */
export const normalizeExternalImageUrl = (value?: string) => {
  if (!value) return null;

  const withScheme = ensureHttpScheme(value);
  try {
    const url = new URL(withScheme);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null;

    const github = githubRawUrl(url);
    if (github) return github;

    const dropbox = dropboxRawUrl(url);
    if (dropbox) return dropbox;

    if (url.hostname === 'drive.google.com') {
      const id = googleDriveFileId(url);
      if (id) {
        return `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1200`;
      }
    }

    return url.toString();
  } catch {
    return null;
  }
};

/**
 * Returns fallback candidates for hosts that expose more than one direct-image URL.
 * DishImage will try these sequentially on load failure.
 */
export const getExternalImageCandidates = (value?: string) => {
  const normalized = normalizeExternalImageUrl(value);
  if (!normalized) return [];

  const candidates = [normalized];

  try {
    const source = new URL(ensureHttpScheme(value ?? ''));

    if (source.hostname === 'drive.google.com') {
      const id = googleDriveFileId(source);
      if (id) {
        candidates.push(
          `https://drive.google.com/uc?export=view&id=${encodeURIComponent(id)}`
        );
      }
    }
  } catch {
    // normalizeExternalImageUrl already determines validity.
  }

  return [...new Set(candidates)];
};
