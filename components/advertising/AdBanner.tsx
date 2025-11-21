'use client'

import { useEffect, useState } from 'react'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import Image from 'next/image'

interface AdBannerData {
  id: string
  business_name: string
  banner_image_url: string
  banner_alt_text: string | null
  target_url: string | null
  impressions: number
  clicks: number
}

interface AdBannerProps {
  placement: 'header' | 'sidebar' | 'footer' | 'inline'
  className?: string
}

/**
 * AdBanner Component
 *
 * Displays advertising banners for LMR community businesses.
 * Features:
 * - Auto-fetches active banner for specified placement
 * - Tracks impressions (when banner is displayed)
 * - Tracks clicks (when banner is clicked)
 * - Shows "Ad • Supporting LMR Community Business" label
 *
 * Beta Program:
 * - FREE ads for LMR resident businesses (3 months)
 * - Helps cover platform costs (Neon DB, hosting, Claude Pro)
 * - Revenue target: ₱1,500-3,750/month post-beta
 *
 * @example
 * // In header
 * <AdBanner placement="header" />
 *
 * // In sidebar
 * <AdBanner placement="sidebar" className="my-4" />
 */
export default function AdBanner({ placement, className = '' }: AdBannerProps) {
  const [banner, setBanner] = useState<AdBannerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch active banner for this placement
  useEffect(() => {
    async function fetchBanner() {
      try {
        const response = await fetch(`/api/banners?placement=${placement}`)

        if (!response.ok) {
          if (response.status === 404) {
            // No banner available - this is fine
            setBanner(null)
            return
          }
          throw new Error(`Failed to fetch banner: ${response.statusText}`)
        }

        const data = await response.json()
        setBanner(data)

        // Track impression
        if (data?.id) {
          await fetch(`/api/banners/${data.id}/impression`, {
            method: 'POST'
          })
        }
      } catch (err) {
        console.error('Error fetching banner:', err)
        setError(err instanceof Error ? err.message : 'Failed to load banner')
      } finally {
        setIsLoading(false)
      }
    }

    fetchBanner()
  }, [placement])

  // Handle banner click
  const handleClick = async () => {
    if (!banner?.id) return

    try {
      // Track click
      await fetch(`/api/banners/${banner.id}/click`, {
        method: 'POST'
      })

      // Open target URL if provided
      if (banner.target_url) {
        window.open(banner.target_url, '_blank', 'noopener,noreferrer')
      }
    } catch (err) {
      console.error('Error tracking banner click:', err)
    }
  }

  // Don't render anything if loading, error, or no banner
  if (isLoading) return null
  if (error) return null
  if (!banner) return null

  // Placement-specific styling
  const placementStyles = {
    header: 'w-full max-w-4xl mx-auto',
    sidebar: 'w-full max-w-xs',
    footer: 'w-full max-w-4xl mx-auto',
    inline: 'w-full max-w-2xl mx-auto'
  }

  return (
    <div className={`ad-banner ${placementStyles[placement]} ${className}`}>
      {/* Ad Label (Transparency) */}
      <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
        <span className="font-medium">Ad</span>
        <span>•</span>
        <span>Supporting LMR Community Business</span>
      </div>

      {/* Banner Content */}
      <div
        onClick={handleClick}
        className={`
          relative overflow-hidden rounded-lg border border-gray-200
          ${banner.target_url ? 'cursor-pointer hover:shadow-lg transition-shadow' : ''}
        `}
        role={banner.target_url ? 'button' : undefined}
        aria-label={banner.target_url ? `Visit ${banner.business_name}` : undefined}
      >
        {/* Banner Image */}
        <div className="relative w-full h-auto">
          <img
            src={banner.banner_image_url}
            alt={banner.banner_alt_text || `${banner.business_name} advertisement`}
            className="w-full h-auto"
            loading="lazy"
          />
        </div>

        {/* Business Name Overlay (if no alt text) */}
        {!banner.banner_alt_text && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white px-3 py-2 text-sm">
            {banner.business_name}
          </div>
        )}
      </div>

      {/* Analytics Debug (only in development) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="text-xs text-gray-400 mt-1">
          👁️ {banner.impressions} views • 🖱️ {banner.clicks} clicks
          {banner.impressions > 0 && (
            <span className="ml-2">
              ({((banner.clicks / banner.impressions) * 100).toFixed(1)}% CTR)
            </span>
          )}
        </div>
      )}
    </div>
  )
}
