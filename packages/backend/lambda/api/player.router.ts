import { z } from "zod";
import { router, protectedProcedure } from "./trpc";
import { playerService, guildService } from "../../db/services";
import { Resource } from "sst";

const DISCORD_API_BASE = "https://discord.com/api/v10";

export const playerRouter = router({
  /**
   * Get current player's guilds with bot installation status and permissions
   */
  getGuilds: protectedProcedure.query(async ({ ctx }) => {
    console.log("[player.getGuilds] Starting query");
    console.log("[player.getGuilds] Context playerId:", ctx.playerId);
    
    const guildsWithPermissions = await playerService.getPlayerGuildsWithPermissions(ctx.playerId);
    console.log("[player.getGuilds] Guilds with permissions:", guildsWithPermissions.length);

    try {
      // Fetch bot installation status for each guild
      const guildsWithStatus = await Promise.all(
        guildsWithPermissions.map(async (guild) => {
          try {
            const guildRecord = await guildService.getGuildByDiscordId(guild.id);
            return {
              ...guild,
              botInstalled: guildRecord?.botInstalled ?? false,
            };
          } catch (error) {
            console.error(`[player.getGuilds] Error checking guild ${guild.id}:`, error);
            return {
              ...guild,
              botInstalled: false,
            };
          }
        })
      );

      console.log("[player.getGuilds] Success, returning", guildsWithStatus.length, "guilds");
      return guildsWithStatus;
    } catch (error) {
      console.error("[player.getGuilds] Error in guild status mapping:", error);
      throw error;
    }
  }),

  /**
   * Get current player info
   */
  getMe: protectedProcedure.query(async ({ ctx }) => {
    console.log("[player.getMe] Starting query for playerId:", ctx.playerId);
    
    const player = await playerService.getPlayer(ctx.playerId);
    
    if (!player) {
      console.error("[player.getMe] Player not found for ID:", ctx.playerId);
      throw new Error("Player not found");
    }

    console.log("[player.getMe] Player found:", player.id);
    return player;
  }),

  /**
   * Refresh player's guilds from Discord API
   * Re-fetches the user's guilds and permissions from Discord
   */
  refreshGuilds: protectedProcedure.mutation(async ({ ctx }) => {
    console.log("[player.refreshGuilds] Starting refresh for playerId:", ctx.playerId);
    
    try {
      const guildsWithPermissions = await playerService.refreshGuildsFromDiscord(ctx.playerId);
      return guildsWithPermissions;
    } catch (error) {
      console.error("[player.refreshGuilds] Error refreshing guilds:", error);
      throw new Error("Failed to refresh guilds from Discord");
    }
  }),
});
