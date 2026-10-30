import { createClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL || '').trim()
const key = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim()

// Defence in depth: refuse to start if a privileged key was put in the frontend by mistake.
function isPrivilegedKey(value) {
  if (value.startsWith('sb_secret_')) return true
  const parts = value.split('.')
  if (parts.length === 3) {
    try {
      const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
      return payload.role === 'service_role'
    } catch {
      return false
    }
  }
  return false
}

function resolveConfigError() {
  if (!url || !key) {
    return 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and add your Supabase project values.'
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
    return 'VITE_SUPABASE_URL must look like https://your-project-ref.supabase.co (no trailing slash).'
  }
  if (isPrivilegedKey(key)) {
    return 'Refusing to start: a privileged Supabase secret/service-role key was supplied. Use the publishable (anon) key only.'
  }
  return null
}

export const configError = resolveConfigError()

export const supabase = configError
  ? null
  : createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })