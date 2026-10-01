/**
 * EnemyAnimPreview 合法挂载宿主：真实 EditSession（含 AddEnemyCommand 注入的敌人）+
 * EditorAssetReader + AssetBase + 真实 BattleSpritePicker/Uploader。不 mock 任何产品组件。
 */
import type { EnemyDef } from '@type-pal/content'
import type { FileSource } from '@type-pal/reforge'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { EditSession } from '../../core/edit-session.js'
import { createEditorAssetReader, type EditorAssetReader } from '../../core/editor-asset-reader.js'
import { AddEnemyCommand } from '../../core/enemy-commands.js'
import { collectCurrentProjectReferenceIndex } from '../../core/project-reference-adapters.js'
import { EnemyAnimPreview } from '../../ui/EnemyAnimPreview.js'
import type { CursorBattleProject } from './battle-sprite-fixtures.js'

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
  project: CursorBattleProject
  session: EditSession
  reader: EditorAssetReader
  host: HTMLDivElement
  root: Root
  enemyId: string
  openedDefinitions: string[]
  canvas(): HTMLCanvasElement
}

function Harness(props: {
  session: EditSession
  reader: EditorAssetReader
  project: CursorBattleProject
  enemyId: string
  opened: string[]
}) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  const enemy = (current.enemies ?? []).find((entry) => entry.id === props.enemyId)
  if (!enemy) return <div data-testid="enemy-missing">enemy removed</div>
  return (
    <EnemyAnimPreview
      enemy={enemy}
      definitions={current.battleSprites}
      assetBase={props.project.assetBase}
      assetReader={props.reader}
      session={props.session}
      onOpenDefinition={(id) => props.opened.push(id)}
      referenceIndex={collectCurrentProjectReferenceIndex(current)}
      referenceStatus="current"
      getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
    />
  )
}

export async function mountEnemyAnim(
  project: CursorBattleProject,
  input: { enemy: EnemyDef; extraEnemies?: EnemyDef[]; source?: FileSource },
): Promise<MountedEnemyAnim> {
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  const session = new EditSession(project.state)
  session.dispatch(new AddEnemyCommand(input.enemy))
  for (const extra of input.extraEnemies ?? []) session.dispatch(new AddEnemyCommand(extra))
  const reader = createEditorAssetReader(input.source ?? project.source, () => session.getState())
  const opened: string[] = []
  await act(async () => {
    root.render(
      <Harness
        session={session}
        reader={reader}
        project={project}
        enemyId={input.enemy.id}
        opened={opened}
      />,
    )
    await Promise.resolve()
  })
  return {
    project,
    session,
    reader,
    host,
    root,
    enemyId: input.enemy.id,
    openedDefinitions: opened,
    canvas: () => {
      const canvas = host.querySelector<HTMLCanvasElement>('canvas.ds-pixel-canvas')
      if (!canvas) throw new Error('EnemyAnimPreview 画布未挂载')
      return canvas
    },
  }
}

export async function unmountEnemyAnim(mounted: MountedEnemyAnim): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}
