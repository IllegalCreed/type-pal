import { describe, expect, it } from 'vitest'
import {
  clampMediaPreviewZoom,
  fitMediaPreviewZoom,
  MEDIA_PREVIEW_MAX_ZOOM,
  MEDIA_PREVIEW_MIN_ZOOM,
  stepMediaPreviewZoom,
} from './media-preview-viewport.js'

describe('shared media preview zoom', () => {
  it('clamps direct and non-finite zoom values', () => {
    expect(clampMediaPreviewZoom(0)).toBe(MEDIA_PREVIEW_MIN_ZOOM)
    expect(clampMediaPreviewZoom(2.35)).toBe(2.35)
    expect(clampMediaPreviewZoom(99)).toBe(MEDIA_PREVIEW_MAX_ZOOM)
    expect(clampMediaPreviewZoom(Number.NaN)).toBe(1)
  })

  it('steps symmetrically and respects both boundaries', () => {
    expect(stepMediaPreviewZoom(1, 1)).toBe(1.25)
    expect(stepMediaPreviewZoom(1.25, -1)).toBe(1)
    expect(stepMediaPreviewZoom(MEDIA_PREVIEW_MIN_ZOOM, -1)).toBe(
      MEDIA_PREVIEW_MIN_ZOOM,
    )
    expect(stepMediaPreviewZoom(MEDIA_PREVIEW_MAX_ZOOM, 1)).toBe(
      MEDIA_PREVIEW_MAX_ZOOM,
    )
  })

  it('fits small and large media into the available viewport', () => {
    expect(
      fitMediaPreviewZoom({
        viewportWidth: 800,
        viewportHeight: 600,
        mediaWidth: 320,
        mediaHeight: 200,
      }),
    ).toBe(2.35)
    expect(
      fitMediaPreviewZoom({
        viewportWidth: 1600,
        viewportHeight: 1200,
        mediaWidth: 78,
        mediaHeight: 91,
      }),
    ).toBe(MEDIA_PREVIEW_MAX_ZOOM)
    expect(
      fitMediaPreviewZoom({
        viewportWidth: 400,
        viewportHeight: 300,
        mediaWidth: 4000,
        mediaHeight: 3000,
      }),
    ).toBe(MEDIA_PREVIEW_MIN_ZOOM)
  })
})
