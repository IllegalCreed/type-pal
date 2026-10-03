// @vitest-environment node
/**
 * TEST-GLM-WAVE-M-1 M04（item-references.glm-m）：物品引用收集器未触达入口。
 * 去重：item-references.test.ts / cursor-boundaries / glm-leaf-wave 已证 canonical 命令访问、
 * 场景扫描、天书 locator、删除守卫；本文件只补：
 * ① collectLegacyItemReferences——scriptChunks 分片扫描（giveItem/loseItem/branch 条件、
 *   script-chunk locator、无 library 时标签回退 scriptId）；
 * ② collectCanonicalItemTransitionTaggedReferences——状态机转移分支的条件物品边与
 *   then/else 嵌套路径（旧只证 collectCanonicalItemTaggedReferences 的命令入口）；
 * ③ collectItemReferences includeLegacyScripts=false 排除开关（真实 blank 项目为底座）。
 * 全 typed：命令/条件/分片均为 content 当前 schema 字面量，无强转。
 */
import type { Command, ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { loadLegalProject } from '../__tests__/glm-m/kit.js'
import { collectItemReferences, collectLegacyItemReferences } from './item-references.js'

function chunkOf(scripts: Record<string, Command[]>): Record<string, ScriptChunkV1> {
  return {
    'chunk-m': {
      version: 1,
      id: 'chunk-m',
      scripts,
    },
  }
}

describe('M04 collectLegacyItemReferences scriptChunks 分片扫描', () => {
  test('giveItem/loseItem/branch hasItem 产出 reward/lose/read 三类引用与分片 locator', () => {
    const scriptChunks = chunkOf({
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
    })
    // collectLegacyItemReferences 只读 Pick<EditorState, 'scriptChunks' | 'scriptIndex'>。
    const state = { scriptChunks, scriptIndex: undefined }

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
    const scriptChunks = chunkOf({ 'chunk-m': [{ kind: 'giveItem', itemId: 'herb-m' }] })
    const scriptIndex: ScriptIndexV1 = {
      version: 1,
      shards: { shared: 16, global: {} },
      chunks: {},
      library: { 'chunk-m': { name: '隧道机关', self: 'none' } },
    }
    const state = { scriptChunks, scriptIndex }
    const references = collectLegacyItemReferences(state)
    expect(references[0]!.label).toBe('隧道机关 · chunk-m')
  })

  test('collectItemReferences includeLegacyScripts=false 排除分片边，缺省包含', async () => {
    // 真实 blank 项目为底座（合法 EditorState），只追加分片；场景扫描关闭后唯一引用来自分片。
    const { state } = await loadLegalProject('glm-wave-m-item-refs')
    const base = {
      ...state,
      scriptChunks: chunkOf({ 'chunk-m': [{ kind: 'giveItem', itemId: 'herb-m' }] }),
    }
    expect(collectItemReferences(base, undefined, { includeSceneScripts: false })).toHaveLength(1)
    expect(
      collectItemReferences(base, undefined, {
        includeSceneScripts: false,
        includeLegacyScripts: false,
      }),
    ).toHaveLength(0)
  })
})
