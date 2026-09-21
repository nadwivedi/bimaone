import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { toast } from 'react-toastify'
import { useAuth } from '../context/AuthContext'

const API_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000'

const ReferralPage = () => {
  const { user } = useAuth()
  const [referralInfo, setReferralInfo] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [transactions, setTransactions] = useState([])
  const [walletBalance, setWalletBalance] = useState(0)
  const [referralPagination, setReferralPagination] = useState(null)
  const [txPagination, setTxPagination] = useState(null)
  const [loading, setLoading] = useState(true)
  const [txLoading, setTxLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [txFilter, setTxFilter] = useState('')
  const [txPage, setTxPage] = useState(1)

  const fetchReferralInfo = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/referral/info`, { withCredentials: true })
      if (res.data.success) setReferralInfo(res.data.data)
    } catch (err) {
      console.error('Failed to load referral info:', err)
    }
  }, [])

  const fetchReferrals = useCallback(async () => {
    try {
      const res = await axios.get(`${API_URL}/api/referral/list`, { withCredentials: true })
      if (res.data.success) {
        setReferrals(res.data.data.referrals)
        setReferralPagination(res.data.data.pagination)
      }
    } catch (err) {
      console.error('Failed to load referrals:', err)
    }
  }, [])

  const fetchTransactions = useCallback(async (page = 1, type = '') => {
    setTxLoading(true)
    try {
      const params = { page, limit: 15 }
      if (type) params.type = type
      const res = await axios.get(`${API_URL}/api/wallet/transactions`, { params, withCredentials: true })
      if (res.data.success) {
        setTransactions(res.data.data.transactions)
        setWalletBalance(res.data.data.balance)
        setTxPagination(res.data.data.pagination)
      }
    } catch (err) {
      console.error('Failed to load transactions:', err)
    } finally {
      setTxLoading(false)
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    Promise.all([fetchReferralInfo(), fetchReferrals(), fetchTransactions(1, '')]).finally(() => setLoading(false))
  }, [fetchReferralInfo, fetchReferrals, fetchTransactions])

  const handleCopyCode = async () => {
    if (!referralInfo?.referralCode) return
    try {
      await navigator.clipboard.writeText(referralInfo.referralCode)
      setCopied(true)
      toast.success('Referral code copied!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Failed to copy')
    }
  }

  const handleShare = async () => {
    if (!referralInfo?.shareLink) return
    const text = `Join BimaOne and manage all your vehicle documents easily! Use my referral code: ${referralInfo.referralCode}\n\n${referralInfo.shareLink}`
    if (navigator.share) {
      try { await navigator.share({ title: 'BimaOne Referral', text }) } catch { }
    } else {
      try {
        await navigator.clipboard.writeText(text)
        toast.success('Referral link copied to clipboard!')
      } catch {
        toast.error('Failed to copy')
      }
    }
  }

  const handleTxFilter = (type) => {
    setTxFilter(type)
    setTxPage(1)
    fetchTransactions(1, type)
  }

  const handleTxPageChange = (newPage) => {
    setTxPage(newPage)
    fetchTransactions(newPage, txFilter)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (loading) {
    return (
      <div className='min-h-screen bg-slate-50/50 px-4 pb-32 pt-8 md:px-6 lg:px-8'>
        <div className='mx-auto max-w-4xl animate-pulse space-y-6'>
          <div className='h-32 rounded-[32px] bg-slate-200' />
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div className='h-28 rounded-2xl bg-slate-200' />
            <div className='h-28 rounded-2xl bg-slate-200' />
            <div className='h-28 rounded-2xl bg-slate-200' />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='min-h-screen bg-slate-50/50 px-4 pb-32 pt-8 md:px-6 lg:px-8'>
      <div className='mx-auto max-w-4xl space-y-6'>

        {/* Header Banner */}
        <div className='relative overflow-hidden rounded-[32px] bg-gradient-to-r from-emerald-600 to-teal-700 p-6 md:p-8 text-white shadow-[0_20px_50px_-20px_rgba(5,150,105,0.3)]'>
          <div className='absolute top-0 right-0 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-300/20 to-teal-300/20 blur-3xl' />
          <div className='absolute -bottom-20 -left-20 h-40 w-40 rounded-full bg-gradient-to-tr from-teal-300/20 to-emerald-300/20 blur-3xl' />
          <div className='relative'>
            <div className='flex items-center gap-3 mb-3'>
              <div className='h-10 w-10 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10'>
                <svg className='h-6 w-6 text-emerald-200' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div>
                <h1 className='text-xl md:text-2xl font-black tracking-tight'>Refer & Earn</h1>
                <p className='text-emerald-100 text-xs md:text-sm font-semibold mt-0.5'>Invite your friends and earn ₹99 for each successful referral</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referral Code Card + Wallet */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {/* Referral Code */}
          <div className='md:col-span-2 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
            <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-2'>Your Referral Code</p>
            <div className='flex items-center gap-3'>
              <div className='flex-1 bg-slate-50 rounded-2xl border-2 border-dashed border-emerald-300 px-5 py-4 text-center'>
                <span className='text-3xl md:text-4xl font-black tracking-[0.25em] text-emerald-700 select-all'>
                  {referralInfo?.referralCode || '------'}
                </span>
              </div>
              <button
                onClick={handleCopyCode}
                className={`h-14 w-14 rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer shrink-0 ${copied ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600'}`}
                title='Copy code'
              >
                {copied ? (
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M5 13l4 4L19 7' />
                  </svg>
                ) : (
                  <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z' />
                  </svg>
                )}
              </button>
            </div>
            <button
              onClick={handleShare}
              className='mt-4 w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-3 text-sm font-bold hover:shadow-[0_8px_25px_-4px_rgba(5,150,105,0.4)] hover:-translate-y-0.5 transition-all duration-200 cursor-pointer active:translate-y-0'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z' />
              </svg>
              Share Referral Link
            </button>
          </div>

          {/* Wallet Balance */}
          <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)] flex flex-col justify-center'>
            <div className='text-center'>
              <div className='h-14 w-14 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3 border border-amber-100'>
                <svg className='h-7 w-7 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <p className='text-xs font-bold uppercase tracking-wider text-slate-400 mb-1'>Wallet Balance</p>
              <p className='text-3xl font-black text-slate-900'>₹{walletBalance}</p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          <div className='rounded-2xl bg-white border border-slate-200 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100'>
                <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
                </svg>
              </div>
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>Total Referrals</p>
                <p className='text-2xl font-black text-slate-900'>{referralInfo?.totalReferrals || 0}</p>
              </div>
            </div>
          </div>

          <div className='rounded-2xl bg-white border border-slate-200 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-xl bg-emerald-50 flex items-center justify-center border border-emerald-100'>
                <svg className='h-5 w-5 text-emerald-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>Total Earnings</p>
                <p className='text-2xl font-black text-slate-900'>₹{referralInfo?.totalEarnings || 0}</p>
              </div>
            </div>
          </div>

          <div className='rounded-2xl bg-white border border-slate-200 p-5 shadow-[0_4px_20px_-4px_rgba(15,23,42,0.05)]'>
            <div className='flex items-center gap-3'>
              <div className='h-10 w-10 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100'>
                <svg className='h-5 w-5 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' />
                </svg>
              </div>
              <div>
                <p className='text-xs font-bold uppercase tracking-wider text-slate-400'>Reward Per Referral</p>
                <p className='text-2xl font-black text-slate-900'>₹99</p>
              </div>
            </div>
          </div>
        </div>

        {/* Referrals List */}
        <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
          <div className='flex items-center gap-3 border-b border-slate-100 pb-5 mb-5'>
            <div className='h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center border border-indigo-100'>
              <svg className='h-5 w-5 text-indigo-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
              </svg>
            </div>
            <div>
              <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Your Referrals</h3>
              <p className='text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5'>People who joined using your code</p>
            </div>
          </div>

          {referrals.length === 0 ? (
            <div className='text-center py-10 bg-slate-50 rounded-2xl border border-dashed border-slate-200'>
              <svg className='h-12 w-12 text-slate-300 mx-auto mb-3' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={1.5} d='M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' />
              </svg>
              <p className='text-sm font-bold text-slate-400'>No referrals yet</p>
              <p className='text-xs text-slate-400 mt-1'>Share your referral code to start earning</p>
            </div>
          ) : (
            <div className='space-y-3'>
              {referrals.map((ref) => (
                <div key={ref._id} className='flex items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 hover:bg-slate-100/50 transition-colors'>
                  <div className='h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm shrink-0'>
                    {ref.referredUser?.name?.charAt(0) || 'U'}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-bold text-slate-800 truncate'>{ref.referredUser?.name || 'Unknown User'}</p>
                    <p className='text-[10px] text-slate-400 font-semibold'>{ref.referredUser?.email || ''}</p>
                  </div>
                  <div className='text-right'>
                    <p className='text-sm font-black text-emerald-600'>+₹{ref.rewardAmount}</p>
                    <p className='text-[10px] text-slate-400 font-semibold'>{formatDate(ref.createdAt)}</p>
                  </div>
                </div>
              ))}
              {referralPagination && referralPagination.pages > 1 && (
                <div className='flex justify-center gap-2 pt-2'>
                  {Array.from({ length: referralPagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => fetchReferrals(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${p === referralPagination.page ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Wallet Transactions */}
        <div className='rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_15px_40px_-20px_rgba(15,23,42,0.1)]'>
          <div className='flex items-center justify-between border-b border-slate-100 pb-5 mb-5'>
            <div className='flex items-center gap-3'>
              <div className='h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center border border-amber-100'>
                <svg className='h-5 w-5 text-amber-600' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' />
                </svg>
              </div>
              <div>
                <h3 className='text-sm font-bold text-slate-800 tracking-tight'>Wallet Transactions</h3>
                <p className='text-[10px] text-slate-400 font-semibold tracking-wider uppercase mt-0.5'>Your balance history</p>
              </div>
            </div>
            <div className='flex gap-1'>
              {['', 'credit', 'debit'].map((type) => (
                <button
                  key={type}
                  onClick={() => handleTxFilter(type)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer ${txFilter === type ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {type || 'All'}
                </button>
              ))}
            </div>
          </div>

          {txLoading ? (
            <div className='animate-pulse space-y-3'>
              {[1, 2, 3].map((i) => (
                <div key={i} className='h-16 rounded-2xl bg-slate-100' />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className='text-center py-8 bg-slate-50 rounded-2xl border border-dashed border-slate-200'>
              <p className='text-sm font-bold text-slate-400'>No transactions yet</p>
            </div>
          ) : (
            <div className='space-y-2'>
              {transactions.map((tx) => (
                <div key={tx._id} className='flex items-center gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100'>
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'credit' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100'}`}>
                    {tx.type === 'credit' ? (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M7 11l5-5m0 0l5 5m-5-5v12' />
                      </svg>
                    ) : (
                      <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M17 13l-5 5m0 0l-5-5m5 5V6' />
                      </svg>
                    )}
                  </div>
                  <div className='flex-1 min-w-0'>
                    <p className='text-sm font-bold text-slate-800'>{tx.description || (tx.type === 'credit' ? 'Credit' : 'Debit')}</p>
                    <p className='text-[10px] text-slate-400 font-semibold'>{formatDate(tx.createdAt)}</p>
                  </div>
                  <p className={`text-sm font-black ${tx.type === 'credit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                  </p>
                </div>
              ))}
              {txPagination && txPagination.pages > 1 && (
                <div className='flex justify-center gap-2 pt-2'>
                  {Array.from({ length: txPagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => handleTxPageChange(p)}
                      className={`h-8 w-8 rounded-xl text-xs font-bold transition-all cursor-pointer ${p === txPage ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Back to Settings */}
        <div className='text-center'>
          <Link
            to='/setting'
            className='inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors'
          >
            <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
            Back to Settings
          </Link>
        </div>
      </div>
    </div>
  )
}

export default ReferralPage
