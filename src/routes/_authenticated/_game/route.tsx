import { createFileRoute, redirect } from "@tanstack/react-router";
import { characterQuery } from "@/services/game";
import { GameShell } from "@/components/game/GameShell";

// Every in-game page requires a character; players without one go to creation.
export const Route = createFileRoute("/_authenticated/_game")({
  beforeLoad: async ({ context }) => {
    const character = await context.queryClient.ensureQueryData(characterQuery);
    if (!character) throw redirect({ to: "/creation" });
  },
  component: GameShell,
});
