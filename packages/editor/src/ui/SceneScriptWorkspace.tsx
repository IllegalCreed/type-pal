import type {
  ActorDef,
  AssetCatalogV1,
  FlowCursor,
  Locale,
  MapIndexV1,
  SceneDef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import type { AssetBase, ProjectMap } from '@type-pal/reforge'
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import { entityDisplayLabel } from '../core/entity-display.js'
import { activePageTriggerActivation } from '../core/entity-placement.js'
import type { EditorPlayIdentity } from '../core/play-url.js'
import { Playback } from '../core/playback.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type {
  CanonicalScriptReference,
  SceneHookSlot,
  ScriptCommandOwner,
  ScriptEditorCommand,
  ScriptEditorState,
} from '../core/script-editor.js'
import { previewCursorKey, previewFlowCursor } from '../core/script-flow-preview.js'
import {
  applySceneInitialState,
  emptyScriptPreviewLibrary,
  type SceneInitialState,
  type ScriptPreviewEntry,
  type ScriptPreviewLibrary,
  scriptPreviewEntryExists,
  scriptPreviewEntryKey,
} from '../core/script-preview-library.js'
import { DsInspectorPortal, DsSelect, DsTabs } from './design-system/index.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
import { SceneCanvas } from './SceneCanvas.js'
import { SceneInitialStateInspector, SceneInitialStateList } from './SceneInitialStateEditor.js'
import { ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'
import type { CanonicalScriptEditorContext } from './ScriptEditor.js'
import { ScriptSceneHookInspector } from './ScriptSceneHookInspector.js'

const EMPTY_STAGES: readonly ScriptStage[] = []
const DRAWER_DEFAULT_HEIGHT = 420
const DRAWER_MIN_HEIGHT = 220
const PREVIEW_MIN_HEIGHT = 140
const RESIZER_SIZE = 1

type SceneScriptOwner = Extract<ScriptCommandOwner, { kind: 'entity-behavior' | 'scene-hook' }>

export function CanonicalSceneScriptWorkspace(props: {
  scene: SceneDef
  state: ScriptEditorState
  selectedEntityId?: string | null
  selectedPageId?: string
  sceneSelected?: boolean
  initialStates?: ScriptPreviewLibrary
  onInitialStatesChange?: (library: ScriptPreviewLibrary) => void
  initialStatePropertiesHost?: HTMLElement | null
  onEditingInitialState?: (editing: boolean) => void
  locale: Locale
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  projectMaps: Record<string, ProjectMap>
  mapIndex: MapIndexV1
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  playIdentity: EditorPlayIdentity
  layers?: { grid: boolean; blocked: boolean; ghosts?: boolean }
  editorContext?: CanonicalScriptEditorContext
  onDispatch: (command: ScriptEditorCommand) => void
  onOpenReference?: (reference: ProjectReferenceEdge) => void
  focusReference?: { reference: CanonicalScriptReference; revision: number }
  focusOwner?: { owner: SceneScriptOwner; revision: number }
  onError?: (message: string) => void
  projectReferenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
}) {
  const hasScriptOwner = !!props.selectedEntityId || props.sceneSelected !== false
  const owner = props.selectedEntityId ? 'entity' : 'scene'
  const [sceneTab, setSceneTab] = useState<'onEnter' | 'onTeleport' | 'initial-state'>('onEnter')
  const [hookSlot, setHookSlot] = useState<SceneHookSlot>('onEnter')
  const [selectedHooks, setSelectedHooks] = useState<Partial<Record<SceneHookSlot, string>>>({})
  const [behaviorChannel, setBehaviorChannel] = useState<'trigger' | 'auto'>('trigger')
  const [selectedBehaviors, setSelectedBehaviors] = useState<
    Partial<Record<'trigger' | 'auto', string>>
  >({})
  const scriptWorkRef = useRef<HTMLDivElement>(null)
  const [scriptWorkHeight, setScriptWorkHeight] = useState(0)
  const [drawerHeight, setDrawerHeight] = useStoredPanelNumber(
    'type-pal:editor:canonical-script-drawer-height',
    DRAWER_DEFAULT_HEIGHT,
  )

  useEffect(() => {
    const target = scriptWorkRef.current
    if (!target) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setScriptWorkHeight(entry.contentRect.height)
    })
    observer.observe(target)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const referenceFocus = props.focusReference
    const ownerFocus = props.focusOwner
    if (!referenceFocus && !ownerFocus) return
    if (
      referenceFocus &&
      (!ownerFocus || referenceFocus.revision > ownerFocus.revision) &&
      referenceFocus.reference.locator.kind === 'scene-hook-initial'
    ) {
      const locator = referenceFocus.reference.locator
      if (locator.sceneId !== props.scene.id) return
      setSceneTab(locator.slot)
      setHookSlot(locator.slot)
      setSelectedHooks((current) => ({ ...current, [locator.slot]: locator.hookId }))
      return
    }
    const commandOwner =
      ownerFocus && (!referenceFocus || ownerFocus.revision >= referenceFocus.revision)
        ? ownerFocus.owner
        : referenceFocus?.reference.locator.kind === 'command'
          ? referenceFocus.reference.locator.owner
          : undefined
    if (!commandOwner) return
    if (commandOwner.kind === 'scene-hook' && commandOwner.sceneId === props.scene.id) {
      setSceneTab(commandOwner.slot)
      setHookSlot(commandOwner.slot)
      setSelectedHooks((current) => ({
        ...current,
        [commandOwner.slot]: commandOwner.hookId,
      }))
      return
    }
    if (
      commandOwner.kind === 'entity-behavior' &&
      commandOwner.sceneId === props.scene.id &&
      commandOwner.entityId === props.selectedEntityId
    ) {
      setBehaviorChannel(commandOwner.channel)
      setSelectedBehaviors((current) => ({
        ...current,
        [commandOwner.channel]: commandOwner.behaviorId,
      }))
    }
  }, [props.focusOwner, props.focusReference, props.scene.id, props.selectedEntityId])

  const canonicalScene = props.state.scenes.find((candidate) => candidate.id === props.scene.id)
  const canonicalEntity = canonicalScene?.entities.find(
    (candidate) => candidate.id === props.selectedEntityId,
  )
  const hookVariants = canonicalScene?.hooks?.[hookSlot]?.variants ?? {}
  const activeHookId =
    (selectedHooks[hookSlot] && hookVariants[selectedHooks[hookSlot]!]
      ? selectedHooks[hookSlot]
      : Object.entries(hookVariants).sort(
          ([leftId, left], [rightId, right]) =>
            left.order - right.order || leftId.localeCompare(rightId),
        )[0]?.[0]) ?? ''
  const behaviorVariants = canonicalEntity?.behaviors?.[behaviorChannel] ?? {}
  const activeBehaviorId =
    (selectedBehaviors[behaviorChannel] && behaviorVariants[selectedBehaviors[behaviorChannel]!]
      ? selectedBehaviors[behaviorChannel]
      : Object.entries(behaviorVariants).sort(
          ([leftId, left], [rightId, right]) =>
            left.order - right.order || leftId.localeCompare(rightId),
        )[0]?.[0]) ?? ''
  const activeFlow = !hasScriptOwner
    ? undefined
    : owner === 'scene'
      ? hookVariants[activeHookId]?.flow
      : behaviorVariants[activeBehaviorId]?.flow
  const canonicalEntityPage =
    canonicalEntity?.pages?.find((page) => page.id === props.selectedPageId) ??
    canonicalEntity?.pages?.find((page) => page.id === canonicalEntity.initialPage) ??
    canonicalEntity?.pages?.[0]
  const previewEntityId = props.selectedEntityId ?? canonicalScene?.entities[0]?.id ?? '__scene'
  const previewSourceKey =
    owner === 'scene'
      ? hookSlot === 'onEnter'
        ? `s:${props.scene.id}:canonical:${activeHookId || 'none'}`
        : `canonical:teleport:${props.scene.id}:${activeHookId || 'none'}`
      : `canonical:entity:${props.scene.id}:${props.selectedEntityId ?? 'none'}:${behaviorChannel}:${activeBehaviorId || 'none'}`
  const [selectedPreview, setSelectedPreview] = useState<{ source: string; cursor: FlowCursor }>()
  const previewCursor = useMemo(
    () =>
      activeFlow
        ? previewFlowCursor(
            activeFlow,
            selectedPreview?.source === previewSourceKey ? selectedPreview.cursor : undefined,
          )
        : undefined,
    [activeFlow, selectedPreview, previewSourceKey],
  )
  const previewSelectionKey = `${previewSourceKey}:${previewCursorKey(previewCursor)}`
  const library = props.initialStates ?? emptyScriptPreviewLibrary()
  const states = library.states.filter((state) => state.sceneId === props.scene.id)
  const [stateSelection, setStateSelection] = useState<{ stateId: string; entityId?: string }>()
  const editingState =
    owner === 'scene' && props.sceneSelected !== false && sceneTab === 'initial-state'
  const selectedState = states.find((state) => state.id === stateSelection?.stateId) ?? states[0]
  const editingEntityId =
    stateSelection?.stateId === selectedState?.id
      ? stateSelection?.entityId
      : selectedState?.entities[0]?.entityId
  const entry: ScriptPreviewEntry | undefined =
    activeFlow && previewCursor?.kind === 'stage'
      ? {
          sceneId: props.scene.id,
          ...(owner === 'entity' ? { entityId: props.selectedEntityId! } : {}),
          channel: owner === 'scene' ? hookSlot : behaviorChannel,
          schemeId: owner === 'scene' ? activeHookId : activeBehaviorId,
          stageId: previewCursor.stage,
        }
      : undefined
  const binding = entry
    ? library.bindings.find((b) => scriptPreviewEntryKey(b.entry) === scriptPreviewEntryKey(entry))
    : undefined
  const initialState = editingState
    ? selectedState
    : states.find((state) => state.id === binding?.stateId)
  const projection = useMemo(() => {
    try {
      if (!editingState && binding && !initialState)
        throw new Error(`初始状态 ${binding.stateId} 已失效，请重新选择。`)
      return {
        scene: applySceneInitialState(props.scene, initialState),
        canonical: canonicalScene
          ? applySceneInitialState(canonicalScene, initialState)
          : undefined,
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [props.scene, canonicalScene, initialState, binding, editingState])
  const playback = useMemo(
    () =>
      new Playback(
        projection.scene ?? props.scene,
        undefined,
        new Map(props.state.items.map((item) => [item.id, item.name])),
        props.locale,
      ),
    [projection.scene, props.scene, props.state.items, props.locale],
  )
  const onEditingInitialState = props.onEditingInitialState
  useEffect(() => {
    onEditingInitialState?.(editingState)
    return () => onEditingInitialState?.(false)
  }, [editingState, onEditingInitialState])
  const updateState = (state: SceneInitialState) => {
    props.onInitialStatesChange?.({
      ...library,
      states: library.states.map((s) => (s.id === state.id ? state : s)),
    })
  }
  const selectStateEntity = (entityId: string) => {
    if (selectedState) setStateSelection({ stateId: selectedState.id, entityId })
  }
  const stateSelector = (
    <DsSelect
      aria-label="预览初始状态"
      size="compact"
      value={binding?.stateId ?? ''}
      disabled={!entry}
      options={[
        { value: '', label: '初始状态：场景默认' },
        ...(!initialState && binding
          ? [{ value: binding.stateId, label: '初始状态：引用失效' }]
          : []),
        ...states.map((state) => ({ value: state.id, label: `初始状态：${state.name}` })),
      ]}
      onValueChange={(stateId) => {
        if (!entry) return
        playback.stop()
        props.onInitialStatesChange?.({
          ...library,
          bindings: [
            ...library.bindings.filter(
              (b) => scriptPreviewEntryKey(b.entry) !== scriptPreviewEntryKey(entry),
            ),
            ...(stateId ? [{ entry, stateId }] : []),
          ],
        })
      }}
    />
  )
  const selectPreviewCursor = useCallback(
    (cursor: FlowCursor) => {
      playback.stop()
      setSelectedPreview({ source: previewSourceKey, cursor })
    },
    [playback, previewSourceKey],
  )
  const [, setUiTick] = useState(0)

  useEffect(() => {
    playback.onUi = () => setUiTick((value) => value + 1)
    return () => playback.stop()
  }, [playback])

  useEffect(() => {
    void previewSelectionKey
    playback.stop()
  }, [playback, previewSelectionKey])

  const measuredWorkHeight = scriptWorkHeight || 720
  const drawerMaxHeight = Math.max(
    DRAWER_MIN_HEIGHT,
    measuredWorkHeight - PREVIEW_MIN_HEIGHT - RESIZER_SIZE,
  )
  const visibleDrawerHeight = clampPanelSize(drawerHeight, DRAWER_MIN_HEIGHT, drawerMaxHeight)
  const scriptTabs = props.selectedEntityId
    ? [
        { id: 'entity-trigger', label: '交互脚本' },
        { id: 'entity-auto', label: '自动行为' },
      ]
    : [
        { id: 'scene-onEnter', label: '进场脚本' },
        { id: 'scene-onTeleport', label: '传送出口' },
        { id: 'scene-initial-state', label: '初始状态' },
      ]
  const style = {
    '--script-drawer-height': `${visibleDrawerHeight}px`,
  } as CSSProperties

  return (
    <div ref={scriptWorkRef} className="script-work canonical-scene-script-workspace" style={style}>
      <div className="work-preview">
        {projection.error ? (
          <div className="initial-state-error" role="alert">
            {projection.error}
            {!editingState ? stateSelector : null}
          </div>
        ) : editingState ? (
          <div className="initial-state-canvas">
            <div className="initial-state-canvas-label">
              {selectedState ? `初始状态 · ${selectedState.name}` : '场景默认状态'}
              <span>选择实体 · 拖动摆位</span>
            </div>
            <SceneCanvas
              scene={projection.scene!}
              sprites={props.sprites}
              actorsById={props.actorsById}
              locale={props.locale}
              leaderSpriteId={props.leaderSpriteId}
              assetBase={props.assetBase}
              assetCatalog={props.assetCatalog}
              assetReader={props.assetReader}
              projectMaps={props.projectMaps}
              mapIndex={props.mapIndex}
              tilesets={props.tilesets}
              selectedEntityId={editingEntityId ?? null}
              focusRegion={
                selectedState
                  ? {
                      key: selectedState.id,
                      positions: selectedState.entities.flatMap((entry) => {
                        const entity = projection.scene!.entities.find(
                          (e) => e.id === entry.entityId,
                        )
                        return entity ? [entity.pos] : []
                      }),
                    }
                  : undefined
              }
              placingEntity={false}
              layers={{
                base: true,
                cover: true,
                entities: true,
                entries: false,
                grid: props.layers?.grid ?? false,
                blocked: props.layers?.blocked ?? false,
                ghosts: props.layers?.ghosts ?? true,
              }}
              onSelectEntity={selectStateEntity}
              onMoveEntity={(entityId, cell) => {
                if (!selectedState) return
                const entity = projection.scene!.entities.find((e) => e.id === entityId)
                if (!entity) return
                const old = selectedState.entities.find((e) => e.entityId === entityId)
                const next = { ...old, entityId, pos: { ...entity.pos, ...cell } }
                updateState({
                  ...selectedState,
                  entities: old
                    ? selectedState.entities.map((e) => (e.entityId === entityId ? next : e))
                    : [...selectedState.entities, next],
                })
                selectStateEntity(entityId)
              }}
              onSelectAnchor={() => {}}
              onMoveAnchor={() => {}}
              onAddAt={() => {}}
              onClearSelection={() => {
                if (selectedState) setStateSelection({ stateId: selectedState.id })
              }}
            />
          </div>
        ) : (
          <PreviewCanvas
            scene={projection.scene!}
            stages={EMPTY_STAGES}
            sourceKey={previewSelectionKey}
            playIdentity={props.playIdentity}
            focusEntityId={owner === 'entity' ? (props.selectedEntityId ?? undefined) : undefined}
            focusTriggerActivation={
              owner === 'entity' ? activePageTriggerActivation(canonicalEntityPage) : undefined
            }
            sprites={props.sprites}
            actorsById={props.actorsById}
            leaderSpriteId={props.leaderSpriteId}
            assetBase={props.assetBase}
            assetCatalog={props.assetCatalog}
            assetReader={props.assetReader}
            projectMaps={props.projectMaps}
            mapIndex={props.mapIndex}
            tilesets={props.tilesets}
            locale={props.locale}
            playback={playback}
            initialStateControl={stateSelector}
            canonicalFlow={activeFlow}
            canonicalCursor={previewCursor}
            canonicalSceneEntry={hasScriptOwner && owner === 'scene' && hookSlot === 'onEnter'}
            canonicalSharedScripts={props.state.sharedScripts}
            startPlayback={
              activeFlow && projection.canonical
                ? (paused) =>
                    playback.playCanonical(previewSelectionKey, activeFlow, {
                      cursor: previewCursor,
                      scene: projection.canonical!,
                      scenes: props.state.scenes,
                      sharedScripts: props.state.sharedScripts,
                      actorsById: props.actorsById,
                      ...(owner === 'entity'
                        ? {
                            self: {
                              scene: props.scene.id,
                              entity: previewEntityId,
                            },
                          }
                        : {}),
                      timing:
                        owner === 'entity' && behaviorChannel === 'auto' ? 'auto' : 'interactive',
                      allowSceneEntry: owner === 'scene' && hookSlot === 'onEnter',
                      runSceneEntry: owner === 'scene' && hookSlot === 'onEnter',
                      paused,
                      ...(owner === 'entity' && props.selectedEntityId
                        ? { ownerId: props.selectedEntityId }
                        : {}),
                    })
                : undefined
            }
            layers={props.layers}
            sceneFraming={owner === 'scene'}
            hint={
              !hasScriptOwner
                ? '选择左侧场景标题或实体，编辑对应脚本与初始状态。'
                : activeFlow
                  ? undefined
                  : owner === 'scene'
                    ? `当前${hookSlot === 'onEnter' ? '进场脚本' : '传送出口脚本'}尚未创建；可在下方新建。`
                    : `当前实体的${behaviorChannel === 'trigger' ? '交互脚本' : '自动行为'}尚未创建；可在下方新建。`
            }
          />
        )}
      </div>

      <PanelResizeHandle
        orientation="horizontal"
        className="script-height-resizer"
        value={visibleDrawerHeight}
        min={DRAWER_MIN_HEIGHT}
        max={drawerMaxHeight}
        resizeLabel="调整脚本面板高度"
        onReset={() => setDrawerHeight(DRAWER_DEFAULT_HEIGHT)}
        onResize={(delta) =>
          setDrawerHeight((current) =>
            clampPanelSize(current - delta, DRAWER_MIN_HEIGHT, drawerMaxHeight),
          )
        }
      />

      <div className="script-drawer canonical-script-drawer">
        <div className="drawer-head">
          <span
            className="t"
            title={
              owner === 'entity' && canonicalEntity
                ? entityDisplayLabel(canonicalEntity, props.actorsById, props.locale)
                : props.scene.id
            }
          >
            {owner === 'entity' && canonicalEntity
              ? entityDisplayLabel(canonicalEntity, props.actorsById, props.locale)
              : props.scene.id}
          </span>
          {hasScriptOwner ? (
            <DsTabs
              variant="inspector"
              label="脚本类型"
              activeId={owner === 'scene' ? `scene-${sceneTab}` : `entity-${behaviorChannel}`}
              items={scriptTabs}
              onChange={(id) => {
                if (id === 'scene-initial-state') {
                  playback.stop()
                  setSceneTab('initial-state')
                  return
                }
                if (id === 'scene-onEnter' || id === 'scene-onTeleport') {
                  setSceneTab(id === 'scene-onEnter' ? 'onEnter' : 'onTeleport')
                  setHookSlot(id === 'scene-onEnter' ? 'onEnter' : 'onTeleport')
                  return
                }
                setBehaviorChannel(id === 'entity-auto' ? 'auto' : 'trigger')
              }}
            />
          ) : null}
        </div>

        <div className="canonical-script-drawer-body">
          {!hasScriptOwner ? (
            <p className="hint2">落点属性在右侧编辑；选择场景标题或实体后显示对应脚本。</p>
          ) : editingState ? (
            <SceneInitialStateList
              scene={props.scene}
              states={states}
              selected={selectedState}
              selectedEntityId={editingEntityId}
              actorsById={props.actorsById}
              locale={props.locale}
              references={
                library.bindings.filter(
                  (b) =>
                    b.stateId === selectedState?.id &&
                    scriptPreviewEntryExists(b.entry, props.state.scenes),
                ).length
              }
              missingReferences={
                library.bindings.filter(
                  (b) =>
                    b.stateId === selectedState?.id &&
                    !scriptPreviewEntryExists(b.entry, props.state.scenes),
                ).length
              }
              revision={JSON.stringify(library)}
              onSelect={(stateId) =>
                setStateSelection({
                  stateId,
                  entityId: states.find((s) => s.id === stateId)?.entities[0]?.entityId,
                })
              }
              onSelectEntity={selectStateEntity}
              onChange={updateState}
              onCreate={(copy) => {
                const state: SceneInitialState = {
                  id: crypto.randomUUID(),
                  sceneId: props.scene.id,
                  name: copy ? `${copy.name} 副本` : `初始状态 ${states.length + 1}`,
                  entities: copy ? structuredClone(copy.entities) : [],
                }
                props.onInitialStatesChange?.({ ...library, states: [...library.states, state] })
                setStateSelection({ stateId: state.id, entityId: state.entities[0]?.entityId })
              }}
              onDelete={(id) => {
                if (
                  library.bindings.some(
                    (b) =>
                      b.stateId === id && scriptPreviewEntryExists(b.entry, props.state.scenes),
                  )
                )
                  return
                props.onInitialStatesChange?.({
                  ...library,
                  states: library.states.filter((s) => s.id !== id),
                  bindings: library.bindings.filter((b) => b.stateId !== id),
                })
              }}
            />
          ) : owner === 'scene' ? (
            <ScriptSceneHookInspector
              previewCursor={previewCursor}
              onSelectPreviewCursor={selectPreviewCursor}
              state={props.state}
              sceneId={props.scene.id}
              slot={hookSlot}
              onSlotChange={(slot) => {
                setHookSlot(slot)
                setSceneTab(slot)
              }}
              selectedHookId={selectedHooks[hookSlot]}
              onSelectHook={(hookId) =>
                setSelectedHooks((current) => {
                  const next = { ...current }
                  if (hookId) next[hookSlot] = hookId
                  else delete next[hookSlot]
                  return next
                })
              }
              onDispatch={props.onDispatch}
              onOpenReference={props.onOpenReference}
              focusCommand={
                props.focusReference?.reference.locator.kind === 'command'
                  ? {
                      locator: props.focusReference.reference.locator,
                      revision: props.focusReference.revision,
                    }
                  : undefined
              }
              onError={props.onError}
              referenceIndex={props.projectReferenceIndex}
              referenceStatus={props.referenceStatus}
              editorContext={
                props.editorContext
                  ? {
                      ...props.editorContext,
                      currentSceneId: props.scene.id,
                      currentEntityId: props.selectedEntityId ?? undefined,
                    }
                  : undefined
              }
            />
          ) : props.selectedEntityId ? (
            <ScriptBehaviorInspector
              previewCursor={previewCursor}
              onSelectPreviewCursor={selectPreviewCursor}
              state={props.state}
              target={{ scene: props.scene.id, entity: props.selectedEntityId }}
              channel={behaviorChannel}
              selectedBehaviorId={selectedBehaviors[behaviorChannel]}
              onSelectBehavior={(behaviorId) =>
                setSelectedBehaviors((current) => ({
                  ...current,
                  [behaviorChannel]: behaviorId,
                }))
              }
              onDispatch={props.onDispatch}
              onOpenReference={props.onOpenReference}
              focusCommand={
                props.focusReference?.reference.locator.kind === 'command'
                  ? {
                      locator: props.focusReference.reference.locator,
                      revision: props.focusReference.revision,
                    }
                  : undefined
              }
              onError={props.onError}
              referenceIndex={props.projectReferenceIndex}
              referenceStatus={props.referenceStatus}
              editorContext={
                props.editorContext
                  ? {
                      ...props.editorContext,
                      currentSceneId: props.scene.id,
                      currentEntityId: props.selectedEntityId,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="canonical-scene-script-empty">
              从左侧场景大纲选择一个实体，再编辑它的具名触发/自动行为。
            </div>
          )}
        </div>
      </div>
      {editingState && props.initialStatePropertiesHost ? (
        <DsInspectorPortal host={props.initialStatePropertiesHost}>
          <SceneInitialStateInspector
            state={selectedState}
            entityId={editingEntityId}
            entity={props.scene.entities.find((e) => e.id === editingEntityId)}
            actorsById={props.actorsById}
            locale={props.locale}
            revision={JSON.stringify(library)}
            onChange={(entry) => {
              if (!selectedState) return
              const old = selectedState.entities.some((e) => e.entityId === entry.entityId)
              updateState({
                ...selectedState,
                entities: old
                  ? selectedState.entities.map((e) => (e.entityId === entry.entityId ? entry : e))
                  : [...selectedState.entities, entry],
              })
            }}
            onRemove={(entityId) => {
              if (selectedState)
                updateState({
                  ...selectedState,
                  entities: selectedState.entities.filter((e) => e.entityId !== entityId),
                })
            }}
          />
        </DsInspectorPortal>
      ) : null}
    </div>
  )
}
