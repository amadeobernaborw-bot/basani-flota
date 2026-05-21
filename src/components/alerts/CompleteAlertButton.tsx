'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, Loader2 } from 'lucide-react'
import { completeAlert } from '@/lib/actions/alerts'

interface CompleteAlertButtonProps {
  id: string
}

export default function CompleteAlertButton({ id }: CompleteAlertButtonProps) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleClick() {
    setLoading(true)
    const result = await completeAlert(id)
    setLoading(false)

    if (!result.error) {
      setDone(true)
      router.refresh()
    }
  }

  if (done) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-600">
        <CheckCircle size={14} />
        Completada
      </span>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-1.5 text-xs font-medium text-gray-700 ring-1 ring-gray-300 transition-colors hover:bg-gray-50 disabled:opacity-50"
    >
      {loading ? (
        <Loader2 size={12} className="animate-spin" />
      ) : (
        <CheckCircle size={12} />
      )}
      Marcar completada
    </button>
  )
}
