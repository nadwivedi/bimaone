import { useState, useRef } from 'react'

const PdfPreviewModal = ({ isOpen, onClose, pdfUrl, quoteId, API_URL }) => {
  const [loading, setLoading] = useState(true)
  const iframeRef = useRef(null)

  if (!isOpen) return null

  const fullPdfUrl = `${API_URL}${pdfUrl}`

  const handleDownload = async () => {
    try {
      const response = await fetch(fullPdfUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `${quoteId}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.parentNode.removeChild(link)
    } catch (error) {
      console.error('Download error:', error)
      // Fallback
      window.open(fullPdfUrl, '_blank')
    }
  }

  const handlePrint = () => {
    if (iframeRef.current) {
      try {
        iframeRef.current.contentWindow.print()
      } catch (e) {
        // Fallback for cross-origin or restricted environment
        const printWindow = window.open(fullPdfUrl, '_blank')
        if (printWindow) {
          printWindow.print()
        }
      }
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(fullPdfUrl)
    alert('Quotation link copied to clipboard!')
  }

  const handleShareFile = async () => {
    try {
      const response = await fetch(fullPdfUrl)
      const blob = await response.blob()
      const file = new File([blob], `${quoteId}.pdf`, { type: 'application/pdf' })

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Insurance Quotation ${quoteId}`,
          text: `Here is your BimaOne insurance quotation for ${quoteId}`,
        })
      } else if (navigator.share) {
        await navigator.share({
          title: `Insurance Quotation ${quoteId}`,
          text: `Insurance Quotation - ${quoteId}`,
          url: fullPdfUrl,
        })
      } else {
        const msg = `🏷️ *INSURANCE QUOTATION - BIMAONE*\n\nQuote ID: *${quoteId}*\nView/Download PDF: ${fullPdfUrl}`
        window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
      }
    } catch (error) {
      console.error('Share error:', error)
      const msg = `🏷️ *INSURANCE QUOTATION - BIMAONE*\n\nQuote ID: *${quoteId}*\nView/Download PDF: ${fullPdfUrl}`
      window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
    }
  }

  return (
    <div className='fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-2 sm:p-4 animate-in fade-in duration-200'>
      <div className='relative flex flex-col w-full max-w-5xl h-[90vh] rounded-[24px] sm:rounded-[32px] bg-white shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-300'>
        
        {/* Header */}
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/50'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='flex h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse' />
              <h3 className='text-base font-black text-slate-800 tracking-tight'>Quotation Preview</h3>
            </div>
            <p className='text-[10px] sm:text-xs font-bold text-slate-400 mt-0.5 uppercase tracking-widest'>{quoteId}</p>
          </div>

          {/* Action Buttons */}
          <div className='flex flex-wrap items-center gap-2'>
            <button
              onClick={handleDownload}
              className='flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs uppercase tracking-wider shadow-sm shadow-blue-200 transition-all active:scale-95'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4' />
              </svg>
              Download
            </button>

            <button
              onClick={handlePrint}
              className='flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z' />
              </svg>
              Print
            </button>

            <button
              onClick={handleShareFile}
              className='flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm transition-all active:scale-95'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M8.684 10.742l4.885 2.502m0 0l-4.885 2.502m4.885-2.502a3.5 3.5 0 11.517-1.48L8.685 9.258a3.5 3.5 0 10-.128 5.484l4.983-2.553z' />
              </svg>
              Share PDF
            </button>

            <button
              onClick={handleCopyLink}
              className='flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all active:scale-95'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1' />
              </svg>
              Link
            </button>

            <button
              onClick={onClose}
              className='flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-all'
            >
              <svg className='h-4 w-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2.5} d='M6 18L18 6M6 6l12 12' />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Iframe Viewer */}
        <div className='relative flex-1 bg-slate-100 p-2 sm:p-4 overflow-hidden'>
          {loading && (
            <div className='absolute inset-0 flex flex-col items-center justify-center bg-slate-50 gap-4 z-10'>
              <div className='h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600' />
              <p className='text-xs sm:text-sm font-bold text-slate-500'>Loading PDF Preview...</p>
            </div>
          )}
          <iframe
            ref={iframeRef}
            src={`${fullPdfUrl}#toolbar=0&navpanes=0`}
            className='w-full h-full rounded-2xl border border-slate-200 bg-white shadow-inner shadow-slate-100'
            onLoad={() => setLoading(false)}
            title={`Quotation PDF: ${quoteId}`}
          />
        </div>

        {/* Footer info */}
        <div className='px-6 py-3 border-t border-slate-100 bg-slate-50 text-center text-[10px] text-slate-400 font-medium'>
          Use browser controls inside the PDF preview window to zoom or rotate. If preview is blank, please click Download to view.
        </div>
      </div>
    </div>
  )
}

export default PdfPreviewModal
