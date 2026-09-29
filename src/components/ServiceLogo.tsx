'use client'
import { useState } from 'react'
import { getLogoUrl } from '@/utils/serviceLogos'
import { getServiceBrand } from '@/utils/branding'

export default function ServiceLogo({ name, size = 48, customLogoUrl }: { name: string, size?: number, customLogoUrl?: string | null }) {
  const logoUrl = customLogoUrl || getLogoUrl(name)
  const brand = getServiceBrand(name)
  const [failed, setFailed] = useState(false)

  if (logoUrl && !failed) {
    return (
      <div
        className="flex flex-shrink-0 items-center justify-center rounded-full overflow-hidden bg-white"
        style={{ width: size, height: size, minWidth: size, minHeight: size }}
      >
        <img
          src={logoUrl}
          alt={name}
          width={size * 0.7}
          height={size * 0.7}
          className="object-contain"
          onError={() => setFailed(true)}
        />
      </div>
    )
  }

  // Fallback: styled initials
  return (
    <div
      className={`flex flex-shrink-0 items-center justify-center rounded-full border ${brand.border} ${brand.bg} ${brand.text} font-black shadow-md`}
      style={{ width: size, height: size, minWidth: size, minHeight: size, fontSize: size * 0.3 }}
    >
      {name.slice(0, 2).toUpperCase()}
    </div>
  )
}
