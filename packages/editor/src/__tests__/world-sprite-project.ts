/** Gzip RLE assets and definitions admitted through the current project loader. */

import {
  type AssetId,
  type AssetRecordV1,
  type AuthorSceneDef,
  type AuthorScriptLibrary,
  SCENE_INDEX_PATH,
  type SpriteDef,
  type SpriteLayout,
  validateAuthorScenes,
  validateSceneIndex,
} from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  decodeWorldSpriteAssetBytes,
  encodeSpriteChunk,
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../core/binary-signature.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { toEditorState } from '../core/project-io.js'
import { buildBlankProject } from '../core/seed.js'
import { buildSeedAssets } from '../core/seed-assets.js'
import { atlasColors, solidRgba } from './png-fixtures.js'
import { loadFixtureProjectMaps } from './project-map-fixtures.js'

export interface WorldSpriteFixture {
  asset: AssetId
  label: string
  frameCount: number
  /** Offset into the shared fixture colors to encode distinct revisions of the same frame count. */
  colorOffset?: number
  /** Per-frame pixel dimensions for source-viewer metadata. */
  frameSizes?: readonly (readonly [number, number])[]
  /** 写入 catalog 合法但 gzip/RLE 不可解码的字节（测真实失败链）。 */
  corruptBytes?: boolean
  definitions: readonly {
    id: string
    label: string
    layout: SpriteLayout
    poses?: SpriteDef['poses']
  }[]
}

export interface SeededWorldSprite {
  asset: AssetId
  path: string
  sha256: string
  bytes: ArrayBuffer
  frames: RleFrame[]
}

export interface WorldSpriteProject {
  source: FileSource
  state: EditorState
  assetBase: AssetBase
  disk: ReturnType<typeof memoryAuthorDirectory>
  seeded: ReadonlyMap<AssetId, SeededWorldSprite>
  canonical: { scenes: AuthorSceneDef[]; sharedScripts: AuthorScriptLibrary }
}

const FRAME = 8

export async function loadWorldSpriteProject(
  name: string,
  specs: readonly WorldSpriteFixture[],
  authoring: {
    entities?: AuthorSceneDef['entities']
    additionalScenes?: readonly AuthorSceneDef[]
    sharedScripts?: AuthorScriptLibrary
  } = {},
): Promise<WorldSpriteProject> {
  const { palette } = await buildSeedAssets()
  const files = await buildBlankProject(name)
  if (authoring.entities) {
    const path = 'content/scenes/start.json'
    const [scene] = validateAuthorScenes([files[path]])
    files[path] = { ...scene, entities: authoring.entities }
  }
  if (authoring.additionalScenes?.length) {
    const index = validateSceneIndex(files[SCENE_INDEX_PATH])
    for (const scene of authoring.additionalScenes) {
      const path = `content/scenes/${scene.id}.json`
      index.scenes.push({ id: scene.id, name: scene.id, path })
      files[path] = scene
    }
    files[SCENE_INDEX_PATH] = index
  }
  if (authoring.sharedScripts) files['content/shared-scripts.json'] = authoring.sharedScripts
  const spritesJson = files['content/sprites.json'] as SpriteDef[]
  const catalog = (files['assets/index.json'] as { assets: Record<AssetId, AssetRecordV1> }).assets
  const seeded = new Map<AssetId, SeededWorldSprite>()
  for (const spec of specs) {
    if (Object.hasOwn(catalog, spec.asset))
      throw new Error(`World sprite fixture: AssetId 与现有项目资源冲突 ${spec.asset}`)
    if (spec.frameSizes && spec.frameSizes.length !== spec.frameCount)
      throw new Error(`World sprite fixture: frame size count does not match ${spec.asset}`)
    const colors = atlasColors(Math.min(spec.frameCount, 16), spec.colorOffset)
    const frames = Array.from({ length: spec.frameCount }, (_, index) => {
      const [width, height] = spec.frameSizes?.[index] ?? [FRAME, FRAME]
      return quantizeToRleFrame(
        solidRgba(width, height, colors[index % colors.length]!),
        width,
        height,
        palette,
      )
    })
    const gzip = await compressGzip(encodeSpriteChunk(frames))
    const bytes = spec.corruptBytes
      ? new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]).buffer
      : (gzip.buffer.slice(gzip.byteOffset, gzip.byteOffset + gzip.byteLength) as ArrayBuffer)
    const sha256 = await sha256Hex(bytes)
    const path = `assets/authored/sprites/${sha256}.rle`
    const record: AssetRecordV1 = {
      kind: 'sprite',
      path,
      mediaType: 'application/vnd.type-pal.rle',
      bytes: bytes.byteLength,
      sha256,
      label: spec.label,
      origin: { kind: 'authored' },
    }
    catalog[spec.asset] = record
    files[path] = bytes
    for (const definition of spec.definitions)
      spritesJson.push({
        id: definition.id,
        asset: spec.asset,
        label: definition.label,
        layout: definition.layout,
        ...(definition.poses ? { poses: definition.poses } : {}),
      })
    seeded.set(spec.asset, { asset: spec.asset, path, sha256, bytes, frames })
  }
  const disk = memoryAuthorDirectory(files)
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadFixtureProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return {
    source,
    state,
    assetBase: project.assetBase,
    disk,
    seeded,
    canonical: { scenes, sharedScripts: project.authorContent.sharedScripts },
  }
}

/** 以 catalog + 待落盘 blob 真实解码（含 sha/bytes/gzip 校验）。 */
export async function decodePendingWorldSprite(
  session: EditSession,
  asset: AssetId,
): Promise<RleFrame[]> {
  const state = session.getState()
  const record = state.assetCatalog.assets[asset]
  if (!record) throw new Error(`catalog 缺 ${asset}`)
  const blob = state.assetBlobs[record.path]
  if (!blob) throw new Error(`assetBlobs 缺 ${record.path}`)
  const decoded = await decodeWorldSpriteAssetBytes(
    record,
    blob.slice(0),
    `pending world sprite ${asset}`,
  )
  return decoded.frames
}
