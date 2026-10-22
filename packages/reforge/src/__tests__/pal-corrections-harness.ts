import {
  buildEntityLifecycleReferenceIndex,
  type EntityAddress,
  emptyWorldScriptState,
  validateCurrentManifestStartup,
  type WorldState,
} from '@type-pal/content'
import manifestJson from '../../../../projects/pal/manifest.json' with { type: 'json' }
import { deriveEntityLifecycleGates } from '../entity-lifecycle.js'
import { gov3Scene, gov3Scenes } from '../pal-gov3-content-harness.js'
import type { RuntimeLeafCommand } from '../runtime-script-compiler.js'
import { ScriptProjectRuntime } from '../runtime-script-project.js'
import { normalizeCurrentSave, preflightCurrentSave } from '../save/current-codec.js'
import { buildCurrentSavePayload, buildMeta } from '../save/ops.js'
import { MemorySaveStore } from '../save/store.js'
import { makeTestWorld } from '../test-fixtures.js'

const references = buildEntityLifecycleReferenceIndex(gov3Scenes)
const manifest = validateCurrentManifestStartup(manifestJson).manifest

/** Headless script boundary: real compiler, conditions, lifecycle and cursors;
 * the host records rendering effects and applies only inventory/money effects. */
export function correctionRuntime(sceneId: string, savedWorld?: WorldState) {
  let currentScene = sceneId
  const world = savedWorld ?? {
    ...makeTestWorld(),
    money: 0,
    inventory: [],
    script: emptyWorldScriptState(),
  }
  const effects: RuntimeLeafCommand[] = []
  const answers: boolean[] = []
  const reveals: Record<string, boolean>[] = []
  const signal = new AbortController().signal
  function gates(target: EntityAddress) {
    const definition = gov3Scene(target.scene).entities.find(
      (entity) => entity.id === target.entity,
    )
    if (!definition) throw new Error(`missing canonical entity ${target.scene}/${target.entity}`)
    return deriveEntityLifecycleGates({
      staticHidden: definition.hidden,
      staticCollide: definition.collide,
      entityState: world.script?.entityState[target.scene]?.[target.entity],
      lifecycle: world.entityLifecycles?.[target.scene]?.[target.entity],
    })
  }
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'a'.repeat(64), {
    lifecycleReferences: references,
    currentSceneId: () => currentScene,
    currentSceneSessionId: () => `correction-${currentScene}`,
    scene: gov3Scene,
    executeEffect(command) {
      effects.push(command)
      if (command.kind === 'giveMoney') world.money = Math.max(0, world.money + command.delta)
      if (command.kind === 'giveItem' || command.kind === 'loseItem') {
        let item = world.inventory.find((entry) => entry.itemId === command.itemId)
        if (!item) {
          item = { itemId: command.itemId, count: 0 }
          world.inventory.push(item)
        }
        item.count = Math.max(
          0,
          item.count + (command.kind === 'loseItem' ? -1 : 1) * (command.count ?? 1),
        )
      }
    },
    query: {
      hasItem: (id, count) =>
        world.inventory.some((item) => item.itemId === id && item.count >= count),
      ownsItem: (id) => world.inventory.some((item) => item.itemId === id && item.count > 0),
      itemEquipped: () => false,
      money: () => world.money,
      inParty: (actor) => world.party.some((member) => member.id === actor),
      entityInScene: (target) => target.scene === currentScene && gates(target).visible,
      entitiesNear: () => false,
      allFullHp: () => true,
      facingEntity: () => true,
    },
    revealSceneEntry: async () => {
      reveals.push(
        Object.fromEntries(
          gov3Scene(currentScene).entities.map((entity) => [
            entity.id,
            gates({ scene: currentScene, entity: entity.id }).visible,
          ]),
        ),
      )
    },
    confirm: async () => {
      const answer = answers.shift()
      if (answer === undefined) throw new Error('unexpected confirmation')
      return answer
    },
    wait: async () => {},
    waitWorldTick: async () => {},
    yieldMacroTask: async () => {},
    startBattle: async () => 'victory',
    teleportOut: async () => false,
  })
  return {
    world,
    runtime,
    effects,
    answers,
    signal,
    reveals,
    gates,
    enter(id: string) {
      currentScene = id
    },
    activate(entity: string) {
      return runtime.runEntityBehavior(gov3Scene(currentScene), entity, 'trigger', { signal })
    },
    hook() {
      return runtime.runSceneHook(gov3Scene(currentScene), 'onEnter', { signal })
    },
    async restore() {
      const store = new MemorySaveStore({ kind: 'project', projectId: manifest.id })
      const payload = buildCurrentSavePayload(
        world,
        {
          sceneId: currentScene,
          pos: gov3Scene(currentScene).entry.pos,
          facing: 'down',
        },
        manifest.id,
      )
      await store.putSlot(
        buildMeta('m01', world, currentScene, (member) => member.id, 1),
        payload,
        new Blob(),
      )
      const stored = await store.getPayload('m01')
      if (!stored) throw new Error('save payload missing')
      const resolver = await preflightCurrentSave({ manifest, payload: stored })
      return correctionRuntime(
        currentScene,
        normalizeCurrentSave(stored, resolver, references).world,
      )
    },
  }
}
