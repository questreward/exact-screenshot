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
- Daily-life and economy RPCs lock character/account rows; clients never set prices, energy or rewards. Unique operation keys prevent duplicate charges and settlement; savings conserve cash within the existing account.
- Activities and economy deadlines use game_now; daily_life_state settles on reads/reconnect, reusing housing, progression, agenda and position.
- Configurable balance values live in life_rules, life_settings, housing_types and jobs; src/game/life.ts contains presentation-only helpers and tests.
- Live daily-life regressions create and clean up isolated temporary accounts; deadline acceleration is preferred, while clock-window tests must restore the full world_state row in the same transaction before commit so concurrent players never observe test time.
- Social actions serialize on the caller character; social participation uses the existing activities clock and settlement trigger with an exactly-once reward marker, preventing a second agenda or reward engine.
- Fictional NPCs are separate from real characters; organization directories expose NPCs and the caller only, never other players' private character records.
- Membership reactivation preserves its identity and records each entry/departure in a separate immutable history, keeping existing membership references stable.
- News reuses events/news/notifications; service-only deterministic publication follows game_now with unique event keys, while reading and bookmark RPCs derive the caller and keep personal state private.
- News generation runs as one hourly SQL-only job, never from a page read; aging is derived from world timestamps and media reputation stays distinct from social statistics.
- Civic actions use character-locked RPCs and a unique reward ledger; engagement never bypasses the existing social, bank or activity systems.
- Civic evolution settles elapsed city deadlines under an advisory lock on reads; decisions apply idempotent location metadata and publish through the existing event/news pipeline.
- Civic events reuse citizen organizations and social agenda reservations; engagement is snapshotted on activity insertion and awarded once on completion.
- Political parties and movements are organizations kinds (party/movement) extended 1:1 by political_profiles and political_branches; generic organization RPCs exclude them so citizen associations and politics stay distinct.
- Political rewards are snapshotted on activity insertion and granted once through the political_rewards ledger; political stats are separate from social stats and players cannot write them, their role or opinions directly.
- Political affinity is computed client-side in src/game/politics.ts as an indicative hint only; it never gates server actions.
- Municipal elections use character-first authenticated RPCs, election row locks and private immutable ballots; fictional electorates are simulated separately from real player votes to avoid exposing player data.
- Candidacies own the campaign budget and program without duplicating bank accounts; campaign actions reuse activities and exactly-once completion rewards to preserve the single agenda and energy system.
- Election catch-up uses game_now and election locks; personal rewards settle only for the caller to avoid cross-player deadlocks.

- Governance extends public_decisions; council approval and unique municipal-ledger funding precede effects, never touching personal accounts.
- Governance uses existing agenda/city locks; closure freezes dated reports and releases planned activities. A predecessor link permits one calendar successor only; no concurrent or third city election.
