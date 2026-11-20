import { describe, expect, test } from 'vitest'
import {
  expectAcceptsUnchanged,
  expectExactError,
  expectRejectUnchanged,
} from './__tests__/validation-assertions.js'
import { type AuthorCommand, checkAuthorCommands } from './author-script.js'
import { checkRuntimeCommands } from './runtime-script.js'

const wait = () => [{ kind: 'wait', ms: 40 }]
const runtimeLegal = () => [
  { kind: 'suspendEntity', target: { scene: 's', entity: 'e' }, ticks: 1 },
]

type Timeline = Extract<AuthorCommand, { kind: 'sceneTimeline' }>
const actorTrack = (): Timeline['tracks'][number] => ({
  id: 'guard',
  label: '守卫',
  target: { scene: 'gate', entity: 'guard' },
  cues: [
    { atMs: 0, body: [{ kind: 'setEntityFacing', facing: 'left' }] },
    {
      atMs: 100,
      repeat: { count: 3, intervalMs: 100 },
      body: [{ kind: 'nudgeEntity', dx: -4, dy: 2 }, { kind: 'animEntity' }],
    },
    { atMs: 400, body: [{ kind: 'setEntityFrame', frame: 2 }, { kind: 'releaseEntity' }] },
  ],
})
const curtain = (atMs: number, dir: 'in' | 'out' = 'in'): Timeline['tracks'][number] => ({
  id: 'curtain',
  label: '幕布',
  cues: [{ atMs, body: [{ kind: 'fade', dir, ms: 400, color: 'red' }] }],
})
const pan = (frames = 3): Timeline['tracks'][number] => ({
  id: 'camera',
  label: '镜头',
  cues: [{ atMs: 0, body: [{ kind: 'cameraPan', dx: 4, dy: 2, frames, startImmediately: true }] }],
})
const timeline = (tracks: readonly unknown[]) => [{ kind: 'sceneTimeline', label: '城门', tracks }]
const checkForeground = (value: unknown) =>
  checkAuthorCommands(value, 'commands', { rootScope: 'flow', flowOwner: 'hook' })

