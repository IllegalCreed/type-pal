import { describe, expect, test } from 'vitest'
import {
  expectAcceptsUnchanged,
  expectExactError,
  expectRejectUnchanged,
} from './__tests__/validation-assertions.js'
import { deepSnapshot } from './__tests__/value-snapshot.js'
import {
  type Command,
  checkCommands,
  checkEntityPages,
  checkStages,
  type EntityPage,
} from './script.js'

const wait = () => [{ kind: 'wait', ms: 40 }]

describe('投影脚本的命令形状', () => {
  test('数组与 kind 门拒绝', () => {
    expectAcceptsUnchanged((value) => checkCommands(value, 'commands'), wait())
    expectExactError(() => checkCommands(42, 'commands'), 'commands: 期望 Command[]')
    const noKind = [{}]
    const before = deepSnapshot(noKind)
    expectExactError(() => checkCommands(noKind, 'commands'), 'commands[0]: 缺 kind')
    expect(noKind).toEqual(before)
  })

  test('对白只接受 cue 及有效行、自动关闭时间与头像', () => {
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
    const noTextBefore = deepSnapshot(noText)
    expectExactError(() => checkCommands(noText, 'commands'), 'commands[0].cue.rows[0]: 缺 text')
    const badSpeed = [{ kind: 'dialog', cue: { rows: [{ text: 't', speed: -1 }] } }]
    const badSpeedBefore = deepSnapshot(badSpeed)
    expectExactError(
      () => checkCommands(badSpeed, 'commands'),
      'commands[0].cue.rows[0].speed: 期望非负有限数',
    )
    expect(noText).toEqual(noTextBefore)
    expect(badSpeed).toEqual(badSpeedBefore)
    const badAdvance = [{ kind: 'dialog', cue: { rows: [{ text: 't' }], autoAdvance: -1 } }]
    const badAdvanceBefore = deepSnapshot(badAdvance)
    expectExactError(
      () => checkCommands(badAdvance, 'commands'),
      'commands[0].cue.autoAdvance: 期望非负有限数',
    )
    expect(badAdvance).toEqual(badAdvanceBefore)
    const badPortrait = [
      { kind: 'dialog', cue: { rows: [{ text: 't' }], portrait: { asset: '', side: 'left' } } },
    ]
    const badPortraitBefore = deepSnapshot(badPortrait)
    expectExactError(
      () => checkCommands(badPortrait, 'commands'),
      'commands[0].cue.portrait.asset: 期望非空 AssetId',
    )
    expect(badPortrait).toEqual(badPortraitBefore)
    const badSide = [
      {
        kind: 'dialog',
        cue: { rows: [{ text: 't' }], portrait: { asset: 'p.a', side: 'center' } },
      },
    ]
    const badSideBefore = deepSnapshot(badSide)
    expectExactError(
      () => checkCommands(badSide, 'commands'),
      'commands[0].cue.portrait.side: 期望 left/right',
    )
    expect(badSide).toEqual(badSideBefore)
  })

  test('换场命令验证目标、坐标、朝向和来源过渡', () => {
    const control: Command[] = [
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
    expectRejectUnchanged(
      (value) => checkCommands(value, 'commands'),
      emptyScene,
      'commands[0].scene: 期望非空场景 id',
    )
    const badFacing = [
      { kind: 'loadScene', scene: 's', pos: { col: 1, row: 1, height: 0 }, facing: 'north' },
    ]
    const badFacingBefore = deepSnapshot(badFacing)
    expectExactError(
      () => checkCommands(badFacing, 'commands'),
      'commands[0].facing: 期望 up/down/left/right',
    )
    expect(badFacing).toEqual(badFacingBefore)
    const badPos = [{ kind: 'loadScene', scene: 's', pos: { col: Number.NaN, row: 1, height: 0 } }]
    const badPosBefore = deepSnapshot(badPos)
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
    const badSourceBefore = deepSnapshot(badSource)
    expectExactError(
      () => checkCommands(badSource, 'commands'),
      'commands[0].transition: source 需要合法时序和 evidenceId',
    )
    expect(badPos).toEqual(badPosBefore)
    expect(badSource).toEqual(badSourceBefore)
    const badWipe = [{ kind: 'loadScene', scene: 's', transition: { kind: 'wipe' } }]
    const badWipeBefore = deepSnapshot(badWipe)
    expectExactError(
      () => checkCommands(badWipe, 'commands'),
      'commands[0].transition.kind: 未知过渡类型',
    )
    expect(badWipe).toEqual(badWipeBefore)
  })

  const hold: Command = { kind: 'holdScreen', color: 'black', token: 'scene-entry' }
  const reveal: Command = { kind: 'revealScreen', token: 'scene-entry' }
  const music: Command = { kind: 'playMusic', asset: 'music.pal.031' }
  const playAction: Command = {
    kind: 'playEntityAction',
    entity: 'guard',
    sprite: 'guard-sprite',
    action: 'look',
    loop: false,
    wait: true,
  }
  const stopAction: Command = { kind: 'stopEntityAction', entity: 'guard', reset: true }
  const video: Command = { kind: 'playVideo', asset: 'video.pal.logo' }
  const appearance: Command = {
    kind: 'setActorAppearance',
    actor: 'hero',
    battleSprite: 'hero-ready',
  }
  const followers: Command = { kind: 'setFollowers', sprites: ['guide'] }
  const ending: Command = { kind: 'quitToTitle', videos: ['video.pal.ending'] }
  const animation: Command = {
    kind: 'playFrameAnimation',
    asset: 'animation.pal.opening',
    startFrame: 1,
    endFrame: 2,
    frameRate: 12,
  }
  const stopMusic: Command = { kind: 'stopMusic' }

  test.each([
    ['holdScreen color', hold, { ...hold, color: 'red' }, 'commands[0].color: 只支持 black'],
    ['revealScreen token', reveal, { ...reveal, token: 2 }, 'commands[0].token: 期望非空 token'],
    ['playMusic asset', music, { ...music, asset: '' }, 'commands[0].asset: 期望非空 AssetId'],
    [
      'playEntityAction entity',
      playAction,
      { ...playAction, entity: '' },
      'commands[0].entity: 期望非空 id',
    ],
    [
      'playEntityAction wait',
      playAction,
      { ...playAction, wait: 'yes' },
      'commands[0].wait: 期望 boolean',
    ],
    [
      'stopEntityAction entity',
      stopAction,
      { ...stopAction, entity: '' },
      'commands[0].entity: 期望非空实体 id',
    ],
    ['playVideo asset', video, { ...video, asset: '' }, 'commands[0].asset: 期望非空 AssetId'],
    [
      'setActorAppearance battleSprite',
      appearance,
      { ...appearance, battleSprite: '' },
      'commands[0].battleSprite: 期望非空 BattleSpriteDef.id',
    ],
    [
      'setFollowers sprites',
      followers,
      { ...followers, sprites: 'guide' },
      'commands[0].sprites: 期望 SpriteDef.id 数组',
    ],
    [
      'quitToTitle videos',
      ending,
      { ...ending, videos: 'video.pal.ending' },
      'commands[0].videos: 期望 AssetId 数组',
    ],
    [
      'playFrameAnimation 帧序',
      animation,
      { ...animation, startFrame: 9 },
      'commands[0]: startFrame 不能大于 endFrame',
    ],
    [
      'playFrameAnimation frameRate',
      animation,
      { ...animation, frameRate: 0 },
      'commands[0].frameRate: 期望正有限数',
    ],
    [
      'stopMusic 带参数',
      stopMusic,
      { ...stopMusic, asset: 'music.pal.031' },
      'commands[0]: stopMusic 不接受参数',
    ],
  ] satisfies [
    string,
    Command,
    unknown,
    string,
  ][])('%s拒绝且实际输入不变', (_label, good, bad, error) => {
    const validate = (value: unknown) => checkCommands(value, 'commands')
    expectAcceptsUnchanged(validate, [good])
    expectRejectUnchanged(validate, [bad], error)
  })

  test('startBattle.onFlee / teleportOut.onFail / confirm.onNo 递归臂拒绝并定位嵌套叶', () => {
    const control: Command[] = [
      { kind: 'startBattle', enemyTeamId: 'team', onFlee: [{ kind: 'wait', ms: 1 }] },
      { kind: 'teleportOut', onFail: [] },
      { kind: 'confirm', onYes: [], onNo: [] },
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
        onFail: [{ kind: 'playMusic', asset: '' }],
      },
    ]
    const badFailBefore = deepSnapshot(badFail)
    expectExactError(
      () => checkCommands(badFail, 'commands'),
      'commands[0].onFail[0].asset: 期望非空 AssetId',
    )
    expect(badFail).toEqual(badFailBefore)
    const badNo = [{ kind: 'confirm', onYes: [], onNo: [{}] }]
    const badNoBefore = deepSnapshot(badNo)
    expectExactError(() => checkCommands(badNo, 'commands'), 'commands[0].onNo[0]: 缺 kind')
    expect(badNo).toEqual(badNoBefore)
  })
})

