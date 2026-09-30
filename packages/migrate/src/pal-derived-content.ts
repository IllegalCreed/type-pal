import type { ShopDef } from '@type-pal/content'

export interface SourceStore {
  id: number
  items: number[]
}

export function migratePalShops(stores: readonly SourceStore[]): ShopDef[] {
  return stores
    .filter((store) => store.id !== 0)
    .map((store) => ({ id: store.id, items: store.items.map(String) }))
}
