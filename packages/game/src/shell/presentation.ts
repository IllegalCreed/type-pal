/** Only presentation preferences vary by layout; saves, audio and records remain shared. */
export const LAYOUT_CHANGE = 'tp-layout-change'

export function isMobileLayout(): boolean {
  return typeof document !== 'undefined' && document.documentElement.dataset.tpLayout === 'mobile'
}

export function presentationKey(key: string): string {
  return isMobileLayout() ? `${key}-mobile` : key
}
