import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import {
  enemySlug,
  mapEnemies,
  mapEnemyTeams,
  type SourceEnemy,
  type SourceEnemyObject,
  type SourceEnemyTeam,
} from './migrate-enemies.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

const enemies = readJson<SourceEnemy[]>('data/extracted/data/enemies.json')
const enemyObjects = readJson<SourceEnemyObject[]>('data/extracted/data/enemy-objects.json')
const enemyTeams = readJson<SourceEnemyTeam[]>('data/extracted/data/enemy-teams.json')
const out = mapEnemies(enemies, enemyObjects)
const byId = new Map(out.enemies.map((e) => [e.id, e]))

describe('M4a 敌人迁移(enemies + enemy-objects 合并)', () => {
  test('153 对象全迁,0 越界,54 有 AI 脚本', () => {
    expect(out.enemies).toHaveLength(153)
    expect(out.report.total).toBe(153)
    expect(out.report.danglingEnemyId).toEqual([])
    expect(out.report.withScript).toBe(54)
  })
  test('史莱姆(objectIndex 398, enemyId 1)= stats 逐字段对齐 enemies[1]', () => {
    const slime = byId.get(enemySlug(398))!
    const src = enemies.find((e) => e.id === 1)!
    expect(slime.name).toBe('name.enemy-398')
    expect(out.localeNames['name.enemy-398']).toBe('史莱姆')
    expect(slime.battleSprite).toBe('enemy-battle-1') // = enemyId 对应定义
    expect(slime.yPosOffset).toBe(src.yPosOffset)
    expect(slime.stats.health).toBe(src.health)
    expect(slime.stats.attackStrength).toBe(src.attackStrength)
    expect(slime.stats.defense).toBe(src.defense)
    expect(slime.stats.exp).toBe(src.exp)
    expect(slime.stats.elemResistance).toEqual(src.elemResistance)
    expect(slime.stats.dualMove).toBe(src.dualMove !== 0)
    expect(slime.sounds.death).toBe(`sound.pal.${String(src.deathSound).padStart(3, '0')}`)
  })
  test('AI(R13-5):源 magic/rate 迁为实例 fallback，不再生成伪 turn rule', () => {
    for (const eo of enemyObjects) {
      const def = byId.get(enemySlug(eo.objectIndex))
      if (!def) continue
      const src = enemies.find((e) => e.id === eo.enemyId)!
      expect(def.ai.resistanceToSorcery).toBe(eo.resistanceToSorcery)
      if (src.magic !== 0 && src.magicRate > 0) {
        expect(def.ai.fallback).toEqual({
          action:
            src.magic === 0xffff ? { kind: 'pass' } : { kind: 'cast', skillId: String(src.magic) },
          chancePercent: Math.min(100, src.magicRate * 10),
        })
      } else {
        expect(def.ai.fallback).toBeUndefined()
      }
      expect(def.ai.rules).toBeUndefined()
    }
  })
  test('dualMove 敌人存在(回合两动);collectValue>0 敌人存在(可收妖)', () => {
    expect(out.enemies.some((e) => e.stats.dualMove)).toBe(true)
    expect(out.enemies.some((e) => e.stats.collectValue > 0)).toBe(true)
  })
  test('steal/attackEquivItem 仅在源非 0 时出现', () => {
    for (const eo of enemyObjects) {
      const def = byId.get(enemySlug(eo.objectIndex))
      if (!def) continue
      const src = enemies.find((e) => e.id === eo.enemyId)!
      expect('steal' in def).toBe(src.stealItem !== 0)
      expect('attackEquivItem' in def).toBe(src.attackEquivItem !== 0)
    }
  })
  test('五项音效 0 省略；25 个负 magic 拆为绝对 AssetId + 显式抑制语义', () => {
    expect(out.enemies.filter((enemy) => enemy.sounds.suppressMagicEffectSound)).toHaveLength(25)
    for (const eo of enemyObjects) {
      const def = byId.get(enemySlug(eo.objectIndex))
      const src = enemies.find((enemy) => enemy.id === eo.enemyId)
      if (!def || !src) continue
      for (const [field, value] of [
        ['attack', src.attackSound],
        ['action', src.actionSound],
        ['magic', src.magicSound],
        ['death', src.deathSound],
        ['call', src.callSound],
      ] as const) {
        expect(def.sounds[field]).toBe(
          value === 0 ? undefined : `sound.pal.${String(Math.abs(value)).padStart(3, '0')}`,
        )
      }
      expect(def.sounds.suppressMagicEffectSound).toBe(src.magicSound < 0 ? true : undefined)
    }
  })
})

describe('B10 敌队语义槽迁移', () => {
  test('65535 跳过、0 保留 null、有效敌保序，未知引用 fail-loud', () => {
    expect(
      mapEnemyTeams(
        [{ id: 7, enemyObjectIndexes: [65535, 0, 398, 65535, 0] }],
        new Set(['enemy-398']),
      ).teams,
    ).toEqual([{ id: 'team-7', slots: [null, 'enemy-398', null] }])
    expect(() =>
      mapEnemyTeams([{ id: 8, enemyObjectIndexes: [999] }], new Set(['enemy-398'])),
    ).toThrow(/team-8.*enemy-999/)
  })

  test('PAL 全源 census：380/1900 → 861 语义槽（104 null + 757 敌），68/56 空槽队', () => {
    const mapped = mapEnemyTeams(enemyTeams, new Set(out.enemies.map((entry) => entry.id))).teams
    const sourceEntries = enemyTeams.flatMap((team) => team.enemyObjectIndexes)
    const slots = mapped.flatMap((team) => team.slots)
    const teamsWithEmpty = mapped.filter((team) => team.slots.includes(null))
    const teamsWithEmptyAndTwoEnemies = teamsWithEmpty.filter(
      (team) => team.slots.filter((slot) => slot !== null).length >= 2,
    )

    expect(enemyTeams).toHaveLength(380)
    expect(sourceEntries).toHaveLength(1900)
    expect(sourceEntries.filter((entry) => entry === 65535)).toHaveLength(1039)
    expect(sourceEntries.filter((entry) => entry === 0)).toHaveLength(104)
    expect(slots).toHaveLength(861)
    expect(slots.filter((slot) => slot === null)).toHaveLength(104)
    expect(slots.filter((slot) => slot !== null)).toHaveLength(757)
    expect(teamsWithEmpty).toHaveLength(68)
    expect(teamsWithEmptyAndTwoEnemies).toHaveLength(56)
  })
})