describe('foreground scene timelines', () => {
  test('admits overlapping actor and camera cues during a single fade without changing author data', () => {
    expectAcceptsUnchanged(checkForeground, timeline([curtain(0), pan(), actorTrack()]))
    expectAcceptsUnchanged(
      checkForeground,
      timeline([curtain(0, 'out'), { ...curtain(400), id: 'reveal' }]),
    )
  })

  test.each([
    { rootScope: 'script' },
    { rootScope: 'flow', flowOwner: 'auto' },
  ] as const)('rejects a scene timeline outside foreground flows ($rootScope $flowOwner)', (options) => {
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands', options),
      timeline([actorTrack()]),
      'commands[0]: 只允许前景步骤内的场景演出',
    )
  })

  test.each([
    { sample: 'no tracks', tracks: [], diagnostic: '.tracks: 期望非空轨道' },
    {
      sample: 'two identical track IDs',
      tracks: [actorTrack(), actorTrack()],
      diagnostic: '.tracks[1].id: 重复轨道 ID guard',
    },
    {
      sample: 'two writers for an actor',
      tracks: [actorTrack(), { ...actorTrack(), id: 'duplicate' }],
      diagnostic: '.tracks[1]: 同一角色不得由两条轨道写入',
    },
    {
      sample: 'no actor cues',
      tracks: [{ ...actorTrack(), cues: [] }],
      diagnostic: '.tracks[0].cues: 期望非空动作组',
    },
    {
      sample: 'no actor actions',
      tracks: [{ ...actorTrack(), cues: [{ atMs: 0, body: [] }] }],
      diagnostic: '.tracks[0].cues[0].body: 期望非空指令',
    },
    {
      sample: 'two cameras',
      tracks: [pan(), { ...pan(), id: 'duplicate' }],
      diagnostic: '.tracks[1].cues[0].body[0]: 镜头平移须独占同拍起步的动作组，且每段只允许一条',
    },
    {
      sample: 'two overlapping fades',
      tracks: [curtain(0), { ...curtain(399), id: 'reveal' }],
      diagnostic: ': 淡变区间重叠',
    },
    { sample: 'unbounded camera work', tracks: [pan(4097)], diagnostic: ': 演出动作超过 4096 条' },
  ])('rejects $sample before compilation', ({ tracks, diagnostic }) => {
    expectRejectUnchanged(checkForeground, timeline(tracks), `commands[0]${diagnostic}`)
  })

  test.each([
    {
      sample: 'fractional clock offset',
      cue: { atMs: 0.5 },
      diagnostic: '.atMs: 期望递增的非负整数毫秒，同轨动作不得重叠',
    },
    {
      sample: 'negative clock offset',
      cue: { atMs: -1 },
      diagnostic: '.atMs: 期望递增的非负整数毫秒，同轨动作不得重叠',
    },
    {
      sample: 'overlapping repeated beat',
      cue: { atMs: 200, repeat: { count: 3, intervalMs: 100 } },
      diagnostic: '.atMs: 期望递增的非负整数毫秒，同轨动作不得重叠',
      index: 2,
    },
    {
      sample: 'single repetition',
      cue: { repeat: { count: 1, intervalMs: 100 } },
      diagnostic: '.repeat: 期望正间隔及至少两轮',
    },
    {
      sample: 'fractional repetition count',
      cue: { repeat: { count: 2.5, intervalMs: 100 } },
      diagnostic: '.repeat: 期望正间隔及至少两轮',
    },
    {
      sample: 'zero repetition interval',
      cue: { repeat: { count: 2, intervalMs: 0 } },
      diagnostic: '.repeat: 期望正间隔及至少两轮',
    },
    {
      sample: 'fractional repetition interval',
      cue: { repeat: { count: 2, intervalMs: 0.5 } },
      diagnostic: '.repeat: 期望正间隔及至少两轮',
    },
    {
      sample: 'unsafe final beat',
      cue: { atMs: Number.MAX_SAFE_INTEGER, repeat: { count: 2, intervalMs: 1 } },
      diagnostic: ': 演出结束时间超出安全整数',
    },
    {
      sample: 'too many actor beats',
      cue: { repeat: { count: 4097, intervalMs: 100 } },
      diagnostic: ': 演出动作超过 4096 条',
      atRoot: true,
    },
  ])('rejects $sample', ({ cue, diagnostic, index = 0, atRoot }) => {
    const track = actorTrack()
    const cues = track.cues.slice(0, index + 1)
    const invalid = cues.map((valid, i) => (i === index ? { ...valid, ...cue } : valid))
    expectRejectUnchanged(
      checkForeground,
      timeline([{ ...track, cues: invalid }]),
      `commands[0]${atRoot ? '' : `.tracks[0].cues[${index}]`}${diagnostic}`,
    )
  })

  test.each([
    {
      sample: 'an actor action without an owner',
      action: { kind: 'animEntity' },
      target: undefined,
      diagnostic: ': 实体动作轨道须指定唯一目标',
      atTrack: true,
    },
    {
      sample: 'a music command in an actor track',
      action: { kind: 'playMusic', asset: 'quiet' },
      diagnostic: ': 只允许瞬时走位、动作帧和转向',
    },
    {
      sample: 'nonfinite actor movement',
      action: { kind: 'nudgeEntity', dx: 0, dy: Infinity },
      diagnostic: ': 位移须为有限像素值',
    },
    {
      sample: 'negative pose frame',
      action: { kind: 'setEntityFrame', frame: -1 },
      diagnostic: '.frame: 期望非负安全整数',
    },
    {
      sample: 'a fade owned by an actor',
      action: { kind: 'fade', dir: 'in', ms: 400 },
      diagnostic: ': 淡变须独占动作组，且有确定的正整数延时',
    },
    {
      sample: 'an instantaneous fade',
      action: { kind: 'fade', dir: 'in', ms: 0 },
      noTarget: true,
      diagnostic: ': 淡变须独占动作组，且有确定的正整数延时',
    },
    {
      sample: 'camera does not start on the authored beat',
      action: { kind: 'cameraPan', dx: 4, dy: 2, frames: 3, startImmediately: false },
      noTarget: true,
      diagnostic: ': 镜头平移须独占同拍起步的动作组，且每段只允许一条',
    },
  ])('rejects $sample', ({ action, diagnostic, atTrack, noTarget }) => {
    const actor = actorTrack()
    const track = {
      ...actor,
      ...((atTrack || noTarget) && { target: undefined }),
      cues: [{ atMs: 0, body: [action] }],
    }
    expectRejectUnchanged(
      checkForeground,
      timeline([track]),
      `commands[0].tracks[0]${atTrack ? '' : '.cues[0].body[0]'}${diagnostic}`,
    )
  })

  test('timed repeat belongs to a foreground step and rejects an overflowing schedule', () => {
    const repeat = { kind: 'repeat', count: 2, intervalMs: 100, body: wait() }
    expectAcceptsUnchanged(checkForeground, [repeat])
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands', { rootScope: 'flow', flowOwner: 'auto' }),
      [repeat],
      'commands[0].intervalMs: 只允许前景步骤中的重复指令',
    )
    expectRejectUnchanged(
      checkForeground,
      [{ ...repeat, intervalMs: Number.MAX_SAFE_INTEGER }],
      'commands[0].intervalMs: 期望正毫秒整数，且总节拍不超过安全整数',
    )
  })
})

