'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

/* ── Types ───────────────────────────────────────────────── */

interface GenerateResponse {
  taskId?: string;
  audioUrl?: string;
  title?: string;
  lyrics?: string;
  duration?: number;
  error?: string;
}

interface StatusResponse {
  status: 'complete' | 'processing' | 'failed';
  audioUrl?: string;
  streamUrl?: string;
  title?: string;
  duration?: number;
  error?: string;
  sunoStatus?: string;
}

type Phase = 'idle' | 'generating' | 'polling' | 'ready' | 'error';

/* ── Suggested prompts for kids ──────────────────────────── */

const SUGGESTIONS = [
  'A happy song about going to the park',
  'A silly song about a dancing dinosaur',
  'A bedtime song about the moon and stars',
  'A fun song about eating ice cream',
  'A brave song about being a superhero',
];

/* ── Component ───────────────────────────────────────────── */

export default function SongCreator() {
  const [prompt, setPrompt] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [songTitle, setSongTitle] = useState('');
  const [songLyrics, setSongLyrics] = useState('');
  const [audioUrl, setAudioUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [pollCount, setPollCount] = useState(0);

  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  /* ── Poll for song status ──────────────────────────────── */

  const pollStatus = useCallback(
    async (taskId: string, attempt: number) => {
      if (attempt > 60) {
        setPhase('error');
        setErrorMsg('Song is taking too long. Please try again.');
        return;
      }

      try {
        const res = await fetch(`/api/song-status?taskId=${encodeURIComponent(taskId)}`);
        const data: StatusResponse = await res.json();

        if (data.status === 'complete' && data.audioUrl) {
          setAudioUrl(data.audioUrl);
          const title = data.title || 'My Song';
          setSongTitle(title);
          // Persist to localStorage so the player tab can show it
          try {
            const saved = JSON.parse(localStorage.getItem('8gentjr_songs') || '[]');
            saved.unshift({ id: Date.now().toString(), title, audioUrl: data.audioUrl, createdAt: Date.now() });
            localStorage.setItem('8gentjr_songs', JSON.stringify(saved.slice(0, 50)));
          } catch { /* localStorage unavailable */ }
          setPhase('ready');
          return;
        }

        if (data.status === 'failed') {
          setPhase('error');
          setErrorMsg('Song generation failed. Try a different prompt!');
          return;
        }

        // Still processing — poll again
        setPollCount(attempt);
        pollTimerRef.current = setTimeout(() => pollStatus(taskId, attempt + 1), 3000);
      } catch {
        setPhase('error');
        setErrorMsg('Connection error. Please try again.');
      }
    },
    [],
  );

  /* ── Submit song request ───────────────────────────────── */

  const handleCreate = async () => {
    if (!prompt.trim()) return;

    setPhase('generating');
    setErrorMsg('');
    setAudioUrl('');
    setSongTitle('');
    setSongLyrics('');
    setPollCount(0);

    try {
      const res = await fetch('/api/generate-song', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sentences: [prompt.trim()] }),
      });

      const data: GenerateResponse = await res.json();

      if (data.error) {
        setPhase('error');
        setErrorMsg(data.error || 'Could not create song. Try again!');
        return;
      }

      if (data.title) setSongTitle(data.title);
      if (data.lyrics) setSongLyrics(data.lyrics);

      // Path A: polling-based (Suno)
      if (data.taskId) {
        setPhase('polling');
        pollStatus(data.taskId, 1);
        return;
      }

      // Path B: direct audio (ElevenLabs fallback)
      if (data.audioUrl) {
        const title = data.title || prompt.trim().slice(0, 40) || 'My Song';
        setAudioUrl(data.audioUrl);
        setSongTitle(title);
        try {
          const saved = JSON.parse(localStorage.getItem('8gentjr_songs') || '[]');
          saved.unshift({ id: Date.now().toString(), title, audioUrl: data.audioUrl, createdAt: Date.now() });
          localStorage.setItem('8gentjr_songs', JSON.stringify(saved.slice(0, 50)));
        } catch { /* localStorage unavailable */ }
        setPhase('ready');
        return;
      }

      setPhase('error');
      setErrorMsg('Unexpected response. Try again!');
    } catch {
      setPhase('error');
      setErrorMsg('Connection error. Please try again.');
    }
  };

  /* ── Reset ─────────────────────────────────────────────── */

  const handleReset = () => {
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    setPhase('idle');
    setPrompt('');
    setAudioUrl('');
    setSongTitle('');
    setSongLyrics('');
    setErrorMsg('');
    setPollCount(0);
  };

  /* ── Render ────────────────────────────────────────────── */

  return (
    <div className="w-full max-w-md px-4 flex flex-col gap-4">
      {/* Prompt input (idle or error) */}
      {(phase === 'idle' || phase === 'error') && (
        <>
          <label className="text-[15px] font-semibold text-[#1a1a2e]">
            What should the song be about?
          </label>

          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="A fun song about..."
            rows={3}
            maxLength={300}
            className="w-full px-4 py-3 rounded-xl border-2 border-[#f0e6d6] bg-white text-[16px] text-[#1a1a2e] resize-none focus:outline-none focus:border-[#E8610A] transition-colors"
          />

          {/* Suggestion chips */}
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                onClick={() => setPrompt(s)}
                className="px-3 py-1.5 rounded-full bg-[#f0e6d6] text-[13px] text-[#8a7e70] font-medium border-none cursor-pointer hover:bg-[#e8dcc8] active:scale-[0.93] transition-all duration-100"
              >
                {s}
              </button>
            ))}
          </div>

          {/* Error message */}
          {phase === 'error' && errorMsg && (
            <p className="text-red-500 text-sm font-medium text-center">{errorMsg}</p>
          )}

          {/* Create button */}
          <button
            onClick={handleCreate}
            disabled={!prompt.trim()}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#10B981] to-[#059669] text-white font-bold text-lg shadow-lg border-none cursor-pointer active:scale-[0.96] transition-transform duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Create My Song
          </button>
        </>
      )}

      {/* Loading state */}
      {(phase === 'generating' || phase === 'polling') && (
        <div className="flex flex-col items-center gap-4 py-8">
          {/* Animated music notes */}
          <div className="flex gap-3 text-4xl animate-bounce">
            <span className="animate-[bounce_1s_ease-in-out_infinite]">🎵</span>
            <span className="animate-[bounce_1s_ease-in-out_0.2s_infinite]">🎶</span>
            <span className="animate-[bounce_1s_ease-in-out_0.4s_infinite]">🎵</span>
          </div>

          <p className="text-[#1a1a2e] font-bold text-lg">
            {phase === 'generating' ? 'Writing your song...' : 'Creating the music...'}
          </p>

          {songTitle && (
            <p className="text-[#8a7e70] text-sm">
              &quot;{songTitle}&quot;
            </p>
          )}

          {phase === 'polling' && (
            <p className="text-[#8a7e70] text-xs">
              This can take up to 2 minutes
              {pollCount > 0 && ` (check ${pollCount}/60)`}
            </p>
          )}

          {/* Pulse animation bar */}
          <div className="w-48 h-2 rounded-full bg-[#f0e6d6] overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#10B981] to-[#059669] animate-[progress_2s_ease-in-out_infinite]"
              style={{ width: phase === 'polling' ? `${Math.min(95, pollCount * 3)}%` : '30%' }}
            />
          </div>

          <style>{`
            @keyframes progress {
              0%, 100% { opacity: 0.6; }
              50% { opacity: 1; }
            }
          `}</style>
        </div>
      )}

      {/* Song ready */}
      {phase === 'ready' && audioUrl && (
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-5xl">🎉</div>

          <h2 className="text-[#1a1a2e] font-extrabold text-xl text-center">
            {songTitle || 'Your Song is Ready!'}
          </h2>

          {/* Audio player */}
          <audio
            ref={audioRef}
            src={audioUrl}
            controls
            autoPlay
            className="w-full rounded-xl"
            style={{ maxWidth: '100%' }}
          />

          {/* Lyrics (collapsible) */}
          {songLyrics && (
            <details className="w-full bg-white rounded-xl p-4 border border-[#f0e6d6]">
              <summary className="font-semibold text-[#1a1a2e] cursor-pointer text-sm">
                Show Lyrics
              </summary>
              <pre className="mt-3 text-[13px] text-[#8a7e70] whitespace-pre-wrap font-sans leading-relaxed">
                {songLyrics}
              </pre>
            </details>
          )}

          {/* Create another */}
          <button
            onClick={handleReset}
            className="w-full py-3 rounded-2xl bg-[#f0e6d6] text-[#1a1a2e] font-bold text-base border-none cursor-pointer active:scale-[0.96] transition-transform duration-100"
          >
            Create Another Song
          </button>
        </div>
      )}
    </div>
  );
}
