'use client';

/**
 * VoiceCardCreator — parent voice-to-AAC-card builder.
 *
 * Parent taps mic → speaks → card materialises in front of their eyes.
 * Sequence: idle → listening → processing → preview → saved
 *
 * Soft, careful, magical — deterministic output, animated reveal.
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { FITZGERALD_COLORS, type WordCategory } from '@/lib/fitzgerald-key';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Phase = 'idle' | 'listening' | 'processing' | 'preview' | 'saved' | 'error';

interface GeneratedCard {
  label: string;
  category: WordCategory;
  arasaacId: number | null;
  imageUrl: string | null;
  transcript: string;
}

interface VoiceCardCreatorProps {
  /** Called after the card is saved to localStorage */
  onSaved?: (card: GeneratedCard) => void;
  /** Render the floating trigger button inline (default true) */
  showTrigger?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function saveToLocalStorage(card: GeneratedCard) {
  try {
    const stored = JSON.parse(localStorage.getItem('8gentjr_custom_cards') || '[]');
    stored.unshift({ ...card, id: `custom-${Date.now()}`, createdAt: Date.now() });
    localStorage.setItem('8gentjr_custom_cards', JSON.stringify(stored.slice(0, 100)));
  } catch { /* noop — localStorage not available */ }
}

// ---------------------------------------------------------------------------
// Listening Ring — pulsing red circle during speech recognition
// ---------------------------------------------------------------------------

