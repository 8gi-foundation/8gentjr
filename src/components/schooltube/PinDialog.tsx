"use client";

/**
 * PinDialog — parental PIN control for SchoolTube settings/admin access.
 * Ported from NickOS. Uses native dialog element instead of shadcn Dialog.
 */

import { useState, useEffect, useRef } from "react";

interface PinDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

const CORRECT_PIN = "1234"; // Demo pin

export default function PinDialog({
  open,
  onOpenChange,
  onSuccess,
}: PinDialogProps) {
  const [pin, setPin] = useState("");
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) {
      dialogRef.current?.showModal();
    } else {
      dialogRef.current?.close();
    }
  }, [open]);

  const handleNumberClick = (num: string) => {
    if (pin.length >= 4) return;
    const newPin = pin + num;
    setPin(newPin);
    setError(false);

    if (newPin.length === 4) {
      if (newPin === CORRECT_PIN) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 800);
      } else {
        setError(true);
        setTimeout(() => {
          setPin("");
          setError(false);
        }, 500);
      }
    }
  };

  const handleClear = () => {
    setPin("");
    setError(false);
  };

  const handleClose = () => {
    setPin("");
    setError(false);
    setSuccess(false);
    onOpenChange(false);
  };

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      onClose={handleClose}
      className="fixed inset-0 z-50 m-auto rounded-2xl p-6 max-w-sm w-full bg-white shadow-2xl backdrop:bg-black/50"
    >
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 text-2xl font-bold text-gray-800">
          <svg
            className="h-6 w-6 text-cyan-500"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Parent PIN
        </div>
      </div>

      {/* PIN dots */}
      <div className="flex justify-center gap-4 mb-6">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-14 w-14 rounded-2xl border-2 flex items-center justify-center transition-colors ${
              error
                ? "border-red-500 bg-red-50"
                : success
                  ? "border-cyan-500 bg-cyan-50"
                  : pin[i]
                    ? "border-cyan-500 bg-cyan-50"
                    : "border-gray-200 bg-gray-50"
            } ${error ? "animate-[shake_0.3s_ease-in-out]" : ""}`}
          >
            {pin[i] && (
              <div
                className={`h-4 w-4 rounded-full ${
                  error ? "bg-red-500" : "bg-cyan-500"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Success message */}
      {success && (
        <div className="flex items-center justify-center gap-2 text-cyan-600 font-semibold mb-4">
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Access Granted
        </div>
      )}

      {/* Number pad */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => handleNumberClick(num.toString())}
            disabled={success}
            className="h-16 text-2xl font-bold rounded-xl border-2 border-gray-200 bg-white hover:bg-cyan-500 hover:text-white hover:border-cyan-500 active:scale-95 transition-all disabled:opacity-50"
          >
            {num}
          </button>
        ))}
        <button
          onClick={handleClear}
          disabled={success}
          className="h-16 rounded-xl border-2 border-gray-200 bg-white hover:bg-gray-100 transition-all disabled:opacity-50 flex items-center justify-center"
        >
          <svg
            className="h-6 w-6 text-gray-600"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z" />
            <line x1="18" y1="9" x2="12" y2="15" />
            <line x1="12" y1="9" x2="18" y2="15" />
          </svg>
        </button>
        <button
          onClick={() => handleNumberClick("0")}
          disabled={success}
          className="h-16 text-2xl font-bold rounded-xl border-2 border-gray-200 bg-white hover:bg-cyan-500 hover:text-white hover:border-cyan-500 active:scale-95 transition-all disabled:opacity-50"
        >
          0
        </button>
        <div />
      </div>

      <p className="text-xs text-center text-gray-400">Demo PIN: 1234</p>
    </dialog>
  );
}
