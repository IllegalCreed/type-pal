import type { LevelUpReport, RewardReport } from '@type-pal/content'
import { expect, test } from 'vitest'
import { buildSettlementScreens } from './settlement.js'

const levelUp: LevelUpReport = {
  characterId: 'hero',
  from: 6,
  to: 7,
  before: {
    level: 6,
    hp: 70,
    maxHP: 100,
    mp: 20,
    maxMP: 40,
    attack: 20,
    magicAttack: 18,
    defense: 16,
    speed: 14,
    luck: 10,
  },
  after: {
    level: 7,
    hp: 110,
    maxHP: 110,
    mp: 48,
    maxMP: 48,
    attack: 25,
    magicAttack: 23,
    defense: 19,
    speed: 17,
    luck: 12,
  },
}

test('按参战顺序逐人显示主升级、隐藏成长与习得', () => {
  const report: RewardReport = {
    exp: 120,
    cash: 35,
    levelUps: [structuredClone(levelUp)],
    hiddenUps: [
      { characterId: 'hero', stat: 'defense', delta: 2 },
      { characterId: 'ally', stat: 'speed', delta: 1 },
      { characterId: 'hero', stat: 'attack', delta: 1 },
    ],
    learned: [
      { characterId: 'hero', skillId: 'heal' },
      { characterId: 'hero', skillId: 'guard' },
      { characterId: 'ally', skillId: 'heal' },
    ],
  }
  const before = structuredClone(report)
  const names = new Map([
    ['hero', '逍遥'],
    ['ally', '灵儿'],
  ])
  const skills = new Map([
    ['heal', '气疗术'],
    ['guard', '护体术'],
  ])
  const screens = buildSettlementScreens(
    report,
    ['ally', 'hero'],
    (id) => names.get(id) ?? id,
    (id) => skills.get(id) ?? id,
  )

  expect(screens).toEqual([
    { kind: 'exp-cash', exp: 120, cash: 35 },
    { kind: 'hidden-up', name: '灵儿', statLabel: '身法', delta: 1 },
    { kind: 'learn-magic', name: '灵儿', magicName: '气疗术' },
    { kind: 'level-up', name: '逍遥', report: levelUp },
    { kind: 'hidden-up', name: '逍遥', statLabel: '防御', delta: 2 },
    { kind: 'hidden-up', name: '逍遥', statLabel: '武术', delta: 1 },
    { kind: 'learn-magic', name: '逍遥', magicName: '气疗术' },
    { kind: 'learn-magic', name: '逍遥', magicName: '护体术' },
  ])
  expect(report).toEqual(before)
})

test('没有经验和成长结果时跳过结算页', () => {
  const report: RewardReport = { exp: 0, cash: 30, levelUps: [], hiddenUps: [], learned: [] }
  expect(
    buildSettlementScreens(
      report,
      ['hero'],
      (id) => id,
      (id) => id,
    ),
  ).toEqual([])
})
