import { useEffect, useState } from 'react'
import '../App.css'

function ProductTypesPage({ apiFetch }) {
  const [productTypes, setProductTypes] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [isEdit, setIsEdit] = useState(false)
  const [formName, setFormName] = useState('')
  const [editId, setEditId] = useState(null)
  const [message, setMessage] = useState({ type: '', text: '' })
  const [saving, setSaving] = useState(false)

  const notifyProductTypesUpdated = (data) => {
    try {
      localStorage.setItem('bimaone_product_types', JSON.stringify({
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        data: data
      }))
      window.dispatchEvent(new CustomEvent('product_types_updated', { detail: data }))
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('bimaone_product_types_channel')
        bc.postMessage({ type: 'product_types_updated', data: data })
        bc.close()
      }
    } catch {}
  }

  const fetchProductTypes = async () => {
    try {
      setLoading(true)
      setMessage({ type: '', text: '' })
      const result = await apiFetch('/api/product-types')
      const list = result.data || []
      setProductTypes(list)
      notifyProductTypesUpdated(list)
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to fetch product types' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchProductTypes() }, [])

  const openAdd = () => {
    setFormName('')
    setEditId(null)
    setIsEdit(false)
    setMessage({ type: '', text: '' })
    setShowModal(true)
  }

  const openEdit = (p) => {
    setFormName(p.name)
    setEditId(p._id)
    setIsEdit(true)
    setMessage({ type: '', text: '' })
    setShowModal(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!formName.trim()) {
      setMessage({ type: 'error', text: 'Product name is required' })
      return
    }
    try {
      setSaving(true)
      if (isEdit) {
        await apiFetch(`/api/product-types/${editId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        })
      } else {
        await apiFetch('/api/product-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: formName.trim() }),
        })
      }
      setShowModal(false)
      fetchProductTypes()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to save product type' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? Existing insurance policies with this product type will retain their value.`)) return
    try {
      await apiFetch(`/api/product-types/${id}`, { method: 'DELETE' })
      fetchProductTypes()
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to delete product type' })
    }
  }

  const filteredProductTypes = productTypes.filter((p) =>
    (p.name || '').toLowerCase().includes(searchTerm.trim().toLowerCase())
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
          <h2>Product Types</h2>
          <div className="toolbar">
            <div className="search-box">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search product type"
              />
            </div>
            <button type="button" className="secondary-btn" onClick={fetchProductTypes}>Refresh</button>
            <button type="button" className="primary-btn small-btn" onClick={openAdd}>
              Add Product Type
            </button>
          </div>
        </div>

        {message.text ? (
          <div style={{ padding: '0 24px' }}>
            <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>{message.text}</div>
          </div>
        ) : null}

        {loading ? (
          <div className="empty-state">Loading product types...</div>
        ) : productTypes.length === 0 ? (
          <div className="empty-state">No product types found. Add one to get started.</div>
        ) : filteredProductTypes.length === 0 ? (
          <div className="empty-state">No product types match "{searchTerm}".</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product Type</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProductTypes.map((p, i) => (
                  <tr key={p._id}>
                    <td>{i + 1}</td>
                    <td style={{ fontWeight: 800 }}>{p.name}</td>
                    <td>{formatDate(p.createdAt)}</td>
                    <td>
                      <div className="toolbar" style={{ flexWrap: 'nowrap' }}>
                        <button type="button" className="secondary-btn table-btn" onClick={() => openEdit(p)}>
                          Edit
                        </button>
                        <button
                          type="button"
                          className="secondary-btn table-btn"
                          style={{ color: '#b91c1c', borderColor: '#fecaca' }}
                          onClick={() => handleDelete(p._id, p.name)}
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
                <p className="eyebrow">Product Type</p>
                <h2>{isEdit ? 'Edit Product Type' : 'Add Product Type'}</h2>
              </div>
              <button type="button" className="icon-btn" onClick={() => setShowModal(false)}>x</button>
            </div>
            <form className="user-form" onSubmit={handleSave}>
              <label>
                <span>Product Name</span>
                <input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. GCV, TAXI, Electric Rickshaw"
                  autoFocus
                />
              </label>

              {message.text ? (
                <div className={`message ${message.type === 'error' ? 'message-error' : 'message-success'}`}>{message.text}</div>
              ) : null}

              <div className="modal-actions">
                <button type="button" className="secondary-btn" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={saving}>
                  {saving ? 'Saving...' : isEdit ? 'Save Product Type' : 'Add Product Type'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

export default ProductTypesPage
