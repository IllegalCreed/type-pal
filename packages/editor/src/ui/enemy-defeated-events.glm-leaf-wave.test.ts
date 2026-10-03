// @vitest-environment jsdom
import type { AuthorEnemyDef, ItemData, Locale } from '@type-pal/content'

type Commands = NonNullable<AuthorEnemyDef['onDefeated']>

import { describe, expect, test } from 'vitest'
import {
  createEnemyDefeatedPresentationContext,
  findEditableEnemyDefeatedItemReward,
  replaceEditableEnemyDefeatedItemReward,
} from './enemy-defeated-events.js'

const locale: Locale = { 'item.herb': '草药', 'dlg.bye': '后会有期' }

const items: ItemData[] = [
  { id: 'herb', name: 'item.herb', desc: [], buyPrice: 0, sellPrice: 0, sellable: false },
]

const context = createEnemyDefeatedPresentationContext({
  locale,
  items,
  assetCatalog: { version: 1, assets: {} },
  worldVariables: {},
  actors: [],
  scenes: [],
})

function snapshot(value: unknown): unknown {
  return JSON.parse(JSON.stringify(value))
}

describe('createEnemyDefeatedPresentationContext 剩余合同', () => {
  test('resolves item labels through locale and flags missing references', () => {
    expect(context.item('herb')).toEqual({ id: 'herb', label: '草药', invalid: false })
    expect(context.item('gone')).toMatchObject({ id: 'gone', invalid: true })
    expect(context.asset('gone', 'music')).toMatchObject({ invalid: true })
    expect(context.variable('gone', 'flag')).toMatchObject({ invalid: true })
    expect(context.actor('gone')).toMatchObject({ invalid: true })
    expect(context.scene('gone')).toMatchObject({ invalid: true })
    expect(context.entity('s001', 'e1')).toMatchObject({ invalid: true })
  })
})

describe('findEditableEnemyDefeatedItemReward 剩余合同', () => {
  test('finds a plain giveItem with probability, count and trailing dialog', () => {
    const commands = [
      { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] } },
      { kind: 'branch', cond: { kind: 'chance', percent: 25 }, then: [{ kind: 'returnScript' }] },
      { kind: 'giveItem', itemId: 'herb', count: 3 },
      { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] } },
    ] satisfies Commands
    const reward = findEditableEnemyDefeatedItemReward(commands)
    expect(reward).toMatchObject({
      startIndex: 1,
      endIndex: 4,
      itemId: 'herb',
      count: 3,
      probability: 75,
    })
    expect(reward?.dialog).toEqual({
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] },
    })
  })

  test('rejects multiple gives, gives after branches, and empty command lists', () => {
    expect(findEditableEnemyDefeatedItemReward(undefined)).toBeUndefined()
    expect(findEditableEnemyDefeatedItemReward([])).toBeUndefined()
    const doubleGive: Commands = [
      { kind: 'giveItem', itemId: 'herb', count: 1 },
      { kind: 'giveItem', itemId: 'herb', count: 2 },
    ]
    expect(findEditableEnemyDefeatedItemReward(doubleGive)).toBeUndefined()
    const afterBranch: Commands = [
      { kind: 'branch', cond: { kind: 'chance', percent: 50 }, then: [{ kind: 'returnScript' }] },
      { kind: 'branch', cond: { kind: 'chance', percent: 50 }, then: [{ kind: 'returnScript' }] },
      { kind: 'giveItem', itemId: 'herb', count: 1 },
    ]
    expect(findEditableEnemyDefeatedItemReward(afterBranch)).toBeUndefined()
  })
})

describe('replaceEditableEnemyDefeatedItemReward 剩余合同', () => {
  test('rewrites probability branch, item and keeps the trailing dialog text', () => {
    const commands = [
      { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] } },
      { kind: 'branch', cond: { kind: 'chance', percent: 25 }, then: [{ kind: 'returnScript' }] },
      { kind: 'giveItem', itemId: 'herb', count: 1 },
      { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] } },
    ] satisfies Commands
    const current = findEditableEnemyDefeatedItemReward(commands)!
    const next = replaceEditableEnemyDefeatedItemReward(commands, current, {
      itemId: 'herb',
      count: 5,
      probability: 75,
    })
    expect(next).toHaveLength(4)
    expect(next?.[0]).toEqual({
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] },
    })
    expect(next?.[1]).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: 25 },
      then: [{ kind: 'returnScript' }],
    })
    expect(next?.[2]).toEqual({ kind: 'giveItem', itemId: 'herb', count: 5 })
    expect(next?.[3]).toEqual({
      kind: 'dialog',
      cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] },
    })
  })

  test('removing the reward drops the give chain and keeps unrelated leading commands', () => {
    const commands = [
      { kind: 'giveItem', itemId: 'herb', count: 2 },
      { kind: 'dialog', cue: { identity: { kind: 'narration' }, rows: [{ text: 'dlg.bye' }] } },
    ] satisfies Commands
    const current = findEditableEnemyDefeatedItemReward(commands)!
    const next = replaceEditableEnemyDefeatedItemReward(commands, current, undefined)
    // 全部命令都在奖励链内时返回 undefined（无剩余正文）而非空数组。
    expect(next).toBeUndefined()
    // 输入保真：原 commands 数组不被原地修改。
    expect(snapshot(commands)).toHaveLength(2)
  })
})
