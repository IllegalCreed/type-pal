import type { Command, ScriptChunkV1, SpriteDef } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  collectAutomaticScriptSpriteDefinitionIds,
  collectAutomaticScriptSpriteInstanceSites,
  collectSpriteAutomaticScriptBehaviors,
  describeSpriteReferenceBehavior,
} from './world-sprite-behavior.js'

const definition: SpriteDef = {
  id: 'candle',
  label: '蜡烛',
  asset: 'sprite.candle',
  layout: { kind: 'static' },
}

const reference = {
  sprite: definition.id,
  where: 'scenes[0].entities[0].sprite',
  site: 'scene:s001:entity:e001',
}

function state(
  stages: readonly { body: Command[]; next?: 'advance' | number }[],
  scripts: Record<string, ScriptChunkV1> = {},
): EditorState {
  return {
    actors: [],
    scenes: [
      {
        id: 's001',
        mapId: 'map-1',
        entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
        entities: [
          {
            id: 'e001',
            pos: { col: 1, row: 1, height: 0 },
            sprite: definition.id,
            pages: [{ auto: { stages } }],
          },
        ],
      },
    ],
    scriptChunks: scripts,
  } as unknown as EditorState
}

function behavior(
  stages: readonly { body: Command[]; next?: 'advance' | number }[],
  scripts: Record<string, ScriptChunkV1> = {},
  actualFrameCount = 16,
) {
  return describeSpriteReferenceBehavior(
    state(stages, scripts),
    reference,
    definition,
    actualFrameCount,
  )
}

describe('describeSpriteReferenceBehavior', () => {
  test('只为单阶段、线性且闭合的脚本显示可证明帧序', () => {
    const ref = { chunk: 'scene/s001', id: 'candle-loop' }
    const result = behavior([{ body: [{ kind: 'callScript', ref }] }], {
      'scene/s001': {
        version: 1,
        id: 'scene/s001',
        scripts: {
          [ref.id]: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 3 },
            { kind: 'jumpScript', ref },
          ],
        },
      },
    })

    expect(result.label).toBe('自动脚本切帧')
    expect(result.detail).toContain('#1 → #2 → #3')
    expect(result.preview).toMatchObject({
      kind: 'cycle',
      cycle: [{ frame: 1 }, { frame: 2 }, { frame: 3 }],
    })
  })

  test('无法解释的分支和缺失引用保守回退为通用说明', () => {
    const branch = { kind: 'branch' } as Command
    const missing = { kind: 'callScript', ref: { chunk: 'missing', id: 'missing' } } as Command

    expect(behavior([{ body: [branch] }]).label).toBe('自动行为脚本')
    expect(behavior([{ body: [missing] }]).label).toBe('自动行为脚本')
  })

  test('逐命令预算阻止超长命令体产生看似完整的帧序', () => {
    const body: Command[] = Array.from({ length: 513 }, (_, frame) => ({
      kind: 'setEntityFrame',
      entity: 'e001',
      frame,
    }))

    expect(behavior([{ body }]).label).toBe('自动行为脚本')
  })

  test('递归栈退出后允许顺序重复调用同一子脚本', () => {
    const ref = { chunk: 'shared', id: 'set-one' }
    const result = behavior(
      [
        {
          body: [
            { kind: 'callScript', ref },
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
            { kind: 'callScript', ref },
          ],
        },
      ],
      {
        shared: {
          version: 1,
          id: 'shared',
          scripts: {
            [ref.id]: [{ kind: 'setEntityFrame', entity: 'e001', frame: 1 }],
          },
        },
      },
    )

    expect(result.label).toBe('自动脚本切帧')
    expect(result.detail).toContain('#1 → #2 → #1')
  })

  test('识别 next:0 重跑阶段中的 animEntity 静态帧带循环', () => {
    const ref = { chunk: 'scene/s001', id: 'advance-frame' }
    const result = behavior(
      [{ body: [{ kind: 'callScript', ref }], next: 0 }],
      {
        'scene/s001': {
          version: 1,
          id: 'scene/s001',
          scripts: {
            [ref.id]: [{ kind: 'animEntity', entity: 'e001' }],
          },
        },
      },
      4,
    )

    expect(result.label).toBe('自动脚本逐帧循环')
    expect(result.detail).toContain('#0 → #1 → #2 → #3')
    expect(result.preview).toMatchObject({
      kind: 'cycle',
      mode: 'implicit',
      intro: [],
      cycle: [{ frame: 0 }, { frame: 1 }, { frame: 2 }, { frame: 3 }],
    })
  })

  test('显式定帧后 animEntity 仍由覆盖帧压住，按运行时只显示定帧', () => {
    const result = behavior(
      [
        {
          body: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
            { kind: 'animEntity', entity: 'e001' },
          ],
          next: 0,
        },
      ],
      {},
      4,
    )

    expect(result.label).toBe('自动脚本切帧')
    expect(result.preview).toMatchObject({ kind: 'cycle', cycle: [{ frame: 2 }] })
  })

  test('四向用途不把朝向内偏移伪装成物理帧号', () => {
    const directional: SpriteDef = {
      ...definition,
      layout: { kind: 'directional', framesPerDir: 3 },
    }
    const result = describeSpriteReferenceBehavior(
      state([
        {
          body: [
            { kind: 'setEntityFacing', entity: 'e001', facing: 'left' },
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
          ],
        },
      ]),
      reference,
      directional,
      12,
    )

    expect(result.label).toBe('自动行为脚本')
    expect(result.detail).not.toContain('#1')
  })

  test('只读取运行时实际执行的第 0 页自动脚本', () => {
    const editorState = state([])
    editorState.scenes[0]!.entities[0]!.pages = [
      {},
      {
        auto: {
          stages: [{ body: [{ kind: 'setEntityFrame', entity: 'e001', frame: 3 }] }],
        },
      },
    ]

    const result = describeSpriteReferenceBehavior(editorState, reference, definition, 16)
    expect(result.label).toBe('默认定格')
    expect(result.detail).not.toContain('#3')
  })
})

