export type FoodImageCandidate = {
  id: string;
  url: string;
  source: 'wikimedia-commons';
  sourcePageUrl: string;
  license: string;
  attribution: string;
  width?: number;
  height?: number;
};

type WikimediaImageInfo = {
  url?: string;
  thumburl?: string;
  thumbwidth?: number;
  thumbheight?: number;
  descriptionurl?: string;
  mime?: string;
  extmetadata?: {
    LicenseShortName?: { value?: string };
    Artist?: { value?: string };
    Credit?: { value?: string };
  };
};

type WikimediaPage = {
  pageid?: number;
  title?: string;
  imageinfo?: WikimediaImageInfo[];
};

type WikimediaResponse = {
  query?: {
    pages?: Record<string, WikimediaPage>;
  };
};

export type FoodImageSearchProvider = {
  id: FoodImageCandidate['source'];
  search: (query: string, limit: number) => Promise<FoodImageCandidate[]>;
};

const WIKIMEDIA_API = 'https://commons.wikimedia.org/w/api.php';

const cleanMetadataText = (value?: string) =>
  String(value ?? '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

const searchWikimedia = async (
  query: string,
  limit: number
): Promise<FoodImageCandidate[]> => {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    origin: '*',
    generator: 'search',
    gsrsearch: query,
    gsrnamespace: '6',
    gsrlimit: String(Math.min(Math.max(limit * 2, 6), 24)),
    prop: 'imageinfo',
    iiprop: 'url|mime|extmetadata',
    iiurlwidth: '720'
  });

  const response = await fetch(WIKIMEDIA_API + '?' + params.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Wikimedia image search failed: HTTP ' + response.status);
  }

  const payload = (await response.json()) as WikimediaResponse;
  const pages = Object.values(payload.query?.pages ?? {});

  return pages
    .map((page): FoodImageCandidate | null => {
      const info = page.imageinfo?.[0];
      if (!info) return null;

      const mime = String(info.mime ?? '');
      if (mime && !mime.startsWith('image/')) return null;

      const url = info.thumburl || info.url;
      if (!url) return null;

      const attribution =
        cleanMetadataText(info.extmetadata?.Artist?.value) ||
        cleanMetadataText(info.extmetadata?.Credit?.value) ||
        'Wikimedia Commons contributor';

      return {
        id: String(page.pageid ?? page.title ?? url),
        url,
        source: 'wikimedia-commons' as const,
        sourcePageUrl: info.descriptionurl || url,
        license: cleanMetadataText(info.extmetadata?.LicenseShortName?.value) || 'See source',
        attribution,
        width: info.thumbwidth,
        height: info.thumbheight
      };
    })
    .filter((item): item is FoodImageCandidate => item !== null);
};

const providers: FoodImageSearchProvider[] = [
  {
    id: 'wikimedia-commons',
    search: searchWikimedia
  }
];

export const searchFoodImages = async (
  foodName: string,
  limit = 6
): Promise<FoodImageCandidate[]> => {
  const query = foodName.trim();
  if (!query) return [];

  const safeLimit = Math.min(Math.max(Math.round(limit), 1), 12);
  const unique = new Map<string, FoodImageCandidate>();

  const queries = [
    query,
    query + ' Vietnamese food'
  ];

  for (const provider of providers) {
    for (const candidateQuery of queries) {
      try {
        const results = await provider.search(candidateQuery, safeLimit);
        results.forEach(item => {
          if (!unique.has(item.url)) unique.set(item.url, item);
        });
        if (unique.size >= safeLimit) break;
      } catch (error) {
        console.warn('[images] Provider ' + provider.id + ' unavailable', error);
      }
    }

    if (unique.size >= safeLimit) break;
  }

  return Array.from(unique.values()).slice(0, safeLimit);
};
