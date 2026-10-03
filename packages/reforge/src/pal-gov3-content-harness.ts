import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  type RuntimeCommand,
  type RuntimeSceneDef,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
  type WorldState,
} from '@type-pal/content'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import { SupersedingFadeDriver } from './fade-driver.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { makeTestWorld } from './test-fixtures.js'

const modules = import.meta.glob<{ default: unknown }>(
  '../../../projects/pal/content/scenes/s*.json',
  { eager: true },
)
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
export const gov3Scenes = resolveAuthorDialogueTree(
  validateAuthorScenes(Object.values(modules).map((module) => module.default)),
  actors,
)
const references = buildEntityLifecycleReferenceIndex(gov3Scenes)

export function gov3Scene(id: string): RuntimeSceneDef {
  const value = gov3Scenes.find((scene) => scene.id === id)
  if (!value) throw new Error(`missing ${id}`)
  return value
}

export function gov3Body(
  sceneId: string,
  entityId: string,
  behavior: string,
  stageId: string,
): RuntimeCommand[] {
  const owner = gov3Scene(sceneId)
  const flow =
    entityId === 'hook'
      ? owner.hooks?.onEnter?.variants[behavior]?.flow
      : owner.entities.find((entity) => entity.id === entityId)?.behaviors?.trigger?.[behavior]
          ?.flow
  const value = flow?.stages.find((stage) => stage.id === stageId)?.body
  if (!value) throw new Error('missing canonical body')
  return value
}

export function gov3SubBody(
  body: RuntimeCommand[],
  path: string,
): { body: RuntimeCommand[]; index: number } {
  const parts = path.split('/').slice(1)
  let current = body
  while (parts.length > 1) {
    const command = current[Number(parts.shift())]
    const arm = parts.shift()
    if (command?.kind === 'branch' && arm === 'then') current = command.then
    else if (command?.kind === 'branch' && arm === 'else') current = command.else ?? []
    else if (command?.kind === 'confirm' && arm === 'onYes') current = command.onYes
    else if (command?.kind === 'confirm' && arm === 'onNo') current = command.onNo
    else if ((command?.kind === 'repeat' || command?.kind === 'loop') && arm === 'body')
      current = command.body
    else throw new Error(`invalid canonical body path ${path}`)
  }
  return { body: current, index: Number(parts[0]) }
}

export function gov3Runtime(
  sceneId: string,
  options: {
    eligible?: boolean
    near?: boolean
    beforeEffect?: (
      command: RuntimeLeafCommand,
      opacity: number,
      controller: AbortController,
    ) => void
  } = {},
) {
  let currentScene = sceneId,
    time = 0
  const world: WorldState = {
    ...makeTestWorld(),
    money: 99999,
    inventory: [],
    script: emptyWorldScriptState(),
  }
  const effects: { command: RuntimeLeafCommand; opacity: number }[] = []
  const choices: boolean[] = []
  const controller = new AbortController()
  const fade = new SupersedingFadeDriver()
  const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'f'.repeat(64), {
    lifecycleReferences: references,
    currentSceneId: () => currentScene,
    currentSceneSessionId: () => `gov3-canonical-${currentScene}`,
    scene: gov3Scene,
    gameplayNow: () => time,
    async executeEffect(command, _context, signal) {
      options.beforeEffect?.(command, fade.value, controller)
      signal.throwIfAborted()
      effects.push({ command, opacity: fade.value })
      if (command.kind === 'wait') time += command.ms
      if (command.kind === 'giveMoney') world.money = Math.max(0, world.money + command.delta)
      if (command.kind === 'giveItem') {
        const item = world.inventory.find((entry) => entry.itemId === command.itemId)
        if (item) item.count += command.count ?? 1
        else world.inventory.push({ itemId: command.itemId, count: command.count ?? 1 })
      }
      if (command.kind === 'fade') {
        const ms = command.ms ?? 300
        const pending = fade.begin(command.dir === 'out' ? 1 : 0, time, ms, signal)
        time += ms
        fade.advance(time)
        await pending
      }
    },
    query: {
      hasItem: () => options.eligible ?? true,
      ownsItem: () => options.eligible ?? true,
      itemEquipped: () => options.eligible ?? true,
      money: () => world.money,
      inParty: () => options.eligible ?? true,
      entityInScene: () => options.eligible ?? true,
      entitiesNear: () => options.near ?? false,
      allFullHp: () => true,
      facingEntity: () => options.eligible ?? true,
    },
    wait: async (ms) => {
      effects.push({ command: { kind: 'wait', ms }, opacity: fade.value })
      time += ms
    },
    waitWorldTick: async () => {
      time += 100
    },
    yieldMacroTask: async () => {},
    confirm: async () => choices.shift() ?? true,
    startBattle: async () => 'victory',
    teleportOut: async () => true,
  })
  return {
    world,
    runtime,
    effects,
    fade,
    controller,
    choices,
    enter(id: string) {
      currentScene = id
    },
    async activate(entity: string) {
      return runtime.runEntityBehavior(gov3Scene(currentScene), entity, 'trigger', {
        signal: controller.signal,
      })
    },
    async auto(entity: string) {
      return runtime.runEntityBehavior(gov3Scene(currentScene), entity, 'auto', {
        signal: controller.signal,
      })
    },
    async install(entity: string, behavior: string) {
      await runtime.runCommands(
        [
          {
            kind: 'selectEntityBehavior',
            target: { scene: currentScene, entity },
            channel: 'trigger',
            selection: { kind: 'use', value: behavior },
          },
        ],
        { signal: controller.signal },
      )
      effects.length = 0
    },
  }
}
