/**
 * TEST-COVERAGE85-GLM-EDITOR-1 批1b：world-sprite-behavior canonical 纯帧采样器合同。
 *
 * 入口合同：真实装载项目（buildBlankProject→fsaSource→loadCurrentProjectFrom→toEditorState）
 * + 真实 AddEntityCommand/AddSpriteCommand 登记 static 用途 → 合法 AuthorSceneDef
 * （validateAuthorScenes + checkAuthorScriptFlow + checkAuthorScriptLibrary）→ 公开
 * projectCanonicalSpritePreviewState 投影 → 公开 collectSpriteAutomaticScriptBehaviors；
 * 断言精确 summary（label/detail/preview 全形）。actualFrameCount=8 显式传入
 * （actualFrameIndex 越界归 0 是被钉住的业务规则）。
 *
 * fullName 排重（旧文件已证，不复制）：
 * - world-sprite-behavior.test.ts：运行时 chunk 深链预算、chance 自重试尾跳 variants、
 *   callee/stage 根 stopScript、非 chance 分支与缺 chunk 引用落 unavailable（运行时
 *   scriptChunks 路径）、next:0 animEntity 隐式逐帧、显式定帧压 animEntity。
 * - world-sprite-behavior.wave2.test.ts：until/while 条件投影保留、shared callScript
 *   self 兼容/异己/缺失的 lowering 形态、initial 排序。
 * - world-sprite-behavior.kimi-workflows.test.ts：48 tick 预算截断的 chance 采样
 *   （percent 50）、actualFrameCount 缺席/零/非整数、聚合分组/instanceCount。
 * 本文件新增轴（cov-base 逐分支对照为缺口）：canonical 采样器的 chance 0/100 短路、
 * not/all/any 条件、finishStep complete、breakLoop/continueLoop(带标号)、loop while
 * 进入/跳过、until 循环、animEntity 显式覆盖帧后的行为、setEntityFacing 跳过、wait 累计、
 * 共享脚本 returnScript 后调用方继续、自递归/互递归/异己 self/缺失共享脚本拒绝、
 * 帧靶不是 self 的拒绝、confirm/startBattle/teleportOut 容器路由。
 */
import type {
  AuthorCommand,
  AuthorSceneDef,
  AuthorScriptLibrary,
  EntityDef,
} from '@type-pal/content'
import { checkAuthorScriptFlow, validateAuthorScenes } from '@type-pal/content'
import { expect, test } from 'vitest'
import {
  loadBoundaryProject,
  withSharedWorldSprite,
} from './__tests__/cursor-command-boundary-fixtures.js'
import { AddEntityCommand } from './commands.js'
import type { SpriteAutomaticScriptBehaviorSummary } from './world-sprite-behavior.js'
import {
  collectSpriteAutomaticScriptBehaviors,
  projectCanonicalSpritePreviewState,
} from './world-sprite-behavior.js'

function pos(col: number, row: number): EntityDef['pos'] {
  return { col, row, height: 0 }
}

const TARGET = { scene: 'start', entity: 'e1' }
const FRAME_COUNT = 8

const CONSERVATIVE_REASON = '脚本含无法安全展开的控制流或副作用'
const TRUNCATION_NOTE = '只展示这条路径的前一部分，请到场景中播放完整脚本。'
const VARIANTS_NOTE = '下列是脚本的代表性合法分支示例，不是完整概率分布，也不是唯一循环。'

/** 采样器拒绝/无法证明时的保守摘要全形（id 是 preview 的 JSON 身份键）。 */
function unavailableSummary(): SpriteAutomaticScriptBehaviorSummary {
  const preview = { kind: 'unavailable', reason: CONSERVATIVE_REASON } as const
  return {
    id: JSON.stringify(preview),
    label: '自动行为脚本',
    detail: '移动、显隐或帧切换由这个场景实例的脚本决定',
    preview,
    instanceCount: 1,
    sceneCount: 1,
  }
}

/** 单 stage 无 next 的 flow 会整场循环到 48 tick 上限 → note 固定披露截断。 */
function singleStageSummary(
  steps: ReadonlyArray<{ frame: number; holdMs: number }>,
  variantLabel = '分支示例：连续命中',
  note = TRUNCATION_NOTE,
): SpriteAutomaticScriptBehaviorSummary {
  return {
    id: JSON.stringify({
      kind: 'variants',
      variants: [{ id: 'frequent-hit', label: variantLabel, steps, note }],
      note: VARIANTS_NOTE,
    }),
    label: '自动脚本部分帧序',
    detail: VARIANTS_NOTE,
    preview: {
      kind: 'variants',
      variants: [{ id: 'frequent-hit', label: variantLabel, steps, note }],
      note: VARIANTS_NOTE,
    },
    instanceCount: 1,
    sceneCount: 1,
  }
}

