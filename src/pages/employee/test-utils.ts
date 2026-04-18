import type { ResponseRecord, TestComponent } from '../../types'

export const buildFormValues = (
  components: TestComponent[],
  responses: ResponseRecord[],
): Record<string, unknown> => {
  const responseMap = new Map(responses.map((r) => [r.questionId, r]))
  const values: Record<string, unknown> = {}
  for (const component of components) {
    if (component.type === 'info') continue
    const response = responseMap.get(component.id)
    if (!response) continue
    if (component.type === 'text') {
      values[`q_${component.id}`] = response.textAnswer ?? undefined
    } else {
      values[`q_${component.id}`] = response.answer ?? undefined
    }
  }
  return values
}
