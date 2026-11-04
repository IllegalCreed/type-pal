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
  resolveScriptPreviewBinding,
  type SceneInitialState,
  type ScriptPreviewEntry,
  type ScriptPreviewLibrary,
  type ScriptPreviewSchemeEntry,
  scriptPreviewEntryExists,
  scriptPreviewEntryKey,
  scriptPreviewSceneEntries,
  scriptPreviewSchemeExists,
  scriptPreviewSchemeKey,
} from '../core/script-preview-library.js'
import { DsButton, DsInspectorPortal, DsSelect, DsTabs } from './design-system/index.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
import { SceneCanvas } from './SceneCanvas.js'
import {
  previewEntityName,
  SceneInitialStateInspector,
  SceneInitialStateList,
} from './SceneInitialStateEditor.js'
import { ScriptBehaviorInspector } from './ScriptBehaviorInspector.js'
import type { CanonicalScriptEditorContext } from './ScriptEditor.js'
import { ScriptSceneHookInspector } from './ScriptSceneHookInspector.js'

const EMPTY_STAGES: readonly ScriptStage[] = []
const DRAWER_DEFAULT_HEIGHT = 420
const DRAWER_MIN_HEIGHT = 220
const PREVIEW_MIN_HEIGHT = 140
const RESIZER_SIZE = 1

type SceneScriptOwner = Extract<ScriptCommandOwner, { kind: 'entity-behavior' | 'scene-hook' }>

