/**
 * Cloud sync orchestration: bundles the user's local data, reconciles it with
 * the copy in their Google Drive on connect (last-write-wins), and auto-saves
 * on change while connected. Everything else in the app keeps writing to
 * localStorage exactly as before — this layer just mirrors it to Drive.
 */

import { useCloudSyncStore } from "@/store/cloudSyncStore";
import { useCanvasStore } from "@/store/canvasStore";
import { useSavedDesignsStore } from "@/store/savedDesignsStore";
import { useCustomComponentsStore } from "@/store/customComponentsStore";
import { useCustomProblemsStore } from "@/store/customProblemsStore";
import { useDeepDiveStore } from "@/store/deepDiveStore";
import { useDrillProgressStore } from "@/store/drillProgressStore";
import { useScoreHistoryStore } from "@/store/scoreHistoryStore";
import { usePenStore } from "@/store/penStore";
import { useModeStore } from "@/store/modeStore";
import * as drive from "./googleDrive";

const BUNDLE_VERSION = 1;
const DEBOUNCE_MS = 1500;

/**
 * localStorage keys that make up a user's portable data. Deliberately EXCLUDES:
 *  - systemdesign-ai-assistant (holds API keys — never leaves the device)
 *  - systemdesign-tour (device-local onboarding state)
 *  - systemdesign-cloud (this feature's own metadata)
 */
const SYNCED_KEYS = [
  "systemdesign-canvas",
  "systemdesign-saved-designs",
  "systemdesign-custom-components",
  "systemdesign-custom-problems",
  "systemdesign-deepdive",
  "systemdesign-drills",
  "systemdesign-score-history",
  "systemdesign-pen-strokes",
  "systemdesign-app",
  "systemdesign-mode",
];

/** Stores whose changes should trigger an auto-save (content, not API keys). */
const WATCHED_STORES = [
  useCanvasStore,
  useSavedDesignsStore,
  useCustomComponentsStore,
  useCustomProblemsStore,
  useDeepDiveStore,
  useDrillProgressStore,
  useScoreHistoryStore,
  usePenStore,
  useModeStore,
];

interface Bundle {
  version: number;
  savedAt: number;
  data: Record<string, string>;
}

function buildBundle(): Bundle {
  const data: Record<string, string> = {};
  for (const key of SYNCED_KEYS) {
    const value = localStorage.getItem(key);
    if (value != null) data[key] = value;
  }
  return { version: BUNDLE_VERSION, savedAt: useCloudSyncStore.getState().lastLocalChangeAt, data };
}

function dataEqual(a: Record<string, string>, b: Record<string, string>): boolean {
  const ak = Object.keys(a);
  if (ak.length !== Object.keys(b).length) return false;
  return ak.every((k) => a[k] === b[k]);
}

// ── Module state ────────────────────────────────────────────────────────────
let connected = false;
let applying = false;
let fileId: string | null = null;
let lastPushedJson = "";
let lastKnownJson = "";
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let initialized = false;

export function isCloudConfigured(): boolean {
  return !!drive.getClientId();
}

/** Overwrite local data with Drive's copy, then reload so every store rehydrates. */
function applyRemote(remote: Bundle): void {
  applying = true;
  for (const key of SYNCED_KEYS) {
    if (remote.data[key] != null) localStorage.setItem(key, remote.data[key]);
  }
  // Keep the change clock aligned so we don't immediately think local is newer.
  useCloudSyncStore.getState().setLastLocalChangeAt(remote.savedAt || Date.now());
  window.location.reload();
}

