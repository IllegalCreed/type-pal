/**
 * TEST-GLM-CONTENT-GUARDS-3 G4：checkCommands / checkStages / checkEntityPages 残差。
 * 去重：script-library.test.ts 全部 15 条（stages/pages/entry/资产 id/loadScene 目标与
 * transition/退役命令/动作绑定）已证基础合法流与本文件不重复的负例；dialog.line 退役
 * 消息经 runtime 侧既有覆盖、portrait.icon/soundId/unmigrated/playRng 已覆盖——
 * 本文件只补冻结池内：数组/kind 门、cue rows/autoAdvance/portrait 叶、loadScene
 * 空场景/坐标/过渡 source 正负控/wipe、holdScreen color、revealScreen token、
 * playMusic/playVideo asset、playEntityAction/stopEntityAction 叶、
 * setActorAppearance/setFollowers、quitToTitle videos、playFrameAnimation 叶、
 * stopMusic 参数拒绝、startBattle.onFlee/teleportOut.onFail/confirm.onNo 递归臂、
 * checkStages 数组/next/entry prepare/reveal 叶、checkEntityPages animation/trigger 叶，
 * 及同文件导出的四个投影小函数的现行合同。不复活磁盘旧格式。
 */
import { describe, expect, test } from 'vitest'
import { deepSnapshot } from './__tests__/glm-content-contract-fixtures.js'
import { expectAcceptsUnchanged, expectExactError } from './__tests__/guard-leaf-fixtures.js'
import {
  applyStageNext,
  checkCommands,
  checkEntityPages,
  checkStages,
  emptyProjectedWorldScriptState,
  sceneEntryPrepareSafety,
  stageIndexFor,
} from './script.js'

const wait = () => [{ kind: 'wait', ms: 40 }]

