// Banner configuration - edit this file to update ads
// Requires: Deploy after changes (30 seconds via Vercel)

export interface Banner {
  id: string
  businessName: string
  imageUrl: string
  altText: string
  targetUrl?: string
  placement: 'header' | 'inline'
}

export const banners: Banner[] = [
  // Add banners here when ready - currently empty for MVP launch
]
