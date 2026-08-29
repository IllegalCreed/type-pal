import { describe, expect, test, vi } from 'vitest'
import { executeScriptHostEffect } from './script-host-adapter.js'
import type { ScriptHost } from './script-runner.js'

function host(): ScriptHost {
  return {
    dialog: vi.fn(async () => undefined),
    clearDialog: vi.fn(),
    fade: vi.fn(async () => undefined),
    holdScreen: vi.fn(async () => undefined),
    revealScreen: vi.fn(async () => undefined),
    ditherScreen: vi.fn(async () => undefined),
    chaseStep: vi.fn(async () => undefined),
    vanishEntity: vi.fn(),
    loadLastSave: vi.fn(async () => undefined),
    gameOver: vi.fn(async () => undefined),
    wait: vi.fn(async () => undefined),
    teleportParty: vi.fn(),
    loadScene: vi.fn(async () => undefined),
    setPartyFacing: vi.fn(),
    setActorSprite: vi.fn(async () => undefined),
    fleeBattle: vi.fn(),
    setEntityState: vi.fn(),
    setEntityFacing: vi.fn(),
    setEntityFrame: vi.fn(),
    playEntityAction: vi.fn(async () => undefined),
    stopEntityAction: vi.fn(),
    giveItem: vi.fn(),
    loseItem: vi.fn(),
    giveMoney: vi.fn(),
    playSound: vi.fn(),
    playMusic: vi.fn(),
    stopMusic: vi.fn(),
    setAmbience: vi.fn(),
    takeEntity: vi.fn(),
    releaseEntity: vi.fn(),
    mountParty: vi.fn(),
    unmountParty: vi.fn(),
    ride: vi.fn(async () => undefined),
    setParty: vi.fn(async () => undefined),
    applyActorCondition: vi.fn(async () => undefined),
    clearActorCondition: vi.fn(async () => undefined),
    setFollowers: vi.fn(async () => undefined),
    moveEntity: vi.fn(async () => undefined),
    stepEntity: vi.fn(),
    animEntity: vi.fn(),
    nudgeEntity: vi.fn(),
    moveParty: vi.fn(async () => undefined),
    nudgeParty: vi.fn(),
    cameraPan: vi.fn(async () => undefined),
    cameraSnap: vi.fn(),
    setEntityAuto: vi.fn(),
    setEntityTrigger: vi.fn(),
    setEntityTriggerMode: vi.fn(),
    startBattle: vi.fn(async () => 'victory' as const),
    teleportOut: vi.fn(async () => false),
    playVideo: vi.fn(async () => undefined),
    playFrameAnimation: vi.fn(async () => undefined),
    openShop: vi.fn(async () => undefined),
    confirm: vi.fn(async () => true),
    query: {
      hasItem: vi.fn(() => false),
      ownsItem: vi.fn(() => false),
      money: vi.fn(() => 7),
      inParty: vi.fn(() => false),
      allFullHp: vi.fn(() => false),
      itemEquipped: vi.fn(() => false),
      entityInScene: vi.fn(() => false),
      facingEntity: vi.fn(() => false),
    },
    report: vi.fn(),
  }
}

describe('current script host adapter', () => {
  test('forwards actor condition commands to the canonical gameplay host', async () => {
    const target = host()
    const signal = new AbortController().signal
    await executeScriptHostEffect(
      target,
      {
        kind: 'applyActorCondition',
        actor: 'li-xiaoyao',
        condition: { kind: 'status', status: 'protect', turns: 7 },
      },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    await executeScriptHostEffect(
      target,
      {
        kind: 'clearActorCondition',
        actor: 'li-xiaoyao',
        condition: { kind: 'poisonResistance' },
      },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )

    expect(target.applyActorCondition).toHaveBeenCalledWith(
      'li-xiaoyao',
      { kind: 'status', status: 'protect', turns: 7 },
      signal,
    )
    expect(target.clearActorCondition).toHaveBeenCalledWith(
      'li-xiaoyao',
      { kind: 'poisonResistance' },
      signal,
    )
  })

  test('forwards source scene transition and transient screen commands', async () => {
    const target = host()
    const signal = new AbortController().signal
    const transition = {
      kind: 'source' as const,
      outMs: 1200,
      inMs: 600,
      color: 'black' as const,
      evidenceId: 'pal-load-scene-100',
    }
    await executeScriptHostEffect(
      target,
      { kind: 'holdScreen', color: 'black', token: 'pal-night' },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    await executeScriptHostEffect(
      target,
      { kind: 'revealScreen', token: 'pal-night' },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    await executeScriptHostEffect(
      target,
      { kind: 'loadScene', scene: 's002', entryId: 'west', transition },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    expect(target.holdScreen).toHaveBeenCalledWith('black', 'pal-night', signal)
    expect(target.revealScreen).toHaveBeenCalledWith('pal-night', signal)
    expect(target.loadScene).toHaveBeenCalledWith('s002', { entryId: 'west' }, signal, transition)
  })

  test('forwards canonical fade direction and duration to the runtime host', async () => {
    const target = host()
    const signal = new AbortController().signal
    await executeScriptHostEffect(target, { kind: 'fade', dir: 'out', ms: 1600 }, {}, signal, {
      currentSceneId: () => 's048',
    })
    await executeScriptHostEffect(target, { kind: 'fade', dir: 'in', ms: 600 }, {}, signal, {
      currentSceneId: () => 's048',
    })
    expect(target.fade).toHaveBeenNthCalledWith(1, 'out', 1600, undefined, signal)
    expect(target.fade).toHaveBeenNthCalledWith(2, 'in', 600, undefined, signal)
  })

  test('unwraps active-scene EntityAddress and ignores transient effects for other scenes', async () => {
    const target = host()
    const signal = new AbortController().signal
    await executeScriptHostEffect(
      target,
      {
        kind: 'moveEntity',
        target: { scene: 's001', entity: 'e001' },
        to: { col: 2, row: 3, height: 0 },
        speed: 'fast',
      },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    await executeScriptHostEffect(
      target,
      {
        kind: 'setEntityFacing',
        target: { scene: 's002', entity: 'e001' },
        facing: 'left',
      },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    expect(target.moveEntity).toHaveBeenCalledWith(
      'e001',
      { col: 2, row: 3, height: 0 },
      'fast',
      signal,
    )
    expect(target.setEntityFacing).not.toHaveBeenCalled()
  })

  test('keeps persistent-only selection commands out of the legacy host', async () => {
    const target = host()
    await executeScriptHostEffect(
      target,
      {
        kind: 'selectEntityBehavior',
        target: { scene: 's001', entity: 'e001' },
        channel: 'trigger',
        selection: { kind: 'disabled' },
      },
      {},
      new AbortController().signal,
      { currentSceneId: () => 's001' },
    )
    expect(target.setEntityTrigger).not.toHaveBeenCalled()
    expect(target.setEntityAuto).not.toHaveBeenCalled()
  })

  test('uses the current scene only for immediate map reload', async () => {
    const target = host()
    target.reloadMap = vi.fn(async () => undefined)
    const signal = new AbortController().signal
    await executeScriptHostEffect(
      target,
      { kind: 'setSceneMapOverride', mapId: 'map-2' },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    await executeScriptHostEffect(
      target,
      { kind: 'setSceneMapOverride', scene: 's002', mapId: 'map-3' },
      {},
      signal,
      { currentSceneId: () => 's001' },
    )
    expect(target.reloadMap).toHaveBeenCalledTimes(1)
    expect(target.reloadMap).toHaveBeenCalledWith('map-2', signal)
  })
})