describe('G4 checkCommands 残差', () => {
  test('数组与 kind 门拒绝', () => {
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), wait())
    expectExactError(() => checkCommands(42, 'commands'), 'commands: 期望 Command[]')
    const noKind = [{}]
    const before = deepSnapshot(noKind)
    expectExactError(() => checkCommands(noKind, 'commands'), 'commands[0]: 缺 kind')
    expect(noKind).toEqual(before)
  })

  test('dialog.line 退役与 cue rows/autoAdvance 叶拒绝', () => {
    const retired = [{ kind: 'dialog', line: 'x', cue: { rows: [{ text: 't' }] } }]
    const retiredBefore = deepSnapshot(retired)
    expectExactError(
      () => checkCommands(retired, 'commands'),
      'commands[0]: dialog.line 已退役，请在加载边界升级为 cue.rows',
    )
    expect(retired).toEqual(retiredBefore)
    const control = [{ kind: 'dialog', cue: { rows: [{ text: 't', speed: 10 }], autoAdvance: 0 } }]
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), control)
    const noText = [{ kind: 'dialog', cue: { rows: [{}] } }]
    expectExactError(() => checkCommands(noText, 'commands'), 'commands[0].cue.rows[0]: 缺 text')
    const badSpeed = [{ kind: 'dialog', cue: { rows: [{ text: 't', speed: -1 }] } }]
    expectExactError(
      () => checkCommands(badSpeed, 'commands'),
      'commands[0].cue.rows[0].speed: 期望非负有限数',
    )
    const badAdvance = [{ kind: 'dialog', cue: { rows: [{ text: 't' }], autoAdvance: -1 } }]
    expectExactError(
      () => checkCommands(badAdvance, 'commands'),
      'commands[0].cue.autoAdvance: 期望非负有限数',
    )
    const badPortrait = [
      { kind: 'dialog', cue: { rows: [{ text: 't' }], portrait: { asset: '', side: 'left' } } },
    ]
    expectExactError(
      () => checkCommands(badPortrait, 'commands'),
      'commands[0].cue.portrait.asset: 期望非空 AssetId',
    )
    const badSide = [
      {
        kind: 'dialog',
        cue: { rows: [{ text: 't' }], portrait: { asset: 'p.a', side: 'center' } },
      },
    ]
    expectExactError(
      () => checkCommands(badSide, 'commands'),
      'commands[0].cue.portrait.side: 期望 left/right',
    )
  })

  test('loadScene 叶轴拒绝与 source 过渡正控', () => {
    const control = [
      {
        kind: 'loadScene',
        scene: 's',
        pos: { col: 1, row: 1, height: 0 },
        transition: {
          kind: 'source',
          outMs: 10,
          inMs: 10,
          color: 'black',
          evidenceId: 'evidence.1',
        },
      },
    ]
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), control)
    const emptyScene = [{ kind: 'loadScene', scene: '' }]
    expectExactError(
      () => checkCommands(emptyScene, 'commands'),
      'commands[0].scene: 期望非空场景 id',
    )
    const badFacing = [
      { kind: 'loadScene', scene: 's', pos: { col: 1, row: 1, height: 0 }, facing: 'north' },
    ]
    expectExactError(
      () => checkCommands(badFacing, 'commands'),
      'commands[0].facing: 期望 up/down/left/right',
    )
    const badPos = [{ kind: 'loadScene', scene: 's', pos: { col: Number.NaN, row: 1, height: 0 } }]
    expectExactError(() => checkCommands(badPos, 'commands'), 'commands[0].pos.col: 期望有限数')
    const badSource = [
      {
        kind: 'loadScene',
        scene: 's',
        transition: {
          kind: 'source',
          outMs: -1,
          inMs: 10,
          color: 'black',
          evidenceId: 'evidence.1',
        },
      },
    ]
    expectExactError(
      () => checkCommands(badSource, 'commands'),
      'commands[0].transition: source 需要合法时序和 evidenceId',
    )
    const badWipe = [{ kind: 'loadScene', scene: 's', transition: { kind: 'wipe' } }]
    expectExactError(
      () => checkCommands(badWipe, 'commands'),
      'commands[0].transition.kind: 未知过渡类型',
    )
  })

  test.each([
    [
      'holdScreen color',
      [{ kind: 'holdScreen', color: 'red', token: 't' }],
      'commands[0].color: 只支持 black',
    ],
    [
      'revealScreen token',
      [{ kind: 'revealScreen', token: 2 }],
      'commands[0].token: 期望非空 token',
    ],
    ['playMusic asset', [{ kind: 'playMusic', asset: '' }], 'commands[0].asset: 期望非空 AssetId'],
    [
      'playEntityAction entity',
      [{ kind: 'playEntityAction', entity: '', sprite: 'sp', action: 'a' }],
      'commands[0].entity: 期望非空 id',
    ],
    [
      'playEntityAction wait',
      [
        {
          kind: 'playEntityAction',
          entity: 'e',
          sprite: 'sp',
          action: 'a',
          loop: false,
          wait: 'yes',
        },
      ],
      'commands[0].wait: 期望 boolean',
    ],
    [
      'stopEntityAction entity',
      [{ kind: 'stopEntityAction', entity: '', reset: true }],
      'commands[0].entity: 期望非空实体 id',
    ],
    ['playVideo asset', [{ kind: 'playVideo', asset: '' }], 'commands[0].asset: 期望非空 AssetId'],
    [
      'setActorAppearance battleSprite',
      [{ kind: 'setActorAppearance', actor: 'a', battleSprite: '' }],
      'commands[0].battleSprite: 期望非空 BattleSpriteDef.id',
    ],
    [
      'setFollowers sprites',
      [{ kind: 'setFollowers', sprites: 'x' }],
      'commands[0].sprites: 期望 SpriteDef.id 数组',
    ],
    [
      'quitToTitle videos',
      [{ kind: 'quitToTitle', videos: 'x' }],
      'commands[0].videos: 期望 AssetId 数组',
    ],
    [
      'playFrameAnimation 帧序',
      [{ kind: 'playFrameAnimation', asset: 'a', startFrame: 9, endFrame: 2 }],
      'commands[0]: startFrame 不能大于 endFrame',
    ],
    [
      'playFrameAnimation frameRate',
      [{ kind: 'playFrameAnimation', asset: 'a', frameRate: 0 }],
      'commands[0].frameRate: 期望正有限数',
    ],
    ['stopMusic 带参数', [{ kind: 'stopMusic', asset: 'x' }], 'commands[0]: stopMusic 不接受参数'],
  ] as const)('%s拒绝且实际输入不变', (_label, bad, error) => {
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), wait())
    const before = deepSnapshot(bad)
    expectExactError(() => checkCommands(bad, 'commands'), error)
    expect(bad).toEqual(before)
  })

  test('startBattle.onFlee / teleportOut.onFail / confirm.onNo 递归臂拒绝并定位嵌套叶', () => {
    const control = [
      { kind: 'startBattle', enemyTeamId: 'team', onFlee: [{ kind: 'wait', ms: 1 }] },
      { kind: 'teleportOut', pos: { col: 1, row: 1, height: 0 }, onFail: [] },
      { kind: 'confirm', onNo: [] },
    ]
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), control)
    const badFlee = [
      { kind: 'startBattle', enemyTeamId: 'team', onFlee: [{ kind: 'playMusic', asset: '' }] },
    ]
    const fleeBefore = deepSnapshot(badFlee)
    expectExactError(
      () => checkCommands(badFlee, 'commands'),
      'commands[0].onFlee[0].asset: 期望非空 AssetId',
    )
    expect(badFlee).toEqual(fleeBefore)
    const badFail = [
      {
        kind: 'teleportOut',
        pos: { col: 1, row: 1, height: 0 },
        onFail: [{ kind: 'playMusic', asset: '' }],
      },
    ]
    expectExactError(
      () => checkCommands(badFail, 'commands'),
      'commands[0].onFail[0].asset: 期望非空 AssetId',
    )
    const badNo = [{ kind: 'confirm', onNo: [{}] }]
    expectExactError(() => checkCommands(badNo, 'commands'), 'commands[0].onNo[0]: 缺 kind')
  })

  test('四个投影辅助函数的现行合同', () => {
    expect(emptyProjectedWorldScriptState()).toEqual({
      flags: {},
      vars: {},
      entityState: {},
      entityStage: {},
    })
    expect(sceneEntryPrepareSafety({ kind: 'wait', ms: 1 })).toBe('safe')
    const stages = [
      { id: 'a', body: [] },
      { id: 'b', body: [] },
    ]
    const emptyWorld = { flags: {}, vars: {}, entityState: {}, entityStage: {} }
    expect(stageIndexFor(emptyWorld, 'k', stages)).toBe(0)
    const overflowWorld = { flags: {}, vars: {}, entityState: {}, entityStage: { k: 5 } }
    expect(stageIndexFor(overflowWorld, 'k', stages)).toBe(1)
    const advancing = { flags: {}, vars: {}, entityState: {}, entityStage: { k: 0 } }
    applyStageNext(advancing, 'k', 0, 'advance')
    expect(advancing.entityStage.k).toBe(1)
    applyStageNext(advancing, 'k', 0, 3)
    expect(advancing.entityStage.k).toBe(3)
    const stopping = { flags: {}, vars: {}, entityState: {}, entityStage: { k: 2 } }
    applyStageNext(stopping, 'k', 2, undefined)
    expect(stopping.entityStage.k).toBe(2)
  })
})

