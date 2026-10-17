// Appearance catalogue — add options here; the avatar renderer reads them by id.
export type Appearance = {
  silhouette: string;
  skin: string;
  hair: string;
  hairColor: string;
  outfit: string;
  style: string;
};

export type Option = { id: string; label: string; value?: string };

export const APPEARANCE_OPTIONS = {
  silhouette: [
    { id: "slim", label: "Fine" },
    { id: "regular", label: "Moyenne" },
    { id: "broad", label: "Carrée" },
  ],
  skin: [
    { id: "s1", label: "Très claire", value: "oklch(0.9 0.04 60)" },
    { id: "s2", label: "Claire", value: "oklch(0.82 0.06 55)" },
    { id: "s3", label: "Mate", value: "oklch(0.7 0.08 50)" },
    { id: "s4", label: "Brune", value: "oklch(0.55 0.08 45)" },
    { id: "s5", label: "Foncée", value: "oklch(0.4 0.06 40)" },
  ],
  hair: [
    { id: "short", label: "Court" },
    { id: "long", label: "Long" },
    { id: "curly", label: "Bouclé" },
    { id: "bun", label: "Chignon" },
    { id: "bald", label: "Rasé" },
  ],
  hairColor: [
    { id: "black", label: "Noir", value: "oklch(0.2 0.01 60)" },
    { id: "brown", label: "Brun", value: "oklch(0.38 0.06 50)" },
    { id: "blond", label: "Blond", value: "oklch(0.8 0.1 85)" },
    { id: "red", label: "Roux", value: "oklch(0.58 0.15 40)" },
    { id: "grey", label: "Gris", value: "oklch(0.75 0.01 250)" },
  ],
  outfit: [
    { id: "coral", label: "Corail", value: "oklch(0.7 0.16 33)" },
    { id: "navy", label: "Marine", value: "oklch(0.35 0.08 255)" },
    { id: "green", label: "Sauge", value: "oklch(0.62 0.07 160)" },
    { id: "sand", label: "Sable", value: "oklch(0.8 0.05 80)" },
    { id: "charcoal", label: "Anthracite", value: "oklch(0.3 0.01 255)" },
  ],
  style: [
    { id: "casual", label: "Décontracté" },
    { id: "chic", label: "Chic" },
    { id: "sport", label: "Sportif" },
  ],
} satisfies Record<keyof Appearance, Option[]>;

export const DEFAULT_APPEARANCE: Appearance = {
  silhouette: "regular",
  skin: "s2",
  hair: "short",
  hairColor: "brown",
  outfit: "coral",
  style: "casual",
};

export function optionValue(group: keyof Appearance, id: string): string {
  const list: Option[] = APPEARANCE_OPTIONS[group];
  return (list.find((o) => o.id === id) ?? list[0])?.value ?? "";
}

export function normalizeAppearance(raw: unknown): Appearance {
  const obj = (raw && typeof raw === "object" ? raw : {}) as Partial<Appearance>;
  return { ...DEFAULT_APPEARANCE, ...obj };
}
