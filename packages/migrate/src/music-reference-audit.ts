import type { AssetCatalogV1 } from '@type-pal/content'
import type { MigrationJson } from './pal-migration.js'

export interface MusicReferenceAudit {
  musicAssets: number
  playMusic: number
  stopMusic: number
  legacyPlayMusicTotal: number
  sceneMusic: number
  sceneBattleMusic: number
  startBattleWithMusic: number
  uniqueMusicRefs: number
  missingMusicRefs: string[]
  legacyMusicKeys: number
  internalBattleCfgMarkers: number
}

const hasOwn = (value: Record<string, unknown>, key: string): boolean => Object.hasOwn(value, key)

/** 统一遍历最终迁移文件，避免各审查脚本因漏掉嵌套命令臂而得出不同口径。 */
export function auditMusicReferences(
  files: ReadonlyMap<string, MigrationJson>,
): MusicReferenceAudit {
  let playMusic = 0
  let stopMusic = 0
  let startBattleWithMusic = 0
  let sceneMusic = 0
  let sceneBattleMusic = 0
  let legacyMusicKeys = 0
  let internalBattleCfgMarkers = 0
  const references = new Set<string>()

  const walk = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    if (!value || typeof value !== 'object') return
    const node = value as Record<string, unknown>
    if (hasOwn(node, 'musicId')) legacyMusicKeys++
    if (hasOwn(node, 'battleMusicId')) legacyMusicKeys++
    if (node.kind === 'overrideSceneBattle') internalBattleCfgMarkers++
    if (node.kind === 'playMusic') {
      if (typeof node.asset !== 'string') throw new Error('playMusic 缺 AssetId')
      playMusic++
      references.add(node.asset)
    }
    if (node.kind === 'stopMusic') stopMusic++
    if (node.kind === 'startBattle' && hasOwn(node, 'music')) {
      startBattleWithMusic++
      if (typeof node.music === 'string') references.add(node.music)
    }
    Object.values(node).forEach(walk)
  }

  for (const [path, value] of files) {
    if (/^content\/scenes\/s\d+\.json$/.test(path) && value && typeof value === 'object') {
      const scene = value as Record<string, unknown>
      if (hasOwn(scene, 'music')) {
        sceneMusic++
        if (typeof scene.music === 'string') references.add(scene.music)
      }
      if (hasOwn(scene, 'battleMusic')) {
        sceneBattleMusic++
        if (typeof scene.battleMusic === 'string') references.add(scene.battleMusic)
      }
    }
    walk(value)
  }

  const catalog = files.get('assets/index.json') as unknown as AssetCatalogV1 | undefined
  if (!catalog) throw new Error('音乐引用审计缺 assets/index.json')
  const musicAssets = Object.values(catalog.assets).filter(
    (record) => record.kind === 'music',
  ).length
  const missingMusicRefs = [...references]
    .filter((id) => catalog.assets[id]?.kind !== 'music')
    .sort()
  return {
    musicAssets,
    playMusic,
    stopMusic,
    legacyPlayMusicTotal: playMusic + stopMusic,
    sceneMusic,
    sceneBattleMusic,
    startBattleWithMusic,
    uniqueMusicRefs: references.size,
    missingMusicRefs,
    legacyMusicKeys,
    internalBattleCfgMarkers,
  }
}
