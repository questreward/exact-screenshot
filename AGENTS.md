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
- `src/game/` is UI hints only; SECURITY DEFINER functions enforce money, age and rewards.
- Data: `src/services/game.ts` query options (distinct keys per shape); loaders `ensureQueryData`, pages `useSuspenseQuery`.
- Money tables, characters, positions and stats are SELECT-only (owner) for players; writes only via secured RPCs that lock the character and use unique operation keys.
- In-game pages live under `src/routes/_authenticated/_game/` (layout redirects to `/creation` without character); unavailable sections are `available: false` in `src/game/navigation.ts` and render via `/section/$id`.
- World: cities > districts > locations > location_spaces; move_character controls position; react-zoom-pan-pinch. Living places/district badges derive read-only from public facts via plain SELECTs (never *_state RPCs), distinguishing current/selected place and expected/recorded effects.
- World clock derives from a DB anchor (game_now); client only animates it. Deadlines settle on reads/reconnect (daily_life_state etc.).
- Balance values live in config tables (life_rules, life_settings, housing_types, jobs, *_settings); TS helpers are presentation-only with tests.
- Live regressions use isolated temporary accounts; prefer deadline acceleration; clock-window tests restore the full world_state row in the same transaction.
- One agenda/energy engine: social, civic, political, campaign, governance and world-event participations reuse activities with exactly-once reward ledgers.
- Fictional NPCs are separate from players; NPC chat and writing help are narrative only (local Ollama, user-RLS reads, no writes); directories never expose other players' private records. Membership history is immutable and reactivation keeps identity.
- News reuses events/news/notifications via one hourly SQL job with unique event keys; reads/bookmarks stay private.
- Parties/movements are organization kinds extended 1:1 (political_profiles/branches); political stats are separate from social stats; affinity in src/game/politics.ts is a hint only.
- Elections: character-first RPCs, row locks, private immutable ballots; fictional electorates simulated separately; candidacies own campaign budget without new accounts.
- Governance extends public_decisions; council approval and unique municipal-ledger funding precede effects, never personal accounts; one calendar successor per city election.
- World events extend `events` with config in world_event_templates/settings; rewards use unique ledgers and economy_cash. Staging preserves importance and uses a separate public-event TV projection, never headline guesses.
- Travel delays from world events are computed once at public-transport start and frozen on the activity; national per-city effects use a unique (event, city) ledger — idempotent, no retroactive effects.
- National politics isolates calendars, ledgers and permissions from municipal systems; undecided operations stay disabled.
- Non-atomic installs are forbidden: schema, seeds and integrity checks run in one transaction (VPS psql file with BEGIN/COMMIT), never partial state or compensating cleanup.
- Fictional NPC schedules are computed deterministically from game_now (npc_location_at), never stored or ticked; greetings reuse comm_push with per-day unique keys and no rewards.
- Separate pots (org_treasuries, business_treasuries, project/crisis kitties) have own ledgers with unique keys, never negative, no withdrawal to personal accounts; personal money moves only via economy_cash, which acts only for the signed-in character, so payments to others are rows the payee collects on read.
- Protests are social activities settled on read with a unique effects ledger; TV broadcasts are generated once per day on read from news.
- Overdraft and insurance debt are separate debts (bank_profiles.overdraft_used, insurance_profiles.debt); balances never go negative. Loans and incidents (hashtext per character/week) settle on read with unique keys.
- Player network data is exposed only through network_card/network_profile RPCs, never by widening characters RLS; one block guard (guard_player_block); 'live' updates use polling (no realtime server on VPS).
- France map: local geo data, maplibre-gl v4, no tiles. Rent retries log failures under a distinct key.
- Deferred consequences go through scheduled_effects (schedule_effect / apply_due_effects), applied once on read; projects and crises never write indicators, budget or reputation directly, and pay municipal costs only via treasury effects.
- Services reuse payments/weekly ledgers; agency rent settles on tenant reads, shares on owner reads. Recruitment wraps hires with opt-in/unique placements; fees move between treasuries, never candidates. Insurance uses anonymous funding/fictive shortfalls, never personal credits; pricing only via insurer_set_price. Body fingerprints guard patches.
- Housing: read-only visits; secured buys. Private asset/lease layouts, versioned saves; cascades and inactive leases release furniture without money changes.

- Unified economy: `economy_state` settles locked monthly indices; `economy-*.ts` is presentation-only. State receipts track actual paid deltas, never assessed debt; legacy price/payment wiring must be explicit and prospective.

- Postal mail: internal post_deliver uses recipient-scoped unique keys; registered deadlines retain first presentation, postage carries prepaid cents across whole-euro economy debits.
- Online bank extends bank_profiles and player_transfers; fictional RIBs never represent real accounts, card limits are informational, and monthly account fees skip insufficient balances without new debt.

- Secure titles extend character_identity and administrative_documents; never duplicate a valid title, and activate CNI/passport only after registered-mail collection.
- Tax space extends 0096 returns and withholding: annual notice balances must never also enter profile debt; property assessments use owned real-estate assets, and only actual notice payments create State receipts.