function ListeningRing({ transcript }: { transcript: string }) {
  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex items-center justify-center">
        {/* Outer pulse rings */}
        <div className="absolute w-32 h-32 rounded-full bg-red-500/20 animate-ping" style={{ animationDuration: '1.5s' }} />
        <div className="absolute w-24 h-24 rounded-full bg-red-500/30 animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.3s' }} />
        {/* Core mic circle */}
        <div className="relative w-20 h-20 rounded-full bg-red-500 shadow-[0_0_32px_8px_rgba(239,68,68,0.4)] flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="white" className="drop-shadow">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
            <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
      </div>

      <div className="text-center">
        <p className="text-white/50 text-sm font-medium tracking-widest uppercase mb-2">Listening</p>
        <p className="text-white text-lg font-semibold min-h-[28px] transition-all duration-200 max-w-[260px] text-center leading-snug">
          {transcript || <span className="text-white/30">Say a word or phrase...</span>}
        </p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Processing Skeleton — card shape building itself
// ---------------------------------------------------------------------------

function ProcessingSkeleton() {
  return (
    <div className="flex flex-col items-center gap-6">
      {/* Card skeleton */}
      <div className="w-44 h-52 rounded-3xl bg-white/8 border border-white/15 overflow-hidden relative flex flex-col items-center justify-end pb-4">
        {/* Shimmer sweep */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer" />
        </div>
        {/* Image placeholder */}
        <div className="absolute top-6 left-1/2 -translate-x-1/2 w-24 h-24 rounded-2xl bg-white/10 animate-pulse" />
        {/* Label placeholder */}
        <div className="w-24 h-4 rounded-full bg-white/15 animate-pulse" />
      </div>

      <p className="text-white/50 text-sm font-medium tracking-widest uppercase animate-pulse">
        Creating card...
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Card Preview — the magical reveal
// ---------------------------------------------------------------------------

function CardPreview({
  card,
  onSave,
  onRetry,
}: {
  card: GeneratedCard;
  onSave: () => void;
  onRetry: () => void;
}) {
  const [imgVisible, setImgVisible] = useState(false);
  const [labelVisible, setLabelVisible] = useState(false);
  const [buttonsVisible, setButtonsVisible] = useState(false);
  const colors = FITZGERALD_COLORS[card.category] ?? FITZGERALD_COLORS.noun;

  useEffect(() => {
    // Staggered reveal — image first, then label, then buttons
    const t1 = setTimeout(() => setImgVisible(true), 80);
    const t2 = setTimeout(() => setLabelVisible(true), 280);
    const t3 = setTimeout(() => setButtonsVisible(true), 480);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  return (
    <div className="flex flex-col items-center gap-6">
      {/* The card */}
      <div
        className="w-44 h-52 rounded-3xl shadow-2xl flex flex-col items-center justify-between py-5 px-3 border-4 relative overflow-hidden animate-card-appear"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {/* Category label — top-right chip */}
        <div
          className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide opacity-70"
          style={{ backgroundColor: colors.border, color: colors.bg === '#FFEB3B' ? '#000' : '#fff' }}
        >
          {colors.label}
        </div>

        {/* Pictogram */}
        <div
          className="flex-1 flex items-center justify-center transition-all duration-400 ease-out"
          style={{
            opacity: imgVisible ? 1 : 0,
            transform: imgVisible ? 'scale(1)' : 'scale(0.82)',
          }}
        >
          {card.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={card.imageUrl}
              alt={card.label}
              className="w-28 h-28 object-contain drop-shadow-sm"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center text-5xl opacity-60">
              📋
            </div>
          )}
        </div>

        {/* Label */}
        <p
          className="font-extrabold text-base text-center leading-tight transition-all duration-300 ease-out px-1"
          style={{
            color: colors.text,
            opacity: labelVisible ? 1 : 0,
            transform: labelVisible ? 'translateY(0)' : 'translateY(8px)',
          }}
        >
          {card.label}
        </p>
      </div>

      {/* Transcript echo */}
      {card.transcript && (
        <p
          className="text-white/40 text-xs text-center italic transition-opacity duration-500"
          style={{ opacity: labelVisible ? 1 : 0 }}
        >
          &ldquo;{card.transcript}&rdquo;
        </p>
      )}

      {/* Actions */}
      <div
        className="flex gap-3 transition-all duration-300 ease-out"
        style={{ opacity: buttonsVisible ? 1 : 0, transform: buttonsVisible ? 'translateY(0)' : 'translateY(6px)' }}
      >
        <button
          onClick={onRetry}
          className="px-5 py-3 rounded-2xl bg-white/10 text-white font-semibold text-sm hover:bg-white/20 active:scale-95 transition-all border border-white/20"
        >
          Try again
        </button>
        <button
          onClick={onSave}
          className="px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold text-sm shadow-lg shadow-emerald-500/30 active:scale-95 transition-all"
        >
          Add to My Words
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Saved confirmation
// ---------------------------------------------------------------------------

function SavedConfirmation({ card }: { card: GeneratedCard }) {
  const colors = FITZGERALD_COLORS[card.category] ?? FITZGERALD_COLORS.noun;
  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in">
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center border-4 shadow-xl"
        style={{ backgroundColor: colors.bg, borderColor: colors.border }}
      >
        {card.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={card.imageUrl} alt={card.label} className="w-14 h-14 object-contain" />
        ) : (
          <span className="text-3xl">📋</span>
        )}
      </div>
      <div className="text-center">
        <p className="text-emerald-400 font-bold text-lg">Added!</p>
        <p className="text-white/60 text-sm">{card.label} is now in My Words</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-5 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
        <span className="text-2xl">🎤</span>
      </div>
      <div>
        <p className="text-white font-semibold">{message}</p>
        <p className="text-white/40 text-sm mt-1">Voice recognition needs microphone permission</p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-3 rounded-2xl bg-white/10 text-white font-semibold border border-white/20 hover:bg-white/20 active:scale-95 transition-all"
      >
        Try again
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function VoiceCardCreator({ onSaved, showTrigger = true }: VoiceCardCreatorProps) {
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [transcript, setTranscript] = useState('');
  const [card, setCard] = useState<GeneratedCard | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  // Clean up recognition on unmount
  useEffect(() => {
    return () => { recognitionRef.current?.abort(); };
  }, []);

  const closeOverlay = useCallback(() => {
    recognitionRef.current?.abort();
    setOpen(false);
    // Reset phase after fade-out
    setTimeout(() => {
      setPhase('idle');
      setTranscript('');
      setCard(null);
      setErrorMsg('');
    }, 400);
  }, []);

  const generateCard = useCallback(async (text: string) => {
    setPhase('processing');
    try {
      const res = await fetch('/api/voice-card-create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ speech: text }),
      });
      if (!res.ok) throw new Error('API error');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCard(data as GeneratedCard);
      setPhase('preview');
    } catch {
      setErrorMsg("Couldn't create the card. Try again.");
      setPhase('error');
    }
  }, []);

  const startListening = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = typeof window !== 'undefined' ? (window as any) : null;
    const SR = w?.SpeechRecognition ?? w?.webkitSpeechRecognition ?? null;

    if (!SR) {
      setErrorMsg("Voice recognition isn't supported on this browser.");
      setPhase('error');
      return;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SR();
    recognition.lang = 'en-GB';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const t = Array.from(e.results as any[]).map((r: any) => r[0].transcript).join('');
      setTranscript(t);

      if (e.results[e.results.length - 1].isFinal) {
        recognition.stop();
        generateCard(t);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      if (e.error === 'no-speech') {
        setErrorMsg("I didn't catch that. Tap to try again.");
      } else if (e.error === 'not-allowed') {
        setErrorMsg('Microphone permission denied. Please allow access.');
      } else {
        setErrorMsg("Couldn't hear you. Try again.");
      }
      setPhase('error');
    };

    recognition.onend = () => {
      // If still listening (no result) → transition to processing with current transcript
      setPhase((current) => {
        if (current === 'listening' && transcript) {
          generateCard(transcript);
          return 'processing';
        }
        return current;
      });
    };

    recognitionRef.current = recognition;
    recognition.start();
    setTranscript('');
    setPhase('listening');
  }, [generateCard, transcript]);

  const handleSave = useCallback(() => {
    if (!card) return;
    saveToLocalStorage(card);
    onSaved?.(card);
    setPhase('saved');
    setTimeout(() => closeOverlay(), 1800);
  }, [card, onSaved, closeOverlay]);

  const handleOpen = useCallback(() => {
    setOpen(true);
    setPhase('idle');
    // Auto-start listening immediately
    requestAnimationFrame(() => startListening());
  }, [startListening]);

  return (
    <>
      {/* Floating trigger */}
      {showTrigger && (
        <button
          onClick={handleOpen}
          className="fixed bottom-28 left-4 z-30 w-12 h-12 rounded-full bg-gray-800/80 backdrop-blur-md border border-white/10 text-white/60 hover:text-white hover:bg-gray-700/90 hover:border-white/20 active:scale-90 transition-all shadow-lg flex items-center justify-center"
          aria-label="Create a new word card by voice"
          title="Create card by voice"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
            <line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      )}

      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{
            background: 'rgba(10, 10, 20, 0.82)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            animation: 'overlayIn 0.35s ease-out',
          }}
        >
          {/* Close button */}
          <button
            onClick={closeOverlay}
            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white/60 hover:text-white hover:bg-white/20 flex items-center justify-center transition-all active:scale-90"
            aria-label="Close"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Header */}
          <div className="absolute top-6 left-0 right-0 flex justify-center">
            <div className="text-center">
              <p className="text-white/40 text-xs font-semibold uppercase tracking-widest">
                {phase === 'listening' ? 'Parent voice mode' :
                 phase === 'processing' ? 'Building your card' :
                 phase === 'preview' ? 'Here\'s your card' :
                 phase === 'saved' ? 'Word added' :
                 'Create a word card'}
              </p>
            </div>
          </div>

          {/* Content */}
          <div className="flex flex-col items-center px-8 w-full max-w-sm">
            {phase === 'idle' && (
              <div className="flex flex-col items-center gap-6">
                <button
                  onClick={startListening}
                  className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-400 shadow-[0_0_32px_8px_rgba(239,68,68,0.35)] flex items-center justify-center active:scale-90 transition-all"
                >
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round"/>
                    <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                    <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <p className="text-white/50 text-sm text-center leading-relaxed max-w-[240px]">
                  Say something like:<br/>
                  <span className="text-white/80 italic">&ldquo;make a card for swimming&rdquo;</span><br/>
                  <span className="text-white/80 italic">&ldquo;add dinosaur&rdquo;</span>
                </p>
              </div>
            )}

            {phase === 'listening' && <ListeningRing transcript={transcript} />}
            {phase === 'processing' && <ProcessingSkeleton />}
            {phase === 'preview' && card && (
              <CardPreview
                card={card}
                onSave={handleSave}
                onRetry={() => { setCard(null); startListening(); }}
              />
            )}
            {phase === 'saved' && card && <SavedConfirmation card={card} />}
            {phase === 'error' && (
              <ErrorState
                message={errorMsg}
                onRetry={() => { setErrorMsg(''); startListening(); }}
              />
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes overlayIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cardAppear {
          0%  { opacity: 0; transform: scale(0.88) translateY(12px); }
          60% { transform: scale(1.03) translateY(-2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes shimmer {
          0%   { transform: translateX(-200%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-card-appear {
          animation: cardAppear 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .animate-shimmer {
          animation: shimmer 1.6s ease-in-out infinite;
        }
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out forwards;
        }
      `}</style>
    </>
  );
}
