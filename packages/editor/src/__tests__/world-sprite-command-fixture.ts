import type { AssetId, SpriteActionDef, SpriteDef, SpriteLayout } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader } from '../core/editor-asset-reader.js'
import { loadEditorSprite } from '../core/sprite-assets.js'
import { loadWorldSpriteProject, type WorldSpriteFixture } from './world-sprite-project.js'

export const COMMAND_SPRITE_ASSET = 'sprite.authored.command-target'
export const COMMAND_SPRITE_ID = 'command-target'
export const COMMAND_SPRITE_LABEL = '命令精灵'

export async function loadSpriteCommandFixture(
  name: string,
  options: {
    frameCount?: number
    poses?: SpriteDef['poses']
    layout?: SpriteLayout
    secondDefinition?: WorldSpriteFixture['definitions'][number]
  } = {},
) {
  const definitions: Array<WorldSpriteFixture['definitions'][number]> = [
    {
      id: COMMAND_SPRITE_ID,
      label: COMMAND_SPRITE_LABEL,
      layout: options.layout ?? { kind: 'static' },
      poses: options.poses,
    },
  ]
  if (options.secondDefinition) definitions.push(options.secondDefinition)
  const project = await loadWorldSpriteProject(name, [
    {
      asset: COMMAND_SPRITE_ASSET,
      label: '命令帧源',
      frameCount: options.frameCount ?? 6,
      definitions,
    },
  ])
  const session = new EditSession(project.state)
  const reader = createEditorAssetReader(project.source, () => session.getState())
  const asset = COMMAND_SPRITE_ASSET
  const record = reader.record(asset, 'sprite')
  const decoded = await loadEditorSprite(reader, asset)
  const proof = { asset, sha256: record.sha256, actualFrameCount: decoded.frames.length }
  return { project, session, reader, record, proof, frames: decoded.frames }
}

export async function makeSpriteAssetRevision(
  asset: AssetId,
  frameCount: number,
  colorOffset = 0,
  label = '精灵新版',
) {
  const project = await loadWorldSpriteProject('world-sprite-revision', [
    { asset, label, frameCount, colorOffset, definitions: [] },
  ])
  const record = project.state.assetCatalog.assets[asset]!
  const bytes = project.seeded.get(asset)!.bytes
  const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
  return { record, bytes, frameCount: decoded.frames.length }
}

export function actionFromFrames(
  label: string,
  frames: readonly number[],
  playback: Pick<SpriteActionDef, 'order' | 'loopFrom'> = {},
): SpriteActionDef {
  return { label, ...playback, steps: frames.map((frame) => ({ frame, durationMs: 250 })) }
}
