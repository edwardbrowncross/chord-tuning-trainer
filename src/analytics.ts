declare global {
  interface Window {
    goatcounter?: {
      count: (opts: { path: string; title?: string; event: boolean }) => void
    }
  }
}

export function trackEvent(path: string, title?: string) {
  if (window.location.hostname === 'localhost') return
  window.goatcounter?.count({ path, title, event: true })
}
