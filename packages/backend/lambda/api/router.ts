import { router } from "./trpc";
import { gameRouter } from "./game.router";
import { characterRouter } from "./character.router";

// Root tRPC router
export const appRouter = router({
  game: gameRouter,
  character: characterRouter,
});

// Export type for use in frontend
export type AppRouter = typeof appRouter;