async function sample(
  name: string,
  body: readonly AuthorCommand[],
  shared: AuthorScriptLibrary = {},
): Promise<readonly SpriteAutomaticScriptBehaviorSummary[]> {
  const flow = { kind: 'stages', initial: 'main', stages: [{ id: 'main', body }] }
  checkAuthorScriptFlow(flow, `cov85.sampler.${name}`)
  const { source, state: blank } = await loadBoundaryProject(`cov85-${name}`)
  const withSprite = await withSharedWorldSprite(source, blank, 'cov85-static')
  const shell = new AddEntityCommand('start', {
    id: 'e1',
    pos: pos(1, 1),
    sprite: 'cov85-static',
  }).apply(withSprite)
  const scene: AuthorSceneDef = {
    id: 'start',
    mapId: 'start',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      {
        id: 'e1',
        sprite: 'cov85-static',
        pos: pos(1, 1),
        initialPage: 'main',
        pages: [{ id: 'main', label: 'Main', auto: 'idle' }],
        behaviors: { auto: { idle: { label: 'Idle', order: 0, flow } } },
      },
    ],
  }
  validateAuthorScenes([scene])
  const projected = projectCanonicalSpritePreviewState(shell, {
    scenes: [scene],
    sharedScripts: shared,
  })
  const definition = projected.sprites.find((sprite) => sprite.id === 'cov85-static')
  if (!definition) throw new Error('cov85-static 用途未登记')
  return collectSpriteAutomaticScriptBehaviors(projected, definition, FRAME_COUNT)
}

test('cov85-sampler chance 0% 恒未命中：安全投影走 else 臂定格帧', async () => {
  expect(
    await sample('chance-zero', [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 0 },
        then: [{ kind: 'setEntityFrame', target: TARGET, frame: 5 }],
        else: [{ kind: 'setEntityFrame', target: TARGET, frame: 6 }],
      },
    ]),
  ).toEqual([
    {
      id: JSON.stringify({
        kind: 'cycle',
        mode: 'explicit',
        intro: [],
        cycle: [{ frame: 6, holdMs: 200 }],
      }),
      label: '自动脚本切帧',
      detail: '检测到 #6；速度与分支以脚本为准',
      preview: {
        kind: 'cycle',
        mode: 'explicit',
        intro: [],
        cycle: [{ frame: 6, holdMs: 200 }],
      },
      instanceCount: 1,
      sceneCount: 1,
    },
  ])
})

test('cov85-sampler chance 100% 恒命中：then 臂定格帧', async () => {
  const summary = await sample('chance-hundred', [
    {
      kind: 'branch',
      cond: { kind: 'chance', percent: 100 },
      then: [{ kind: 'setEntityFrame', target: TARGET, frame: 5 }],
      else: [{ kind: 'setEntityFrame', target: TARGET, frame: 6 }],
    },
  ])
  expect(summary[0]!.preview).toEqual({
    kind: 'cycle',
    mode: 'explicit',
    intro: [],
    cycle: [{ frame: 5, holdMs: 200 }],
  })
  expect(summary[0]!.detail).toBe('检测到 #5；速度与分支以脚本为准')
})

test('cov85-sampler not(chance) 由 canonical 采样器按分支模式给出代表性帧序', async () => {
  // not(chance30)：安全图拒绝非 chance 根条件 → 回落 canonical 采样；命中分支给 #1。
  expect(
    await sample('cond-not', [
      {
        kind: 'branch',
        cond: { kind: 'not', cond: { kind: 'chance', percent: 30 } },
        then: [{ kind: 'setEntityFrame', target: TARGET, frame: 1 }],
      },
    ]),
  ).toEqual([singleStageSummary([{ frame: 1, holdMs: 200 }])])
})

test('cov85-sampler any(0%,100%) 命中；all(100%,0%) 全空臂被拒为不可证', async () => {
  // any：第二个子条件命中 → then #3。
  expect(
    await sample('cond-any', [
      {
        kind: 'branch',
        cond: {
          kind: 'any',
          of: [
            { kind: 'chance', percent: 0 },
            { kind: 'chance', percent: 100 },
          ],
        },
        then: [{ kind: 'setEntityFrame', target: TARGET, frame: 3 }],
      },
    ]),
  ).toEqual([singleStageSummary([{ frame: 3, holdMs: 200 }])])
  // all：第二个子条件恒不命中 → 走 else（空）→ 无帧可采 → 整体保守 unavailable。
  expect(
    await sample('cond-all', [
      {
        kind: 'branch',
        cond: {
          kind: 'all',
          of: [
            { kind: 'chance', percent: 100 },
            { kind: 'chance', percent: 0 },
          ],
        },
        then: [{ kind: 'setEntityFrame', target: TARGET, frame: 2 }],
      },
    ]),
  ).toEqual([unavailableSummary()])
})

