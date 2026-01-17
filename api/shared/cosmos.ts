import { CosmosClient, type Container } from '@azure/cosmos'
import { randomUUID, webcrypto } from 'node:crypto'

const globalAny = globalThis as unknown as { crypto?: { randomUUID?: () => string } }

if (!globalAny.crypto) {
  // Polyfill for runtimes that don't expose global crypto (e.g. Node 16).
  globalAny.crypto = webcrypto as unknown as { randomUUID?: () => string }
}

if (!globalAny.crypto.randomUUID) {
  globalAny.crypto.randomUUID = randomUUID
}

const connectionString = process.env.COSMOS_CONNECTION_STRING
const databaseName = process.env.COSMOS_DB_NAME || 'EyeQDB'

if (!connectionString) {
  throw new Error('Missing COSMOS_CONNECTION_STRING')
}

const client = new CosmosClient(connectionString)

const ensureContainer = async (
  containerId: string,
  partitionKeyPath: string,
): Promise<Container> => {
  const { database } = await client.databases.createIfNotExists({
    id: databaseName,
  })
  const { container } = await database.containers.createIfNotExists({
    id: containerId,
    partitionKey: { paths: [partitionKeyPath] },
  })
  return container
}

export const getContainer = async (
  containerId: string,
  partitionKeyPath: string,
) => ensureContainer(containerId, partitionKeyPath)
