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
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
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
    const before = deepSnapshot(badMove)
    expectExactError(
      () => checkAuthorCommands(badMove, 'commands'),
      'commands[0].entity: 当前作者态禁止裸实体 id',
    )
    expect(badMove).toEqual(before)
    const badRelease = [{ kind: 'releaseEntity', entity: 'e1' }]
    const releaseBefore = deepSnapshot(badRelease)
    expectExactError(
      () => checkAuthorCommands(badRelease, 'commands'),
      'commands[0].entity: 当前作者态禁止裸实体 id',
    )
    expect(badRelease).toEqual(releaseBefore)
  })

  test('setMultiEntityState 裸 entities 与空 targets 拒绝', () => {
    const badEntities = [
      { kind: 'setMultiEntityState', entities: ['e1'], targets: [{ scene: 's', entity: 'e' }] },
    ]
    const before = deepSnapshot(badEntities)
    expectExactError(
      () => checkAuthorCommands(badEntities, 'commands'),
      'commands[0].entities: 当前作者态禁止裸实体 id',
    )
    expect(badEntities).toEqual(before)
    const badTargets = [{ kind: 'setMultiEntityState', targets: [] }]
    expectExactError(
      () => checkAuthorCommands(badTargets, 'commands'),
      'commands[0].targets: 期望非空 EntityAddress[]',
    )
  })

  test.each([
    [
      'loop mode 非法',
      { kind: 'loop', mode: 'repeat', body: [], yield: 'worldTick', maxIterations: 2 },
      'commands[0].mode: 期望 while|until',
    ],
    [
      'loop yield 非 worldTick',
      {
        kind: 'loop',
        mode: 'while',
        cond: { kind: 'chance', percent: 50 },
        body: [],
        yield: 'macroTask',
        maxIterations: 2,
      },
      'commands[0].yield: canonical loop 必须 worldTick',
    ],
    [
      'loop maxIterations 非正',
      {
        kind: 'loop',
        mode: 'until',
        cond: { kind: 'chance', percent: 50 },
        body: [],
        yield: 'worldTick',
        maxIterations: 0,
      },
      'commands[0].maxIterations: 期望正整数',
    ],
  ] as const)('%s拒绝', (_label, bad, error) => {
    expectAcceptsUnchanged(
      (value) => checkAuthorCommands(value, 'commands'),
      [
        {
          kind: 'loop',
          mode: 'while',
          cond: { kind: 'chance', percent: 50 },
          body: [],
          yield: 'worldTick',
          maxIterations: 2,
        },
      ],
    )
    const input = [bad]
    const before = deepSnapshot(input)
    expectExactError(() => checkAuthorCommands(input, 'commands'), error)
    expect(input).toEqual(before)
  })

  test('startBattle 叶轴拒绝（runtime 入口）', () => {
    const control = [{ kind: 'startBattle', enemyTeamId: 'team' }]
    expectAcceptsUnchanged((value) => checkRuntimeCommands(value, 'commands'), control)
    const badTeam = [{ kind: 'startBattle', enemyTeamId: '' }]
    const teamBefore = deepSnapshot(badTeam)
    expectExactError(
      () => checkRuntimeCommands(badTeam, 'commands'),
      'commands[0].enemyTeamId: 期望非空字符串',
    )
    expect(badTeam).toEqual(teamBefore)
    const badAuto = [{ kind: 'startBattle', enemyTeamId: 'team', auto: 'yes' }]
    expectExactError(
      () => checkRuntimeCommands(badAuto, 'commands'),
      'commands[0].auto: 期望 boolean',
    )
    const badField = [{ kind: 'startBattle', enemyTeamId: 'team', fieldId: -1 }]
    expectExactError(
      () => checkRuntimeCommands(badField, 'commands'),
      'commands[0].fieldId: 期望非负安全整数',
    )
    const badMusic = [{ kind: 'startBattle', enemyTeamId: 'team', music: 3 }]
    expectExactError(
      () => checkRuntimeCommands(badMusic, 'commands'),
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
    const before = deepSnapshot(badChannel)
    expectExactError(
      () => checkAuthorCommands(badChannel, 'commands'),
      'commands[0].channel: 期望 trigger|auto',
    )
    expect(badChannel).toEqual(before)
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
    const pageBefore = deepSnapshot(badPage)
    expectExactError(
      () => checkAuthorCommands(badPage, 'commands'),
      'commands[0].selection.kind: 期望 inherit|use',
    )
    expect(badPage).toEqual(pageBefore)
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
    const onBefore = deepSnapshot(badOn)
    expectExactError(
      () => checkAuthorCommands(badOn, 'commands'),
      'commands[0].selection.value.on: 期望 interact|touch',
    )
    expect(badOn).toEqual(onBefore)
    const badRange = [
      {
        kind: 'setEntityTriggerActivation',
        target: { scene: 's', entity: 'e' },
        selection: { kind: 'use', value: { on: 'interact', range: -1 } },
      },
    ]
    expectExactError(
      () => checkAuthorCommands(badRange, 'commands'),
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
    const before = deepSnapshot(badHooks)
    expectExactError(
      () => checkAuthorCommands(badHooks, 'commands'),
      'commands[0].selection: 至少选择一个 hook 槽',
    )
    expect(badHooks).toEqual(before)
  })

  test('loadScene entryId/pos 互斥、facing 与 transition 叶拒绝', () => {
    const control = [{ kind: 'loadScene', scene: 's', entryId: 'a' }]
    expectAcceptsUnchanged((value) => checkAuthorCommands(value, 'commands'), control)
    const badBoth = [{ kind: 'loadScene', scene: 's', entryId: 'a', pos: { col: 1, row: 1 } }]
    const bothBefore = deepSnapshot(badBoth)
    expectExactError(
      () => checkAuthorCommands(badBoth, 'commands'),
      'commands[0]: entryId 与 pos 不能同时存在',
    )
    expect(badBoth).toEqual(bothBefore)
    const badFacing = [{ kind: 'loadScene', scene: 's', entryId: 'a', facing: 'north' }]
    expectExactError(
      () => checkAuthorCommands(badFacing, 'commands'),
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
    expectExactError(
      () => checkAuthorCommands(badTransition, 'commands'),
      'commands[0].transition: modern 必须是 260/260 black',
    )
    const badWipe = [{ kind: 'loadScene', scene: 's', entryId: 'a', transition: { kind: 'wipe' } }]
    expectExactError(
      () => checkAuthorCommands(badWipe, 'commands'),
      'commands[0].transition.kind: 未知过渡类型',
    )
  })
})
