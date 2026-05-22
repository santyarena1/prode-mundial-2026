const AVATAR_PALETTES = [
  { bg: "bg-red-600/25", border: "border-red-500/40", text: "text-red-300" },
  { bg: "bg-amber-600/25", border: "border-amber-500/40", text: "text-amber-300" },
  { bg: "bg-blue-600/25", border: "border-blue-500/40", text: "text-blue-300" },
  { bg: "bg-emerald-600/25", border: "border-emerald-500/40", text: "text-emerald-300" },
  { bg: "bg-purple-600/25", border: "border-purple-500/40", text: "text-purple-300" },
  { bg: "bg-rose-600/25", border: "border-rose-500/40", text: "text-rose-300" },
] as const;

export type AvatarPalette = (typeof AVATAR_PALETTES)[number];

/** Iniciales: primera letra del nombre y del apellido (o las dos primeras si falta uno). */
export function getUserInitials(firstName: string, lastName: string): string {
  const first = firstName.trim();
  const last = lastName.trim();

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase();
  }

  const combined = (first || last).trim();
  if (!combined) return "?";
  if (combined.length >= 2) return combined.slice(0, 2).toUpperCase();
  return combined[0].toUpperCase();
}

export function getAvatarPalette(seed: string): AvatarPalette {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}
