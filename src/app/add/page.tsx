'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useRef, useCallback, useEffect, Suspense } from 'react';

/**
 * Add Card — ARASAAC search + create card flow.
 * Simplified v1: ARASAAC symbol search + upload, no camera.
 * No Convex dependency — saves to localStorage for now.
 */

const PRIMARY = '#E8610A';

interface ArasaacSymbol {
  _id: number;
  keywords: { keyword: string }[];
}

interface SavedCard {
  id: string;
  label: string;
  imageUrl: string | null;
  arasaacId: number | null;
  category: string;
  createdAt: number;
}

function AddPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category') || 'general';

  const [label, setLabel] = useState('');
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [arasaacId, setArasaacId] = useState<number | null>(null);
  const [arasaacSearch, setArasaacSearch] = useState('');
  const [arasaacResults, setArasaacResults] = useState<ArasaacSymbol[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showArasaacSearch, setShowArasaacSearch] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ARASAAC search
  const searchArasaac = useCallback(async (query: string) => {
    if (!query.trim()) { setArasaacResults([]); return; }
    setIsSearching(true);
    try {
      const res = await fetch(`https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setArasaacResults(data.slice(0, 20));
      } else {
        setArasaacResults([]);
      }
    } catch {
      setArasaacResults([]);
    }
    setIsSearching(false);
  }, []);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (arasaacSearch) searchArasaac(arasaacSearch);
    }, 300);
    return () => clearTimeout(timer);
  }, [arasaacSearch, searchArasaac]);

  // File upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImageUrl(ev.target?.result as string);
        setArasaacId(null);
        setShowArasaacSearch(false);
      };
      reader.readAsDataURL(file);
    }
  };

  // Select ARASAAC symbol
  const selectSymbol = (symbolId: number) => {
    setImageUrl(`https://static.arasaac.org/pictograms/${symbolId}/${symbolId}_500.png`);
    setArasaacId(symbolId);
    setShowArasaacSearch(false);
  };

  // Save card to localStorage
  const handleSave = useCallback(() => {
    if (!label.trim() || isSaving) return;
    setIsSaving(true);

    const card: SavedCard = {
      id: crypto.randomUUID(),
      label: label.trim(),
      imageUrl,
      arasaacId,
      category,
      createdAt: Date.now(),
    };

    try {
      const existing = JSON.parse(localStorage.getItem('8gentjr-custom-cards') || '[]');
      existing.push(card);
      localStorage.setItem('8gentjr-custom-cards', JSON.stringify(existing));
      router.back();
    } catch (err) {
      console.error('[8gent Jr] Failed to save card:', err);
      setIsSaving(false);
    }
  }, [label, imageUrl, arasaacId, category, isSaving, router]);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#ECEFF1' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 relative" style={{ backgroundColor: PRIMARY }}>
        <button onClick={() => router.back()} className="flex items-center gap-0.5 text-white font-medium text-lg">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          <span>Cancel</span>
        </button>
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white font-semibold text-xl">
          Add Card
        </span>
        <button
          onClick={handleSave}
          disabled={!label.trim() || isSaving}
          className={`text-white font-medium text-lg ${(!label.trim() || isSaving) ? 'opacity-50' : ''}`}
        >
          {isSaving ? 'Saving...' : 'Save'}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
        {/* Category */}
        <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3">
          <span className="text-green-700 text-sm">Adding to: <strong>{category}</strong></span>
        </div>

        {/* Image Section */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-medium text-gray-900">Image</span>
          </div>

          <div className="p-4">
            <div className="w-32 h-32 mx-auto bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
              {imageUrl ? (
                <div className="relative w-full h-full">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="Preview" className="w-full h-full object-contain" />
                  <button
                    onClick={() => { setImageUrl(null); setArasaacId(null); }}
                    className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold"
                  >
                    X
                  </button>
                </div>
              ) : (
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              )}
            </div>
          </div>

          {/* Image source buttons */}
          <div className="px-4 pb-4 grid grid-cols-2 gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex flex-col items-center gap-1 py-3 bg-gray-100 rounded-lg active:bg-gray-200"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
              <span className="text-xs text-gray-600">Gallery</span>
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

            <button
              onClick={() => setShowArasaacSearch(!showArasaacSearch)}
              className={`flex flex-col items-center gap-1 py-3 rounded-lg active:bg-gray-200 ${showArasaacSearch ? 'bg-green-100' : 'bg-gray-100'}`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <span className="text-xs text-gray-600">Symbols</span>
            </button>
          </div>

          {/* ARASAAC search panel */}
          {showArasaacSearch && (
            <div className="px-4 pb-4 border-t border-gray-100">
              <div className="relative mt-3">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                  type="text"
                  value={arasaacSearch}
                  onChange={(e) => setArasaacSearch(e.target.value)}
                  placeholder="Search ARASAAC symbols..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500"
                />
              </div>

              {isSearching && <div className="text-center py-4 text-gray-500">Searching...</div>}

              {!isSearching && arasaacResults.length > 0 && (
                <div className="mt-3 grid grid-cols-4 gap-2 max-h-48 overflow-y-auto">
                  {arasaacResults.map((symbol) => (
                    <button
                      key={symbol._id}
                      onClick={() => selectSymbol(symbol._id)}
                      className="aspect-square bg-white border border-gray-200 rounded-lg overflow-hidden hover:border-green-500 active:border-green-600"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://static.arasaac.org/pictograms/${symbol._id}/${symbol._id}_300.png`}
                        alt={symbol.keywords[0]?.keyword || 'Symbol'}
                        className="w-full h-full object-contain p-1"
                      />
                    </button>
                  ))}
                </div>
              )}

              {!isSearching && arasaacSearch && arasaacResults.length === 0 && (
                <div className="text-center py-4 text-gray-500 text-sm">
                  No symbols found. Try a different search term.
                </div>
              )}

              <div className="mt-2 text-center text-xs text-gray-400">
                Symbols from ARASAAC (CC BY-NC-SA)
              </div>
            </div>
          )}
        </div>

        {/* Label */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <span className="font-medium text-gray-900">Label</span>
          </div>
          <div className="p-4">
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter word or phrase"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 text-lg"
              autoFocus
            />
            <p className="mt-2 text-sm text-gray-500">This is what will be spoken when tapped</p>
          </div>
        </div>

        {/* Preview */}
        {label && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="font-medium text-gray-900">Preview</span>
            </div>
            <div className="p-4 flex justify-center">
              <div className="w-24 bg-white rounded-md shadow-md flex flex-col items-center" style={{ aspectRatio: '1 / 1.1' }}>
                <div className="flex-1 w-full p-2 flex items-center justify-center">
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={imageUrl} alt={label} className="max-w-full max-h-full object-contain" />
                  ) : (
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ccc" strokeWidth="1.5">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  )}
                </div>
                <div className="w-full px-1 pb-2">
                  <span className="block text-center text-sm font-medium text-gray-900 truncate">{label}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom save button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!label.trim() || isSaving}
          className={`w-full py-4 rounded-lg font-semibold text-lg flex items-center justify-center gap-2 ${
            label.trim() && !isSaving ? 'text-white active:opacity-80' : 'bg-gray-200 text-gray-400'
          }`}
          style={label.trim() && !isSaving ? { backgroundColor: PRIMARY } : undefined}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          {isSaving ? 'Saving...' : 'Save Card'}
        </button>
      </div>
    </div>
  );
}

export default function AddPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#ECEFF1' }}>
          <div className="text-gray-500">Loading...</div>
        </div>
      }
    >
      <AddPageContent />
    </Suspense>
  );
}
