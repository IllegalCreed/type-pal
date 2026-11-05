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
import { SaveSceneHookDetailsCommand, UpdateEntityBehaviorCommand } from '../core/script-editor.js'
import { previewCursorKey, previewFlowCursor } from '../core/script-flow-preview.js'
import {
  applySceneInitialState,
  applyScriptPreviewState,
  emptyScriptPreviewLibrary,
  resolveScriptPreviewBinding,
  type ScriptPreviewEntry,
  type ScriptPreviewLibrary,
  type ScriptPreviewSchemeEntry,
  scriptPreviewEntryKey,
  scriptPreviewSchemeKey,
} from '../core/script-preview-library.js'
import { DsButton, DsSelect, DsTabs } from './design-system/index.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
import { previewEntityName } from './SceneInitialStateEditor.js'
import { ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'
import type {
  CanonicalScriptEditorContext,
  ScriptPreviewDetails,
  ScriptPreviewDetailsRequest,
} from './ScriptEditor.js'
import { ScriptSceneHookInspector } from './ScriptSceneHookInspector.js'
import {
  previewSourceKey as entrySourceKey,
  type InitialStateDetailsNavigation,
  type InitialStateReturn,
  previewEntryLabel,
} from './script-preview-navigation.js'

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
  onDispatchWithInitialStates?: (
    command: ScriptEditorCommand,
    library: ScriptPreviewLibrary,
  ) => void
  onOpenInitialState?: (stateId: string | undefined, target: InitialStateReturn) => void
  detailsNavigation?: InitialStateDetailsNavigation
  onDetailsNavigationConsumed?(): void
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
  const [sceneTab, setSceneTab] = useState<'onEnter' | 'onTeleport'>('onEnter')
  const [detailsRequest, setDetailsRequest] = useState<{
    sourceKey: string
    request: ScriptPreviewDetailsRequest
  }>()
  const ownerKey = JSON.stringify([props.scene.id, props.selectedEntityId ?? null])
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
    setDetailsRequest(undefined)
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
  const states = library.states
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
  const resolved = entry ? resolveScriptPreviewBinding(library, entry) : undefined
  const initialState = states.find((state) => state.id === resolved?.stateId)
  useEffect(() => {
    void ownerKey
    setDetailsRequest(undefined)
  }, [ownerKey])
  useEffect(() => {
    if (detailsRequest && detailsRequest.sourceKey !== previewSourceKey)
      setDetailsRequest(undefined)
  }, [detailsRequest, previewSourceKey])
  useEffect(() => {
    const navigation = props.detailsNavigation
    if (!navigation) return
    const { origin, request } = navigation
    const sourceKey = entrySourceKey(origin)
    if (origin.channel === 'trigger' || origin.channel === 'auto') {
      setBehaviorChannel(origin.channel)
      setSelectedBehaviors((current) => ({ ...current, [origin.channel]: origin.schemeId }))
    } else {
      setHookSlot(origin.channel)
      setSceneTab(origin.channel)
      setSelectedHooks((current) => ({ ...current, [origin.channel]: origin.schemeId }))
    }
    setSelectedPreview({ source: sourceKey, cursor: { kind: 'stage', stage: origin.stageId } })
    setDetailsRequest({ sourceKey, request })
    props.onDetailsNavigationConsumed?.()
  }, [props.detailsNavigation, props.onDetailsNavigationConsumed])
  const projection = useMemo(() => {
    try {
      if (resolved?.stateId && !initialState)
        throw new Error(`初始状态 ${resolved.stateId} 已失效，请重新选择。`)
      return {
        scene: applySceneInitialState(props.scene, initialState),
        canonical: canonicalScene
          ? applySceneInitialState(canonicalScene, initialState)
          : undefined,
        scenes: applyScriptPreviewState(props.state.scenes, initialState),
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [props.scene, props.state.scenes, canonicalScene, initialState, resolved?.stateId])
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
  const schemeEntry = (schemeId: string): ScriptPreviewSchemeEntry => ({
    sceneId: props.scene.id,
    ...(owner === 'entity' ? { entityId: props.selectedEntityId! } : {}),
    channel: owner === 'entity' ? behaviorChannel : hookSlot,
    schemeId,
  })
  const withSchemeDefault = (
    target: ScriptPreviewSchemeEntry,
    stateId: string,
  ): ScriptPreviewLibrary => ({
    ...library,
    schemeDefaults: [
      ...library.schemeDefaults.filter(
        (saved) => scriptPreviewSchemeKey(saved.entry) !== scriptPreviewSchemeKey(target),
      ),
      ...(stateId ? [{ entry: target, stateId }] : []),
    ],
  })
  const visitLibrary = (target: InitialStateReturn, stateId: string | null | undefined) => {
    playback.stop()
    setDetailsRequest(undefined)
    props.onOpenInitialState?.(stateId ?? undefined, target)
  }
  const previewDetails: ScriptPreviewDetails = {
    step: (schemeId, stageId, close) => {
      const target: ScriptPreviewEntry = { ...schemeEntry(schemeId), stageId }
      const binding = library.bindings.find(
        (saved) => scriptPreviewEntryKey(saved.entry) === scriptPreviewEntryKey(target),
      )
      const inherited = library.schemeDefaults.find(
        (saved) => scriptPreviewSchemeKey(saved.entry) === scriptPreviewSchemeKey(target),
      )
      const inheritedName =
        states.find((state) => state.id === inherited?.stateId)?.name ??
        (inherited ? '引用失效' : '场景默认')
      const effective = resolveScriptPreviewBinding(library, target)
      const effectiveState = states.find((state) => state.id === effective.stateId)
      return (
        <section className="initial-state-reference" aria-label="此步骤的预览初始状态">
          <strong>此步骤的预览初始状态</strong>
          <DsSelect
            aria-label="此步骤的预览初始状态"
            value={
              binding
                ? binding.stateId === null
                  ? 'scene'
                  : `state:${binding.stateId}`
                : 'inherit'
            }
            options={[
              { value: 'inherit', label: `继承方案默认：${inheritedName}` },
              { value: 'scene', label: '场景默认（此步骤不继承）' },
              ...(binding?.stateId && !states.some((state) => state.id === binding.stateId)
                ? [{ value: `state:${binding.stateId}`, label: '引用失效，请重新选择' }]
                : []),
              ...states.map((state) => ({ value: `state:${state.id}`, label: state.name })),
            ]}
            onValueChange={(selection) => {
              playback.stop()
              props.onInitialStatesChange?.({
                ...library,
                bindings: [
                  ...library.bindings.filter(
                    (saved) => scriptPreviewEntryKey(saved.entry) !== scriptPreviewEntryKey(target),
                  ),
                  ...(selection === 'inherit'
                    ? []
                    : [
                        {
                          entry: target,
                          stateId: selection === 'scene' ? null : selection.slice(6),
                        },
                      ]),
                ],
              })
            }}
          />
          <p className="hint2">
            当前使用：{effectiveState?.name ?? (effective.stateId ? '引用失效' : '场景摆放')}
            。选择即生效。
          </p>
          {effectiveState &&
          !effectiveState.scenes.some((slice) => slice.sceneId === target.sceneId) ? (
            <p className="hint2">这份初态未配置当前场景，当前场景沿用默认摆放。</p>
          ) : null}
          <DsButton
            size="compact"
            variant="secondary"
            onClick={() => {
              if (!entry || !canonicalScene) return
              close()
              visitLibrary(
                {
                  kind: 'step',
                  target,
                  origin: entry,
                  label: `${previewEntryLabel(target, canonicalScene, props.actorsById, props.locale)} · 步骤详情`,
                },
                effective.stateId,
              )
            }}
          >
            {effectiveState ? '在初态编排中查看 / 编辑' : '打开初态编排'}
          </DsButton>
        </section>
      )
    },
    scheme: (schemeId) => {
      const target = schemeEntry(schemeId)
      const value =
        library.schemeDefaults.find(
          (saved) => scriptPreviewSchemeKey(saved.entry) === scriptPreviewSchemeKey(target),
        )?.stateId ?? ''
      return {
        value,
        render: (draft, onChange, onOpenLibrary) => (
          <section className="initial-state-reference" aria-label="此方案的默认预览初始状态">
            <strong>此方案的默认预览初始状态</strong>
            <DsSelect
              aria-label="此方案的默认预览初始状态"
              value={draft}
              options={[
                { value: '', label: '场景默认' },
                ...(draft && !states.some((state) => state.id === draft)
                  ? [{ value: draft, label: '引用失效，请重新选择' }]
                  : []),
                ...states.map((state) => ({ value: state.id, label: state.name })),
              ]}
              onValueChange={onChange}
            />
            <p className="hint2">保存后供未单独设置的步骤继承；已有步骤覆盖保持不变。</p>
            {states.some(
              (state) =>
                state.id === draft &&
                !state.scenes.some((slice) => slice.sceneId === target.sceneId),
            ) ? (
              <p className="hint2">这份初态未配置当前场景，当前场景沿用默认摆放。</p>
            ) : null}
            <DsButton size="compact" variant="secondary" onClick={onOpenLibrary}>
              {draft ? '在初态编排中查看 / 编辑' : '打开初态编排'}
            </DsButton>
          </section>
        ),
        onOpenLibrary: (draft) => {
          if (!entry || !canonicalScene) return
          visitLibrary(
            {
              kind: 'scheme',
              target,
              draft,
              origin: entry,
              label: `${previewEntryLabel(target, canonicalScene, props.actorsById, props.locale)} · 方案详情`,
            },
            draft.previewState,
          )
        },
        onSave: (name, isDefault, stateId) => {
          const current =
            target.channel === 'trigger' || target.channel === 'auto'
              ? canonicalEntity?.behaviors?.[target.channel]?.[schemeId]
              : canonicalScene?.hooks?.[target.channel]?.variants[schemeId]
          if (!current) return false
          const command =
            target.channel === 'trigger' || target.channel === 'auto'
              ? name !== current.label
                ? new UpdateEntityBehaviorCommand(
                    { scene: target.sceneId, entity: target.entityId! },
                    target.channel,
                    schemeId,
                    { label: name },
                  )
                : undefined
              : name !== current.label ||
                  isDefault !== (canonicalScene?.hooks?.[target.channel]?.initial === schemeId)
                ? new SaveSceneHookDetailsCommand(
                    target.sceneId,
                    target.channel,
                    schemeId,
                    name,
                    isDefault === true,
                  )
                : undefined
          try {
            if (command && stateId !== value) {
              if (!props.onDispatchWithInitialStates)
                throw new Error('当前工作区无法组合保存脚本与初始状态引用。')
              props.onDispatchWithInitialStates(command, withSchemeDefault(target, stateId))
            } else if (command) props.onDispatch(command)
            else if (stateId !== value)
              props.onInitialStatesChange?.(withSchemeDefault(target, stateId))
            return true
          } catch (error) {
            props.onError?.(error instanceof Error ? error.message : String(error))
            return false
          }
        },
      }
    },
  }
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
          </div>
        ) : (
          <PreviewCanvas
            scene={projection.scene!}
            sceneIndex={props.editorContext?.sceneIndex}
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
                      scenes: projection.scenes!,
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
              ? previewEntityName(canonicalEntity, props.actorsById, props.locale)
              : props.scene.id}
          </span>
          {hasScriptOwner ? (
            <DsTabs
              variant="inspector"
              label="脚本类型"
              activeId={owner === 'scene' ? `scene-${sceneTab}` : `entity-${behaviorChannel}`}
              items={scriptTabs}
              onChange={(id) => {
                setDetailsRequest(undefined)
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
          ) : owner === 'scene' ? (
            <ScriptSceneHookInspector
              key={`${props.scene.id}/${hookSlot}`}
              previewCursor={previewCursor}
              previewDetails={previewDetails}
              detailsRequest={
                detailsRequest?.sourceKey === previewSourceKey ? detailsRequest.request : undefined
              }
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
              key={`${props.scene.id}/${props.selectedEntityId}/${behaviorChannel}`}
              previewCursor={previewCursor}
              previewDetails={previewDetails}
              detailsRequest={
                detailsRequest?.sourceKey === previewSourceKey ? detailsRequest.request : undefined
              }
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
    </div>
  )
}
