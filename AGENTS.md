<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Architecture rules
- Game rules live in `src/game/` (UI hints only); authoritative checks live in the `create_character` SECURITY DEFINER DB function — the client is never trusted for money or age.
- All data access goes through `src/services/game.ts` query options; pages use loader `ensureQueryData` + `useSuspenseQuery`.
- Money tables (accounts, transactions) and characters have SELECT-only RLS for players; writes only via secured DB functions.
- In-game pages live under `src/routes/_authenticated/_game/` whose layout redirects to `/creation` when no character exists.
- Unavailable sections are declared in `src/game/navigation.ts` (available: false) and render via `/section/$id`.
- World hierarchy is stored in cities, districts, locations and location_spaces; load districts per city and locations per district to keep the atlas extensible and progressive.
- Player position is stored separately with owner-only read RLS and mutated only through move_character; a character-insert trigger initializes position without rewriting character creation.
- World clock derives elapsed time from a database anchor; client interpolation only animates its display and never authorizes gameplay.
- Map zoom and touch gestures use react-zoom-pan-pinch; world rules stay in src/game/world.ts so presentation does not authorize movement.
- Daily-life actions use authenticated database RPCs with locked character/account rows and idempotent settlement; clients send action identifiers, never energy, money, duration or rewards.
- Activity deadlines use game_now derived from the existing world clock; daily_life_state settles elapsed activities and applications on reads, including after reconnect, without a second money or position system.
- Configurable balance values live in life_rules, life_settings, housing_types and jobs; src/game/life.ts contains presentation-only helpers and tests.
