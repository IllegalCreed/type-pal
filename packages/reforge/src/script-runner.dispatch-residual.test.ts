import type { Command } from '@type-pal/content'
import { emptyProjectedWorldScriptState } from '@type-pal/content'
import { describe, expect, test, vi } from 'vitest'
import { type ScriptHost, ScriptRunner } from './script-runner.js'

/** 完整宿主能力集合；目标是运行真实命令分发与世界投影，不替换 ScriptRunner 核心。 */
function host(): ScriptHost {
  const done = async () => undefined
  const noop = () => undefined
  return {
    dialog: done,
    clearDialog: noop,
    fade: done,
    ditherScreen: done,
    chaseStep: done,
    vanishEntity: noop,
    loadLastSave: done,
    gameOver: done,
    wait: done,
    teleportParty: noop,
    loadScene: done,
    setPartyFacing: noop,
    setActorSprite: done,
    fleeBattle: noop,
    setEntityState: noop,
    setEntityFacing: noop,
    faceEntityToParty: noop,
    setEntityFrame: noop,
    playEntityAction: done,
    stopEntityAction: noop,
    giveItem: noop,
    loseItem: noop,
    giveMoney: noop,
    playSound: noop,
    playMusic: noop,
    stopMusic: noop,
    setAmbience: noop,
    takeEntity: noop,
    releaseEntity: noop,
    mountParty: noop,
    unmountParty: noop,
    ride: done,
    setParty: done,
    applyActorCondition: done,
    clearActorCondition: done,
    setFollowers: done,
    moveEntity: done,
    stepEntity: noop,
    animEntity: noop,
    nudgeEntity: noop,
    moveParty: done,
    nudgeParty: noop,
    cameraPan: done,
    cameraSnap: noop,
    setEntityAuto: noop,
    setEntityTrigger: noop,
    setEntityTriggerMode: noop,
    startBattle: async () => 'victory',
    teleportOut: async () => false,
    playVideo: done,
    playFrameAnimation: done,
    clearFrameAnimation: () => undefined,
    openShop: done,
    confirm: async () => true,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      money: () => 0,
      inParty: () => false,
      allFullHp: () => false,
      itemEquipped: () => false,
      entityInScene: () => false,
      entitiesNear: () => false,
      facingEntity: () => false,
      sceneId: () => 's001',
    },
    report: noop,
  }
}

function runner(overrides: Partial<ScriptHost> = {}) {
  const world = emptyProjectedWorldScriptState()
  const api = { ...host(), ...overrides }
  return { world, api, instance: new ScriptRunner(api, world, new AbortController().signal) }
}

