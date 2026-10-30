import { useEffect, useMemo, useState } from 'react'
import { Braces, FileSpreadsheet } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Alert, Button, Card, CardHeader, PageHeader, PriorityBadge, Spinner, StatusBadge } from '../components/ui'
import { fetchRequests } from '../lib/api'
import { friendlyError } from '../lib/errors'
import { EXPORT_COLUMNS, downloadFile, flattenRequest, toCSV } from '../lib/export'
import { formatDate, todayISO } from '../lib/format'
import { STATUSES } from '../lib/constants'

const DICTIONARY = [
  { table: 'service_requests', field: 'id', type: 'bigint (PK, identity)', description: 'Internal surrogate key. Never shown to users.' },
  { table: 'service_requests', field: 'reference', type: 'text (unique)', description: 'Human-readable request number, e.g. SR-1001, generated from a sequence.' },
  { table: 'service_requests', field: 'title', type: 'text, 5–120 chars', description: 'Short summary of the request.' },
  { table: 'service_requests', field: 'description', type: 'text, 10–2000 chars', description: 'Full details of what is needed and why.' },
  { table: 'service_requests', field: 'department_id', type: 'smallint (FK → departments)', description: 'Department the request is raised for.' },
  { table: 'service_requests', field: 'request_type_id', type: 'smallint (FK → request_types)', description: 'Category of request, e.g. Hardware, Travel.' },
  { table: 'service_requests', field: 'priority', type: 'text (Low | Medium | High | Critical)', description: 'Business urgency; drives the SLA due date.' },
  { table: 'service_requests', field: 'status', type: 'text (lifecycle enum)', description: 'Submitted → Pending Approval → Approved / Rejected → Completed. Transitions enforced by a trigger.' },
  { table: 'service_requests', field: 'requester_id', type: 'uuid (FK → profiles)', description: 'Employee who submitted the request; set server-side from the session.' },
  { table: 'service_requests', field: 'submitted_at', type: 'timestamptz', description: 'When the request was submitted.' },
  { table: 'service_requests', field: 'due_date', type: 'date', description: 'SLA target: Critical 2, High 5, Medium 10, Low 15 days after submission.' },
  { table: 'service_requests', field: 'decided_at', type: 'timestamptz (nullable)', description: 'When a manager approved or rejected the request.' },
  { table: 'service_requests', field: 'decided_by', type: 'uuid (FK → profiles, nullable)', description: 'Manager who made the decision.' },
  { table: 'service_requests', field: 'decision_comment', type: 'text ≤ 500 (nullable)', description: 'Reason for the decision; mandatory for rejections.' },
  { table: 'service_requests', field: 'completed_at', type: 'timestamptz (nullable)', description: 'When the service desk completed the request.' },
  { table: 'service_requests', field: 'created_at / updated_at', type: 'timestamptz', description: 'Audit timestamps; updated_at is maintained by a trigger.' },
  { table: 'request_status_history', field: 'request_id', type: 'bigint (FK → service_requests, cascade)', description: 'Request whose status changed.' },
  { table: 'request_status_history', field: 'from_status / to_status', type: 'text', description: 'Previous and new status (from_status is null on creation).' },
  { table: 'request_status_history', field: 'changed_by', type: 'uuid (FK → profiles)', description: 'User whose action caused the change.' },
  { table: 'request_status_history', field: 'comment / changed_at', type: 'text ≤ 500 / timestamptz', description: 'Comment and time of the change. Written only by a database trigger.' },
  { table: 'profiles', field: 'id, email, full_name', type: 'uuid (FK → auth.users), text', description: 'User profile linked 1:1 to the Supabase Auth account.' },
  { table: 'profiles', field: 'role', type: 'text (employee | manager | admin)', description: 'Authorisation role used by RLS policies and RPC checks. Users cannot change it.' },
  { table: 'profiles', field: 'department_id', type: 'smallint (FK → departments)', description: 'Home department of the user.' },
  { table: 'departments / request_types', field: 'id, name', type: 'smallint, text (unique)', description: 'Reference data used for dropdowns and reporting.' },
]

