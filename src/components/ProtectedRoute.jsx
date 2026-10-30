import { Navigate, useLocation } from 'react-router-dom'
import { ShieldAlert } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, FullPageSpinner } from './ui'
import { ROLE_LABELS } from '../lib/constants'

function AccessDenied({ roles }) {
  return (
    <Card className="mx-auto mt-10 max-w-lg px-6 py-10 text-center">
      <ShieldAlert className="mx-auto h-10 w-10 text-rose-500" aria-hidden="true" />
      <h1 className="mt-4 text-lg font-semibold text-slate-900">Access denied</h1>
      <p className="mt-1 text-sm text-slate-500">
        This page is restricted to: {roles.map((r) => ROLE_LABELS[r] || r).join(', ')}.
      </p>
    </Card>
  )
}

// Frontend guard for usability only. Authorization is enforced in the database (RLS + RPC role checks).
export default function ProtectedRoute({ roles, children }) {
  const { session, profile, profileError, initialising, signOut } = useAuth()
  const location = useLocation()

  if (initialising) return <FullPageSpinner label="Checking your session…" />

  if (!session) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
  }

  if (!profile || profile.id !== session.user.id) {
    if (profileError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <div className="w-full max-w-md">
            <Alert type="error" title="Account not ready">
              {profileError}
            </Alert>
            <Button className="mt-4" variant="secondary" onClick={signOut}>
              Sign out
            </Button>
          </div>
        </div>
      )
    }
    return <FullPageSpinner label="Loading your profile…" />
  }

  if (roles && !roles.includes(profile.role)) return <AccessDenied roles={roles} />

  return children
}