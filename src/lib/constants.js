export const STATUSES = ['Submitted', 'Pending Approval', 'Approved', 'Rejected', 'Completed']
export const OPEN_STATUSES = ['Submitted', 'Pending Approval', 'Approved']
export const PRIORITIES = ['Low', 'Medium', 'High', 'Critical']

export const SLA_DAYS = { Critical: 2, High: 5, Medium: 10, Low: 15 }

export const LIMITS = {
  titleMin: 5,
  titleMax: 120,
  descriptionMin: 10,
  descriptionMax: 2000,
  commentMax: 500,
}

export const STATUS_STYLES = {
  Submitted: 'bg-slate-100 text-slate-700 ring-slate-200',
  'Pending Approval': 'bg-amber-50 text-amber-700 ring-amber-200',
  Approved: 'bg-blue-50 text-blue-700 ring-blue-200',
  Rejected: 'bg-rose-50 text-rose-700 ring-rose-200',
  Completed: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
}

export const STATUS_COLORS = {
  Submitted: '#94a3b8',
  'Pending Approval': '#f59e0b',
  Approved: '#3b82f6',
  Rejected: '#f43f5e',
  Completed: '#10b981',
}

export const PRIORITY_STYLES = {
  Low: 'bg-slate-50 text-slate-600 ring-slate-200',
  Medium: 'bg-sky-50 text-sky-700 ring-sky-200',
  High: 'bg-orange-50 text-orange-700 ring-orange-200',
  Critical: 'bg-red-50 text-red-700 ring-red-200',
}

export const ROLE_LABELS = {
  employee: 'Employee',
  manager: 'Manager',
  admin: 'Administrator',
}

const repo = (import.meta.env.VITE_GITHUB_REPO || '').trim()
export const GITHUB_REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo) ? repo : null
export const GITHUB_URL = GITHUB_REPO ? `https://github.com/${GITHUB_REPO}` : null