export default function Dataset() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let active = true
    fetchRequests()
      .then((data) => {
        if (active) setRows(data)
      })
      .catch((err) => {
        if (active) setError(friendlyError(err, 'Unable to load the dataset.'))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  const flat = useMemo(() => rows.map(flattenRequest), [rows])

  const summary = useMemo(() => {
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]))
    rows.forEach((r) => {
      byStatus[r.status] = (byStatus[r.status] || 0) + 1
    })
    return {
      departments: new Set(rows.map((r) => r.department?.name)).size,
      types: new Set(rows.map((r) => r.request_type?.name)).size,
      byStatus,
    }
  }, [rows])

  function exportCSV() {
    downloadFile(toCSV(flat, EXPORT_COLUMNS), `service-requests-${todayISO()}.csv`, 'text/csv;charset=utf-8')
  }

  function exportJSON() {
    const payload = {
      generated_at: new Date().toISOString(),
      exported_by_role: profile.role,
      record_count: flat.length,
      records: flat,
    }
    downloadFile(JSON.stringify(payload, null, 2), `service-requests-${todayISO()}.json`, 'application/json')
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dataset & export"
        description="Fictional sample dataset of internal service requests. Exports contain only the records you are authorised to see."
        actions={
          <>
            <Button variant="secondary" onClick={exportCSV} disabled={loading || flat.length === 0}>
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              Export CSV
            </Button>
            <Button variant="secondary" onClick={exportJSON} disabled={loading || flat.length === 0}>
              <Braces className="h-4 w-4" aria-hidden="true" />
              Export JSON
            </Button>
          </>
        }
      />

      {error && <Alert type="error">{error}</Alert>}

      {loading ? (
        <Spinner label="Loading dataset…" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Records</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">{rows.length}</p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">Departments / request types</p>
              <p className="mt-2 text-3xl font-semibold text-slate-900">
                {summary.departments} / {summary.types}
              </p>
            </Card>
            <Card className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-slate-500">By status</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(summary.byStatus).map(([s, c]) => (
                  <span key={s} className="text-xs text-slate-600">
                    {s}: <strong className="text-slate-900">{c}</strong>
                  </span>
                ))}
              </div>
            </Card>
          </div>

          <Alert type="info" title="Data privacy">
            All records, names and descriptions are fictional and generated for demonstration. No real personal information is used.
            Exports include requester names but deliberately exclude email addresses (data minimisation).
          </Alert>

          <Card className="overflow-hidden">
            <CardHeader title="Records" description="Preview of the exported data" />
            <div className="max-h-[480px] overflow-auto">
              <table className="min-w-full text-sm">
                <thead className="sticky top-0 bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Reference</th>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Department</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Due</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs">{r.reference}</td>
                      <td className="max-w-xs truncate px-4 py-2.5 text-slate-900">{r.title}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{r.department?.name}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{r.request_type?.name}</td>
                      <td className="px-4 py-2.5">
                        <PriorityBadge priority={r.priority} />
                      </td>
                      <td className="px-4 py-2.5">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.submitted_at)}</td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(r.due_date)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      <Card className="overflow-hidden">
        <CardHeader title="Data dictionary" description="Every database field and its purpose" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3">Table</th>
                <th className="px-4 py-3">Field</th>
                <th className="px-4 py-3">Type / constraint</th>
                <th className="px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {DICTIONARY.map((d) => (
                <tr key={`${d.table}-${d.field}`} className="align-top">
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs text-slate-500">{d.table}</td>
                  <td className="whitespace-nowrap px-4 py-2.5 font-mono text-xs font-medium text-slate-900">{d.field}</td>
                  <td className="px-4 py-2.5 text-xs text-slate-600">{d.type}</td>
                  <td className="px-4 py-2.5 text-slate-600">{d.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}