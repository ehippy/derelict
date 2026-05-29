import { router, publicProcedure } from "./trpc";

export const systemRouter = router({
  /**
   * Health check (public - for liveness probes / status pages)
   * Returns service status, current timestamp, and version string.
   * No auth required, no DB access.
   */
  health: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      version: "0.1.0",
    };
  }),
});
