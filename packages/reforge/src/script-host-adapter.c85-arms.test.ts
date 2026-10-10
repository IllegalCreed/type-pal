// TEST-COVERAGE85-GLM-REFORGE-1 — script-host-adapter.ts 残留分支臂合同测试。
// 公开入口 executeScriptHostEffect;命令经公开 compileRuntimeCommands 守卫编译;
// 宿主为记录替身(公开 ScriptHost 扩展点),跨场景 EntityAddress 过滤臂逐命令区分。
import type { BaseAuthorCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import type { BaseRuntimeLeafCommand } from './script-compiler-core.js'
import { compileBaseCommands } from './script-compiler-core.js'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'
import type { ScriptRuntimeContext } from './script-runner-core.js'

interface Call {
  method: string
  args: unknown[]
}

function recorderHost(overrides: Partial<ScriptHost> = {}): { host: ScriptHost; calls: Call[] } {
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
  const host: ScriptHost = {
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
    faceEntityToParty: record('faceEntityToParty'),
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
    chaseStep: recordAsync('chaseStep'),
    vanishEntity: record('vanishEntity'),
    loadLastSave: recordAsync('loadLastSave'),
    gameOver: recordAsync('gameOver'),
    report: record('report'),
    shakeScreen: record('shakeScreen'),
    toggleDayNight: record('toggleDayNight'),
    increaseHpMp: record('increaseHpMp'),
    revivePartyAll: record('revivePartyAll'),
    learnSkill: record('learnSkill'),
    unequipRole: record('unequipRole'),
    setEntityPos: record('setEntityPos'),
    setEntityPosRelParty: record('setEntityPosRelParty'),
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
    },
    ...overrides,
  }
  return { host, calls }
}

function expectLeaf(leaves: BaseRuntimeLeafCommand[]): BaseRuntimeLeafCommand {
  const leaf = leaves[0]
  if (!leaf) throw new Error('leaf missing')
  return leaf
}

const context: Readonly<ScriptRuntimeContext> = {
  self: { scene: 's1', entity: 'self-e' },
  timing: 'interactive',
}

const options = { currentSceneId: () => 's1' }

function leavesOf(commands: readonly BaseAuthorCommand[]): BaseRuntimeLeafCommand[] {
  const compiled = compileBaseCommands(commands, 'interactive')
  const leaves: BaseRuntimeLeafCommand[] = []
  for (const item of compiled) {
    if (item.kind === 'leaf') leaves.push(item.command)
  }
  return leaves
}

async function dispatch(
  host: ScriptHost,
  commands: readonly BaseAuthorCommand[],
  signal = new AbortController().signal,
): Promise<void> {
  for (const leaf of leavesOf(commands))
    await executeScriptHostEffect(host, leaf, context, signal, options)
}

const other = (entity: string) => ({ scene: 'other', entity })
const here = (entity: string) => ({ scene: 's1', entity })

test('在场地址臂:setEntityPos/setEntityPosRelParty/setEntityFrame 逐参派发到宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'setEntityPos', target: here('e1'), pos: { col: 2, row: 3, height: 0 } },
    { kind: 'setEntityPosRelParty', target: here('e2'), dcol: -1, drow: 2 },
    { kind: 'setEntityFrame', target: here('e3'), frame: 4 },
  ])
  expect(calls).toEqual([
    { method: 'setEntityPos', args: ['e1', { col: 2, row: 3, height: 0 }] },
    { method: 'setEntityPosRelParty', args: ['e2', -1, 2] },
    { method: 'setEntityFrame', args: ['e3', 4] },
  ])
})

test('跨场景过滤臂:位移/帧/接管/挂载/骑乘类命令的宿主零调用不抛', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'setEntityPos', target: other('e1'), pos: { col: 9, row: 9, height: 0 } },
    { kind: 'setEntityPosRelParty', target: other('e2'), dcol: 0, drow: 0 },
    { kind: 'setEntityFrame', target: other('e3'), frame: 1 },
    {
      kind: 'playEntityAction',
      target: other('e4'),
      sprite: 'walker',
      action: 'spin',
      loop: false,
    },
    { kind: 'stopEntityAction', target: other('e5'), reset: true },
    { kind: 'takeEntity', target: other('e6') },
    { kind: 'releaseEntity', target: other('e7') },
    { kind: 'mountParty', target: other('e8'), dx: 1, dy: 1 },
    {
      kind: 'ride',
      target: other('e9'),
      to: { col: 1, row: 1, height: 0 },
      speed: 'slow',
    },
    { kind: 'stepEntity', target: other('e10'), dir: 'down' },
    { kind: 'animEntity', target: other('e11') },
    { kind: 'nudgeEntity', target: other('e12'), dx: 1, dy: 0 },
    {
      kind: 'moveEntity',
      target: other('e13'),
      to: { col: 0, row: 0, height: 0 },
      speed: 'fast',
    },
  ])
  expect(calls).toEqual([])
})

