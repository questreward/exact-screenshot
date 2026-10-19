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
- Game rules in `src/game/` are UI hints only; authoritative checks live in SECURITY DEFINER DB functions — the client is never trusted for money, age or rewards.
- Data access goes through `src/services/game.ts` query options; pages use loader `ensureQueryData` + `useSuspenseQuery`.
- Query cache keys distinguish response shapes (for example event summaries versus structured event state) to prevent cross-page cache collisions.
- Money tables, characters, positions and stats are SELECT-only (owner) for players; writes only via secured RPCs that lock the character and use unique operation keys.
- In-game pages live under `src/routes/_authenticated/_game/` (layout redirects to `/creation` without character); unavailable sections are `available: false` in `src/game/navigation.ts` and render via `/section/$id`.
- World hierarchy: cities > districts > locations > location_spaces, loaded progressively; position changes only through move_character; map gestures use react-zoom-pan-pinch.
- World clock derives from a DB anchor (game_now); client only animates it. Deadlines settle on reads/reconnect (daily_life_state etc.).
- Balance values live in config tables (life_rules, life_settings, housing_types, jobs, *_settings); TS helpers are presentation-only with tests.
- Live regressions use isolated temporary accounts; prefer deadline acceleration; clock-window tests restore the full world_state row in the same transaction.
- One agenda/energy engine: social, civic, political, campaign, governance and world-event participations reuse activities with exactly-once reward ledgers.
- Fictional NPCs are separate from players; directories never expose other players' private records. Membership history is immutable and reactivation keeps identity.
- News reuses events/news/notifications via one hourly SQL job with unique event keys; reads/bookmarks stay private.
- Parties/movements are organization kinds extended 1:1 (political_profiles/branches); political stats are separate from social stats; affinity in src/game/politics.ts is a hint only.
- Elections: character-first RPCs, row locks, private immutable ballots; fictional electorates simulated separately; candidacies own campaign budget without new accounts.
- Governance extends public_decisions; council approval and unique municipal-ledger funding precede effects, never touching personal accounts; one calendar successor per city election.
- Rent retries keep failures under a distinct key; UI checks successful operations only.
- World events extend `events` (template_id/character_id) with config in world_event_templates/settings; participations/effects use unique ledgers and economy_cash — one event system, idempotent rewards.
- Travel delays from world events are computed once at public-transport start and frozen on the activity; national per-city effects use a unique (event, city) ledger — idempotent, no retroactive effects.
- National politics proposals isolate calendars, ledgers and permissions from municipal systems; undecided operations stay disabled so preparation cannot alter the established game.
- National installation requires one atomic transaction covering schema, seeds and integrity assertions; current schema/data tools cannot share it, so installation stays blocked until a supported unified executor exists, rather than leaving partial state or using compensating cleanup.
- Fictional NPC schedules are computed deterministically from game_now (npc_location_at), never stored or ticked; greetings reuse comm_push with per-day unique keys and no rewards.
- Player-founded organizations keep money in org_treasuries/org_ledger (unique operation keys, never negative); personal money moves only via economy_cash; no withdrawal to personal accounts.
- Protests are social activities (source_key 'protest:<id>') settled on read with a unique effects ledger; TV broadcasts are generated once per day on read from news, never by a scheduled job.
- Overdraft is a separate bank debt (bank_profiles.overdraft_used); account balances never go negative, so economy_cash stays unchanged. Loans settle on read with unique installment keys.
