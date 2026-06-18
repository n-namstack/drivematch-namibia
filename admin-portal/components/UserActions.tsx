'use client'

import { useState, useTransition } from 'react'
import { ShieldCheck, ShieldOff, UserX, UserCheck, Loader2 } from 'lucide-react'
import { setUserAdmin, setUserActive } from '@/lib/actions'

interface Props {
  userId: string
  isAdmin: boolean
  isActive: boolean
  isSelf: boolean
}

function ConfirmDialog({ message, confirmLabel, confirmClass, onConfirm, onCancel, loading }: {
  message: string; confirmLabel: string; confirmClass: string
  onConfirm: () => void; onCancel: () => void; loading: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
        <p className="text-sm text-slate-700 mb-5">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white flex items-center justify-center gap-2 disabled:opacity-50 ${confirmClass}`}>
            {loading && <Loader2 size={13} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function UserActions({ userId, isAdmin, isActive, isSelf }: Props) {
  const [confirm, setConfirm] = useState<'makeAdmin' | 'removeAdmin' | 'disable' | 'enable' | null>(null)
  const [isPending, startTransition] = useTransition()

  function run(action: () => Promise<void>) {
    startTransition(async () => { await action(); setConfirm(null) })
  }

  const CONFIRM_CONFIG = {
    makeAdmin:   { message: 'Grant this user admin access to the portal?', confirmLabel: 'Make Admin',      confirmClass: 'bg-blue-700 hover:bg-blue-800',    onConfirm: () => run(() => setUserAdmin(userId, true)) },
    removeAdmin: { message: 'Remove admin access from this user?',         confirmLabel: 'Remove Admin',    confirmClass: 'bg-amber-600 hover:bg-amber-700',  onConfirm: () => run(() => setUserAdmin(userId, false)) },
    disable:     { message: 'Disable this account? The user will be signed out.', confirmLabel: 'Disable Account', confirmClass: 'bg-red-600 hover:bg-red-700',      onConfirm: () => run(() => setUserActive(userId, false)) },
    enable:      { message: 'Re-enable this account?',                     confirmLabel: 'Enable Account',  confirmClass: 'bg-green-600 hover:bg-green-700',  onConfirm: () => run(() => setUserActive(userId, true)) },
  }

  if (isSelf) return <span className="text-xs text-slate-400 italic">you</span>

  const cfg = confirm ? CONFIRM_CONFIG[confirm] : null

  return (
    <>
      {cfg && <ConfirmDialog {...cfg} loading={isPending} onCancel={() => setConfirm(null)} />}
      <div className="flex items-center gap-1.5">
        {isAdmin ? (
          <button onClick={() => setConfirm('removeAdmin')} disabled={isPending} title="Remove admin"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors disabled:opacity-40">
            <ShieldOff size={12} /> Remove Admin
          </button>
        ) : (
          <button onClick={() => setConfirm('makeAdmin')} disabled={isPending} title="Make admin"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-blue-700 hover:bg-blue-50 hover:border-blue-200 transition-colors disabled:opacity-40">
            <ShieldCheck size={12} /> Make Admin
          </button>
        )}
        {isActive ? (
          <button onClick={() => setConfirm('disable')} disabled={isPending} title="Disable account"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors disabled:opacity-40">
            <UserX size={12} /> Disable
          </button>
        ) : (
          <button onClick={() => setConfirm('enable')} disabled={isPending} title="Enable account"
            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 text-green-700 hover:bg-green-50 hover:border-green-200 transition-colors disabled:opacity-40">
            <UserCheck size={12} /> Enable
          </button>
        )}
      </div>
    </>
  )
}
