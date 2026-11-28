import type {
  AuthorCommand,
  AuthorSceneDef,
  AuthorScriptLibrary,
  AuthorStagesFlow,
  Command,
  EntityAddress,
  EntityDef,
  ScriptChunkV1,
  ScriptStage,
} from '@type-pal/content'
import type { EditorState } from './edit-session.js'

type AuthorSceneEntityDef = AuthorSceneDef['entities'][number]

export const MAX_VISUAL_SAMPLE_COMMANDS = 4096
export const MAX_VISUAL_CALL_DEPTH = 16

export interface CanonicalSpritePreviewState {
  scenes: readonly AuthorSceneDef[]
  sharedScripts: AuthorScriptLibrary
}

/** Read-only resource-view metadata; this projected entity is never an author/save input. */
export type SpritePreviewEntity = EntityDef & {
  spritePreviewScript?: {
    flow: AuthorStagesFlow
    self: EntityAddress
    sharedScripts: AuthorScriptLibrary
  }
}

export const SCRIPT_PREVIEW_SHARED_CHUNK = '__author-script-preview/shared'

/** Canonical preview commands keep both address components even inside a shared chunk. */
export function framePreviewTargetKey(target: EntityAddress): string {
  return JSON.stringify([target.scene, target.entity])
}

/** Returns no projection when the frame scanner cannot safely handle a command. */
function projectPreviewCommands(
  commands: readonly AuthorCommand[],
  self: EntityAddress,
  sharedScripts: AuthorScriptLibrary,
  depth = 0,
): Command[] | undefined {
  if (depth > MAX_VISUAL_CALL_DEPTH) return undefined
  const projected: Command[] = []
  for (const command of commands) {
    switch (command.kind) {
      case 'setEntityFrame':
      case 'setEntityFacing': {
        // Dynamic self is resolved by the canonical sampler in the actual call context.
        if (command.target === 'self') return undefined
        const entity = framePreviewTargetKey(command.target)
        projected.push(
          command.kind === 'setEntityFrame'
            ? { kind: command.kind, entity, frame: command.frame }
            : { kind: command.kind, entity, facing: command.facing },
        )
        break
      }
      case 'animEntity':
        projected.push({ kind: command.kind, entity: framePreviewTargetKey(command.target) })
        break
      case 'wait':
      case 'returnScript':
        projected.push(structuredClone(command))
        break
      case 'branch': {
        if (command.cond.kind !== 'chance') return undefined
        const then = projectPreviewCommands(command.then, self, sharedScripts, depth + 1)
        const otherwise = command.else
          ? projectPreviewCommands(command.else, self, sharedScripts, depth + 1)
          : undefined
        if (!then || (command.else && !otherwise)) return undefined
        projected.push({
          kind: command.kind,
          cond: structuredClone(command.cond),
          then,
          ...(otherwise ? { else: otherwise } : {}),
        })
        break
      }
      case 'repeat': {
        const body = projectPreviewCommands(command.body, self, sharedScripts, depth + 1)
        if (!body || command.count * body.length > MAX_VISUAL_SAMPLE_COMMANDS) return undefined
        for (let iteration = 0; body.length && iteration < command.count; iteration++)
          projected.push(...body)
        break
      }
      case 'loop': {
        if (command.mode !== 'forever') return undefined
        const body = projectPreviewCommands(command.body, self, sharedScripts, depth + 1)
        if (!body) return undefined
        projected.push(...body, { kind: 'returnScript' })
        break
      }
      case 'selectEntityBehavior':
      case 'selectEntityPage':
      case 'selectSceneHooks':
        // New selections affect later activations, outside this frame preview.
        break
      case 'callScript':
        if (
          !Object.hasOwn(sharedScripts, command.script) ||
          (command.self !== undefined &&
            (command.self.scene !== self.scene || command.self.entity !== self.entity))
        )
          return undefined
        projected.push({
          kind: command.kind,
          ref: { chunk: SCRIPT_PREVIEW_SHARED_CHUNK, id: command.script },
          ...(command.self ? { self: framePreviewTargetKey(command.self) } : {}),
        })
        break
      default:
        return undefined
    }
    if (projected.length > MAX_VISUAL_SAMPLE_COMMANDS) return undefined
  }
  return projected
}