test('chasePlayer 在场臂:self 解析在场才派发,缺省参数原样透传', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [{ kind: 'chasePlayer' }])
  expect(calls).toEqual([
    { method: 'chaseStep', args: ['self-e', 8, 4, false, expect.any(AbortSignal)] },
  ])
})

test('chasePlayer 跨场景臂:self 不在场时零调用', async () => {
  const { host, calls } = recorderHost()
  const awayContext: Readonly<ScriptRuntimeContext> = {
    self: { scene: 'other', entity: 'self-e' },
    timing: 'interactive',
  }
  const signal = new AbortController().signal
  for (const leaf of leavesOf([{ kind: 'chasePlayer' }]))
    await executeScriptHostEffect(host, leaf, awayContext, signal, options)
  expect(calls).toEqual([])
})

test('演出缺省臂:ditherScreen 缺省 720ms;increaseHpMp 缺省 both', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [{ kind: 'ditherScreen' }, { kind: 'increaseHpMp', delta: 6 }])
  expect(calls).toEqual([
    { method: 'ditherScreen', args: [720, expect.any(AbortSignal)] },
    { method: 'increaseHpMp', args: [6, 'both'] },
  ])
})

test('playEntityAction 相位臂:startAtMs 透传,单次动作缺省阻塞至宿主完成', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    {
      kind: 'playEntityAction',
      target: here('actor-1'),
      sprite: 'walker',
      action: 'wave',
      loop: false,
      startAtMs: 120,
    },
  ])
  expect(calls).toEqual([
    {
      method: 'playEntityAction',
      args: [
        'actor-1',
        { sprite: 'walker', action: 'wave', loop: false, startAtMs: 120 },
        expect.any(AbortSignal),
      ],
    },
  ])
})

test('playEntityAction 后台失败臂:循环动作非 abort 失败经 report 观测不抛', async () => {
  const { host, calls } = recorderHost()
  host.playEntityAction = (entity) => {
    calls.push({ method: 'playEntityAction', args: [entity] })
    return Promise.reject(new Error('动作表缺帧'))
  }
  await dispatch(host, [
    {
      kind: 'playEntityAction',
      target: here('actor-2'),
      sprite: 'walker',
      action: 'spin',
      loop: true,
      wait: false,
    },
  ])
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(calls).toContainEqual({
    method: 'report',
    args: ['playEntityAction(actor-2,walker,spin) 后台播放失败: 动作表缺帧'],
  })
})

test('playEntityAction 后台失败臂:非 Error 拒绝值按 String() 文本观测', async () => {
  const { host, calls } = recorderHost()
  host.playEntityAction = () => Promise.reject('资源缺失')
  await dispatch(host, [
    {
      kind: 'playEntityAction',
      target: here('actor-3'),
      sprite: 'walker',
      action: 'spin',
      loop: true,
      wait: false,
    },
  ])
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(calls).toContainEqual({
    method: 'report',
    args: ['playEntityAction(actor-3,walker,spin) 后台播放失败: 资源缺失'],
  })
})

test('releaseEntity 双臂:无 target 归还全部,target 在场只还该实体', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'releaseEntity' },
    { kind: 'releaseEntity', target: here('e-held') },
  ])
  expect(calls).toEqual([
    { method: 'releaseEntity', args: [] },
    { method: 'releaseEntity', args: ['e-held'] },
  ])
})

test('setSceneMapOverride 提交控制臂:当前场景重载缺同步提交控制时 fail-loud', async () => {
  const { host, calls } = recorderHost()
  await expect(dispatch(host, [{ kind: 'setSceneMapOverride', mapId: 'map-2' }])).rejects.toThrow(
    'setSceneMapOverride 缺同步提交控制',
  )
  expect(calls).toEqual([])
})

test('setSceneMapOverride 提交臂:宿主 reloadMap 收到同拍提交控制并完成重载', async () => {
  const { host, calls } = recorderHost()
  const commits: string[] = []
  const withReload: ScriptHost = {
    ...host,
    reloadMap: async (mapId, _signal, commit) => {
      calls.push({ method: 'reloadMap', args: [mapId] })
      commit?.()
    },
  }
  const control = {
    kind: 'sceneMap' as const,
    commitSceneMapOverride: () => {
      commits.push('map-2@s1')
    },
  }
  const signal = new AbortController().signal
  for (const leaf of leavesOf([{ kind: 'setSceneMapOverride', mapId: 'map-2' }]))
    await executeScriptHostEffect(withReload, leaf, context, signal, {
      currentSceneId: options.currentSceneId,
      commitControl: control,
    })
  expect(calls).toEqual([{ method: 'reloadMap', args: ['map-2'] }])
  expect(commits).toEqual(['map-2@s1'])
})

