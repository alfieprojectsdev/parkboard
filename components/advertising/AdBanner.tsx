/* eslint-disable @next/next/no-img-element */
import { banners } from '@/lib/config/banners'

interface AdBannerProps {
  placement: 'header' | 'inline'
  className?: string
}

export default function AdBanner({ placement, className = '' }: AdBannerProps) {
  const banner = banners.find((b) => b.placement === placement)
  if (!banner) return null

  const containerClass = placement === 'header' ? 'max-w-4xl mx-auto' : 'max-w-2xl mx-auto my-8'

  const content = (
    <div className={`${containerClass} ${className}`}>
      <img src={banner.imageUrl} alt={banner.altText} loading="lazy" className="w-full rounded-lg" />
      <p className="text-xs text-gray-400 mt-1 text-center">Ad - Supporting LMR Community</p>
    </div>
  )

  if (banner.targetUrl) {
    return (
      <a href={banner.targetUrl} target="_blank" rel="noopener noreferrer">
        {content}
      </a>
    )
  }

  return content
}
