import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, CardHeader, Field, PageHeader, Spinner, inputClass } from '../components/ui'
import { fetchLookups, submitRequest } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { validateRequest } from '../lib/validation'
import { LIMITS, PRIORITIES, SLA_DAYS } from '../lib/constants'
import { dueDateFromToday, formatDate } from '../lib/format'

export default function NewRequest() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const [lookups, setLookups] = useState({ departments: [], requestTypes: [] })
  const [loadingLookups, setLoadingLookups] = useState(true)
  const [lookupError, setLookupError] = useState(null)
  const [values, setValues] = useState({
    title: '',
    description: '',
    departmentId: profile?.department_id ? String(profile.department_id) : '',
    requestTypeId: '',
    priority: 'Medium',
  })
  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    fetchLookups()
      .then((data) => {
        if (active) setLookups(data)
      })
      .catch((err) => {
        if (active) setLookupError(friendlyError(err, 'Unable to load form options.'))
      })
      .finally(() => {
        if (active) setLoadingLookups(false)
      })
    return () => {
      active = false
    }
  }, [])

  function update(field) {
    return (event) => {
      const value = event.target.value
      setValues((prev) => ({ ...prev, [field]: value }))
      setErrors((prev) => (prev[field] ? { ...prev, [field]: undefined } : prev))
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (submitting) return
    setSubmitError(null)
    const nextErrors = validateRequest(values, lookups)
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    setSubmitting(true)
    try {
      const created = await submitRequest(values)
      navigate(`/requests/${created.id}`, { state: { created: created.reference } })
    } catch (err) {
      setSubmitError(friendlyError(err, 'Unable to submit the request. Please try again.'))
      setSubmitting(false)
    }
  }

    const dueDate = dueDateFromToday(SLA_DAYS[values.priority] || 0)

  if (loadingLookups) return <Spinner label="Loading form…" />

  return (
    <div>
      <PageHeader
        title="New service request"
        description="Describe what you need. Your request will be routed to a manager for approval."
      />

      {lookupError ? (
        <Alert type="error" title="Form unavailable">
          {lookupError}
        </Alert>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader title="Request details" description="Fields marked * are required." />
            <form onSubmit={handleSubmit} noValidate className="space-y-5 px-5 py-5">
              {submitError && <Alert type="error">{submitError}</Alert>}

              <Field label="Title" htmlFor="title" error={errors.title} required hint={`${LIMITS.titleMin}–${LIMITS.titleMax} characters`}>
                <input
                  id="title"
                  type="text"
                  value={values.title}
                  onChange={update('title')}
                  maxLength={LIMITS.titleMax}
                  className={inputClass}
                  placeholder="e.g. Replacement laptop charger"
                  aria-invalid={Boolean(errors.title)}
                  aria-describedby={errors.title ? 'title-error' : undefined}
                />
              </Field>

              <div className="grid gap-5 sm:grid-cols-3">
                <Field label="Department" htmlFor="departmentId" error={errors.departmentId} required>
                  <select
                    id="departmentId"
                    value={values.departmentId}
                    onChange={update('departmentId')}
                    className={inputClass}
                    aria-invalid={Boolean(errors.departmentId)}
                  >
                    <option value="">Select…</option>
                    {lookups.departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Request type" htmlFor="requestTypeId" error={errors.requestTypeId} required>
                  <select
                    id="requestTypeId"
                    value={values.requestTypeId}
                    onChange={update('requestTypeId')}
                    className={inputClass}
                    aria-invalid={Boolean(errors.requestTypeId)}
                  >
                    <option value="">Select…</option>
                    {lookups.requestTypes.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Priority" htmlFor="priority" error={errors.priority} required>
                  <select id="priority" value={values.priority} onChange={update('priority')} className={inputClass}>
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>

              <Field label="Description" htmlFor="description" error={errors.description} required>
                <textarea
                  id="description"
                  rows={6}
                  value={values.description}
                  onChange={update('description')}
                  maxLength={LIMITS.descriptionMax}
                  className={inputClass}
                  placeholder="What do you need, why, and by when?"
                  aria-invalid={Boolean(errors.description)}
                  aria-describedby={errors.description ? 'description-error' : undefined}
                />
                <p className="mt-1 text-right text-xs text-slate-400">
                  {values.description.length}/{LIMITS.descriptionMax}
                </p>
              </Field>

              <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <Link to="/requests" className="text-sm font-medium text-slate-600 hover:text-slate-900">
                  Cancel
                </Link>
                <Button type="submit" loading={submitting}>
                  {submitting ? 'Submitting…' : 'Submit request'}
                </Button>
              </div>
            </form>
          </Card>

          <Card className="h-fit">
            <CardHeader title="What happens next" />
            <div className="space-y-4 px-5 py-4 text-sm text-slate-600">
              <ol className="list-decimal space-y-1.5 pl-5">
                <li>Your request is recorded as <strong>Submitted</strong>.</li>
                <li>It is routed to <strong>Pending Approval</strong> automatically.</li>
                <li>A manager approves or rejects it with a comment.</li>
                <li>The service desk completes approved requests.</li>
              </ol>
              <div className="rounded-lg bg-slate-50 px-3 py-2.5">
                <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Target resolution</p>
                <p className="mt-0.5 font-medium text-slate-900">
                  {SLA_DAYS[values.priority]} days · by {formatDate(dueDate)}
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}