'use client';

import { useEffect } from 'react';

export default function TalkError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[talk] render error:', error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center p-6 bg-gray-50"
      style={{ height: 'calc(100dvh - 72px - env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="text-6xl mb-4" aria-hidden="true">👋</div>
      <h2 className="text-xl font-bold text-gray-800 mb-2">Let's try again!</h2>
      <p className="text-sm text-gray-600 mb-6 text-center max-w-xs">
        Something got mixed up. Tap the button to keep talking.
      </p>
      <button
        onClick={reset}
        className="px-6 py-3 bg-[#E8610A] text-white rounded-xl font-bold text-base min-h-[56px] min-w-[200px]"
      >
        Tap to continue
      </button>
    </div>
  );
}
