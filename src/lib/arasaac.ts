// ---------------------------------------------------------------------------
// ARASAAC API client — search 46K+ pictographic symbols
// https://arasaac.org/developers/api
// ---------------------------------------------------------------------------

export interface ArasaacSymbol {
  /** Pictogram numeric ID */
  _id: number;
  /** Keyword entries with meaning and type info */
  keywords: Array<{
    keyword: string;
    type: number;
    meaning?: string;
    plural?: string;
  }>;
  /** Whether the symbol depicts violence */
  violence: boolean;
  /** Whether the symbol has sexual content */
  sex: boolean;
  /** Schema version */
  schpiVersion?: number;
  /** Categories the symbol belongs to */
  categories?: string[];
  /** Tags for additional classification */
  tags?: string[];
}

const BASE_URL = "https://api.arasaac.org/v1";
const STATIC_URL = "https://static.arasaac.org/pictograms";

// ---------------------------------------------------------------------------
// In-memory cache to avoid redundant API calls within a session
// ---------------------------------------------------------------------------
const cache = new Map<string, { data: ArasaacSymbol[]; ts: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Search ARASAAC pictograms by keyword (English).
 * Results are cached in memory for 5 minutes.
 */
export async function search(keyword: string): Promise<ArasaacSymbol[]> {
  const key = keyword.trim().toLowerCase();
  if (!key) return [];

  const cached = cache.get(key);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `${BASE_URL}/pictograms/en/search/${encodeURIComponent(key)}`;
  const res = await fetch(url);

  if (!res.ok) {
    // ARASAAC returns 404 when no results match
    if (res.status === 404) {
      cache.set(key, { data: [], ts: Date.now() });
      return [];
    }
    throw new Error(`ARASAAC API error: ${res.status} ${res.statusText}`);
  }

  const data: ArasaacSymbol[] = await res.json();
  cache.set(key, { data, ts: Date.now() });
  return data;
}

/**
 * Build the static image URL for a pictogram by ID.
 * Returns the 2500px PNG variant.
 */
export function getImageUrl(id: number): string {
  return `${STATIC_URL}/${id}/${id}_2500.png`;
}
