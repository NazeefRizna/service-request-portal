import { Link, Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import ProtectedRoute from './components/ProtectedRoute'
import { EmptyState } from './components/ui'
import Login from './pages/Login'
import Requirements from './pages/Requirements'

function NotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This page does not exist or has not been built yet."
      action={
        <Link to="/requirements" className="text-sm font-medium text-indigo-600 hover:underline">
          Go to Requirements
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
        <Route index element={<Navigate to="/requirements" replace />} />
        <Route path="/requirements" element={<Requirements />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}