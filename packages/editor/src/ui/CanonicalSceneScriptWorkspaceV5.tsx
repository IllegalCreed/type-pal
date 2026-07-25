import {
  type ActorDef,
  type AssetCatalogV1,
  createScriptIndex,
  type Locale,
  type MapIndexV1,
  type SceneDef,
  type ScriptStage,
  type SpriteDef,
} from '@type-pal/content'
import { type AssetBase, MemoryScriptResolver, type ProjectMap } from '@type-pal/reforge'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { Playback } from '../core/playback.js'
import type {
  SceneHookSlotV5,
  ScriptEditorCommandV5,
  ScriptEditorStateV5,
} from '../core/script-v5-editor.js'
import {
  projectCanonicalScriptFlowPreviewV5,
  projectCanonicalSharedScriptPreviewChunkV5,
  V5_PREVIEW_SHARED_CHUNK,
} from '../core/world-sprite-behavior.js'
import type { CanonicalScriptEditorContextV5 } from './CanonicalScriptEditorV5.js'
import { PanelResizeHandle, useStoredPanelNumber } from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
import { ScriptV5BehaviorInspector } from './ScriptV5BehaviorInspector.js'
import { ScriptV5SceneHookInspector } from './ScriptV5SceneHookInspector.js'

const EMPTY_STAGES: readonly ScriptStage[] = []
const DRAWER_DEFAULT_HEIGHT = 420
const DRAWER_MIN_HEIGHT = 220
const PREVIEW_MIN_HEIGHT = 140
const RESIZER_SIZE = 1

export function CanonicalSceneScriptWorkspaceV5(props: {
  scene: SceneDef
  state: ScriptEditorStateV5
  selectedEntityId?: string | null
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
  layers?: { grid: boolean; blocked: boolean; ghosts?: boolean }
  editorContext?: CanonicalScriptEditorContextV5
  onDispatch: (command: ScriptEditorCommandV5) => void
  onOpenReference?: (path: string) => void
  onError?: (message: string) => void
  onClose: () => void
}) {
  const [owner, setOwner] = useState<'scene' | 'entity'>(
    props.selectedEntityId ? 'entity' : 'scene',
  )
  const [hookSlot, setHookSlot] = useState<SceneHookSlotV5>('onEnter')
  const [selectedHooks, setSelectedHooks] = useState<Partial<Record<SceneHookSlotV5, string>>>({})
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
    if (!props.selectedEntityId && owner === 'entity') setOwner('scene')
  }, [owner, props.selectedEntityId])

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
  const previewEntityId = props.selectedEntityId ?? canonicalScene?.entities[0]?.id ?? '__scene'
  const previewStages = useMemo(
    () =>
      activeFlow
        ? projectCanonicalScriptFlowPreviewV5(
            activeFlow,
            { scene: props.scene.id, entity: previewEntityId },
            props.state.sharedScripts,
          )
        : EMPTY_STAGES,
    [activeFlow, previewEntityId, props.scene.id, props.state.sharedScripts],
  )
  const previewSourceKey =
    owner === 'scene'
      ? hookSlot === 'onEnter'
        ? `s:${props.scene.id}:canonical:${activeHookId || 'none'}`
        : `canonical:teleport:${props.scene.id}:${activeHookId || 'none'}`
      : `canonical:entity:${props.scene.id}:${props.selectedEntityId ?? 'none'}:${behaviorChannel}:${activeBehaviorId || 'none'}`
  const playback = useMemo(() => {
    const previewChunk = projectCanonicalSharedScriptPreviewChunkV5(props.state.sharedScripts)
    const resolver = new MemoryScriptResolver(createScriptIndex(), {
      [V5_PREVIEW_SHARED_CHUNK]: previewChunk,
    })
    return new Playback(
      props.scene,
      resolver,
      new Map(props.state.items.map((item) => [item.id, item.name])),
    )
  }, [props.scene, props.state.items, props.state.sharedScripts])
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
  const style = {
    '--script-drawer-height': `${visibleDrawerHeight}px`,
  } as CSSProperties

  return (
    <div ref={scriptWorkRef} className="script-work canonical-scene-script-workspace" style={style}>
      <div className="work-preview">
        <PreviewCanvas
          scene={props.scene}
          stages={previewStages}
          sourceKey={previewSourceKey}
          projectId={props.projectId}
          focusEntityId={owner === 'entity' ? (props.selectedEntityId ?? undefined) : undefined}
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
        toggleDirection="down"
        toggleLabel="收起脚本面板"
        onToggle={props.onClose}
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
          <span className="drawer-tabs" role="tablist" aria-label="脚本类型">
            <button
              type="button"
              role="tab"
              className={`mini-txt${owner === 'scene' && hookSlot === 'onEnter' ? ' sel' : ''}`}
              aria-selected={owner === 'scene' && hookSlot === 'onEnter'}
              onClick={() => {
                setOwner('scene')
                setHookSlot('onEnter')
              }}
            >
              🎬 进场脚本
            </button>
            <button
              type="button"
              role="tab"
              className={`mini-txt${owner === 'scene' && hookSlot === 'onTeleport' ? ' sel' : ''}`}
              aria-selected={owner === 'scene' && hookSlot === 'onTeleport'}
              onClick={() => {
                setOwner('scene')
                setHookSlot('onTeleport')
              }}
            >
              🚪 传送出口
            </button>
            <button
              type="button"
              role="tab"
              className={`mini-txt${owner === 'entity' && behaviorChannel === 'trigger' ? ' sel' : ''}`}
              aria-selected={owner === 'entity' && behaviorChannel === 'trigger'}
              disabled={!props.selectedEntityId}
              title={props.selectedEntityId ? undefined : '先从左侧场景大纲选择一个实体'}
              onClick={() => {
                setOwner('entity')
                setBehaviorChannel('trigger')
              }}
            >
              💬 交互脚本
            </button>
            <button
              type="button"
              role="tab"
              className={`mini-txt${owner === 'entity' && behaviorChannel === 'auto' ? ' sel' : ''}`}
              aria-selected={owner === 'entity' && behaviorChannel === 'auto'}
              disabled={!props.selectedEntityId}
              title={props.selectedEntityId ? undefined : '先从左侧场景大纲选择一个实体'}
              onClick={() => {
                setOwner('entity')
                setBehaviorChannel('auto')
              }}
            >
              🔁 自动行为
            </button>
          </span>
          <span className="spacer" />
          <span className="canonical-script-preview-note">上方地图演出预览 · 下方编辑脚本</span>
        </div>

        <div className="canonical-script-drawer-body">
          {owner === 'scene' ? (
            <ScriptV5SceneHookInspector
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
              onError={props.onError}
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
            <ScriptV5BehaviorInspector
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
              onError={props.onError}
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