test('cov85-sampler finishStep complete 终止整场：未截断的代表性路径', async () => {
  expect(
    await sample('finish-complete', [
      { kind: 'setEntityFrame', target: TARGET, frame: 4 },
      { kind: 'finishStep', next: { kind: 'complete' } },
    ]),
  ).toEqual([singleStageSummary([{ frame: 4, holdMs: 200 }], undefined, '代表性合法路径')])
})

test('cov85-sampler repeat 内 breakLoop 立即中断，只留首帧', async () => {
  expect(
    await sample('break-in-repeat', [
      {
        kind: 'repeat',
        count: 9,
        body: [{ kind: 'setEntityFrame', target: TARGET, frame: 1 }, { kind: 'breakLoop' }],
      },
    ]),
  ).toEqual([singleStageSummary([{ frame: 1, holdMs: 200 }])])
})

test('cov85-sampler 带标号 continueLoop 只回本轮循环，帧序稳定', async () => {
  expect(
    await sample('continue-labeled', [
      {
        kind: 'repeat',
        id: 'r1',
        count: 9,
        body: [
          { kind: 'setEntityFrame', target: TARGET, frame: 2 },
          { kind: 'continueLoop', loop: 'r1' },
        ],
      },
    ]),
  ).toEqual([singleStageSummary([{ frame: 2, holdMs: 200 }])])
})

test('cov85-sampler loop while 0% 条件整段跳过，循环后命令仍执行', async () => {
  expect(
    await sample('loop-while-skip', [
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'chance', percent: 0 },
        body: [{ kind: 'setEntityFrame', target: TARGET, frame: 5 }],
      },
      { kind: 'setEntityFrame', target: TARGET, frame: 6 },
    ]),
  ).toEqual([singleStageSummary([{ frame: 6, holdMs: 200 }])])
})

test('cov85-sampler loop while 100% 进入后 breakLoop：#5/#6 交替到 tick 上限', async () => {
  const summary = await sample('loop-while-break', [
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'chance', percent: 100 },
      body: [{ kind: 'setEntityFrame', target: TARGET, frame: 5 }, { kind: 'breakLoop' }],
    },
    { kind: 'setEntityFrame', target: TARGET, frame: 6 },
  ])
  const preview = summary[0]!.preview
  if (preview.kind !== 'variants') throw new Error('期望 variants')
  const steps = preview.variants[0]!.steps
  // 单 stage 无 next → 整场循环 48 tick：[5,6] 交替 ×47 组。
  expect(steps.map((step) => step.frame)).toEqual(
    Array.from({ length: 96 }, (_, index) => (index % 2 === 0 ? 5 : 6)),
  )
  expect(preview.variants[0]!.note).toBe(TRUNCATION_NOTE)
})

test('cov85-sampler loop until 0% 永不满足：首轮帧重复披露截断', async () => {
  expect(
    await sample('loop-until-zero', [
      {
        kind: 'loop',
        mode: 'until',
        cond: { kind: 'chance', percent: 0 },
        body: [{ kind: 'setEntityFrame', target: TARGET, frame: 1 }, { kind: 'continueLoop' }],
      },
    ]),
  ).toEqual([singleStageSummary([{ frame: 1, holdMs: 200 }])])
})

test('cov85-sampler setEntityFacing 跳过、animEntity 逐帧推进、wait 累计到尾帧', async () => {
  expect(
    await sample('facing-anim-wait', [
      { kind: 'setEntityFacing', target: TARGET, facing: 'up' },
      { kind: 'animEntity', target: TARGET },
      { kind: 'wait', ms: 120 },
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'chance', percent: 100 },
        body: [{ kind: 'breakLoop' }],
      },
    ]),
  ).toEqual([
    singleStageSummary([
      { frame: 1, holdMs: 120 },
      { frame: 2, holdMs: 120 },
      { frame: 3, holdMs: 120 },
      { frame: 4, holdMs: 120 },
      { frame: 5, holdMs: 120 },
      { frame: 6, holdMs: 120 },
      { frame: 7, holdMs: 120 },
      // 尾帧回到 #0 后整场循环，每轮 wait 120ms 继续累计（41 轮 = 4920ms）。
      { frame: 0, holdMs: 4920 },
    ]),
  ])
})

