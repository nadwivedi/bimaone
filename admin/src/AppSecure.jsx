import { useEffect, useState } from 'react'
import { Routes, Route, NavLink, Navigate, useNavigate, useLocation } from 'react-router-dom'
import './App.css'
import { apiFetch, AuthError } from './utils/api'
import DashboardPage from './pages/DashboardPage'
import PolicySearchPage from './pages/PolicySearchPage'
import UsersPage from './pages/UsersPage'
import UserPlansPage from './pages/UserPlansPage'
import WhatsAppPage from './pages/WhatsAppPage'
import SettingsPage from './pages/SettingsPage'
import InsuranceCompaniesPage from './pages/InsuranceCompaniesPage'
import ProductTypesPage from './pages/ProductTypesPage'
import ReferralsPage from './pages/ReferralsPage'
import CalculatorConfigPage from './pages/CalculatorConfigPage'
import { DashboardIcon, PolicySearchIcon, UsersIcon, UserPlansIcon, ReferralsIcon, WhatsAppIcon, BuildingIcon, ProductTypesIcon, SettingsIcon, CalculatorIcon, LogoutIcon, MenuIcon, CloseIcon } from './icons'


const initialLoginForm = {
  email: '',
  password: '',
}

function AppSecure() {
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [loginForm, setLoginForm] = useState(initialLoginForm)
  const [loginState, setLoginState] = useState({
    checking: true,
    submitting: false,
    authenticated: false,
    admin: null,
    error: '',
  })

  const wrappedApiFetch = async (endpoint, options = {}) => {
    try {
      return await apiFetch(endpoint, options)
    } catch (error) {
      if (error instanceof AuthError) {
        handleLogout()
      }
      throw error
    }
  }

  const checkAdminAuth = async () => {
    try {
      const result = await apiFetch('/api/auth/admin/profile')
      setLoginState({
        checking: false,
        submitting: false,
        authenticated: true,
        admin: result.data?.admin || null,
        error: '',
      })
    } catch (error) {
      setLoginState((prev) => ({
        ...prev,
        checking: false,
        submitting: false,
        authenticated: false,
        admin: null,
        error: error instanceof AuthError ? '' : error.message || 'Failed to verify admin session',
      }))
    }
  }

  useEffect(() => {
    checkAdminAuth()
  }, [])

  useEffect(() => {
    setSidebarOpen(false)
  }, [location])

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  const handleLoginChange = (e) => {
    const { name, value } = e.target
    setLoginForm((prev) => ({ ...prev, [name]: value }))
    if (loginState.error) {
      setLoginState((prev) => ({ ...prev, error: '' }))
    }
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault()
    if (!loginForm.email || !loginForm.password) {
      setLoginState((prev) => ({ ...prev, error: 'Email and password are required' }))
      return
    }
    try {
      setLoginState((prev) => ({ ...prev, submitting: true, error: '' }))
      const result = await apiFetch('/api/auth/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      })
      if (!result.data?.admin) {
        await checkAdminAuth()
      } else {
        setLoginState({ checking: true, submitting: false, authenticated: false, admin: null, error: '' })
        await checkAdminAuth()
      }
      setLoginForm(initialLoginForm)
      navigate('/dashboard')
    } catch (error) {
      alert(error.message || 'Login failed')
      setLoginState((prev) => ({ ...prev, submitting: false, error: error.message || 'Login failed' }))
    }
  }

  const handleLogout = async () => {
    try {
      await fetch(`${import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'}/api/auth/admin/logout`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch (error) {
      console.error('Admin logout error:', error)
    }
    setLoginState({
      checking: false,
      submitting: false,
      authenticated: false,
      admin: null,
      error: '',
    })
    navigate('/')
  }

  if (loginState.checking) {
    return (
      <div className="admin-login-shell">
        <div className="admin-login-card">
          <p className="eyebrow">Admin Panel</p>
          <h1>Checking session...</h1>
        </div>
      </div>
    )
  }

  if (!loginState.authenticated) {
    return (
      <div className="admin-login-shell">
        <form className="admin-login-card" onSubmit={handleLoginSubmit}>
          <p className="eyebrow">Admin Panel</p>
          <h1>Sign in</h1>
          <p className="section-text">Use the admin email and password created on the backend.</p>

          <label>
            <span>Email</span>
            <input type="email" name="email" value={loginForm.email} onChange={handleLoginChange} />
          </label>

          <label>
            <span>Password</span>
            <input type="password" name="password" value={loginForm.password} onChange={handleLoginChange} />
          </label>

          {loginState.error ? (
            <div className="message message-error">{loginState.error}</div>
          ) : null}

          <button type="submit" className="primary-btn" disabled={loginState.submitting}>
            {loginState.submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-shell">
      <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-mark">BB</div>
          <div className="sidebar-brand-text">
            <p className="eyebrow">BimaOne Admin</p>
            <p className="sidebar-brand-email">{loginState.admin?.email || ''}</p>
          </div>
          <button type="button" className="sidebar-close" aria-label="Close menu" onClick={() => setSidebarOpen(false)}>
            <CloseIcon />
          </button>
        </div>

        <p className="sidebar-section-label">Menu</p>

        <nav className="sidebar-nav">
          <NavLink
            to="/dashboard"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <DashboardIcon />
            Dashboard
          </NavLink>
          <NavLink
            to="/users"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <UsersIcon />
            User
          </NavLink>
          <NavLink
            to="/policy-search"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <PolicySearchIcon />
            Policy Search
          </NavLink>
          <NavLink
            to="/user-plans"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <UserPlansIcon />
            User Plans
          </NavLink>
          <NavLink
            to="/referrals"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <ReferralsIcon />
            Referrals
          </NavLink>
          <NavLink
            to="/whatsapp"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <WhatsAppIcon />
            WhatsApp
          </NavLink>
          <NavLink
            to="/insurance-companies"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <BuildingIcon />
            Insurance Companies
          </NavLink>
          <NavLink
            to="/product-types"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <ProductTypesIcon />
            Product Types
          </NavLink>
          <NavLink
            to="/calculator-config"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <CalculatorIcon />
            Calculator Control
          </NavLink>
          <NavLink
            to="/settings"
            className={({ isActive }) => `sidebar-link${isActive ? ' sidebar-link-active' : ''}`}
          >
            <SettingsIcon />
            Settings
          </NavLink>
        </nav>

        <button type="button" className="secondary-btn sidebar-logout" onClick={handleLogout}>
          <LogoutIcon />
          Logout
        </button>
      </aside>

      {sidebarOpen ? <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} /> : null}

      <div className="content-area">
        <div className="admin-topbar">
          <button type="button" className="topbar-burger" aria-label="Open menu" onClick={() => setSidebarOpen(true)}>
            <MenuIcon />
          </button>
          <p className="topbar-title">BimaOne Admin</p>
        </div>

        <Routes>
          <Route path="/dashboard" element={<DashboardPage apiFetch={wrappedApiFetch} />} />
          <Route path="/users" element={<UsersPage apiFetch={wrappedApiFetch} />} />
          <Route path="/policy-search" element={<PolicySearchPage apiFetch={wrappedApiFetch} />} />
          <Route path="/user-plans" element={<UserPlansPage apiFetch={wrappedApiFetch} />} />
          <Route path="/referrals" element={<ReferralsPage apiFetch={wrappedApiFetch} />} />
          <Route path="/whatsapp" element={<WhatsAppPage apiFetch={wrappedApiFetch} />} />
          <Route path="/insurance-companies" element={<InsuranceCompaniesPage apiFetch={wrappedApiFetch} />} />
          <Route path="/product-types" element={<ProductTypesPage apiFetch={wrappedApiFetch} />} />
          <Route path="/calculator-config" element={<CalculatorConfigPage apiFetch={wrappedApiFetch} />} />
          <Route path="/settings" element={<SettingsPage apiFetch={wrappedApiFetch} onLogout={handleLogout} />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>

      </div>
    </div>
  )
}

export default AppSecure