test('宿主能力缺席臂:holdScreen/revealScreen 未实现时 fail-loud', async () => {
  const base = recorderHost()
  const host: ScriptHost = { ...base.host, holdScreen: undefined, revealScreen: undefined }
  const signal = new AbortController().signal
  await expect(
    executeScriptHostEffect(
      host,
      expectLeaf(leavesOf([{ kind: 'holdScreen', color: 'black', token: 't1' }])),
      context,
      signal,
      options,
    ),
  ).rejects.toThrow('宿主未实现 holdScreen')
  await expect(
    executeScriptHostEffect(
      host,
      expectLeaf(leavesOf([{ kind: 'revealScreen', token: 't1' }])),
      context,
      signal,
      options,
    ),
  ).rejects.toThrow('宿主未实现 revealScreen')
})

test('世界持久类叶零派发臂:状态写入类命令不触碰画面宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'setScreenWave', level: 1, progression: 0 },
    { kind: 'setEntityLayer', target: here('e1'), layer: 3 },
    { kind: 'setFlag', flag: 'f1', value: true },
    { kind: 'setVar', var: 'v1', value: 2 },
    { kind: 'addVar', var: 'v1', delta: 3 },
    { kind: 'setEntityPosRelParty', target: other('e2'), dcol: 0, drow: 0 },
  ])
  expect(calls).toEqual([])
})

test('loadScene 落点臂:三字段全缺席派发空 spawn,缺省无过渡直调宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [{ kind: 'loadScene', scene: 's2' }])
  expect(calls).toEqual([{ method: 'loadScene', args: ['s2', {}, expect.any(AbortSignal)] }])
})

test('setActorAppearance 部分补丁臂:仅改单维度时其余键缺席', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'setActorAppearance', actor: 'lin-yueru', battleSprite: 'fighter-2' },
  ])
  expect(calls).toEqual([
    {
      method: 'setActorAppearance',
      args: ['lin-yueru', { battleSprite: 'fighter-2' }, expect.any(AbortSignal)],
    },
  ])
})

test('setSceneMapOverride 状态宿主臂:无 reloadMap 的宿主直接同拍提交持久 override', async () => {
  const { host, calls } = recorderHost()
  const commits: string[] = []
  const signal = new AbortController().signal
  for (const leaf of leavesOf([{ kind: 'setSceneMapOverride', mapId: 'map-3' }]))
    await executeScriptHostEffect(host, leaf, context, signal, {
      currentSceneId: options.currentSceneId,
      commitControl: {
        kind: 'sceneMap',
        commitSceneMapOverride: () => {
          commits.push('map-3')
        },
      },
    })
  expect(calls).toEqual([])
  expect(commits).toEqual(['map-3'])
})

test('playEntityAction 后台取消臂:runner 取消后的失败不再上报宿主', async () => {
  const { host, calls } = recorderHost()
  const controller = new AbortController()
  let rejectAction: ((error: unknown) => void) | undefined
  host.playEntityAction = () =>
    new Promise<void>((_, reject) => {
      rejectAction = reject
    })
  await dispatch(
    host,
    [
      {
        kind: 'playEntityAction',
        target: here('actor-4'),
        sprite: 'walker',
        action: 'spin',
        loop: true,
        wait: false,
      },
    ],
    controller.signal,
  )
  controller.abort()
  rejectAction?.(new DOMException('script aborted', 'AbortError'))
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 0)
  })
  expect(calls.filter((call) => call.method === 'report')).toEqual([])
})

test('mountParty 在场缺省臂:偏移缺席按 0 派发宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [{ kind: 'mountParty', target: here('boat-1') }])
  expect(calls).toEqual([{ method: 'mountParty', args: ['boat-1', 0, 0] }])
})

test('endBattle 拒绝臂:非战斗演出上下文直接 fail-loud', async () => {
  const { host, calls } = recorderHost()
  await expect(dispatch(host, [{ kind: 'endBattle', result: 'terminate' }])).rejects.toThrow(
    'endBattle 只能用于战斗演出脚本',
  )
  expect(calls).toEqual([])
})

test('loadScene 落点臂:pos+facing 落点与 source 过渡原样透传宿主', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'loadScene', scene: 's2', pos: { col: 1, row: 2, height: 0 }, facing: 'up' },
    {
      kind: 'loadScene',
      scene: 's3',
      transition: { kind: 'source', outMs: 100, inMs: 120, color: 'black', evidenceId: 'ev-1' },
    },
  ])
  expect(calls.map((call) => call.method)).toEqual(['loadScene', 'loadScene'])
  expect(calls[0]?.args[1]).toEqual({
    pos: { col: 1, row: 2, height: 0 },
    facing: 'up',
  })
  expect(calls[1]?.args[3]).toEqual({
    kind: 'source',
    outMs: 100,
    inMs: 120,
    color: 'black',
    evidenceId: 'ev-1',
  })
})

test('setActorAppearance 三维臂:spriteId 与 portrait 维度分别派发', async () => {
  const { host, calls } = recorderHost()
  await dispatch(host, [
    { kind: 'setActorAppearance', actor: 'zhao-linger', spriteId: 'walker-2' },
    { kind: 'setActorAppearance', actor: 'anu', portrait: 'face.anu' },
  ])
  expect(calls.map((call) => call.args[1])).toEqual([
    { spriteId: 'walker-2' },
    { portrait: 'face.anu' },
  ])
})
