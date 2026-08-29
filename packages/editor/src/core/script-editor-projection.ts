import type { AuthorItemData, AuthorSceneDef, ItemData } from '@type-pal/content'
import type { EditorState } from './edit-session.js'
import type { ScriptEditorState } from './script-editor.js'

type AuthorSceneEntityDef = AuthorSceneDef['entities'][number]

/**
 * 主 EditSession 保存地图与普通属性的 current 交互投影，ScriptEditSession 保存唯一的脚本作者真值。
 * 这里是投影与作者真值在渲染/保存边界的唯一合并点；不存在旧项目 shell、版本转换、sidecar 或可绕过的
 * 第二套脚本作者态。
 */
function mergeEntityShell(
  sceneId: string,
  shell: EditorState['scenes'][number]['entities'][number],
  canonical: AuthorSceneEntityDef | undefined,
): AuthorSceneEntityDef {
  const { pages: shellPages, hostile: shellHostile, ...shellBase } = structuredClone(shell)
  const pages = canonical?.pages ? structuredClone(canonical.pages) : undefined
  const initialPage = pages?.find((page) => page.id === canonical?.initialPage)
  if (initialPage) {
    const animation = shellPages?.[0]?.animation
    if (animation) initialPage.animation = structuredClone(animation)
    else delete initialPage.animation
  }
  const hostile = shellHostile
    ? {
        ...shellHostile,
        ...(canonical?.hostile?.onLose !== undefined
          ? { onLose: structuredClone(canonical.hostile.onLose) }
          : {}),
        ...(canonical?.hostile?.onVictory !== undefined
          ? { onVictory: structuredClone(canonical.hostile.onVictory) }
          : {}),
        ...(canonical?.hostile?.onPlayerFlee !== undefined
          ? { onPlayerFlee: structuredClone(canonical.hostile.onPlayerFlee) }
          : {}),
      }
    : undefined
  if (
    !canonical &&
    shellHostile?.onLose !== undefined &&
    shellHostile.onLose !== 'gameOver' &&
    shellHostile.onLose.length > 0
  )
    throw new Error(
      `mergeEditorProjectionWithCurrentAuthorState: 新实体 ${sceneId}/${shell.id} 含未登记 hostile.onLose`,
    )
  return {
    ...shellBase,
    ...(canonical?.behaviors ? { behaviors: structuredClone(canonical.behaviors) } : {}),
    ...(pages ? { pages } : {}),
    ...(canonical?.initialPage ? { initialPage: canonical.initialPage } : {}),
    ...(hostile ? { hostile } : {}),
  } as AuthorSceneEntityDef
}

function mergeSceneShell(
  shell: EditorState['scenes'][number],
  canonical: AuthorSceneDef | undefined,
): AuthorSceneDef {
  const {
    entities: shellEntities,
    onEnter: _projectedOnEnter,
    onTeleport: _projectedOnTeleport,
    ...shellBase
  } = structuredClone(shell)
  const canonicalEntities = new Map(
    (canonical?.entities ?? []).map((entity) => [entity.id, entity]),
  )
  return {
    ...shellBase,
    entities: shellEntities.map((entity) =>
      mergeEntityShell(shell.id, entity, canonicalEntities.get(entity.id)),
    ),
    ...(canonical?.hooks ? { hooks: structuredClone(canonical.hooks) } : {}),
  }
}

