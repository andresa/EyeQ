export const EXPIRABLE_STATUSES = ['assigned', 'opened', 'in-progress']

export interface TestInstanceDoc {
  id: string
  employeeId: string
  testId: string
  status: string
  expiresAt?: string | null
  [key: string]: unknown
}

export const isInstanceExpired = (instance: TestInstanceDoc): boolean =>
  EXPIRABLE_STATUSES.includes(instance.status) &&
  !!instance.expiresAt &&
  new Date(instance.expiresAt) < new Date()

type ItemAccessor = {
  item: (
    id: string,
    partitionKey: string,
  ) => {
    replace: (doc: unknown) => Promise<unknown>
  }
}

export const expireInstance = async (
  container: ItemAccessor,
  instance: TestInstanceDoc,
): Promise<boolean> => {
  if (!isInstanceExpired(instance)) return false
  await container.item(instance.id, instance.employeeId).replace({
    ...instance,
    status: 'expired',
  })
  return true
}
