// CSV/JSON export helpers with protection against CSV/spreadsheet formula injection.
const FORMULA_PREFIXES = ['=', '+', '-', '@', '\t', '\r']

function csvCell(value) {
  if (value === null || value === undefined) return ''
  let text = String(value)
  if (FORMULA_PREFIXES.some((p) => text.startsWith(p))) text = `'${text}`
  if (/[",\n\r]/.test(text)) text = `"${text.replace(/"/g, '""')}"`
  return text
}

export function toCSV(rows, columns) {
  const header = columns.map((c) => csvCell(c.label)).join(',')
  const lines = rows.map((row) => columns.map((c) => csvCell(row[c.key])).join(','))
  return `\uFEFF${[header, ...lines].join('\r\n')}`
}

export function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Data minimisation: exports include the requester's name but not their email address.
export function flattenRequest(r) {
  return {
    reference: r.reference,
    title: r.title,
    description: r.description,
    department: r.department?.name ?? '',
    request_type: r.request_type?.name ?? '',
    priority: r.priority,
    status: r.status,
    requester: r.requester?.full_name ?? '',
    submitted_at: r.submitted_at,
    due_date: r.due_date,
    decided_at: r.decided_at ?? '',
    decided_by: r.decider?.full_name ?? '',
    decision_comment: r.decision_comment ?? '',
    completed_at: r.completed_at ?? '',
  }
}

export const EXPORT_COLUMNS = [
  { key: 'reference', label: 'reference' },
  { key: 'title', label: 'title' },
  { key: 'description', label: 'description' },
  { key: 'department', label: 'department' },
  { key: 'request_type', label: 'request_type' },
  { key: 'priority', label: 'priority' },
  { key: 'status', label: 'status' },
  { key: 'requester', label: 'requester' },
  { key: 'submitted_at', label: 'submitted_at' },
  { key: 'due_date', label: 'due_date' },
  { key: 'decided_at', label: 'decided_at' },
  { key: 'decided_by', label: 'decided_by' },
  { key: 'decision_comment', label: 'decision_comment' },
  { key: 'completed_at', label: 'completed_at' },
]