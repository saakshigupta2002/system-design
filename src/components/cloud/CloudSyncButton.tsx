"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudCheck, CloudAlert, RefreshCw, LogOut, Loader2, LogIn } from "lucide-react";
import { useCloudSyncStore } from "@/store/cloudSyncStore";
import { connect, disconnect, syncNow, isCloudConfigured } from "@/lib/cloudSync";

function relativeTime(ts: number | null): string {
  if (!ts) return "";
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return `${h}h ago`;
}

export function CloudSyncButton() {
  const status = useCloudSyncStore((s) => s.status);
  const email = useCloudSyncStore((s) => s.email);
  const error = useCloudSyncStore((s) => s.error);
  const lastSyncedAt = useCloudSyncStore((s) => s.lastSyncedAt);
  const [open, setOpen] = useState(false);
  const [, force] = useState(0);

  // Refresh the "synced 2m ago" label while the menu is open.
  useEffect(() => {
    if (!open) return;
    const id = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, [open]);

  const busy = status === "connecting" || status === "syncing";
  const connected = status === "synced" || status === "syncing" || status === "error";

  // Signed out → a single call-to-action button.
  if (!connected) {
    return (
      <button
        data-tour="cloud"
        onClick={() => connect(true)}
        disabled={busy}
        className="flex h-7 shrink-0 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100 disabled:opacity-60"
        title={isCloudConfigured() ? "Sign in to save your work to Google Drive" : "Cloud sync isn't set up yet"}
      >
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <LogIn className="h-3.5 w-3.5" />}
        <span className="hidden sm:inline">{busy ? "Connecting…" : "Sign in"}</span>
      </button>
    );
  }

  const StatusIcon = status === "error" ? CloudAlert : status === "syncing" ? Loader2 : CloudCheck;
  const iconClass = status === "error" ? "text-amber-400" : "text-cyan-400";

  return (
    <div className="relative shrink-0" data-tour="cloud">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex h-7 items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-800 px-2.5 text-xs font-medium text-zinc-300 transition-colors hover:bg-zinc-700 hover:text-zinc-100"
        title={email ?? "Google Drive sync"}
      >
        <StatusIcon className={`h-3.5 w-3.5 ${iconClass} ${status === "syncing" ? "animate-spin" : ""}`} />
        <span className="hidden sm:inline">
          {status === "error" ? "Sync issue" : status === "syncing" ? "Syncing…" : "Synced"}
        </span>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-md border border-zinc-700 bg-zinc-900 py-1 shadow-lg">
            <div className="flex items-center gap-2 px-3 py-2">
              <Cloud className="h-4 w-4 shrink-0 text-cyan-400" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-zinc-200">{email ?? "Google Drive"}</p>
                <p className="text-[10px] text-zinc-500">
                  {status === "error"
                    ? "Not synced"
                    : status === "syncing"
                      ? "Syncing…"
                      : lastSyncedAt
                        ? `Synced ${relativeTime(lastSyncedAt)}`
                        : "Connected"}
                </p>
              </div>
            </div>

            {status === "error" && error && (
              <p className="px-3 pb-2 text-[10px] leading-relaxed text-amber-400/90">{error}</p>
            )}

            <div className="my-1 h-px bg-zinc-800" />

            <button
              onClick={() => { setOpen(false); void syncNow(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <RefreshCw className="h-3.5 w-3.5 text-zinc-500" />
              Sync now
            </button>
            <button
              onClick={() => { setOpen(false); disconnect(); }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs text-zinc-300 transition-colors hover:bg-zinc-800"
            >
              <LogOut className="h-3.5 w-3.5 text-zinc-500" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
