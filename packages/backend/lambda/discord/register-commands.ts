import { Resource } from "sst";

const DISCORD_API_BASE = "https://discord.com/api/v10";

interface Command {
  name: string;
  description: string;
  options?: Array<{
    name: string;
    description: string;
    type: number;
    required?: boolean;
  }>;
}

const commands: Command[] = [
  {
    name: "start-game",
    description: "Start a new game in this channel",
  },
  {
    name: "join",
    description: "Join the active game in this channel",
  },
  {
    name: "status",
    description: "Check the status of the current game",
  },
];

/**
 * Register Discord slash commands
 * Called automatically by SST on deployment
 */
export async function registerCommands(
  applicationId: string,
  botToken: string
): Promise<void> {
  console.log("Registering Discord slash commands...");

  // Register global commands
  const response = await fetch(
    `${DISCORD_API_BASE}/applications/${applicationId}/commands`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(commands),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to register commands: ${error}`);
  }

  console.log(`Registered ${commands.length} commands successfully`);
}

/**
 * CLI script to register commands manually
 * Usage: node register-commands.js
 */
if (require.main === module) {
  const applicationId = process.env.DISCORD_APPLICATION_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!applicationId || !botToken) {
    console.error(
      "DISCORD_APPLICATION_ID and DISCORD_BOT_TOKEN must be set"
    );
    process.exit(1);
  }

  registerCommands(applicationId, botToken)
    .then(() => {
      console.log("Commands registered successfully!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Failed to register commands:", error);
      process.exit(1);
    });
}
