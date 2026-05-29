import { router } from "./trpc";
import { gameRouter } from "./game.router";
import { characterRouter } from "./character.router";
import { playerRouter } from "./player.router";
import { guildRouter } from "./guild.router";
import { scenarioRouter } from "./scenario.router";
import { systemRouter } from "./system.router";

// Root tRPC router
export const appRouter = router({
  game: gameRouter,
  character: characterRouter,
  player: playerRouter,
  guild: guildRouter,
  scenario: scenarioRouter,
  system: systemRouter,
});

// Export type for use in frontend
export type AppRouter = typeof appRouter;