describe('author and runtime command validation', () => {
  test('a world-beat chase keeps its optional default speed and rejects invalid movement settings', () => {
    const chase = {
      kind: 'chasePlayer',
      target: { scene: 'gate', entity: 'guard' },
      worldStep: true,
    }
    expectAcceptsUnchanged(checkForeground, [chase])
    expectAcceptsUnchanged(checkForeground, [{ ...chase, speed: 4 }])
    expectRejectUnchanged(
      checkForeground,
      [{ ...chase, worldStep: false }],
      'commands[0].worldStep: 期望 true',
    )
    expectRejectUnchanged(
      checkForeground,
      [{ ...chase, speed: -1 }],
      'commands[0].speed: 期望非负有限数',
    )
    expectRejectUnchanged(
      checkForeground,
      [{ ...chase, speed: '4' }],
      'commands[0].speed: 期望非负有限数',
    )
  })

  test('an authored teleport validates presentation fields before its fallback body', () => {
    const command = {
      kind: 'teleportOut',
      gatherParty: true,
      arrivalSound: 'sound.arrival',
      onFail: [{ kind: 'wait', ms: 40 }],
    }
    expectAcceptsUnchanged(checkForeground, [command])
    expectRejectUnchanged(
      checkForeground,
      [{ ...command, gatherParty: 'true' }],
      'commands[0].gatherParty: 期望 boolean',
    )
    expectRejectUnchanged(
      checkForeground,
      [{ ...command, arrivalSound: '' }],
      'commands[0].arrivalSound: 期望非空字符串',
    )
  })

  test('合法 wait 与 runtime 生命周期命令经两入口通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), wait())
    expectAcceptsUnchanged((value) => checkRuntimeCommands(value, 'commands'), runtimeLegal())
  })

  test('实体动画与释放命令拒绝裸实体 id', () => {
    const badMove = [{ kind: 'animEntity', entity: 'e1', target: { scene: 's', entity: 'e' } }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badMove,
      'commands[0].entity: 当前作者态禁止裸实体 id',
    )
    const badRelease = [{ kind: 'releaseEntity', entity: 'e1' }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badRelease,
      'commands[0].entity: 当前作者态禁止裸实体 id',
    )
  })

  test('setMultiEntityState 裸 entities 与空 targets 拒绝', () => {
    const badEntities = [
      { kind: 'setMultiEntityState', entities: ['e1'], targets: [{ scene: 's', entity: 'e' }] },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badEntities,
      'commands[0].entities: 当前作者态禁止裸实体 id',
    )
    const badTargets = [{ kind: 'setMultiEntityState', targets: [] }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badTargets,
      'commands[0].targets: 期望非空 EntityAddress[]',
    )
  })

  test('非数组拒绝；空命令数组合法', () => {
    expect(() => checkAuthorCommands({}, 'cmds')).toThrow(
      new Error('cmds: 期望 BaseAuthorCommand[]'),
    )
    expect(() => checkAuthorCommands([], 'cmds')).not.toThrow()
  })
  test('未知/已退役命令拒绝且 where 精确', () => {
    expect(() => checkAuthorCommands([{ kind: 'legacyThing' }], 'cmds')).toThrow(
      new Error('cmds[0].kind: 未知或已退役的 current 命令 legacyThing'),
    )
  })

  const legalLoop = () => ({
    kind: 'loop',
    mode: 'while',
    cond: { kind: 'chance', percent: 50 },
    body: [],
  })

  test.each([
    ['loop mode 非法', { mode: 'repeat' }, 'commands[0].mode: 期望 while|until|forever'],
    ['loop yield 非 worldTick', { yield: 'macroTask' }, 'commands[0].yield: 未知字段'],
    ['loop maxIterations 已退役', { maxIterations: 0 }, 'commands[0].maxIterations: 未知字段'],
  ] as const)('%s拒绝（同一合法 loop 仅改所测字段）', (_label, over, error) => {
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), [legalLoop()])
    const bad = { ...legalLoop(), ...over }
    expectRejectUnchanged((value) => checkAuthorCommands(value, 'commands'), [bad], error)
  })

  test('startBattle 叶轴拒绝（runtime 入口）', () => {
    const control = [{ kind: 'startBattle', enemyTeamId: 'team' }]
    expectAcceptsUnchanged((value) => checkRuntimeCommands(value, 'commands'), control)
    const badTeam = [{ kind: 'startBattle', enemyTeamId: '' }]
    expectRejectUnchanged(
      (value) => checkRuntimeCommands(value, 'commands'),
      badTeam,
      'commands[0].enemyTeamId: 期望非空字符串',
    )
    const badAuto = [{ kind: 'startBattle', enemyTeamId: 'team', auto: 'yes' }]
    expectRejectUnchanged(
      (value) => checkRuntimeCommands(value, 'commands'),
      badAuto,
      'commands[0].auto: 期望 boolean',
    )
    const badField = [{ kind: 'startBattle', enemyTeamId: 'team', fieldId: -1 }]
    expectRejectUnchanged(
      (value) => checkRuntimeCommands(value, 'commands'),
      badField,
      'commands[0].fieldId: 期望非负安全整数',
    )
    const badMusic = [{ kind: 'startBattle', enemyTeamId: 'team', music: 3 }]
    expectRejectUnchanged(
      (value) => checkRuntimeCommands(value, 'commands'),
      badMusic,
      'commands[0].music: 期望非空 AssetId|null',
    )
  })

  test('callScript 合法正控与 selectEntityBehavior channel 拒绝', () => {
    const legalCall = [
      {
        kind: 'callScript',
        script: 'shared/user/x',
        self: { scene: 's', entity: 'e' },
      },
    ]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), legalCall)
    const badChannel = [
      {
        kind: 'selectEntityBehavior',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: 'b' },
        channel: 'tap',
      },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badChannel,
      'commands[0].channel: 期望 trigger|auto',
    )
  })

  test('selectEntityPage 与 setEntityTriggerActivation selection 叶拒绝', () => {
    const legalPage = [
      {
        kind: 'selectEntityPage',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: 'page.a' },
      },
    ]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), legalPage)
    const badPage = [
      {
        kind: 'selectEntityPage',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'disabled' },
      },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badPage,
      'commands[0].selection.kind: 期望 inherit|use',
    )
    const legalActivation = [
      {
        kind: 'setEntityTriggerActivation',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: { on: 'interact', range: 2 } },
      },
    ]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), legalActivation)
    const badOn = [
      {
        kind: 'setEntityTriggerActivation',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: { on: 'tap' } },
      },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badOn,
      'commands[0].selection.value.on: 期望 interact|touch',
    )
    const badRange = [
      {
        kind: 'setEntityTriggerActivation',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: { on: 'interact', range: -1 } },
      },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badRange,
      'commands[0].selection.value.range: 期望非负有限数',
    )
  })

  test('selectSceneHooks 空选择拒绝、合法选择通过', () => {
    const legalHooks = [
      {
        kind: 'selectSceneHooks',
        scene: 's',
        selection: { onEnter: { kind: 'use', value: 'default' } },
      },
    ]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), legalHooks)
    const badHooks = [{ kind: 'selectSceneHooks', scene: 's', selection: {} }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badHooks,
      'commands[0].selection: 至少选择一个 hook 槽',
    )
  })

  test('loadScene entryId/pos 互斥、facing 与 transition 叶拒绝', () => {
    const control = [
      { kind: 'loadScene', scene: 's', entryId: 'a' },
      { kind: 'loadScene', scene: 's', pos: 'current' },
    ]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), control)
    const badBoth = [{ kind: 'loadScene', scene: 's', entryId: 'a', pos: { col: 1, row: 1 } }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badBoth,
      'commands[0]: entryId 与 pos 不能同时存在',
    )
    const badFacing = [{ kind: 'loadScene', scene: 's', entryId: 'a', facing: 'north' }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badFacing,
      'commands[0].facing: 期望 up/down/left/right',
    )
    const badTransition = [
      {
        kind: 'loadScene',
        scene: 's',
        entryId: 'a',
        transition: { kind: 'modern', outMs: 1, inMs: 1, color: 'black' },
      },
    ]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badTransition,
      'commands[0].transition: modern 必须是 260/260 black',
    )
    const badWipe = [{ kind: 'loadScene', scene: 's', entryId: 'a', transition: { kind: 'wipe' } }]
    expectRejectUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      badWipe,
      'commands[0].transition.kind: 未知过渡类型',
    )
  })
})

