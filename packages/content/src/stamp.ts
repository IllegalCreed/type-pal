/** 可复用图章模板。模板与已放置组是非链接关系。 */

export interface StampLatticeOffsetV1 {
  dRow: number
  /** u = 2 * col + rowParity；与 dRow 必须同奇偶，才能落到整数 lattice 格。 */
  du: number
}

export interface StampLayerSlotV1 {
  /** 模板内稳定身份；落图前显式映射到目标地图 layerId。 */
  id: string
  name: string
  depthMode: 'flat' | 'height'
}

export interface StampVisualMemberV1 {
  layerSlotId: string
  offset: StampLatticeOffsetV1
  tileId: number
  height: number
}

export interface StampCollisionMemberV1 {
  offset: StampLatticeOffsetV1
  /** 允许 0：显式写可通行与“未纳入图章”是不同语义。 */
  value: number
}

export interface StampTemplateV1 {
  id: string
  name: string
  category?: string
  tilesetId: string
  origin: 'authored' | 'migrated'
  layerSlots: StampLayerSlotV1[]
  /** 首版不接受 collision-only 图章，因此必须非空。 */
  visual: StampVisualMemberV1[]
  collision: StampCollisionMemberV1[]
}

function recordAt(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

function nonEmptyString(value: unknown, path: string): string {
  if (typeof value !== 'string' || value.length === 0) throw new Error(`${path}: 期望非空字符串`)
  return value
}

function nonNegativeInt(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value) || (value as number) < 0)
    throw new Error(`${path}: 期望非负安全整数`)
  return value as number
}

function integer(value: unknown, path: string): number {
  if (!Number.isSafeInteger(value)) throw new Error(`${path}: 期望安全整数`)
  return value as number
}

function offsetAt(value: unknown, path: string): StampLatticeOffsetV1 {
  const raw = recordAt(value, path)
  const dRow = integer(raw.dRow, `${path}.dRow`)
  const du = integer(raw.du, `${path}.du`)
  if (Math.abs(dRow % 2) !== Math.abs(du % 2))
    throw new Error(`${path}: dRow 与 du 必须同奇偶，才能解析到整数 lattice 格`)
  return { dRow, du }
}

const offsetKey = (offset: StampLatticeOffsetV1): string => JSON.stringify([offset.dRow, offset.du])

/** 加载边界 guard；返回字段顺序固定的规范化模板数组。 */
export function validateStampTemplates(value: unknown): StampTemplateV1[] {
  if (!Array.isArray(value)) throw new Error('stamps: 期望数组')
  const templateIds = new Set<string>()
  return value.map((entry, index): StampTemplateV1 => {
    const path = `stamps[${index}]`
    const raw = recordAt(entry, path)
    const id = nonEmptyString(raw.id, `${path}.id`)
    if (id.includes('/')) throw new Error(`${path}.id: id 不得含 '/'`)
    if (templateIds.has(id)) throw new Error(`${path}.id: 重复 id "${id}"`)
    templateIds.add(id)
    const name = nonEmptyString(raw.name, `${path}.name`)
    const category =
      raw.category === undefined ? undefined : nonEmptyString(raw.category, `${path}.category`)
    const tilesetId = nonEmptyString(raw.tilesetId, `${path}.tilesetId`)
    if (raw.origin !== 'authored' && raw.origin !== 'migrated')
      throw new Error(`${path}.origin: 期望 authored 或 migrated`)
    if (!Array.isArray(raw.layerSlots) || raw.layerSlots.length === 0)
      throw new Error(`${path}.layerSlots: 至少需要一个局部图层槽`)

    const slotIds = new Set<string>()
    const layerSlots = raw.layerSlots.map((entry, slotIndex): StampLayerSlotV1 => {
      const slotPath = `${path}.layerSlots[${slotIndex}]`
      const slot = recordAt(entry, slotPath)
      const slotId = nonEmptyString(slot.id, `${slotPath}.id`)
      if (slotIds.has(slotId)) throw new Error(`${slotPath}.id: 重复局部图层槽 id "${slotId}"`)
      slotIds.add(slotId)
      const slotName = nonEmptyString(slot.name, `${slotPath}.name`)
      if (slot.depthMode !== 'flat' && slot.depthMode !== 'height')
        throw new Error(`${slotPath}.depthMode: 期望 flat 或 height`)
      return { id: slotId, name: slotName, depthMode: slot.depthMode }
    })

    if (!Array.isArray(raw.visual) || raw.visual.length === 0)
      throw new Error(`${path}.visual: 图章必须至少包含一个视觉成员`)
    if (!Array.isArray(raw.collision)) throw new Error(`${path}.collision: 期望数组`)
    const usedSlots = new Set<string>()
    const visualKeys = new Set<string>()
    const visual = raw.visual.map((entry, memberIndex): StampVisualMemberV1 => {
      const memberPath = `${path}.visual[${memberIndex}]`
      const member = recordAt(entry, memberPath)
      const layerSlotId = nonEmptyString(member.layerSlotId, `${memberPath}.layerSlotId`)
      const slot = layerSlots.find((candidate) => candidate.id === layerSlotId)
      if (!slot) throw new Error(`${memberPath}.layerSlotId: 局部图层槽 "${layerSlotId}" 不存在`)
      usedSlots.add(layerSlotId)
      const offset = offsetAt(member.offset, `${memberPath}.offset`)
      const key = JSON.stringify([layerSlotId, offset.dRow, offset.du])
      if (visualKeys.has(key)) throw new Error(`${memberPath}: 重复视觉成员`)
      visualKeys.add(key)
      const tileId = nonNegativeInt(member.tileId, `${memberPath}.tileId`)
      const height = nonNegativeInt(member.height, `${memberPath}.height`)
      if (slot.depthMode === 'flat' && height !== 0)
        throw new Error(`${memberPath}.height: flat 局部图层槽高度必须为 0`)
      return { layerSlotId, offset, tileId, height }
    })
    const unusedSlot = layerSlots.find((slot) => !usedSlots.has(slot.id))
    if (unusedSlot)
      throw new Error(`${path}.layerSlots: 局部图层槽 "${unusedSlot.id}" 没有视觉成员`)

    const collisionKeys = new Set<string>()
    const collision = raw.collision.map((entry, memberIndex): StampCollisionMemberV1 => {
      const memberPath = `${path}.collision[${memberIndex}]`
      const member = recordAt(entry, memberPath)
      const offset = offsetAt(member.offset, `${memberPath}.offset`)
      const key = offsetKey(offset)
      if (collisionKeys.has(key)) throw new Error(`${memberPath}: 重复碰撞成员`)
      collisionKeys.add(key)
      return { offset, value: nonNegativeInt(member.value, `${memberPath}.value`) }
    })

    return {
      id,
      name,
      ...(category === undefined ? {} : { category }),
      tilesetId,
      origin: raw.origin,
      layerSlots,
      visual,
      collision,
    }
  })
}

/** 独立模板表的确定性格式化入口；加载和编辑器保存共用同一规范化顺序。 */
export function formatStampTemplates(value: readonly StampTemplateV1[]): string {
  return `${JSON.stringify(validateStampTemplates(value), null, 2)}\n`
}

export function parseStampTemplates(text: string): StampTemplateV1[] {
  return validateStampTemplates(JSON.parse(text) as unknown)
}
