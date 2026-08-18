import {
  type StampLatticeOffsetV1,
  type StampLayerSlotV1,
  type StampTemplateV1,
  validateStampTemplates,
} from '@type-pal/content'
import type { GridPointRef } from './map-selection.js'
import {
  type IsometricNudgeDirection,
  latticeU,
  nudgeIsometricLattice,
  relativeLatticeOffset,
  resolveRelativeLatticeOffset,
} from './map-transform.js'

const DRAFT_ANCHOR: GridPointRef = { row: 0, col: 0 }

export type StampDraftChannel = { kind: 'visual'; layerSlotId: string } | { kind: 'collision' }

function offsetKey(offset: StampLatticeOffsetV1): string {
  return `${offset.dRow}:${offset.du}`
}

export function stampDraftPointKey(point: GridPointRef): string {
  return `${point.row}:${point.col}`
}

export function stampDraftPoint(offset: StampLatticeOffsetV1): GridPointRef {
  return resolveRelativeLatticeOffset(DRAFT_ANCHOR, offset)
}

export function stampDraftOffset(point: GridPointRef): StampLatticeOffsetV1 {
  return relativeLatticeOffset(point, DRAFT_ANCHOR)
}

export function openStampDraft(template: StampTemplateV1): StampTemplateV1 {
  return structuredClone(template)
}

/** Blank drafts may be temporarily invalid until the first visual member is painted. */
export function createBlankStampDraft(
  id: string,
  name: string,
  tilesetId: string,
): StampTemplateV1 {
  return {
    id,
    name,
    tilesetId,
    origin: 'authored',
    layerSlots: [{ id: 'base', name: '基础', depthMode: 'flat' }],
    visual: [],
    collision: [],
  }
}

export function canonicalizeStampDraft(
  draft: StampTemplateV1,
  availableTileIds?: ReadonlySet<number>,
): StampTemplateV1 {
  const slotOrder = new Map(draft.layerSlots.map((slot, index) => [slot.id, index] as const))
  const visual = draft.visual
    .map((member) => ({
      ...member,
      offset: { ...member.offset },
    }))
    .sort(
      (left, right) =>
        (slotOrder.get(left.layerSlotId) ?? Number.MAX_SAFE_INTEGER) -
          (slotOrder.get(right.layerSlotId) ?? Number.MAX_SAFE_INTEGER) ||
        left.offset.dRow - right.offset.dRow ||
        left.offset.du - right.offset.du ||
        left.tileId - right.tileId ||
        left.height - right.height,
    )
  if (availableTileIds) {
    const missing = [...new Set(visual.map((member) => member.tileId))]
      .filter((tileId) => !availableTileIds.has(tileId))
      .sort((left, right) => left - right)
    if (missing.length) throw new Error(`瓦片集缺少 tileId：${missing.join('、')}。`)
  }
  const collision = draft.collision
    .map((member) => ({ ...member, offset: { ...member.offset } }))
    .sort(
      (left, right) =>
        left.offset.dRow - right.offset.dRow ||
        left.offset.du - right.offset.du ||
        left.value - right.value,
    )
  return validateStampTemplates([
    {
      ...draft,
      id: draft.id.trim(),
      name: draft.name.trim(),
      ...(draft.category?.trim() ? { category: draft.category.trim() } : { category: undefined }),
      layerSlots: draft.layerSlots.map((slot) => ({ ...slot, name: slot.name.trim() })),
      visual,
      collision,
    },
  ])[0]!
}

export function nextStampLayerSlotId(draft: StampTemplateV1, base = 'layer'): string {
  const used = new Set(draft.layerSlots.map((slot) => slot.id))
  if (!used.has(base)) return base
  let suffix = 2
  while (used.has(`${base}-${suffix}`)) suffix += 1
  return `${base}-${suffix}`
}

export function addStampDraftLayer(
  draft: StampTemplateV1,
  slot: StampLayerSlotV1,
): StampTemplateV1 {
  if (!slot.id.trim()) throw new Error('局部图层槽 ID 不能为空。')
  if (!slot.name.trim()) throw new Error('局部图层名称不能为空。')
  if (draft.layerSlots.some((candidate) => candidate.id === slot.id))
    throw new Error(`局部图层槽 ID “${slot.id}” 已存在。`)
  return {
    ...draft,
    layerSlots: [...draft.layerSlots, { ...slot, id: slot.id.trim(), name: slot.name.trim() }],
  }
}

