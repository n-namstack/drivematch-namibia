'use client'

import { useState, useTransition } from 'react'
import { approveDriver, rejectDriver, approveDocument, rejectDocument } from '@/lib/actions'
import { CheckCircle, XCircle, Eye, FileText, Loader2, ChevronDown, ChevronUp, FolderOpen, Clock } from 'lucide-react'

function DocumentViewer({ url, label }: { url: string | null; label: string }) {
  const [open, setOpen] = useState(false)
  const [useIframe, setUseIframe] = useState(false)

  if (!url) return null

  const isPdf = url.toLowerCase().includes('.pdf')

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-medium"
      >
        <Eye size={13} />
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/70 z-[9999] flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-xl overflow-hidden max-w-3xl w-full max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
              <span className="font-medium text-slate-900 text-sm">{label}</span>
              <div className="flex items-center gap-2">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-700 hover:underline">Open in new tab</a>
                <button onClick={() => setOpen(false)} className="p-1 hover:bg-slate-100 rounded-lg">
                  <XCircle size={18} className="text-slate-500" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto min-h-[400px]">
              {isPdf || useIframe ? (
                <iframe src={url} className="w-full h-full min-h-[500px]" title={label} />
              ) : (
                <img
                  src={url}
                  alt={label}
                  className="max-w-full h-auto mx-auto block"
                  onError={() => setUseIframe(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function RejectModal({ onConfirm, onCancel, loading }: {
  onConfirm: (reason: string) => void
  onCancel: () => void
  loading: boolean
}) {
  const [reason, setReason] = useState('')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-semibold text-slate-900 mb-1">Reject Driver</h3>
        <p className="text-sm text-slate-500 mb-4">Provide a reason that will be sent to the driver.</p>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="e.g. Documents are expired or unclear"
          className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
        />
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button
            onClick={() => reason.trim() && onConfirm(reason.trim())}
            disabled={!reason.trim() || loading}
            className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Reject
          </button>
        </div>
      </div>
    </div>
  )
}

interface Document {
  id: string
  document_type: string
  file_url: string | null
  selfie_url: string | null
  signed_url: string | null
  signed_selfie_url: string | null
  verification_status: string
  rejection_reason: string | null
}

interface Driver {
  user_id: string
  verification_status: string
  rejection_reason: string | null
  years_of_experience: number | null
  submitted_at: string | null
  license_number: string | null
  profiles: { firstname: string | null; lastname: string | null; email: string | null; phone: string | null } | null
  driver_documents: Document[]
}

export default function VerificationPanel({ driver }: { driver: Driver }) {
  const [expanded, setExpanded] = useState(true)
  const [showReject, setShowReject] = useState(false)
  const [isPending, startTransition] = useTransition()

  const profile = driver.profiles
  const name = [profile?.firstname, profile?.lastname].filter(Boolean).join(' ') || 'Unknown Driver'
  const isPending_ = driver.verification_status !== 'verified'

  function handleApprove() {
    startTransition(() => approveDriver(driver.user_id))
  }

  function handleReject(reason: string) {
    startTransition(async () => {
      await rejectDriver(driver.user_id, reason)
      setShowReject(false)
    })
  }

  const statusBadge = (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
      driver.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-700' :
      driver.verification_status === 'rejected' ? 'bg-red-100 text-red-700' :
                                                   'bg-amber-100 text-amber-700'
    }`}>
      {driver.verification_status}
    </span>
  )

  return (
    <>
      {showReject && (
        <RejectModal
          onConfirm={handleReject}
          onCancel={() => setShowReject(false)}
          loading={isPending}
        />
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-5 py-4 border-b border-slate-100">

          {/* Row 1: avatar + name + (desktop: badge + buttons) + toggle */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm flex-shrink-0">
                {(profile?.firstname?.[0] ?? '?').toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-slate-900 truncate">{name}</div>
                <div className="text-xs text-slate-400 truncate">{profile?.email}</div>
                {driver.submitted_at && (
                  <div className="flex items-center gap-1 mt-0.5 text-[10px] text-slate-400">
                    <Clock size={10} className="flex-shrink-0" />
                    Submitted{' '}
                    {new Date(driver.submitted_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · '}
                    {new Date(driver.submitted_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Badge + buttons visible inline on sm+ */}
              <div className="hidden sm:flex items-center gap-2">
                {statusBadge}
                {isPending_ && (
                  <>
                    <button onClick={handleApprove} disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                      {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                      Approve All
                    </button>
                    <button onClick={() => setShowReject(true)} disabled={isPending}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                      <XCircle size={12} />
                      Reject
                    </button>
                  </>
                )}
              </div>

              {/* Badge only on mobile (buttons go to row 2) */}
              <div className="sm:hidden">
                {statusBadge}
              </div>

              <button onClick={() => setExpanded(!expanded)} className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400">
                {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
            </div>
          </div>

          {/* Row 2: action buttons — mobile only */}
          {isPending_ && (
            <div className="flex sm:hidden items-center gap-2 mt-3">
              <button onClick={handleApprove} disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors">
                {isPending ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                Approve All
              </button>
              <button onClick={() => setShowReject(true)} disabled={isPending}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 border border-red-200 text-red-600 text-xs font-medium rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors">
                <XCircle size={12} />
                Reject
              </button>
            </div>
          )}
        </div>

        {/* Documents */}
        {expanded && (
          driver.driver_documents.length === 0 ? (
            <div className="flex items-center gap-3 px-4 sm:px-5 py-6 text-slate-400">
              <FolderOpen size={18} className="flex-shrink-0" />
              <p className="text-sm">No documents uploaded</p>
            </div>
          ) : (
            <div className="p-4 sm:p-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {driver.driver_documents.map((doc) => (
                <div key={doc.id} className="border border-slate-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <FileText size={14} className="text-slate-400" />
                    <span className="text-sm font-medium text-slate-700 capitalize">
                      {doc.document_type?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <DocumentViewer url={doc.signed_url} label="View Document" />
                    {doc.signed_selfie_url && (
                      <DocumentViewer url={doc.signed_selfie_url} label="View Selfie" />
                    )}
                  </div>
                  {doc.rejection_reason && (
                    <p className="text-xs text-red-600 mt-2">Rejected: {doc.rejection_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </>
  )
}
