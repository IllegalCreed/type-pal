import type {
  ActorDef,
  AssetCatalogV1,
  Locale,
  MapIndexV1,
  SceneDef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import type { AssetBase, ProjectMap } from '@type-pal/reforge'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import { activePageTriggerActivation } from '../core/entity-placement.js'
import { Playback } from '../core/playback.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import type {
  CanonicalScriptReference,
  SceneHookSlot,
  ScriptCommandOwner,
  ScriptEditorCommand,
  ScriptEditorState,
} from '../core/script-editor.js'
import { DsTabs } from './design-system/index.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
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
  projectId: string
  workspaceId?: string
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
  const [owner, setOwner] = useState<'scene' | 'entity'>(
    props.selectedEntityId ? 'entity' : 'scene',
  )
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

  // biome-ignore lint/correctness/useExhaustiveDependencies: 跨场景可复用同一实体 ID，场景变化也必须重新跟随实体选择。
  useEffect(() => {
    setOwner(props.selectedEntityId ? 'entity' : 'scene')
  }, [props.scene.id, props.selectedEntityId])

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
      setOwner('scene')
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
      setOwner('scene')
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
      setOwner('entity')
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
  const activeFlow =
    owner === 'scene' ? hookVariants[activeHookId]?.flow : behaviorVariants[activeBehaviorId]?.flow
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
  const playback = useMemo(() => {
    return new Playback(
      props.scene,
      undefined,
      new Map(props.state.items.map((item) => [item.id, item.name])),
    )
  }, [props.scene, props.state.items])
  const [, setUiTick] = useState(0)

  useEffect(() => {
    playback.onUi = () => setUiTick((value) => value + 1)
    return () => playback.stop()
  }, [playback])

  useEffect(() => {
    void previewSourceKey
    playback.stop()
  }, [playback, previewSourceKey])

  const measuredWorkHeight = scriptWorkHeight || 720
  const drawerMaxHeight = Math.max(
    DRAWER_MIN_HEIGHT,
    measuredWorkHeight - PREVIEW_MIN_HEIGHT - RESIZER_SIZE,
  )
  const visibleDrawerHeight = clampPanelSize(drawerHeight, DRAWER_MIN_HEIGHT, drawerMaxHeight)
  const scriptTabs = props.selectedEntityId
    ? [
        { id: 'scene-onEnter', label: '进场脚本' },
        { id: 'scene-onTeleport', label: '传送出口' },
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
        <PreviewCanvas
          scene={props.scene}
          stages={EMPTY_STAGES}
          sourceKey={previewSourceKey}
          projectId={props.projectId}
          workspaceId={props.workspaceId}
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
          canonicalSharedScripts={props.state.sharedScripts}
          startPlayback={
            activeFlow && canonicalScene
              ? (paused) =>
                  playback.playCanonical(previewSourceKey, activeFlow, {
                    scene: canonicalScene,
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
            activeFlow
              ? undefined
              : owner === 'scene'
                ? `当前${hookSlot === 'onEnter' ? '进场脚本' : '传送出口脚本'}尚未创建；可在下方新建。`
                : `当前实体的${behaviorChannel === 'trigger' ? '交互脚本' : '自动行为'}尚未创建；可在下方新建。`
          }
        />
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
          <span className="t">📜 {props.scene.id}</span>
          <DsTabs
            size="compact"
            label="脚本类型"
            activeId={owner === 'scene' ? `scene-${hookSlot}` : `entity-${behaviorChannel}`}
            items={scriptTabs}
            onChange={(id) => {
              if (id === 'scene-onEnter' || id === 'scene-onTeleport') {
                setOwner('scene')
                setHookSlot(id === 'scene-onEnter' ? 'onEnter' : 'onTeleport')
                return
              }
              setOwner('entity')
              setBehaviorChannel(id === 'entity-auto' ? 'auto' : 'trigger')
            }}
          />
        </div>

        <div className="canonical-script-drawer-body">
          {owner === 'scene' ? (
            <ScriptSceneHookInspector
              state={props.state}
              sceneId={props.scene.id}
              slot={hookSlot}
              onSlotChange={(slot) => {
                setHookSlot(slot)
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
