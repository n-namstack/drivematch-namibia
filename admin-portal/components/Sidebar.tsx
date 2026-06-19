'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, ShieldCheck, Users, Car, ScrollText, LogOut, UsersRound, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/verifications', icon: ShieldCheck,      label: 'Verifications' },
  { href: '/drivers',       icon: Users,            label: 'Drivers' },
  { href: '/owners',        icon: Car,              label: 'Owners' },
  { href: '/users',         icon: UsersRound,       label: 'Users' },
  { href: '/audit',         icon: ScrollText,       label: 'Audit Log' },
]

interface Props {
  user: { email: string; name: string }
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const sidebarContent = (
    <aside className="w-60 bg-white border-r border-slate-200 flex flex-col h-full">
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-800 rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">D</span>
          </div>
          <div>
            <div className="font-bold text-slate-900 text-sm">DuoLink</div>
            <div className="text-xs text-slate-500">Admin Portal</div>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={() => setIsOpen(false)}
          className="lg:hidden p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || (href !== '/dashboard' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? 'bg-blue-50 text-blue-800' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Icon size={17} className={isActive ? 'text-blue-700' : ''} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="p-3 border-t border-slate-100">
        <div className="px-3 mb-2">
          <div className="text-sm font-medium text-slate-900 truncate">{user.name}</div>
          <div className="text-xs text-slate-400 truncate">{user.email}</div>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut size={15} />
          Sign out
        </button>
      </div>
    </aside>
  )

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <div className="hidden lg:flex h-screen flex-shrink-0">
        {sidebarContent}
      </div>

      {/* ── Mobile hamburger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        className="lg:hidden fixed top-3 left-3 z-40 p-2.5 bg-white rounded-xl border border-slate-200 shadow-sm text-slate-700"
        aria-label="Open menu"
      >
        <Menu size={18} />
      </button>

      {/* ── Mobile drawer ── */}
      {/* Backdrop */}
      {isOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/40 z-40 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}
      {/* Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 flex-shrink-0 transition-transform duration-200 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </>
  )
}
