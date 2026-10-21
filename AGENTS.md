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
- src/game is presentation-only; secured SQL enforces age, money, rewards and configured balance values.
- src/services/game.ts owns queries; loaders ensureQueryData, pages useSuspenseQuery. Catalog inserts are additive, reads paged; purchases unchanged.
- Player money, character, position and stats tables are owner-SELECT-only; secured writes lock characters and use unique keys.
- Game routes belong under _authenticated/_game; missing characters redirect to creation, unavailable navigation uses section/$id.
- World hierarchy: cities/districts/locations/spaces; move_character controls location. Map badges use public SELECT facts, never state RPCs; distinguish selected/current and expected/recorded effects.
- game_now derives from DB anchor; clients animate only. Reads/reconnect settle deadlines.
- World-clock resets use a locked, uniquely keyed VPS migration and an explicit Europe/Paris wall-time anchor; VIP acceleration replaces the existing travel trigger so speed factors never stack.
- Isolated temporary accounts for regressions; accelerated deadlines preferred, world-clock tests restore the entire world_state in one transaction.
- Social/civic/political/campaign/governance/events share activities and exactly-once energy/reward ledgers.
- Fictional NPCs remain separate from players; local Ollama narrative never writes gameplay or reveals private player data. Membership history is immutable; reactivation keeps identity.
- News uses events/news/notifications and hourly unique keys; reads/bookmarks private. TV generated once daily; public-event staging preserves importance, not headline guesses.
- Parties/movements extend organization kinds 1:1; political stats separate, affinities hints only.
- Elections lock characters, use private immutable ballots; fictional electorates separate, campaign budgets have no new accounts.
- Governance extends public_decisions: council approval and municipal-ledger funding precede effects; one calendar successor per election, never personal funding.
- National politics isolates calendars/ledgers/permissions from municipalities; undecided actions disabled.
- Install schema/seeds/integrity checks atomically with BEGIN/COMMIT; no partial installation or compensating cleanup.
- NPC schedules derive deterministically from game_now; no ticks/stored movement, greetings have daily unique keys and no rewards.
- Treasuries and kitties have separate nonnegative unique ledgers, no personal withdrawals. economy_cash acts for signed-in character; payees collect incoming rows on read.
- Protests use activities and unique effects. Overdraft/insurance debt remain separate; balances never negative, loans/incidents settle once on reads.
- Player network exposed only by network_card/network_profile, never broader character RLS; guard_player_block central, VPS live updates poll.
- Real maps: self-hosted PMTiles via /tiles relay, drawn fallback; rent retry failures have distinct keys.
- Deferred effects use scheduled_effects exactly once on read; projects/crises never write indicators/budgets/reputation directly, municipal costs use treasury effects.
- Services share payments/weekly ledgers; agency rent settles on tenant reads, owner shares on owner reads. Recruitment opt-in unique placements, fees between treasuries, not candidates.
- Insurance uses anonymous funding/fictive shortfalls, no personal credit; pricing via insurer_set_price. Body fingerprints guard patches.
- Housing visits read-only, buys secured; private asset/lease layouts versioned; inactive leases/cascades release furniture without money changes.
- economy_state locks monthly indices; economy helpers presentation-only. State receipts record paid deltas not debt; legacy wiring explicit/prospective.
- Postal post_deliver keys scoped to recipients; first registered presentation retained, prepaid cents survive whole-euro debits.
- Online bank extends bank_profiles/player_transfers, fictional RIBs never real; insufficient fees skip without debt. Card enforcement follows installed secured SQL, not client hints.
- Titles extend character_identity/administrative_documents, no duplicate valid titles; CNI/passports activate only after registered-mail collection.
- Tax space extends existing returns/withholding; notices never also enter profile debt; property based on owned assets, receipts on actual payments only.
- Jobs reuse secured career/application hiring; diploma gates use student_ledger, missions have no separate money rewards.
- Mission scenes/dossiers/vehicle entry use server snapshots only, no invented trips, incidents or outcomes.
- NPC chat keeps page-local history; model/player limits match outputs/inputs, retry reuses pending history. No persistent memory without approved storage.
- Controls use touch-sized targets and bounded dialogs; navigation lists tested real routes, never hidden cross-links.
- Interiors/reports show recorded trips/shifts only, never imply tickets, certification, casualties or outcomes.
- TV shots/captions quote stored editions; local French voices, paused clips and bundled fallback preserve independence.
- Volunteer history/notes use private append-only snapshots and character-locked RPCs, never career rewards.
- VPS test restores omit cron via TOC; full backups retain production cron.
