import {
  collectBattleFieldTaggedReferences,
  DEFAULT_BATTLE_FIELD_ID,
  type BattleFieldReferenceKind,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type {
  CanonicalScriptReferenceV5,
  ScriptEditorStateV5,
} from './script-v5-editor.js'
import { visitCanonicalScriptCommandsV5 } from './script-v5-editor.js'

export type BattleFieldReferenceLocator =
  | { kind: 'scene'; sceneId: string }
  | { kind: 'scene-entity'; sceneId: string; entityId: string }
  | { kind: 'canonical-script'; reference: CanonicalScriptReferenceV5 }

export interface BlockingBattleFieldReference {
  fieldId: number
  kind: BattleFieldReferenceKind
  where: string
  label: string
  locator?: BattleFieldReferenceLocator
}

/**
 * 删除门禁使用的全域引用收集器。
 *
 * 结构字段逐项读取；canonical command 叶统一委托 content 的 typed-tag 扫描器。
 * `project-default` 是引擎约定的系统引用，不写进 manifest schema，但必须像真实引用一样阻止删除。
 */
export function blockingBattleFieldReferences(
  state: EditorState,
  fieldId: number,
): BlockingBattleFieldReference[] {
  const references: BlockingBattleFieldReference[] = []
  if (fieldId === DEFAULT_BATTLE_FIELD_ID)
    references.push({
      fieldId,
      kind: 'project-default',
      where: 'project.defaultBattleFieldId',
      label: `项目默认战场 #${DEFAULT_BATTLE_FIELD_ID}`,
    })

  state.scenes.forEach((scene, sceneIndex) => {
    if (scene.battleFieldId === fieldId)
      references.push({
        fieldId,
        kind: 'scene-default',
        where: `scenes[${sceneIndex}].battleFieldId`,
        label: `场景 ${scene.id} 的默认战场`,
        locator: { kind: 'scene', sceneId: scene.id },
      })
    scene.entities.forEach((entity, entityIndex) => {
      if (entity.hostile?.battleFieldId === fieldId)
        references.push({
          fieldId,
          kind: 'hostile',
          where: `scenes[${sceneIndex}].entities[${entityIndex}].hostile.battleFieldId`,
          label: `场景 ${scene.id} / 实体 ${entity.id} 的敌对战场`,
          locator: { kind: 'scene-entity', sceneId: scene.id, entityId: entity.id },
        })
    })
  })

  const taggedRoots: Array<{ value: unknown; where: string }> = [
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
  for (const root of taggedRoots) {
    for (const reference of collectBattleFieldTaggedReferences(root.value, root.where)) {
      if (reference.fieldId !== fieldId) continue
      references.push({
        fieldId,
        kind: 'start-battle',
        where: reference.where,
        label: `脚本显式开战（${reference.where}）`,
      })
    }
  }
  return references
}

/** 编辑器引用面板：current canonical 工程以精确 command locator 取代 coarse JSON 路径。 */
export function battleFieldReferences(
  state: EditorState,
  fieldId: number,
  canonicalState?: ScriptEditorStateV5,
): BlockingBattleFieldReference[] {
  const blocking = blockingBattleFieldReferences(state, fieldId)
  if (!canonicalState) return blocking
  const structural = blocking.filter((reference) => reference.kind !== 'start-battle')
  visitCanonicalScriptCommandsV5(canonicalState, (command, path, locator) => {
    if (command.kind !== 'startBattle' || command.fieldId !== fieldId) return
    structural.push({
      fieldId,
      kind: 'start-battle',
      where: `${path}.fieldId`,
      label: `脚本显式开战（${path}）`,
      locator: {
        kind: 'canonical-script',
        reference: { kind: 'command', path: `${path}.fieldId`, locator },
      },
    })
  })
  return structural
}
