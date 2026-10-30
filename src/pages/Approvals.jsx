import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge } from '../components/ui'
import { DecisionPanel } from '../components/RequestActions'
import { fetchPendingApprovals, isOverdue } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { formatDate } from '../lib/format'

const PRIORITY_RANK = { Critical: 0, High: 1, Medium: 2, Low: 3 }

export default function Approvals() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)

  const load = useCallback(async () => {
    try {
      const data = await fetchPendingApprovals()
      setRows(data)
      setError(null)
    } catch (err) {
      setError(friendlyError(err, 'Unable to load the approval queue.'))
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  function refresh() {
    setRefreshing(true)
    load()
  }

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9) ||
          new Date(a.submitted_at) - new Date(b.submitted_at),
      ),
    [rows],
  )

  function handleDone(decision, updated) {
    setRows((prev) => prev.filter((r) => r.id !== updated.id))
    setNotice(`${updated.reference} ${decision === 'Approved' ? 'approved' : 'rejected'}.`)
  }

  return (
    <div>
      <PageHeader
        title="Approval queue"
        description="Requests awaiting a manager decision, highest priority first. Rejections require a comment."
        actions={
          <Button variant="secondary" onClick={refresh} loading={refreshing}>
            {!refreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
            Refresh
          </Button>
        }
      />

      {notice && (
        <div className="mb-4">
          <Alert type="success" onDismiss={() => setNotice(null)}>
            {notice}
          </Alert>
        </div>
      )}
      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      {loading ? (
        <Spinner label="Loading approval queue…" />
      ) : sorted.length === 0 ? (
        <EmptyState title="Queue is clear" description="There are no requests waiting for approval." />
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-slate-500">{sorted.length} request(s) pending</p>
          {sorted.map((r) => {
            const overdue = isOverdue(r)
            const own = r.requester_id === profile.id
            return (
              <Card key={r.id} className="p-5">
                <div className="grid gap-5 lg:grid-cols-5">
                  <div className="min-w-0 lg:col-span-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link to={`/requests/${r.id}`} className="font-mono text-xs font-medium text-indigo-600 hover:underline">
                        {r.reference}
                      </Link>
                      <PriorityBadge priority={r.priority} />
                      <StatusBadge status={r.status} />
                      {overdue && (
                        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-200">
                          Overdue
                        </span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-semibold text-slate-900">{r.title}</h2>
                    <p className="mt-1 line-clamp-3 text-sm text-slate-600">{r.description}</p>
                    <p className="mt-3 text-xs text-slate-500">
                      {r.requester?.full_name} · {r.department?.name} · {r.request_type?.name} · Submitted{' '}
                      {formatDate(r.submitted_at)} · Due {formatDate(r.due_date)}
                    </p>
                  </div>
                  <div className="lg:col-span-2 lg:border-l lg:border-slate-100 lg:pl-5">
                    {own ? (
                      <p className="text-sm text-slate-500">
                        This is your own request. Another manager must approve or reject it.
                      </p>
                    ) : (
                      <DecisionPanel request={r} onDone={handleDone} />
                    )}
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}