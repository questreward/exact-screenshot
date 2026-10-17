import { MapPin, GraduationCap } from "lucide-react";
import { CharacterAvatar } from "./CharacterAvatar";
import { normalizeAppearance } from "@/game/appearance";
import type { characterQuery } from "@/services/game";

type Character = NonNullable<Awaited<ReturnType<NonNullable<typeof characterQuery.queryFn>>>>;

export function CharacterCard({ character }: { character: Character }) {
  return (
    <div className="flex items-center gap-5 rounded-3xl border border-border bg-gradient-card p-5 shadow-card">
      <div className="h-28 w-24 shrink-0 overflow-hidden rounded-2xl border border-border">
        <CharacterAvatar appearance={normalizeAppearance(character.appearance)} />
      </div>
      <div className="min-w-0">
        <h2 className="truncate text-2xl font-bold">{character.first_name} {character.last_name}</h2>
        <p className="text-muted-foreground">{character.age} ans</p>
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1"><MapPin className="h-3.5 w-3.5 text-primary" />{character.city?.name}</span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1"><GraduationCap className="h-3.5 w-3.5 text-primary" />{character.path?.name}</span>
        </div>
      </div>
    </div>
  );
}
