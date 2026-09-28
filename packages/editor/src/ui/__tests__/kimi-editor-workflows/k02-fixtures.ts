/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 K02 组夹具：在 blank 项目文件集内追加真实编码的大世界精灵
 * 资产（encodeSpriteChunk + compressGzip + sha256Hex，bytes/sha 与实际字节一致）与其用途定义，
 * 再走正式 loader（loadCurrentProjectFrom → 全量场景/地图 → toEditorState → assertProjectSaveValid
 * 自证）。与 glm-kit 的 loadLegalUiProject 同一管道，差异只在装载前注入额外合法文件；
 * 资产字节落在内存磁盘上（assetBlobs 为空），读取必经磁盘端口，可被 gatedFileSource 闸门观测。
 * 只被 K02 两个新测试导入，不引入第二套产品实现。
 */
import type { AssetId, AssetRecordV1, SpriteDef, SpriteLayout } from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  encodeSpriteChunk,
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
  quantizeToRleFrame,
  type RleFrame,
} from '@type-pal/reforge'
import { memoryAuthorDirectory } from '../../../core/__tests__/author-save-fixture.js'
import { sha256Hex } from '../../../core/binary-signature.js'
import type { EditorState } from '../../../core/edit-session.js'
import { assertProjectSaveValid } from '../../../core/project-diagnostics.js'
import { toEditorState } from '../../../core/project-io.js'
import { buildBlankProject } from '../../../core/seed.js'
import { buildSeedAssets } from '../../../core/seed-assets.js'
import { atlasColors, solidRgba } from './kit.js'

export interface K02SpriteSpec {
  /** 语义 AssetId（点分隔，与 sprite.generated.starter / sprite.<id> 现有命名同构）。 */
  asset: AssetId
  /** catalog 记录的人读标签。 */
  label: string
  /** 帧数：每帧一个 8×8 实心色块（atlasColors 互异色板，量化后仍是可区分真实像素）。 */
  frameCount: number
  /** 该资产上的初始用途定义（可为空 = 未配置资源）。 */
  definitions: readonly {
    id: string
    label: string
    layout: SpriteLayout
    poses?: SpriteDef['poses']
  }[]
}

export interface K02SeededSprite {
  asset: AssetId
  path: string
  sha256: string
  bytes: ArrayBuffer
  frames: RleFrame[]
}

export interface K02Project {
  source: FileSource
  state: EditorState
  assetBase: AssetBase
  /** 内存磁盘句柄：失败注入只允许在这里改写磁盘字节（磁盘端口），内存项目状态保持合法。 */
  disk: ReturnType<typeof memoryAuthorDirectory>
  seeded: ReadonlyMap<AssetId, K02SeededSprite>
}

const FRAME = 8

export async function loadK02Project(
  name: string,
  specs: readonly K02SpriteSpec[],
): Promise<K02Project> {
  const { palette } = await buildSeedAssets()
  const files = await buildBlankProject(name)
  const spritesJson = files['content/sprites.json'] as SpriteDef[]
  const catalog = (files['assets/index.json'] as { assets: Record<AssetId, AssetRecordV1> }).assets
  const seeded = new Map<AssetId, K02SeededSprite>()
  for (const spec of specs) {
    if (catalog[spec.asset]) throw new Error(`K02 fixture: AssetId 与 blank 项目冲突 ${spec.asset}`)
    const frames = atlasColors(spec.frameCount).map((color) =>
      quantizeToRleFrame(solidRgba(FRAME, FRAME, color), FRAME, FRAME, palette),
    )
    const gzip = await compressGzip(encodeSpriteChunk(frames))
    const bytes = gzip.buffer.slice(
      gzip.byteOffset,
      gzip.byteOffset + gzip.byteLength,
    ) as ArrayBuffer
    const sha256 = await sha256Hex(bytes)
    const path = `assets/authored/sprites/${sha256}.rle`
    // 与 SpriteUploadWizard 入库记录同构（kind/path/mediaType/bytes/sha256/origin）。
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
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase, disk, seeded }
}
