import { randomUUID } from 'crypto'

export const nowIso = () => new Date().toISOString()

export const createId = (prefix: string) => `${prefix}_${randomUUID()}`
