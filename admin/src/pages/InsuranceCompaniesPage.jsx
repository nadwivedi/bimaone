import { useEffect, useState } from 'react'
import '../App.css'

function InsuranceCompaniesPage({ apiFetch }) {
  const [companies, setCompanies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formName, setFormName] = useState('')
  const [editId, setEditId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  const notifyCompaniesUpdated = (data) => {
    try {
      localStorage.setItem('bimaone_insurance_companies', JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        data: data
      }))
      window.dispatchEvent(new CustomEvent('insurance_companies_updated', { detail: data }))
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('bimaone_insurance_companies_channel')
        bc.postMessage({ type: 'insurance_companies_updated', data: data })
        bc.close()
      }
    } catch {}
  }

  const fetchCompanies = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      const result = await apiFetch('/api/insurance-companies')
      const list = result.data || []
      setCompanies(list)
      notifyCompaniesUpdated(list)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch companies' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchCompanies() }, [])

  const openAdd = () => {
    setFormName('')
    setEditId(null)
    setIsEdit(false)
    setMessage({ type: '', text: '' })
    setShowModal(true)
  }

  const openEdit = (c) => {
    setFormName(c.name)
    setEditId(c._id)
    setIsEdit(true)
    setMessage({ type: '', text: '' })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      setMessage({ type: 'error', text: 'Company name is required' })
      return
    }
    try {
      setSaving(true)
      if (isEdit) {
        await apiFetch(`/api/insurance-companies/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        })
      } else {
        await apiFetch('/api/insurance-companies', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        })
      }
      setShowModal(false)
      fetchCompanies()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save company' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This will not affect existing insurance records.`)) return
    try {
      await apiFetch(`/api/insurance-companies/${id}`, { method: 'DELETE' })
      fetchCompanies()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete company' })
    }
  }

  const filteredCompanies = companies.filter((c) =>
    (c.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
  )

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    const d = new Date(dateStr)
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  }

  return (
    <>
      <section className="panel panel-full">
        <div className="panel-header panel-header-row">
          <h2>Insurance Companies</h2>
          <div className="toolbar">
            <div className="search-box">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search company"
              />
            </div>
            <button type="button" className="secondary-btn" onClick={fetchCompanies}>Refresh</button>
            <button type="button" className="primary-btn small-btn" onClick={openAdd}>
              Add Company
            </button>
          </div>
        </div>

        {message.text ? (
          <div style={{ padding: '0 24px' }}>
            <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>{message.text}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="empty-state">Loading companies...</div>
        ) : companies.length === 0 ? (
          <div className="empty-state">No insurance companies found. Add one to get started.</div>
        ) : filteredCompanies.length === 0 ? (
          <div className="empty-state">No companies match "{searchTerm}".</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Company Name</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCompanies.map((c, i) => (
                  <tr key={c._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 800 }}>{c.name}</td>
                    <td>{formatDate(c.createdAt)}</td>
                    <td>
                      <div className="toolbar" style={{ flexWrap: 'nowrap' }}>
                        <button type="button" className="secondary-btn table-btn" onClick={() => openEdit(c)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-btn table-btn"
                          style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                          onClick={() => handleDelete(c._id, c.name)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showModal ? (
        <div className="modal-overlay">
          <div className="modal-card" style={{ maxWidth: '440px' }}>
            <div className="modal-header">
              <div>
                <p className="eyebrow">Insurance Company</p>
                <h2>{isEdit ? 'Edit Company' : 'Add Company'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form className="user-form" onSubmit={handleSave}>
              <label>
                <span>Company Name</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. ICICI Lombard"
                  autoFocus
                />
              </label>

              {message.text ? (
                <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>{message.text}</div>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : isEdit ? 'Save Company' : 'Add Company'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default InsuranceCompaniesPage