test('cov85-sampler animEntity 在显式定帧后不推进可见帧', async () => {
  const summary = await sample('anim-after-override', [
    { kind: 'setEntityFrame', target: TARGET, frame: 3 },
    { kind: 'animEntity', target: TARGET },
    { kind: 'setEntityFrame', target: TARGET, frame: 4 },
    {
      kind: 'loop',
      mode: 'while',
      cond: { kind: 'chance', percent: 100 },
      body: [{ kind: 'breakLoop' }],
    },
  ])
  const preview = summary[0]!.preview
  if (preview.kind !== 'variants') throw new Error('期望 variants')
  // 显式定帧后的 animEntity 不改可见帧；整场循环 48 tick 输出 [3,4] ×48。
  expect(preview.variants[0]!.steps.map((step) => step.frame)).toEqual(
    Array.from({ length: 96 }, (_, index) => (index % 2 === 0 ? 3 : 4)),
  )
})

test('cov85-sampler 帧靶不是 self、共享脚本自递归/互递归/异己 self/缺失一律拒绝', async () => {
  const shared: AuthorScriptLibrary = {
    selfCycle: { name: 'cyc', self: 'none', body: [{ kind: 'callScript', script: 'selfCycle' }] },
    mutualA: { name: 'a', self: 'none', body: [{ kind: 'callScript', script: 'mutualB' }] },
    mutualB: { name: 'b', self: 'none', body: [{ kind: 'callScript', script: 'mutualA' }] },
  }
  const router: AuthorCommand = {
    kind: 'loop',
    mode: 'while',
    cond: { kind: 'chance', percent: 100 },
    body: [{ kind: 'setEntityFrame', target: TARGET, frame: 1 }, { kind: 'breakLoop' }],
  }
  // 帧靶指向其它实体：canonical 采样器只接受 self 的帧命令 → 保守 unavailable。
  expect(
    await sample('wrong-target', [
      {
        kind: 'branch',
        cond: { kind: 'chance', percent: 100 },
        then: [{ kind: 'setEntityFrame', target: { scene: 'start', entity: 'other' }, frame: 1 }],
        else: [{ kind: 'setEntityFrame', target: TARGET, frame: 2 }],
      },
      router,
    ]),
  ).toEqual([unavailableSummary()])
  expect(
    await sample('call-cycle', [{ kind: 'callScript', script: 'selfCycle' }, router], shared),
  ).toEqual([unavailableSummary()])
  expect(
    await sample('call-mutual', [{ kind: 'callScript', script: 'mutualA' }, router], shared),
  ).toEqual([unavailableSummary()])
  expect(
    await sample(
      'call-foreign-self',
      [
        { kind: 'callScript', script: 'selfCycle', self: { scene: 'start', entity: 'other' } },
        router,
      ],
      shared,
    ),
  ).toEqual([unavailableSummary()])
  expect(
    await sample('call-missing', [{ kind: 'callScript', script: 'nope' }, router], shared),
  ).toEqual([unavailableSummary()])
})

test('cov85-sampler 共享脚本 returnScript 只结束被调方，调用方继续后续命令', async () => {
  const shared: AuthorScriptLibrary = {
    helper: {
      name: 'helper',
      self: 'none',
      body: [{ kind: 'setEntityFrame', target: TARGET, frame: 3 }, { kind: 'returnScript' }],
    },
  }
  const summary = await sample(
    'shared-return',
    [
      { kind: 'callScript', script: 'helper' },
      { kind: 'setEntityFrame', target: TARGET, frame: 4 },
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'chance', percent: 100 },
        body: [
          // 帧号 9 超出 8 帧容器：actualFrameIndex 越界归 0。
          { kind: 'setEntityFrame', target: TARGET, frame: 9 },
          { kind: 'breakLoop' },
        ],
      },
    ],
    shared,
  )
  const preview = summary[0]!.preview
  if (preview.kind !== 'variants') throw new Error('期望 variants')
  expect(preview.variants[0]!.steps.map((step) => step.frame)).toEqual(
    Array.from({ length: 144 }, (_, index) => [3, 4, 0][index % 3]),
  )
  expect(preview.variants[0]!.note).toBe(TRUNCATION_NOTE)
})

test('cov85-sampler confirm/startBattle(onLose)/teleportOut(onFail) 容器路由进 canonical 采样后整体保守', async () => {
  const conditional: AuthorCommand = {
    kind: 'loop',
    mode: 'while',
    cond: { kind: 'chance', percent: 50 },
    body: [{ kind: 'animEntity', target: TARGET }],
  }
  expect(
    await sample('confirm-container', [
      {
        kind: 'confirm',
        onYes: [conditional],
        onNo: [{ kind: 'wait', ms: 1 }],
      },
    ]),
  ).toEqual([unavailableSummary()])
  expect(
    await sample('battle-container', [
      {
        kind: 'startBattle',
        enemyTeamId: 'team-1',
        onLose: [conditional],
      },
    ]),
  ).toEqual([unavailableSummary()])
  expect(
    await sample('teleport-container', [{ kind: 'teleportOut', onFail: [conditional] }]),
  ).toEqual([unavailableSummary()])
})
