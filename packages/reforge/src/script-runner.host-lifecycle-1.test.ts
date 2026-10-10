// TEST-GLM-REFORGE-HOST-LIFECYCLE-1 — script-runner.ts 残留命令分发与调用/跳转生命周期合同。
// 公开入口 ScriptRunner.run/runStages;宿主为记录替身(公开 ScriptHost 扩展点);
// 命令体为公开 author Command 值。重点:12 个从未被任何既有测试派发的命令 kind、
// callScript 内 returnScript 边界、jumpScript 取消窗口、setEntityPos 显式 height、
// setSceneOnEnter 既有槽覆写。
import type { ProjectedWorldScriptState, ScriptStage } from '@type-pal/content'
import { emptyProjectedWorldScriptState } from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import type { ScriptResolver } from './script-chunk-store.js'
import type { ScriptHost } from './script-runner.js'
import { ScriptRunner } from './script-runner.js'

function recordHost(): { host: ScriptHost; calls: string[]; signals: Map<string, AbortSignal> } {
  const calls: string[] = []
  const signals = new Map<string, AbortSignal>()
  const visible = (args: unknown[]): unknown[] =>
    typeof AbortSignal === 'undefined' ? args : args.filter((arg) => !(arg instanceof AbortSignal))
  const log =
    (name: string) =>
    (...args: unknown[]) => {
      calls.push(
        `${name}(${visible(args)
          .map((a) => JSON.stringify(a))
          .join(',')})`,
      )
    }
  const alog =
    (name: string) =>
    async (...args: unknown[]) => {
      log(name)(...args)
    }
  const tracked =
    (name: string) =>
    (...args: unknown[]) => {
      const signal = args.find((arg): arg is AbortSignal => arg instanceof AbortSignal)
      if (signal) signals.set(name, signal)
      log(name)(...args)
    }
  const atracked =
    (name: string) =>
    async (...args: unknown[]) => {
      tracked(name)(...args)
    }
  return {
    calls,
    signals,
    host: {
      dialog: alog('dialog'),
      clearDialog: log('clearDialog'),
      fade: alog('fade'),
      holdScreen: alog('holdScreen'),
      revealScreen: alog('revealScreen'),
      ditherScreen: alog('ditherScreen'),
      revealSceneEntry: alog('revealSceneEntry'),
      wait: atracked('wait'),
      teleportParty: log('teleportParty'),
      loadScene: alog('loadScene'),
      setPartyFacing: log('setPartyFacing'),
      setActorSprite: alog('setActorSprite'),
      setActorAppearance: alog('setActorAppearance'),
      fleeBattle: log('fleeBattle'),
      setEntityState: log('setEntityState'),
      setEntityFacing: log('setEntityFacing'),
      faceEntityToParty: log('faceEntityToParty'),
      setEntityFrame: log('setEntityFrame'),
      playEntityAction: alog('playEntityAction'),
      stopEntityAction: log('stopEntityAction'),
      giveItem: log('giveItem'),
      loseItem: log('loseItem'),
      giveMoney: log('giveMoney'),
      playSound: log('playSound'),
      playMusic: log('playMusic'),
      stopMusic: log('stopMusic'),
      setAmbience: log('setAmbience'),
      takeEntity: log('takeEntity'),
      releaseEntity: log('releaseEntity'),
      mountParty: log('mountParty'),
      setParty: async (...args: unknown[]) => log('setParty')(...args),
      applyActorCondition: async (...args: unknown[]) => log('applyActorCondition')(...args),
      clearActorCondition: async (...args: unknown[]) => log('clearActorCondition')(...args),
      setFollowers: alog('setFollowers'),
      unmountParty: log('unmountParty'),
      ride: atracked('ride'),
      moveEntity: atracked('moveEntity'),
      stepEntity: log('stepEntity'),
      animEntity: log('animEntity'),
      nudgeEntity: log('nudgeEntity'),
      moveParty: atracked('moveParty'),
      nudgeParty: log('nudgeParty'),
      startBattle: async (...args: unknown[]) => {
        log('startBattle')(...args)
        return 'victory' as const
      },
      playVideo: alog('playVideo'),
      playFrameAnimation: alog('playFrameAnimation'),
      clearFrameAnimation: log('clearFrameAnimation'),
      teleportOut: async (...args: unknown[]) => {
        log('teleportOut')(...args)
        return true
      },
      openShop: alog('openShop'),
      confirm: async () => true,
      cameraPan: atracked('cameraPan'),
      cameraSnap: log('cameraSnap'),
      setEntityAuto: (id: string, stages: ScriptStage[]) =>
        calls.push(`setEntityAuto(${id},${stages.length})`),
      setEntityTrigger: (id: string, stages: ScriptStage[]) =>
        calls.push(`setEntityTrigger(${id},${stages.length})`),
      setEntityTriggerMode: log('setEntityTriggerMode'),
      query: {
        hasItem: () => false,
        ownsItem: () => false,
        money: () => 50,
        inParty: () => false,
        allFullHp: () => true,
        itemEquipped: () => false,
        entityInScene: () => false,
        entitiesNear: () => false,
        facingEntity: () => false,
      },
      report: log('report'),
      chaseStep: alog('chaseStep'),
      vanishEntity: log('vanishEntity'),
      loadLastSave: atracked('loadLastSave'),
      gameOver: atracked('gameOver'),
      quitToTitle: alog('quitToTitle'),
      shakeScreen: log('shakeScreen'),
      toggleDayNight: log('toggleDayNight'),
      increaseHpMp: log('increaseHpMp'),
      revivePartyAll: log('revivePartyAll'),
      learnSkill: log('learnSkill'),
      setEntityPos: log('setEntityPos'),
      getEntityState: () => 1,
      unequipRole: log('unequipRole'),
    },
  }
}