describe('投影脚本的阶段和实体页', () => {
  test('阶段列表不能是空或非数组，next 必须声明有效去向', () => {
    expectAcceptsUnchanged((value) => checkStages(value, 'stages'), [{ body: [] }])
    const emptyStages: unknown[] = []
    const emptyBefore = deepSnapshot(emptyStages)
    expectExactError(() => checkStages(emptyStages, 'stages'), 'stages: 期望非空 ScriptStage[]')
    expect(emptyStages).toEqual(emptyBefore)
    expectExactError(() => checkStages(42, 'stages'), 'stages: 期望非空 ScriptStage[]')
    const badNext = [{ body: [], next: 'gone' }]
    const before = deepSnapshot(badNext)
    expectExactError(() => checkStages(badNext, 'stages'), "stages[0].next: 期望 'advance'|number")
    expect(badNext).toEqual(before)
  })

  test('实体页区分默认动作和触发器的字段错误', () => {
    const page: EntityPage = {
      animation: { sprite: 'guard-sprite', action: 'idle', loop: true, startAtMs: 0 },
      trigger: { on: 'interact', stages: [{ body: [{ kind: 'wait', ms: 40 }] }] },
    }
    expectAcceptsUnchanged((value) => checkEntityPages(value, 'pages'), [page])
    expectExactError(() => checkEntityPages(42, 'pages'), 'pages: 期望 EntityPage[]')
    const badAnimation = [{ animation: { sprite: '', action: 'a', loop: true } }]
    const animationBefore = deepSnapshot(badAnimation)
    expectExactError(
      () => checkEntityPages(badAnimation, 'pages'),
      'pages[0].animation.sprite: 期望非空 id',
    )
    expect(badAnimation).toEqual(animationBefore)
    const badLoop = [{ animation: { sprite: 's', action: 'a', loop: 1 } }]
    const badLoopBefore = deepSnapshot(badLoop)
    expectExactError(
      () => checkEntityPages(badLoop, 'pages'),
      'pages[0].animation.loop: 期望 boolean',
    )
    expect(badLoop).toEqual(badLoopBefore)
    const badStart = [{ animation: { sprite: 's', action: 'a', loop: true, startAtMs: -1 } }]
    const badStartBefore = deepSnapshot(badStart)
    expectExactError(
      () => checkEntityPages(badStart, 'pages'),
      'pages[0].animation.startAtMs: 期望非负有限数',
    )
    expect(badStart).toEqual(badStartBefore)
    const badTrigger = [{ trigger: { on: 'near', stages: [{ body: [] }] } }]
    const triggerBefore = deepSnapshot(badTrigger)
    expectExactError(
      () => checkEntityPages(badTrigger, 'pages'),
      'pages[0].trigger.on: 期望 interact|touch',
    )
    expect(badTrigger).toEqual(triggerBefore)
  })
})