describe('当前编辑器预览 ScriptRunner 命令分发剩余合同', () => {
  test('批量状态仅通知宿主一次；绝对定位、图层和屏波只改各自世界键', async () => {
    const setEntityState = vi.fn()
    const setEntityPos = vi.fn()
    const setEntityPosRelParty = vi.fn()
    const { world, instance } = runner({ setEntityState, setEntityPos, setEntityPosRelParty })
    const body: Command[] = [
      { kind: 'setMultiEntityState', entities: ['a', 'b'], state: 2 },
      { kind: 'setMultiEntityState', entities: [], state: 0 },
      { kind: 'setEntityPos', entity: 'a', pos: { col: 7, row: 4, height: 0 } },
      { kind: 'setEntityPosRelParty', entity: 'b', dcol: -1, drow: 2 },
      { kind: 'setEntityLayer', entity: 'b', layer: -2 },
      { kind: 'setScreenWave', level: 5, progression: -1 },
    ]
    const before = structuredClone(body)
    await instance.run(body)
    expect(world.entityState).toEqual({ a: 2, b: 2 })
    expect(setEntityState).toHaveBeenCalledExactlyOnceWith('a', 2)
    expect(world.entityPos).toEqual({ a: { col: 7, row: 4, height: 0 } })
    expect(setEntityPos).toHaveBeenCalledExactlyOnceWith('a', { col: 7, row: 4, height: 0 })
    expect(setEntityPosRelParty).toHaveBeenCalledExactlyOnceWith('b', -1, 2)
    expect(world.entityLayer).toEqual({ b: -2 })
    expect(world.vars).toMatchObject({ 'sys:screenWave': 5, 'sys:waveProgression': -1 })
    expect(body).toEqual(before)
  })

  test('可选 clean 宿主能力各收自己的实参，不把 HP/MP、复活、仙术或装备槽串源', async () => {
    const shakeScreen = vi.fn()
    const increaseHpMp = vi.fn()
    const revivePartyAll = vi.fn()
    const learnSkill = vi.fn()
    const unequipRole = vi.fn()
    const toggleDayNight = vi.fn()
    const { instance } = runner({
      shakeScreen,
      increaseHpMp,
      revivePartyAll,
      learnSkill,
      unequipRole,
      toggleDayNight,
    })
    await instance.run([
      { kind: 'shakeScreen', frames: 8, level: 3 },
      { kind: 'increaseHpMp', delta: -7, pools: 'hp' },
      { kind: 'increaseHpMp', delta: 4 },
      { kind: 'revivePartyAll', tenths: 6 },
      { kind: 'learnSkill', role: 2, skill: 'spell.wind' },
      { kind: 'unequip', role: 2, slot: 'all' },
      { kind: 'toggleDayNight', ms: 800 },
    ])
    expect(shakeScreen).toHaveBeenCalledExactlyOnceWith(8, 3)
    expect(increaseHpMp.mock.calls).toEqual([
      [-7, 'hp'],
      [4, 'both'],
    ])
    expect(revivePartyAll).toHaveBeenCalledExactlyOnceWith(6)
    expect(learnSkill).toHaveBeenCalledExactlyOnceWith(2, 'spell.wind')
    expect(unequipRole).toHaveBeenCalledExactlyOnceWith(2, 'all')
    expect(toggleDayNight).toHaveBeenCalledExactlyOnceWith(800)
  })

  test('追逐和暂离默认绑定当前 self，显式实体与参数不受前条命令污染', async () => {
    const chaseStep = vi.fn(async () => undefined)
    const vanishEntity = vi.fn()
    const { instance } = runner({ chaseStep, vanishEntity })
    instance.selfId = 'npc.self'
    await instance.run([
      { kind: 'chasePlayer' },
      { kind: 'vanishEntity' },
      { kind: 'chasePlayer', range: 2, speed: 8, floating: true },
      { kind: 'vanishEntity', entity: 'npc.other', seconds: 5 },
    ])
    expect(chaseStep.mock.calls.map((call) => call.slice(0, 4))).toEqual([
      ['npc.self', 8, 4, false],
      ['npc.self', 2, 8, true],
    ])
    expect(vanishEntity.mock.calls).toEqual([
      ['npc.self', 2],
      ['npc.other', 5],
    ])
  })

  test('角色三维形象只转交声明过的 patch；不支持该能力时不伪写世界状态', async () => {
    const setActorAppearance = vi.fn(async () => undefined)
    const { world, instance } = runner({ setActorAppearance })
    const before = structuredClone(world)
    await instance.run([
      { kind: 'setActorAppearance', actor: 'hero', portrait: 'portrait.adult' },
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        spriteId: 'sprite.adult',
        battleSprite: 'battle.adult',
      },
    ])
    expect(setActorAppearance.mock.calls.map((call) => call.slice(0, 2))).toEqual([
      ['hero', { portrait: 'portrait.adult' }],
      ['hero', { spriteId: 'sprite.adult', battleSprite: 'battle.adult' }],
    ])
    expect(world).toEqual(before)

    const withoutCapability = runner()
    await withoutCapability.instance.run([
      { kind: 'setActorAppearance', actor: 'hero', portrait: 'portrait.adult' },
    ])
    expect(withoutCapability.world).toEqual(emptyProjectedWorldScriptState())
  })

  test('半钱按执行时余额取整，商店 Promise 未完成前不得执行下一条世界命令', async () => {
    let release!: () => void
    const pending = new Promise<void>((resolve) => {
      release = resolve
    })
    const giveMoney = vi.fn()
    const openShop = vi.fn(() => pending)
    const query = { ...host().query, money: vi.fn(() => 51) }
    const { instance, world } = runner({ giveMoney, openShop, query })
    const active = instance.run([
      { kind: 'halveMoney' },
      { kind: 'openShop', shop: 2, mode: 'buy' },
      { kind: 'setFlag', flag: 'shop.closed', value: true },
    ])
    await vi.waitFor(() => expect(openShop).toHaveBeenCalledTimes(1))
    expect(giveMoney).toHaveBeenCalledExactlyOnceWith(-26)
    expect(query.money).toHaveBeenCalledTimes(1)
    expect(openShop.mock.calls[0]?.slice(0, 2)).toEqual([2, 'buy'])
    expect(world.flags['shop.closed']).toBeUndefined()
    release()
    await active
    expect(world.flags['shop.closed']).toBe(true)
  })

  test('战斗主动逃跑只走 onFlee 臂，不落穿 onLose 或战斗后的错误分支', async () => {
    const startBattle = vi.fn(async () => 'playerFled' as const)
    const { instance, world } = runner({ startBattle })
    await instance.run([
      {
        kind: 'startBattle',
        enemyTeamId: 'team.slime',
        onFlee: [{ kind: 'setFlag', flag: 'battle.fled', value: true }],
        onLose: [{ kind: 'setFlag', flag: 'battle.lost', value: true }],
      },
    ])
    expect(startBattle).toHaveBeenCalledTimes(1)
    expect(startBattle).toHaveBeenCalledWith(
      'team.slime',
      expect.any(Object),
      expect.any(AbortSignal),
    )
    expect(world.flags).toEqual({ 'battle.fled': true })
  })

  test('当前场景缺席不落地图覆写；有场景但无重载能力时只写当前场景键', async () => {
    const sceneId = vi.fn(() => '')
    const query = { ...host().query, sceneId }
    const { world, instance } = runner({ query })
    await instance.run([{ kind: 'setSceneMapOverride', mapId: 'map.new' }])
    expect(world.mapOverride).toBeUndefined()
    sceneId.mockReturnValue('scene.active')
    await instance.run([{ kind: 'setSceneMapOverride', mapId: 'map.new' }])
    expect(world.mapOverride).toEqual({ 'scene.active': 'map.new' })
    await instance.run([{ kind: 'setSceneMapOverride', scene: 'scene.other', mapId: 'map.other' }])
    expect(world.mapOverride).toEqual({
      'scene.active': 'map.new',
      'scene.other': 'map.other',
    })
  })

  test('黑屏配对命令在缺少对应宿主能力时 fail-loud，未偷跑后续世界命令', async () => {
    const noHold = runner()
    await expect(
      noHold.instance.run([
        { kind: 'holdScreen', color: 'black', token: 'scene-night' },
        { kind: 'setFlag', flag: 'afterHold', value: true },
      ]),
    ).rejects.toThrow('ScriptRunner: 宿主未实现 holdScreen')
    expect(noHold.world.flags).toEqual({})

    const noReveal = runner()
    await expect(
      noReveal.instance.run([
        { kind: 'revealScreen', token: 'scene-night' },
        { kind: 'setFlag', flag: 'afterReveal', value: true },
      ]),
    ).rejects.toThrow('ScriptRunner: 宿主未实现 revealScreen')
    expect(noReveal.world.flags).toEqual({})
  })
})
