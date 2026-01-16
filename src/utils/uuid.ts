export const createUUID = (): string => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }

  const random = () =>
    Math.floor((1 + Math.random()) * 0x10000)
      .toString(16)
      .substring(1)

  return `${random()}${random()}-${random()}-${random()}-${random()}-${random()}${random()}${random()}`
}
