import type { ScriptChunkV1, ScriptIndexV1, ScriptStage } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { materializeSceneStages, sceneRootScriptId } from './scene-script-view.js'

const index: ScriptIndexV1 = {
  version: 1,
  shards: { shared: 1, global: {} },
  chunks: {
    'scene/s001': { path: 'chunks/scene/s001.json', bytes: 1 },
  },
}

const chunks: Record<string, ScriptChunkV1> = {
  'scene/s001': {
    version: 1,
    id: 'scene/s001',
    scripts: {
      'scene/s001/root/on-enter/stage-0': [{ kind: 'playMusic', musicId: 31 }],
      'scene/s001/root/on-enter/stage-1': [],
      'scene/s001/root/entity-e2/page-0/auto/stage-0': [{ kind: 'wait', ms: 200 }],
    },
  },
}

describe('场景私有分片脚本的编辑视图', () => {
  test('稳定根 id 覆盖场景与实体脚本源', () => {
    expect(sceneRootScriptId('s001', { kind: 'onEnter' }, 1)).toBe(
      'scene/s001/root/on-enter/stage-1',
    )
    expect(sceneRootScriptId('s001', { kind: 'auto', entityId: 'e2' }, 0)).toBe(
      'scene/s001/root/entity-e2/page-0/auto/stage-0',
    )
  })

  test('透明展开精确匹配的 M3 根绑定，并保留段转移', () => {
    const raw: ScriptStage[] = [
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/s001', id: 'scene/s001/root/on-enter/stage-0' },
          },
        ],
        next: 'advance',
      },
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/s001', id: 'scene/s001/root/on-enter/stage-1' },
          },
        ],
      },
    ]
    const result = materializeSceneStages('s001', { kind: 'onEnter' }, raw, index, chunks)
    expect(result.stages).toEqual([
      { body: [{ kind: 'playMusic', musicId: 31 }], next: 'advance' },
      { body: [] },
    ])
    expect(result.bindings.map((binding) => binding?.id)).toEqual([
      'scene/s001/root/on-enter/stage-0',
      'scene/s001/root/on-enter/stage-1',
    ])
  })

  test('普通 callScript、内联内容与孤儿引用不冒充私有根绑定', () => {
    const authored: ScriptStage[] = [
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'shared/c00', id: 'shared/user/open-door-a1b2c3d4' },
          },
        ],
      },
      { body: [{ kind: 'wait', ms: 100 }] },
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/s001', id: 'scene/s001/root/on-enter/stage-2' },
          },
        ],
      },
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/s001', id: 'scene/s001/root/on-enter/stage-0' },
            self: 'e1',
          },
        ],
      },
    ]
    const result = materializeSceneStages('s001', { kind: 'onEnter' }, authored, index, chunks)
    expect(result.stages).toEqual(authored)
    expect(result.bindings).toEqual([undefined, undefined, undefined, undefined])
  })

  test('段增删改变位置后，稳定 stage id 仍作为同源私有绑定展开', () => {
    const moved: ScriptStage[] = [
      {
        body: [
          {
            kind: 'callScript',
            ref: { chunk: 'scene/s001', id: 'scene/s001/root/on-enter/stage-1' },
          },
        ],
      },
    ]
    const result = materializeSceneStages('s001', { kind: 'onEnter' }, moved, index, chunks)
    expect(result.stages).toEqual([{ body: [] }])
    expect(result.bindings[0]?.id).toBe('scene/s001/root/on-enter/stage-1')
  })
})
