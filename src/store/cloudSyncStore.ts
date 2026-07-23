import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CloudStatus =
  | "disconnected" // signed out (or never connected)
  | "connecting" // acquiring a token / user info
  | "syncing" // a Drive read/write is in flight
  | "synced" // connected and up to date
  | "error"; // last operation failed

interface CloudSyncState {
  /** Persisted: true once the user has connected, so we can silently reconnect. */
  hasConnectedBefore: boolean;
  /** Persisted: last time this device's synced data actually changed (for LWW). */
  lastLocalChangeAt: number;

  /** Ephemeral runtime state (not persisted). */
  status: CloudStatus;
  email: string | null;
  error: string | null;
  lastSyncedAt: number | null;

  setStatus: (s: CloudStatus) => void;
  setEmail: (e: string | null) => void;
  setError: (e: string | null) => void;
  setLastSyncedAt: (t: number | null) => void;
  setHasConnectedBefore: (v: boolean) => void;
  markLocalChange: () => void;
  setLastLocalChangeAt: (t: number) => void;
}

export const useCloudSyncStore = create<CloudSyncState>()(
  persist(
    (set) => ({
      hasConnectedBefore: false,
      lastLocalChangeAt: 0,
      status: "disconnected",
      email: null,
      error: null,
      lastSyncedAt: null,
      setStatus: (status) => set({ status }),
      setEmail: (email) => set({ email }),
      setError: (error) => set({ error }),
      setLastSyncedAt: (lastSyncedAt) => set({ lastSyncedAt }),
      setHasConnectedBefore: (hasConnectedBefore) => set({ hasConnectedBefore }),
      markLocalChange: () => set({ lastLocalChangeAt: Date.now() }),
      setLastLocalChangeAt: (lastLocalChangeAt) => set({ lastLocalChangeAt }),
    }),
    {
      name: "systemdesign-cloud",
      // Only the reconnect hint + change clock survive reloads; live status is
      // recomputed each session.
      partialize: (s) => ({
        hasConnectedBefore: s.hasConnectedBefore,
        lastLocalChangeAt: s.lastLocalChangeAt,
      }),
    }
  )
);
