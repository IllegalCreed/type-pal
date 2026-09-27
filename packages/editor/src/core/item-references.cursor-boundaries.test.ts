/**
 * TEST-CURSOR-PURE-WAVE-1 C01：loop hasItem 走正式保存门后的引用收集。
 * branch/not hasItem 见 item-references.test.ts。
 */
import { describe, expect, test } from 'vitest'
import { inputSnap, saveGatedLoopHasItemProject } from './__tests__/cursor-pure-fixtures.js'
import { collectItemReferences } from './item-references.js'

describe('C01 item-references 剩余合同', () => {
  test('保存门后 loop hasItem 读引用完整，sibling 物品不入表', async () => {
    const { state, canonical } = await saveGatedLoopHasItemProject()
    const stateSnap = inputSnap(state)
    const canonicalSnap = inputSnap(canonical)
    const refs = collectItemReferences(state, canonical)
    expect(state).toEqual(stateSnap)
    expect(canonical).toEqual(canonicalSnap)
    expect(refs).toEqual([
      {
        itemId: 'target-herb',
        access: 'read',
        source: 'scene',
        label: '场景 start / 进场脚本“入口方案” / 步骤 1 / 脚本正文 / 第 1 条指令',
        where: 'scenes.start.hooks.onEnter.variants.main.flow.stages.initial.body[0].cond',
        detail: '检查背包数量 ≥ 1',
        locator: {
          kind: 'canonical-script',
          reference: {
            kind: 'command',
            path: 'scenes.start.hooks.onEnter.variants.main.flow.stages.initial.body[0]',
            locator: {
              kind: 'command',
              owner: { kind: 'scene-hook', sceneId: 'start', slot: 'onEnter', hookId: 'main' },
              container: { kind: 'step', stepId: 'initial', section: 'body' },
              commandPath: '0',
            },
          },
        },
      },
    ])
    expect(refs.some((reference) => reference.itemId === 'sibling-herb')).toBe(false)
  })
})
