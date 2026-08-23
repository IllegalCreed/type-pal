import type {
  ActorDef,
  AmbienceDef,
  AssetCatalogV1,
  CurrentManifest,
  MapIndexV1,
  SceneDef,
  SpriteDef,
} from '@type-pal/content'
import type { AssetBase, ProjectMap, TilesetDef } from '@type-pal/reforge'
import { compositeAmbienceTint, renderSceneFrame } from '@type-pal/reforge'
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { findDefaultEntry } from '../core/startup-entries.js'
import { DsButton, DsSelectField, DsStatus, DsTabs } from './design-system/index.js'
import {
  buildInitialSceneSpriteDraws,
  collectInitialSceneSpriteAssets,
  fitStageView,
  mapBoxOf,
  useSceneAssets,
  useStagePanGesture,
  useStageSize,
  useViewZoomPan,
} from './scene-stage.js'

type Tint = AmbienceDef['tint']
type PreviewMode = 'filtered' | 'original'

export interface AmbienceScenePreviewProps {
  session: EditSession
  manifest: CurrentManifest
  scenes: readonly SceneDef[]
  actors: readonly ActorDef[]
  sprites: readonly SpriteDef[]
  assetBase: AssetBase
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  mapIndex: MapIndexV1
  tilesets: readonly TilesetDef[]
  projectKey: string
  tint: Tint
}

function LoadedAmbienceScenePreview(
  props: AmbienceScenePreviewProps & {
    scene: SceneDef
    projectMaps: Record<string, ProjectMap>
    leaderSpriteId?: string
    mode: PreviewMode
    onModeChange: (mode: PreviewMode) => void
  },
) {
  const {
    scene,
    session,
    actors,
    sprites,
    assetBase,
    assetCatalog,
    assetReader,
    mapIndex,
    tilesets,
    projectMaps,
    projectKey,
    leaderSpriteId,
    tint,
    mode,
    onModeChange,
  } = props
  const wrapRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useStageSize(wrapRef, 180)
  const { view, viewRef, setView } = useViewZoomPan({
    canvasRef,
    initial: { zoom: 1, panX: 0, panY: 0 },
  })
  const panHandlers = useStagePanGesture(viewRef, setView)
  const actorsById = useMemo(
    () => Object.fromEntries(actors.map((actor) => [actor.id, actor])),
    [actors],
  )
  const spriteAssets = useMemo(
    () => collectInitialSceneSpriteAssets(scene, sprites, actorsById, leaderSpriteId),
    [actorsById, leaderSpriteId, scene, sprites],
  )
  const { status, err, loadedRef } = useSceneAssets({
    canvasRef,
    assetBase,
    mapId: scene.mapId,
    spriteAssets,
    projectMaps,
    mapIndex,
    tilesets,
    assetCatalog,
    assetReader,
    sourceKey: `${projectKey}\0${scene.id}\0${scene.mapId}`,
  })
  const mapRevision = session.getMapRevision(scene.mapId)
  const cacheRef = useRef<{
    key: string
    renderer: object
    map: object
    scene: SceneDef
    sprites: readonly SpriteDef[]
    actorsById: Readonly<Record<string, ActorDef>>
    canvas: HTMLCanvasElement
  } | null>(null)
  const fitKeyRef = useRef('')
  const fitPendingRef = useRef(false)

  const fit = useCallback((): boolean => {
    const map = loadedRef.current?.map
    if (!map) return false
    const next = fitStageView(mapBoxOf(map, undefined), size)
    const current = viewRef.current
    const changed =
      current.zoom !== next.zoom || current.panX !== next.panX || current.panY !== next.panY
    setView(next)
    return changed
  }, [loadedRef, setView, size, viewRef])

  useEffect(() => {
    if (status !== 'ready') return
    const map = loadedRef.current?.map
    if (!map) return
    const fitKey = `${projectKey}\0${scene.id}\0${map.width}x${map.height}\0${size.w}x${size.h}`
    if (fitKeyRef.current === fitKey) return
    fitKeyRef.current = fitKey
    fitPendingRef.current = fit()
  }, [fit, loadedRef, projectKey, scene.id, size.h, size.w, status])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    const loaded = loadedRef.current
    if (!canvas || !context || !loaded || status !== 'ready') return
    if (fitPendingRef.current) {
      fitPendingRef.current = false
      return
    }
    const key = [
      projectKey,
      scene.id,
      scene.mapId,
      leaderSpriteId ?? '',
      mapRevision,
      size.w,
      size.h,
      view.zoom,
      view.panX,
      view.panY,
      spriteAssets.join(','),
    ].join('\0')
    let cached = cacheRef.current
    if (
      !cached ||
      cached.key !== key ||
      cached.renderer !== loaded.renderer ||
      cached.map !== loaded.map ||
      cached.scene !== scene ||
      cached.sprites !== sprites ||
      cached.actorsById !== actorsById
    ) {
      const room = { col: 0, row: 0, cols: loaded.map.width, rows: loaded.map.height }
      renderSceneFrame(context, loaded.renderer, {
        map: loaded.map,
        room,
        camera: { x: view.panX, y: view.panY },
        sprites: buildInitialSceneSpriteDraws(
          scene,
          sprites,
          actorsById,
          loaded.spritesByAsset,
          leaderSpriteId,
        ),
        worldScale: view.zoom,
      })
      const base = document.createElement('canvas')
      base.width = canvas.width
      base.height = canvas.height
      base.getContext('2d')?.drawImage(canvas, 0, 0)
      cached = {
        key,
        renderer: loaded.renderer,
        map: loaded.map,
        scene,
        sprites,
        actorsById,
        canvas: base,
      }
      cacheRef.current = cached
    }
    const frame = requestAnimationFrame(() => {
      context.clearRect(0, 0, canvas.width, canvas.height)
      context.drawImage(cached.canvas, 0, 0)
      if (mode === 'filtered') compositeAmbienceTint(context, tint, canvas.width, canvas.height)
    })
    return () => cancelAnimationFrame(frame)
  }, [
    actorsById,
    leaderSpriteId,
    loadedRef,
    mapRevision,
    mode,
    projectKey,
    scene,
    size.h,
    size.w,
    sprites,
    spriteAssets,
    status,
    tint,
    view.panX,
    view.panY,
    view.zoom,
  ])

  return (
    <div className="ambience-scene-preview">
      <div className="ambience-scene-preview__toolbar">
        <DsTabs
          idPrefix="ambience-preview-mode"
          label="预览对比"
          size="compact"
          items={[
            { id: 'filtered', label: '滤镜后' },
            { id: 'original', label: '原图' },
          ]}
          activeId={mode}
          onChange={(id) => onModeChange(id as PreviewMode)}
        />
        <DsButton size="compact" variant="secondary" onClick={() => void fit()}>
          适应画布
        </DsButton>
        <output className="ambience-scene-preview__zoom">{Math.round(view.zoom * 100)}%</output>
      </div>
      <div ref={wrapRef} className="ambience-scene-preview__stage">
        <canvas
          ref={canvasRef}
          width={size.w}
          height={size.h}
          aria-label={`${scene.id} ${mode === 'filtered' ? '滤镜后' : '原图'}预览`}
          {...panHandlers}
        />
        {status === 'loading' ? (
          <div className="ambience-scene-preview__overlay" role="status">
            正在读取场景…
          </div>
        ) : null}
        {status === 'error' ? <DsStatus tone="error">场景预览失败：{err}</DsStatus> : null}
      </div>
    </div>
  )
}

