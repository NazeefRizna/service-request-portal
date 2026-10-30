import { useCallback, useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Card, CardHeader, EmptyState, PriorityBadge, Spinner, StatusBadge } from '../components/ui'
import StatusHistory from '../components/StatusHistory'
import { CompletePanel, DecisionPanel } from '../components/RequestActions'
import { fetchHistory, fetchRequestById, isOverdue } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { formatDate, formatDateTime } from '../lib/format'

function Meta({ label, children }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1 text-sm text-slate-900">{children}</dd>
    </div>
  )
}

export default function RequestDetail() {
  const { id } = useParams()
  const location = useLocation()
  const { profile } = useAuth()
  const requestId = /^\d+$/.test(id || '') ? Number(id) : null

  const [request, setRequest] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(Boolean(requestId))
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(
    location.state?.created ? `Request ${location.state.created} submitted and routed for approval.` : null,
  )

  const load = useCallback(async () => {
    if (!requestId) return
    try {
      const [req, hist] = await Promise.all([fetchRequestById(requestId), fetchHistory(requestId)])
      setRequest(req)
      setHistory(hist)
      setError(null)
    } catch (err) {
      setError(friendlyError(err, 'Unable to load this request.'))
    } finally {
      setLoading(false)
    }
  }, [requestId])

  useEffect(() => {
    load()
  }, [load])

  function handleDecision(decision, updated) {
    setNotice(`Request ${updated?.reference || ''} ${decision === 'Approved' ? 'approved' : 'rejected'}.`)
    load()
  }

  function handleComplete(updated) {
    setNotice(`Request ${updated?.reference || ''} marked as completed.`)
    load()
  }

  const backLink = (
    <Link to="/requests" className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to requests
    </Link>
  )

  if (loading) return <Spinner label="Loading request…" />

  if (error) {
    return (
      <div>
        {backLink}
        <Alert type="error">{error}</Alert>
      </div>
    )
  }

  if (!request) {
    return (
      <div>
        {backLink}
        <EmptyState
          title="Request not found"
          description="This request does not exist or you do not have permission to view it."
        />
      </div>
    )
  }

  const overdue = isOverdue(request)
  const isOwnRequest = request.requester_id === profile.id
  const canDecide = profile.role === 'manager' && request.status === 'Pending Approval' && !isOwnRequest
  const canComplete = profile.role === 'admin' && request.status === 'Approved'

  return (
    <div>
      {backLink}

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-mono text-xs text-slate-500">{request.reference}</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">{request.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <PriorityBadge priority={request.priority} />
          <StatusBadge status={request.status} />
        </div>
      </div>

      {notice && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <div className="space-y-5 px-5 py-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{request.description}</p>
              <dl className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
                <Meta label="Department">{request.department?.name}</Meta>
                <Meta label="Request type">{request.request_type?.name}</Meta>
                <Meta label="Requester">{request.requester?.full_name}</Meta>
                <Meta label="Submitted">{formatDateTime(request.submitted_at)}</Meta>
                <Meta label="Due date">
                  <span className={overdue ? 'font-medium text-rose-600' : ''}>
                    {formatDate(request.due_date)}
                    {overdue && ' (overdue)'}
                  </span>
                </Meta>
                <Meta label="Last updated">{formatDateTime(request.updated_at)}</Meta>
                {request.decided_at && (
                  <>
                    <Meta label={request.status === 'Rejected' ? 'Rejected' : 'Approved'}>
                      {formatDateTime(request.decided_at)}
                    </Meta>
                    <Meta label="Decided by">{request.decider?.full_name || '—'}</Meta>
                  </>
                )}
                {request.completed_at && <Meta label="Completed">{formatDateTime(request.completed_at)}</Meta>}
              </dl>
              {request.decision_comment && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Decision comment</p>
                  <p className="mt-1 text-sm text-slate-700">{request.decision_comment}</p>
                </div>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Status history" description="Every lifecycle change, recorded automatically by the database." />
            <StatusHistory history={history} />
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader title="Actions" />
            <div className="px-5 py-4">
              {canDecide && <DecisionPanel request={request} onDone={handleDecision} />}
              {canComplete && <CompletePanel request={request} onDone={handleComplete} />}
              {!canDecide && !canComplete && (
                <p className="text-sm text-slate-500">
                  {profile.role === 'manager' && request.status === 'Pending Approval' && isOwnRequest
                    ? 'You cannot approve or reject your own request. Another manager must decide.'
                    : request.status === 'Pending Approval'
                      ? 'Waiting for a manager to approve or reject this request.'
                      : request.status === 'Approved'
                        ? 'Approved. Waiting for the service desk to complete this request.'
                        : 'No further actions. This request is closed.'}
                </p>
              )}
            </div>
          </Card>

          <Card>
            <CardHeader title="Lifecycle" />
            <ol className="space-y-2 px-5 py-4 text-sm">
              {['Submitted', 'Pending Approval', 'Approved / Rejected', 'Completed'].map((step) => {
                const reached =
                  step === 'Approved / Rejected'
                    ? history.some((h) => h.to_status === 'Approved' || h.to_status === 'Rejected')
                    : history.some((h) => h.to_status === step)
                return (
                  <li key={step} className="flex items-center gap-2">
                    <span className={`h-2 w-2 rounded-full ${reached ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                    <span className={reached ? 'font-medium text-slate-900' : 'text-slate-400'}>{step}</span>
                  </li>
                )
              })}
            </ol>
          </Card>
        </div>
      </div>
    </div>
  )
}