export function updateStampDraftLayer(
  draft: StampTemplateV1,
  slotId: string,
  patch: Partial<Pick<StampLayerSlotV1, 'name' | 'depthMode'>>,
): StampTemplateV1 {
  const slot = draft.layerSlots.find((candidate) => candidate.id === slotId)
  if (!slot) throw new Error(`局部图层槽 “${slotId}” 不存在。`)
  const name = patch.name === undefined ? slot.name : patch.name
  const depthMode = patch.depthMode ?? slot.depthMode
  return {
    ...draft,
    layerSlots: draft.layerSlots.map((candidate) =>
      candidate.id === slotId ? { ...candidate, name, depthMode } : candidate,
    ),
    visual: draft.visual.map((member) =>
      member.layerSlotId === slotId && depthMode === 'flat' ? { ...member, height: 0 } : member,
    ),
  }
}

export function moveStampDraftLayer(
  draft: StampTemplateV1,
  slotId: string,
  direction: -1 | 1,
): StampTemplateV1 {
  const index = draft.layerSlots.findIndex((slot) => slot.id === slotId)
  if (index < 0) throw new Error(`局部图层槽 “${slotId}” 不存在。`)
  const target = index + direction
  if (target < 0 || target >= draft.layerSlots.length) return draft
  const layerSlots = [...draft.layerSlots]
  const [slot] = layerSlots.splice(index, 1)
  layerSlots.splice(target, 0, slot!)
  return { ...draft, layerSlots }
}

export function deleteStampDraftLayer(draft: StampTemplateV1, slotId: string): StampTemplateV1 {
  if (draft.layerSlots.length <= 1) throw new Error('组合必须至少保留一个视觉层。')
  if (!draft.layerSlots.some((slot) => slot.id === slotId))
    throw new Error(`局部图层槽 “${slotId}” 不存在。`)
  const visual = draft.visual.filter((member) => member.layerSlotId !== slotId)
  if (!visual.length) throw new Error('不能删除包含最后一个视觉成员的图层。')
  return {
    ...draft,
    layerSlots: draft.layerSlots.filter((slot) => slot.id !== slotId),
    visual,
  }
}

export function setStampDraftVisual(
  draft: StampTemplateV1,
  slotId: string,
  point: GridPointRef,
  tileId: number,
  height: number,
): StampTemplateV1 {
  const slot = draft.layerSlots.find((candidate) => candidate.id === slotId)
  if (!slot) throw new Error(`局部图层槽 “${slotId}” 不存在。`)
  if (!Number.isSafeInteger(tileId) || tileId < 0) throw new Error('tileId 必须是非负整数。')
  if (!Number.isSafeInteger(height) || height < 0) throw new Error('高度必须是非负整数。')
  if (slot.depthMode === 'flat' && height !== 0) throw new Error('平面层高度必须为 0。')
  const offset = stampDraftOffset(point)
  const index = draft.visual.findIndex(
    (member) => member.layerSlotId === slotId && offsetKey(member.offset) === offsetKey(offset),
  )
  const member = { layerSlotId: slotId, offset, tileId, height }
  if (index < 0) return { ...draft, visual: [...draft.visual, member] }
  const visual = [...draft.visual]
  visual[index] = member
  return { ...draft, visual }
}

export function eraseStampDraftVisual(
  draft: StampTemplateV1,
  slotId: string,
  point: GridPointRef,
): StampTemplateV1 {
  const offset = stampDraftOffset(point)
  const index = draft.visual.findIndex(
    (member) => member.layerSlotId === slotId && offsetKey(member.offset) === offsetKey(offset),
  )
  if (index < 0) return draft
  if (draft.visual.length <= 1) throw new Error('组合必须至少保留一个视觉成员。')
  if (draft.visual.filter((member) => member.layerSlotId === slotId).length <= 1)
    throw new Error('每个视觉层必须至少保留一个成员；如不再需要，请删除整个图层。')
  return { ...draft, visual: draft.visual.filter((_, memberIndex) => memberIndex !== index) }
}

