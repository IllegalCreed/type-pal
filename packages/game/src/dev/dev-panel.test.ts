/** Extracted-asset roster truth; full profile only. */
import { existsSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { BOSS_ROSTER } from './dev-panel.js'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(HERE, '../../../../data/extracted/data')

// BOSS_ROSTER 数据接地回归:每个 boss 的 teamId/enemyId 必须对得上真 enemy-teams.json / enemies.json,
//   防未来手改 roster 引入 typo(2026-06-05 byte-level 核过当时全 18 条;此测固化)。extracted 缺 → skip。
const hasExtracted =
  existsSync(resolve(DATA_DIR, 'enemy-teams.json')) && existsSync(resolve(DATA_DIR, 'enemies.json'))
;(hasExtracted ? describe : describe.skip)(
  'BOSS_ROSTER 数据接地(enemy-teams.json / enemies.json 真值核对)',
  () => {
    const teams: any[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'enemy-teams.json'), 'utf-8'))
    const enemies: any[] = JSON.parse(readFileSync(resolve(DATA_DIR, 'enemies.json'), 'utf-8'))

    it('每条 boss:teamId 存在 / enemyId 有名字 / 代表敌人确在该 team 内', () => {
      for (const boss of BOSS_ROSTER) {
        const team = teams.find((t) => t.id === boss.teamId)
        expect(team, `teamId ${boss.teamId}(${boss.label})不存在于 enemy-teams.json`).toBeDefined()
        const enemy = enemies.find((e) => e.id === boss.enemyId)
        expect(enemy?._name, `enemyId ${boss.enemyId}(${boss.label})无名字`).toBeTruthy()
        // 代表敌人必须确在该 team 的 slot 里(防 teamId/enemyId 配错对)
        expect(
          team.enemies.includes(boss.enemyId),
          `${boss.label}:enemy ${boss.enemyId} 不在 team ${boss.teamId} 内`,
        ).toBe(true)
      }
    })

    it('teamId 不重复(同一战不列两次)', () => {
      const ids = BOSS_ROSTER.map((b) => b.teamId)
      expect(new Set(ids).size).toBe(ids.length)
    })
  },
)
