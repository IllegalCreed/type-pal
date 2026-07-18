import type { AssetKind } from '@type-pal/content'

export const STATIC_IMAGE_KINDS = [
  'portrait',
  'face',
  'item-icon',
  'battle-background',
] as const satisfies readonly AssetKind[]

export type StaticImageKind = (typeof STATIC_IMAGE_KINDS)[number]