describe('collectAutomaticScriptSpriteDefinitionIds', () => {
  test('同时收录普通景物和 actor 场景实例，并只读取第 0 页非空自动脚本', () => {
    const editorState = state([{ body: [] }])
    editorState.actors = [
      {
        id: 'hero',
        name: 'hero-name',
        spriteId: 'hero-walk',
      },
    ]
    editorState.scenes[0]!.entities.push(
      {
        id: 'actor-auto',
        pos: { col: 2, row: 2, height: 0 },
        actor: 'hero',
        pages: [{ auto: { stages: [{ body: [] }] } }],
      },
      {
        id: 'page-one-only',
        pos: { col: 3, row: 3, height: 0 },
        sprite: 'page-one-sprite',
        pages: [{}, { auto: { stages: [{ body: [] }] } }],
      },
      {
        id: 'empty-auto',
        pos: { col: 4, row: 4, height: 0 },
        sprite: 'empty-auto-sprite',
        pages: [{ auto: { stages: [] } }],
      },
      {
        id: 'zone-auto',
        pos: { col: 5, row: 5, height: 0 },
        zone: true,
        pages: [{ auto: { stages: [{ body: [] }] } }],
      },
    )

    expect([...collectAutomaticScriptSpriteDefinitionIds(editorState)].sort()).toEqual([
      'candle',
      'hero-walk',
    ])
    expect(
      collectAutomaticScriptSpriteInstanceSites(editorState).map((site) => ({
        spriteId: site.spriteId,
        via: site.via,
      })),
    ).toEqual([
      { spriteId: 'candle', via: 'direct' },
      { spriteId: 'hero-walk', via: 'actor' },
    ])
  })
})

