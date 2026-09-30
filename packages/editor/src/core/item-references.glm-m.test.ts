// @vitest-environment node
/**
 * TEST-GLM-WAVE-M-1 M04（item-references.glm-m）：物品引用收集器未触达入口。
 * 去重：item-references.test.ts / cursor-boundaries / glm-leaf-wave 已证 canonical 命令访问、
 * 场景扫描、天书 locator、删除守卫；本文件只补：
 * ① collectLegacyItemReferences——scriptChunks 分片扫描（giveItem/loseItem/branch 条件、
 *   script-chunk locator、无 library 时标签回退 scriptId）；
 * ② collectCanonicalItemTransitionTaggedReferences——状态机转移分支的条件物品边与
 *   then/else 嵌套路径（旧只证 collectCanonicalItemTaggedReferences 的命令入口）；
 * ③ includeLegacyScripts=false 排除开关。
 */

import type { ScriptChunkV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import {
  collectCanonicalItemTransitionTaggedReferences,
  collectItemReferences,
  collectLegacyItemReferences,
} from './item-references.js'

function chunkOf(scripts: Record<string, unknown[]>): Record<string, ScriptChunkV1> {
  return {
    'chunk-m': {
      version: 1,
      scripts: scripts as ScriptChunkV1['scripts'],
    } as ScriptChunkV1,
  }
}

describe('M04 collectLegacyItemReferences scriptChunks 分片扫描', () => {
  test('giveItem/loseItem/branch hasItem 产出 reward/lose/read 三类引用与分片 locator', () => {
    const state = {
      scriptChunks: chunkOf({
        'chunk-m': [
          { kind: 'giveItem', itemId: 'herb-m', count: 2 },
          { kind: 'loseItem', itemId: 'key-m' },
          {
            kind: 'branch',
            cond: { kind: 'hasItem', itemId: 'charm-m', atLeast: 2 },
            then: [{ kind: 'giveItem', itemId: 'then-m' }],
            else: [],
          },
        ],
      }),
      scriptIndex: undefined,
    } as unknown as Parameters<typeof collectLegacyItemReferences>[0]

    const references = collectLegacyItemReferences(state)
    const byItem = new Map(references.map((entry) => [entry.itemId, entry]))
    expect(byItem.get('herb-m')).toMatchObject({
      access: 'reward',
      detail: '给出 ×2',
      where: `scriptChunks["chunk-m"].scripts["chunk-m"]0/0.itemId`,
    })
    expect(byItem.get('herb-m')!.locator).toEqual({
      kind: 'script-chunk',
      chunkId: 'chunk-m',
      scriptId: 'chunk-m',
      commandPath: '0/0',
    })
    expect(byItem.get('key-m')).toMatchObject({ access: 'lose', detail: '失去 ×1' })
    expect(byItem.get('charm-m')).toMatchObject({
      access: 'read',
      detail: '检查背包数量 ≥ 2',
      where: `scriptChunks["chunk-m"].scripts["chunk-m"]0/2.cond`,
    })
    expect(byItem.get('then-m')).toMatchObject({ access: 'reward' })
    expect(byItem.get('then-m')!.locator).toMatchObject({ commandPath: '0/2/then/0' })
    // 无 scriptIndex.library：标签回退为裸 scriptId。
    expect(byItem.get('herb-m')!.label).toBe('chunk-m')
  })

  test('scriptIndex.library 命中时标签为「名称 · scriptId」', () => {
    const state = {
      scriptChunks: chunkOf({ 'chunk-m': [{ kind: 'giveItem', itemId: 'herb-m' }] }),
      scriptIndex: { version: 1, library: { 'chunk-m': { name: '隧道机关' } } },
    } as unknown as Parameters<typeof collectLegacyItemReferences>[0]
    const references = collectLegacyItemReferences(state)
    expect(references[0]!.label).toBe('隧道机关 · chunk-m')
  })

  test('collectItemReferences includeLegacyScripts=false 排除分片边，缺省包含', () => {
    const base = {
      scenes: [],
      shops: [],
      manifest: { entryPoints: [] },
      actors: [],
      items: [],
      scriptChunks: chunkOf({ 'chunk-m': [{ kind: 'giveItem', itemId: 'herb-m' }] }),
    } as unknown as Parameters<typeof collectItemReferences>[0]
    expect(collectItemReferences(base, undefined, { includeSceneScripts: false })).toHaveLength(1)
    expect(
      collectItemReferences(base, undefined, {
        includeSceneScripts: false,
        includeLegacyScripts: false,
      }),
    ).toHaveLength(0)
  })
})

describe('M04 collectCanonicalItemTransitionTaggedReferences 状态机转移物品边', () => {
  test('branch 条件读边 + then/else 嵌套路径；commandOutcome 递归；终止节点零边', () => {
    const stay = { kind: 'stay' } as unknown as Parameters<
      typeof collectCanonicalItemTransitionTaggedReferences
    >[0]
    const transition = {
      kind: 'branch',
      cond: {
        kind: 'all',
        of: [
          { kind: 'hasItem', itemId: 'key-m' },
          { kind: 'flag', flag: 'f' },
        ],
      },
      then: {
        kind: 'commandOutcome',
        commandId: 'cmd',
        command: 'confirm',
        outcome: 'no',
        then: {
          kind: 'branch',
          cond: { kind: 'itemEquipped', itemId: 'armor-m', atLeast: 1 },
          then: stay,
          else: stay,
        },
        else: stay,
      },
      else: stay,
    } as unknown as Parameters<typeof collectCanonicalItemTransitionTaggedReferences>[0]

    const references = collectCanonicalItemTransitionTaggedReferences(transition, 'tr/0')
    expect(references).toEqual([
      { itemId: 'key-m', access: 'read', detail: '检查背包数量 ≥ 1', where: 'tr/0.cond.of[0]' },
      {
        itemId: 'armor-m',
        access: 'read',
        detail: '检查装备数量 ≥ 1',
        where: 'tr/0.then.then.cond',
      },
    ])

    expect(collectCanonicalItemTransitionTaggedReferences(stay, 'tr/1')).toEqual([])
  })
})
