import { initTRPC, TRPCError } from "@trpc/server";
import { verifyToken, type TokenPayload } from "../../lib/auth";
import type { APIGatewayProxyEventV2 } from "aws-lambda";
import { playerService } from "../../db/services";

// Context with authenticated user info from JWT (no DB fetch)
export interface Context {
  user: TokenPayload | null;
  event: APIGatewayProxyEventV2;
}

// Create context from request
export async function createContext({
  event,
}: {
  event: APIGatewayProxyEventV2;
}): Promise<Context> {
  const authHeader = event.headers.authorization || event.headers.Authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { user: null, event };
  }

  const token = authHeader.substring(7); // Remove 'Bearer '

  try {
    const decoded = verifyToken(token);
    return { user: decoded, event };
  } catch (error) {
    console.error("[tRPC] Token verification failed:", error);
    return { user: null, event };
  }
}

// Initialize tRPC with context
const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "You must be logged in",
    });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user, // user is guaranteed to be non-null (TokenPayload)
      playerId: ctx.user.playerId,
    },
  });
});

// Admin procedure that requires admin privileges
export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  // Fetch player to check admin status
  const player = await playerService.getPlayer(ctx.playerId);
  
  if (!player?.isAdmin) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required",
    });
  }

  return next({
    ctx: {
      ...ctx,
      player, // Include full player object for convenience
    },
  });
});
