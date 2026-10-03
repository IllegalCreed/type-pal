import type {
  AuthorCommand,
  AuthorScriptLibrary,
  Command,
  ScriptChunkV1,
  SpriteDef,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { EditorState } from './edit-session.js'
import {
  collectAutomaticScriptSpriteDefinitionIds,
  collectAutomaticScriptSpriteInstanceSites,
  collectSpriteAutomaticScriptBehaviors,
  describeSpriteReferenceBehavior,
  projectCanonicalScriptFlowPreview,
  projectCanonicalSpritePreviewState,
} from './world-sprite-behavior.js'

const definition: SpriteDef = {
  id: 'candle',
  label: '蜡烛',
  asset: 'sprite.candle',
  layout: { kind: 'static' },
}

const reference = {
  id: 0,
  target: { kind: 'world-sprite' as const, id: definition.id },
  source: {
    key: 'scene-entity',
    owner: { kind: 'scene-entity' as const, sceneId: 's001', entityId: 'e001' },
    label: '场景 s001 · 实体 e001',
    deletedWith: [],
  },
  relation: { kind: 'world-sprite-use' as const },
  where: 'scenes[0].entities[0].sprite',
  locator: {
    kind: 'object' as const,
    object: { kind: 'entity' as const, sceneId: 's001', entityId: 'e001' },
  },
  deletePolicy: 'replace-suggest' as const,
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

function deepFrameChain(depth: number, prefix: Command[] = []) {
  const chunk: ScriptChunkV1 = { version: 1, id: 'deep-chain', scripts: {} }
  for (let level = 1; level <= depth; level++) {
    chunk.scripts[`level-${level}`] =
      level === depth
        ? [
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
            { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
          ]
        : [{ kind: 'callScript', ref: { chunk: chunk.id, id: `level-${level + 1}` } }]
  }
  return state(
    [{ body: [...prefix, { kind: 'callScript', ref: { chunk: chunk.id, id: 'level-1' } }] }],
    { [chunk.id]: chunk },
  )
}

describe('describeSpriteReferenceBehavior', () => {
  test.each([15, 16])('预算内 %i 层调用仍展示真实帧序，且不修改输入', (depth) => {
    const input = deepFrameChain(depth)
    const before = structuredClone(input)
    const result = describeSpriteReferenceBehavior(input, reference, definition, 16)

    expect(result.preview).toMatchObject({
      kind: 'cycle',
      cycle: [{ frame: 1 }, { frame: 2 }],
    })
    expect(result.detail).toContain('#1 → #2')
    expect(input).toEqual(before)
  })

  test('17 层调用在真实帧出现前耗尽预算时不可伪造默认帧', () => {
    const input = deepFrameChain(17)
    const before = structuredClone(input)
    const result = describeSpriteReferenceBehavior(input, reference, definition, 16)

    expect(result.preview).toMatchObject({ kind: 'unavailable' })
    expect(result.detail).toBe('暂时无法推断这段脚本的帧序，请到场景中播放确认。')
    expect(result.detail).not.toContain('#0')
    expect(result.detail).not.toContain('检测到')
    expect(input).toEqual(before)
  })

  test('预算截断的单一路径保留已采样前缀，不折叠或声称完整循环', () => {
    const input = deepFrameChain(
      17,
      [3, 4, 3, 4].map((frame) => ({ kind: 'setEntityFrame', entity: 'e001', frame })),
    )
    const result = describeSpriteReferenceBehavior(input, reference, definition, 16)

    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应保留截断采样片段')
    expect(result.preview.variants).toHaveLength(1)
    expect(result.preview.variants[0]?.steps.map((step) => step.frame)).toEqual([3, 4, 3, 4])
    expect(result.preview.variants[0]?.note).toContain('仅展示已分析的部分')
    expect(result.detail).toBe('目前只能推断部分帧序，请到场景中播放确认。')
    expect(result.label).toBe('自动脚本部分帧序')
  })

  test('真正执行到的帧 #0 可保留为截断前缀，正常定帧 #0 仍可证明循环', () => {
    const frame: Command = { kind: 'setEntityFrame', entity: 'e001', frame: 0 }
    const result = describeSpriteReferenceBehavior(
      deepFrameChain(17, [frame]),
      reference,
      definition,
      16,
    )
    expect(result.preview).toMatchObject({
      kind: 'variants',
      variants: [{ steps: [{ frame: 0 }] }],
    })
    expect(behavior([{ body: [frame] }]).preview).toMatchObject({
      kind: 'cycle',
      cycle: [{ frame: 0 }],
    })
  })

  test('完整路径与截断路径帧序相同时，去重仍保留截断说明', () => {
    const input = deepFrameChain(17)
    input.scenes[0]!.entities[0]!.pages![0]!.auto = {
      stages: [
        {
          body: [
            { kind: 'setEntityFrame', entity: 'e001', frame: 3 },
            {
              kind: 'branch',
              cond: { kind: 'chance', percent: 50 },
              then: [{ kind: 'callScript', ref: { chunk: 'deep-chain', id: 'level-1' } }],
            },
          ],
        },
      ],
    }
    const result = describeSpriteReferenceBehavior(input, reference, definition, 16)
    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应保留截断采样片段')
    expect(result.preview.variants).toHaveLength(1)
    expect(result.preview.variants[0]?.steps.map((step) => step.frame)).toEqual([3])
    expect(result.preview.variants[0]?.note).toContain('仅展示已分析的部分')
    expect(result.detail).toBe('目前只能推断部分帧序，请到场景中播放确认。')
  })

  test('48 tick 截断后即使所有策略帧序相同也不声称完整循环', () => {
    const result = behavior(
      [
        {
          body: [
            { kind: 'animEntity', entity: 'e001' },
            { kind: 'branch', cond: { kind: 'chance', percent: 0 }, then: [] },
          ],
        },
      ],
      {},
      64,
    )
    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应保留截断采样片段')
    expect(result.preview.variants).toHaveLength(1)
    expect(result.preview.variants[0]?.steps.map((step) => step.frame)).toEqual(
      Array.from({ length: 48 }, (_, index) => index + 1),
    )
    expect(result.preview.variants[0]?.note).toBe('0% 为各判断的局部命中率；仅展示已分析的部分')
  })

  test('无帧的跳转耗尽命令预算也不造帧；仅朝向脚本保持不可确定帧序', () => {
    const ref = { chunk: 'empty', id: 'loop' }
    const result = behavior([{ body: [{ kind: 'jumpScript', ref }] }], {
      empty: { version: 1, id: 'empty', scripts: { loop: [{ kind: 'jumpScript', ref }] } },
    })
    expect(result.preview).toMatchObject({ kind: 'unavailable' })
    expect(result.detail).toBe('暂时无法推断这段脚本的帧序，请到场景中播放确认。')
    expect(
      behavior([{ body: [{ kind: 'setEntityFacing', entity: 'e001', facing: 'left' }] }]).preview,
    ).toMatchObject({ kind: 'unavailable' })
  })

  test('conditional step completion is not advertised as a proven static loop', () => {
    const stages = projectCanonicalScriptFlowPreview(
      {
        kind: 'stages',
        initial: 'one',
        stages: [
          {
            id: 'one',
            body: [
              { kind: 'setEntityFrame', target: { scene: 's001', entity: 'e001' }, frame: 1 },
              {
                kind: 'branch',
                cond: { kind: 'flag', flag: 'finish', is: true },
                then: [{ kind: 'finishStep', next: { kind: 'complete' } }],
              },
            ],
          },
        ],
      },
      { scene: 's001', entity: 'e001' },
      {},
    )
    expect(behavior(stages).preview?.kind).toBe('unavailable')
  })
  test('a canonical completion edge previews once, never as a loop or extra empty stage', () => {
    const stages = projectCanonicalScriptFlowPreview(
      {
        kind: 'stages',
        initial: 'one',
        stages: [
          {
            id: 'one',
            body: [
              { kind: 'setEntityFrame', target: { scene: 's001', entity: 'e001' }, frame: 1 },
              { kind: 'setEntityFrame', target: { scene: 's001', entity: 'e001' }, frame: 2 },
            ],
            next: { kind: 'complete' },
          },
        ],
      },
      { scene: 's001', entity: 'e001' },
      {},
    )
    expect(stages).toHaveLength(1)
    expect(stages[0]?.next).toBe(1)
    expect(behavior(stages).preview).toMatchObject({
      kind: 'once',
      steps: [{ frame: 1 }, { frame: 2 }],
    })
  })
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

describe('projectCanonicalScriptFlowPreview', () => {
  const canonicalSample = (body: AuthorCommand[], sharedScripts: AuthorScriptLibrary = {}) => {
    const shell = state([])
    const before = JSON.stringify({ shell, body, sharedScripts })
    const projected = projectCanonicalSpritePreviewState(shell, {
      sharedScripts,
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
              initialPage: 'default',
              pages: [{ id: 'default', label: '默认外观', auto: 'animate' }],
              behaviors: {
                auto: {
                  animate: {
                    label: '自动切帧',
                    order: 0,
                    flow: { kind: 'stages', initial: 'start', stages: [{ id: 'start', body }] },
                  },
                },
              },
            },
          ],
        },
      ],
    })
    const result = describeSpriteReferenceBehavior(projected, reference, definition, 16)
    expect(JSON.stringify({ shell, body, sharedScripts })).toBe(before)
    return result.preview
  }

  test('bounded canonical frame samples preserve named continue and skip unreachable frames', () => {
    const target = { scene: 's001', entity: 'e001' }
    const result = canonicalSample([
      {
        kind: 'repeat',
        id: 'outer',
        count: 3,
        body: [
          {
            kind: 'repeat',
            count: 2,
            body: [
              { kind: 'animEntity', target },
              { kind: 'wait', ms: 100 },
              { kind: 'continueLoop', loop: 'outer' },
              { kind: 'setEntityFrame', target, frame: 14 },
            ],
          },
          { kind: 'setEntityFrame', target, frame: 15 },
        ],
      },
      { kind: 'setEntityFrame', target, frame: 4 },
      { kind: 'wait', ms: 100 },
      { kind: 'finishStep', next: { kind: 'complete' } },
    ])
    expect(result?.kind).toBe('variants')
    if (result?.kind !== 'variants') throw new Error('Expected a representative path')
    expect(result.variants.map((variant) => variant.steps.map((step) => step.frame))).toEqual([
      [1, 2, 3, 4],
    ])
    expect(result.note).toContain('不是唯一循环')
  })

  test('a local break and a shared return retain the caller tail in the sample', () => {
    const target = { scene: 's001', entity: 'e001' }
    const result = canonicalSample(
      [
        {
          kind: 'loop',
          mode: 'forever',
          body: [
            { kind: 'setEntityFrame', target, frame: 1 },
            { kind: 'wait', ms: 100 },
            { kind: 'breakLoop' },
            { kind: 'setEntityFrame', target, frame: 14 },
          ],
        },
        { kind: 'callScript', script: 'local' },
        { kind: 'setEntityFrame', target, frame: 3 },
        { kind: 'wait', ms: 100 },
        { kind: 'finishStep', next: { kind: 'complete' } },
      ],
      {
        local: {
          name: '局部切帧',
          self: 'none',
          body: [
            { kind: 'setEntityFrame', target, frame: 2 },
            { kind: 'wait', ms: 100 },
            { kind: 'returnScript' },
            { kind: 'setEntityFrame', target, frame: 15 },
          ],
        },
      },
    )
    expect(result?.kind).toBe('variants')
    if (result?.kind !== 'variants') throw new Error('Expected a representative path')
    expect(result.variants.map((variant) => variant.steps.map((step) => step.frame))).toEqual([
      [1, 2, 3],
    ])
  })

  test('empty infinite visual loops terminate at the sampling budget and side effects stay unavailable', () => {
    const target = { scene: 's001', entity: 'e001' }
    const result = canonicalSample([
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'loop', mode: 'forever', body: [{ kind: 'continueLoop' }] },
    ])
    expect(result?.kind).toBe('variants')
    if (result?.kind !== 'variants') throw new Error('Expected a bounded prefix')
    expect(result.variants[0]?.note).toContain('前一部分')
    expect(
      canonicalSample([
        { kind: 'setEntityFrame', target, frame: 1 },
        { kind: 'giveMoney', delta: 5 },
        { kind: 'repeat', count: 2, body: [{ kind: 'breakLoop' }] },
      ]),
    ).toMatchObject({ kind: 'unavailable' })
    expect(
      canonicalSample([
        { kind: 'setEntityFrame', target: { scene: 'another', entity: 'e001' }, frame: 1 },
        { kind: 'repeat', count: 2, body: [{ kind: 'breakLoop' }] },
      ]),
    ).toMatchObject({ kind: 'unavailable' })
  })

  test('conditional loops show representative paths instead of advertising a unique frame cycle', () => {
    const target = { scene: 's001', entity: 'e001' }
    for (const mode of ['while', 'until'] as const) {
      const result = canonicalSample([
        {
          kind: 'loop',
          mode,
          cond: { kind: 'chance', percent: 50 },
          body: [
            { kind: 'setEntityFrame', target, frame: 1 },
            { kind: 'wait', ms: 100 },
          ],
        },
        { kind: 'setEntityFrame', target, frame: 2 },
        { kind: 'wait', ms: 100 },
        { kind: 'finishStep', next: { kind: 'complete' } },
      ])
      expect(result?.kind).toBe('variants')
      if (result?.kind !== 'variants') throw new Error('Expected conditional path samples')
      expect(result.note).toContain('不是唯一循环')
      expect(result.variants.some((variant) => variant.steps.at(-1)?.frame === 2)).toBe(true)
      if (mode === 'until')
        expect(result.variants.every((variant) => variant.steps[0]?.frame === 1)).toBe(true)
    }
  })

  test('frame samples reject unresolved continues and loop control crossing a shared root', () => {
    const target = { scene: 's001', entity: 'e001' }
    const prefix: AuthorCommand[] = [
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'wait', ms: 100 },
    ]
    expect(
      canonicalSample([
        {
          kind: 'loop',
          mode: 'until',
          cond: { kind: 'chance', percent: 50 },
          body: [...prefix, { kind: 'continueLoop', loop: 'missing' }],
        },
      ]),
    ).toMatchObject({ kind: 'unavailable' })
    expect(
      canonicalSample(
        [
          {
            kind: 'loop',
            mode: 'until',
            id: 'outer',
            cond: { kind: 'chance', percent: 50 },
            body: [...prefix, { kind: 'callScript', script: 'cross-root' }],
          },
        ],
        {
          'cross-root': {
            name: '非法跨根跳转',
            self: 'none',
            body: [{ kind: 'continueLoop', loop: 'outer' }],
          },
        },
      ),
    ).toMatchObject({ kind: 'unavailable' })
  })

  test('fixed repeats and simple continuous loops retain the supported frame preview', () => {
    const target = { scene: 's001', entity: 'e001' }
    const body: AuthorCommand[] = [
      { kind: 'setEntityFrame', target, frame: 1 },
      { kind: 'wait', ms: 100 },
      { kind: 'setEntityFrame', target, frame: 2 },
      { kind: 'wait', ms: 100 },
    ]
    const project = (commands: AuthorCommand[]) =>
      projectCanonicalScriptFlowPreview(
        { kind: 'stages', initial: 'start', stages: [{ id: 'start', body: commands }] },
        target,
        {},
      )
    const repeated = project([{ kind: 'repeat', count: 2, body }])
    expect(repeated).toEqual(project([...body, ...body]))
    expect(behavior(repeated).preview).toEqual(behavior(project([...body, ...body])).preview)
    expect(behavior(repeated).preview).toBeDefined()
    expect(behavior(repeated).preview?.kind).not.toBe('unavailable')
    expect(behavior(project([{ kind: 'loop', mode: 'forever', body }])).preview).toEqual(
      behavior(project(body)).preview,
    )
  })
  test('lowers canonical entity addresses and nested conditions for the map preview runner', () => {
    const stages = projectCanonicalScriptFlowPreview(
      {
        kind: 'stages',
        initial: 'start',
        stages: [
          {
            id: 'start',
            body: [
              {
                kind: 'branch',
                cond: {
                  kind: 'entityState',
                  target: { scene: 's001', entity: 'e001' },
                  is: 1,
                },
                then: [
                  {
                    kind: 'moveEntity',
                    target: { scene: 's001', entity: 'e001' },
                    to: { col: 2, row: 3, height: 0 },
                    speed: 'normal',
                  },
                ],
              },
            ],
          },
        ],
      },
      { scene: 's001', entity: 'e001' },
      {},
    )

    expect(stages[0]?.body[0]).toMatchObject({
      kind: 'branch',
      cond: { kind: 'entityState', entity: 'e001', is: 1 },
      then: [{ kind: 'moveEntity', entity: 'e001' }],
    })
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

  test('忽略尚未投影的 canonical 行为 id，不让资源库跳转白屏', () => {
    const editorState = state([{ body: [] }])
    editorState.scenes[0]!.entities[0]!.pages = [{ auto: 'default' }] as never

    expect(collectAutomaticScriptSpriteInstanceSites(editorState)).toEqual([])
    expect(describeSpriteReferenceBehavior(editorState, reference, definition, 16)).toMatchObject({
      kind: 'default',
      label: '默认定格',
    })
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
              { kind: 'returnScript' },
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
            { kind: 'returnScript' },
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
