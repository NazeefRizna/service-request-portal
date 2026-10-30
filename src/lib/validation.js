import { LIMITS, PRIORITIES } from './constants'

// Removes control characters (except tab/newline/CR) and trims whitespace.
export function cleanText(value) {
  return Array.from(String(value ?? ''))
    .filter((ch) => {
      const code = ch.charCodeAt(0)
      return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127)
    })
    .join('')
    .trim()
}

export function validateRequest(values, lookups) {
  const errors = {}
  const title = cleanText(values.title)
  const description = cleanText(values.description)

  if (!title) errors.title = 'Title is required.'
  else if (title.length < LIMITS.titleMin) errors.title = `Title must be at least ${LIMITS.titleMin} characters.`
  else if (title.length > LIMITS.titleMax) errors.title = `Title must be ${LIMITS.titleMax} characters or fewer.`

  if (!description) errors.description = 'Description is required.'
  else if (description.length < LIMITS.descriptionMin)
    errors.description = `Description must be at least ${LIMITS.descriptionMin} characters.`
  else if (description.length > LIMITS.descriptionMax)
    errors.description = `Description must be ${LIMITS.descriptionMax} characters or fewer.`

  const departmentIds = new Set(lookups.departments.map((d) => String(d.id)))
  if (!values.departmentId) errors.departmentId = 'Select a department.'
  else if (!departmentIds.has(String(values.departmentId))) errors.departmentId = 'Select a valid department.'

  const typeIds = new Set(lookups.requestTypes.map((t) => String(t.id)))
  if (!values.requestTypeId) errors.requestTypeId = 'Select a request type.'
  else if (!typeIds.has(String(values.requestTypeId))) errors.requestTypeId = 'Select a valid request type.'

  if (!PRIORITIES.includes(values.priority)) errors.priority = 'Select a valid priority.'

  return errors
}

export function validateComment(comment, { required = false } = {}) {
  const text = cleanText(comment)
  if (required && !text) return 'A comment is required when rejecting a request.'
  if (text.length > LIMITS.commentMax) return `Comment must be ${LIMITS.commentMax} characters or fewer.`
  return null
}