async function push(bundle: Bundle): Promise<void> {
  const store = useCloudSyncStore.getState();
  store.setStatus("syncing");
  try {
    const content = JSON.stringify(bundle);
    if (!fileId) {
      const existing = await drive.findBackupFile();
      fileId = existing?.id ?? null;
    }
    if (fileId) await drive.updateFile(fileId, content);
    else fileId = await drive.createFile(content);
    lastPushedJson = JSON.stringify(bundle.data);
    lastKnownJson = lastPushedJson;
    store.setStatus("synced");
    store.setLastSyncedAt(Date.now());
    store.setError(null);
  } catch (e) {
    store.setStatus("error");
    store.setError(e instanceof Error ? e.message : "Sync failed");
  }
}

/** Compare local vs Drive on connect and converge (last-write-wins). */
async function reconcile(): Promise<void> {
  const store = useCloudSyncStore.getState();
  store.setStatus("syncing");
  try {
    const remoteFile = await drive.findBackupFile();
    const local = buildBundle();

    if (!remoteFile) {
      fileId = null;
      await push(local);
      return;
    }

    fileId = remoteFile.id;
    const remote = JSON.parse(await drive.downloadFile(remoteFile.id)) as Bundle;

    if (dataEqual(local.data, remote.data)) {
      lastPushedJson = JSON.stringify(local.data);
      lastKnownJson = lastPushedJson;
      store.setStatus("synced");
      store.setLastSyncedAt(Date.now());
      return;
    }

    if (local.savedAt > (remote.savedAt ?? 0)) await push(local);
    else applyRemote(remote); // reloads the page
  } catch (e) {
    store.setStatus("error");
    store.setError(e instanceof Error ? e.message : "Sync failed");
  }
}

/** Runs after edits settle: detect a real change, stamp it, and upload if connected. */
function flushSync(): void {
  if (applying || typeof window === "undefined") return;
  const bundle = buildBundle();
  const json = JSON.stringify(bundle.data);
  if (json === lastKnownJson) return; // nothing that we sync actually changed
  lastKnownJson = json;
  useCloudSyncStore.getState().markLocalChange();
  if (connected && json !== lastPushedJson) void push(buildBundle());
}

function scheduleSync(): void {
  if (applying || typeof window === "undefined") return;
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(flushSync, DEBOUNCE_MS);
}

/** Sign in (or silently restore a session) and reconcile with Drive. */
export async function connect(interactive: boolean): Promise<void> {
  const store = useCloudSyncStore.getState();
  if (!isCloudConfigured()) {
    store.setStatus("error");
    store.setError("Cloud sync isn't set up yet (missing Google client ID).");
    return;
  }
  store.setStatus("connecting");
  store.setError(null);
  try {
    await drive.requestToken(interactive);
    connected = true;
    store.setHasConnectedBefore(true);
    store.setEmail(await drive.fetchUserEmail());
    await reconcile();
  } catch (e) {
    connected = false;
    if (interactive) {
      store.setStatus("error");
      store.setError(e instanceof Error ? e.message : "Sign-in failed");
    } else {
      // Silent restore failed — sit quietly as signed-out, no error noise.
      store.setStatus("disconnected");
    }
  }
}

export function disconnect(): void {
  drive.revokeToken();
  connected = false;
  fileId = null;
  lastPushedJson = "";
  const store = useCloudSyncStore.getState();
  store.setHasConnectedBefore(false);
  store.setEmail(null);
  store.setLastSyncedAt(null);
  store.setError(null);
  store.setStatus("disconnected");
}

export async function syncNow(): Promise<void> {
  if (!connected) return connect(true);
  return reconcile();
}

/** Wire up store subscriptions and attempt a silent reconnect. Call once. */
export function initCloudSync(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  lastKnownJson = JSON.stringify(buildBundle().data);
  for (const store of WATCHED_STORES) store.subscribe(() => scheduleSync());

  // Best-effort flush of a pending change when the tab is hidden/closed.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState !== "hidden" || !connected) return;
    const bundle = buildBundle();
    if (JSON.stringify(bundle.data) !== lastPushedJson) void push(bundle);
  });

  if (useCloudSyncStore.getState().hasConnectedBefore && isCloudConfigured()) {
    void connect(false);
  }
}
