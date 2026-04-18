interface OptionInput {
  id?: string
  label?: string
  imageId?: string | null
}

export interface NormalisedOption {
  id: string
  label: string
  imageId?: string | null
}

export const normaliseOptions = (
  options?: OptionInput[],
): { data?: NormalisedOption[]; error?: string } => {
  const mapped = (Array.isArray(options) ? options : []).map((option) => {
    const imageId = option.imageId?.trim() || null
    return {
      id: option.id?.trim() ?? '',
      label: option.label?.trim() ?? '',
      ...(imageId ? { imageId } : {}),
    }
  })

  if (mapped.some((option) => option.id && !option.label)) {
    return { error: 'Every option must have a label.' }
  }

  return { data: mapped.filter((option) => option.id && option.label) }
}
