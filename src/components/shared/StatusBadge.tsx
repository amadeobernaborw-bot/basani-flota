import type { StatusColor } from '@/lib/utils/status'
import { STATUS_CLASSES } from '@/lib/utils/status'

interface StatusBadgeProps {
  color: StatusColor
  label: string
}

export default function StatusBadge({ color, label }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_CLASSES[color]}`}
    >
      {label}
    </span>
  )
}
