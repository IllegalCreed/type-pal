import type { ScriptChunkV1, ScriptIndexV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { analyzeScriptContext } from './script-context.js'

const index: ScriptIndexV1 = {
  version: 1,
  shards: { shared: 1, global: {} },
  chunks: {
    'shared/c00': { path: 'chunks/shared/c00.json', bytes: 0 },
  },
}

function chunk(scripts: ScriptChunkV1['scripts']): Readonly<Record<string, ScriptChunkV1>> {
  return {
    'shared/c00': { version: 1, id: 'shared/c00', scripts },
  }
}

describe('共享脚本场景上下文分析', () => {
  test('纯对话与物品脚本不需要地图', () => {
    expect(
      analyzeScriptContext(
        index,
        chunk({
          'shared/user/bundle': [
            { kind: 'dialog', cue: { rows: [{ text: '打开包袱' }] } },
            { kind: 'giveItem', itemId: '293' },
          ],
        }),
        'shared/user/bundle',
      ),
    ).toEqual({ needsScene: false, reasons: [] })
  })

  test('沿调用链识别面向实体与传送出口', () => {
    const result = analyzeScriptContext(
      index,
      chunk({
        'shared/user/earth-orb': [
          {
            kind: 'callScript',
            ref: { chunk: 'shared/c00', id: 'shared/internal/earth-orb' },
          },
        ],
        'shared/internal/earth-orb': [
          {
            kind: 'branch',
            cond: { kind: 'facingEntity', entity: 'e4285' },
            then: [{ kind: 'teleportOut' }],
          },
        ],
      }),
      'shared/user/earth-orb',
    )
    expect(result.needsScene).toBe(true)
    expect(result.reasons).toEqual(['condition:facingEntity', 'teleportOut'])
  })
})
