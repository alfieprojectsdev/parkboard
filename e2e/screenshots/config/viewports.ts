/**
 * Viewport configurations for screenshot capture
 * Defines mobile, tablet, and desktop viewports with device characteristics
 */

export interface ViewportConfig {
  width: number
  height: number
  deviceScaleFactor: number
  isMobile: boolean
  hasTouch: boolean
}

export const VIEWPORTS: Record<string, ViewportConfig> = {
  mobile: {
    width: 375,
    height: 667,
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  tablet: {
    width: 768,
    height: 1024,
    deviceScaleFactor: 2,
    isMobile: false,
    hasTouch: true,
  },
  desktop: {
    width: 1920,
    height: 1080,
    deviceScaleFactor: 1,
    isMobile: false,
    hasTouch: false,
  },
}
