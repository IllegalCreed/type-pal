import {
  buildEntityLifecycleReferenceIndex,
  type EntityAddress,
  emptyWorldScriptState,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import { gov3Scene, gov3Scenes } from './pal-gov3-content-harness.js'
import native from './pal-gov3-content-proximity-native.json' with { type: 'json' }
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { makeTestWorld } from './test-fixtures.js'

for (const evidence of native.runs)
  test(`鹿茸陷阱初近${evidence.initialNear}与真实P1 check/call/hide边界一致且只捕获一次`, async () => {
    const definition = gov3Scene('s048')
    const references = buildEntityLifecycleReferenceIndex(gov3Scenes)
    const trap = definition.entities.find((entity) => entity.id === 'e797')
    if (!trap) throw new Error('missing trap')
    const positions = new Map([
      ['e797', { ...trap.pos }],
      ['e796', { ...trap.pos, col: trap.pos.col + (evidence.initialNear ? 0 : 4) }],
    ])
    const world = { ...makeTestWorld(), script: emptyWorldScriptState() }
    const controller = new AbortController()
    let time = 0
    const effects: { at: number; command: RuntimeLeafCommand }[] = []
    const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, '9'.repeat(64), {
      lifecycleReferences: references,
      currentSceneId: () => definition.id,
      currentSceneSessionId: () => `trap-${evidence.initialNear}`,
      scene: gov3Scene,
      gameplayNow: () => time,
      executeEffect(command) {
        effects.push({ at: time, command })
        if (command.kind === 'wait') {
          time += command.ms
          if (!evidence.initialNear && time === evidence.nearAt) {
            expect(effects.every((effect) => effect.command.kind === 'wait')).toBe(true)
            positions.set('e796', { ...trap.pos })
          }
        }
      },
      query: {
        hasItem: () => true,
        ownsItem: () => true,
        itemEquipped: () => true,
        money: () => 0,
        inParty: () => false,
        allFullHp: () => true,
        entityInScene: () => true,
        facingEntity: () => true,
        entitiesNear(from: EntityAddress, to: EntityAddress, range: number) {
          if (from.scene !== definition.id || to.scene !== definition.id) return false
          const a = positions.get(from.entity),
            b = positions.get(to.entity)
          return Boolean(
            a && b && Math.max(Math.abs(a.col - b.col), Math.abs(a.row - b.row)) < range,
          )
        },
      },
      wait: async (ms) => {
        time += ms
        if (!evidence.initialNear && time === evidence.nearAt) {
          expect(effects).toEqual([])
          positions.set('e796', { ...trap.pos })
        }
      },
      waitWorldTick: async () => {
        time += 100
      },
      yieldMacroTask: async () => {},
      confirm: async () => true,
      startBattle: async () => 'victory',
      teleportOut: async () => false,
    })
    expect(
      await runtime.runEntityBehavior(definition, 'e797', 'auto', { signal: controller.signal }),
    ).toBe(true)
    const nativeCapture = evidence.trace.find((row) => row.deerTrigger === 'L_10433')
    const nativeHide = evidence.trace.find((row) => row.trapState === 0)
    expect(nativeCapture?.at).toBe(evidence.nearAt + 100)
    expect(nativeHide?.at).toBe(evidence.nearAt + 200)
    expect(
      effects
        .filter((effect) => effect.command.kind !== 'wait')
        .map((effect) => [effect.at, effect.command.kind]),
    ).toEqual([
      [nativeCapture?.at, 'selectEntityBehavior'],
      [nativeCapture?.at, 'selectEntityBehavior'],
      [nativeCapture?.at, 'setEntityTriggerActivation'],
      [nativeCapture?.at, 'setEntityFacing'],
      [nativeCapture?.at, 'setEntityFrame'],
      [nativeCapture?.at, 'playSound'],
      [nativeCapture?.at, 'selectEntityPage'],
      [nativeHide?.at, 'setEntityState'],
    ])
    expect(
      effects
        .filter((effect) => effect.command.kind === 'playSound')
        .map((effect) => effect.command),
    ).toEqual([{ kind: 'playSound', asset: 'sound.pal.014' }])
    expect(world.script.behaviors.entities?.s048?.e796?.trigger?.selection).toBeUndefined()
    expect(world.script.behaviors.entities?.s048?.e796?.page).toBe('caught')
    expect(world.script.behaviors.entities?.s048?.e797?.auto?.cursor?.at).toEqual({
      kind: 'completed',
    })
    expect(
      await runtime.runEntityBehavior(definition, 'e797', 'auto', { signal: controller.signal }),
    ).toBe(false)
  })
