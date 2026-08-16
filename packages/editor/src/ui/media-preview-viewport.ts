export const MEDIA_PREVIEW_MIN_ZOOM = 0.25
export const MEDIA_PREVIEW_MAX_ZOOM = 8

const MEDIA_PREVIEW_ZOOM_FACTOR = 1.25

export function clampMediaPreviewZoom(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(MEDIA_PREVIEW_MAX_ZOOM, Math.max(MEDIA_PREVIEW_MIN_ZOOM, value))
}

export function stepMediaPreviewZoom(value: number, direction: -1 | 1): number {
  return clampMediaPreviewZoom(
    value * (direction > 0 ? MEDIA_PREVIEW_ZOOM_FACTOR : 1 / MEDIA_PREVIEW_ZOOM_FACTOR),
  )
}

export function fitMediaPreviewZoom(args: {
  viewportWidth: number
  viewportHeight: number
  mediaWidth: number
  mediaHeight: number
  padding?: number
}): number {
  const padding = Math.max(0, args.padding ?? 48)
  if (
    !Number.isFinite(args.viewportWidth) ||
    !Number.isFinite(args.viewportHeight) ||
    !Number.isFinite(args.mediaWidth) ||
    !Number.isFinite(args.mediaHeight) ||
    args.mediaWidth <= 0 ||
    args.mediaHeight <= 0
  )
    return 1
  return clampMediaPreviewZoom(
    Math.min(
      Math.max(1, args.viewportWidth - padding) / args.mediaWidth,
      Math.max(1, args.viewportHeight - padding) / args.mediaHeight,
    ),
  )
}
