/**
 * TEST-COVERAGE85-KIMI-EXTRACT-MIGRATE-1 · pal-world-sprite-registry 残余分支合同。
 *
 * 排重 basis（旧 fullName 不重复）：pal-world-sprite-registry.test.ts 覆盖场景证据注册、
 * overlay 叠加、variant 冲突报告、ensureSpriteDefinition 幂等主路径；
 * world-sprite-layout-registry.test.ts 覆盖 overlay 源断言。本文件只补 fast lcov
 * 一手测量的未覆盖 edge：
 * - layoutKey 的 loop 布局与 ticksPerFrame ?? '' 双方向（:52-53，经语义角色精灵注入）。
 * - entity 缺 nSpriteFrames 的 ?? 0 回退（:72）。
 * - sceneEvidence 排序 tie-break：同 sceneId 比 entityId、同 entity 比 nSpriteFrames（:100）。
 * - overlay 布局键与语义角色精灵布局键相同 → 不重复登记（:125 false）。
 * - 同一 registration 二次 ensure：spriteDefs 已存在跳建（:166 false）、
 *   layoutEvidence 去重跳记（:174 false）。
 * 不覆盖（ledger）：:76 第三条件（eventObjects 已按 id 升序遍历，同 scene 内后到者
 * id 不可能更小）、:92 overlay 重复 spriteNum（PAL_WORLD_SPRITE_LAYOUT_OVERLAYS 为
 * 冻结常量、无重复，公开入口不可注入）、:109 sceneEvidence[0]?.nSpriteFrames ?? 0
 * （sceneLayout 只在无 overlay 时求值，此时 sprite 必来自场景证据 → [0] 恒在）。
 */

import type { SpriteDef } from '@type-pal/content'
import { palSpriteAssetId } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { SourceEventObject, SourceScene } from './pal-source-types.js'
import { createPalWorldSpriteRegistry, migratedSpriteId } from './pal-world-sprite-registry.js'

function entity(id: number, spriteNum: number, nSpriteFrames?: number): SourceEventObject {
  return { id, x: 0, y: 0, spriteNum, ...(nSpriteFrames === undefined ? {} : { nSpriteFrames }) }
}

function scene(sceneId: number, eventObjects: SourceEventObject[]): SourceScene {
  return { sceneId, mapNum: 1, eventObjects }
}

function roleSprite(
  spriteNum: number,
  layout: SpriteDef['layout'],
  id = `role-${spriteNum}`,
): SpriteDef {
  return { id, asset: palSpriteAssetId(spriteNum), label: `角色精灵 ${spriteNum}`, layout }
}

describe('KIMI-R1 世界精灵注册表残余分支', () => {
  test('layoutKey：语义角色精灵注入 loop 布局（含/缺 ticksPerFrame）', () => {
    // 236/242 有冻结 static overlay → 必在 allSpriteNums 并集内；语义角色精灵以
    // loop 布局接管 primaryLayout → layoutKey 走 loop 臂（242 缺 ticksPerFrame → ?? ''）。
    // loop ≠ static overlay → 建立 -f 变体并入 conflicts（变体 id 非 primary）。
    const registry = createPalWorldSpriteRegistry(
      [],
      new Map<number, SpriteDef>([
        [236, roleSprite(236, { kind: 'loop', frameCount: 4, ticksPerFrame: 8 })],
        [242, roleSprite(242, { kind: 'loop', frameCount: 3 })],
      ]),
      { sceneSemanticSpriteIds: new Set(['role-236', 'role-242']) },
    )
    // 语义别名 externalDefinition + overlay variant（id == migratedSpriteId → 非 conflict）；
    // spriteDefs/layoutEvidence 为 spriteRef 懒取：无场景引用时保持空。
    expect(registry.report.layoutConflicts).toEqual([])
    expect(registry.report.layoutEvidence).toEqual([])
    expect(registry.spriteDefs.size).toBe(0)
  })

  test('entity 缺 nSpriteFrames：按 0 注册为 static 布局', () => {
    const registry = createPalWorldSpriteRegistry([scene(1, [entity(2, 900)])], new Map())
    const ref = registry.spriteRef(entity(2, 900))
    expect(ref).toBe(migratedSpriteId(900))
    const def = registry.spriteDefs.get(ref)
    expect(def?.layout).toEqual({ kind: 'static' })
    expect(registry.report.layoutEvidence).toEqual([
      {
        spriteNum: 900,
        definitionId: migratedSpriteId(900),
        source: 'scene',
        evidence: 'scene s001/e2 nSpriteFrames=0',
      },
    ])
  })

  test('sceneEvidence tie-break：同 scene 比 entityId，同 entity 比 nSpriteFrames', () => {
    // sprite 900：e5(f3) 与 e2(f3) 同 sceneId → entityId 比；e2 重复 id 带 f3/f4 →
    // 同 entityId 比 nSpriteFrames。最小者 (scene1,e2,f3) 成 primary。
    const registry = createPalWorldSpriteRegistry(
      [scene(1, [entity(5, 900, 3), entity(2, 900, 3), entity(2, 900, 4)])],
      new Map(),
    )
    expect(registry.spriteRef(entity(2, 900, 3))).toBe(migratedSpriteId(900))
    expect(registry.spriteRef(entity(2, 900, 4))).toBe(migratedSpriteId(900, 4))
    expect(registry.report.layoutConflicts).toEqual([migratedSpriteId(900, 4)])
    // primary 证据来自 (scene1, e2, f3)
    const primaryDef = registry.spriteDefs.get(migratedSpriteId(900))
    expect(primaryDef?.layout).toEqual({ kind: 'directional', framesPerDir: 3 })
  })

  test('overlay 布局键与语义角色精灵相同：不重复登记、不建 variant', () => {
    // sprite 236 有冻结 static overlay；语义角色精灵同为 static → 键重复跳过
    const registry = createPalWorldSpriteRegistry(
      [],
      new Map([[236, roleSprite(236, { kind: 'static' })]]),
      { sceneSemanticSpriteIds: new Set(['role-236']) },
    )
    expect(registry.report.layoutConflicts).toEqual([])
    expect(registry.report.layoutEvidence.filter((entry) => entry.spriteNum === 236)).toEqual([]) // externalDefinition 不登记 evidence
    expect(registry.spriteDefs.has(migratedSpriteId(236))).toBe(false) // overlay 不再另建
  })

  test('同 registration 二次 ensure：不重复建 def、不重复记 evidence', () => {
    const source = scene(1, [entity(2, 900, 3), entity(7, 900, 3)])
    const registry = createPalWorldSpriteRegistry([source], new Map())
    const first = registry.spriteRef(entity(2, 900, 3))
    const second = registry.spriteRef(entity(7, 900, 3))
    expect(second).toBe(first)
    expect([...registry.spriteDefs.keys()]).toEqual([migratedSpriteId(900)])
    expect(registry.report.layoutEvidence).toHaveLength(1)
  })
})