function orderedIds(initial: string, ids: readonly string[]): string[] {
  return [initial, ...ids.filter((id) => id !== initial)]
}

function projectPreviewFlow(
  flow: AuthorStagesFlow,
  self: EntityAddress,
  sharedScripts: AuthorScriptLibrary,
): ScriptStage[] {
  const byId = new Map(flow.stages.map((stage) => [stage.id, stage]))
  const ids = orderedIds(
    flow.initial,
    flow.stages.map((stage) => stage.id),
  )
  return ids.flatMap((id, index) => {
    const stage = byId.get(id)
    if (!stage) return []
    // In this read-only lowering only, index == length is an explicit terminal edge.
    const target =
      typeof stage.next === 'object'
        ? ids.length
        : stage.next === undefined
          ? index
          : ids.indexOf(stage.next)
    const body = stage.entry ? undefined : projectPreviewCommands(stage.body, self, sharedScripts)
    // The reference site remains navigable even when its frame sequence cannot be projected.
    const preview: ScriptStage & { previewUncertainTransition?: true } = body
      ? { body, ...(target >= 0 && target !== index ? { next: target } : {}) }
      : { body: [], previewUncertainTransition: true }
    return [preview]
  })
}

/** Read-only command chunks for the sprite library frame scanner. */
export function projectCanonicalSharedScriptPreviewChunk(
  sharedScripts: AuthorScriptLibrary,
): ScriptChunkV1 {
  return {
    version: 1,
    id: SCRIPT_PREVIEW_SHARED_CHUNK,
    scripts: Object.fromEntries(
      Object.entries(sharedScripts).flatMap(([id, script]) => {
        const body = projectPreviewCommands(
          script.body,
          { scene: '__shared', entity: '__shared' },
          sharedScripts,
        )
        return body ? [[id, body] as const] : []
      }),
    ),
  }
}

function projectPreviewEntity(
  sceneId: string,
  shell: EntityDef,
  canonical: AuthorSceneEntityDef,
  sharedScripts: AuthorScriptLibrary,
): SpritePreviewEntity {
  const page =
    canonical.pages?.find((candidate) => candidate.id === canonical.initialPage) ??
    canonical.pages?.[0]
  const behaviors = canonical.behaviors?.auto
  const auto =
    page?.auto && behaviors && Object.hasOwn(behaviors, page.auto)
      ? behaviors[page.auto]
      : undefined
  if (!auto) return shell
  const currentPage = shell.pages?.[0]
  return {
    ...shell,
    spritePreviewScript: {
      flow: auto.flow,
      self: { scene: sceneId, entity: canonical.id },
      sharedScripts,
    },
    pages: [
      {
        ...(currentPage ?? {}),
        auto: {
          stages: projectPreviewFlow(
            auto.flow,
            { scene: sceneId, entity: canonical.id },
            sharedScripts,
          ),
        },
      },
    ],
  }
}

/**
 * 当前脚本的只读视觉投影。它只为精灵实例行为预览恢复安全的帧/朝向/等待控制流，
 * 不进入保存、运行时或编辑命令；有副作用或无法证明的分支仍由既有验证保守标为 unavailable。
 */
export function projectCanonicalSpritePreviewState(
  shell: EditorState,
  canonical: CanonicalSpritePreviewState,
): EditorState {
  const scenes = new Map(canonical.scenes.map((scene) => [scene.id, scene]))
  const scriptChunks = structuredClone(shell.scriptChunks)
  scriptChunks[SCRIPT_PREVIEW_SHARED_CHUNK] = projectCanonicalSharedScriptPreviewChunk(
    canonical.sharedScripts,
  )
  return {
    ...shell,
    scenes: shell.scenes.map((scene) => {
      const source = scenes.get(scene.id)
      if (!source) return scene
      const entities = new Map(source.entities.map((entity) => [entity.id, entity]))
      return {
        ...scene,
        entities: scene.entities.map((entity) => {
          const canonicalEntity = entities.get(entity.id)
          return canonicalEntity
            ? projectPreviewEntity(scene.id, entity, canonicalEntity, canonical.sharedScripts)
            : entity
        }),
      }
    }),
    scriptChunks,
  }
}
