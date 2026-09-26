import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';

export const DEFAULT_QUIZZES_TABLE = 'studyquest-quizzes';
export const DEFAULT_AWS_REGION = 'us-east-1';

export interface DynamoSettings {
  tableName: string;
  region: string;
  /** Only set for local dev (dynamodb-local), e.g. http://localhost:8000. */
  endpoint?: string;
}

type EnvGetter = (key: string) => string | undefined;

/** Reads the DynamoDB settings from env. Works with `process.env` (scripts)
 * and with Nest's `ConfigService.get` (app). */
export function resolveDynamoSettings(
  get: EnvGetter = (key) => process.env[key],
): DynamoSettings {
  const endpoint = get('DYNAMO_ENDPOINT')?.trim();
  return {
    tableName: get('DYNAMO_QUIZZES_TABLE')?.trim() || DEFAULT_QUIZZES_TABLE,
    region: get('AWS_REGION')?.trim() || DEFAULT_AWS_REGION,
    endpoint: endpoint || undefined,
  };
}

export function createDynamoClient(
  settings: DynamoSettings,
  get: EnvGetter = (key) => process.env[key],
): DynamoDBClient {
  const hasStaticCreds = Boolean(get('AWS_ACCESS_KEY_ID'));
  return new DynamoDBClient({
    region: settings.region,
    ...(settings.endpoint
      ? {
          endpoint: settings.endpoint,
          // dynamodb-local accepts any credentials, but the SDK still has to
          // sign requests. Only used when pointing at a local endpoint.
          ...(hasStaticCreds
            ? {}
            : {
                credentials: { accessKeyId: 'local', secretAccessKey: 'local' },
              }),
        }
      : {}),
  });
}

export function createDynamoDocumentClient(
  client: DynamoDBClient,
): DynamoDBDocumentClient {
  return DynamoDBDocumentClient.from(client, {
    marshallOptions: { removeUndefinedValues: true },
  });
}
