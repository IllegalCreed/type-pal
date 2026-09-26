// @vitest-environment jsdom

import type { SceneDef } from '@type-pal/content'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorLocation } from './editor-navigation.js'
import type { EditorNavigationHistoryMode } from './use-editor-navigation-session.js'
import { useSceneWorkspaceSession } from './use-scene-workspace-session.js'

type Session = ReturnType<typeof useSceneWorkspaceSession>
type ApplyLocation = (location: EditorLocation, mode?: EditorNavigationHistoryMode) => void
let current: Session | undefined
let root: Root | undefined
let host: HTMLDivElement | undefined

const scenes: SceneDef[] = [
  {
    id: 's1',
    mapId: 'm1',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [],
  },
  {
    id: 's2',
    mapId: 'm2',
    entry: { pos: { col: 1, row: 2, height: 0 }, facing: 'up' },
    entities: [],
  },
]

function Harness(props: { location: EditorLocation; applyLocation: ApplyLocation }) {
  current = useSceneWorkspaceSession({
    location: props.location,
    applyLocation: props.applyLocation,
    scenes,
    defaultSceneId: 's1',
    actors: [{ id: 'hero' }],
    sprites: [{ id: 'npc' }],
  })
  return <output>{`${current.scene.id}:${current.selected.kind}:${current.placingEntity}`}</output>
}

async function render(location: EditorLocation, applyLocation: ApplyLocation = vi.fn()) {
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
  await act(async () => root!.render(<Harness location={location} applyLocation={applyLocation} />))
  return applyLocation
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  current = undefined
})

afterEach(async () => {
  if (root) await act(async () => root!.unmount())
  host?.remove()
  root = undefined
  host = undefined
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false
})

describe('scene workspace session ownership', () => {
  test('initial scene prefers a valid deep link and seeds placement tools from current catalogs', async () => {
    await render({ module: 'scene', subpage: 'workspace', objectId: 's2' })
    expect(current).toMatchObject({
      scene: scenes[1],
      placeSceneId: 's2',
      selected: { kind: 'scene' },
      placingEntity: false,
      placeMode: 'sprite',
      placeActorId: 'hero',
      placeSpriteId: 'npc',
      placeZoneRanges: { touch: 0, interact: 1 },
    })
  })

  test('an invalid initial scene deep link falls back to the default scene identity', async () => {
    await render({ module: 'scene', subpage: 'workspace', objectId: 'missing' })
    expect(current).toMatchObject({ scene: scenes[0], placeSceneId: 's1' })
  })

  test('a later valid scene-workspace location synchronizes the active scene without resetting tools', async () => {
    const apply = await render({ module: 'actor', subpage: 'workspace', objectId: 'hero' })
    expect(current!.scene.id).toBe('s1')
    await act(async () => {
      current!.setPlaceMode('actor')
      current!.setPlacingEntity(true)
      root!.render(
        <Harness
          location={{ module: 'scene', subpage: 'workspace', objectId: 's2' }}
          applyLocation={apply}
        />,
      )
    })
    expect(current).toMatchObject({ scene: scenes[1], placeMode: 'actor', placingEntity: true })
    expect(apply).not.toHaveBeenCalled()
  })

  test('explicit workspace switch resets selection and placement before replacing the scene deep link', async () => {
    const apply = await render({ module: 'scene', subpage: 'workspace', objectId: 's1' })
    await act(async () => {
      current!.setSelected({ kind: 'entity', id: 'e1' })
      current!.setPlacingEntity(true)
    })
    await act(async () => current!.switchPlaceScene('s2'))
    expect(current).toMatchObject({
      scene: scenes[1],
      placeSceneId: 's2',
      selected: { kind: 'scene' },
      placingEntity: false,
    })
    expect(apply).toHaveBeenCalledWith(
      { module: 'scene', subpage: 'workspace', objectId: 's2' },
      'replace',
    )
  })

  test('switching the retained scene outside the scene workspace does not rewrite another module URL', async () => {
    const apply = await render({ module: 'battle', subpage: 'enemy', objectId: 'enemy-a' })
    await act(async () => current!.switchPlaceScene('s2'))
    expect(current!.scene.id).toBe('s2')
    expect(apply).not.toHaveBeenCalled()
  })

  test('a retained switch callback reads the latest location before replacing the deep link', async () => {
    const apply = await render({ module: 'actor', subpage: 'workspace', objectId: 'hero' })
    const retainedSwitch = current!.switchPlaceScene
    await act(async () => {
      root!.render(
        <Harness
          location={{ module: 'scene', subpage: 'workspace', objectId: 's2' }}
          applyLocation={apply}
        />,
      )
    })
    expect(current!.switchPlaceScene).toBe(retainedSwitch)
    await act(async () => retainedSwitch('s1'))
    expect(apply).toHaveBeenCalledWith(
      { module: 'scene', subpage: 'workspace', objectId: 's1' },
      'replace',
    )
  })

  test('canvas layers and script page selection remain independent state families', async () => {
    await render({ module: 'scene', subpage: 'workspace', objectId: 's1' })
    const createRef = current!.createSceneButtonRef
    const outlineRef = current!.sceneOutlineRowRef
    await act(async () => {
      current!.setCanvasLayers((layers) => ({ ...layers, grid: true, ghosts: false }))
      current!.setScriptChannel('auto')
      current!.setSelectedBehavior('patrol')
      current!.setSelectedPage('night')
    })
    expect(current).toMatchObject({
      canvasLayers: expect.objectContaining({ grid: true, ghosts: false, entities: true }),
      scriptChannel: 'auto',
      selectedBehavior: 'patrol',
      selectedPage: 'night',
    })
    expect(current!.createSceneButtonRef).toBe(createRef)
    expect(current!.sceneOutlineRowRef).toBe(outlineRef)
  })
})
