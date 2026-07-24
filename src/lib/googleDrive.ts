/**
 * Client-side Google Drive access via Google Identity Services (GIS).
 *
 * Uses the browser OAuth *token* flow — no backend, no client secret. The only
 * scope requested is `drive.file`, which is NON-sensitive: the app can read and
 * write ONLY the files it creates, never the rest of the user's Drive. That is
 * what lets this ship without Google's app-verification process.
 */

const GIS_SRC = "https://accounts.google.com/gsi/client";
const SCOPE = "https://www.googleapis.com/auth/drive.file openid email profile";

/** The single JSON blob we keep in the user's Drive. */
export const FILE_NAME = "systemdesign-backup.json";

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime?: string;
}

/** The public OAuth client id, injected at build time. Null when unconfigured. */
export function getClientId(): string | null {
  return process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID?.trim() || null;
}

// ── Minimal typings for the GIS token client ────────────────────────────────
interface TokenResponse {
  access_token?: string;
  error?: string;
  expires_in?: number;
}
interface TokenClient {
  requestAccessToken: (overrides?: { prompt?: string }) => void;
}
interface GoogleOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (resp: TokenResponse) => void;
    error_callback?: (err: unknown) => void;
  }) => TokenClient;
  revoke: (token: string, done?: () => void) => void;
}
declare global {
  interface Window {
    google?: { accounts: { oauth2: GoogleOAuth2 } };
  }
}

let gisPromise: Promise<void> | null = null;

/** Inject the GIS script once and resolve when the API is ready. */
function loadGis(): Promise<void> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (gisPromise) return gisPromise;
  gisPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = GIS_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Google sign-in"));
    document.head.appendChild(script);
  });
  return gisPromise;
}

let accessToken: string | null = null;
let tokenExpiry = 0;
let tokenClient: TokenClient | null = null;
// The token callback is global to the client, so route each request's outcome
// through these pending handlers.
let pendingResolve: ((token: string) => void) | null = null;
let pendingReject: ((err: unknown) => void) | null = null;

/** Build the GIS token client once. Returns null until GIS + client id are ready. */
function ensureTokenClient(): TokenClient | null {
  if (tokenClient) return tokenClient;
  const clientId = getClientId();
  if (!clientId || !window.google?.accounts?.oauth2) return null;
  tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPE,
    callback: (resp) => {
      if (resp.error || !resp.access_token) {
        pendingReject?.(new Error(resp.error || "Authorization failed"));
      } else {
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000;
        pendingResolve?.(resp.access_token);
      }
      pendingResolve = pendingReject = null;
    },
    error_callback: (err) => {
      const type = (err as { type?: string } | null)?.type;
      const message =
        type === "popup_failed_to_open"
          ? "Couldn't open the Google sign-in popup — allow pop-ups for this site and try again."
          : type === "popup_closed"
            ? "Sign-in window was closed before finishing."
            : "Google sign-in failed. Please try again.";
      pendingReject?.(new Error(message));
      pendingResolve = pendingReject = null;
    },
  });
  return tokenClient;
}

/**
 * Eagerly load GIS and build the token client at app start, so the first
 * Sign-in click can open the popup synchronously. Popups opened after an async
 * gap (e.g. loading the script on click) get blocked by the browser.
 */
export function preloadGis(): void {
  if (typeof window === "undefined" || !getClientId()) return;
  void loadGis().then(() => ensureTokenClient()).catch(() => {});
}

/**
 * Request an access token. When GIS is already loaded this calls
 * requestAccessToken *synchronously* (inside the Promise executor) so the popup
 * still counts as user-initiated. `interactive` shows the UI; otherwise a silent
 * grant is attempted (`prompt: none`).
 */
export function requestToken(interactive: boolean): Promise<string> {
  const clientId = getClientId();
  if (!clientId) {
    return Promise.reject(new Error("Cloud sync isn't configured (missing Google client ID)."));
  }
  // Force the consent screen on an explicit sign-in so newly-granted scopes
  // (e.g. Drive access) are actually attached to the token; silent refreshes
  // stay prompt-less.
  const prompt = interactive ? "consent" : "none";

  const client = ensureTokenClient();
  if (client) {
    return new Promise<string>((resolve, reject) => {
      pendingResolve = resolve;
      pendingReject = reject;
      client.requestAccessToken({ prompt });
    });
  }

  // GIS wasn't ready yet (very early click) — load it, then request.
  return loadGis().then(
    () =>
      new Promise<string>((resolve, reject) => {
        const c = ensureTokenClient();
        if (!c) {
          reject(new Error("Google sign-in failed to initialize."));
          return;
        }
        pendingResolve = resolve;
        pendingReject = reject;
        c.requestAccessToken({ prompt });
      })
  );
}

/** A currently-valid token, silently refreshed if the cached one has expired. */
async function getValidToken(): Promise<string> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;
  return requestToken(false);
}

interface DriveInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Authenticated fetch against the Drive API, retrying once on a 401. */
async function driveFetch(url: string, init?: DriveInit, retry = true): Promise<Response> {
  const token = await getValidToken();
  const res = await fetch(url, {
    method: init?.method,
    headers: { ...(init?.headers ?? {}), Authorization: `Bearer ${token}` },
    body: init?.body,
  });
  if (res.status === 401 && retry) {
    accessToken = null;
    tokenExpiry = 0;
    await requestToken(false);
    return driveFetch(url, init, false);
  }
  return res;
}

/** Build an Error from a failed Drive response, including Google's own reason. */
async function driveError(res: Response, action: string): Promise<Error> {
  let detail = "";
  try {
    const body = (await res.json()) as {
      error?: { message?: string; errors?: { message?: string }[] };
    };
    detail = body.error?.message || body.error?.errors?.[0]?.message || "";
  } catch {
    /* body wasn't JSON */
  }
  if (res.status === 403 && !detail) {
    detail = "Drive access denied — enable the Google Drive API and grant Drive access on sign-in.";
  }
  return new Error(`${action} failed (${res.status})${detail ? `: ${detail}` : ""}`);
}

/** Find our backup file (only app-created files are visible with drive.file). */
export async function findBackupFile(): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&pageSize=10`
  );
  if (!res.ok) throw await driveError(res, "Drive list");
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files?.[0] ?? null;
}

export async function downloadFile(id: string): Promise<string> {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  if (!res.ok) throw await driveError(res, "Drive download");
  return res.text();
}

export async function createFile(content: string): Promise<string> {
  const boundary = "sd_boundary_" + Math.random().toString(36).slice(2);
  const metadata = { name: FILE_NAME, mimeType: "application/json" };
  const body =
    `--${boundary}\r\n` +
    "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    "Content-Type: application/json\r\n\r\n" +
    `${content}\r\n` +
    `--${boundary}--`;
  const res = await driveFetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
    { method: "POST", headers: { "Content-Type": `multipart/related; boundary=${boundary}` }, body }
  );
  if (!res.ok) throw await driveError(res, "Drive create");
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function updateFile(id: string, content: string): Promise<void> {
  const res = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: content }
  );
  if (!res.ok) throw await driveError(res, "Drive update");
}

/** The signed-in user's email, for display. Best-effort. */
export async function fetchUserEmail(): Promise<string | null> {
  const res = await driveFetch("https://www.googleapis.com/oauth2/v3/userinfo");
  if (!res.ok) return null;
  const json = (await res.json()) as { email?: string };
  return json.email ?? null;
}

export function revokeToken(): void {
  if (accessToken && window.google?.accounts?.oauth2) {
    window.google.accounts.oauth2.revoke(accessToken);
  }
  accessToken = null;
  tokenExpiry = 0;
}
