import type { Command } from '@type-pal/shared'
import { expect, test } from 'vitest'
import type { EventObject, Scene } from '../io/sss.js'
import type { SupplementalEventObject } from './script-corrections.js'
import { collectScriptEntries } from './script-entries.js'
import { sliceByScene } from './slice.js'

test('parsed script roots preserve scene/EO order and all twelve OBJECT hook fields', () => {
  const sources = {
    scenes: [{ scriptOnEnter: 3, scriptOnTeleport: 1 }],
    eventObjects: [{ triggerScript: 2, autoScript: 4 }],
    items: [{ scriptOnUse: 5, scriptOnEquip: 6, scriptOnThrow: 7, scriptDesc: 8 }],
    spells: [{ scriptOnUse: 9, scriptOnSuccess: 10, scriptDesc: 11 }],
    enemyObjects: [{ scriptOnTurnStart: 12, scriptOnBattleEnd: 13, scriptOnReady: 14 }],
    objectPlayers: [{ scriptOnFriendDeath: 15, scriptOnDying: 16 }],
  }
  // Parsed tables are borrowed. Freeze them so this pure collector cannot silently rewrite roots.
  for (const table of Object.values(sources)) {
    for (const row of table) Object.freeze(row)
    Object.freeze(table)
  }
  const result = collectScriptEntries(Object.freeze(sources))
  expect(result).toEqual({
    entryIps: [3, 1, 2, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    globalScriptEntries: [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
    sceneExtraRoots: {},
  })
})

test('zero roots are omitted, aliases are retained and returned arrays have independent owners', () => {
  const sources = {
    scenes: [{ scriptOnEnter: 0, scriptOnTeleport: 0 }],
    eventObjects: [{ triggerScript: 0, autoScript: 0 }],
    items: [
      { scriptOnUse: 3, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0 },
      { scriptOnUse: 0, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0 },
    ],
    spells: [{ scriptOnUse: 0, scriptOnSuccess: 0, scriptDesc: 0 }],
    enemyObjects: [{ scriptOnTurnStart: 0, scriptOnBattleEnd: 0, scriptOnReady: 0 }],
    objectPlayers: [
      { scriptOnFriendDeath: 0, scriptOnDying: 3 },
      { scriptOnFriendDeath: 0, scriptOnDying: 0 },
    ],
  }
  const result = collectScriptEntries(sources)
  expect(result).toEqual({ entryIps: [3, 3], globalScriptEntries: [3, 3], sceneExtraRoots: {} })
  result.globalScriptEntries.push(99)
  expect(result.entryIps).toEqual([3, 3])
  result.entryIps.push(88)
  expect(collectScriptEntries(sources)).toEqual({
    entryIps: [3, 3],
    globalScriptEntries: [3, 3],
    sceneExtraRoots: {},
  })
})

test('resource-authored hooks keep ordered labels and aliases while slices retain their scene owners', () => {
  const scenes: Scene[] = [
    {
      mapNum: 0,
      scriptOnEnter: 1,
      scriptOnTeleport: 0,
      eventObjectIndex: 0,
      raw: new Uint16Array([0, 1, 0, 0]),
    },
    {
      mapNum: 1,
      scriptOnEnter: 0,
      scriptOnTeleport: 0,
      eventObjectIndex: 0,
      raw: new Uint16Array([1, 0, 0, 0]),
    },
  ]
  const eventObjects: EventObject[] = [
    {
      vanishTime: 0,
      x: 0,
      y: 0,
      layer: 0,
      triggerScript: 2,
      autoScript: 0,
      state: 1,
      triggerMode: 0,
      spriteNum: 0,
      nSpriteFrames: 0,
      direction: 0,
      currentFrameNum: 0,
      scriptIdleFrame: 0,
      spritePtrOffset: 0,
      nSpriteFramesAuto: 0,
      scriptIdleFrameCountAuto: 0,
      raw: new Uint16Array([0, 0, 0, 0, 2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
    },
  ]
  const supplementalObjects: SupplementalEventObject[] = [
    {
      sceneId: 1,
      object: {
        id: 1,
        x: 32,
        y: 48,
        spriteNum: 0,
        triggerMode: 5,
        triggerLabel: 'L_4',
        autoLabel: 'L_5',
        supplemental: true,
      },
    },
    {
      sceneId: 0,
      object: {
        id: 2,
        x: 64,
        y: 48,
        spriteNum: 0,
        triggerMode: 5,
        autoLabel: 'L_5',
        supplemental: true,
      },
    },
    {
      sceneId: 1,
      object: { id: 3, x: 96, y: 48, spriteNum: 0, triggerMode: 0, supplemental: true },
    },
    {
      sceneId: 1,
      object: {
        id: 4,
        x: 128,
        y: 48,
        spriteNum: 0,
        triggerMode: 5,
        triggerLabel: 'L_6',
        autoLabel: 'L_4',
        supplemental: true,
      },
    },
  ]
  for (const entry of supplementalObjects) {
    Object.freeze(entry.object)
    Object.freeze(entry)
  }
  Object.freeze(supplementalObjects)
  const entries = collectScriptEntries({
    scenes,
    eventObjects,
    supplementalObjects,
    items: [{ scriptOnUse: 3, scriptOnEquip: 0, scriptOnThrow: 0, scriptDesc: 0 }],
    spells: [],
    enemyObjects: [],
    objectPlayers: [],
  })
  expect(entries).toEqual({
    entryIps: [1, 2, 3, 4, 5, 5, 6, 4],
    globalScriptEntries: [3],
    sceneExtraRoots: { 0: [5], 1: [4, 5, 6, 4] },
  })
  const commands: Command[] = Array.from({ length: 7 }, (_, ip) => ({
    op: 'end',
    label: `L_${ip}`,
  }))
  const sliced = sliceByScene(
    commands,
    scenes,
    eventObjects,
    entries.globalScriptEntries,
    entries.sceneExtraRoots,
  )
  expect(
    sliced.scenes.map((scene) => scene.segments[0]!.commands.map((command) => command.label)),
  ).toEqual([['L_1'], ['L_2', 'L_4', 'L_6']])
  expect(sliced.shared.segments[0]!.commands.map((command) => command.label)).toEqual([
    'L_3',
    'L_5',
  ])
  entries.sceneExtraRoots[1]!.push(99)
  expect(entries.entryIps).toEqual([1, 2, 3, 4, 5, 5, 6, 4])
})
