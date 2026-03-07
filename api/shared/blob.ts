import {
  BlobSASPermissions,
  BlobServiceClient,
  generateBlobSASQueryParameters,
  StorageSharedKeyCredential,
} from '@azure/storage-blob'

const connectionString = process.env.STORAGE_CONNECTION_STRING
const CONTAINER_NAME = 'question-images'

if (!connectionString) {
  throw new Error('Missing STORAGE_CONNECTION_STRING')
}

const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString)
const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME)

const configureCors = async () => {
  try {
    const properties = await blobServiceClient.getProperties()
    const rules = properties.cors || []
    const hasWildcard = rules.some(
      (r) => r.allowedOrigins === '*' && r.allowedMethods.includes('PUT'),
    )
    if (!hasWildcard) {
      rules.push({
        allowedOrigins: '*',
        allowedMethods: 'GET,PUT,OPTIONS',
        allowedHeaders: 'Content-Type,x-ms-blob-type',
        exposedHeaders: '',
        maxAgeInSeconds: 3600,
      })
      await blobServiceClient.setProperties({ cors: rules })
    }
  } catch (err) {
    console.error('Failed to configure CORS on storage account:', err)
  }
}

configureCors()

const getCredential = (): StorageSharedKeyCredential => {
  const match = connectionString.match(/AccountName=([^;]+);AccountKey=([^;]+)/)
  if (!match) throw new Error('Cannot parse STORAGE_CONNECTION_STRING for SAS generation')
  return new StorageSharedKeyCredential(match[1], match[2])
}

export const generateUploadSas = (
  blobName: string,
  contentType: string,
): { url: string; expiresOn: Date } => {
  const expiresOn = new Date(Date.now() + 15 * 60 * 1000)
  const permissions = BlobSASPermissions.parse('cw')
  const credential = getCredential()

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions,
      expiresOn,
      contentType,
    },
    credential,
  ).toString()

  const blobClient = containerClient.getBlobClient(blobName)
  return { url: `${blobClient.url}?${sas}`, expiresOn }
}

export const generateReadSas = (blobName: string): { url: string; expiresOn: Date } => {
  const expiresOn = new Date(Date.now() + 60 * 60 * 1000)
  const permissions = BlobSASPermissions.parse('r')
  const credential = getCredential()

  const sas = generateBlobSASQueryParameters(
    {
      containerName: CONTAINER_NAME,
      blobName,
      permissions,
      expiresOn,
    },
    credential,
  ).toString()

  const blobClient = containerClient.getBlobClient(blobName)
  return { url: `${blobClient.url}?${sas}`, expiresOn }
}

export const deleteBlob = async (blobName: string): Promise<void> => {
  const blobClient = containerClient.getBlobClient(blobName)
  await blobClient.deleteIfExists()
}
