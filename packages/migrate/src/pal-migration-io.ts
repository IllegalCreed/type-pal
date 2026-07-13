import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { MigrateSources, SourceCmd, SourceScene } from './migrate-content.js'
import type { PalMigrationSources } from './pal-migration.js'

function readJson<T>(repo: string, rel: string): T {
  return JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
}

/** 只读取提取源；本模块中不得出现 projects/pal 路径。 */
export function loadPalMigrationSources(repo: string): PalMigrationSources {
  const allPath = resolve(repo, 'data/extracted/events/all.json')
  const allText = readFileSync(allPath, 'utf8')
  const allJson = JSON.parse(allText) as PalMigrationSources['allJson']
  const migrate: MigrateSources = {
    roles: readJson<{ roles: MigrateSources['roles'] }>(
      repo,
      'data/extracted/data/player-roles.json',
    ).roles,
    levelUpExp: readJson(repo, 'data/extracted/data/level-up-exp.json'),
    levelUpMagic: readJson(repo, 'data/extracted/data/level-up-magic.json'),
    spells: readJson(repo, 'data/extracted/data/spells.json'),
    magic: readJson(repo, 'data/extracted/data/magic.json'),
    items: readJson(repo, 'data/extracted/data/items.json'),
    commands: allJson.segments.flatMap((segment) => segment.commands),
    enemies: readJson(repo, 'data/extracted/data/enemies.json'),
    enemyObjects: readJson(repo, 'data/extracted/data/enemy-objects.json'),
    enemyTeams: readJson(repo, 'data/extracted/data/enemy-teams.json'),
  }
  const scenes: SourceScene[] = []
  const eventsByScene = new Map<number, SourceCmd[]>()
  for (let id = 0; existsSync(resolve(repo, `data/extracted/data/scene/${id}.json`)); id++) {
    scenes.push(readJson(repo, `data/extracted/data/scene/${id}.json`))
    const eventPath = `data/extracted/events/scene-${String(id).padStart(3, '0')}.json`
    if (!existsSync(resolve(repo, eventPath))) continue
    const events = readJson<{ segments: { commands: SourceCmd[] }[] }>(repo, eventPath)
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
  eventsByScene.set(
    -2,
    allJson.segments.flatMap((segment) => segment.commands),
  )

  return {
    migrate,
    allJson,
    allJsonPrettyBytes: Buffer.byteLength(allText),
    scenes,
    eventsByScene,
    objectPlayers: readJson(repo, 'data/extracted/data/object-players.json'),
    musicMidi: readJson<{ midi: number[] }>(repo, 'data/extracted/data/music-manifest.json').midi,
    battleFields: readJson(repo, 'data/extracted/data/battle-fields.json'),
    objectPoisons: readJson(repo, 'data/extracted/data/object-poisons.json'),
    stores: readJson(repo, 'data/extracted/data/stores.json'),
  }
}
