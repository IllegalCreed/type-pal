import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Tilemap } from '@type-pal/shared'
import type { MigrateSources, SourceCmd, SourceScene } from './migrate-content.js'
import { loadPalAudioAssets } from './pal-assets.js'
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

  if (scenes.length !== 295) throw new Error(`PAL 场景源期望 295 个，收到 ${scenes.length}`)
  const stub = scenes[294]
  if (
    !stub ||
    stub.sceneId !== 294 ||
    stub.mapNum !== 0 ||
    stub.eventObjects.length !== 0 ||
    stub.onEnterLabel !== undefined ||
    stub.onTeleportLabel !== undefined
  )
    throw new Error('s294 不再是精确空 stub；停止迁移并重新审计场景全集')
  if (scenes.slice(0, 294).some((scene) => scene.mapNum <= 0))
    throw new Error('s000-s293 出现非正 mapNum；停止迁移')

  const tilemapDir = resolve(repo, 'data/extracted/data/tilemap')
  const tilemaps = readdirSync(tilemapDir)
    .filter((name) => /^\d+\.json$/.test(name))
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10))
    .map((name) => {
      const text = readFileSync(resolve(tilemapDir, name), 'utf8')
      return {
        mapNum: Number.parseInt(name, 10),
        source: JSON.parse(text) as Tilemap,
        sourceJsonBytes: Buffer.byteLength(text),
      }
    })
  if (tilemaps.length !== 223) throw new Error(`PAL 地图源期望 223 张，收到 ${tilemaps.length}`)

  const musicMidi = readJson<{ midi: number[] }>(
    repo,
    'data/extracted/data/music-manifest.json',
  ).midi
  const audio = loadPalAudioAssets(repo, musicMidi)
  return {
    migrate,
    allJson,
    allJsonPrettyBytes: Buffer.byteLength(allText),
    scenes: scenes.slice(0, 294),
    eventsByScene,
    tilemaps,
    objectPlayers: readJson(repo, 'data/extracted/data/object-players.json'),
    musicMidi,
    assetCatalog: audio.catalog,
    binaryAssets: audio.binaries,
    battleFields: readJson(repo, 'data/extracted/data/battle-fields.json'),
    objectPoisons: readJson(repo, 'data/extracted/data/object-poisons.json'),
    stores: readJson(repo, 'data/extracted/data/stores.json'),
  }
}
