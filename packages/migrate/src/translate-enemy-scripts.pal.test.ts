import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  checkEnemyHookFlow,
  type EnemyDef,
  type EnemyHookChannel,
  type EnemyHookFlow,
} from '@type-pal/content'
import { describe, expect, test } from 'vitest'
import { mapEnemies, type SourceEnemy, type SourceEnemyObject } from './migrate-enemies.js'
import type { SourceCmd } from './source-facts.js'
import { emptyTranslateReport, type TranslateCtx } from './translate-events.js'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../../..')
const extracted = resolve(repo, 'data/extracted/events/all.json')

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(resolve(repo, relative), 'utf8')) as T
}

interface PalFixture {
  enemies: EnemyDef[]
  report: ReturnType<typeof mapEnemies>['report']
}

function buildFixture(): PalFixture {
  const commands = readJson<{ segments: { commands: SourceCmd[] }[] }>(
    'data/extracted/events/all.json',
  ).segments.flatMap((segment) => segment.commands)
  const labelAt = new Map<string, { cmds: readonly SourceCmd[]; idx: number }>()
  commands.forEach((_, address) => {
    labelAt.set(`L_${address}`, { cmds: commands, idx: address })
  })
  const ctx: TranslateCtx = {
    labelAt,
    sourceAddressAt: (source, index) => (source === commands ? index : undefined),
    locale: {},
    report: emptyTranslateReport(),
  }
  return mapEnemies(
    readJson<SourceEnemy[]>('data/extracted/data/enemies.json'),
    readJson<SourceEnemyObject[]>('data/extracted/data/enemy-objects.json'),
    ctx,
  )
}