/** 普通物品字段/效果顺序来自主会话；私有脚本正文来自脚本会话。 */
function mergeCurrentItemShell(
  shell: ItemData,
  canonical: AuthorItemData | undefined,
): AuthorItemData {
  const next = structuredClone(shell) as unknown as AuthorItemData
  const canonicalPrivate = new Map(
    (canonical?.use?.effects ?? []).flatMap((effect) =>
      effect.kind === 'itemPrivateScript'
        ? [[effect.script.id, structuredClone(effect)] as const]
        : [],
    ),
  )
  if (next.use) {
    const effects: NonNullable<AuthorItemData['use']>['effects'] = []
    for (const effect of shell.use?.effects ?? []) {
      const projectedPrivate = effect as unknown as {
        kind?: string
        script?: { id?: string }
      }
      if (projectedPrivate.kind === 'itemPrivateScript') {
        const id = projectedPrivate.script?.id
        if (id !== 'use') continue
        const replacement = canonicalPrivate.get(id)
        if (!replacement) continue
        effects.push(structuredClone(replacement))
        continue
      }
      if (
        effect.kind === 'runScript' &&
        effect.script.chunk === '__author-script-runtime' &&
        effect.script.id.startsWith(`item:${shell.id}:`)
      ) {
        const id = effect.script.id.slice(`item:${shell.id}:`.length)
        if (id !== 'use') continue
        const replacement = canonicalPrivate.get(id)
        if (!replacement) continue
        effects.push(structuredClone(replacement))
        continue
      }
      if (effect.kind === 'runScript') {
        effects.push({ ...structuredClone(effect), script: effect.script.id })
        continue
      }
      effects.push(structuredClone(effect))
    }
    next.use.effects = effects
  }
  return next
}

/** UI/引用扫描消费当前 shell 顺序与当前私有脚本正文的合成视图。 */
export function projectActiveScriptEditorState(
  canonical: ScriptEditorState,
  shellItems: readonly ItemData[],
): ScriptEditorState {
  const canonicalItems = new Map(canonical.items.map((item) => [item.id, item]))
  return {
    ...canonical,
    items: shellItems.map((item) => mergeCurrentItemShell(item, canonicalItems.get(item.id))),
  }
}

/**
 * 资源引用扫描只需要作者态覆盖的三个切片；避免为一次扫描深拷贝 maps、blob 与其余大表。
 * 合并语义与保存边界相同：普通字段取 shell，脚本正文取 canonical。
 */
export function projectCurrentAuthorReferenceSlices(
  canonical: ScriptEditorState,
  shell: EditorState,
): Pick<EditorState, 'scenes' | 'items' | 'sharedScripts'> {
  const canonicalScenes = new Map(canonical.scenes.map((scene) => [scene.id, scene]))
  const canonicalItems = new Map(canonical.items.map((item) => [item.id, item]))
  return {
    scenes: shell.scenes.map((scene) =>
      mergeSceneShell(scene, canonicalScenes.get(scene.id)),
    ) as unknown as EditorState['scenes'],
    items: shell.items.map((item) =>
      mergeCurrentItemShell(item, canonicalItems.get(item.id)),
    ) as unknown as EditorState['items'],
    sharedScripts: structuredClone(
      canonical.sharedScripts,
    ) as unknown as EditorState['sharedScripts'],
  }
}

/** Current canonical command view constrained to the shell's current record set and ordering. */
export function projectCurrentAuthorScriptEditorState(
  canonical: ScriptEditorState,
  shell: EditorState,
): ScriptEditorState {
  const author = projectCurrentAuthorReferenceSlices(canonical, shell)
  return scriptEditorStateFromCurrentAuthorSlices(canonical, author)
}

export function scriptEditorStateFromCurrentAuthorSlices(
  canonical: ScriptEditorState,
  author: Pick<EditorState, 'scenes' | 'items' | 'sharedScripts'>,
): ScriptEditorState {
  return {
    ...canonical,
    scenes: author.scenes as ScriptEditorState['scenes'],
    items: author.items as ScriptEditorState['items'],
    sharedScripts: author.sharedScripts as ScriptEditorState['sharedScripts'],
  }
}

/** 保存边界：合并当前普通编辑会话与当前脚本会话，不做版本改写。 */
export function mergeEditorProjectionWithCurrentAuthorState(
  canonical: ScriptEditorState,
  shell: EditorState,
): EditorState {
  const author = projectCurrentAuthorReferenceSlices(canonical, shell)
  return {
    ...structuredClone(shell),
    ...author,
  }
}
