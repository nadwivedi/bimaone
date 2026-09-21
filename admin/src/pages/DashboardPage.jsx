import { useEffect, useState } from 'react'
import '../App.css'

const RANGE_OPTIONS = [
  { value: '24h', label: 'Last 24 Hours' },
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '60d', label: 'Last 60 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '6m', label: 'Last 6 Months' },
  { value: '365d', label: 'Last 365 Days' },
  { value: 'lifetime', label: 'Lifetime' },
]

function DashboardPage({ apiFetch }) {
  const [range, setRange] = useState('7d')
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const rangeLabel = RANGE_OPTIONS.find((r) => r.value === range)?.label || 'Selected Range'

  const fetchStats = async (selectedRange, { silent = false } = {}) => {
    try {
      if (!silent) setLoading(true)
      setError('')
      const result = await apiFetch(`/api/admin-dashboard/stats?range=${selectedRange}`)
      setStats(result.data || null)
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard stats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats(range)
    const intervalId = window.setInterval(() => fetchStats(range, { silent: true }), 60000)
    return () => window.clearInterval(intervalId)
  }, [range])

  const rangeScopedCards = [
    { key: 'activeUsersInRange', label: `Active Users (${rangeLabel})`, icon: '⚡', gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', shadow: 'rgba(5, 150, 105, 0.4)' },
    { key: 'newUsersInRange', label: `New Users (${rangeLabel})`, icon: '🆕', gradient: 'linear-gradient(135deg, #d946ef 0%, #a21caf 100%)', shadow: 'rgba(162, 28, 175, 0.4)' },
    { key: 'newSubscriptionsInRange', label: `New Subscriptions (${rangeLabel})`, icon: '📝', gradient: 'linear-gradient(135deg, #38bdf8 0%, #0284c7 100%)', shadow: 'rgba(2, 132, 199, 0.4)' },
    { key: 'policyUploadsInRange', label: `Policy Uploads (${rangeLabel})`, icon: '📄', gradient: 'linear-gradient(135deg, #6366f1 0%, #4338ca 100%)', shadow: 'rgba(67, 56, 202, 0.4)' },
    { key: 'totalDocumentUploadsInRange', label: `Documents Uploaded (${rangeLabel})`, icon: '📈', gradient: 'linear-gradient(135deg, #fb923c 0%, #c2410c 100%)', shadow: 'rgba(194, 65, 12, 0.4)' },
  ]

  const overallCards = [
    { key: 'totalUsers', label: 'Total Users (Lifetime)', icon: '👥', gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', shadow: 'rgba(37, 99, 235, 0.4)' },
    { key: 'activePlansCount', label: 'Active Subscriptions', icon: '💳', gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', shadow: 'rgba(180, 83, 9, 0.4)' },
    { key: 'totalAiUploads', label: 'Total AI Uploads (Current Cycle)', icon: '🤖', gradient: 'linear-gradient(135deg, #2dd4bf 0%, #0d9488 100%)', shadow: 'rgba(13, 148, 136, 0.4)' },
    { key: 'totalManualUploads', label: 'Total Manual Uploads (Current Cycle)', icon: '✍️', gradient: 'linear-gradient(135deg, #f472b6 0%, #be185d 100%)', shadow: 'rgba(190, 24, 93, 0.4)' },
    { key: 'totalDocumentUploads', label: 'Total Documents (Lifetime)', icon: '🗂️', gradient: 'linear-gradient(135deg, #64748b 0%, #1e293b 100%)', shadow: 'rgba(30, 41, 59, 0.4)' },
  ]

  return (
    <>
      <section className="panel panel-full">
        <div className="panel-header panel-header-row">
          <div>
            <h2>Dashboard</h2>
            <p className="section-text">A quick snapshot of what's happening across BimaOne right now.</p>
          </div>
          <div className="toolbar">
            {stats?.generatedAt ? (
              <span className="section-text" style={{ margin: 0 }}>
                Updated: {new Date(stats.generatedAt).toLocaleTimeString()}
              </span>
            ) : null}
            <button type="button" className="secondary-btn" onClick={() => fetchStats(range)} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <div style={{ padding: '0 24px' }}>
          <div className="view-toggle" role="group" aria-label="Date range" style={{ flexWrap: 'wrap' }}>
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`view-toggle-btn ${range === opt.value ? 'view-toggle-btn-active' : ''}`}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div style={{ padding: '16px 24px 0' }}>
            <div className="message message-error">{error}</div>
          </div>
        ) : null}

        {loading && !stats ? (
          <div className="empty-state">Loading dashboard...</div>
        ) : (
          <div style={{ padding: '16px 24px 24px' }}>
            <h3 className="dashboard-section-title" style={{ marginTop: 0 }}>{rangeLabel}</h3>
            <div className="stats-grid">
              {rangeScopedCards.map((card) => (
                <div
                  className="stat-card"
                  key={card.key}
                  style={{ '--stat-gradient': card.gradient, '--stat-shadow': card.shadow }}
                >
                  <div className="stat-card-icon">{card.icon}</div>
                  <span className="stat-card-label">{card.label}</span>
                  <span className="stat-card-value">{(stats?.[card.key] ?? 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <h3 className="dashboard-section-title">Overall</h3>
            <div className="stats-grid">
              {overallCards.map((card) => (
                <div
                  className="stat-card"
                  key={card.key}
                  style={{ '--stat-gradient': card.gradient, '--stat-shadow': card.shadow }}
                >
                  <div className="stat-card-icon">{card.icon}</div>
                  <span className="stat-card-label">{card.label}</span>
                  <span className="stat-card-value">{(stats?.[card.key] ?? 0).toLocaleString('en-IN')}</span>
                </div>
              ))}
            </div>

            <h3 className="dashboard-section-title">Document Breakdown ({rangeLabel} / Lifetime)</h3>
            {stats?.documentBreakdown?.length ? (
              <div className="table-wrap" style={{ marginTop: '12px' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Document Type</th>
                      <th>Uploaded ({rangeLabel})</th>
                      <th>Total (Lifetime)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.documentBreakdown.map((d) => (
                      <tr key={d.key}>
                        <td style={{ fontWeight: 700 }}>{d.label}</td>
                        <td>{d.inRange.toLocaleString('en-IN')}</td>
                        <td>{d.total.toLocaleString('en-IN')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">No document data yet.</div>
            )}
          </div>
        )}
      </section>
    </>
  )
}

export default DashboardPage
