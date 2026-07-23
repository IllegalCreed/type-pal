import type { ItemData } from '@type-pal/content'

function nextSerialId(prefix: string, existing: ReadonlySet<string>): string {
  for (let serial = 1; ; serial++) {
    const id = `${prefix}-${String(serial).padStart(3, '0')}`
    if (!existing.has(id)) return id
  }
}

/** 新工程与迁移工程共用的作者物品 id 分配；不依赖数组位置或旧 PAL 数字号。 */
export function nextAuthoredItemId(items: readonly Pick<ItemData, 'id'>[]): string {
  return nextSerialId('item', new Set(items.map((item) => item.id)))
}

export function nextCopiedItemId(sourceId: string, items: readonly Pick<ItemData, 'id'>[]): string {
  const existing = new Set(items.map((item) => item.id))
  const base = `${sourceId}-copy`
  if (!existing.has(base)) return base
  for (let serial = 2; ; serial++) {
    const id = `${base}-${serial}`
    if (!existing.has(id)) return id
  }
}

export function createBlankItem(items: readonly Pick<ItemData, 'id'>[]): ItemData {
  return {
    id: nextAuthoredItemId(items),
    name: '新物品',
    desc: [],
    buyPrice: 0,
    sellPrice: 0,
    sellable: false,
  }
}

/** 复制能力数据但只复用资源/共享脚本的稳定引用，不复制共享资源本体。 */
export function cloneItemForAuthoring(source: ItemData, items: readonly ItemData[]): ItemData {
  return {
    ...structuredClone(source),
    id: nextCopiedItemId(source.id, items),
    name: `${source.name} 副本`,
  }
}