function runnerOf(
  host: ScriptHost,
  signal: AbortSignal,
  world: ProjectedWorldScriptState = emptyProjectedWorldScriptState(),
  resolver?: ScriptResolver,
): ScriptRunner {
  return new ScriptRunner(host, world, signal, Math.random, resolver)
}

describe('HL1 残留命令分发', () => {
  test('生存周期命令:loadLastSave/gameOver/wait 按各自参数与 runner signal 派发宿主', async () => {
    const { host, calls, signals } = recordHost()
    const ac = new AbortController()
    const runner = runnerOf(host, ac.signal)
    await runner.run([{ kind: 'loadLastSave' }, { kind: 'gameOver' }, { kind: 'wait', ms: 420 }])
    expect(calls).toEqual(['loadLastSave()', 'gameOver()', 'wait(420)'])
    for (const method of ['loadLastSave', 'gameOver', 'wait'])
      expect(signals.get(method)).toBe(ac.signal)
  })

  test('实体与队伍走位命令:朝向/帧号/移动/坐骑逐参派发,异步项携带 signal', async () => {
    const { host, calls, signals } = recordHost()
    const ac = new AbortController()
    const runner = runnerOf(host, ac.signal)
    await runner.run([
      { kind: 'setEntityFacing', entity: 'e1', facing: 'left' },
      { kind: 'setEntityFrame', entity: 'e1', frame: 3 },
      {
        kind: 'moveEntity',
        entity: 'e2',
        to: { col: 4, row: 5, height: 0 },
        speed: 'fast',
      },
      { kind: 'moveParty', to: { col: 6, row: 7, height: 0 }, speed: 'slow' },
      { kind: 'unmountParty' },
      {
        kind: 'ride',
        entity: 'boat',
        to: { col: 8, row: 9, height: 0 },
        speed: 'normal',
      },
    ])
    expect(calls).toEqual([
      'setEntityFacing("e1","left")',
      'setEntityFrame("e1",3)',
      'moveEntity("e2",{"col":4,"row":5,"height":0},"fast")',
      'moveParty({"col":6,"row":7,"height":0},"slow")',
      'unmountParty()',
      'ride("boat",{"col":8,"row":9,"height":0},"normal")',
    ])
    for (const method of ['moveEntity', 'moveParty', 'ride'])
      expect(signals.get(method)).toBe(ac.signal)
  })

  test('镜头与帧动画命令:cameraPan/cameraSnap/clearFrameAnimation 逐参派发', async () => {
    const { host, calls, signals } = recordHost()
    const ac = new AbortController()
    await runnerOf(host, ac.signal).run([
      { kind: 'cameraPan', dx: 3, dy: -2, frames: 12 },
      { kind: 'cameraSnap', to: { col: 1, row: 1, height: 0 } },
      { kind: 'cameraSnap' },
      { kind: 'clearFrameAnimation' },
    ])
    expect(calls).toEqual([
      'cameraPan(3,-2,12)',
      'cameraSnap({"col":1,"row":1,"height":0})',
      'cameraSnap()',
      'clearFrameAnimation()',
    ])
    expect(signals.get('cameraPan')).toBe(ac.signal)
  })

  test('setEntityPos 宿主能力缺席:跳过宿主派发仍持久写世界', async () => {
    const { host, calls } = recordHost()
    const { setEntityPos: omitted, ...hostWithoutPos } = host
    expect(omitted).toBeTypeOf('function')
    const world = emptyProjectedWorldScriptState()
    await runnerOf(hostWithoutPos, new AbortController().signal, world).run([
      { kind: 'setEntityPos', entity: 'e8', pos: { col: 1, row: 1, height: 0 } },
    ])
    expect(calls).toEqual([])
    expect(world.entityPos).toEqual({ e8: { col: 1, row: 1, height: 0 } })
  })

  test('setSceneOnEnter 对既有槽覆写而不新建槽', async () => {
    const { host } = recordHost()
    const world = emptyProjectedWorldScriptState()
    const first = { chunk: 'shared/c1', id: 'first-enter' }
    const second = { chunk: 'shared/c1', id: 'second-enter' }
    await runnerOf(host, new AbortController().signal, world).run([
      { kind: 'setSceneOnEnter', scene: 's9', script: first },
      { kind: 'setSceneOnEnter', scene: 's9', script: second },
    ])
    expect(Object.keys(world.sceneScriptOverrides ?? {})).toEqual(['s9'])
    expect(world.sceneScriptOverrides?.s9?.onEnter).toBe(second)
  })
})

