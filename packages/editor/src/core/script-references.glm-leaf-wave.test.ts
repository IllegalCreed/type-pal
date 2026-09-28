import { describe, expect, test } from 'vitest'
import { findScriptReferences } from './script-references.js'

const sharedScript = {
  'shared/user/route': {
    name: '路线',
    description: '行走路线',
    self: 'none',
    body: [
      { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/helper' } },
      { kind: 'setFlag', flag: 'routed', value: true },
    ],
  } as never,
  'shared/user/helper': {
    name: '辅助',
    self: 'none',
    body: [{ kind: 'setFlag', flag: 'helped', value: true }],
  } as never,
}

const state = {
  scenes: [
    {
      id: 's001',
      mapId: 'map-001',
      entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
      entities: [
        {
          id: 'e1',
          sprite: 'npc',
          pos: { col: 1, row: 1, height: 0 },
          initialPage: 'default',
          pages: [{ id: 'default', label: '默认', trigger: 'talk' }],
          behaviors: {
            trigger: {
              talk: {
                label: '交谈',
                order: 0,
                flow: {
                  kind: 'stages',
                  initial: 'start',
                  stages: [
                    {
                      id: 'start',
                      body: [
                        {
                          kind: 'callScript',
                          ref: { chunk: 'shared/c00', id: 'shared/user/route' },
                        },
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      ],
    },
  ],
  items: [],
  sharedScripts: sharedScript,
  scriptIndex: {
    version: 1,
    shards: { shared: 16, global: {} },
    chunks: {},
    library: {
      'shared/user/route': { name: '路线', self: 'none' },
      'shared/user/helper': { name: '辅助', self: 'none' },
    },
  },
  scriptChunks: {
    'shared/user-000': {
      version: 1,
      id: 'shared/user-000',
      scripts: {
        'shared/user/route': [
          { kind: 'callScript', ref: { chunk: 'shared/c00', id: 'shared/user/helper' } },
          { kind: 'setFlag', flag: 'routed', value: true },
        ],
        'shared/user/helper': [{ kind: 'setFlag', flag: 'helped', value: true }],
      },
    },
  },
} as never

describe('script-references 剩余合同', () => {
  test('callScript callers point back at the referenced shared script with locator detail', () => {
    // route 调 helper → helper 的引用表记录调用方；含场景 id 便于定位。
    const references = findScriptReferences(state as never, 'shared/user/helper')
    expect(references).toHaveLength(1)
    expect(references[0]).toMatchObject({ target: { id: 'shared/user/helper' } })
    // 调用方身份是脚本（chunk 内 body），不是场景实体。
    expect(JSON.stringify(references[0])).toContain('shared/user/route')
  })

  test('a root script with no inbound callers yields an empty reference list', () => {
    expect(findScriptReferences(state as never, 'shared/user/route')).toEqual([])
    expect(findScriptReferences(state as never, 'shared/user/gone')).toEqual([])
  })
})
