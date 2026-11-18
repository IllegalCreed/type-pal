import { describe, expect, test } from 'vitest'
import {
  expectAcceptsUnchanged,
  expectExactError,
  expectRejectUnchanged,
} from './__tests__/validation-assertions.js'
import { checkAuthorCommands } from './author-script.js'
import { checkRuntimeCommands } from './runtime-script.js'

const wait = () => [{ kind: 'wait', ms: 40 }]
const runtimeLegal = () => [
  { kind: 'suspendEntity', target: { scene: 's', entity: 'e' }, ticks: 1 },
]

describe('author and runtime command validation', () => {
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
    const control = [{ kind: 'loadScene', scene: 's', entryId: 'a' }]
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
