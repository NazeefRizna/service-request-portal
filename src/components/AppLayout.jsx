import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  BookOpen,
  ClipboardCheck,
  ClipboardList,
  Database,
  FilePlus2,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  ShieldCheck,
  X,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { GITHUB_REPO, GITHUB_URL, ROLE_LABELS } from '../lib/constants'

const NAV = [
  {
    section: 'Overview',
    items: [{ to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard }],
  },
  {
    section: 'Workflow',
    items: [
      { to: '/requests', label: 'Requests', icon: ClipboardList, end: true },
      { to: '/requests/new', label: 'New Request', icon: FilePlus2 },
      { to: '/approvals', label: 'Approvals', icon: ClipboardCheck, roles: ['manager'] },
    ],
  },
  {
    section: 'Data',
    items: [{ to: '/dataset', label: 'Dataset & Export', icon: Database }],
  },
  {
    section: 'Governance',
    items: [
      { to: '/requirements', label: 'Requirements', icon: FileText },
      { to: '/security', label: 'Security & CI/CD', icon: ShieldCheck },
      { to: '/handover', label: 'AI Log & Handover', icon: BookOpen },
    ],
  },
]

function Sidebar({ onNavigate }) {
  const { profile, signOut } = useAuth()
  const role = profile?.role

  return (
    <div className="flex h-full flex-col bg-slate-900 text-slate-300">
      <div className="flex h-14 items-center gap-2.5 border-b border-slate-800 px-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-sm font-bold text-white">
          SD
        </div>
        <div className="leading-tight">
          <p className="text-sm font-semibold text-white">ServiceDesk</p>
          <p className="text-[11px] text-slate-400">Request Management</p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5" aria-label="Main navigation">
        {NAV.map((group) => {
          const items = group.items.filter((item) => !item.roles || item.roles.includes(role))
          if (items.length === 0) return null
          return (
            <div key={group.section}>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {group.section}
              </p>
              <ul className="space-y-0.5">
                {items.map(({ to, label, icon: Icon, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={onNavigate}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                          isActive ? 'bg-slate-800 font-medium text-white' : 'hover:bg-slate-800/60 hover:text-white'
                        }`
                      }
                    >
                      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-slate-800 p-4">
        {GITHUB_URL && (
          <a
            href={GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="truncate">{GITHUB_REPO}</span>
          </a>
        )}
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs font-semibold text-white">
            {(profile?.full_name || '?')
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')
              .toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{profile?.full_name}</p>
            <p className="truncate text-xs text-slate-400">
              {ROLE_LABELS[role] || role}
              {profile?.department?.name ? ` · ${profile.department.name}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={signOut}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
            aria-label="Sign out"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const { profile } = useAuth()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden w-64 shrink-0 lg:block">
        <div className="fixed inset-y-0 w-64">
          <Sidebar />
        </div>
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute -right-11 top-3 rounded-lg bg-slate-900 p-2 text-white"
              aria-label="Close menu"
            >
              <X className="h-5 w-5" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p className="truncate text-sm text-slate-500">Internal Service Request Management Portal</p>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700 ring-1 ring-inset ring-indigo-200 sm:inline">
              {ROLE_LABELS[profile?.role] || profile?.role}
            </span>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}