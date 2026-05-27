import Image from 'next/image'

interface BasaniLogoProps {
  height?: number
  className?: string
}

export default function BasaniLogo({ height = 36, className }: BasaniLogoProps) {
  const aspectRatio = 400 / 120
  const width = Math.round(height * aspectRatio)

  return (
    <Image
      src="/logo.png"
      alt="Basani"
      height={height}
      width={width}
      className={className}
      style={{ objectFit: 'contain' }}
      priority
    />
  )
}
