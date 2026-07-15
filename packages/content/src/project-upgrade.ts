import type {
  AssetCatalogV1,
  AssetId,
  AssetRole,
  LegacyAssetConfigV3,
  LegacyAssetFamily,
} from './asset.js'
import { palMusicAssetId, validateAssetCatalog, validateManifestAssetConfigV3 } from './asset.js'
import type { LoadedManifest } from './character.js'

interface ManifestV2 {
  id: string
  name: string
  contentVersion: 2
  entryScene: string
  entryPoints?: LoadedManifest['entryPoints']
  content: Record<string, string>
  assets?: Record<string, unknown>
  startWorld: LoadedManifest['startWorld']
}

function object(value: unknown, where: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${where}: 期望对象`)
  return value as Record<string, unknown>
}

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function legacyFamilies(assets: Record<string, unknown>): LegacyAssetFamily[] {
  const families = new Set<LegacyAssetFamily>()
  if (assets.root !== undefined)
    for (const family of [
      'battle-sprite',
      'effect-sprite',
      'battle-background',
      'rng',
      'video',
      'glyph-table',
      'ui-image',
      'image',
    ] as const)
      families.add(family)
  if (assets.tilesets !== undefined) families.add('tileset')
  if (assets.sprites !== undefined) families.add('sprite')
  if (assets.palettes !== undefined) families.add('color-table')
  if (assets.sounds !== undefined) families.add('sound')
  if (assets.portraits !== undefined) families.add('portrait')
  if (assets.faces !== undefined) families.add('face')
  if (assets.itemIcons !== undefined) families.add('item-icon')
  return [...families]
}

/**
 * v2 清单 -> v3 清单纯变换。调用方先用注入 reader/hash 建好 catalog；本函数不读文件。
 * 音乐族不会进入 legacy，旧 music 目录只允许在升级边界被消费一次。
 */
export function upgradeManifestV2ToV3(args: {
  manifest: unknown
  catalog: AssetCatalogV1
  roles?: Partial<Record<AssetRole, AssetId>>
  catalogPath?: string
}): LoadedManifest {
  const raw = object(args.manifest, 'manifest') as unknown as ManifestV2
  if (raw.contentVersion !== 2) throw new Error(`manifest: 期望 contentVersion 2`)
  const oldAssets = object(raw.assets ?? {}, 'manifest.assets')
  const content = { ...raw.content }
  delete content.music
  const legacy: LegacyAssetConfigV3 = {
    families: legacyFamilies(oldAssets),
    ...Object.fromEntries(
      [
        'root',
        'tilesets',
        'sprites',
        'palettes',
        'sounds',
        'portraits',
        'faces',
        'itemIcons',
        'ui',
        'images',
        'rng',
        'videos',
      ].flatMap((key) => (typeof oldAssets[key] === 'string' ? [[key, oldAssets[key]]] : [])),
    ),
  }
  const catalog = validateAssetCatalog(args.catalog)
  const assets = {
    catalog: args.catalogPath ?? 'assets/index.json',
    roles: { ...args.roles },
    ...(legacy.families.length ? { legacy } : {}),
  }
  validateManifestAssetConfigV3(assets, catalog)
  return {
    id: raw.id,
    name: raw.name,
    contentVersion: 3,
    entryScene: raw.entryScene,
    ...(raw.entryPoints ? { entryPoints: cloneJson(raw.entryPoints) } : {}),
    content,
    assets,
    startWorld: cloneJson(raw.startWorld),
  }
}

function numericTrack(value: unknown): number | undefined {
  const track = typeof value === 'number' ? value : Number(value)
  return Number.isInteger(track) ? track : undefined
}

/** 递归升级场景、脚本 chunk、敌人编舞中的旧音乐字段；输入不原地修改。 */
export function upgradeV2MusicReferences<T>(input: T): T {
  const walk = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(walk)
    if (!value || typeof value !== 'object') return value
    const source = value as Record<string, unknown>
    if (source.kind === 'playMusic' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`playMusic.musicId: 期望整数`)
      const rest = Object.fromEntries(
        Object.entries(source).filter(([key]) => key !== 'musicId' && key !== 'kind'),
      )
      return track <= 0
        ? {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'stopMusic',
          }
        : {
            ...Object.fromEntries(Object.entries(rest).map(([key, child]) => [key, walk(child)])),
            kind: 'playMusic',
            asset: palMusicAssetId(track),
          }
    }
    const output: Record<string, unknown> = {}
    for (const [key, child] of Object.entries(source)) {
      if (key === 'musicId' || key === 'battleMusicId') continue
      output[key] = walk(child)
    }
    if (source.kind === 'startBattle' && 'musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`startBattle.musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    } else if ('musicId' in source) {
      const track = numericTrack(source.musicId)
      if (track === undefined) throw new Error(`musicId: 期望整数`)
      output.music = track <= 0 ? null : palMusicAssetId(track)
    }
    if ('battleMusicId' in source) {
      const track = numericTrack(source.battleMusicId)
      if (track === undefined) throw new Error(`battleMusicId: 期望整数`)
      output.battleMusic = track <= 0 ? null : palMusicAssetId(track)
    }
    return output
  }
  return walk(input) as T
}

/** 旧 music.json 的作者别名合并进 catalog label；无别名条目不制造第二份数据。 */
export function applyV2MusicLabels(catalog: AssetCatalogV1, legacyMusic: unknown): AssetCatalogV1 {
  const next = cloneJson(validateAssetCatalog(catalog))
  if (!Array.isArray(legacyMusic)) throw new Error('content/music.json: 期望数组')
  for (const [index, raw] of legacyMusic.entries()) {
    const entry = object(raw, `content/music.json[${index}]`)
    const track = numericTrack(entry.id)
    if (track === undefined || track <= 0)
      throw new Error(`content/music.json[${index}].id: 期望正整数`)
    const record = next.assets[palMusicAssetId(track)]
    if (!record) throw new Error(`旧音乐 ${track} 在 catalog 中无对应 AssetId`)
    if (entry.name !== undefined) {
      if (typeof entry.name !== 'string')
        throw new Error(`content/music.json[${index}].name: 期望字符串`)
      record.label = entry.name
    }
  }
  return next
}