describe('HL1 调用与跳转生命周期', () => {
  test('callScript 内 returnScript 只终止被调脚本,调用方从调用点继续', async () => {
    const { host, calls } = recordHost()
    const resolver: ScriptResolver = {
      async resolve(ref) {
        calls.push(`resolve(${ref.chunk}:${ref.id})`)
        return {
          body: [
            { kind: 'playSound', asset: 'sound.callee.head' },
            { kind: 'returnScript' },
            { kind: 'playSound', asset: 'sound.callee.tail' },
          ],
          ref,
          release() {
            calls.push('release')
          },
        }
      },
    }
    await runnerOf(
      host,
      new AbortController().signal,
      emptyProjectedWorldScriptState(),
      resolver,
    ).run([
      { kind: 'playSound', asset: 'sound.caller.before' },
      { kind: 'callScript', ref: { chunk: 'shared/c1', id: 'callee' } },
      { kind: 'playSound', asset: 'sound.caller.after' },
    ])
    expect(calls).toEqual([
      'playSound("sound.caller.before")',
      'resolve(shared/c1:callee)',
      'playSound("sound.callee.head")',
      'release',
      'playSound("sound.caller.after")',
    ])
  })

  test('jumpScript 在跳转处理前已取消:以 AbortError 拒绝且不解析目标', async () => {
    const { host, calls } = recordHost()
    const ac = new AbortController()
    const resolver: ScriptResolver = {
      async resolve(ref) {
        calls.push(`resolve(${ref.id})`)
        return { body: [], ref, release() {} }
      },
    }
    const runner = runnerOf(host, ac.signal, emptyProjectedWorldScriptState(), resolver)
    runner.onStep = (event) => {
      if (event.cmd.kind === 'jumpScript') ac.abort()
    }
    await expect(
      runner.run([
        { kind: 'playSound', asset: 'sound.before-jump' },
        { kind: 'jumpScript', ref: { chunk: 'shared/c1', id: 'jump-target' } },
      ]),
    ).rejects.toMatchObject({ name: 'AbortError' })
    expect(calls).toEqual(['playSound("sound.before-jump")'])
  })
})
