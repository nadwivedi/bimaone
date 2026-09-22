import { useEffect, useState } from 'react'
import '../App.css'
import { PLANS_CONFIG } from '../config/plansConfig'

function UsersPage({ apiFetch }) {
  const initialForm = {
    _id: '', name: '', password: '', mobile: '', isActive: true,
    selectedPlanId: '', planStartDate: '',
  }

  const [users, setUsers] = useState([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('')
  const [verifiedFilter, setVerifiedFilter] = useState('verified')
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('usersPageViewMode') || 'table')
  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [formData, setFormData] = useState(initialForm)
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false)
  const [resetPasswordUser, setResetPasswordUser] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [resetMessage, setResetMessage] = useState({ type: '', text: '' })
  const [resettingPassword, setResettingPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [accessingUserId, setAccessingUserId] = useState(null)
  const [togglingUserId, setTogglingUserId] = useState(null)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [historyPlans, setHistoryPlans] = useState([])
  const [historyUserName, setHistoryUserName] = useState('')
  const [historyLoading, setHistoryLoading] = useState(false)
  const [plans, setPlans] = useState([])

  const fetchPlans = async () => {
    setPlans(PLANS_CONFIG)
  }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      const params = new URLSearchParams({ page: String(page), limit: '50' })
      params.set('verified', verifiedFilter)
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim())
      const result = await apiFetch(`/api/users?${params.toString()}`)
      setUsers(result.data || [])
      setTotalPages(result.pagination?.totalPages || 1)
      setTotalUsers(result.pagination?.total || 0)
    } catch (error) {
      console.error('Error fetching users:', error)
      setMessage({ type: 'error', text: error.message || 'Failed to fetch users' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verifiedFilter, page, debouncedSearch])

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      setDebouncedSearch(searchTerm)
    }, 350)
    return () => clearTimeout(timer)
  }, [searchTerm])

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
    if (message.text) setMessage({ type: '', text: '' })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.name || !formData.mobile || (!isEditMode && !formData.password)) {
      setMessage({ type: 'error', text: isEditMode ? 'Name and mobile are required' : 'Name, mobile, and password are required' })
      return
    }

    try {
      setSaving(true)
      const payload = {
        name: formData.name,
        mobile: formData.mobile,
        isActive: formData.isActive,
      }

      if (formData.password) {
        payload.password = formData.password
      }

      const result = await apiFetch(isEditMode ? `/api/users/${formData._id}` : '/api/users', {
        method: isEditMode ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      const savedUserId = isEditMode ? formData._id : result.data?._id

      if (savedUserId && formData.selectedPlanId) {
        try {
          await apiFetch('/api/user-plans', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: savedUserId,
              planKey: formData.selectedPlanId,
              startDate: formData.planStartDate || undefined,
            }),
          })
        } catch (planError) {
          console.error('Error assigning plan:', planError)
        }
      }

      setFormData(initialForm)
      setMessage({ type: 'success', text: isEditMode ? 'User updated successfully' : 'User created successfully' })
      setShowAddUserModal(false)
      setIsEditMode(false)
      fetchUsers()
    } catch (error) {
      console.error(`Error ${isEditMode ? 'updating' : 'creating'} user:`, error)
      setMessage({ type: 'error', text: error.message || (isEditMode ? 'Failed to update user' : 'Failed to create user') })
    } finally {
      setSaving(false)
    }
  }

  const openResetPasswordModal = (user) => {
    setResetPasswordUser(user)
    setNewPassword('')
    setResetMessage({ type: '', text: '' })
    setShowResetPasswordModal(true)
  }

  const closeResetPasswordModal = () => {
    setShowResetPasswordModal(false)
    setResetPasswordUser(null)
    setNewPassword('')
    setResetMessage({ type: '', text: '' })
  }

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault()
    if (!newPassword.trim()) {
      setResetMessage({ type: 'error', text: 'New password is required' })
      return
    }

    try {
      setResettingPassword(true)
      await apiFetch(`/api/users/${resetPasswordUser._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: resetPasswordUser.name,
          mobile: resetPasswordUser.mobile,
          isActive: resetPasswordUser.isActive !== false,
          password: newPassword.trim(),
        }),
      })

      setResetMessage({ type: 'success', text: 'Password reset successfully!' })
      setTimeout(() => {
        closeResetPasswordModal()
      }, 1500)
    } catch (error) {
      console.error('Error resetting password:', error)
      setResetMessage({ type: 'error', text: error.message || 'Failed to reset password' })
    } finally {
      setResettingPassword(false)
    }
  }

  const handleToggleActive = async (user) => {
    const nextActive = !(user.isActive !== false)
    const confirmMsg = nextActive
      ? `Reactivate ${user.name || 'this user'}?`
      : `Deactivate ${user.name || 'this user'}? They will no longer be able to log in.`
    if (!window.confirm(confirmMsg)) return

    try {
      setTogglingUserId(user._id)
      await apiFetch(`/api/users/${user._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: user.name,
          mobile: user.mobile,
          isActive: nextActive,
        }),
      })
      setUsers((prev) => prev.map((u) => (u._id === user._id ? { ...u, isActive: nextActive } : u)))
    } catch (error) {
      console.error('Error toggling user active state:', error)
      alert(error.message || 'Failed to update user status')
    } finally {
      setTogglingUserId(null)
    }
  }

  const handleAccessUser = async (user) => {
    try {
      setAccessingUserId(user._id)
      const result = await apiFetch(`/api/auth/admin/access-user/${user._id}`, {
        method: 'POST',
      })
      const redirectUrl = result.data?.redirectUrl || 'https://bimaone.in'
      window.open(redirectUrl, '_blank')
    } catch (error) {
      console.error('Error accessing user:', error)
      alert(error.message || 'Failed to access user account')
    } finally {
      setAccessingUserId(null)
    }
  }

  const openAddUserModal = () => {
    setFormData(initialForm)
    setMessage({ type: '', text: '' })
    setIsEditMode(false)
    setShowAddUserModal(true)
  }

  const openEditUserModal = (user) => {
    setFormData({
      _id: user._id,
      name: user.name || '',
      password: '',
      mobile: user.mobile || '',
      isActive: user.isActive !== false,
    })
    setMessage({ type: '', text: '' })
    setIsEditMode(true)
    setShowAddUserModal(true)
  }

  const openPlanHistory = async (user) => {
    setHistoryUserName(user.name || '')
    setHistoryPlans([])
    setShowHistoryModal(true)
    setHistoryLoading(true)
    try {
      const result = await apiFetch(`/api/user-plans/history/${user._id}`)
      setHistoryPlans(result.data || [])
    } catch (error) {
      console.error('Error fetching plan history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  const closeUserModal = () => {
    setShowAddUserModal(false)
    setIsEditMode(false)
    setFormData(initialForm)
    setMessage({ type: '', text: '' })
  }

  const changeViewMode = (mode) => {
    setViewMode(mode)
    localStorage.setItem('usersPageViewMode', mode)
  }

  const planFilterOptions = Array.from(new Set(users.map((user) => user.planName || 'Free')))

  const filteredUsers = users.filter((user) => {
    const matchesPlan = !planFilter || (user.planName || 'Free') === planFilter
    return matchesPlan
  })

  const formatTimeAgo = (date) => {
    if (!date) return 'Never'
    const now = new Date()
    const d = new Date(date)
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    if (diffDays < 30) return `${diffDays}d ago`
    return d.toLocaleDateString()
  }

  return (
    <>
      <div className="panel-grid">
        <section className="panel panel-full">
          <div className="panel-header panel-header-row">
            <h2>All Users</h2>
            <div className="toolbar">
              <div className="search-box">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search user"
                />
              </div>
              <select
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                style={{ height: '42px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', padding: '0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}
              >
                <option value="">All Plans</option>
                {planFilterOptions.map((planName) => (
                  <option key={planName} value={planName}>{planName}</option>
                ))}
              </select>
              <select
                value={verifiedFilter}
                onChange={(e) => {
                  setVerifiedFilter(e.target.value)
                  setPage(1)
                }}
                style={{ height: '42px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', padding: '0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}
              >
                <option value="verified">Verified</option>
                <option value="unverified">Unverified</option>
                <option value="all">All Accounts</option>
              </select>
              <div className="view-toggle" role="group" aria-label="View mode">
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === 'table' ? 'view-toggle-btn-active' : ''}`}
                  onClick={() => changeViewMode('table')}
                  title="Table view"
                >
                  ☰ Table
                </button>
                <button
                  type="button"
                  className={`view-toggle-btn ${viewMode === 'card' ? 'view-toggle-btn-active' : ''}`}
                  onClick={() => changeViewMode('card')}
                  title="Card view"
                >
                  ▦ Card
                </button>
              </div>
              <button type="button" className="secondary-btn" onClick={fetchUsers}>Refresh</button>
              <button type="button" className="primary-btn small-btn" onClick={openAddUserModal}>
                Add User
              </button>
            </div>
          </div>

          {loading ? (
            <div className="empty-state">Loading users...</div>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state">No users found.</div>
          ) : viewMode === 'table' ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Status</th>
                    <th>Plan / Expiry</th>
                    <th>Referred By / Total Referrals</th>
                    <th>Last Login / Activity</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td>
                        <div style={{ fontWeight: 700 }}>{user.name || 'N/A'}</div>
                        {user.email ? <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{user.email}</div> : null}
                        <div style={{ fontSize: '12px', fontWeight: 500, color: '#64748b' }}>{user.mobile || 'N/A'}</div>
                      </td>
                      <td>
                        <span className={`status-pill ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                        <span className="status-pill" style={{ marginLeft: '4px', background: user.emailVerified ? '#f0fdfa' : '#fef2f2', color: user.emailVerified ? '#0d9488' : '#b91c1c', borderColor: user.emailVerified ? '#99f6e4' : '#fecaca' }}>
                          {user.emailVerified ? 'Verified' : 'Unverified'}
                        </span>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div>
                          <span className="status-pill" style={{ background: '#f0fdfa', color: '#0d9488', borderColor: '#99f6e4' }}>
                            {user.planName || 'Free'}
                          </span>
                        </div>
                        <div style={{ marginTop: '4px' }}>{user.planExpiry ? new Date(user.planExpiry).toLocaleDateString() : 'No Expiry'}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div>{user.referredByName ? `${user.referredByName}${user.referredByMobile ? ` (${user.referredByMobile})` : ''}` : '-'}</div>
                        <div>Total Referrals: {user.totalReferrals ?? 0}</div>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        <div>Login: {formatTimeAgo(user.lastLogin)}</div>
                        <div>Activity: {formatTimeAgo(user.lastActivity)}</div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button
                              type="button"
                              className="secondary-btn table-btn"
                              style={{ borderColor: '#6ee7b7', color: '#065f46' }}
                              onClick={() => handleAccessUser(user)}
                              disabled={accessingUserId === user._id}
                            >
                              {accessingUserId === user._id ? 'Redirecting...' : 'Access'}
                            </button>
                            <button type="button" className="secondary-btn table-btn" onClick={() => openEditUserModal(user)}>
                              Edit
                            </button>
                            <button type="button" className="secondary-btn table-btn" onClick={() => openPlanHistory(user)}>
                              History
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <button type="button" className="secondary-btn table-btn" style={{ borderColor: '#fca5a5', color: '#b91c1c' }} onClick={() => openResetPasswordModal(user)}>
                              Reset Password
                            </button>
                            <button
                              type="button"
                              className="secondary-btn table-btn"
                              style={user.isActive !== false ? { borderColor: '#fca5a5', color: '#b91c1c' } : { borderColor: '#6ee7b7', color: '#065f46' }}
                              onClick={() => handleToggleActive(user)}
                              disabled={togglingUserId === user._id}
                            >
                              {togglingUserId === user._id ? 'Updating...' : user.isActive !== false ? 'Deactivate' : 'Activate'}
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="user-cards-grid">
              {filteredUsers.map((user) => (
                <div className="user-card" key={user._id}>
                  <div className="user-card-header">
                    <div>
                      <p className="user-card-name">{user.name || 'N/A'}</p>
                      {user.email ? <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', margin: '2px 0 0' }}>{user.email}</p> : null}
                      <p className="user-card-mobile">{user.mobile || 'N/A'}</p>
                    </div>
                    <span className={`status-pill ${user.isActive ? 'status-active' : 'status-inactive'}`}>
                      {user.isActive ? 'Active' : 'Inactive'}
                    </span>
                    <span className="status-pill" style={{ marginLeft: '4px', background: user.emailVerified ? '#f0fdfa' : '#fef2f2', color: user.emailVerified ? '#0d9488' : '#b91c1c', borderColor: user.emailVerified ? '#99f6e4' : '#fecaca' }}>
                      {user.emailVerified ? 'Verified' : 'Unverified'}
                    </span>
                  </div>

                  <div className="user-card-body">
                    <div className="user-card-field">
                      <span>Plan / Expiry</span>
                      <strong>
                        <span className="status-pill" style={{ background: '#f0fdfa', color: '#0d9488', borderColor: '#99f6e4' }}>
                          {user.planName || 'Free'}
                        </span>
                        {' '}({user.planExpiry ? new Date(user.planExpiry).toLocaleDateString() : 'No Expiry'})
                      </strong>
                    </div>
                    <div className="user-card-field">
                      <span>Referred By / Total Referrals</span>
                      <strong>{user.referredByName ? `${user.referredByName}${user.referredByMobile ? ` (${user.referredByMobile})` : ''}` : '-'} / {user.totalReferrals ?? 0}</strong>
                    </div>
                    <div className="user-card-field">
                      <span>Last Login / Activity</span>
                      <strong>{formatTimeAgo(user.lastLogin)} / {formatTimeAgo(user.lastActivity)}</strong>
                    </div>
                  </div>

                  <div className="user-card-actions" style={{ flexDirection: 'column' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      <button
                        type="button"
                        className="secondary-btn table-btn"
                        style={{ borderColor: '#6ee7b7', color: '#065f46' }}
                        onClick={() => handleAccessUser(user)}
                        disabled={accessingUserId === user._id}
                      >
                        {accessingUserId === user._id ? 'Redirecting...' : 'Access'}
                      </button>
                      <button type="button" className="secondary-btn table-btn" onClick={() => openEditUserModal(user)}>
                        Edit
                      </button>
                      <button type="button" className="secondary-btn table-btn" onClick={() => openPlanHistory(user)}>
                        History
                      </button>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      <button type="button" className="secondary-btn table-btn" style={{ borderColor: '#fca5a5', color: '#b91c1c' }} onClick={() => openResetPasswordModal(user)}>
                        Reset Password
                      </button>
                      <button
                        type="button"
                        className="secondary-btn table-btn"
                        style={user.isActive !== false ? { borderColor: '#fca5a5', color: '#b91c1c' } : { borderColor: '#6ee7b7', color: '#065f46' }}
                        onClick={() => handleToggleActive(user)}
                        disabled={togglingUserId === user._id}
                      >
                        {togglingUserId === user._id ? 'Updating...' : user.isActive !== false ? 'Deactivate' : 'Activate'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="pagination">
            <span className="pagination-info">
              Showing {filteredUsers.length} of {totalUsers} users
            </span>
            <div className="pagination-controls">
              <button
                type="button"
                className="secondary-btn table-btn"
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page <= 1 || loading}
              >
                Prev
              </button>
              <span className="pagination-pages">
                Page {page} of {totalPages}
              </span>
              <button
                type="button"
                className="secondary-btn table-btn"
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                disabled={page >= totalPages || loading}
              >
                Next
              </button>
            </div>
          </div>
        </section>
      </div>

      {showAddUserModal ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">User Popup</p>
                <h2>{isEditMode ? 'Edit User' : 'Add User'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={closeUserModal}>
                x
              </button>
            </div>

            <form className="user-form" onSubmit={handleSubmit}>
              <label>
                <span>Name</span>
                <input name="name" value={formData.name} onChange={handleChange} />
              </label>

              <label>
                <span>Password</span>
                <input type="password" name="password" value={formData.password} onChange={handleChange} />
              </label>

              {isEditMode ? (
                <label className="toggle-row">
                  <span>Active User</span>
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleChange} />
                </label>
              ) : null}

              <label>
                <span>Mobile</span>
                <input name="mobile" value={formData.mobile} onChange={handleChange} />
              </label>

              {isEditMode ? (
                <>
                  <div style={{ borderTop: '1px solid #e2e8f0', margin: '8px 0' }} />
                  <p className="eyebrow" style={{ margin: '0', color: '#64748b' }}>Plan Assignment</p>
                  <label>
                    <span>Plan</span>
                    <select name="selectedPlanId" value={formData.selectedPlanId} onChange={handleChange} style={{ height: '42px', borderRadius: '14px', border: '1px solid #cbd5e1', background: '#fff', padding: '0 14px', fontSize: '14px', fontWeight: '600', color: '#0f172a' }}>
                      <option value="">No plan change</option>
                      {plans.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} - ₹{p.price} / {p.durationDays > 0 ? `${p.durationDays} days` : 'No Expiry'}
                        </option>
                      ))}
                    </select>
                  </label>
                  {formData.selectedPlanId ? (
                    <label>
                      <span>Start Date (leave empty for today)</span>
                      <input type="date" name="planStartDate" value={formData.planStartDate} onChange={handleChange} />
                    </label>
                  ) : null}
                </>
              ) : null}

              {message.text ? (
                <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>
                  {message.text}
                </div>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeUserModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save User' : 'Create User')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showResetPasswordModal ? (
        <div className="modal-overlay">
          <div className="modal-card">
            <div className="modal-header">
              <div>
                <p className="eyebrow">User Security</p>
                <h2>Reset Password</h2>
                <p className="section-text" style={{ fontSize: '12px', marginTop: '4px' }}>Resetting password for: <strong>{resetPasswordUser?.name}</strong> ({resetPasswordUser?.mobile})</p>
              </div>
              <button type="button" className="icon-btn" onClick={closeResetPasswordModal}>
                x
              </button>
            </div>

            <form className="user-form" onSubmit={handleResetPasswordSubmit}>
              <label>
                <span>New Password</span>
                <input type="password" name="newPassword" value={newPassword} onChange={(e) => {
                  setNewPassword(e.target.value)
                  if (resetMessage.text) setResetMessage({ type: '', text: '' })
                }} placeholder="Enter new password" />
              </label>

              {resetMessage.text ? (
                <div className={`message ${resetMessage.type === 'error' ? 'message-error' : 'message-success'}`}>
                  {resetMessage.text}
                </div>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={closeResetPasswordModal}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={resettingPassword}>
                  {resettingPassword ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {showHistoryModal ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Plan History</p>
                <h2>{historyUserName}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowHistoryModal(false)}>x</button>
            </div>
            <div style={{ padding: '16px 24px 24px' }}>
              {historyLoading ? (
                <div className="empty-state">Loading history...</div>
              ) : historyPlans.length === 0 ? (
                <div className="empty-state">No plan history found.</div>
              ) : (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {historyPlans.map((hp) => (
                    <div key={hp._id} style={{ padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', background: '#f8fafc' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '16px' }}>{hp.planName || hp.planKey || 'N/A'}</strong>
                        <span className={`status-pill ${hp.status === 'active' ? 'status-active' : hp.status === 'expired' ? 'status-inactive' : 'status-pending'}`}>
                          {hp.status}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '13px', color: '#64748b' }}>
                        <span>Start: {new Date(hp.startDate).toLocaleDateString()}</span>
                        <span>Expiry: {hp.expiryDate ? new Date(hp.expiryDate).toLocaleDateString() : 'No Expiry'}</span>
                        {hp.usage ? (
                          <>
                            <span>AI Used: {hp.usage.aiDocumentsUsed ?? 0}</span>
                            <span>Manual Used: {hp.usage.manualDocumentsUsed ?? 0}</span>
                          </>
                        ) : null}
                      </div>
                      {hp.notes ? (
                        <div style={{ marginTop: '8px', fontSize: '12px', color: '#64748b', fontStyle: 'italic' }}>{hp.notes}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default UsersPage