export function setStampDraftCollision(
  draft: StampTemplateV1,
  point: GridPointRef,
  value: number,
): StampTemplateV1 {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error('碰撞值必须是非负整数。')
  const offset = stampDraftOffset(point)
  const index = draft.collision.findIndex(
    (member) => offsetKey(member.offset) === offsetKey(offset),
  )
  const member = { offset, value }
  if (index < 0) return { ...draft, collision: [...draft.collision, member] }
  const collision = [...draft.collision]
  collision[index] = member
  return { ...draft, collision }
}

export function eraseStampDraftCollision(
  draft: StampTemplateV1,
  point: GridPointRef,
): StampTemplateV1 {
  const key = offsetKey(stampDraftOffset(point))
  return {
    ...draft,
    collision: draft.collision.filter((member) => offsetKey(member.offset) !== key),
  }
}

export function reanchorStampDraft(
  draft: StampTemplateV1,
  nextAnchor: GridPointRef,
): StampTemplateV1 {
  const translate = (offset: StampLatticeOffsetV1): StampLatticeOffsetV1 =>
    relativeLatticeOffset(stampDraftPoint(offset), nextAnchor)
  return {
    ...draft,
    visual: draft.visual.map((member) => ({ ...member, offset: translate(member.offset) })),
    collision: draft.collision.map((member) => ({ ...member, offset: translate(member.offset) })),
  }
}

export function moveStampDraftSelection(
  draft: StampTemplateV1,
  channel: StampDraftChannel,
  points: readonly GridPointRef[],
  direction: IsometricNudgeDirection,
): StampTemplateV1 {
  const selectedKeys = new Set(points.map(stampDraftPointKey))
  if (!selectedKeys.size) return draft
  const destination = new Map(
    points.map((point) => [stampDraftPointKey(point), nudgeIsometricLattice(point, direction)]),
  )
  if (channel.kind === 'collision') {
    const stationary = new Set(
      draft.collision
        .map((member) => stampDraftPoint(member.offset))
        .filter((point) => !selectedKeys.has(stampDraftPointKey(point)))
        .map(stampDraftPointKey),
    )
    for (const point of destination.values())
      if (stationary.has(stampDraftPointKey(point)))
        throw new Error('移动目标已有碰撞成员，请先清理目标位置。')
    return {
      ...draft,
      collision: draft.collision.map((member) => {
        const point = stampDraftPoint(member.offset)
        const next = destination.get(stampDraftPointKey(point))
        return next ? { ...member, offset: stampDraftOffset(next) } : member
      }),
    }
  }
  const stationary = new Set(
    draft.visual
      .filter((member) => member.layerSlotId === channel.layerSlotId)
      .map((member) => stampDraftPoint(member.offset))
      .filter((point) => !selectedKeys.has(stampDraftPointKey(point)))
      .map(stampDraftPointKey),
  )
  for (const point of destination.values())
    if (stationary.has(stampDraftPointKey(point)))
      throw new Error('移动目标在当前视觉层已有成员，请先清理目标位置。')
  return {
    ...draft,
    visual: draft.visual.map((member) => {
      if (member.layerSlotId !== channel.layerSlotId) return member
      const point = stampDraftPoint(member.offset)
      const next = destination.get(stampDraftPointKey(point))
      return next ? { ...member, offset: stampDraftOffset(next) } : member
    }),
  }
}

export function stampDraftBounds(draft: StampTemplateV1, padding = 2) {
  const points = [
    DRAFT_ANCHOR,
    ...draft.visual.map((member) => stampDraftPoint(member.offset)),
    ...draft.collision.map((member) => stampDraftPoint(member.offset)),
  ]
  return {
    minRow: Math.min(...points.map((point) => point.row)) - padding,
    maxRow: Math.max(...points.map((point) => point.row)) + padding,
    minCol: Math.min(...points.map((point) => point.col)) - padding,
    maxCol: Math.max(...points.map((point) => point.col)) + padding,
    minU: Math.min(...points.map(latticeU)) - padding * 2,
    maxU: Math.max(...points.map(latticeU)) + padding * 2,
  }
}
