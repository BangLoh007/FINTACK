import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

function ProtectedRoute() {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return <p role="status" className="p-6 text-sm text-gray-600">Checking your session...</p>
  }

  return user ? <Outlet /> : <Navigate to="/login" replace />
}

export default ProtectedRoute
