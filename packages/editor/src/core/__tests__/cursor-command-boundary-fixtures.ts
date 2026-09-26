import type { BattleSpriteDef, SpriteDef } from '@type-pal/content'
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { AddBattleSpriteCommand } from '../battle-sprite-commands.js'
import type { EditorState } from '../edit-session.js'
import { toEditorState } from '../project-io.js'
import { buildBlankProject } from '../seed.js'
import { AddSpriteCommand } from '../sprite-commands.js'
import { memoryAuthorDirectory } from './author-save-fixture.js'

export async function loadBoundaryProject(name = 'command-boundary'): Promise<{
  source: FileSource
  state: EditorState
}> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  return { source, state: toEditorState(project, scenes, {}, {}, []) }
}

/** 共享空白项目 hero 资源，登记一个可通过保存门的 prop 精灵定义。 */
export async function withSharedWorldSprite(
  source: FileSource,
  state: EditorState,
  id: string,
): Promise<EditorState> {
  const hero = state.sprites.find((sprite) => sprite.id === 'hero')
  if (!hero) throw new Error(`空白项目缺 hero 精灵，无法登记 ${id}`)
  const record = structuredClone(state.assetCatalog.assets[hero.asset])
  if (!record) throw new Error(`空白项目缺 hero 资源 ${hero.asset}`)
  const bytes = await source.readBytes(record.path)
  const def: SpriteDef = {
    id,
    asset: hero.asset,
    label: id,
    layout: { kind: 'static' },
  }
  return new AddSpriteCommand(def, record, bytes).apply(state)
}

/** 共享空白项目 starter-fighter 资源，登记一个 enemy profile 战斗精灵。 */
export async function withSharedEnemyBattleSprite(
  source: FileSource,
  state: EditorState,
  id: string,
): Promise<EditorState> {
  const starter = state.battleSprites.find((sprite) => sprite.id === 'starter-fighter')
  if (!starter) throw new Error('空白项目缺 starter-fighter 战斗精灵')
  const record = structuredClone(state.assetCatalog.assets[starter.asset])
  if (!record) throw new Error(`空白项目缺战斗精灵资源 ${starter.asset}`)
  const bytes = await source.readBytes(record.path)
  const definition: BattleSpriteDef = {
    id,
    label: '残项敌人形象',
    asset: starter.asset,
    profile: {
      kind: 'enemy',
      idle: { start: 0, count: 1 },
      magic: { start: 1, count: 0 },
      attack: { start: 1, count: 0 },
      idleTicksPerFrame: 1,
      actTicksPerFrame: 0,
    },
  }
  return new AddBattleSpriteCommand(definition, record, bytes, 10).apply(state)
}
