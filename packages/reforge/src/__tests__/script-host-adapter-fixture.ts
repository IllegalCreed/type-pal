import type { RuntimeCommand } from '@type-pal/content'
import { executeScriptHostEffect, type ScriptHostAdapterOptions } from '../script-host-adapter.js'
import type { ScriptHost } from '../script-runner.js'
import type { ScriptRuntimeContext } from '../script-runner-core.js'
import { compileAdapterLeaves } from './script-host-adapter-input.js'

type HostCall = { method: keyof ScriptHost; args: unknown[] }

export const villageScene = { currentSceneId: () => 'village' }
export const villageEntity = (entity: string) => ({ scene: 'village', entity })
export const forestEntity = (entity: string) => ({ scene: 'forest', entity })

// Replace only host effects. Parsing and dispatch go through their production entry points.
export function recordScriptHost(overrides: Partial<ScriptHost> = {}) {
  const calls: HostCall[] = []
  const sync =
    (method: keyof ScriptHost) =>
    (...args: unknown[]) => {
      calls.push({ method, args })
    }
  const asyncCall =
    (method: keyof ScriptHost) =>
    async (...args: unknown[]) => {
      calls.push({ method, args })
    }
  const host: ScriptHost = {
    dialog: asyncCall('dialog'),
    clearDialog: sync('clearDialog'),
    fade: asyncCall('fade'),
    holdScreen: asyncCall('holdScreen'),
    revealScreen: asyncCall('revealScreen'),
    ditherScreen: asyncCall('ditherScreen'),
    chaseStep: asyncCall('chaseStep'),
    vanishEntity: sync('vanishEntity'),
    loadLastSave: asyncCall('loadLastSave'),
    gameOver: asyncCall('gameOver'),
    quitToTitle: asyncCall('quitToTitle'),
    wait: asyncCall('wait'),
    teleportParty: sync('teleportParty'),
    loadScene: asyncCall('loadScene'),
    setPartyFacing: sync('setPartyFacing'),
    setActorSprite: asyncCall('setActorSprite'),
    setActorAppearance: asyncCall('setActorAppearance'),
    fleeBattle: sync('fleeBattle'),
    setEntityState: sync('setEntityState'),
    setEntityFacing: sync('setEntityFacing'),
    faceEntityToParty: sync('faceEntityToParty'),
    setEntityFrame: sync('setEntityFrame'),
    playEntityAction: asyncCall('playEntityAction'),
    stopEntityAction: sync('stopEntityAction'),
    giveItem: asyncCall('giveItem'),
    loseItem: sync('loseItem'),
    giveMoney: sync('giveMoney'),
    playSound: sync('playSound'),
    playMusic: asyncCall('playMusic'),
    stopMusic: sync('stopMusic'),
    setAmbience: sync('setAmbience'),
    takeEntity: sync('takeEntity'),
    releaseEntity: sync('releaseEntity'),
    mountParty: sync('mountParty'),
    unmountParty: sync('unmountParty'),
    ride: asyncCall('ride'),
    setParty: asyncCall('setParty'),
    applyActorCondition: asyncCall('applyActorCondition'),
    clearActorCondition: asyncCall('clearActorCondition'),
    setFollowers: asyncCall('setFollowers'),
    moveEntity: asyncCall('moveEntity'),
    stepEntity: sync('stepEntity'),
    animEntity: sync('animEntity'),
    nudgeEntity: sync('nudgeEntity'),
    moveParty: asyncCall('moveParty'),
    nudgeParty: sync('nudgeParty'),
    cameraPan: asyncCall('cameraPan'),
    cameraSnap: sync('cameraSnap'),
    setEntityAuto: sync('setEntityAuto'),
    setEntityTrigger: sync('setEntityTrigger'),
    setEntityTriggerMode: sync('setEntityTriggerMode'),
    startBattle: async () => 'victory',
    teleportOut: async () => true,
    playVideo: asyncCall('playVideo'),
    playFrameAnimation: asyncCall('playFrameAnimation'),
    clearFrameAnimation: sync('clearFrameAnimation'),
    openShop: asyncCall('openShop'),
    confirm: async () => true,
    query: {
      hasItem: () => false,
      ownsItem: () => false,
      money: () => 61,
      inParty: () => false,
      allFullHp: () => false,
      itemEquipped: () => false,
      entityInScene: () => false,
      entitiesNear: () => false,
      facingEntity: () => false,
    },
    report: sync('report'),
    shakeScreen: sync('shakeScreen'),
    toggleDayNight: sync('toggleDayNight'),
    increaseHpMp: sync('increaseHpMp'),
    revivePartyAll: sync('revivePartyAll'),
    learnSkill: sync('learnSkill'),
    setEntityPos: sync('setEntityPos'),
    setEntityPosRelParty: sync('setEntityPosRelParty'),
    unequipRole: sync('unequipRole'),
    ...overrides,
  }
  return { host, calls }
}

export async function runAdapterCommands(
  host: ScriptHost,
  commands: readonly RuntimeCommand[],
  {
    signal = new AbortController().signal,
    context = {},
    options = villageScene,
  }: {
    signal?: AbortSignal
    context?: Readonly<ScriptRuntimeContext>
    options?: ScriptHostAdapterOptions
  } = {},
): Promise<void> {
  for (const command of compileAdapterLeaves(commands))
    await executeScriptHostEffect(host, command, context, signal, options)
}
