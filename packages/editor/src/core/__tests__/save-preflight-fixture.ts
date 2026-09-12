/**
 * preflight-r1 窄输入 helper：只组装合法保存输入与断言所需数据，不实现环境或产品协议。
 * 复用 buildSeedAssets 产出真实 canonical gzip/RLE 字节（与 blank 项目同一生成管线）。
 */
import type { AssetCatalogV1 } from '@type-pal/content'
import { sha256Hex } from '../binary-signature.js'
import { buildSeedAssets } from '../seed-assets.js'

export interface PreflightAsset {
  kind: 'tileset' | 'sprite' | 'battle-sprite'
  id: string
  path: string
  bytes: ArrayBuffer
}

/** blank 项目三类生成资产的真实路径与合法字节（seed.ts:82-90 同一清单）。 */
export async function preflightAssets(): Promise<
  Record<'tileset' | 'sprite' | 'battle-sprite', PreflightAsset>
> {
  const { tilesetRle, spriteRle, battleSpriteRle } = await buildSeedAssets()
  return {
    tileset: {
      kind: 'tileset',
      id: 'tileset.generated.starter',
      path: 'assets/generated/tilesets/starter.rle',
      bytes: tilesetRle,
    },
    sprite: {
      kind: 'sprite',
      id: 'sprite.generated.starter',
      path: 'assets/generated/sprites/starter.rle',
      bytes: spriteRle,
    },
    'battle-sprite': {
      kind: 'battle-sprite',
      id: 'battle-sprite.generated.starter',
      path: 'assets/generated/battle-sprites/starter.rle',
      bytes: battleSpriteRle,
    },
  }
}

export type CatalogRecord = AssetCatalogV1['assets'][string]

/** 按目标资产构造“单记录 catalog + 单二进制输入”的最小合法保存输入。 */
export async function singleAssetInput(asset: PreflightAsset): Promise<{
  files: Record<string, unknown>
  catalogPath: string
  record: CatalogRecord
}> {
  const catalogPath = 'assets/index.json'
  const record = {
    kind: asset.kind,
    path: asset.path,
    mediaType: 'application/vnd.type-pal.rle',
    bytes: asset.bytes.byteLength,
    sha256: await sha256Hex(asset.bytes),
    label: `preflight ${asset.kind}`,
    origin: { kind: 'generated' },
  } as CatalogRecord
  return {
    files: {
      'manifest.json': { assets: { catalog: catalogPath } },
      [catalogPath]: { version: 1, assets: { [asset.id]: record } },
      [asset.path]: asset.bytes,
    },
    catalogPath,
    record,
  }
}

/** 修改 catalog 记录的单个数值/摘要字段并保持其余不变。 */
export function withRecord(
  files: Record<string, unknown>,
  catalogPath: string,
  patch: Partial<Record<'bytes' | 'sha256', string | number>>,
): Record<string, unknown> {
  const catalog = structuredClone(files[catalogPath]) as {
    assets: Record<string, CatalogRecord>
  }
  const [id, record] = Object.entries(catalog.assets)[0]!
  catalog.assets[id] = { ...record, ...patch } as CatalogRecord
  return { ...files, [catalogPath]: catalog }
}
