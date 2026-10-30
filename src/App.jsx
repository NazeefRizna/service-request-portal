import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { EmptyState } from './components/ui'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Requirements from './pages/Requirements'
import Requests from './pages/Requests'
import NewRequest from './pages/NewRequest'
import RequestDetail from './pages/RequestDetail'
import Approvals from './pages/Approvals'
import Dataset from './pages/Dataset'
import Security from './pages/Security'
import Handover from './pages/Handover'

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="The page you are looking for does not exist."
      action={
        <Link to="/dashboard" className="text-sm font-medium text-indigo-600 hover:underline">
          Go to Dashboard
        </Link>
      }
    />
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/requests" element={<Requests />} />
        <Route path="/requests/new" element={<NewRequest />} />
        <Route path="/requests/:id" element={<RequestDetail />} />
        <Route
          path="/approvals"
          element={
            <ProtectedRoute roles={['manager']}>
              <Approvals />
            </ProtectedRoute>
          }
        />
        <Route path="/dataset" element={<Dataset />} />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="/security" element={<Security />} />
        <Route path="/handover" element={<Handover />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}