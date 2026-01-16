import { CosmosClient, type Container } from '@azure/cosmos'

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
