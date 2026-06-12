// Shared access to the Learn tab's completion set, so scoring can mark
// problems complete and the Learn tab can react.

const STORAGE_KEY = "systemdesign-completed-problems";
// Pre-rename key — migrated on first read so progress isn't lost.
const LEGACY_STORAGE_KEY = "sds-completed-problems";

/** Fired on window whenever the completion set changes. */
export const COMPLETED_CHANGED_EVENT = "systemdesign:completed-changed";

export function readCompleted(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
        stored = legacy;
      }
    }
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

export function writeCompleted(completed: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...completed]));
    window.dispatchEvent(new Event(COMPLETED_CHANGED_EVENT));
  } catch {
    // ignore quota errors
  }
}

/** Mark a problem complete. Returns true if it wasn't already. */
export function markCompleted(problemId: string): boolean {
  const completed = readCompleted();
  if (completed.has(problemId)) return false;
  completed.add(problemId);
  writeCompleted(completed);
  return true;
}
