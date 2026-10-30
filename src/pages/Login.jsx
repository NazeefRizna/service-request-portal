import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardCheck, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Field, inputClass } from '../components/ui'
import { friendlyError } from '../lib/errors'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEMO_ACCOUNTS = [
  { email: 'employee1@demo.local', role: 'Employee' },
  { email: 'manager@demo.local', role: 'Manager' },
  { email: 'admin@demo.local', role: 'Administrator' },
]

const FEATURES = [
  { icon: ClipboardCheck, text: 'Submit and track internal service requests' },
  { icon: ShieldCheck, text: 'Role-based approvals with a full audit trail' },
  { icon: LayoutDashboard, text: 'Live operational dashboard and SLA tracking' },
]

// Only allow same-site relative redirects (prevents open-redirect via router state).
function safeRedirect(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//') ? value : '/'
}

export default function Login() {
  const { session, signIn } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const redirectTo = safeRedirect(location.state?.from)

  if (session) return <Navigate to={redirectTo} replace />

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    return next
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setFormError(null)
    const next = validate()
    setErrors(next)
    if (Object.keys(next).length > 0) return

    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate(redirectTo, { replace: true })
    } catch (error) {
      setFormError(friendlyError(error, 'Sign-in failed. Please try again.'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden flex-col justify-between bg-slate-900 p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold">SD</div>
          <span className="text-lg font-semibold">ServiceDesk</span>
        </div>
        <div>
          <h1 className="text-3xl font-semibold leading-tight">
            One place for every
            <br />
            internal service request.
          </h1>
          <ul className="mt-8 space-y-4">
            {FEATURES.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-slate-300">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-800">
                  <Icon className="h-4 w-4 text-indigo-400" aria-hidden="true" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-slate-500">Internal use only. All activity is logged.</p>
      </div>

      <div className="flex items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900">Sign in</h2>
          <p className="mt-1 text-sm text-slate-500">Use your organisation account to continue.</p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-5">
            {formError && <Alert type="error">{formError}</Alert>}

            <Field label="Email address" htmlFor="email" error={errors.email} required>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'email-error' : undefined}
                maxLength={254}
              />
            </Field>

            <Field label="Password" htmlFor="password" error={errors.password} required>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputClass}
                aria-invalid={Boolean(errors.password)}
                aria-describedby={errors.password ? 'password-error' : undefined}
                maxLength={128}
              />
            </Field>

            <Button type="submit" loading={submitting} className="w-full">
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Demo accounts</p>
            <ul className="mt-2 space-y-1 text-sm">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="flex justify-between gap-2">
                  <button
                    type="button"
                    className="truncate text-indigo-600 hover:underline"
                    onClick={() => setEmail(a.email)}
                  >
                    {a.email}
                  </button>
                  <span className="text-slate-500">{a.role}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-slate-500">Passwords are provided separately by the administrator.</p>
          </div>
        </div>
      </div>
    </div>
  )
}