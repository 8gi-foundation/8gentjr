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
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "24px 16px" }}>
      {/* Search input */}
      <div style={{ position: "relative", marginBottom: 16 }}>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="Search 46,000+ symbols... e.g. happy, food, school"
          autoFocus
          style={{
            width: "100%",
            padding: "14px 16px",
            fontSize: 18,
            border: "2px solid #ddd",
            borderRadius: 12,
            outline: "none",
            boxSizing: "border-box",
            fontFamily: "inherit",
          }}
        />
      </div>

      {/* Recent searches */}
      {!searched && recent.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 13, color: "#888", margin: "0 0 8px" }}>
            Recent searches
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recent.map((term) => (
              <button
                key={term}
                onClick={() => handleRecentClick(term)}
                style={{
                  padding: "6px 14px",
                  fontSize: 14,
                  border: "1px solid #ddd",
                  borderRadius: 20,
                  background: "#f5f5f5",
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                {term}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading spinner */}
      {loading && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "4px solid #eee",
              borderTop: "4px solid #6c63ff",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 12px",
            }}
          />
          <p style={{ color: "#888", fontSize: 14 }}>Searching ARASAAC...</p>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      )}

      {/* No results */}
      {searched && !loading && results.length === 0 && (
        <div style={{ textAlign: "center", padding: 48 }}>
          <p style={{ fontSize: 48, margin: "0 0 8px" }}>:/</p>
          <p style={{ color: "#888", fontSize: 16 }}>
            No symbols found for &ldquo;{query.trim()}&rdquo;
          </p>
          <p style={{ color: "#aaa", fontSize: 13 }}>
            Try a simpler word like &ldquo;eat&rdquo;, &ldquo;happy&rdquo;, or
            &ldquo;school&rdquo;
          </p>
        </div>
      )}

      {/* Results grid */}
      {!loading && results.length > 0 && (
        <>
          <p style={{ fontSize: 13, color: "#888", margin: "0 0 12px" }}>
            {results.length} symbol{results.length !== 1 ? "s" : ""} found
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 12,
            }}
          >
            {results.map((sym) => (
              <div
                key={sym._id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 12,
                  textAlign: "center",
                  background: "#fff",
                  transition: "box-shadow 0.15s",
                  cursor: "pointer",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow =
                    "0 2px 12px rgba(0,0,0,0.1)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "none")
                }
              >
                <img
                  src={getImageUrl(sym._id)}
                  alt={sym.keywords[0]?.keyword || `Symbol ${sym._id}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    maxHeight: 120,
                    objectFit: "contain",
                  }}
                />
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 13,
                    fontWeight: 500,
                    color: "#333",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
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
