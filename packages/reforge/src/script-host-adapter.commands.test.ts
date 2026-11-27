import type { RuntimeCommand } from '@type-pal/content'
import { expect, test } from 'vitest'
import { deferred, nextTestTask } from './__tests__/deferred.js'
import {
  recordScriptHost,
  runAdapterCommands,
  villageEntity,
} from './__tests__/script-host-adapter-fixture.js'

test('dialogue and authored waiting pass their original content and cancellation signal', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const cue = { identity: { kind: 'narration' as const }, rows: [{ text: 'The gate opens.' }] }
  await runAdapterCommands(
    host,
    [{ kind: 'dialog', cue }, { kind: 'clearDialog' }, { kind: 'wait', ms: 250 }],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'dialog', args: [cue, signal] },
    { method: 'clearDialog', args: [] },
    { method: 'wait', args: [250, signal] },
  ])
})

test('inventory and money commands retain signed amounts and default item counts', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'giveItem', itemId: 'tonic', count: 3 },
      { kind: 'giveItem', itemId: 'herb' },
      { kind: 'loseItem', itemId: 'tonic', count: 2 },
      { kind: 'loseItem', itemId: 'herb' },
      { kind: 'giveMoney', delta: -120 },
      { kind: 'halveMoney' },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'giveItem', args: ['tonic', 3, signal] },
    { method: 'giveItem', args: ['herb', 1, signal] },
    { method: 'loseItem', args: ['tonic', 2] },
    { method: 'loseItem', args: ['herb', 1] },
    { method: 'giveMoney', args: [-120] },
    { method: 'giveMoney', args: [-31] },
  ])
})

test('audio and ambience use their resource IDs and runtime ownership', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'playSound', asset: 'sound.gate' },
      { kind: 'playMusic', asset: 'music.street' },
      { kind: 'stopMusic' },
      { kind: 'setAmbience', ambience: 'night' },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'playSound', args: ['sound.gate'] },
    { method: 'playMusic', args: ['music.street', signal] },
    { method: 'stopMusic', args: [] },
    { method: 'setAmbience', args: ['night'] },
  ])
})

test('shop completion owns the continuation and an outstanding shop receives the caller signal', async () => {
  const signal = new AbortController().signal
  const entered = deferred<void>()
  const close = deferred<void>()
  const { host, calls } = recordScriptHost({
    openShop: (shop, mode, received) => {
      expect({ shop, mode }).toEqual({ shop: 7, mode: 'buy' })
      expect(received).toBe(signal)
      entered.resolve()
      return close.promise
    },
  })
  const done = runAdapterCommands(
    host,
    [
      { kind: 'openShop', shop: 7, mode: 'buy' },
      { kind: 'cameraSnap', to: { col: 1, row: 1, height: 0 } },
    ],
    { signal },
  )
  try {
    await entered.promise
    // Cross one task boundary so even a chain of immediate Promise handlers could reach the tail.
    await nextTestTask()
    expect(calls).toEqual([])
  } finally {
    close.resolve()
    await done
  }
  expect(calls).toStrictEqual([{ method: 'cameraSnap', args: [{ col: 1, row: 1, height: 0 }] }])
})

test('party movement and formation commands preserve order, facing and the optional layer', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  const start = { col: 3, row: 4, height: 0 }
  const goal = { col: 5, row: 6, height: 0 }
  await runAdapterCommands(
    host,
    [
      { kind: 'teleportParty', pos: start, facing: 'up' },
      { kind: 'setPartyFacing', facing: 'down', gesture: 2, member: 1 },
      { kind: 'setPartyFacing', facing: 'left' },
      { kind: 'moveParty', to: goal, speed: 'fast' },
      { kind: 'nudgeParty', dx: 1, dy: -1, layer: 2 },
      { kind: 'nudgeParty', dx: 0, dy: 1, facing: 'right' },
      { kind: 'setParty', members: ['hero', 'friend'] },
      { kind: 'setFollowers', sprites: ['walker', 'guard'] },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'teleportParty', args: [start, 'up'] },
    { method: 'setPartyFacing', args: ['down', 2, 1] },
    { method: 'setPartyFacing', args: ['left', undefined, undefined] },
    { method: 'moveParty', args: [goal, 'fast', signal] },
    { method: 'nudgeParty', args: [1, -1, 2] },
    { method: 'nudgeParty', args: [0, 1, 0, 'right'] },
    { method: 'setParty', args: [['hero', 'friend'], signal] },
    { method: 'setFollowers', args: [['walker', 'guard'], signal] },
  ])
})

