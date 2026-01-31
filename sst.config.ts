/// <reference path="./.sst/platform/config.d.ts" />

export default $config({
  app(input) {
    return {
      name: "othership",
      removal: input?.stage === "production" ? "retain" : "remove",
      home: "aws",
    };
  },
  async run() {
    // Discord secrets
    const discordBotToken = new sst.Secret("DiscordBotToken");
    const discordPublicKey = new sst.Secret("DiscordPublicKey");
    const discordApplicationId = new sst.Secret("DiscordApplicationId");
    const discordClientSecret = new sst.Secret("DiscordClientSecret");
    
    // JWT secret
    const jwtSecret = new sst.Secret("JwtSecret");

    // DynamoDB table for all game state (single-table design)
    const table = new sst.aws.Dynamo("OthershipTable", {
      fields: {
        pk: "string",
        sk: "string",
        gsi1pk: "string",
        gsi1sk: "string",
        gsi2pk: "string",
        gsi2sk: "string",
      },
      primaryIndex: { hashKey: "pk", rangeKey: "sk" },
      globalIndexes: {
        gsi1: { hashKey: "gsi1pk", rangeKey: "gsi1sk" },
        gsi2: { hashKey: "gsi2pk", rangeKey: "gsi2sk" },
      },
      transform: {
        table: {
          billingMode: "PAY_PER_REQUEST", // On-demand pricing
          pointInTimeRecovery: {
            enabled: false, // Disable to stay in free tier
          },
          ttl: {
            enabled: true,
            attributeName: "ttl", // Auto-cleanup old games
          },
        },
      },
    });

    // tRPC API for web UI
    const api = new sst.aws.Function("TrpcApi", {
      handler: "packages/backend/lambda/api/handler.handler",
      link: [table, discordBotToken, jwtSecret],
      url: true, // Enable Function URL
      timeout: "30 seconds",
      memory: "512 MB",
      logging: {
        retention: "7 days", // Keep logs for 1 week only
      },
    });

    // Discord Interactions webhook handler
    const discordWebhook = new sst.aws.Function("DiscordWebhook", {
      handler: "packages/backend/lambda/discord/interactions.handler",
      link: [table, discordBotToken, discordPublicKey],
      url: true, // Enable Function URL
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "7 days",
      },
    });

    // Auth callback handler
    const authCallback = new sst.aws.Function("AuthCallback", {
      handler: "packages/backend/lambda/auth/callback.handler",
      link: [
        table,
        discordApplicationId,
        discordClientSecret,
        jwtSecret,
      ],
      url: {
        authorization: "none",
      },
      timeout: "10 seconds",
      memory: "512 MB",
      logging: {
        retention: "7 days",
      },
    });

    // Auth login handler
    const authLogin = new sst.aws.Function("AuthLogin", {
      handler: "packages/backend/lambda/auth/login.handler",
      link: [discordApplicationId],
      url: {
        authorization: "none",
      },
      timeout: "10 seconds",
      memory: "256 MB",
      logging: {
        retention: "7 days",
      },
      environment: {
        AUTH_CALLBACK_URL: authCallback.url,
      },
    });

    // Deploy Next.js frontend
    const frontend = new sst.aws.Nextjs("Frontend", {
      path: "packages/frontend",
      environment: {
        NEXT_PUBLIC_API_URL: api.url,
        NEXT_PUBLIC_AUTH_LOGIN_URL: authLogin.url,
      },
    });

    return {
      api: api.url,
      discordWebhook: discordWebhook.url,
      authLogin: authLogin.url,
      authCallback: authCallback.url,
      frontend: frontend.url,
      table: table.name,
    };
  },
});
