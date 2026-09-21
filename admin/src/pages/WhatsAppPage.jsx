import { useEffect, useMemo, useState } from 'react'
import '../App.css'

function WhatsAppPage({ apiFetch }) {
  const [whatsAppState, setWhatsAppState] = useState({
    loading: false,
    actionLoading: false,
    sessions: [],
    activeSessionKey: '',
    selectedSessionKey: '',
    logs: [],
    logsLoading: false,
    result: '',
    error: '',
  })

  const fetchWhatsAppStatus = async ({ silent = false } = {}) => {
    try {
      if (!silent) setWhatsAppState((prev) => ({ ...prev, loading: true, error: '' }))

      const result = await apiFetch('/api/whatsapp/status')

      setWhatsAppState((prev) => ({
        ...prev,
        loading: false,
        sessions: result.data?.sessions || [],
        activeSessionKey: result.data?.activeSessionKey || '',
        selectedSessionKey:
          (result.data?.sessions || []).some((session) => session.sessionKey === prev.selectedSessionKey)
            ? prev.selectedSessionKey
            : (result.data?.activeSessionKey || result.data?.sessions?.[0]?.sessionKey || ''),
      }))
    } catch (error) {
      console.error('Error fetching WhatsApp status:', error)
      setWhatsAppState((prev) => ({
        ...prev,
        loading: false,
        error: error.message || 'Failed to fetch WhatsApp status',
      }))
    }
  }

  const fetchWhatsAppLogs = async ({ silent = false } = {}) => {
    try {
      setWhatsAppState((prev) => ({ ...prev, logsLoading: !silent }))
      const result = await apiFetch('/api/whatsapp/logs?limit=100')
      setWhatsAppState((prev) => ({ ...prev, logsLoading: false, logs: result.data || [] }))
    } catch (error) {
      console.error('Error fetching reminder logs:', error)
      setWhatsAppState((prev) => ({ ...prev, logsLoading: false }))
    }
  }

  useEffect(() => {
    fetchWhatsAppStatus()
    fetchWhatsAppLogs()
    const intervalId = window.setInterval(() => {
      fetchWhatsAppStatus({ silent: true })
      fetchWhatsAppLogs({ silent: true })
    }, 5000)
    return () => window.clearInterval(intervalId)
  }, [])

  const runWhatsAppAction = async (sessionKey, endpoint, successText) => {
    try {
      setWhatsAppState((prev) => ({ ...prev, actionLoading: true, result: '', error: '' }))
      await apiFetch(`/api/whatsapp/sessions/${encodeURIComponent(sessionKey)}/${endpoint}`, { method: 'POST' })
      setWhatsAppState((prev) => ({ ...prev, actionLoading: false, result: successText }))
      await fetchWhatsAppStatus({ silent: true })
      await fetchWhatsAppLogs({ silent: true })
    } catch (error) {
      setWhatsAppState((prev) => ({ ...prev, actionLoading: false, error: error.message || 'WhatsApp action failed' }))
    }
  }

  const runReminderNow = async () => {
    try {
      setWhatsAppState((prev) => ({ ...prev, actionLoading: true, error: '', result: '' }))
      await apiFetch('/api/whatsapp/run-reminders', { method: 'POST' })
      setWhatsAppState((prev) => ({ ...prev, actionLoading: false, result: 'Expiry reminders processed' }))
      await fetchWhatsAppLogs({ silent: true })
    } catch (error) {
      setWhatsAppState((prev) => ({ ...prev, actionLoading: false, error: error.message || 'Failed to run reminders' }))
    }
  }

  const selectedWhatsAppSession = useMemo(
    () => whatsAppState.sessions.find((session) => session.sessionKey === whatsAppState.selectedSessionKey) || null,
    [whatsAppState.selectedSessionKey, whatsAppState.sessions]
  )

  const whatsAppStatusLabel = useMemo(() => {
    const status = selectedWhatsAppSession?.status || 'new'
    switch (status) {
      case 'authenticated': return 'Connected'
      case 'qr_ready': return 'Scan QR'
      case 'initializing': return 'Connecting'
      case 'auth_failure': return 'Auth Failed'
      case 'disconnected': return 'Disconnected'
      default: return 'Not Started'
    }
  }, [selectedWhatsAppSession])

  const whatsAppStatusClass = useMemo(() => {
    const status = selectedWhatsAppSession?.status || 'new'
    if (status === 'authenticated') return 'status-active'
    if (status === 'qr_ready' || status === 'initializing') return 'status-pending'
    return 'status-inactive'
  }, [selectedWhatsAppSession])

  return (
    <>
      <section className="panel panel-full" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <div className="panel-header panel-header-row" style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '24px' }}>
          <div>
            <h2>WhatsApp Integration</h2>
            <p className="section-text">Connect your phone to enable automated document expiry alerts via WhatsApp.</p>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary-btn" onClick={() => fetchWhatsAppStatus()} disabled={whatsAppState.loading || whatsAppState.actionLoading}>
              Refresh Status
            </button>
          </div>
        </div>

        {whatsAppState.loading ? (
          <div className="empty-state">Loading WhatsApp status...</div>
        ) : whatsAppState.sessions.length === 0 ? (
          <div className="empty-state">Setting up connection... Please wait.</div>
        ) : (() => {
          const session = whatsAppState.sessions[0]
          const isConnected = session.status === 'authenticated'
          const isPending = session.status === 'qr_ready' || session.status === 'initializing'

          return (
            <div className="whatsapp-simple-container" style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                <span className={`status-pill ${isConnected ? 'status-active' : isPending ? 'status-pending' : 'status-inactive'}`} style={{ padding: '8px 16px', fontSize: '14px', fontWeight: 'bold' }}>
                  {isConnected ? '● Connected' : isPending ? '● Waiting for Scan' : '● Disconnected'}
                </span>
                {session.phoneNumber && session.phoneNumber !== 'Not connected' && (
                  <p className="section-text" style={{ fontWeight: 'bold', color: 'var(--text-color)' }}>
                    Connected Phone: +{session.phoneNumber}
                  </p>
                )}
              </div>

              {isConnected ? (
                <div className="whatsapp-connected-success" style={{ margin: '40px 0' }}>
                  <div style={{ fontSize: '48px', color: '#10b981', marginBottom: '16px' }}>✓</div>
                  <h3>Your WhatsApp is successfully linked!</h3>
                  <p className="section-text" style={{ maxWidth: '400px', margin: '8px auto 0' }}>
                    BimaOne will now send automated reminders for document expiries to your customers.
                  </p>
                </div>
              ) : session.qrCodeDataUrl ? (
                <div className="whatsapp-qr-container" style={{ margin: '30px 0' }}>
                  <div style={{ display: 'inline-block', padding: '16px', background: '#fff', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)', marginBottom: '16px' }}>
                    <img src={session.qrCodeDataUrl} alt="WhatsApp QR Code" style={{ width: '250px', height: '250px', display: 'block' }} />
                  </div>
                  <p className="section-text" style={{ maxWidth: '400px', margin: '0 auto' }}>
                    Open WhatsApp on your phone, go to <strong>Linked Devices</strong>, and scan the QR code above to connect.
                  </p>
                </div>
              ) : (
                <div className="whatsapp-disconnected-state" style={{ margin: '40px 0' }}>
                  <p className="section-text" style={{ marginBottom: '20px' }}>
                    WhatsApp is currently disconnected. Click below to start the connection and generate a QR code.
                  </p>
                  <button type="button" className="primary-btn" style={{ margin: '0 auto' }}
                    onClick={() => runWhatsAppAction(session.sessionKey, 'start', 'WhatsApp connection initiated')}
                    disabled={whatsAppState.actionLoading}>
                    {whatsAppState.actionLoading ? 'Initializing...' : 'Get QR Code'}
                  </button>
                </div>
              )}

              <div style={{ marginTop: '32px', borderTop: '1px solid var(--border-color)', paddingTop: '24px', display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {isConnected && (
                  <button type="button" className="secondary-btn" style={{ borderColor: '#fca5a5', color: '#b91c1c' }}
                    onClick={() => runWhatsAppAction(session.sessionKey, 'reset', 'WhatsApp disconnected successfully')}
                    disabled={whatsAppState.actionLoading}>
                    Disconnect WhatsApp
                  </button>
                )}
                {!isConnected && session.status !== 'disconnected' && (
                  <button type="button" className="secondary-btn"
                    onClick={() => runWhatsAppAction(session.sessionKey, 'reset', 'Session reset. Requesting new QR...')}
                    disabled={whatsAppState.actionLoading}>
                    Reset Connection
                  </button>
                )}
              </div>
            </div>
          )
        })()}

        {whatsAppState.error ? (
          <div className="message message-error" style={{ marginTop: '20px' }}>{whatsAppState.error}</div>
        ) : null}
        {whatsAppState.result ? (
          <div className="message message-success" style={{ marginTop: '20px' }}>{whatsAppState.result}</div>
        ) : null}
      </section>

      <section className="panel panel-full">
        <div className="panel-header panel-header-row">
          <div>
            <h2>Reminder Logs</h2>
            <p className="section-text">Shows both sent and failed reminders for the 4 fixed alert stages.</p>
          </div>
          <div className="toolbar">
            <button type="button" className="secondary-btn" onClick={runReminderNow} disabled={whatsAppState.actionLoading}>
              Send Reminders Now
            </button>
          </div>
        </div>

        {whatsAppState.logsLoading ? (
          <div className="empty-state">Loading reminder logs...</div>
        ) : whatsAppState.logs.length === 0 ? (
          <div className="empty-state">No reminder logs found yet.</div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Vehicle No</th>
                  <th>Mobile</th>
                  <th>Expiry</th>
                  <th>Alert</th>
                  <th>Status</th>
                  <th>Updated</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {whatsAppState.logs.map((log) => (
                  <tr key={log._id}>
                    <td>{log.recordType || 'N/A'}</td>
                    <td>{log.vehicleNumber || 'N/A'}</td>
                    <td>{log.mobileNumber || 'N/A'}</td>
                    <td>{log.expiryDate || 'N/A'}</td>
                    <td>{log.alertLabel || log.alertStage || 'N/A'}</td>
                    <td>
                      <span className={`status-pill ${log.status === 'sent' ? 'status-active' : 'status-inactive'}`}>
                        {log.status === 'sent' ? 'Sent' : 'Failed'}
                      </span>
                    </td>
                    <td>{log.updatedAt ? new Date(log.updatedAt).toLocaleString() : 'N/A'}</td>
                    <td>{log.error || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}

export default WhatsAppPage
