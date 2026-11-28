import type { AuthorSceneDef, AuthorScriptLibrary, AuthorStagesFlow } from '@type-pal/content'
import { decodeWorldSpriteAssetBytes } from '@type-pal/reforge'
import { loadWorldSpriteProject } from '../../__tests__/world-sprite-project.js'
import { collectCurrentProjectReferenceIndex } from '../project-reference-adapters.js'
import {
  describeSpriteReferenceBehavior,
  projectCanonicalSpritePreviewState,
} from '../world-sprite-behavior.js'

type AuthorEntity = AuthorSceneDef['entities'][number]

export const LANTERN = { scene: 'start', entity: 'lantern' }
export const LANTERN_DEFINITION = 'lantern-frame-sequence'
const LANTERN_ASSET = 'sprite.authored.lantern-preview'

export function visualInstance(
  id: string,
  appearance: { sprite: string } | { actor: string },
  flow: AuthorStagesFlow,
): AuthorEntity {
  return {
    id,
    ...appearance,
    pos: { col: 2, row: 2, height: 0 },
    initialPage: 'default',
    pages: [{ id: 'default', label: '默认', auto: 'watch' }],
    behaviors: { auto: { watch: { label: '场景动作', order: 0, flow } } },
  }
}

export async function loadScriptedSpritePreview(
  name: string,
  flow: AuthorStagesFlow,
  sharedScripts: AuthorScriptLibrary = {},
  frameCount = 8,
) {
  const project = await loadWorldSpriteProject(
    name,
    [
      {
        asset: LANTERN_ASSET,
        label: '灯笼源帧',
        frameCount,
        definitions: [{ id: LANTERN_DEFINITION, label: '灯笼', layout: { kind: 'static' } }],
      },
    ],
    {
      entities: [
        visualInstance(LANTERN.entity, { sprite: LANTERN_DEFINITION }, flow),
        { id: 'brazier', sprite: LANTERN_DEFINITION, pos: { col: 3, row: 3, height: 0 } },
      ],
      sharedScripts,
    },
  )
  const record = project.state.assetCatalog.assets[LANTERN_ASSET]
  const definition = project.state.sprites.find(({ id }) => id === LANTERN_DEFINITION)
  if (!record || !definition) throw new Error('Missing loaded lantern source or definition')
  const bytes = await project.source.readBytes(record.path)
  const decoded = await decodeWorldSpriteAssetBytes(record, bytes)
  const reference = collectCurrentProjectReferenceIndex(project.state)
    .referencesTo({ kind: 'world-sprite', id: definition.id })
    .find(
      ({ source }) =>
        source.owner.kind === 'scene-entity' && source.owner.entityId === LANTERN.entity,
    )
  if (!reference) throw new Error('Missing live authored lantern reference')
  const projected = projectCanonicalSpritePreviewState(project.state, project.canonical)
  return {
    project,
    projected,
    definition,
    reference,
    actualFrameCount: decoded.frames.length,
    behavior: describeSpriteReferenceBehavior(
      projected,
      reference,
      definition,
      decoded.frames.length,
    ),
  }
}
