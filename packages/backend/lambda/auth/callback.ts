import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Resource } from "sst";
import { playerService } from "../../db/services";
import { signToken } from "../../lib/auth";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface DiscordTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

interface DiscordUser {
  id: string;
  username: string;
  discriminator: string;
  avatar?: string;
}

interface DiscordGuild {
  id: string;
  name: string;
  icon?: string;
}

/**
 * Handle Discord OAuth callback
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const code = event.queryStringParameters?.code;

  if (!code) {
    return {
      statusCode: 400,
      body: "Missing authorization code",
    };
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API_BASE}/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: Resource.DiscordApplicationId.value,
        client_secret: (Resource as any).DiscordClientSecret.value,
        grant_type: "authorization_code",
        code,
        redirect_uri: (Resource as any).AuthCallback.url,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error("Failed to exchange code for token");
    }

    const tokens = (await tokenResponse.json()) as DiscordTokenResponse;

    // Fetch user profile
    const userResponse = await fetch(`${DISCORD_API_BASE}/users/@me`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userResponse.ok) {
      throw new Error("Failed to fetch user profile");
    }

    const user = (await userResponse.json()) as DiscordUser;

    // Fetch user's guilds
    const guildsResponse = await fetch(`${DISCORD_API_BASE}/users/@me/guilds`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!guildsResponse.ok) {
      throw new Error("Failed to fetch guilds");
    }

    const guilds = (await guildsResponse.json()) as DiscordGuild[];

    // Create or update player (without gameId - they'll join games later)
    const existingPlayers = await playerService.getPlayersByDiscordUser(user.id);
    
    let player;
    if (existingPlayers.length > 0) {
      // Update existing player
      player = existingPlayers[0];
      // TODO: Add update method to playerService
    } else {
      // Create new player without a game (they'll join later)
      player = await playerService.createPlayer({
        discordUserId: user.id,
        discordUsername: user.username,
        gameId: "", // Empty gameId - player not in a game yet
      });
    }

    // Sign JWT
    const token = signToken(player.id, user.id);

    // Redirect to frontend with token
    const frontendUrl = (Resource as any).Frontend?.url || process.env.FRONTEND_URL || "http://localhost:3000";
    
    return {
      statusCode: 302,
      headers: {
        Location: `${frontendUrl}/?token=${token}`,
      },
    };
  } catch (error) {
    console.error("OAuth callback error:", error);
    return {
      statusCode: 500,
      body: "Authentication failed",
    };
  }
}
