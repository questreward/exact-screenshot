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
