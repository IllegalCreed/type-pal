/**
 * TEST-GLM-CONTENT-GUARDS-3 G3：checkAuthorCommands / checkRuntimeCommands 残差。
 * 去重：author-script-core.test.ts（选择/循环正控、cursor handoff、legacy each、
 * 未知条件、战斗编排、openShop、transition 正控、malformed control each）、
 * author-script.current-characterization、runtime-script-lifecycle/boundaries、
 * author-battle-dialogue-boundary 13 项、validate-enemy-crosscalls G06、
 * enemy-script.wave2 已证本文件不重复的轴；本文件只补冻结池内的裸实体 id 叶、
 * releaseEntity/setMultiEntityState、loop mode/yield/maxIterations、startBattle
 * enemyTeamId/auto/fieldId/music、callScript 合法正控、selectEntityBehavior channel、
 * selectEntityPage/selectEntityTriggerActivation selection 叶、selectSceneHooks、
 * loadScene 互斥/facing/transition 叶。不重做上波条件叶矩阵。
 * R1：loop 三行与其它表行一样由同一合法 loop 工厂派生（全部含 cond），只改所测字段。
 * R2：每个对象/数组拒绝调用经 expectRejectUnchanged 逐次取实际入参独立快照并立即比较。
 */
import { describe, test } from 'vitest'
import { expectRejectUnchanged } from './__tests__/glm-guard-residual-fixtures.js'
import { expectAcceptsUnchanged } from './__tests__/guard-leaf-fixtures.js'
import { checkAuthorCommands } from './author-script.js'
import { checkRuntimeCommands } from './runtime-script.js'

const wait = () => [{ kind: 'wait', ms: 40 }]
const runtimeLegal = () => [
  { kind: 'suspendEntity', target: { scene: 's', entity: 'e' }, ticks: 1 },
]

describe('G3 author/runtime command 残差', () => {
  test('合法 wait 与 runtime 生命周期命令经两入口通过且输入保真', () => {
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), wait())
    expectAcceptsUnchanged((value) => checkRuntimeCommands(value, 'commands'), runtimeLegal())
  })

  test('条件与命令里的裸实体 id 拒绝', () => {
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

  const legalLoop = () => ({
    kind: 'loop',
    mode: 'while',
    cond: { kind: 'chance', percent: 50 },
    body: [],
    yield: 'worldTick',
    maxIterations: 2,
  })

  test.each([
    ['loop mode 非法', { mode: 'repeat' }, 'commands[0].mode: 期望 while|until'],
    [
      'loop yield 非 worldTick',
      { yield: 'macroTask' },
      'commands[0].yield: canonical loop 必须 worldTick',
    ],
    ['loop maxIterations 非正', { maxIterations: 0 }, 'commands[0].maxIterations: 期望正整数'],
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
