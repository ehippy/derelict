import { initTRPC, TRPCError } from "@trpc/server";
import { verifyToken } from "../../lib/auth";
import { playerService } from "../../db/services";
import type { Player } from "@othership/shared";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

// Context with authenticated user
export interface Context {
  user: Player | null;
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
    const player = await playerService.getPlayer(decoded.playerId);
    return { user: player, event };
  } catch (error) {
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
      user: ctx.user, // user is guaranteed to be non-null
    },
  });
});