function previewEntryLabel(
  entry: ScriptPreviewSchemeEntry & { stageId?: string },
  scene: ScriptEditorState['scenes'][number],
  actors: Record<string, ActorDef>,
  locale: Locale,
): string {
  const entity = scene.entities.find((candidate) => candidate.id === entry.entityId)
  const scheme =
    entry.channel === 'trigger' || entry.channel === 'auto'
      ? entity?.behaviors?.[entry.channel]?.[entry.schemeId]
      : scene.hooks?.[entry.channel]?.variants[entry.schemeId]
  const stageIndex = scheme?.flow.stages.findIndex((stage) => stage.id === entry.stageId) ?? -1
  const stage = scheme?.flow.stages[stageIndex]
  const channel = {
    trigger: '交互脚本',
    auto: '自动行为',
    onEnter: '进场脚本',
    onTeleport: '传送出口',
  }[entry.channel]
  return [
    entity ? previewEntityName(entity, actors, locale) : '场景',
    scheme?.label || channel,
    ...(entry.stageId ? [stage?.label || `第 ${stageIndex + 1} 步`] : []),
  ].join(' / ')
}

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

  // Consume explicit navigation once its destination has mounted; edits do not steal focus.
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
    setEditingEntryKey(undefined)
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
  const [editingEntryKey, setEditingEntryKey] = useState<string>()
  const [editingScope, setEditingScope] = useState<'step' | 'scheme'>('step')
  const drawerBodyRef = useRef<HTMLDivElement>(null)
  const stepControlRef = useRef<HTMLElement>(null)
  const pendingPreviewFocus = useRef<'details' | 'step' | 'scheme'>(undefined)
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
  const entryKey = entry ? scriptPreviewEntryKey(entry) : undefined
  const editingFromScript = !!entryKey && editingEntryKey === entryKey
  const editingState =
    editingFromScript ||
    (owner === 'scene' && props.sceneSelected !== false && sceneTab === 'initial-state')
  const selectedState =
    states.find((state) => state.id === stateSelection?.stateId) ??
    (editingFromScript ? undefined : states[0])
  const editingEntityId =
    stateSelection?.stateId === selectedState?.id
      ? stateSelection?.entityId
      : selectedState?.entities[0]?.entityId
  const focusedStateEntityId = editingFromScript && entry?.entityId ? editingEntityId : undefined
  const contextLabel =
    entry && canonicalScene
      ? previewEntryLabel(entry, canonicalScene, props.actorsById, props.locale)
      : undefined
  useEffect(() => {
    void entryKey
    setEditingEntryKey(undefined)
  }, [entryKey])
  const binding = entry
    ? library.bindings.find((b) => scriptPreviewEntryKey(b.entry) === entryKey)
    : undefined
  const schemeBinding = entry
    ? library.schemeDefaults.find(
        (b) => scriptPreviewSchemeKey(b.entry) === scriptPreviewSchemeKey(entry),
      )
    : undefined
  const resolved = entry ? resolveScriptPreviewBinding(library, entry) : undefined
  const editingStateId = editingScope === 'scheme' ? schemeBinding?.stateId : resolved?.stateId
  const schemeState = states.find((state) => state.id === schemeBinding?.stateId)
  const schemeLabel =
    entry && canonicalScene
      ? previewEntryLabel(
          {
            sceneId: entry.sceneId,
            ...(entry.entityId ? { entityId: entry.entityId } : {}),
            channel: entry.channel,
            schemeId: entry.schemeId,
          },
          canonicalScene,
          props.actorsById,
          props.locale,
        )
      : undefined
  useEffect(() => {
    if (editingFromScript && (!selectedState || selectedState.id !== editingStateId)) {
      pendingPreviewFocus.current = editingScope
      setEditingEntryKey(undefined)
    }
  }, [editingFromScript, selectedState, editingStateId, editingScope])
  // Consume an explicit navigation request once mounted; property edits never request focus.
  useEffect(() => {
    const schemePanel = stepControlRef.current?.querySelector<HTMLDetailsElement>(
      '.initial-state-scheme-default',
    )
    if (pendingPreviewFocus.current === 'scheme' && schemePanel) schemePanel.open = true
    const target =
      pendingPreviewFocus.current === 'scheme'
        ? schemePanel?.querySelector<HTMLButtonElement>('[role="combobox"]')
        : pendingPreviewFocus.current === 'step'
          ? stepControlRef.current
          : pendingPreviewFocus.current === 'details'
            ? drawerBodyRef.current?.querySelector<HTMLButtonElement>(
                '.initial-state-context button',
              )
            : undefined
    if (!target) return
    if (pendingPreviewFocus.current === 'details' && drawerBodyRef.current)
      drawerBodyRef.current.scrollTop = 0
    if (pendingPreviewFocus.current === 'step')
      stepControlRef.current?.parentElement
        ?.querySelector<HTMLElement>('.canonical-stage-card-select[aria-pressed="true"]')
        ?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    pendingPreviewFocus.current = undefined
    target.focus({ preventScroll: true })
    target.scrollIntoView({ block: 'nearest' })
  })
  const initialState = editingState
    ? selectedState
    : states.find((state) => state.id === resolved?.stateId)
  const projection = useMemo(() => {
    try {
      if (!editingState && resolved?.stateId && !initialState)
        throw new Error(`初始状态 ${resolved.stateId} 已失效，请重新选择。`)
      return {
        scene: applySceneInitialState(props.scene, initialState),
        canonical: canonicalScene
          ? applySceneInitialState(canonicalScene, initialState)
          : undefined,
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : String(error) }
    }
  }, [props.scene, canonicalScene, initialState, resolved?.stateId, editingState])
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
  const firstStateEntity = (state: SceneInitialState | undefined) =>
    state?.entities.some((participant) => participant.entityId === entry?.entityId)
      ? entry?.entityId
      : state?.entities[0]?.entityId
  const useStateForStep = (selection: string) => {
    if (!entry) return
    playback.stop()
    props.onInitialStatesChange?.({
      ...library,
      bindings: [
        ...library.bindings.filter((b) => scriptPreviewEntryKey(b.entry) !== entryKey),
        ...(selection === 'inherit'
          ? []
          : [{ entry, stateId: selection === 'scene' ? null : selection.slice(6) }]),
      ],
    })
  }
  const setSchemeDefault = (stateId: string) => {
    if (!entry) return
    playback.stop()
    const { stageId: _stageId, ...schemeEntry } = entry
    props.onInitialStatesChange?.({
      ...library,
      schemeDefaults: [
        ...library.schemeDefaults.filter(
          (saved) => scriptPreviewSchemeKey(saved.entry) !== scriptPreviewSchemeKey(entry),
        ),
        ...(stateId ? [{ entry: schemeEntry, stateId }] : []),
      ],
    })
  }
  const usage: Record<string, string[]> = {}
  if (canonicalScene) {
    for (const candidate of scriptPreviewSceneEntries(canonicalScene)) {
      const { stateId } = resolveScriptPreviewBinding(library, candidate)
      if (stateId === null) continue
      usage[stateId] ??= []
      usage[stateId].push(
        previewEntryLabel(candidate, canonicalScene, props.actorsById, props.locale),
      )
    }
  }
  const schemeUsage: Record<string, string[]> = {}
  for (const saved of library.schemeDefaults) {
    if (
      saved.entry.sceneId !== props.scene.id ||
      !canonicalScene ||
      !scriptPreviewSchemeExists(saved.entry, props.state.scenes)
    )
      continue
    const labels = schemeUsage[saved.stateId] ?? []
    labels.push(previewEntryLabel(saved.entry, canonicalScene, props.actorsById, props.locale))
    schemeUsage[saved.stateId] = labels
  }
  const boundState = states.find((state) => state.id === resolved?.stateId)
  const openStateDetails = (state: SceneInitialState, scope: 'step' | 'scheme' = 'step') => {
    playback.stop()
    pendingPreviewFocus.current = 'details'
    setEditingScope(scope)
    setEditingEntryKey(entryKey)
    setStateSelection({ stateId: state.id, entityId: firstStateEntity(state) })
  }
  const createInitialState = (scope: 'step' | 'scheme', copy?: SceneInitialState) => {
    if (!entry) return
    const state: SceneInitialState = {
      id: crypto.randomUUID(),
      sceneId: props.scene.id,
      name: copy
        ? `${copy.name} 副本`
        : `${scope === 'scheme' ? schemeLabel : contextLabel} · 开场前`,
      entities: copy
        ? structuredClone(copy.entities)
        : entry.entityId
          ? [{ entityId: entry.entityId }]
          : [],
    }
    const { stageId: _stageId, ...schemeEntry } = entry
    props.onInitialStatesChange?.({
      ...library,
      states: [...library.states, state],
      ...(scope === 'step'
        ? {
            bindings: [
              ...library.bindings.filter(
                (saved) => scriptPreviewEntryKey(saved.entry) !== entryKey,
              ),
              { entry, stateId: state.id },
            ],
          }
        : {
            schemeDefaults: [
              ...library.schemeDefaults.filter(
                (saved) => scriptPreviewSchemeKey(saved.entry) !== scriptPreviewSchemeKey(entry),
              ),
              { entry: schemeEntry, stateId: state.id },
            ],
          }),
    })
    openStateDetails(state, scope)
  }
  const sharedStepCount = boundState ? (usage[boundState.id]?.length ?? 0) - 1 : 0
  const defaultUseCount = boundState ? (schemeUsage[boundState.id]?.length ?? 0) : 0
  const canCopyForStep = sharedStepCount > 0 || defaultUseCount > 0
  const stepPreviewControl = entry ? (
    <section
      ref={stepControlRef}
      tabIndex={-1}
      className="initial-state-step-control"
      aria-label="此步骤的预览初始状态"
    >
      <strong>此步骤的预览初始状态</strong>
      <span className="hint2">{contextLabel}</span>
      <div className="initial-state-step-select">
        <DsSelect
          aria-label="预览初始状态"
          size="compact"
          value={
            binding ? (binding.stateId === null ? 'scene' : `state:${binding.stateId}`) : 'inherit'
          }
          options={[
            {
              value: 'inherit',
              label: `继承方案默认：${schemeState?.name ?? (schemeBinding ? '引用失效' : '场景默认')}`,
            },
            { value: 'scene', label: '场景默认（此步骤不继承）' },
            ...(binding?.stateId && !states.some((state) => state.id === binding.stateId)
              ? [{ value: `state:${binding.stateId}`, label: '引用失效，请重新选择' }]
              : []),
            ...states.map((state) => ({ value: `state:${state.id}`, label: state.name })),
          ]}
          onValueChange={useStateForStep}
        />
      </div>
      {boundState ? (
        <>
          {sharedStepCount > 0 ? (
            <span className="hint2">与另外 {sharedStepCount} 个步骤共用，调整会同步影响它们。</span>
          ) : null}
          {defaultUseCount > 0 ? (
            <span className="hint2">
              也被 {defaultUseCount} 个脚本方案用作默认；调整会同步修改这份默认布置。
            </span>
          ) : null}
          <div className="initial-state-step-actions">
            <DsButton
              size="compact"
              variant="secondary"
              onClick={() => openStateDetails(boundState)}
            >
              调整人物与物件
            </DsButton>
            {canCopyForStep ? (
              <DsButton
                size="compact"
                variant="secondary"
                onClick={() => createInitialState('step', boundState)}
              >
                复制给此步骤
              </DsButton>
            ) : null}
          </div>
        </>
      ) : !resolved?.stateId ? (
        <>
          <span className="hint2">
            {binding ? '此步骤沿用场景摆放' : '未单独设置，沿用场景摆放'}；
            这不代表已核对真实剧情前态。新建后可调整。
          </span>
          <DsButton size="compact" variant="secondary" onClick={() => createInitialState('step')}>
            为此步骤新建初始状态
          </DsButton>
        </>
      ) : null}
      <details className="initial-state-scheme-default">
        <summary>
          本脚本方案的默认初始状态：{schemeState?.name ?? (schemeBinding ? '引用失效' : '场景默认')}
        </summary>
        <p className="hint2">{schemeLabel} · 只影响选择继承的步骤，已有单独设置保持不变。</p>
        <div className="initial-state-step-select">
          <DsSelect
            aria-label="本脚本方案的默认初始状态"
            size="compact"
            value={schemeBinding?.stateId ?? ''}
            options={[
              { value: '', label: '场景默认' },
              ...(schemeBinding && !schemeState
                ? [{ value: schemeBinding.stateId, label: '引用失效，请重新选择' }]
                : []),
              ...states.map((state) => ({ value: state.id, label: state.name })),
            ]}
            onValueChange={setSchemeDefault}
          />
        </div>
        {schemeState ? (
          <DsButton
            size="compact"
            variant="secondary"
            onClick={() => openStateDetails(schemeState, 'scheme')}
          >
            调整方案默认的人物与物件
          </DsButton>
        ) : !schemeBinding ? (
          <DsButton size="compact" variant="secondary" onClick={() => createInitialState('scheme')}>
            为此方案新建初始状态
          </DsButton>
        ) : null}
      </details>
    </section>
  ) : undefined
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
          </div>
        ) : editingState ? (
          <div className="initial-state-canvas">
            <div className="initial-state-canvas-label">
              {selectedState ? `初始状态 · ${selectedState.name}` : '场景默认状态'}
              <span>选择角色或物件 · 拖动摆位</span>
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
                      key: focusedStateEntityId
                        ? JSON.stringify([selectedState.id, focusedStateEntityId])
                        : selectedState.id,
                      positions: focusedStateEntityId
                        ? projection
                            .scene!.entities.filter((entity) => entity.id === focusedStateEntityId)
                            .map((entity) => entity.pos)
                        : selectedState.entities.flatMap((entry) => {
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
                setEditingEntryKey(undefined)
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

        <div ref={drawerBodyRef} className="canonical-script-drawer-body">
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
              usage={usage}
              schemeUsage={schemeUsage}
              contextLabel={
                editingFromScript
                  ? editingScope === 'scheme'
                    ? `${schemeLabel} / 方案默认初态`
                    : contextLabel
                  : undefined
              }
              contextEntityId={editingFromScript ? entry?.entityId : undefined}
              onBack={() => {
                pendingPreviewFocus.current = editingScope
                setEditingEntryKey(undefined)
              }}
              onCopyForStep={
                editingFromScript && editingScope === 'step' && canCopyForStep
                  ? (copy) => createInitialState('step', copy)
                  : undefined
              }
              missingReferences={
                library.bindings.filter(
                  (b) =>
                    b.stateId === selectedState?.id &&
                    !scriptPreviewEntryExists(b.entry, props.state.scenes),
                ).length +
                library.schemeDefaults.filter(
                  (saved) =>
                    saved.stateId === selectedState?.id &&
                    !scriptPreviewSchemeExists(saved.entry, props.state.scenes),
                ).length
              }
              revision={JSON.stringify(library)}
              onSelect={(stateId) =>
                setStateSelection({
                  stateId,
                  entityId: firstStateEntity(states.find((state) => state.id === stateId)),
                })
              }
              onSelectEntity={selectStateEntity}
              onChange={updateState}
              onCreate={(copy) => {
                const state: SceneInitialState = {
                  id: crypto.randomUUID(),
                  sceneId: props.scene.id,
                  name: copy ? `${copy.name} 副本` : `预览初态 ${states.length + 1}`,
                  entities: copy ? structuredClone(copy.entities) : [],
                }
                props.onInitialStatesChange?.({ ...library, states: [...library.states, state] })
                setStateSelection({ stateId: state.id, entityId: firstStateEntity(state) })
              }}
              onDelete={(id) => {
                if ((usage[id]?.length ?? 0) > 0 || (schemeUsage[id]?.length ?? 0) > 0) return
                props.onInitialStatesChange?.({
                  ...library,
                  states: library.states.filter((s) => s.id !== id),
                  bindings: library.bindings.filter((b) => b.stateId !== id),
                  schemeDefaults: library.schemeDefaults.filter((b) => b.stateId !== id),
                })
              }}
            />
          ) : owner === 'scene' ? (
            <ScriptSceneHookInspector
              previewCursor={previewCursor}
              stepPreviewControl={stepPreviewControl}
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
              stepPreviewControl={stepPreviewControl}
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
