import { describe, expect, test } from 'vitest'
import { syntheticSupply } from './__tests__/glm-o/supply-fixture.js'
import { buildPalContentSupply } from './pal-content-supply.js'

describe('PAL source projections', () => {
  test('同一 EventObject 出现在多个场景时 fail-loud（全局实体唯一）', () => {
    const { sources } = syntheticSupply()
    const [first] = sources.scenes
    sources.scenes = [
      ...sources.scenes,
      { ...first!, sceneId: 2, eventObjects: [...first!.eventObjects] },
    ]
    expect(() => buildPalContentSupply(sources)).toThrow(
      `PAL EventObject ${first!.eventObjects[0]!.id + 1} 出现在多个场景`,
    )
  })

  test('源地图 tileset 路径漂移时 fail-loud（期望 tileset/<mapNum>.rle）', () => {
    const { sources } = syntheticSupply()
    sources.tilemaps = [
      {
        ...sources.tilemaps[0]!,
        source: { ...sources.tilemaps[0]!.source, tileset: 'tileset/2.rle' },
      },
    ]
    expect(() => buildPalContentSupply(sources)).toThrow(
      'map 1: tileset 路径期望 tileset/1.rle，收到 tileset/2.rle',
    )
  })

  test('生成精灵分区只保留角色资产定义（overlay/场景变体不入分区）', () => {
    const { sources } = syntheticSupply()
    const generated = buildPalContentSupply(sources)
    const ids = generated.roleDefinitions.map(({ id }) => id).sort()
    expect(ids).toEqual(['anu', 'gai-luojiao', 'li-xiaoyao', 'lin-yueru', 'wu-hou', 'zhao-linger'])
  })

  test('scenes 按 sceneId 升序进入生成侧（与源数组顺序无关）', () => {
    const { sources } = syntheticSupply()
    sources.scenes = [
      { sceneId: 42, mapNum: 1, eventObjects: [] },
      { sceneId: 3, mapNum: 1, eventObjects: [] },
    ]
    const generated = buildPalContentSupply(sources)
    const ids = generated.scenes.map(({ id }) => id)
    expect(ids).toEqual(['s003', 's042'])
  })

  test('实体 spriteNum<=0 不产生场景实体', () => {
    const { sources } = syntheticSupply()
    sources.scenes = [
      {
        sceneId: 4,
        mapNum: 1,
        eventObjects: [
          { id: 7, x: 0, y: 0, spriteNum: 0 },
          { id: 8, x: 16, y: 16, spriteNum: 541, nSpriteFrames: 0 },
        ],
      },
    ]
    const generated = buildPalContentSupply(sources)
    expect(generated.scenes[0]?.entities).toEqual([{ id: 'e8', sprite: 'sprite-541' }])
  })
})
