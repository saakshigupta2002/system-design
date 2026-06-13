"use client";

import { useEffect, useState } from "react";
import { X, Copy, Check, Coffee, Heart } from "lucide-react";

interface SupportDialogProps {
  open: boolean;
  onClose: () => void;
}

// ─── Set your support details here ──────────────────────────────────────────
// PAYMENT_LINK: a URL that opens in a new tab — e.g. your Buy Me a Coffee,
//   Ko-fi, PayPal.me, or Stripe page. This is the main "Buy me a coffee" button.
// PAYMENT_ID:   a UPI id (or similar) shown with a copy button, for those who
//   prefer to pay directly. Optional.
// Leave both blank to keep the "coming soon" placeholder.
const PAYMENT_LINK = ""; // e.g. "https://buymeacoffee.com/yourname"
const PAYMENT_ID = "";   // e.g. "yourname@upi"
const PAYMENT_NAME = "Saakshi Gupta";
// ────────────────────────────────────────────────────────────────────────────

export function SupportDialog({ open, onClose }: SupportDialogProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    if (!PAYMENT_ID) return;
    try {
      await navigator.clipboard.writeText(PAYMENT_ID);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silent fail
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 my-4 w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl">
        {/* Decorative gradient band */}
        <div className="relative h-20 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/25 via-sky-500/10 to-blue-500/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_120%,rgba(34,211,238,0.3),transparent_60%)]" />
          <button
            onClick={onClose}
            className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900/70 text-zinc-400 backdrop-blur transition-colors hover:bg-zinc-800 hover:text-zinc-200"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content — pulled up to overlap the band with the coffee badge */}
        <div className="-mt-7 px-6 pb-6 text-center">
          {/* Coffee badge */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 shadow-lg shadow-amber-500/30 ring-4 ring-zinc-950">
            <Coffee className="h-6 w-6 text-zinc-950" />
          </div>

          <h2 className="mt-4 text-lg font-semibold tracking-tight text-zinc-100">
            Enjoying SystemDesign?
          </h2>
          <p className="mx-auto mt-1.5 max-w-[280px] text-xs leading-relaxed text-zinc-400">
            If this helped you prep for a system design interview, a chai goes a long way to keep it alive and open-source.
          </p>

          {/* Payment options — set PAYMENT_LINK and/or PAYMENT_ID above. */}
          {PAYMENT_LINK || PAYMENT_ID ? (
            <div className="mt-5 flex flex-col items-center gap-3">
              {PAYMENT_LINK && (
                <a
                  href={PAYMENT_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 px-5 py-2 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/30 transition-transform hover:-translate-y-0.5"
                >
                  <Coffee className="h-4 w-4" />
                  Buy me a coffee
                </a>
              )}
              {PAYMENT_ID && (
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-1.5 font-mono text-[11px] text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-800"
                >
                  {PAYMENT_ID}
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-zinc-500" />
                  )}
                </button>
              )}
            </div>
          ) : (
            <div className="mt-5 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/50 px-4 py-3 text-[11px] text-zinc-500">
              Payment details coming soon.
            </div>
          )}

          <p className="mt-3 text-[10px] text-zinc-500">
            Pay what feels right · No pressure · No ads
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 border-t border-zinc-800 pt-3 text-[11px] text-zinc-500">
            <span>Built with</span>
            <Heart className="h-3 w-3 fill-rose-400 text-rose-400" />
            <span>by</span>
            <span className="font-medium text-zinc-300">{PAYMENT_NAME}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