describe.skipIf(!existsSync(extracted))('PAL enemy hook source oracles', () => {
  const fixture = buildFixture()
  const enemy = (id: number): EnemyDef => {
    const hit = fixture.enemies.find((entry) => entry.id === `enemy-${id}`)
    if (!hit) throw new Error(`缺 enemy-${id}`)
    return hit
  }
  const flow = (id: number, channel: EnemyHookChannel): EnemyHookFlow => {
    const hit = enemy(id).ai.hooks?.[channel]
    if (!hit) throw new Error(`enemy-${id} 缺 ${channel}`)
    return hit
  }

  test('153 敌 / 54 带脚本敌完整生成；52 个 persistent hook 全过严格校验', () => {
    expect(fixture.report).toMatchObject({
      total: 153,
      withScript: 54,
      danglingEnemyId: [],
      pendingScripts: [],
    })
    let hooks = 0
    for (const definition of fixture.enemies)
      for (const channel of ['ready', 'turnStart'] as const) {
        const hook = definition.ai.hooks?.[channel]
        if (!hook) continue
        checkEnemyHookFlow(hook, `${definition.id}.ai.hooks.${channel}`)
        hooks++
      }
    expect(hooks).toBe(52)
    expect(fixture.enemies.filter((definition) => definition.onDefeated?.length)).toHaveLength(15)
  })

  test('enemy-483：fade 3s → sound213 → wait1600 → music38 顺序不丢', () => {
    const state = Object.values(flow(483, 'turnStart').states).find((candidate) =>
      candidate.body.some((command) => command.kind === 'stopMusic'),
    )
    expect(
      state?.body.filter((command) =>
        ['stopMusic', 'playSound', 'wait', 'playMusic'].includes(command.kind),
      ),
    ).toEqual([
      { kind: 'stopMusic', fadeMs: 3_000 },
      { kind: 'playSound', asset: 'sound.pal.213' },
      { kind: 'wait', ms: 1_600 },
      { kind: 'playMusic', asset: 'music.pal.038' },
    ])
  })

  test('enemy-519：赵灵儿八项固定成长聚合为一个动作，并先于复活/回满/白闪', () => {
    const state = Object.values(flow(519, 'turnStart').states).find((candidate) =>
      candidate.body.some((command) => command.kind === 'applyActorGrowth'),
    )
    const decisive = state?.body.filter((command) =>
      [
        'playMusic',
        'applyActorGrowth',
        'revivePartyAll',
        'increaseHpMp',
        'playActorCastEffect',
      ].includes(command.kind),
    )
    expect(decisive).toEqual([
      { kind: 'playMusic', asset: 'music.pal.018' },
      {
        kind: 'applyActorGrowth',
        actor: 'zhao-linger',
        delta: {
          level: 11,
          maxHP: 170,
          maxMP: 190,
          attack: 100,
          magicAttack: 155,
          defense: 55,
          speed: 80,
          luck: 30,
        },
      },
      { kind: 'revivePartyAll', tenths: 10 },
      { kind: 'increaseHpMp', delta: 9_999, pools: 'both' },
      {
        kind: 'playActorCastEffect',
        actor: 'zhao-linger',
        effect: 'pre-magic-white-flash',
      },
    ])
  })

  test('enemy-496：0x79 保留盖罗娇在队/不在队两套对白和后续状态', () => {
    const hook = flow(496, 'turnStart')
    expect(hook.states.initial?.next).toMatchObject({
      kind: 'branch',
      cond: { kind: 'playerInParty', role: 'gai-luojiao' },
      then: { kind: 'continue' },
      else: { kind: 'continue' },
    })
    const texts = Object.values(hook.states)
      .flatMap((state) => state.body)
      .filter((command) => command.kind === 'dialog')
      .map((command) => command.cue.rows[0]?.text)
    expect(texts).toContain('dlg.13219')
    expect(texts).toContain('dlg.13242')
  })

  test('enemy-499：flee 后保留 0x06 的 29% 说明对白 / 71% 跳过分支', () => {
    const hook = flow(499, 'turnStart')
    const fleeing = Object.values(hook.states).find((state) =>
      state.body.some((command) => command.kind === 'fleeBattle'),
    )
    expect(fleeing?.next).toEqual({
      kind: 'branch',
      cond: { kind: 'chance', percent: 29 },
      then: { kind: 'continue', state: expect.any(String) },
      else: { kind: 'stay' },
    })
    const target =
      fleeing?.next.kind === 'branch' && fleeing.next.then.kind === 'continue'
        ? hook.states[fleeing.next.then.state]
        : undefined
    expect(target?.body[0]).toMatchObject({
      kind: 'dialog',
      cue: { rows: [{ text: 'dlg.13106' }] },
    })
  })

  test('enemy-473：旧 pending 账外的三个 summon failure target 全绑定 outcome', () => {
    const outcomes = Object.values(flow(473, 'ready').states)
      .map((state) => state.next)
      .filter((next) => next.kind === 'commandOutcome')
      .map((next) => next.commandId)
    expect(outcomes).toEqual(
      expect.arrayContaining(['effect-42524', 'effect-42545', 'effect-42554']),
    )
  })

  test('enemy-546：三次 advance 后仍进入 0xA2[14]，三个 summon failure 臂不丢', () => {
    const hook = flow(546, 'ready')
    const random = Object.values(hook.states)
      .map((state) => state.next)
      .find((next) => next.kind === 'random')
    expect(random).toMatchObject({
      kind: 'random',
      choices: Array.from({ length: 14 }, () => ({
        weight: 1,
        then: { kind: 'continue', state: expect.any(String) },
      })),
    })
    const outcomes = Object.values(hook.states)
      .map((state) => state.next)
      .filter((next) => next.kind === 'commandOutcome')
      .map((next) => next.commandId)
    expect(outcomes).toEqual(
      expect.arrayContaining(['effect-43006', 'effect-43009', 'effect-43012']),
    )
  })

  test('enemy-547：0xA2 四臂只保留一个 random transition', () => {
    expect(flow(547, 'ready').states.initial?.next).toMatchObject({
      kind: 'random',
      choices: Array.from({ length: 4 }, () => ({
        weight: 1,
        then: { kind: 'continue', state: expect.any(String) },
      })),
    })
  })
})
