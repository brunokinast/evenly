// This device's small settings. Storage can be blocked (private mode, site data off): then reads give null and
// writes are lost, so a setting lasts for this visit only.

export function readStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** null removes the key. */
export function writeStored(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked.
  }
}