describe('collectSpriteAutomaticScriptBehaviors', () => {
  test('启动相位与稳定循环分离，动态摘要不会每轮重播启动帧', () => {
    const loop = { chunk: 'scene/s001', id: 'candle-loop' }
    const editorState = state(
      [
        {
          body: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 0 },
            { kind: 'jumpScript', ref: loop },
          ],
        },
      ],
      {
        'scene/s001': {
          version: 1,
          id: 'scene/s001',
          scripts: {
            [loop.id]: [
              { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
              { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
              { kind: 'jumpScript', ref: loop },
            ],
          },
        },
      },
    )

    expect(collectSpriteAutomaticScriptBehaviors(editorState, definition, 4)).toEqual([
      expect.objectContaining({
        preview: expect.objectContaining({
          kind: 'cycle',
          intro: [expect.objectContaining({ frame: 0 })],
          cycle: [expect.objectContaining({ frame: 1 }), expect.objectContaining({ frame: 2 })],
        }),
        instanceCount: 1,
        sceneCount: 1,
      }),
    ])
  })

  test('无显式 jump 的单阶段由 auto runner 重跑，整段就是稳定帧序', () => {
    const editorState = state([
      {
        body: [
          { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
          { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
        ],
      },
    ])

    expect(collectSpriteAutomaticScriptBehaviors(editorState, definition, 4)[0]).toMatchObject({
      preview: {
        kind: 'cycle',
        intro: [],
        cycle: [
          { frame: 1, holdMs: 200 },
          { frame: 2, holdMs: 200 },
        ],
      },
    })
  })

  test('多阶段 wait 脚本按阶段图形成确定的定时循环', () => {
    const result = behavior(
      [
        { body: [], next: 'advance' },
        {
          body: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 0 },
            { kind: 'wait', ms: 80 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
            { kind: 'wait', ms: 80 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
            { kind: 'wait', ms: 120 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 3 },
          ],
          next: 0,
        },
      ],
      {},
      5,
    )

    expect(result.label).toBe('自动脚本定时循环')
    expect(result.preview).toEqual({
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [
        { frame: 0, holdMs: 80 },
        { frame: 1, holdMs: 80 },
        { frame: 2, holdMs: 120 },
        { frame: 3, holdMs: 200 },
      ],
    })
  })

  test('chance 自重试与尾跳出口拆成可能路径，不伪装成唯一循环', () => {
    const root = { chunk: 'scene/s001', id: 'random-root' }
    const retry = { chunk: 'scene/s001', id: 'random-retry-alias' }
    const action = { chunk: 'scene/s001', id: 'random-action' }
    const randomBody: Command[] = [
      { kind: 'setEntityFrame', entity: 'e001', frame: 0 },
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 96 },
        then: [{ kind: 'jumpScript', ref: retry }],
      },
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 51 },
        then: [{ kind: 'jumpScript', ref: action }],
      },
      { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
      { kind: 'wait', ms: 360 },
    ]
    const result = behavior(
      [{ body: [{ kind: 'callScript', ref: root }], next: 0 }],
      {
        'scene/s001': {
          version: 1,
          id: 'scene/s001',
          scripts: {
            [root.id]: randomBody,
            [retry.id]: randomBody,
            [action.id]: [
              { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
              { kind: 'wait', ms: 280 },
              { kind: 'setEntityFrame', entity: 'e001', frame: 3 },
              { kind: 'wait', ms: 640 },
              { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
              { kind: 'wait', ms: 240 },
              { kind: 'setEntityFrame', entity: 'e001', frame: 0 },
              { kind: 'wait', ms: 160 },
            ],
          },
        },
      },
      4,
    )

    expect(result.label).toBe('自动脚本随机切帧')
    expect(result.preview).toMatchObject({
      kind: 'variants',
      note: expect.stringContaining('代表性合法分支示例'),
    })
    if (result.preview?.kind !== 'variants') throw new Error('应生成随机分支预览')
    const paths = result.preview.variants.map((variant) => variant.steps.map((step) => step.frame))
    expect(paths).toContainEqual([0, 1])
    expect(paths).toContainEqual([2, 3, 2, 0])
    expect(result.preview.variants.some((variant) => variant.note?.includes('96%'))).toBe(true)
    expect(result.preview?.kind).not.toBe('cycle')
  })

  test('callee 内 stopScript 只结束 callee，caller 后续与 stage next 继续执行', () => {
    const callee = { chunk: 'scene/s001', id: 'callee-stop' }
    const result = behavior(
      [
        {
          body: [
            { kind: 'callScript', ref: callee },
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
          ],
          next: 'advance',
        },
        {
          body: [{ kind: 'setEntityFrame', entity: 'e001', frame: 3 }],
          next: 0,
        },
      ],
      {
        'scene/s001': {
          version: 1,
          id: 'scene/s001',
          scripts: {
            [callee.id]: [
              { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
              { kind: 'stopScript' },
              { kind: 'setEntityFrame', entity: 'e001', frame: 9 },
            ],
          },
        },
      },
      16,
    )

    expect(result.preview).toMatchObject({
      kind: 'cycle',
      cycle: [{ frame: 3 }, { frame: 1 }, { frame: 2 }],
    })
  })

  test('stage 根 stopScript 阻止剩余命令与 stage next，下次仍重跑当前阶段', () => {
    const result = behavior(
      [
        {
          body: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
            { kind: 'stopScript' },
            { kind: 'setEntityFrame', entity: 'e001', frame: 9 },
          ],
          next: 'advance',
        },
        { body: [{ kind: 'setEntityFrame', entity: 'e001', frame: 2 }], next: 0 },
      ],
      {},
      16,
    )

    expect(result.preview).toMatchObject({ kind: 'cycle', cycle: [{ frame: 1 }] })
    expect(result.detail).not.toContain('#2')
    expect(result.detail).not.toContain('#9')
  })

  test('非尾 jumpScript 丢弃原 body 后续并在同一 call boundary 尾转移', () => {
    const source = { chunk: 'scene/s001', id: 'jump-source' }
    const target = { chunk: 'scene/s001', id: 'jump-target' }
    const result = behavior(
      [{ body: [{ kind: 'callScript', ref: source }], next: 0 }],
      {
        'scene/s001': {
          version: 1,
          id: 'scene/s001',
          scripts: {
            [source.id]: [
              { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
              { kind: 'jumpScript', ref: target },
              { kind: 'setEntityFrame', entity: 'e001', frame: 9 },
            ],
            [target.id]: [{ kind: 'setEntityFrame', entity: 'e001', frame: 2 }],
          },
        },
      },
      16,
    )

    expect(result.preview).toMatchObject({
      kind: 'cycle',
      cycle: [{ frame: 1 }, { frame: 2 }],
    })
    expect(result.detail).not.toContain('#9')
  })

  test('只有 wait 的视觉安全脚本仍预览当前默认帧与停留时间', () => {
    const result = behavior([{ body: [{ kind: 'wait', ms: 360 }], next: 0 }], {}, 4)

    expect(result.preview).toEqual({
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [{ frame: 0, holdMs: 360 }],
    })
  })
})
