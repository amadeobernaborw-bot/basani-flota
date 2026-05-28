'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import Link from 'next/link'
import { Search, Users, Truck, FileText, Loader2, X } from 'lucide-react'
import { globalSearch, type SearchResult, type SearchResultType } from '@/lib/actions/search'

const TYPE_ICON: Record<SearchResultType, React.ElementType> = {
  employee: Users,
  vehicle: Truck,
  employee_document: FileText,
  vehicle_document: FileText,
}

const TYPE_LABEL: Record<SearchResultType, string> = {
  employee: 'Empleado',
  vehicle: 'Vehículo',
  employee_document: 'Doc. empleado',
  vehicle_document: 'Doc. vehículo',
}

const TYPE_COLOR: Record<SearchResultType, string> = {
  employee: 'text-green-600 bg-green-50',
  vehicle: 'text-blue-600 bg-blue-50',
  employee_document: 'text-gray-600 bg-gray-100',
  vehicle_document: 'text-gray-600 bg-gray-100',
}

export default function DashboardSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Debounce search
  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      setOpen(false)
      return
    }
    const timer = setTimeout(() => {
      startTransition(async () => {
        const res = await globalSearch(query)
        setResults(res.results)
        setOpen(true)
      })
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  function clear() {
    setQuery('')
    setResults([])
    setOpen(false)
    inputRef.current?.focus()
  }

  return (
    <div ref={containerRef} className="relative w-full max-w-lg">
      {/* Input */}
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm focus-within:border-gray-400 focus-within:ring-2 focus-within:ring-gray-200 transition-all">
        {isPending ? (
          <Loader2 size={16} className="shrink-0 animate-spin text-gray-400" />
        ) : (
          <Search size={16} className="shrink-0 text-gray-400" />
        )}
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Buscar empleados, vehículos, documentos…"
          className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 outline-none"
        />
        {query && (
          <button onClick={clear} className="shrink-0 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 max-h-80 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
          {results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-gray-400">
              Sin resultados para &quot;{query}&quot;
            </div>
          ) : (
            <ul className="py-1">
              {results.map((result) => {
                const Icon = TYPE_ICON[result.type]
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <Link
                      href={result.href}
                      onClick={() => { setOpen(false); setQuery('') }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors"
                    >
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] ${TYPE_COLOR[result.type]}`}>
                        <Icon size={14} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900">{result.label}</p>
                        <p className="truncate text-xs text-gray-400">{result.sublabel}</p>
                      </div>
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-gray-300">
                        {TYPE_LABEL[result.type]}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
