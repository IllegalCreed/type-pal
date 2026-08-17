import { collectEnemyTeamTaggedReferences, type EnemyTeamReferenceKind } from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type { CanonicalScriptReferenceV5, ScriptEditorStateV5 } from './script-v5-editor.js'
import { visitCanonicalScriptCommandsV5 } from './script-v5-editor.js'

export type EnemyTeamReferenceLocator =
  | { kind: 'scene-entity'; sceneId: string; entityId: string }
  | { kind: 'canonical-script'; reference: CanonicalScriptReferenceV5 }

export interface BlockingEnemyTeamReference {
  enemyTeamId: string
  kind: EnemyTeamReferenceKind
  where: string
  label: string
  locator?: EnemyTeamReferenceLocator
}

function taggedRoots(state: EditorState): Array<{ value: unknown; where: string }> {
  return [
    ...state.scenes.map((scene, index) => ({
      value: scene,
      where: `scenes[${index}](${scene.id})`,
    })),
    ...state.items.map((item, index) => ({
      value: item,
      where: `items[${index}](${item.id})`,
    })),
    ...Object.entries(state.scriptChunks ?? {}).flatMap(([chunkId, chunk]) =>
      Object.entries(chunk.scripts).map(([scriptId, body]) => ({
        value: body,
        where: `scriptChunks[${JSON.stringify(chunkId)}].scripts[${JSON.stringify(scriptId)}]`,
      })),
    ),
    ...Object.entries(state.sharedScripts ?? {}).map(([scriptId, script]) => ({
      value: script.body,
      where: `sharedScripts[${JSON.stringify(scriptId)}].body`,
    })),
    ...(state.enemies ?? []).map((enemy, index) => ({
      value: enemy,
      where: `enemies[${index}](${enemy.id})`,
    })),
  ]
}

/** 删除门禁使用的全域敌队引用收集器。 */
export function blockingEnemyTeamReferences(
  state: EditorState,
  enemyTeamId: string,
): BlockingEnemyTeamReference[] {
  const references: BlockingEnemyTeamReference[] = []
  state.scenes.forEach((scene, sceneIndex) => {
    scene.entities.forEach((entity, entityIndex) => {
      if (entity.hostile?.enemyTeamId !== enemyTeamId) return
      references.push({
        enemyTeamId,
        kind: 'hostile',
        where: `scenes[${sceneIndex}].entities[${entityIndex}].hostile.enemyTeamId`,
        label: `场景 ${scene.id} / 实体 ${entity.id} 的敌队`,
        locator: { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
      })
    })
  })
  for (const root of taggedRoots(state)) {
    for (const reference of collectEnemyTeamTaggedReferences(root.value, root.where)) {
      if (reference.enemyTeamId !== enemyTeamId) continue
      references.push({
        enemyTeamId,
        kind: 'start-battle',
        where: reference.where,
        label: `脚本显式开战（${reference.where}）`,
      })
    }
  }
  return references
}

/** current canonical 工程以精确 command locator 取代 coarse JSON 路径。 */
export function enemyTeamReferences(
  state: EditorState,
  enemyTeamId: string,
  canonicalState?: ScriptEditorStateV5,
): BlockingEnemyTeamReference[] {
  const blocking = blockingEnemyTeamReferences(state, enemyTeamId)
  if (!canonicalState) return blocking
  const structural = blocking.filter((reference) => reference.kind !== 'start-battle')
  visitCanonicalScriptCommandsV5(canonicalState, (command, path, locator) => {
    if (command.kind !== 'startBattle' || command.enemyTeamId !== enemyTeamId) return
    structural.push({
      enemyTeamId,
      kind: 'start-battle',
      where: `${path}.enemyTeamId`,
      label: `脚本显式开战（${path}）`,
      locator: {
        kind: 'canonical-script',
        reference: { kind: 'command', path: `${path}.enemyTeamId`, locator },
      },
    })
  })
  return structural
}
