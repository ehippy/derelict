import { publicProcedure, protectedProcedure, router } from "./trpc";
import { z } from "zod";
import { ScenarioService } from "../../db/services";

export const scenarioRouter = router({
  listScenarios: publicProcedure.query(async () => {
    return await ScenarioService.listAll();
  }),

  getScenario: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return await ScenarioService.getById(input.id);
    }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().min(1),
        difficulty: z.enum(["tutorial", "easy", "medium", "hard", "deadly"]),
        minPlayers: z.number().min(1).max(20),
        maxPlayers: z.number().min(1).max(20),
        mapData: z.any().optional(),
        initialState: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      return await ScenarioService.create({
        ...input,
        creatorId: ctx.user.discordUserId,
        creatorUsername: ctx.user.discordUsername,
      });
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().min(1).optional(),
        difficulty: z.enum(["tutorial", "easy", "medium", "hard", "deadly"]).optional(),
        minPlayers: z.number().min(1).max(20).optional(),
        maxPlayers: z.number().min(1).max(20).optional(),
        mapData: z.any().optional(),
        initialState: z.any().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const scenario = await ScenarioService.getById(input.id);
      if (!scenario) {
        throw new Error("Scenario not found");
      }
      if (scenario.creatorId !== ctx.user.discordUserId) {
        throw new Error("Unauthorized: Only the creator can edit this scenario");
      }
      return await ScenarioService.update(input.id, input);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const scenario = await ScenarioService.getById(input.id);
      if (!scenario) {
        throw new Error("Scenario not found");
      }
      if (scenario.creatorId !== ctx.user.discordUserId) {
        throw new Error("Unauthorized: Only the creator can delete this scenario");
      }
      await ScenarioService.delete(input.id);
      return { success: true };
    }),
});
