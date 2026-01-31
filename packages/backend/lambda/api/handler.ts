import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "./router";
import { createContext } from "./trpc";
import type { APIGatewayProxyEventV2 } from "aws-lambda";

// Create Lambda handler for tRPC
export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext,
});