/**
 * 氛围滤镜只读场景预览。场景选择、A/B、缩放和平移均为会话状态，绝不进入 undo/save。
 */
export function AmbienceScenePreview(props: AmbienceScenePreviewProps) {
  useSyncExternalStore(
    (notify) => props.session.subscribe(notify),
    () => props.session.getVersion(),
    () => props.session.getVersion(),
  )
  const defaultEntry = findDefaultEntry(props.manifest)
  const defaultSceneId = defaultEntry?.scene ?? ''
  const previewResetKey = `${props.projectKey}\0${defaultSceneId}`
  const [selectedSceneId, setSelectedSceneId] = useState(defaultSceneId)
  const [mode, setMode] = useState<PreviewMode>('filtered')
  const scene = props.scenes.find((candidate) => candidate.id === selectedSceneId)
  const projectMaps = props.session.getState().maps

  useEffect(() => {
    const separator = previewResetKey.indexOf('\0')
    setSelectedSceneId(previewResetKey.slice(separator + 1))
    setMode('filtered')
  }, [previewResetKey])

  if (!defaultEntry)
    return (
      <DsStatus tone="error">
        直接启动入口“{props.manifest.defaultEntryId}”不存在，请先修复项目入口配置。
      </DsStatus>
    )
  if (!props.scenes.length) return <DsStatus>当前项目没有可预览场景。</DsStatus>
  if (!props.scenes.some((candidate) => candidate.id === defaultSceneId))
    return <DsStatus tone="error">默认入口场景“{defaultSceneId}”不在当前项目。</DsStatus>
  if (!scene)
    return (
      <DsStatus tone="error">
        预览场景“{selectedSceneId}”不在当前项目，未自动改选其他场景。
      </DsStatus>
    )

  const leaderActorId = defaultEntry?.startWorld.party[0]
  const leaderSpriteId = props.actors.find((actor) => actor.id === leaderActorId)?.spriteId
  return (
    <div className="ambience-preview-field">
      <DsSelectField
        label="预览场景"
        layout="inline"
        size="compact"
        fieldClassName="ambience-preview-scene-field"
        value={scene.id}
        options={props.scenes.map((candidate) => ({ value: candidate.id, label: candidate.id }))}
        onValueChange={setSelectedSceneId}
      />
      <LoadedAmbienceScenePreview
        key={`${props.projectKey}\0${scene.id}`}
        {...props}
        scene={scene}
        projectMaps={projectMaps}
        leaderSpriteId={leaderSpriteId}
        mode={mode}
        onModeChange={setMode}
      />
    </div>
  )
}
