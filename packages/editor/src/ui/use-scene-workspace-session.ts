import type { SceneDef } from '@type-pal/content'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_ZONE_RANGE, type EntityPlacementMode } from '../core/entity-placement.js'
import type { EditorLocation } from './editor-navigation.js'
import type { EditorNavigationHistoryMode } from './use-editor-navigation-session.js'

export type SceneSelection =
  | { kind: 'scene' }
  | { kind: 'default-entry' }
  | { kind: 'named-entry'; id: string }
  | { kind: 'entity'; id: string }

export type SceneLifecycleIntent =
  | { kind: 'create'; id: string; name: string }
  | { kind: 'copy'; sourceSceneId: string; id: string; name: string }
  | { kind: 'delete'; sceneId: string; name: string }

export const SCENE_SELECTION: SceneSelection = { kind: 'scene' }
export const DEFAULT_ENTRY_SELECTION: Extract<SceneSelection, { kind: 'default-entry' }> = {
  kind: 'default-entry',
}

export interface SceneCanvasLayers {
  base: boolean
  cover: boolean
  entities: boolean
  grid: boolean
  blocked: boolean
  entries: boolean
  ghosts: boolean
}

/** Owns scene-workspace selection, placement tools and URL-synchronised active scene. */
export function useSceneWorkspaceSession(input: {
  location: EditorLocation
  applyLocation(location: EditorLocation, mode?: EditorNavigationHistoryMode): void
  scenes: readonly SceneDef[]
  defaultSceneId?: string
  actors: readonly { id: string }[]
  sprites: readonly { id: string }[]
}) {
  const { location, applyLocation, scenes, defaultSceneId, actors, sprites } = input
  const locationRef = useRef(location)
  locationRef.current = location
  const [selected, setSelected] = useState<SceneSelection>(SCENE_SELECTION)
  const [sceneLifecycleIntent, setSceneLifecycleIntent] = useState<SceneLifecycleIntent>()
  const createSceneButtonRef = useRef<HTMLButtonElement>(null)
  const sceneOutlineRowRef = useRef<HTMLButtonElement>(null)
  const [placingEntity, setPlacingEntity] = useState(false)
  const [scriptChannel, setScriptChannel] = useState<'trigger' | 'auto'>('trigger')
  const [selectedBehavior, setSelectedBehavior] = useState<string>()
  const [selectedPage, setSelectedPage] = useState<string>()
  const [canvasLayers, setCanvasLayers] = useState<SceneCanvasLayers>({
    base: true,
    cover: true,
    entities: true,
    grid: false,
    blocked: false,
    entries: true,
    ghosts: true,
  })
  const [placeSceneId, setPlaceSceneId] = useState<string>(() => {
    const target = location.objectId
    return target && scenes.some((scene) => scene.id === target) ? target : (defaultSceneId ?? '')
  })
  const [placeMode, setPlaceMode] = useState<EntityPlacementMode>('sprite')
  const [placeActorId, setPlaceActorId] = useState<string>(actors[0]?.id ?? '')
  const [placeSpriteId, setPlaceSpriteId] = useState<string>(sprites[0]?.id ?? '')
  const [placeZoneRanges, setPlaceZoneRanges] = useState({
    touch: DEFAULT_ZONE_RANGE.touch,
    interact: DEFAULT_ZONE_RANGE.interact,
  })

  useEffect(() => {
    if (
      location.module === 'scene' &&
      location.subpage === 'workspace' &&
      location.objectId &&
      scenes.some((candidate) => candidate.id === location.objectId)
    )
      setPlaceSceneId(location.objectId)
  }, [location, scenes])

  const scene = (scenes.find((candidate) => candidate.id === placeSceneId) ??
    scenes.find((candidate) => candidate.id === defaultSceneId))!
  const switchPlaceScene = useCallback(
    (id: string): void => {
      setPlaceSceneId(id)
      setSelected(SCENE_SELECTION)
      setPlacingEntity(false)
      const current = locationRef.current
      if (current.module === 'scene' && current.subpage === 'workspace')
        applyLocation({ ...current, objectId: id }, 'replace')
    },
    [applyLocation],
  )

  return {
    selected,
    setSelected,
    sceneLifecycleIntent,
    setSceneLifecycleIntent,
    createSceneButtonRef,
    sceneOutlineRowRef,
    placingEntity,
    setPlacingEntity,
    scriptChannel,
    setScriptChannel,
    selectedBehavior,
    setSelectedBehavior,
    selectedPage,
    setSelectedPage,
    canvasLayers,
    setCanvasLayers,
    placeSceneId,
    setPlaceSceneId,
    placeMode,
    setPlaceMode,
    placeActorId,
    setPlaceActorId,
    placeSpriteId,
    setPlaceSpriteId,
    placeZoneRanges,
    setPlaceZoneRanges,
    scene,
    switchPlaceScene,
  }
}
