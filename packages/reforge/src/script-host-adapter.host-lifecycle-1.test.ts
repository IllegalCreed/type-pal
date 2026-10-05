// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — script-host-adapter.ts 宿主生命周期命令合同。
// 公开入口 executeScriptHostEffect;命令经公开 compileBaseCommands 守卫编译;
// 宿主为记录替身(公开 ScriptHost 扩展点)。重点:从未被派发的生命周期/演出壳 kind、
// vanishEntity 目标三态(显式在场/回落 self/跨场景过滤)。
import type { BaseAuthorCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import { compileBaseCommands } from './script-compiler-core.js'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

interface Call {
  method: string
  args: unknown[]
}

function recorderHost(): { host: ScriptHost; calls: Call[] } {
  const calls: Call[] = []
  const record =
    (method: string) =>
    (...args: unknown[]): void => {
      calls.push({ method, args })
    }
  const recordAsync =
    (method: string) =>
    async (...args: unknown[]): Promise<void> => {
      calls.push({ method, args })
    }
  return {
    calls,
    host: {
      dialog: recordAsync('dialog'),
      clearDialog: record('clearDialog'),
      fade: recordAsync('fade'),
      holdScreen: recordAsync('holdScreen'),
      revealScreen: recordAsync('revealScreen'),
      ditherScreen: recordAsync('ditherScreen'),
      wait: recordAsync('wait'),
      teleportParty: record('teleportParty'),
      loadScene: recordAsync('loadScene'),
      setPartyFacing: record('setPartyFacing'),
      setActorSprite: recordAsync('setActorSprite'),
      setActorAppearance: recordAsync('setActorAppearance'),
      fleeBattle: record('fleeBattle'),
      setEntityState: record('setEntityState'),
      setEntityFacing: record('setEntityFacing'),
      setEntityFrame: record('setEntityFrame'),
      playEntityAction: recordAsync('playEntityAction'),
      stopEntityAction: record('stopEntityAction'),
      giveItem: recordAsync('giveItem'),
      loseItem: record('loseItem'),
      giveMoney: record('giveMoney'),
      playSound: record('playSound'),
      playMusic: record('playMusic'),
      stopMusic: record('stopMusic'),
      setAmbience: record('setAmbience'),
      takeEntity: record('takeEntity'),
      releaseEntity: record('releaseEntity'),
      mountParty: record('mountParty'),
      unmountParty: record('unmountParty'),
      setParty: recordAsync('setParty'),
      applyActorCondition: recordAsync('applyActorCondition'),
      clearActorCondition: recordAsync('clearActorCondition'),
      setFollowers: recordAsync('setFollowers'),
      ride: recordAsync('ride'),
      moveEntity: recordAsync('moveEntity'),
      stepEntity: record('stepEntity'),
      animEntity: record('animEntity'),
      nudgeEntity: record('nudgeEntity'),
      moveParty: recordAsync('moveParty'),
      nudgeParty: record('nudgeParty'),
      startBattle: async (...args: unknown[]) => {
        calls.push({ method: 'startBattle', args })
        return 'victory'
      },
      playVideo: recordAsync('playVideo'),
      playFrameAnimation: recordAsync('playFrameAnimation'),
      clearFrameAnimation: record('clearFrameAnimation'),
      teleportOut: async (...args: unknown[]) => {
        calls.push({ method: 'teleportOut', args })
        return true
      },
      openShop: recordAsync('openShop'),
      confirm: async (...args: unknown[]) => {
        calls.push({ method: 'confirm', args })
        return true
      },
      cameraPan: recordAsync('cameraPan'),
      cameraSnap: record('cameraSnap'),
      setEntityAuto: record('setEntityAuto'),
      setEntityTrigger: record('setEntityTrigger'),
      setEntityTriggerMode: record('setEntityTriggerMode'),
      query: {
        hasItem: () => false,
        ownsItem: () => false,
        money: () => 60,
        inParty: () => false,
        allFullHp: () => true,
        itemEquipped: () => false,
        entityInScene: () => false,
        entitiesNear: () => false,
        facingEntity: () => false,
      },
      report: record('report'),
      chaseStep: recordAsync('chaseStep'),
      vanishEntity: record('vanishEntity'),
      loadLastSave: recordAsync('loadLastSave'),
      gameOver: recordAsync('gameOver'),
      quitToTitle: recordAsync('quitToTitle'),
      shakeScreen: record('shakeScreen'),
      toggleDayNight: record('toggleDayNight'),
      increaseHpMp: record('increaseHpMp'),
      revivePartyAll: record('revivePartyAll'),
      learnSkill: record('learnSkill'),
      setEntityPos: record('setEntityPos'),
      getEntityState: () => 1,
      unequipRole: record('unequipRole'),
    },
  }
}

const sceneNow = 's1'

async function dispatch(
  host: ScriptHost,
  commands: readonly BaseAuthorCommand[],
  context: Readonly<ScriptRuntimeContext> = {},
  signal: AbortSignal = new AbortController().signal,
): Promise<void> {
  const compiled = compileBaseCommands([...commands], 'interactive')
  for (const item of compiled) {
    if (item.kind !== 'leaf') throw new Error(`意外控制命令 ${item.kind}`)
    await executeScriptHostEffect(host, item.command, context, signal, {
      currentSceneId: () => sceneNow,
    })
  }
}

test('生存周期命令:读档/战败/等待/回标题按 signal 与参数派发宿主', async () => {
  const { host, calls } = recorderHost()
  const signal = new AbortController().signal
  await dispatch(
    host,
    [
      { kind: 'loadLastSave' },
      { kind: 'gameOver' },
      { kind: 'wait', ms: 240 },
      { kind: 'quitToTitle', videos: ['video.ending'] },
    ],
    {},
    signal,
  )
  expect(calls).toEqual([
    { method: 'loadLastSave', args: [signal] },
    { method: 'gameOver', args: [signal] },
    { method: 'wait', args: [240, signal] },
    { method: 'quitToTitle', args: [['video.ending'], signal] },
  ])
})

test('全队增益与装备命令:复活/学艺/卸装按角色参数派发宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'revivePartyAll', tenths: 8 },
    { kind: 'learnSkill', role: 1, skill: 'skill.thunder' },
    { kind: 'unequip', role: 2, slot: 'all' },
    { kind: 'unequip', role: 0, slot: 3 },
  ])
  expect(calls).toEqual([
    { method: 'revivePartyAll', args: [8] },
    { method: 'learnSkill', args: [1, 'skill.thunder'] },
    { method: 'unequipRole', args: [2, 'all'] },
    { method: 'unequipRole', args: [0, 3] },
  ])
})

