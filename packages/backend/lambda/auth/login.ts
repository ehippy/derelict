import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { Resource } from "sst";

const DISCORD_OAUTH_URL = "https://discord.com/api/oauth2/authorize";

/**
 * Redirect to Discord OAuth login
 */
export async function handler(
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> {
  const clientId = Resource.DiscordApplicationId.value;
  const callbackUrl = process.env.AUTH_CALLBACK_URL || (Resource as any).AuthCallback?.url;

  // Build Discord OAuth URL
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    response_type: "code",
    scope: "identify guilds",
  });

  const authUrl = `${DISCORD_OAUTH_URL}?${params.toString()}`;

  return {
    statusCode: 302,
    headers: {
      Location: authUrl,
    },
  };
}