test.each([
  [[42], 'commands[0]: 期望对象'],
  [[{ kind: '' }], 'commands[0].kind: 期望非空字符串'],
] as const)('rejects malformed entries in the author command array: %j', (input, message) => {
  expectRejectUnchanged((value) => checkAuthorCommands(value, 'commands'), input, message)
})

test.each([
  'jumpScript',
  'setEntityAuto',
  'clearSceneScripts',
])('rejects retired author command %s', (kind) => {
  expectExactError(
    () => checkAuthorCommands([{ kind }], 'commands'),
    `commands[0].kind: 未知或已退役的 current 命令 ${kind}`,
  )
})

test('validates both branch arms and the condition in the current author dialect', () => {
  const branch = {
    kind: 'branch',
    cond: { kind: 'flag', flag: 'ready', is: true },
    then: [{ kind: 'wait', ms: 1 }],
    else: [{ kind: 'gameOver' }],
  }
  expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), [branch])
  const { cond: _condition, ...withoutCondition } = branch
  for (const [invalid, message] of [
    [withoutCondition, 'commands[0].cond: 期望对象'],
    [{ ...branch, then: 'x' }, 'commands[0].then: 期望 BaseAuthorCommand[]'],
    [{ ...branch, else: 'x' }, 'commands[0].else: 期望 BaseAuthorCommand[]'],
  ] as const)
    expectRejectUnchanged((value) => checkAuthorCommands(value, 'commands'), [invalid], message)
})

