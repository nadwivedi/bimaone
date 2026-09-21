import { useCallback, useEffect, useState } from 'react'
import axios from 'axios'
import { toast } from 'react-toastify'
import {
  API_URL, EMPTY_FILTERS, EMPTY_FORM, formatDate, formatTime, normalizeStatus, statusInfo, todayISO,
} from './leadUtils'

// Shared data + actions for every Lead Management layout. Each layout only renders;
// the popups (add/edit, follow-up, lost, details) live in <LeadModals leads={...} />.
const useLeads = ({ initialBucket = 'today' } = {}) => {
  const [bucket, setBucket] = useState(initialBucket)
  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [leads, setLeads] = useState([])
  const [counts, setCounts] = useState({})
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [followUpLead, setFollowUpLead] = useState(null)
  const [followUp, setFollowUp] = useState({ status: '', note: '', nextFollowUpDate: '', nextFollowUpTime: '' })

  const [lostLead, setLostLead] = useState(null)
  const [lostReason, setLostReason] = useState('')

  const [detailLead, setDetailLead] = useState(null)

  const fetchLeads = useCallback(async () => {
    try {
      setLoading(true)
      const params = { bucket, search, today: todayISO() }
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v })
      const res = await axios.get(`${API_URL}/api/leads`, { withCredentials: true, params })
      if (res.data?.success) {
        setLeads(res.data.data)
        setCounts(res.data.counts || {})
      }
    } catch (err) {
      console.error('Error fetching leads:', err)
      toast.error('Failed to load leads')
    } finally {
      setLoading(false)
    }
  }, [bucket, search, filters])

  useEffect(() => {
    const t = setTimeout(fetchLeads, search ? 250 : 0)
    return () => clearTimeout(t)
  }, [fetchLeads, search])

  useEffect(() => {
    const open = formOpen || followUpLead || lostLead || detailLead
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [formOpen, followUpLead, lostLead, detailLead])

  const setFilter = (key, value) => setFilters((f) => ({ ...f, [key]: value }))
  const clearFilters = () => { setFilters(EMPTY_FILTERS); setSearch('') }
  const applyFilters = (next) => setFilters({ ...EMPTY_FILTERS, ...next })
  const activeFilterCount = Object.values(filters).filter(Boolean).length + (search ? 1 : 0)

  // Keep an open detail view in sync after an action updates the lead.
  const applyUpdatedLead = (updated) => {
    setDetailLead((prev) => (prev && prev._id === updated._id ? updated : prev))
    setLeads((prev) => prev.map((l) => (l._id === updated._id ? updated : l)))
    fetchLeads()
  }

  const openAdd = () => {
    setEditingId(null)
    setForm({ ...EMPTY_FORM })
    setFormOpen(true)
  }

  const openEdit = (lead) => {
    setEditingId(lead._id)
    setForm({
      ...EMPTY_FORM,
      ...Object.fromEntries(Object.keys(EMPTY_FORM).map((k) => [k, lead[k] ?? EMPTY_FORM[k]])),
      expectedPremium: lead.expectedPremium ?? '',
      status: normalizeStatus(lead.status),
    })
    setDetailLead(null)
    setFormOpen(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('Please enter the lead name')
      return
    }
    if (form.mobile && !/^\d{10}$/.test(form.mobile)) {
      toast.error('Mobile number must be 10 digits')
      return
    }
    setSaving(true)
    try {
      const res = editingId
        ? await axios.put(`${API_URL}/api/leads/${editingId}`, form, { withCredentials: true })
        : await axios.post(`${API_URL}/api/leads`, form, { withCredentials: true })
      if (res.data?.success) {
        toast.success(editingId ? 'Lead updated' : 'Lead added')
        setFormOpen(false)
        applyUpdatedLead(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save lead')
    } finally {
      setSaving(false)
    }
  }

  const openFollowUp = (lead) => {
    setDetailLead(null)
    setFollowUpLead(lead)
    setFollowUp({
      status: lead.status === 'new' || lead.status === 'follow_up' ? 'in_progress' : lead.status,
      note: '',
      nextFollowUpDate: '',
      nextFollowUpTime: '',
    })
  }

  const handleLogFollowUp = async () => {
    setSaving(true)
    try {
      const res = await axios.post(
        `${API_URL}/api/leads/${followUpLead._id}/follow-ups`,
        {
          ...followUp,
          outcome: statusInfo(followUp.status).label,
          lostReason: followUp.status === 'lost' ? 'Not interested' : '',
          date: todayISO(),
        },
        { withCredentials: true }
      )
      if (res.data?.success) {
        toast.success(
          followUp.status === 'converted' ? 'Lead converted 🎉'
            : followUp.status === 'lost' ? 'Lead marked as lost'
            : followUp.nextFollowUpDate ? `Next follow-up: ${formatDate(followUp.nextFollowUpDate)}${followUp.nextFollowUpTime ? ` at ${formatTime(followUp.nextFollowUpTime)}` : ''}`
            : 'Follow-up logged'
        )
        setFollowUpLead(null)
        applyUpdatedLead(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to log follow-up')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (lead, status, reason = '') => {
    try {
      const res = await axios.patch(
        `${API_URL}/api/leads/${lead._id}/status`,
        { status, lostReason: reason },
        { withCredentials: true }
      )
      if (res.data?.success) {
        toast.success(status === 'converted' ? 'Lead converted 🎉' : status === 'lost' ? 'Lead marked as lost' : `Status: ${statusInfo(status).label}`)
        applyUpdatedLead(res.data.data)
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status')
    }
  }

  const openLost = (lead) => {
    setDetailLead(null)
    setLostLead(lead)
    setLostReason('')
  }

  const confirmLost = () => {
    const lead = lostLead
    setLostLead(null)
    updateStatus(lead, 'lost', lostReason)
  }

  const handleDelete = async (lead) => {
    if (!window.confirm(`Delete lead "${lead.name}"? This cannot be undone.`)) return
    try {
      await axios.delete(`${API_URL}/api/leads/${lead._id}`, { withCredentials: true })
      toast.success('Lead deleted')
      setDetailLead(null)
      fetchLeads()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete lead')
    }
  }

  return {
    bucket, setBucket, search, setSearch, filters, setFilter, clearFilters, applyFilters, activeFilterCount,
    leads, counts, loading, fetchLeads,
    formOpen, setFormOpen, editingId, form, setForm, saving, openAdd, openEdit, handleSave,
    followUpLead, setFollowUpLead, followUp, setFollowUp, openFollowUp, handleLogFollowUp,
    lostLead, setLostLead, lostReason, setLostReason, openLost, confirmLost,
    detailLead, setDetailLead,
    updateStatus, handleDelete,
  }
}

export default useLeads
