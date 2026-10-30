// Error codes raised deliberately by our database functions; their messages are safe to show.
const SAFE_DB_CODES = new Set(['22023', '42501', 'P0002', '28000'])

export function friendlyError(error, fallback = 'Something went wrong. Please try again.') {
  if (!error) return null
  if (import.meta.env.DEV) console.error(error)

  const message = typeof error.message === 'string' ? error.message : ''

  if (error.code && SAFE_DB_CODES.has(error.code) && message) return message

  if (error.__isAuthError) {
    if (/invalid login credentials/i.test(message)) return 'Incorrect email or password.'
    if (/rate limit|too many/i.test(message)) return 'Too many attempts. Please wait a moment and try again.'
    return message || fallback
  }

  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    return 'Unable to reach the server. Check your connection and try again.'
  }

  if (error.code === 'PGRST301' || /jwt expired/i.test(message)) {
    return 'Your session has expired. Please sign in again.'
  }

  return fallback
}