const NAME_MIN = 2;
export const NAME_MAX = 50;

/** Length in characters as people count them (an emoji is one). */
export const charCount = (s: string) => [...s].length;

export type NameCheck = { ok: true; name: string } | { ok: false; error: "tooShort" | "tooLong" };

/** ID-3: a display name is trimmed and 2–50 characters. */
export function checkName(raw: string): NameCheck {
  const name = raw.trim();
  if (charCount(name) < NAME_MIN) return { ok: false, error: "tooShort" };
  if (charCount(name) > NAME_MAX) return { ok: false, error: "tooLong" };
  return { ok: true, name };
}

/** Avatar initials: first letter of the first two words. */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => [...word][0] ?? "")
    .join("")
    .toLocaleUpperCase();
}

const AVATAR_COLORS = 6;

/** Stable avatar color (1–6) for an id, so a person keeps their color everywhere. */
export function avatarColor(id: string): number {
  let hash = 0;
  for (const ch of id) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return (hash % AVATAR_COLORS) + 1;
}
