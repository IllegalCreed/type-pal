/** Mount the enemy preview against the same session subscription and reader as the editor. */
import type { EnemyDef } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditSession } from '../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../core/editor-asset-reader.js'
import { AddEnemyCommand } from '../core/enemy-commands.js'
import { assertProjectSaveValid } from '../core/project-diagnostics.js'
import { collectCurrentProjectReferenceIndex } from '../core/project-reference-adapters.js'
import { EnemyAnimPreview } from '../ui/EnemyAnimPreview.js'
import type { BattleSpriteProject } from './battle-sprite-project.js'

export function enemyDef(id: string, battleSprite: string, yPosOffset = 0): EnemyDef {
  return {
    id,
    name: `name.${id}`,
    battleSprite,
    yPosOffset,
    stats: {
      health: 10,
      level: 1,
      exp: 1,
      cash: 1,
      attackStrength: 2,
      magicStrength: 2,
      defense: 2,
      dexterity: 2,
      fleeRate: 0,
      physicalResistance: 0,
      poisonResistance: 0,
      elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
      dualMove: false,
      collectValue: 0,
    },
    ai: { resistanceToSorcery: 0 },
    sounds: {},
  }
}

export interface MountedEnemyAnim {
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  enemyId: string
  canvas(): HTMLCanvasElement
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  project: BattleSpriteProject
  enemyId: string
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const enemy = (current.enemies ?? []).find((entry) => entry.id === props.enemyId)
  if (!enemy) return null
  return (
    <EnemyAnimPreview
      enemy={enemy}
      definitions={current.battleSprites}
      assetBase={props.project.assetBase}
      assetReader={props.reader}
      session={props.session}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={collectCurrentProjectReferenceIndex}
    />
  )
}

export async function mountEnemyAnim(
  project: BattleSpriteProject,
  input: { enemy: EnemyDef; source?: FileSource },
): Promise<MountedEnemyAnim> {
  const session = new EditSession(project.state)
  if (!session.dispatch(new AddEnemyCommand(input.enemy)))
    throw new Error(`Unable to seed enemy ${input.enemy.id}`)
  assertProjectSaveValid(session.getState())
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    await act(async () => {
      root.render(
        <Harness session={session} reader={reader} project={project} enemyId={input.enemy.id} />,
      )
    })
  } catch (error) {
    try {
      await act(async () => root.unmount())
    } finally {
      host.remove()
    }
    throw error
  }
  return {
    session,
    reader,
    host,
    root,
    enemyId: input.enemy.id,
    canvas: () => {
      const canvas = host.querySelector<HTMLCanvasElement>('canvas.ds-pixel-canvas')
      if (!canvas) throw new Error('EnemyAnimPreview 画布未挂载')
      return canvas
    },
  }
}

export async function unmountEnemyAnim(mounted: MountedEnemyAnim): Promise<void> {
  try {
    await act(async () => mounted.root.unmount())
  } finally {
    mounted.host.remove()
  }
}
