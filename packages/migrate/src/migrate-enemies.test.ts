import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import { enemySlug, mapEnemies, type SourceEnemy, type SourceEnemyObject } from './migrate-enemies.js'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const readJson = <T>(rel: string): T => JSON.parse(readFileSync(root + rel, 'utf8')) as T

const enemies = readJson<SourceEnemy[]>('data/extracted/data/enemies.json')
const enemyObjects = readJson<SourceEnemyObject[]>('data/extracted/data/enemy-objects.json')
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
    expect(slime.spriteNum).toBe(1) // = enemyId
    expect(slime.stats.health).toBe(src.health)
    expect(slime.stats.attackStrength).toBe(src.attackStrength)
    expect(slime.stats.defense).toBe(src.defense)
    expect(slime.stats.exp).toBe(src.exp)
    expect(slime.stats.elemResistance).toEqual(src.elemResistance)
    expect(slime.stats.dualMove).toBe(src.dualMove !== 0)
    expect(slime.anim.attackFrames).toBe(src.attackFrames)
    expect(slime.sounds.death).toBe(src.deathSound)
  })
  test('AI:magic/magicRate 来自 enemies,resistanceToSorcery 来自 enemy-objects', () => {
    for (const eo of enemyObjects) {
      const def = byId.get(enemySlug(eo.objectIndex))
      if (!def) continue
      const src = enemies.find((e) => e.id === eo.enemyId)!
      expect(def.ai.magic).toBe(src.magic)
      expect(def.ai.magicRate).toBe(src.magicRate)
      expect(def.ai.resistanceToSorcery).toBe(eo.resistanceToSorcery) // 抗异常在 object 侧
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
})
