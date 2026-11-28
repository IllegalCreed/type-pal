import type { Command, ScriptChunkV1, ScriptStage } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { beforeAll, describe, expect, test } from 'vitest'
import {
  loadWorldSpriteProject,
  type WorldSpriteProject,
} from '../__tests__/world-sprite-project.js'
import type { EditorState } from './edit-session.js'
import { collectCurrentProjectReferenceIndex } from './project-reference-adapters.js'
import { describeSpriteReferenceBehavior } from './world-sprite-behavior.js'

let project: WorldSpriteProject
const counts = [4, 5, 16, 64]

beforeAll(async () => {
  project = await loadWorldSpriteProject(
    'projected-source-frame-preview',
    counts.map((count) => ({
      asset: `sprite.preview.frames.${count}`,
      label: `源帧 ${count}`,
      frameCount: count,
      definitions: [{ id: `candle-${count}`, label: '蜡烛', layout: { kind: 'static' } }],
    })),
  )
  for (const definition of project.state.sprites) {
    const record = project.state.assetCatalog.assets[definition.asset]!
    const bytes = await project.source.readBytes(record.path)
    const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
    expect(decoded.frames.length).toBe(
      definition.id === 'hero' ? 12 : Number(definition.id.split('-')[1]),
    )
  }
})

/** Exercise the retained scan of projected script chunks on actual project state and assets. */
function state(
  stages: ScriptStage[],
  scripts: Record<string, ScriptChunkV1> = {},
  frameCount = 16,
  sprite = `candle-${frameCount}`,
): EditorState {
  const scene = project.state.scenes.find(({ id }) => id === 'start')!
  return {
    ...project.state,
    scenes: [
      {
        ...scene,
        entities: [
          {
            id: 'e001',
            pos: { col: 1, row: 1, height: 0 },
            sprite,
            pages: [{ auto: { stages } }],
          },
        ],
      },
    ],
    scriptChunks: scripts,
  }
}

function inspect(input: EditorState, frameCount: number, id = `candle-${frameCount}`) {
  const definition = input.sprites.find((sprite) => sprite.id === id)!
  const reference = collectCurrentProjectReferenceIndex(input)
    .referencesTo({ kind: 'world-sprite', id })
    .find(
      (edge) => edge.source.owner.kind === 'scene-entity' && edge.source.owner.entityId === 'e001',
    )
  if (!reference) throw new Error('The authored closure is missing its instance reference')
  return describeSpriteReferenceBehavior(input, reference, definition, frameCount)
}

function behavior(
  stages: ScriptStage[],
  scripts: Record<string, ScriptChunkV1> = {},
  frameCount = 16,
) {
  return inspect(state(stages, scripts, frameCount), frameCount)
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
    const result = inspect(input, 16)

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
    const result = inspect(input, 16)

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
    const result = inspect(input, 16)

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
    const result = inspect(deepFrameChain(17, [frame]), 16)
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
    const result = inspect(input, 16)
    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应保留截断采样片段')
    expect(result.preview.variants).toHaveLength(1)
    expect(result.preview.variants[0]?.steps.map((step) => step.frame)).toEqual([3])
    expect(result.preview.variants[0]?.note).toContain('仅展示已分析的部分')
    expect(result.detail).toBe('目前只能推断部分帧序，请到场景中播放确认。')
  })

  test.each([0, 50])('48 次采样后的路径明确截断（局部命中率 %i%%）', (percent) => {
    const result = behavior(
      [
        {
          body: [
            { kind: 'animEntity', entity: 'e001' },
            { kind: 'branch', cond: { kind: 'chance', percent }, then: [{ kind: 'wait', ms: 10 }] },
          ],
        },
      ],
      {},
      64,
    )
    expect(result.preview?.kind).toBe('variants')
    if (result.preview?.kind !== 'variants') throw new Error('应保留截断采样片段')
    const variants = result.preview.variants
    expect(variants).toHaveLength(percent === 0 ? 1 : 6)
    for (const variant of variants) {
      expect(variant.steps.map((step) => step.frame)).toEqual(
        Array.from({ length: 48 }, (_, index) => index + 1),
      )
      expect(variant.note).toBe(`${percent}% 为各判断的局部命中率；仅展示已分析的部分`)
    }
    expect(
      variants.find(({ id }) => id === 'miss')?.steps.every(({ holdMs }) => holdMs === 200),
    ).toBe(true)
    if (percent === 50)
      expect(
        variants.find(({ id }) => id === 'hit')?.steps.every(({ holdMs }) => holdMs === 60),
      ).toBe(true)
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

  test('线性共享跳转的封闭帧序保持完整', () => {
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
    const branch: Command = {
      kind: 'branch',
      cond: { kind: 'flag', flag: 'opened', is: true },
      then: [],
    }
    const missing: Command = { kind: 'callScript', ref: { chunk: 'missing', id: 'missing' } }

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
    const input = state(
      [
        {
          body: [
            { kind: 'setEntityFacing', entity: 'e001', facing: 'left' },
            { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
          ],
        },
      ],
      {},
      12,
      'hero',
    )
    const result = inspect(input, 12, 'hero')

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

    const result = inspect(editorState, 16)
    expect(result.label).toBe('默认定格')
    expect(result.detail).not.toContain('#3')
  })
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

    expect(inspect(editorState, 16).preview).toMatchObject({
      kind: 'cycle',
      intro: [{ frame: 0 }],
      cycle: [{ frame: 1 }, { frame: 2 }],
    })
  })

  test('无显式跳转的稳定帧序含确切默认停留时间', () => {
    expect(
      behavior(
        [
          {
            body: [
              { kind: 'setEntityFrame', entity: 'e001', frame: 1 },
              { kind: 'setEntityFrame', entity: 'e001', frame: 2 },
            ],
          },
        ],
        {},
        4,
      ).preview,
    ).toEqual({
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [
        { frame: 1, holdMs: 200 },
        { frame: 2, holdMs: 200 },
      ],
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

  test('只有 wait 的脚本仍显示默认帧的实际停留时间', () => {
    const result = behavior([{ body: [{ kind: 'wait', ms: 360 }], next: 0 }], {}, 4)

    expect(result.preview).toEqual({
      kind: 'cycle',
      mode: 'explicit',
      intro: [],
      cycle: [{ frame: 0, holdMs: 360 }],
    })
  })
})