test('runEntityTrigger 直派拒绝:adapter 层 fail-loud,必须由调用桥执行', async () => {
  const { host, calls } = recorderHost()
  await expect(
    dispatch(host, [{ kind: 'runEntityTrigger', target: { scene: 's1', entity: 'e1' } }]),
  ).rejects.toThrow('runEntityTrigger 必须由当前 project runtime 调用桥执行')
  expect(calls).toEqual([])
})

test('队伍与镜头命令:瞬移/朝向/坐骑/镜头/帧动画清屏逐参派发', async () => {
  const { host, calls } = recorderHost()
  const signal = new AbortController().signal
  await dispatch(
    host,
    [
      { kind: 'teleportParty', pos: { col: 3, row: 4, height: 0 }, facing: 'up' },
      { kind: 'setPartyFacing', facing: 'down', gesture: 2, member: 1 },
      { kind: 'fleeBattle' },
      { kind: 'unmountParty' },
      { kind: 'moveParty', to: { col: 5, row: 6, height: 0 }, speed: 'fast' },
      { kind: 'nudgeParty', dx: 1, dy: -1, layer: 2 },
      { kind: 'cameraPan', dx: 4, dy: 0, frames: 9 },
      { kind: 'cameraSnap' },
      { kind: 'clearFrameAnimation' },
    ],
    {},
    signal,
  )
  expect(calls).toEqual([
    {
      method: 'teleportParty',
      args: [{ col: 3, row: 4, height: 0 }, 'up'],
    },
    { method: 'setPartyFacing', args: ['down', 2, 1] },
    { method: 'fleeBattle', args: [] },
    { method: 'unmountParty', args: [] },
    { method: 'moveParty', args: [{ col: 5, row: 6, height: 0 }, 'fast', signal] },
    { method: 'nudgeParty', args: [1, -1, 2] },
    { method: 'cameraPan', args: [4, 0, 9, signal] },
    { method: 'cameraSnap', args: [undefined] },
    { method: 'clearFrameAnimation', args: [] },
  ])
})

test('全队与氛围命令:setParty/setFollowers/toggleDayNight/halveMoney 逐参派发且金额减半按查询余额', async () => {
  const { host, calls } = recorderHost()
  const signal = new AbortController().signal
  await dispatch(
    host,
    [
      { kind: 'setParty', members: ['hero', 'friend'] },
      { kind: 'setFollowers', sprites: ['walker', 'guard'] },
      { kind: 'toggleDayNight', ms: 3200 },
      { kind: 'halveMoney' },
    ],
    {},
    signal,
  )
  expect(calls).toEqual([
    { method: 'setParty', args: [['hero', 'friend'], signal] },
    { method: 'setFollowers', args: [['walker', 'guard'], signal] },
    { method: 'toggleDayNight', args: [3200] },
    // 60 → 30:宿主收到的是扣减量 30(0x8F 金钱减半)。
    { method: 'giveMoney', args: [-30] },
  ])
})

test('vanishEntity 三态:显式在场派发,缺省回落 self,跨场景目标零派发', async () => {
  const self = { scene: 's1', entity: 'self-entity' }
  const crossScene = { scene: 's2', entity: 'far-entity' }
  const explicit = { scene: 's1', entity: 'named-entity' }

  const present = recorderHost()
  await dispatch(present.host, [{ kind: 'vanishEntity', target: explicit, seconds: 5 }], { self })
  expect(present.calls).toEqual([{ method: 'vanishEntity', args: ['named-entity', 5] }])

  const fallback = recorderHost()
  await dispatch(fallback.host, [{ kind: 'vanishEntity' }], { self })
  expect(fallback.calls).toEqual([{ method: 'vanishEntity', args: ['self-entity', 2] }])

  const filtered = recorderHost()
  await dispatch(filtered.host, [{ kind: 'vanishEntity', target: crossScene }], { self })
  expect(filtered.calls).toEqual([])
})
