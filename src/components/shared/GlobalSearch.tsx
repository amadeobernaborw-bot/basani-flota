'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2, Users, Truck, FileText, X } from 'lucide-react'
import {
  globalSearch,
  type SearchResult,
  type SearchResultType,
} from '@/lib/actions/search'

const ICON_BY_TYPE: Record<
  SearchResultType,
  { icon: React.ElementType; color: string }
> = {
  employee: { icon: Users, color: 'text-green-600' },
  vehicle: { icon: Truck, color: 'text-blue-600' },
  employee_document: { icon: FileText, color: 'text-purple-600' },
  vehicle_document: { icon: FileText, color: 'text-orange-600' },
}

const TYPE_LABEL: Record<SearchResultType, string> = {
  employee: 'Empleado',
  vehicle: 'Vehículo',
  employee_document: 'Doc. empleado',
  vehicle_document: 'Doc. vehículo',
}

const DEBOUNCE_MS = 250

export default function GlobalSearch() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const requestIdRef = useRef(0)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    const term = query.trim()
    if (term.length < 2) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const reqId = ++requestIdRef.current

    const timer = setTimeout(async () => {
      const { results: data } = await globalSearch(term)
      if (reqId !== requestIdRef.current) {
        return
      }
      setResults(data)
      setActiveIndex(data.length > 0 ? 0 : -1)
      setLoading(false)
    }, DEBOUNCE_MS)

    return () => clearTimeout(timer)
  }, [query])

  function handleSelect(result: SearchResult) {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(result.href)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const selected = results[activeIndex]
      if (selected) handleSelect(selected)
    } else if (e.key === 'Escape') {
      setOpen(false)
    }
  }

  function handleClear() {
    setQuery('')
    setResults([])
    setOpen(false)
  }

  const showDropdown = open && query.trim().length >= 2

  return (
    <div className="relative" ref={containerRef}>
      <div className="relative">
        <Search
          size={14}
          className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar..."
          className="w-full rounded-lg border border-gray-200 bg-white pl-8 pr-7 py-1.5 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        {query.length > 0 && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
            aria-label="Limpiar"
          >
            <X size={12} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-full mt-1 z-40 max-h-[60vh] overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
          {loading ? (
            <div className="flex items-center gap-2 px-3 py-2.5 text-xs text-gray-500">
              <Loader2 size={12} className="animate-spin" />
              Buscando…
            </div>
          ) : results.length === 0 ? (
            <p className="px-3 py-2.5 text-xs text-gray-500">
              Sin resultados para “{query.trim()}”.
            </p>
          ) : (
            <ul className="py-1">
              {results.map((result, idx) => {
                const { icon: Icon, color } = ICON_BY_TYPE[result.type]
                const isActive = idx === activeIndex
                return (
                  <li key={`${result.type}-${result.id}`}>
                    <button
                      type="button"
                      onMouseEnter={() => setActiveIndex(idx)}
                      onClick={() => handleSelect(result)}
                      className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                        isActive ? 'bg-gray-100' : 'hover:bg-gray-50'
                      }`}
                    >
                      <Icon size={14} className={`shrink-0 ${color}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-xs font-medium text-gray-900">
                          {result.label}
                        </span>
                        <span className="block truncate text-[10px] text-gray-500">
                          {result.sublabel}
                        </span>
                      </span>
                      <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-gray-500">
                        {TYPE_LABEL[result.type]}
                      </span>
                    </button>
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
