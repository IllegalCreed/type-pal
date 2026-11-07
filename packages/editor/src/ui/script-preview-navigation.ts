import type { ActorDef, AuthorSceneDef, Locale } from '@type-pal/content'
import { authorFlowPreviewStages } from '../core/script-flow-preview.js'
import {
  type ScriptPreviewEntry,
  type ScriptPreviewSchemeEntry,
  type ScriptPreviewUsage,
  scriptPreviewEntryExists,
  scriptPreviewSchemeExists,
} from '../core/script-preview-library.js'
import { previewEntityName } from './SceneInitialStateEditor.js'
import type { ScriptPreviewDetailsRequest, ScriptSchemeDetailsDraft } from './ScriptEditor.js'

export type InitialStateReturn = {
  origin: ScriptPreviewEntry
  label: string
} & (
  | { kind: 'step'; target: ScriptPreviewEntry }
  | { kind: 'scheme'; target: ScriptPreviewSchemeEntry; draft: ScriptSchemeDetailsDraft }
)

export interface InitialStateDetailsNavigation {
  origin: ScriptPreviewEntry
  request: ScriptPreviewDetailsRequest
}

export function previewSourceKey(entry: ScriptPreviewSchemeEntry): string {
  return entry.channel === 'onEnter'
    ? `s:${entry.sceneId}:canonical:${entry.schemeId}`
    : entry.channel === 'onTeleport'
      ? `canonical:teleport:${entry.sceneId}:${entry.schemeId}`
      : `canonical:entity:${entry.sceneId}:${entry.entityId}:${entry.channel}:${entry.schemeId}`
}

export function previewEntryLabel(
  entry: ScriptPreviewSchemeEntry & { stageId?: string },
  scene: AuthorSceneDef | undefined,
  actors: Record<string, ActorDef>,
  locale: Locale,
): string {
  return Object.values(previewEntryDetails(entry, scene, actors, locale)).join(' / ')
}

/** Human labels stay separate so reference rows can distinguish title, source and channel. */
export function previewEntryDetails(
  entry: ScriptPreviewSchemeEntry & { stageId?: string },
  scene: AuthorSceneDef | undefined,
  actors: Record<string, ActorDef>,
  locale: Locale,
): { owner: string; channel: string; scheme: string; step?: string } {
  const entity = scene?.entities.find((candidate) => candidate.id === entry.entityId)
  const scheme =
    entry.channel === 'trigger' || entry.channel === 'auto'
      ? entity?.behaviors?.[entry.channel]?.[entry.schemeId]
      : scene?.hooks?.[entry.channel]?.variants[entry.schemeId]
  const stages = scheme ? authorFlowPreviewStages(scheme.flow) : []
  const index = stages.findIndex((stage) => stage.id === entry.stageId)
  return {
    owner: entry.entityId
      ? entity
        ? previewEntityName(entity, actors, locale)
        : '已移除的角色或物件'
      : '场景事件',
    channel: { trigger: '交互脚本', auto: '自动行为', onEnter: '进场事件', onTeleport: '传送出口' }[
      entry.channel
    ],
    scheme: scheme ? scheme.label || '未命名脚本方案' : '已移除的脚本方案',
    ...(entry.stageId
      ? {
          step: stages[index]?.label || (index >= 0 ? `第 ${index + 1} 步` : '已移除的步骤'),
        }
      : {}),
  }
}

export function previewUsageExists(
  usage: ScriptPreviewUsage,
  scenes: readonly AuthorSceneDef[],
): boolean {
  return usage.kind === 'scheme-default'
    ? scriptPreviewSchemeExists(usage.entry, scenes)
    : scriptPreviewEntryExists(usage.entry, scenes)
}
