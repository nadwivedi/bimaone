import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export const AuthLoading = () => (
  <div className='min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50 flex items-center justify-center'>
    <div className='text-center'>
      <div className='w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg animate-pulse'>
        <svg className='w-8 h-8 text-white' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' />
        </svg>
      </div>
      <p className='text-gray-600 font-semibold'>Loading...</p>
    </div>
  </div>
)

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()

  if (loading) return <AuthLoading />

  return isAuthenticated ? children : <Navigate to='/login' replace />
}

export default ProtectedRoute
