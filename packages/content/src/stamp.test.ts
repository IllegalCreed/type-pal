import { describe, expect, test } from 'vitest'
import {
  formatStampTemplates,
  parseStampTemplates,
  type StampTemplateV1,
  validateStampTemplates,
} from './stamp.js'

function fixture(): StampTemplateV1[] {
  return [
    {
      id: 'tree-large',
      name: '大树',
      category: 'vegetation',
      tilesetId: 'tileset-003',
      origin: 'authored',
      layerSlots: [
        { id: 'ground', name: '地面', depthMode: 'flat' },
        { id: 'canopy', name: '树冠', depthMode: 'height' },
      ],
      visual: [
        { layerSlotId: 'ground', offset: { dRow: 0, du: 0 }, tileId: 1, height: 0 },
        { layerSlotId: 'canopy', offset: { dRow: -1, du: -1 }, tileId: 2, height: 12 },
      ],
      collision: [{ offset: { dRow: 0, du: 0 }, value: 1 }],
    },
  ]
}

describe('StampTemplateV1', () => {
  test('多层视觉、独立碰撞与确定性格式化往返', () => {
    const templates = validateStampTemplates(fixture())
    expect(templates[0]?.layerSlots).toHaveLength(2)
    const first = formatStampTemplates(templates)
    expect(parseStampTemplates(first)).toEqual(templates)
    expect(formatStampTemplates(parseStampTemplates(first))).toBe(first)
  })

  test('拒绝重复 id、悬空/未使用槽、重复成员和 collision-only', () => {
    const duplicate = [...fixture(), ...fixture()]
    expect(() => validateStampTemplates(duplicate)).toThrow('重复 id')

    const missingSlot = fixture()
    missingSlot[0]!.visual[0]!.layerSlotId = 'missing'
    expect(() => validateStampTemplates(missingSlot)).toThrow('不存在')

    const unusedSlot = fixture()
    unusedSlot[0]!.visual.pop()
    expect(() => validateStampTemplates(unusedSlot)).toThrow('没有视觉成员')

    const duplicateMember = fixture()
    duplicateMember[0]!.visual.push({ ...duplicateMember[0]!.visual[0]! })
    expect(() => validateStampTemplates(duplicateMember)).toThrow('重复视觉成员')

    const duplicateCollision = fixture()
    duplicateCollision[0]!.collision.push({ ...duplicateCollision[0]!.collision[0]! })
    expect(() => validateStampTemplates(duplicateCollision)).toThrow('重复碰撞成员')

    const collisionOnly = fixture()
    collisionOnly[0]!.visual = []
    expect(() => validateStampTemplates(collisionOnly)).toThrow('至少包含一个视觉成员')
  })

  test('错排 offset 必须可解析到整数格，flat 高度必须为 0，碰撞允许显式 0', () => {
    const badParity = fixture()
    badParity[0]!.visual[0]!.offset = { dRow: 0, du: 1 }
    expect(() => validateStampTemplates(badParity)).toThrow('必须同奇偶')

    const flatHeight = fixture()
    flatHeight[0]!.visual[0]!.height = 1
    expect(() => validateStampTemplates(flatHeight)).toThrow('flat')

    const passable = fixture()
    passable[0]!.collision[0]!.value = 0
    expect(validateStampTemplates(passable)[0]?.collision[0]?.value).toBe(0)

    const negative = fixture()
    negative[0]!.visual[0]!.tileId = -1
    expect(() => validateStampTemplates(negative)).toThrow('非负安全整数')

    const unsafe = fixture()
    unsafe[0]!.visual[0]!.offset.du = Number.MAX_SAFE_INTEGER + 1
    expect(() => validateStampTemplates(unsafe)).toThrow('安全整数')
  })
})
