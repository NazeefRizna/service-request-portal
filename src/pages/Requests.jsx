import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { FilePlus2, RefreshCw } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, EmptyState, PageHeader, PriorityBadge, Spinner, StatusBadge, inputClass } from '../components/ui'
import { fetchRequests, isOverdue } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { PRIORITIES, STATUSES } from '../lib/constants'
import { formatDate } from '../lib/format'

export default function Requests() {
  const { profile } = useAuth()
  const navigate = useNavigate()
  const staffView = profile.role !== 'employee'

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [department, setDepartment] = useState('')
  const [priority, setPriority] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let active = true
    fetchRequests()
      .then((data) => {
        if (!active) return
        setRows(data)
        setError(null)
      })
      .catch((err) => {
        if (active) setError(friendlyError(err, 'Unable to load requests.'))
      })
      .finally(() => {
        if (active) {
          setLoading(false)
          setRefreshing(false)
        }
      })
    return () => {
      active = false
    }
  }, [reloadKey])

  function refresh() {
    setRefreshing(true)
    setReloadKey((k) => k + 1)
  }

  const departments = useMemo(
    () => [...new Set(rows.map((r) => r.department?.name).filter(Boolean))].sort(),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(
      (r) =>
        (!q || r.title.toLowerCase().includes(q) || r.reference.toLowerCase().includes(q)) &&
        (!status || r.status === status) &&
        (!department || r.department?.name === department) &&
        (!priority || r.priority === priority),
    )
  }, [rows, search, status, department, priority])

  const hasFilters = search || status || department || priority

  return (
    <div>
      <PageHeader
        title={staffView ? 'All requests' : 'My requests'}
        description={
          staffView
            ? 'Every service request across the organisation.'
            : 'Requests you have submitted. Only you, managers and administrators can see them.'
        }
        actions={
          <>
            <Button variant="secondary" onClick={refresh} loading={refreshing}>
              {!refreshing && <RefreshCw className="h-4 w-4" aria-hidden="true" />}
              Refresh
            </Button>
            <Link
              to="/requests/new"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
            >
              <FilePlus2 className="h-4 w-4" aria-hidden="true" />
              New request
            </Link>
          </>
        }
      />

      {error && (
        <div className="mb-4">
          <Alert type="error">{error}</Alert>
        </div>
      )}

      <Card className="mb-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search title or reference"
            className={`${inputClass} lg:col-span-2`}
            aria-label="Search requests"
            maxLength={100}
          />
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass} aria-label="Filter by status">
            <option value="">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select value={department} onChange={(e) => setDepartment(e.target.value)} className={inputClass} aria-label="Filter by department">
            <option value="">All departments</option>
            {departments.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value)} className={inputClass} aria-label="Filter by priority">
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </Card>

      {loading ? (
        <Spinner label="Loading requests…" />
      ) : filtered.length === 0 ? (
        <EmptyState
          title={hasFilters ? 'No requests match your filters' : 'No requests yet'}
          description={hasFilters ? 'Try clearing one or more filters.' : 'Submitted requests will appear here.'}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Reference</th>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Department</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Priority</th>
                  <th className="px-4 py-3">Status</th>
                  {staffView && <th className="px-4 py-3">Requester</th>}
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => {
                  const overdue = isOverdue(r)
                  return (
                    <tr key={r.id} onClick={() => navigate(`/requests/${r.id}`)} className="cursor-pointer hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">
                        <Link
                          to={`/requests/${r.id}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-medium text-indigo-600 hover:underline"
                        >
                          {r.reference}
                        </Link>
                      </td>
                      <td className="max-w-xs truncate px-4 py-3 font-medium text-slate-900">{r.title}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.department?.name}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.request_type?.name}</td>
                      <td className="px-4 py-3">
                        <PriorityBadge priority={r.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={r.status} />
                      </td>
                      {staffView && <td className="whitespace-nowrap px-4 py-3 text-slate-600">{r.requester?.full_name}</td>}
                      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(r.submitted_at)}</td>
                      <td className={`whitespace-nowrap px-4 py-3 ${overdue ? 'font-medium text-rose-600' : 'text-slate-600'}`}>
                        {formatDate(r.due_date)}
                        {overdue && <span className="ml-1.5 text-xs">(overdue)</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
            Showing {filtered.length} of {rows.length} requests
          </div>
        </Card>
      )}
    </div>
  )
}