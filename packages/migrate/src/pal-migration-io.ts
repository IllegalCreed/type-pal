import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import type { BattleFieldDef } from '@type-pal/content'
import type { PalMigrationSources } from './pal-migration.js'
import { loadPalSourcePartitions, readPalSourceJson as readJson } from './pal-source-io.js'
import type { SourceCmd } from './source-facts.js'

/** 完整脚本审计仍消费原事件/技能/敌 AI 源；current 供应只用共享静态分区。 */
export function loadPalMigrationSources(repo: string): PalMigrationSources {
  const supply = loadPalSourcePartitions(repo)
  const eventsByScene = new Map<number, SourceCmd[]>()
  for (let id = 0; id <= supply.scenes.length; id++) {
    const path = `data/extracted/events/scene-${String(id).padStart(3, '0')}.json`
    if (!existsSync(resolve(repo, path))) continue
    const events = readJson<{ segments: { commands: SourceCmd[] }[] }>(repo, path)
    eventsByScene.set(
      id,
      events.segments.flatMap((segment) => segment.commands),
    )
  }
  const sharedPath = 'data/extracted/events/shared.json'
  if (existsSync(resolve(repo, sharedPath))) {
    const shared = readJson<{ segments: { commands: SourceCmd[] }[] }>(repo, sharedPath)
    eventsByScene.set(
      -1,
      shared.segments.flatMap((segment) => segment.commands),
    )
  }
  eventsByScene.set(-2, supply.migrate.commands)
  return {
    ...supply,
    migrate: {
      ...supply.migrate,
      levelUpMagic: readJson(repo, 'data/extracted/data/level-up-magic.json'),
      spells: readJson(repo, 'data/extracted/data/spells.json'),
      magic: readJson(repo, 'data/extracted/data/magic.json'),
      objectMagics: readJson(repo, 'data/extracted/data/object-magics.json'),
      enemies: readJson(repo, 'data/extracted/data/enemies.json'),
      enemyObjects: readJson(repo, 'data/extracted/data/enemy-objects.json'),
      enemyTeams: readJson(repo, 'data/extracted/data/enemy-teams.json'),
    },
    eventsByScene,
    battleEffectIndex: readJson<number[]>(repo, 'data/extracted/data/battle-effect-index.json'),
    battleFields: readJson<BattleFieldDef[]>(repo, 'data/extracted/data/battle-fields.json'),
    objectPoisons: readJson(repo, 'data/extracted/data/object-poisons.json'),
  }
}
