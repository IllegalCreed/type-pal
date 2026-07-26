import type { ItemData, SceneDef } from '@type-pal/content'
import type { SourceItem } from '../../migrate-content.js'
import type { MigrationSnapshot } from '../../migration-baseline.js'
import type { MigrationJson } from '../../pal-migration.js'
import {
  augmentC8ItemUsesAfterP7,
  type C8ItemUseAugmentationEvidenceV1,
} from './c8-item-use-augmentation.js'
import { type P7CanonicalProject, projectP7CanonicalProject } from './p7-project.js'
import { buildValidatedP6TransformChain, type P6TransformBuildArgs } from './shadow-harness.js'

export const P7_SHARED_SCRIPTS_PATH = 'content/shared-scripts.json' as const

export interface P7GeneratedCanonical {
  snapshot: MigrationSnapshot
  project: P7CanonicalProject
  ir: ReturnType<typeof buildValidatedP6TransformChain>['p6']['ir']
  ledgerDraft: ReturnType<typeof buildValidatedP6TransformChain>['p6']['ledger']
  c8Evidence: C8ItemUseAugmentationEvidenceV1
}

export interface P7GeneratedCanonicalArgs extends P6TransformBuildArgs {
  itemSources: readonly SourceItem[]
}

function asJson(value: unknown): MigrationJson {
  return JSON.parse(JSON.stringify(value)) as MigrationJson
}

function readGeneratedSource(files: ReadonlyMap<string, MigrationJson>): {
  scenes: SceneDef[]
  items: ItemData[]
} {
  const sceneIds = files.get('content/scenes/index.json')
  if (!Array.isArray(sceneIds) || sceneIds.some((id) => typeof id !== 'string'))
    throw new Error('P7 generated: content/scenes/index.json 无效')
  const scenes = sceneIds.map((id) => {
    const scene = files.get(`content/scenes/${String(id)}.json`)
    if (!scene) throw new Error(`P7 generated: scene 缺失 ${String(id)}`)
    return structuredClone(scene) as unknown as SceneDef
  })
  const items = files.get('content/items.json')
  if (!Array.isArray(items)) throw new Error('P7 generated: content/items.json 无效')
  return { scenes, items: structuredClone(items) as unknown as ItemData[] }
}

/**
 * 发布后的 MG2 “theirs”：每次仍从权威提取结果完整重建 P2-P6，再直接投影成纯 canonical v5。
 * 历史 full ledger/compat sidecar 不在这里重签，由 v5 MG2 把已发布控制账作为 immutable input。
 */
export function buildP7GeneratedCanonical(args: P7GeneratedCanonicalArgs): P7GeneratedCanonical {
  const chain = buildValidatedP6TransformChain(args)
  const project = projectP7CanonicalProject({
    ir: chain.p6.ir,
    ...readGeneratedSource(args.migration.files),
  })
  const files = new Map(
    [...args.migration.files].map(([path, value]) => [path, structuredClone(value)] as const),
  )
  const managedFiles = new Set(args.migration.managedFiles)
  for (const path of [...files.keys()]) {
    if (
      path.startsWith('content/scripts/') ||
      (/^content\/scenes\/[^/]+\.json$/.test(path) && path !== 'content/scenes/index.json')
    )
      files.delete(path)
  }
  for (const path of [...managedFiles])
    if (path.startsWith('content/scripts/')) managedFiles.delete(path)

  files.set(
    'content/scenes/index.json',
    project.scenes.map((scene) => scene.id),
  )
  for (const scene of project.scenes) {
    const path = `content/scenes/${scene.id}.json`
    files.set(path, asJson(scene))
    managedFiles.add(path)
  }
  files.set('content/items.json', asJson(project.items))
  files.set(P7_SHARED_SCRIPTS_PATH, asJson(project.scripts))
  managedFiles.add('content/items.json')
  managedFiles.add('content/scenes/index.json')
  managedFiles.add(P7_SHARED_SCRIPTS_PATH)

  if ([...files.keys()].some((path) => path.startsWith('content/scripts/')))
    throw new Error('P7 generated: legacy script file 未归零')
  const c8 = augmentC8ItemUsesAfterP7({
    snapshot: { files, managedFiles },
    itemSources: args.itemSources,
    sourceCommands: args.sourceCommands,
  })
  return {
    snapshot: c8.snapshot,
    project,
    ir: chain.p6.ir,
    ledgerDraft: chain.p6.ledger,
    c8Evidence: c8.evidence,
  }
}