test('validates both battle outcome arms without treating the command as a terminal node', () => {
  const battle = { kind: 'startBattle', enemyTeamId: 'team', onLose: [], onFlee: [] }
  expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), [battle])
  for (const arm of ['onLose', 'onFlee'] as const)
    expectExactError(
      () => checkAuthorCommands([{ ...battle, [arm]: [{ kind: 'jumpScript' }] }], 'commands'),
      `commands[0].${arm}[0].kind: 未知或已退役的 current 命令 jumpScript`,
    )
})

test('entity behavior selection accepts the three current states and rejects a fourth', () => {
  const command = {
    kind: 'selectEntityBehavior',
    target: { scene: 'scene', entity: 'guard' },
    channel: 'trigger',
  }
  for (const selection of [
    { kind: 'use', value: 'active' },
    { kind: 'inherit' },
    { kind: 'disabled' },
  ])
    expectAcceptsUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      [{ ...command, selection }],
    )
  expectExactError(
    () => checkAuthorCommands([{ ...command, selection: { kind: 'other' } }], 'commands'),
    'commands[0].selection.kind: 期望 inherit|disabled|use',
  )
})

test('validates the onEnter and onTeleport selection paths', () => {
  const command = { kind: 'selectSceneHooks', scene: 'scene' }
  expectAcceptsUnchanged(
    (value) => checkAuthorCommands(value, 'commands'),
    [
      {
        ...command,
        selection: { onEnter: { kind: 'use', value: 'active' }, onTeleport: { kind: 'inherit' } },
      },
    ],
  )
  expectExactError(
    () =>
      checkAuthorCommands([{ ...command, selection: { onEnter: { kind: 'other' } } }], 'commands'),
    'commands[0].selection.onEnter.kind: 期望 inherit|disabled|use',
  )
})

test('accepts explicit entity addresses for multi-target state and relative coordinates', () => {
  const target = { scene: 'scene', entity: 'guard' }
  const multiple = { kind: 'setMultiEntityState', targets: [target], state: 2 }
  expectAcceptsUnchanged(
    (value) => checkAuthorCommands(value, 'commands'),
    [multiple, { kind: 'setEntityPosRelParty', target, dcol: 1, drow: -1 }],
  )
  expectExactError(
    () => checkAuthorCommands([{ ...multiple, targets: 'guard' }], 'commands'),
    'commands[0].targets: 期望非空 EntityAddress[]',
  )
})
