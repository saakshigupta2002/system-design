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

/**
 * Request an access token. `interactive` shows the account/consent UI as needed;
 * otherwise it attempts a silent grant (`prompt: none`) that fails cleanly if the
 * user has no active Google session or hasn't granted access before.
 */
export async function requestToken(interactive: boolean): Promise<string> {
  const clientId = getClientId();
  if (!clientId) throw new Error("Cloud sync isn't configured (missing Google client ID).");
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    const client = window.google!.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (resp) => {
        if (resp.error || !resp.access_token) {
          reject(new Error(resp.error || "Authorization failed"));
          return;
        }
        accessToken = resp.access_token;
        tokenExpiry = Date.now() + (resp.expires_in ?? 3600) * 1000 - 60_000;
        resolve(resp.access_token);
      },
      error_callback: (err) =>
        reject(err instanceof Error ? err : new Error("Sign-in was dismissed")),
    });
    client.requestAccessToken({ prompt: interactive ? "" : "none" });
  });
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

/** Find our backup file (only app-created files are visible with drive.file). */
export async function findBackupFile(): Promise<DriveFile | null> {
  const q = encodeURIComponent(`name='${FILE_NAME}' and trashed=false`);
  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&spaces=drive&fields=files(id,name,modifiedTime)&pageSize=10`
  );
  if (!res.ok) throw new Error(`Drive list failed (${res.status})`);
  const json = (await res.json()) as { files?: DriveFile[] };
  return json.files?.[0] ?? null;
}

export async function downloadFile(id: string): Promise<string> {
  const res = await driveFetch(`https://www.googleapis.com/drive/v3/files/${id}?alt=media`);
  if (!res.ok) throw new Error(`Drive download failed (${res.status})`);
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
  if (!res.ok) throw new Error(`Drive create failed (${res.status})`);
  const json = (await res.json()) as { id: string };
  return json.id;
}

export async function updateFile(id: string, content: string): Promise<void> {
  const res = await driveFetch(
    `https://www.googleapis.com/upload/drive/v3/files/${id}?uploadType=media`,
    { method: "PATCH", headers: { "Content-Type": "application/json" }, body: content }
  );
  if (!res.ok) throw new Error(`Drive update failed (${res.status})`);
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
