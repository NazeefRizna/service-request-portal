import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { friendlyError } from '../lib/errors'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [profileError, setProfileError] = useState(null)
  const [initialising, setInitialising] = useState(true)

  useEffect(() => {
    let active = true

    async function loadProfile(userId) {
      if (!userId) {
        if (active) {
          setProfile(null)
          setProfileError(null)
        }
        return
      }
      const { data, error } = await supabase
        .from('profiles')
        .select('id, email, full_name, role, department_id, department:departments(name)')
        .eq('id', userId)
        .maybeSingle()

      if (!active) return
      if (error) {
        setProfile(null)
        setProfileError(friendlyError(error, 'Unable to load your profile.'))
      } else if (!data) {
        setProfile(null)
        setProfileError('No profile exists for this account. Ask an administrator to provision it.')
      } else {
        setProfile(data)
        setProfileError(null)
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!active) return
      setSession(newSession)
      setProfileError(null)
      // Supabase guidance: never await other Supabase calls inside this callback (it can deadlock).
      setTimeout(() => {
        loadProfile(newSession?.user?.id ?? null).finally(() => {
          if (active) setInitialising(false)
        })
      }, 0)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    })
    if (error) throw error
  }, [])

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut()
    if (error && import.meta.env.DEV) console.error(error)
  }, [])

  const value = useMemo(
    () => ({
      session,
      user: session?.user ?? null,
      profile,
      profileError,
      initialising,
      role: profile?.role ?? null,
      signIn,
      signOut,
    }),
    [session, profile, profileError, initialising, signIn, signOut],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}