test('actor ports receive stable actor IDs, exact conditions and only authored appearance fields', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'setActorSprite', actor: 'hero', sprite: 'walker' },
      {
        kind: 'setActorAppearance',
        actor: 'hero',
        spriteId: 'walker',
        portrait: 'portrait',
        battleSprite: 'fighter',
      },
      { kind: 'setActorAppearance', actor: 'friend', battleSprite: 'fighter' },
      { kind: 'setActorAppearance', actor: 'friend', spriteId: 'guard' },
      { kind: 'setActorAppearance', actor: 'friend', portrait: 'friend-portrait' },
      {
        kind: 'applyActorCondition',
        actor: 'hero',
        condition: { kind: 'status', status: 'protect', turns: 7 },
      },
      { kind: 'clearActorCondition', actor: 'hero', condition: { kind: 'poisonResistance' } },
      {
        kind: 'clearActorCondition',
        actor: 'friend',
        condition: { kind: 'status', status: 'protect' },
      },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'setActorSprite', args: ['hero', 'walker', signal] },
    {
      method: 'setActorAppearance',
      args: ['hero', { spriteId: 'walker', portrait: 'portrait', battleSprite: 'fighter' }, signal],
    },
    { method: 'setActorAppearance', args: ['friend', { battleSprite: 'fighter' }, signal] },
    { method: 'setActorAppearance', args: ['friend', { spriteId: 'guard' }, signal] },
    { method: 'setActorAppearance', args: ['friend', { portrait: 'friend-portrait' }, signal] },
    {
      method: 'applyActorCondition',
      args: ['hero', { kind: 'status', status: 'protect', turns: 7 }, signal],
    },
    { method: 'clearActorCondition', args: ['hero', { kind: 'poisonResistance' }, signal] },
    {
      method: 'clearActorCondition',
      args: ['friend', { kind: 'status', status: 'protect' }, signal],
    },
  ])
})

test('party recovery defaults to both pools and legacy role operands reach the existing effects', async () => {
  const { host, calls } = recordScriptHost()
  await runAdapterCommands(host, [
    { kind: 'increaseHpMp', delta: 6 },
    { kind: 'revivePartyAll', tenths: 8 },
    { kind: 'learnSkill', role: 1, skill: 'skill.thunder' },
    { kind: 'unequip', role: 2, slot: 'all' },
    { kind: 'unequip', role: 0, slot: 3 },
  ])
  expect(calls).toStrictEqual([
    { method: 'increaseHpMp', args: [6, 'both'] },
    { method: 'revivePartyAll', args: [8] },
    { method: 'learnSkill', args: [1, 'skill.thunder'] },
    { method: 'unequipRole', args: [2, 'all'] },
    { method: 'unequipRole', args: [0, 3] },
  ])
})

test('game over, loading and return to title use current lifetime ports', async () => {
  const { host, calls } = recordScriptHost()
  const signal = new AbortController().signal
  await runAdapterCommands(
    host,
    [
      { kind: 'loadLastSave' },
      { kind: 'gameOver' },
      { kind: 'quitToTitle', videos: ['video.ending'] },
      { kind: 'fleeBattle' },
    ],
    { signal },
  )
  expect(calls).toStrictEqual([
    { method: 'loadLastSave', args: [signal] },
    { method: 'gameOver', args: [signal] },
    { method: 'quitToTitle', args: [['video.ending'], signal] },
    { method: 'fleeBattle', args: [] },
  ])
})

test.each([
  [
    { kind: 'runEntityTrigger', target: villageEntity('guide') },
    'runEntityTrigger 必须由当前 project runtime 调用桥执行',
  ],
  [{ kind: 'endBattle', result: 'terminate' }, 'endBattle 只能用于战斗演出脚本'],
] satisfies Array<
  [RuntimeCommand, string]
>)('owner-only command %o is rejected before a side effect', async (command, message) => {
  const { host, calls } = recordScriptHost()
  await expect(runAdapterCommands(host, [command])).rejects.toThrow(message)
  expect(calls).toEqual([])
})
