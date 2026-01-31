import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { Resource } from "sst";

// Create DynamoDB client
const client = new DynamoDBClient({});

// Create DynamoDB Document client (handles marshalling)
export const dynamoDb = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
  },
});

// Get table name from SST resource binding
export const getTableName = () => Resource.OthershipTable.name;
