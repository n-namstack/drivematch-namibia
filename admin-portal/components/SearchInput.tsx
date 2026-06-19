'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Search, X } from 'lucide-react'

interface Props {
  defaultValue?: string
  placeholder?: string
  paramKey?: string
}

export default function SearchInput({ defaultValue = '', placeholder = 'Search…', paramKey = 'q' }: Props) {
  const [value, setValue] = useState(defaultValue)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    const timeout = setTimeout(() => {
      const url = new URL(window.location.href)
      if (value.trim()) {
        url.searchParams.set(paramKey, value.trim())
      } else {
        url.searchParams.delete(paramKey)
      }
      url.searchParams.delete('page')
      router.replace(url.pathname + (url.searchParams.size ? '?' + url.searchParams.toString() : ''))
    }, 300)
    return () => clearTimeout(timeout)
  }, [value, pathname, paramKey])

  return (
    <div className="relative">
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className="pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-lg w-60 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
      />
      {value && (
        <button onClick={() => setValue('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
          <X size={14} />
        </button>
      )}
    </div>
  )
}
