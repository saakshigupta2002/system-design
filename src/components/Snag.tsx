"use client";

import { useEffect } from "react";

// Self-hosted Snag session watcher. The project key is a public site key —
// safe in client code, it identifies the project, it does not authenticate.
// Both are overridable via env vars; the fallbacks point at the live deploy.
const ENDPOINT =
  process.env.NEXT_PUBLIC_SNAG_ENDPOINT ?? "https://snag-deploy-ingest.vercel.app";
const PROJECT_KEY = process.env.NEXT_PUBLIC_SNAG_PROJECT_KEY ?? "";

declare global {
  interface Window {
    Snag?: {
      init: (opts: { projectKey: string; endpoint: string }) => unknown;
      readonly isRecording?: boolean;
    };
  }
}

/**
 * Loads the self-hosted Snag recorder and starts a session. Masking and
 * redaction happen in the browser before anything is sent. Renders nothing.
 */
export function SnagRecorder() {
  useEffect(() => {
    if (!PROJECT_KEY || !ENDPOINT || window.Snag?.isRecording) return;

    const base = ENDPOINT.replace(/\/+$/, "");
    const start = () => window.Snag?.init({ projectKey: PROJECT_KEY, endpoint: base });

    if (window.Snag) {
      start();
      return;
    }
    const src = `${base}/snag.js`;
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", start, { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.addEventListener("load", start, { once: true });
    document.head.appendChild(script);
  }, []);

  return null;
}
