import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, Link, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider, getTheme } from './context/ThemeContext'
import { useAuth } from './context/AuthContext'
import Sidebar from './components/Sidebar'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Setting from './pages/Setting'
import RTODocuments from './pages/RTODocuments'
import RTODocumentDetail from './pages/RTODocumentDetail'
import Search from './pages/Search'
import BottomNavigation from './components/BottomNavigation'
import PremiumCalculator from './pages/PremiumCalculator'
import KycPage from './pages/Kyc/KycPage'
import KycDetail from './pages/Kyc/KycDetail'
import Renewals from './pages/Renewals'
import Leads from './pages/leads/Leads'
import Reference from './pages/Reference'
import IMD from './pages/IMD'
import PrivacyPolicy from './pages/PrivacyPolicy'
import TermsAndConditions from './pages/TermsAndConditions'
import ContactUs from './pages/ContactUs'
import About from './pages/About'
import Features from './pages/Features'
import PricingPage from './pages/Pricing/PricingPage'
import SubscribePage from './pages/Pricing/SubscribePage'
import ReferralPage from './pages/ReferralPage'
import RcDetails from './pages/RcDetails/RcDetails'
import ForceEmailVerificationModal from './components/ForceEmailVerificationModal'

function AppContent() {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated, user, loading } = useAuth()
  const isLoginPage = location.pathname === '/login'
  const isLandingPage = location.pathname === '/'
  const isMarketingPage = ['/', '/about', '/features'].includes(location.pathname)
  const publicPages = ['/privacy-policy', '/terms-and-conditions', '/contact-us', '/pricing']
  const isPublicPage = publicPages.includes(location.pathname)
  const showNav = !isLoginPage && !isMarketingPage && (isAuthenticated || !isPublicPage)
  const theme = getTheme()

  const needsEmailVerification = isAuthenticated && user && !user.emailVerified && !user.googleId

  useEffect(() => {
    if (isLandingPage && isAuthenticated && !loading) {
      navigate('/dashboard', { replace: true })
    }
  }, [isLandingPage, isAuthenticated, loading, navigate])

  return (
    <>
      <ToastContainer />
      {needsEmailVerification && <ForceEmailVerificationModal />}
      {showNav && <Sidebar />}

      {showNav && (
        <nav className={`fixed top-0 left-0 right-0 z-20 flex h-16 items-center border-b border-slate-200 lg:hidden ${theme.navbar}`}>
          {location.pathname !== '/' && (
            <button onClick={() => navigate(-1)} className='ml-3 p-2 text-slate-600 hover:text-slate-900 transition cursor-pointer' title='Go back'>
              <svg className='h-6 w-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
              </svg>
            </button>
          )}
          <div className='flex-1 flex justify-center'>
            <Link to='/' className='flex items-center'>
              <img src='/bimaone%20logo.png' alt='BimaOne - Insurance Agent Software' className='h-12 w-auto' />
            </Link>
          </div>
          {location.pathname !== '/' && <div className='w-12' />}
        </nav>
      )}

      <div className={showNav ? 'lg:ml-[260px]' : ''}>
        <div className={showNav ? 'pt-16 pb-20 lg:pt-0 lg:pb-0' : ''}>
          {showNav && location.pathname !== '/' && location.pathname !== '/dashboard' && (
            <div className='sticky top-0 z-20 hidden h-14 items-center border-b border-slate-200 bg-white/90 px-6 backdrop-blur-md lg:flex'>
              <button onClick={() => navigate(-1)} className='inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900' title='Go back'>
                <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M15 19l-7-7 7-7' />
                </svg>
                Back
              </button>
            </div>
          )}
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/' element={<Home />} />
            <Route path='/dashboard' element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path='/setting' element={<ProtectedRoute><Setting /></ProtectedRoute>} />
            <Route path='/search' element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path='/rto-documents' element={<ProtectedRoute><RTODocuments /></ProtectedRoute>} />
            <Route path='/rto-documents/:type/:id' element={<ProtectedRoute><RTODocumentDetail /></ProtectedRoute>} />
            <Route path='/premium-calculator' element={<ProtectedRoute><PremiumCalculator /></ProtectedRoute>} />
            <Route path='/kyc' element={<ProtectedRoute><KycPage /></ProtectedRoute>} />
            <Route path='/kyc/:id' element={<ProtectedRoute><KycDetail /></ProtectedRoute>} />
            <Route path='/renewals' element={<ProtectedRoute><Renewals /></ProtectedRoute>} />
            <Route path='/leads' element={<ProtectedRoute><Leads /></ProtectedRoute>} />
            <Route path='/rc-details' element={<ProtectedRoute><RcDetails /></ProtectedRoute>} />
            <Route path='/pricing' element={<PricingPage />} />
            <Route path='/subscribe/:planId' element={<ProtectedRoute><SubscribePage /></ProtectedRoute>} />
            <Route path='/references' element={<Navigate to='/client-name' replace />} />
            <Route path='/client-name' element={<ProtectedRoute><Reference /></ProtectedRoute>} />
            <Route path='/imd' element={<Navigate to='/agent-name' replace />} />
            <Route path='/agent-name' element={<ProtectedRoute><IMD /></ProtectedRoute>} />
            <Route path='/privacy-policy' element={<PrivacyPolicy />} />
            <Route path='/terms-and-conditions' element={<TermsAndConditions />} />
            <Route path='/contact-us' element={<ContactUs />} />
            <Route path='/about' element={<About />} />
            <Route path='/features' element={<Features />} />
            <Route path='/refer-and-earn' element={<ProtectedRoute><ReferralPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </div>
      {showNav && <BottomNavigation />}
    </>
  )
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <ThemeProvider>
          <AppContent />
        </ThemeProvider>
      </AuthProvider>
    </Router>
  )
}

export default App
