"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { search, getImageUrl, type ArasaacSymbol } from "@/lib/arasaac";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const DEBOUNCE_MS = 300;
const RECENT_KEY = "arasaac-recent-searches";
const MAX_RECENT = 8;

// ---------------------------------------------------------------------------
// Recent searches helpers (localStorage)
// ---------------------------------------------------------------------------
function getRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
  } catch {
    return [];
  }
}

function addRecent(term: string) {
  const list = getRecent().filter((t) => t !== term);
  list.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, MAX_RECENT)));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function SymbolSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ArasaacSymbol[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load recent searches on mount
  useEffect(() => {
    setRecent(getRecent());
  }, []);

  const doSearch = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (!trimmed) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const data = await search(trimmed);
      setResults(data);
      addRecent(trimmed);
      setRecent(getRecent());
    } catch (err) {
      console.error("ARASAAC search failed:", err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounced input handler
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => doSearch(value), DEBOUNCE_MS);
  };

  const handleRecentClick = (term: string) => {
    setQuery(term);
    doSearch(term);
  };

  return (
    <div className="max-w-[960px] mx-auto px-4 py-6">
      {/* Search input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search 46,000+ symbols... e.g. happy, food, school"
          autoFocus
          className="w-full px-4 py-3.5 text-lg border-2 border-gray-300 rounded-xl outline-none font-[inherit] focus:border-[#E8610A] transition-colors"
        />
      </div>

      {/* Recent searches */}
      {!searched && recent.length > 0 && (
        <div className="mb-6">
          <p className="text-[13px] text-gray-400 mb-2">Recent searches</p>
          <div className="flex flex-wrap gap-2">
            {recent.map((term) => (
              <button
                key={term}
                onClick={() => handleRecentClick(term)}
                className="px-3.5 py-1.5 text-sm border border-gray-300 rounded-full bg-gray-100 cursor-pointer font-[inherit] hover:bg-gray-200 transition-colors"
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div className="text-center py-12">
          <div className="w-10 h-10 border-4 border-gray-200 border-t-indigo-500 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Searching ARASAAC...</p>
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <div className="text-center py-12">
          <p className="text-5xl mb-2">:/</p>
          <p className="text-gray-400 text-base">
            No symbols found for &ldquo;{query.trim()}&rdquo;
          </p>
          <p className="text-gray-300 text-[13px]">
            Try a simpler word like &ldquo;eat&rdquo;, &ldquo;happy&rdquo;, or
            &ldquo;school&rdquo;
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <>
          <p className="text-[13px] text-gray-400 mb-3">
            {results.length} symbol{results.length !== 1 ? "s" : ""} found
          </p>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-3">
            {results.map((sym) => (
              <div
                key={sym._id}
                className="border border-gray-200 rounded-xl p-3 text-center bg-white cursor-pointer transition-shadow hover:shadow-md"
              >
                <img
                  src={getImageUrl(sym._id)}
                  alt={sym.keywords[0]?.keyword || `Symbol ${sym._id}`}
                  loading="lazy"
                  className="w-full h-auto max-h-[120px] object-contain"
                />
                <p className="mt-2 text-[13px] font-medium text-gray-800 overflow-hidden text-ellipsis whitespace-nowrap">
                  {sym.keywords[0]?.keyword || `#${sym._id}`}
                </p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
