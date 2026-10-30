import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { ClipboardCheck, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Field, inputClass } from '../components/ui'
import { friendlyError } from '../lib/errors'
import { DEMO_MODE, DEMO_PASSWORD } from '../lib/constants'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const DEMO_ACCOUNTS = [
  { email: 'employee1@demo.local', name: 'Alex Employee', role: 'Employee', dept: 'IT' },
  { email: 'employee2@demo.local', name: 'Sam Employee', role: 'Employee', dept: 'Finance' },
  { email: 'manager@demo.local', name: 'Morgan Manager', role: 'Manager', dept: 'Operations' },
  { email: 'admin@demo.local', name: 'Jordan Admin', role: 'Administrator', dept: 'IT' },
]

const ROLE_STYLES = {
  Employee: 'bg-slate-100 text-slate-700',
  Manager: 'bg-amber-50 text-amber-700',
  Administrator: 'bg-indigo-50 text-indigo-700',
}

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
  const canAutofill = DEMO_MODE && DEMO_PASSWORD.length > 0

  if (session) return <Navigate to={redirectTo} replace />

  function validate() {
    const next = {}
    if (!email.trim()) next.email = 'Email is required.'
    else if (!EMAIL_PATTERN.test(email.trim())) next.email = 'Enter a valid email address.'
    if (!password) next.password = 'Password is required.'
    return next
  }

  function fillDemo(account) {
    setEmail(account.email)
    setPassword(canAutofill ? DEMO_PASSWORD : '')
    setErrors({})
    setFormError(null)
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

          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Demo accounts</p>
              {canAutofill && (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200">
                  Click to autofill
                </span>
              )}
            </div>
            <ul className="mt-3 space-y-1.5">
              {DEMO_ACCOUNTS.map((a) => {
                const selected = email === a.email
                return (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => fillDemo(a)}
                      className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                        selected
                          ? 'border-indigo-300 bg-indigo-50/60'
                          : 'border-transparent hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700">
                        {a.name
                          .split(' ')
                          .map((p) => p[0])
                          .join('')}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-slate-900">{a.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {a.email} · {a.dept}
                        </span>
                      </span>
                      <span className={`shrink-0 rounded-md px-2 py-0.5 text-[11px] font-medium ${ROLE_STYLES[a.role]}`}>
                        {a.role}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-slate-500">
              {canAutofill
                ? 'Demo environment: accounts use a shared demo-only password and contain fictional data.'
                : 'Select an account to fill in the email. Passwords are provided separately by the administrator.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}