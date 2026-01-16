import { format, isAfter, parseISO } from 'date-fns'

export const formatDate = (value?: string | null) => {
  if (!value) return ''
  return format(parseISO(value), 'MMM d, yyyy')
}

export const formatDateTime = (value?: string | null) => {
  if (!value) return ''
  return format(parseISO(value), 'MMM d, yyyy HH:mm')
}

export const isExpired = (value?: string | null) => {
  if (!value) return false
  return isAfter(new Date(), parseISO(value))
}
