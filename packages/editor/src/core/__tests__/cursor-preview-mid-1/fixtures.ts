import type {
  AuthorCommand,
  AuthorScriptFlow,
  AuthorScriptLibrary,
  EntityAddress,
  SceneDef,
} from '@type-pal/content'
import { collectScriptMovementPreview } from '../../script-movement-preview.js'

export const pos = (col: number, row = 0, height = 0) => ({ col, row, height })
export const target: EntityAddress = { scene: 'inn', entity: 'aunt' }
export const other: EntityAddress = { scene: 'inn', entity: 'guest' }
export const ghost: EntityAddress = { scene: 'inn', entity: 'ghost' }
export const foreign: EntityAddress = { scene: 'forest', entity: 'wolf' }

export const scene: SceneDef = {
  id: 'inn',
  mapId: 'inn-map',
  entry: { pos: pos(0), facing: 'down' },
  entities: [
    { id: 'aunt', sprite: 'aunt-sprite', pos: pos(1), facing: 'down' },
    { id: 'guest', sprite: 'guest-sprite', pos: pos(9), facing: 'up' },
  ],
}

export const move = (col: number, address: EntityAddress = target): AuthorCommand => ({
  kind: 'moveEntity',
  target: address,
  to: pos(col),
  speed: 'normal',
})

export const flowOf = (body: AuthorCommand[]): AuthorScriptFlow => ({
  kind: 'stages',
  initial: 'start',
  stages: [{ id: 'start', body }],
})

export const preview = (
  body: AuthorCommand[],
  options: {
    sharedScripts?: AuthorScriptLibrary
    self?: EntityAddress
    scene?: SceneDef
    cursor?: Parameters<typeof collectScriptMovementPreview>[0]['cursor']
    sceneEntry?: boolean
    flow?: AuthorScriptFlow
  } = {},
) =>
  collectScriptMovementPreview({
    scene: options.scene ?? scene,
    flow: options.flow ?? flowOf(body),
    self: options.self === undefined ? target : options.self,
    sharedScripts: options.sharedScripts,
    cursor: options.cursor,
    sceneEntry: options.sceneEntry,
  })

export const cols = (result: ReturnType<typeof collectScriptMovementPreview>, index = 0) =>
  result.tracks[index]?.segments.map((segment) => [
    segment.from.pos.col,
    segment.to.pos.col,
    segment.conditional,
  ])

export const nodeCols = (result: ReturnType<typeof collectScriptMovementPreview>, index = 0) =>
  result.tracks[index]?.nodes.map((node) => [node.number, node.pos.col, node.kind])