describe('G4 checkStages / checkEntityPages 残差', () => {
  test('checkStages 数组门与 next 叶拒绝、合法正控', () => {
    expectAcceptsUnchanged((value) => checkStages(value, 'stages'), [{ body: [] }])
    expectExactError(() => checkStages([], 'stages'), 'stages: 期望非空 ScriptStage[]')
    expectExactError(() => checkStages(42, 'stages'), 'stages: 期望非空 ScriptStage[]')
    const badNext = [{ body: [], next: 'gone' }]
    const before = deepSnapshot(badNext)
    expectExactError(() => checkStages(badNext, 'stages'), "stages[0].next: 期望 'advance'|number")
    expect(badNext).toEqual(before)
  })

  test('checkStages scene entry 的 prepare/reveal 叶拒绝', () => {
    const control = [
      {
        body: [],
        entry: { prepare: [], reveal: { kind: 'dither', ms: 0, source: 'previousPresentedFrame' } },
      },
    ]
    expectAcceptsUnchanged(
      (value) => checkStages(value, 'stages', { allowSceneEntry: true }),
      control,
    )
    const badPrepare = [
      {
        body: [],
        entry: {
          prepare: [{ kind: 'dialog', cue: { rows: [{ text: 't' }] } }],
          reveal: { kind: 'fade' },
        },
      },
    ]
    const prepareBefore = deepSnapshot(badPrepare)
    expectExactError(
      () => checkStages(badPrepare, 'stages', { allowSceneEntry: true }),
      'stages[0].entry.prepare[0]: 命令 dialog 不允许在隐藏目标画面时执行',
    )
    expect(badPrepare).toEqual(prepareBefore)
    const badFade = [
      { body: [], entry: { prepare: [], reveal: { kind: 'fade', outMs: -1, inMs: 1 } } },
    ]
    expectExactError(
      () => checkStages(badFade, 'stages', { allowSceneEntry: true }),
      'stages[0].entry.reveal.outMs: 期望非负有限数',
    )
    const badWipe = [{ body: [], entry: { prepare: [], reveal: { kind: 'wipe' } } }]
    expectExactError(
      () => checkStages(badWipe, 'stages', { allowSceneEntry: true }),
      'stages[0].entry.reveal.kind: 期望 dither|fade|cut',
    )
  })

  test('checkEntityPages animation/trigger 叶拒绝与正控', () => {
    expectAcceptsUnchanged((value) => checkEntityPages(value, 'pages'), [{}])
    expectExactError(() => checkEntityPages(42, 'pages'), 'pages: 期望 EntityPage[]')
    const badAnimation = [{ animation: { sprite: '', action: 'a', loop: true } }]
    const animationBefore = deepSnapshot(badAnimation)
    expectExactError(
      () => checkEntityPages(badAnimation, 'pages'),
      'pages[0].animation.sprite: 期望非空 id',
    )
    expect(badAnimation).toEqual(animationBefore)
    const badLoop = [{ animation: { sprite: 's', action: 'a', loop: 1 } }]
    expectExactError(
      () => checkEntityPages(badLoop, 'pages'),
      'pages[0].animation.loop: 期望 boolean',
    )
    const badStart = [{ animation: { sprite: 's', action: 'a', loop: true, startAtMs: -1 } }]
    expectExactError(
      () => checkEntityPages(badStart, 'pages'),
      'pages[0].animation.startAtMs: 期望非负有限数',
    )
    const badTrigger = [{ trigger: { on: 'near', stages: [{ body: [] }] } }]
    const triggerBefore = deepSnapshot(badTrigger)
    expectExactError(
      () => checkEntityPages(badTrigger, 'pages'),
      'pages[0].trigger.on: 期望 interact|touch',
    )
    expect(badTrigger).toEqual(triggerBefore)
  })
})
