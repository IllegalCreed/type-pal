import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import type { Tilemap } from '@type-pal/shared'
import { loadPalAssets } from './pal-assets.js'
import type { PalContentSupplySources } from './pal-content-supply.js'
import type { SourceScene } from './pal-source-types.js'
import type { SourceCmd } from './source-facts.js'

function readPalSourceJson<T>(repo: string, rel: string): T {
  return JSON.parse(readFileSync(resolve(repo, rel), 'utf8')) as T
}

/** 只读取提取源；本模块中不得出现 projects/pal 路径。 */
export function loadPalSourcePartitions(repo: string): PalContentSupplySources {
  const allPath = resolve(repo, 'data/extracted/events/all.json')
  const allText = readFileSync(allPath, 'utf8')
  const allJson = JSON.parse(allText) as { segments: { commands: SourceCmd[] }[] }
  const migrate: PalContentSupplySources['migrate'] = {
    roles: readPalSourceJson<{ roles: PalContentSupplySources['migrate']['roles'] }>(
      repo,
      'data/extracted/data/player-roles.json',
    ).roles,
    levelUpExp: readPalSourceJson(repo, 'data/extracted/data/level-up-exp.json'),
    items: readPalSourceJson(repo, 'data/extracted/data/items.json'),
    commands: allJson.segments.flatMap((segment) => segment.commands),
  }
  const scenes: SourceScene[] = []
  for (let id = 0; existsSync(resolve(repo, `data/extracted/data/scene/${id}.json`)); id++) {
    scenes.push(readPalSourceJson(repo, `data/extracted/data/scene/${id}.json`))
  }
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

  const musicMidi = readPalSourceJson<{ midi: number[] }>(
    repo,
    'data/extracted/data/music-manifest.json',
  ).midi
  const assets = loadPalAssets(
    repo,
    musicMidi,
    tilemaps.map(({ mapNum }) => mapNum),
  )
  return {
    migrate,
    scenes: scenes.slice(0, 294),
    tilemaps,
    objectPlayers: readPalSourceJson(repo, 'data/extracted/data/object-players.json'),
    musicMidi,
    assetCatalog: assets.catalog,
    binaryAssets: assets.binaries,
    worldSpriteFrameCounts: assets.worldSpriteFrameCounts,
    assetReport: assets.report,
    stores: readPalSourceJson(repo, 'data/extracted/data/stores.json'),
  }
}
