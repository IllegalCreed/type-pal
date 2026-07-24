import type { ScriptChunkV1, SharedScriptMetaV1 } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { buildInternalScriptCatalog, scriptCallerLabel } from './script-library-catalog.js'

describe('共享脚本目录分层', () => {
  const library: Record<string, SharedScriptMetaV1> = {
    'shared/user/item-use': { name: '包袱使用', self: 'none' },
  }
  const chunks: Record<string, ScriptChunkV1> = {
    'shared/c00': {
      version: 1,
      id: 'shared/c00',
      scripts: {
        'shared/user/item-use': [
          {
            kind: 'callScript',
            ref: {
              chunk: 'shared/c01',
              id: 'shared/scc-L-100/L-120/global/items/d-a',
            },
          },
        ],
        'shared/scc-L-100/L-120/global/items/d-a': [
          {
            kind: 'callScript',
            ref: { chunk: 'shared/c02', id: 'shared/scc-L-200/L-210/none/d-b' },
          },
        ],
      },
    },
    'scene/s001': {
      version: 1,
      id: 'scene/s001',
      scripts: {
        'scene/s001/e1/trigger': [
          {
            kind: 'callScript',
            ref: { chunk: 'shared/c02', id: 'shared/scc-L-200/L-210/none/d-b' },
          },
        ],
      },
    },
    'shared/c02': {
      version: 1,
      id: 'shared/c02',
      scripts: {
        'shared/scc-L-200/L-210/none/d-b': [],
      },
    },
  }

  test('作者脚本不混进迁移内部块，内部块列出来源与直接调用方', () => {
    expect(buildInternalScriptCatalog(chunks, library)).toEqual([
      {
        id: 'shared/scc-L-100/L-120/global/items/d-a',
        title: '物品迁移块 L_120',
        scope: 'item',
        sourceAddress: 120,
        callers: ['包袱使用'],
      },
      {
        id: 'shared/scc-L-200/L-210/none/d-b',
        title: '场景迁移块 L_210',
        scope: 'scene',
        sourceAddress: 210,
        callers: ['场景 s001', '物品迁移块 L_120'],
      },
    ])
  })

  test('作者、场景与内部调用方均给出人可读名称', () => {
    expect(scriptCallerLabel('shared/user/item-use', library)).toBe('包袱使用')
    expect(scriptCallerLabel('scene/s154/e1/trigger', library)).toBe('场景 s154')
    expect(scriptCallerLabel('shared/scc-L-1/L-2/none/d-a', library)).toBe('场景迁移块 L_2')
  })
})
