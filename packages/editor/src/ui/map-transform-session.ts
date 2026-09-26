import type { LatticePos, ProjectMap } from '@type-pal/reforge'
import { useCallback, useReducer } from 'react'
import type { MapSelection } from '../core/map-selection.js'
import {
  type IsometricNudgeDirection,
  type MapCellClipboard,
  type MapLayerMapping,
  nudgeIsometricLattice,
} from '../core/map-transform.js'
import type { StampGroupClipboard } from '../core/stamp-group-transform.js'

export type MapWorkspaceClipboard = MapCellClipboard | StampGroupClipboard

export type MapTransformIntent =
  | {
      kind: 'paste'
      clipboard: MapWorkspaceClipboard
      anchor: LatticePos
      layerMappings: readonly MapLayerMapping[]
    }
  | {
      kind: 'move'
      selection: MapSelection
      anchor: LatticePos
      includeCollision: boolean
      layerMappings: readonly MapLayerMapping[]
      stampClipboard?: StampGroupClipboard
      stampBaseMap?: ProjectMap
    }

export interface MapTransformSessionState {
  includeCollision: boolean
  clipboard?: MapWorkspaceClipboard
  intent?: MapTransformIntent
  targetLocked: boolean
  overwriteIntent?: MapTransformIntent
}

export const initialMapTransformSessionState: MapTransformSessionState = {
  includeCollision: false,
  targetLocked: false,
}

type MapTransformSessionAction =
  | { type: 'set-include-collision'; value: boolean }
  | { type: 'remember-clipboard'; clipboard: MapWorkspaceClipboard | undefined }
  | { type: 'reset-session' }
  | { type: 'reset-map' }
  | { type: 'begin'; intent: MapTransformIntent; targetLocked: boolean }
  | { type: 'lock-target'; intent?: MapTransformIntent }
  | { type: 'unlock-target' }
  | { type: 'request-overwrite'; intent: MapTransformIntent }
  | { type: 'return-to-adjustment' }
  | { type: 'clear-overwrite' }
  | { type: 'complete' }
  | { type: 'update-anchor'; anchor: LatticePos }
  | { type: 'nudge'; direction: IsometricNudgeDirection }

export function mapTransformSessionReducer(
  state: MapTransformSessionState,
  action: MapTransformSessionAction,
): MapTransformSessionState {
  switch (action.type) {
    case 'set-include-collision':
      return { ...state, includeCollision: action.value }
    case 'remember-clipboard':
      return { ...state, clipboard: action.clipboard }
    case 'reset-session':
      return {
        ...state,
        clipboard: undefined,
        intent: undefined,
        targetLocked: false,
        overwriteIntent: undefined,
      }
    case 'reset-map':
      return {
        ...state,
        clipboard: state.clipboard?.kind === 'stamp-placements' ? undefined : state.clipboard,
        intent: undefined,
        targetLocked: false,
        overwriteIntent: undefined,
      }
    case 'begin':
      return {
        ...state,
        intent: action.intent,
        targetLocked: action.targetLocked,
        overwriteIntent: undefined,
      }
    case 'lock-target':
      return {
        ...state,
        intent: action.intent ?? state.intent,
        targetLocked: true,
        overwriteIntent: undefined,
      }
    case 'unlock-target':
      return { ...state, targetLocked: false }
    case 'request-overwrite':
      return { ...state, overwriteIntent: action.intent }
    case 'return-to-adjustment':
      return { ...state, targetLocked: false, overwriteIntent: undefined }
    case 'clear-overwrite':
      return { ...state, overwriteIntent: undefined }
    case 'complete':
      return { ...state, intent: undefined, targetLocked: false, overwriteIntent: undefined }
    case 'update-anchor':
      return state.intent ? { ...state, intent: { ...state.intent, anchor: action.anchor } } : state
    case 'nudge':
      return state.intent
        ? {
            ...state,
            intent: {
              ...state.intent,
              anchor: nudgeIsometricLattice(state.intent.anchor, action.direction),
            },
            targetLocked: true,
          }
        : state
  }
}

export function isStampGroupTransform(intent: MapTransformIntent): boolean {
  return intent.kind === 'paste'
    ? intent.clipboard.kind === 'stamp-placements'
    : intent.selection.kind === 'stamp-placements'
}

export function useMapTransformSession() {
  const [state, dispatch] = useReducer(mapTransformSessionReducer, initialMapTransformSessionState)
  const setIncludeCollision = useCallback(
    (value: boolean) => dispatch({ type: 'set-include-collision', value }),
    [],
  )
  const rememberClipboard = useCallback(
    (clipboard: MapWorkspaceClipboard | undefined) =>
      dispatch({ type: 'remember-clipboard', clipboard }),
    [],
  )
  const resetSession = useCallback(() => dispatch({ type: 'reset-session' }), [])
  const resetMap = useCallback(() => dispatch({ type: 'reset-map' }), [])
  const begin = useCallback(
    (intent: MapTransformIntent, targetLocked = false) =>
      dispatch({ type: 'begin', intent, targetLocked }),
    [],
  )
  const lockTarget = useCallback(
    (intent?: MapTransformIntent) => dispatch({ type: 'lock-target', intent }),
    [],
  )
  const unlockTarget = useCallback(() => dispatch({ type: 'unlock-target' }), [])
  const requestOverwrite = useCallback(
    (intent: MapTransformIntent) => dispatch({ type: 'request-overwrite', intent }),
    [],
  )
  const returnToAdjustment = useCallback(() => dispatch({ type: 'return-to-adjustment' }), [])
  const clearOverwrite = useCallback(() => dispatch({ type: 'clear-overwrite' }), [])
  const complete = useCallback(() => dispatch({ type: 'complete' }), [])
  const updateAnchor = useCallback(
    (anchor: LatticePos) => dispatch({ type: 'update-anchor', anchor }),
    [],
  )
  const nudge = useCallback(
    (direction: IsometricNudgeDirection) => dispatch({ type: 'nudge', direction }),
    [],
  )

  return {
    ...state,
    setIncludeCollision,
    rememberClipboard,
    resetSession,
    resetMap,
    begin,
    lockTarget,
    unlockTarget,
    requestOverwrite,
    returnToAdjustment,
    clearOverwrite,
    complete,
    updateAnchor,
    nudge,
  }
}
