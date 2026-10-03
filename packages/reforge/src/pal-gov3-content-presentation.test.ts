import {
  buildEntityLifecycleReferenceIndex,
  emptyWorldScriptState,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { expect, test } from 'vitest'
import actorsJson from '../../../projects/pal/content/actors.json' with { type: 'json' }
import type { BattleResult } from './battle/battle-result.js'
import { SupersedingFadeDriver } from './fade-driver.js'
import type { RuntimeLeafCommand } from './runtime-script-compiler.js'
import { ScriptProjectRuntime } from './runtime-script-project.js'
import { makeTestWorld } from './test-fixtures.js'

const modules = import.meta.glob<{ default: unknown }>(
  '../../../projects/pal/content/scenes/s*.json',
  { eager: true },
)
const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
const scenes = resolveAuthorDialogueTree(
  validateAuthorScenes(Object.values(modules).map((module) => module.default)),
  actors,
)
const references = buildEntityLifecycleReferenceIndex(scenes)
const monsterCases = scenes.flatMap((scene) =>
  scene.entities.flatMap((entity) => {
    const body = entity.behaviors?.trigger?.default?.flow.stages[0]?.body
    if (
      body?.[0]?.kind !== 'startBattle' ||
      body[1]?.kind !== 'hideEntity' ||
      body[2]?.kind !== 'fade' ||
      body[2].dir !== 'out' ||
      body[2].ms !== 600
    )
      return []
    return [{ scene: scene.id, entity: entity.id }]
  }),
)

test('精确共同消怪尾保持已核九十三个绑定分母', () => expect(monsterCases).toHaveLength(93))

for (const entry of monsterCases)
  for (const result of ['victory', 'playerFled', 'defeat'] satisfies BattleResult[]) {
    test(`${entry.scene}/${entry.entity} ${result} 只执行所属结果并明确恢复画面`, async () => {
      const world = { ...makeTestWorld(), script: emptyWorldScriptState() }
      const effects: RuntimeLeafCommand[] = []
      const fade = new SupersedingFadeDriver()
      let time = 0
      const scene = scenes.find((value) => value.id === entry.scene)
      if (!scene) throw new Error('missing monster scene')
      const runtime = new ScriptProjectRuntime({ sharedScripts: {} }, world, 'e'.repeat(64), {
        lifecycleReferences: references,
        currentSceneId: () => entry.scene,
        currentSceneSessionId: () => `gov3-monster-${entry.scene}`,
        scene: (id) => {
          const value = scenes.find((item) => item.id === id)
          if (!value) throw new Error(`missing ${id}`)
          return value
        },
        gameplayNow: () => time,
        async executeEffect(command, _context, signal) {
          effects.push(command)
          if (command.kind === 'fade') {
            const duration = command.ms ?? 300
            const pending = fade.begin(command.dir === 'out' ? 1 : 0, time, duration, signal)
            time += duration
            fade.advance(time)
            await pending
          }
        },
        query: {
          entitiesNear: () => false,
          hasItem: () => true,
          ownsItem: () => true,
          itemEquipped: () => true,
          money: () => 0,
          inParty: () => false,
          allFullHp: () => true,
          entityInScene: () => true,
          facingEntity: () => true,
        },
        wait: async (ms) => {
          time += ms
        },
        waitWorldTick: async () => {
          time += 100
        },
        yieldMacroTask: async () => {},
        confirm: async () => true,
        startBattle: async () => result,
        teleportOut: async () => false,
      })
      expect(
        await runtime.runEntityBehavior(scene, entry.entity, 'trigger', {
          signal: new AbortController().signal,
        }),
      ).toBe(true)
      if (result === 'victory') {
        expect(effects.filter((command) => command.kind === 'fade')).toEqual([
          { kind: 'fade', dir: 'out', ms: 600 },
          { kind: 'fade', dir: 'in', ms: 600 },
        ])
        expect(fade.value).toBe(0)
        expect(effects.filter((command) => command.kind === 'hideEntity')).toEqual([
          { kind: 'hideEntity', target: entry, ticks: 800 },
        ])
        expect(effects.some((command) => command.kind === 'loadLastSave')).toBe(false)
      } else {
        expect(effects.filter((command) => command.kind === 'hideEntity')).toEqual([])
        expect(
          effects.filter((command) => command.kind === 'fade' && command.dir === 'in'),
        ).toEqual([])
        if (result === 'playerFled') {
          expect(effects.filter((command) => command.kind === 'suspendEntity')).toEqual([
            { kind: 'suspendEntity', target: entry, ticks: 15 },
          ])
          expect(fade.value).toBe(0)
        } else {
          expect(effects.some((command) => command.kind === 'loadLastSave')).toBe(true)
          expect(effects.filter((command) => command.kind === 'fade')).toEqual([
            { kind: 'fade', color: 'red', dir: 'out', ms: 900 },
          ])
        }
      }
    })
  }
