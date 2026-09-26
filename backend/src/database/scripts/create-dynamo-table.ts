/**
 * Local dev helper: create the quiz-content table (+ TTL on `expiresAt`) if it
 * does not exist. Idempotent. Meant for dynamodb-local
 * (DYNAMO_ENDPOINT=http://localhost:8000); in AWS the table is provisioned
 * outside the app and the app's IAM user cannot call DescribeTable/CreateTable.
 *
 * Usage (from backend/): pnpm run dynamo:create-table
 */
import '../../polyfill';
import { config } from 'dotenv';
config({ path: '../.env' });

import {
  CreateTableCommand,
  DescribeTableCommand,
  DescribeTimeToLiveCommand,
  ResourceNotFoundException,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import {
  createDynamoClient,
  resolveDynamoSettings,
} from '../../modules/quests/quiz-content/dynamo.config';

const TTL_ATTRIBUTE = 'expiresAt';

async function main(): Promise<void> {
  const settings = resolveDynamoSettings();
  const client = createDynamoClient(settings);
  const TableName = settings.tableName;
  console.log(
    `[dynamo] table=${TableName} region=${settings.region} endpoint=${settings.endpoint ?? '(AWS)'}`,
  );

  let exists = true;
  try {
    await client.send(new DescribeTableCommand({ TableName }));
  } catch (err) {
    if (!(err instanceof ResourceNotFoundException)) throw err;
    exists = false;
  }

  if (exists) {
    console.log('[dynamo] table already exists');
  } else {
    await client.send(
      new CreateTableCommand({
        TableName,
        AttributeDefinitions: [
          { AttributeName: 'questId', AttributeType: 'S' },
        ],
        KeySchema: [{ AttributeName: 'questId', KeyType: 'HASH' }],
        BillingMode: 'PAY_PER_REQUEST',
      }),
    );
    await waitUntilTableExists({ client, maxWaitTime: 60 }, { TableName });
    console.log('[dynamo] table created');
  }

  try {
    const ttl = await client.send(new DescribeTimeToLiveCommand({ TableName }));
    const status = ttl.TimeToLiveDescription?.TimeToLiveStatus;
    if (status === 'ENABLED' || status === 'ENABLING') {
      console.log(`[dynamo] TTL on ${TTL_ATTRIBUTE}: ${status}`);
    } else {
      await client.send(
        new UpdateTimeToLiveCommand({
          TableName,
          TimeToLiveSpecification: {
            AttributeName: TTL_ATTRIBUTE,
            Enabled: true,
          },
        }),
      );
      console.log(`[dynamo] TTL enabled on ${TTL_ATTRIBUTE}`);
    }
  } catch (err) {
    // Not fatal: TTL is only the safety net behind QuestRetentionService.
    console.warn(`[dynamo] could not configure TTL: ${(err as Error).message}`);
  }
}

main().catch((err) => {
  console.error('[dynamo] failed:', err);
  process.exit(1);
});
