/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 合成小工程浏览器宿主（?flow=FLOW-*）。
 * 真实 editor 组件 + 真实 EditSession/loader/命令；仅 docs 侧证据，不进产品。
 */
import type { AssetId, AssetRecordV1 } from '@type-pal/content'
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import type { CursorBattleSpec } from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  enemyProfile,
  loadCursorBattleProject,
  playerProfile,
} from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import { UpsertAssetCommand } from '../../../../../../packages/editor/src/core/asset-commands.js'
import { EditSession } from '../../../../../../packages/editor/src/core/edit-session.js'
import { createEditorAssetReader } from '../../../../../../packages/editor/src/core/editor-asset-reader.js'
import { Playback } from '../../../../../../packages/editor/src/core/playback.js'
import { collectCurrentProjectReferenceIndex } from '../../../../../../packages/editor/src/core/project-reference-adapters.js'

const FLOW_R02_SPECS: readonly CursorBattleSpec[] = [
  {
    asset: 'battle-sprite.flow.player-pack',
    label: 'Player Pack',
    frameCount: 8,
    definitions: [{ id: 'flow-player', label: 'Flow Player', profile: playerProfile() }],
  },
  {
    asset: 'battle-sprite.flow.enemy-pack',
    label: 'Enemy Pack',
    frameCount: 8,
    colorOffset: 1,
    definitions: [{ id: 'flow-enemy', label: 'Flow Enemy', profile: enemyProfile(2, 1, 3) }],
  },
]

const MINIMAL_PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

function minimalPngBytes(): ArrayBuffer {
  const binary = atob(MINIMAL_PNG_B64)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return bytes.buffer
}

async function sha256Hex(bytes: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

import { loadCursorSpriteProject } from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/sprite-fixtures.js'
import { collectEditorAssetDiagnostics } from '../../../../../../packages/editor/src/core/asset-diagnostics.js'
import { BattleSpriteLibrary } from '../../../../../../packages/editor/src/ui/BattleSpriteLibrary.js'
import { BattleSpriteUploader } from '../../../../../../packages/editor/src/ui/BattleSpriteUploader.js'
import { DsDraftNumberField } from '../../../../../../packages/editor/src/ui/design-system/number-inputs.js'
import {
  DsReorderCollection,
  type DsReorderEntry,
  DsReorderItem,
  DsReorderMoveButton,
} from '../../../../../../packages/editor/src/ui/design-system/reorder.js'
import { DsSelect } from '../../../../../../packages/editor/src/ui/design-system/select.js'
import { DsVirtualList } from '../../../../../../packages/editor/src/ui/design-system/virtual-list.js'
import { ImageTab } from '../../../../../../packages/editor/src/ui/ImageTab.js'
import { PreviewCanvas } from '../../../../../../packages/editor/src/ui/PreviewCanvas.js'
import { SoundTab } from '../../../../../../packages/editor/src/ui/SoundTab.js'
import { SpriteResourceViewer } from '../../../../../../packages/editor/src/ui/SpriteResourceViewer.js'
import { TilesetTab } from '../../../../../../packages/editor/src/ui/TilesetTab.js'
import { WorldSpriteLibrary } from '../../../../../../packages/editor/src/ui/WorldSpriteLibrary.js'
import { appendAuthoredTileset } from './flow-tileset.js'
import { type LegalProject, loadLegalProject, openFlowSession } from './legal-project.js'
import '../../../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../../../packages/editor/src/ui/editor.css'
import '../../../../../../packages/editor/src/ui/design-system/form-scope.css'
import { encodeWavPcm16 } from './flow-audio-bytes.js'
import { installFlowBridge, patchOracle, probeCanvas2d, setFlowSnapshot } from './flow-bridge.js'
import {
  readNumberFieldDraft,
  readPurposeFilterValue,
  readUploaderError,
  readWorldFilterText,
  sampleProductPreviewCanvas,
  scrapeAudioCatalogIds,
  scrapeBattleSpriteVisibleAssets,
  scrapeWorldSpriteVisibleAssets,
} from './flow-dom-oracles.js'

const FLOW = new URLSearchParams(location.search).get('flow') ?? 'FLOW-MENU'

function useSessionVersion(session: EditSession): number {
  return useSyncExternalStore(
    (cb) => session.subscribe(cb),
    () => session.getVersion(),
  )
}

function Shell(props: { flowId: string; children: React.ReactNode; label: string }) {
  useEffect(() => {
    setFlowSnapshot({
      flowId: props.flowId,
      phase: 'ready',
      label: props.label,
      canvas2d: probeCanvas2d(),
    })
  }, [props.flowId, props.label])
  return (
    <main data-flow-id={props.flowId} style={{ padding: 16, maxWidth: 1200 }}>
      <h1 style={{ fontSize: 18, marginBottom: 12 }}>{props.label}</h1>
      {props.children}
    </main>
  )
}

function FlowR01WorldFilter() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadCursorSpriteProject>> | null>(null)
  useEffect(() => {
    void loadCursorSpriteProject('flow-r01', [
      {
        asset: 'sprite.flow.alpha',
        label: 'Alpha Atlas',
        frameCount: 1,
        definitions: [{ id: 'hero-alpha', label: 'Hero Alpha', layout: { kind: 'static' } }],
      },
      {
        asset: 'sprite.flow.beta',
        label: 'Beta Atlas',
        frameCount: 1,
        definitions: [{ id: 'hero-beta', label: 'Hero Beta', layout: { kind: 'static' } }],
      },
    ]).then(setCtx)
  }, [])
  if (!ctx) return <p>loading…</p>
  return (
    <WorldFlowInner
      initialState={ctx.state}
      assetBase={ctx.assetBase}
      source={ctx.source}
      flowId="FLOW-R01"
    />
  )
}

function WorldFlowInner(props: {
  initialState: import('../../../../../../packages/editor/src/core/edit-session.js').EditorState
  assetBase: import('@type-pal/reforge').AssetBase
  source: import('@type-pal/reforge').FileSource
  flowId: string
}) {
  const sessionRef = useRef<EditSession | null>(null)
  if (!sessionRef.current) sessionRef.current = new EditSession(structuredClone(props.initialState))
  const session = sessionRef.current
  useSessionVersion(session)
  const reader = useMemo(
    () => createEditorAssetReader(props.source, () => session.getState()),
    [session, props.source],
  )
  const current = session.getState()
  // 资源过滤轴落在 asset 视图目录行；definition 视图不暴露源资源行集。
  const [view, setView] = useState<'definition' | 'asset'>('asset')
  useEffect(() => {
    const timer = window.setInterval(() => {
      patchOracle({
        definitionCount: current.sprites.length,
        filterText: readWorldFilterText(),
        visibleAssetIds: scrapeWorldSpriteVisibleAssets(),
      })
    }, 50)
    return () => window.clearInterval(timer)
  }, [current.sprites.length])
  return (
    <Shell flowId="FLOW-R01" label="世界精灵库：搜索过滤（资源）">
      <div data-surface="world-sprite">
        <WorldSpriteLibrary
          definitions={current.sprites}
          catalog={current.assetCatalog}
          assetBase={props.assetBase}
          assetReader={reader}
          session={session}
          tabBar={null}
          view={view}
          onViewChange={setView}
          onBattleDomain={() => {}}
          referenceIndex={collectCurrentProjectReferenceIndex(current)}
          referenceStatus="current"
          getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
          onStatusNotice={() => {}}
        />
      </div>
    </Shell>
  )
}

function FlowR02BattlePurpose() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadCursorBattleProject>> | null>(null)
  useEffect(() => {
    void loadCursorBattleProject('flow-r02', [...FLOW_R02_SPECS]).then(setCtx)
  }, [])
  if (!ctx) return <p>loading…</p>
  return <BattleFlowInner initialState={ctx.state} project={ctx} />
}

function BattleFlowInner(props: {
  initialState: import('../../../../../../packages/editor/src/core/edit-session.js').EditorState
  project: Awaited<ReturnType<typeof loadCursorBattleProject>>
}) {
  const sessionRef = useRef<EditSession | null>(null)
  if (!sessionRef.current) sessionRef.current = new EditSession(structuredClone(props.initialState))
  const session = sessionRef.current
  useSessionVersion(session)
  const reader = useMemo(
    () => createEditorAssetReader(props.project.source, () => session.getState()),
    [props.project.source, session],
  )
  const current = session.getState()
  const [view, setView] = useState<'definition' | 'asset'>('asset')
  useEffect(() => {
    const timer = window.setInterval(() => {
      patchOracle({
        battleSpriteCount: current.battleSprites.length,
        purposeFilter: readPurposeFilterValue(),
        visibleAssetIds: scrapeBattleSpriteVisibleAssets(),
      })
    }, 50)
    return () => window.clearInterval(timer)
  }, [current.battleSprites.length])
  return (
    <Shell flowId="FLOW-R02" label="战斗精灵库：用途筛选（资源）">
      <BattleSpriteLibrary
        definitions={current.battleSprites}
        catalog={current.assetCatalog}
        assetBase={props.project.assetBase}
        assetReader={reader}
        session={session}
        tabBar={null}
        view={view}
        onViewChange={setView}
        onWorldDomain={() => {}}
        referenceIndex={collectCurrentProjectReferenceIndex(current)}
        referenceStatus="current"
        getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
        onStatusNotice={() => {}}
      />
    </Shell>
  )
}

function FlowR03ImageFocus() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadLegalProject>> | null>(null)
  useEffect(() => {
    void loadLegalProject('flow-r03').then(setCtx)
  }, [])
  if (!ctx) return <p>loading…</p>
  return <ImageFlowInner legal={ctx} />
}

function ImageFlowInner(props: { legal: LegalProject }) {
  const [session, setSession] = useState<EditSession | null>(null)
  const [focus, setFocus] = useState<string | undefined>(undefined)
  useEffect(() => {
    void (async () => {
      const next = new EditSession(structuredClone(props.legal.state))
      const png = minimalPngBytes()
      const sha256 = await sha256Hex(png)
      const alphaId = 'image.flow.alpha' as AssetId
      const betaId = 'image.flow.beta' as AssetId
      const alphaRecord: AssetRecordV1 = {
        kind: 'portrait',
        path: `assets/authored/portraits/${sha256}-alpha.png`,
        mediaType: 'image/png',
        bytes: png.byteLength,
        sha256,
        label: 'Flow Alpha Image',
        origin: { kind: 'authored', ref: 'alpha.png' },
      }
      const betaRecord: AssetRecordV1 = {
        ...alphaRecord,
        path: `assets/authored/portraits/${sha256}-beta.png`,
        label: 'Flow Beta Image',
        origin: { kind: 'authored', ref: 'beta.png' },
      }
      next.dispatch(new UpsertAssetCommand(alphaId, alphaRecord, png))
      next.dispatch(new UpsertAssetCommand(betaId, betaRecord, png))
      setSession(next)
    })()
  }, [props.legal])
  if (!session) return <p>loading…</p>
  return <ImageFlowReady legal={props.legal} session={session} focus={focus} onFocus={setFocus} />
}

function ImageFlowReady(props: {
  legal: LegalProject
  session: EditSession
  focus: string | undefined
  onFocus: (id: string | undefined) => void
}) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.legal.source, () => props.session.getState()),
    [props.legal.source, props.session],
  )
  const current = props.session.getState()
  useEffect(() => {
    patchOracle({
      catalogSize: Object.keys(current.assetCatalog.assets).length,
      focusObjectId: props.focus ?? null,
      catalogImageIds: ['image.flow.alpha', 'image.flow.beta'],
    })
  }, [props.focus, current.assetCatalog, props.session])
  return (
    <Shell flowId="FLOW-R03" label="静态图资源：对象聚焦（资源）">
      <ImageTab
        assetBase={props.legal.assetBase}
        catalog={current.assetCatalog}
        reader={reader}
        session={props.session}
        tabBar={null}
        focusObjectId={props.focus}
        onObjectFocus={props.onFocus}
        assetDiagnostics={collectEditorAssetDiagnostics(current.assetCatalog, [])}
        referenceIndex={collectCurrentProjectReferenceIndex(current)}
        referenceStatus="current"
        getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
      />
    </Shell>
  )
}

function FlowR05TilesetSelect() {
  const [ready, setReady] = useState(false)
  const [session, setSession] = useState<EditSession | null>(null)
  const [legal, setLegal] = useState<Awaited<ReturnType<typeof loadLegalProject>> | null>(null)
  useEffect(() => {
    void (async () => {
      const opened = await openFlowSession('flow-r05')
      await appendAuthoredTileset(opened.session, {
        id: 'flow-tileset',
        name: 'Flow Tileset',
        category: 'outdoor',
        asset: 'tileset.flow.r05',
      })
      setSession(opened.session)
      setLegal(opened.legal)
      setReady(true)
    })()
  }, [])
  if (!ready || !session || !legal) return <p>loading…</p>
  return <TilesetFlowInner session={session} legal={legal} />
}

function TilesetFlowInner(props: { session: EditSession; legal: LegalProject }) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.legal.source, () => props.session.getState()),
    [props.legal.source, props.session],
  )
  const current = props.session.getState()
  const [focus, setFocus] = useState<string | undefined>(undefined)
  useEffect(() => {
    patchOracle({
      tilesetIds: current.tilesets.map((t) => t.id),
      selectedTileset: focus ?? null,
    })
  }, [focus, current.tilesets])
  return (
    <Shell flowId="FLOW-R05" label="瓦片集：选择切换（资源）">
      <TilesetTab
        tilesets={current.tilesets}
        assetCatalog={current.assetCatalog}
        assetReader={reader}
        assetBase={props.legal.assetBase}
        session={props.session}
        mapIndex={current.mapIndex}
        tabBar={null}
        focusObjectId={focus}
        onObjectFocus={setFocus}
      />
    </Shell>
  )
}

function FlowR06SoundRecover() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadLegalProject>> | null>(null)
  useEffect(() => {
    void loadLegalProject('flow-r06').then(setCtx)
  }, [])
  if (!ctx) return <p>loading…</p>
  return <SoundFlowInner legal={ctx} />
}

function SoundFlowInner(props: { legal: LegalProject }) {
  const [session, setSession] = useState<EditSession | null>(null)
  const ghostId = 'sound.ghost.missing' as AssetId
  const validId = 'sound.flow.valid' as AssetId
  const [focus, setFocus] = useState<AssetId>(ghostId)
  useEffect(() => {
    void (async () => {
      const next = new EditSession(structuredClone(props.legal.state))
      const wav = encodeWavPcm16([0, 0.25, -0.25, 0])
      const sha256 = await sha256Hex(wav)
      const record: AssetRecordV1 = {
        kind: 'sound',
        path: `assets/authored/${sha256}.wav`,
        mediaType: 'audio/wav',
        bytes: wav.byteLength,
        sha256,
        label: 'Flow Valid Sound',
        origin: { kind: 'authored', ref: 'flow-valid.wav' },
      }
      next.dispatch(new UpsertAssetCommand(validId, record, wav))
      setSession(next)
    })()
  }, [props.legal])
  if (!session) return <p>loading…</p>
  return (
    <SoundFlowReady
      legal={props.legal}
      session={session}
      ghostId={ghostId}
      validId={validId}
      focus={focus}
      onFocus={setFocus}
    />
  )
}

function SoundFlowReady(props: {
  legal: LegalProject
  session: EditSession
  ghostId: AssetId
  validId: AssetId
  focus: AssetId
  onFocus: (id: AssetId) => void
}) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.legal.source, () => props.session.getState()),
    [props.legal.source, props.session],
  )
  const current = props.session.getState()
  const catalog = current.assetCatalog
  const soundIds = Object.entries(catalog.assets)
    .filter(([, record]) => record.kind === 'sound')
    .map(([id]) => id)
  useEffect(() => {
    const timer = window.setInterval(() => {
      const showsMissing = Boolean(props.focus && !catalog.assets[props.focus])
      patchOracle({
        focusAsset: props.focus,
        validSoundId: props.validId,
        soundCatalogIds: soundIds,
        showsMissing,
        visibleSoundIds: scrapeAudioCatalogIds(),
      })
    }, 50)
    return () => window.clearInterval(timer)
  }, [props.focus, soundIds.join('|'), props.validId, catalog.assets])
  return (
    <Shell flowId="FLOW-R06" label="音效：缺失资产警告与恢复（资源）">
      <div data-surface="sound-tab">
        <SoundTab
          catalog={catalog}
          reader={reader}
          session={props.session}
          tabBar={null}
          focusObjectId={props.focus}
          onObjectFocus={(id) => {
            if (typeof id === 'string' && id.length > 0) props.onFocus(id as AssetId)
          }}
          assetDiagnostics={collectEditorAssetDiagnostics(catalog, [])}
          referenceIndex={collectCurrentProjectReferenceIndex(current)}
          referenceStatus="current"
          getCurrentReferenceIndex={(state) => collectCurrentProjectReferenceIndex(state)}
        />
      </div>
    </Shell>
  )
}

function FlowR04PreviewPixel() {
  const canvas2d = probeCanvas2d()
  const [legal, setLegal] = useState<LegalProject | null>(null)
  useEffect(() => {
    void loadLegalProject('flow-r04').then(setLegal)
  }, [])
  useEffect(() => {
    setFlowSnapshot({
      flowId: 'FLOW-R04',
      phase: canvas2d.ok && legal ? 'ready' : canvas2d.ok ? 'boot' : 'error',
      label: '预览画布像素探针（资源 / 产品 PreviewCanvas）',
      oracle: { blocked: !canvas2d.ok, reason: canvas2d.note, productPreview: true },
      canvas2d,
    })
  }, [canvas2d.ok, legal])
  if (!canvas2d.ok) {
    return (
      <Shell flowId="FLOW-R04" label="预览画布像素：Canvas2D blocked">
        <p data-contract="blocked">
          真实 Canvas2D 不可用 — 本像素合同诚实标 blocked，不伪造截图 oracle。
        </p>
      </Shell>
    )
  }
  if (!legal)
    return (
      <Shell flowId="FLOW-R04" label="预览画布像素采样（资源）">
        loading…
      </Shell>
    )
  return (
    <Shell flowId="FLOW-R04" label="预览画布像素采样（资源 / PreviewCanvas）">
      <div data-surface="preview-canvas" style={{ width: 640, height: 480 }}>
        <FlowR04PreviewCanvas legal={legal} />
      </div>
    </Shell>
  )
}

function FlowR04PreviewCanvas(props: { legal: LegalProject }) {
  const sessionRef = useRef<EditSession | null>(null)
  if (!sessionRef.current) sessionRef.current = new EditSession(structuredClone(props.legal.state))
  const session = sessionRef.current
  const scene = props.legal.state.scenes?.[0]
  const playbackRef = useRef<Playback | null>(null)
  if (scene && !playbackRef.current) playbackRef.current = new Playback(scene)
  const playback = playbackRef.current
  const [, setUiTick] = useState(0)
  useEffect(() => {
    if (!playback) return
    playback.onUi = () => setUiTick((value) => value + 1)
    return () => {
      playback.onUi = undefined
    }
  }, [playback])
  const reader = useMemo(
    () => createEditorAssetReader(props.legal.source, () => session.getState()),
    [props.legal.source, session],
  )
  const state = session.getState()
  useEffect(() => {
    const tick = (): void => {
      const hostReady =
        document.querySelector('[data-flow-id="FLOW-R04"]')?.textContent?.includes('就绪') === true
      const sample = sampleProductPreviewCanvas()
      patchOracle({
        productPreview: true,
        previewReady: hostReady,
        opaqueCount: sample.opaqueCount,
        centerPixel: sample.centerPixel,
        opaqueSampleOk: hostReady && sample.ok,
        canvasWidth: sample.width,
        canvasHeight: sample.height,
      })
      if (!hostReady || !sample.ok) window.requestAnimationFrame(tick)
    }
    window.requestAnimationFrame(tick)
  }, [])
  if (!scene || !playback) return <p>无可用场景</p>
  return (
    <PreviewCanvas
      scene={scene}
      stages={[]}
      sourceKey={`scene:${scene.id}:flow-r04`}
      playIdentity={{
        projectId: state.manifest.id,
        workspaceId: '11111111-1111-4111-8111-111111111111',
        source: 'http',
      }}
      focusEntityId={undefined}
      sprites={state.sprites ?? []}
      actorsById={Object.fromEntries((state.actors ?? []).map((actor) => [actor.id, actor]))}
      leaderSpriteId={undefined}
      assetBase={props.legal.assetBase}
      assetCatalog={state.assetCatalog}
      assetReader={reader}
      projectMaps={state.maps ?? {}}
      mapIndex={state.mapIndex}
      tilesets={state.tilesets ?? []}
      locale={state.locale ?? {}}
      playback={playback}
      sceneFraming
    />
  )
}

function FlowDs01Reorder() {
  const [order, setOrder] = useState(['a', 'b', 'c'])
  const entries: DsReorderEntry[] = order.map((key) => ({
    key,
    label: `Item ${key.toUpperCase()}`,
  }))
  useEffect(() => {
    patchOracle({ order: [...order] })
  }, [order])
  return (
    <Shell flowId="FLOW-DS01" label="DsReorder：键盘前移（设计控件）">
      <DsReorderCollection
        adoptionId="flow-ds01"
        scopeKey="flow"
        entries={entries}
        revision={{ token: order.join('-') }}
        strategy="insert"
        onReorder={(intent) => {
          const next = [...order]
          const [item] = next.splice(intent.fromIndex, 1)
          if (!item) return false
          next.splice(intent.toIndex, 0, item)
          setOrder(next)
          return true
        }}
      >
        {order.map((key) => (
          <DsReorderItem key={key} itemKey={key}>
            <span>{key}</span>
          </DsReorderItem>
        ))}
        <div style={{ marginTop: 8 }}>
          <DsReorderMoveButton itemKey="b" direction="backward" label="前移 B" />
        </div>
      </DsReorderCollection>
      <p data-oracle-order={order.join(',')}>order={order.join(',')}</p>
    </Shell>
  )
}

function FlowDs02Select() {
  const [value, setValue] = useState('b')
  useEffect(() => {
    patchOracle({ value })
  }, [value])
  return (
    <Shell flowId="FLOW-DS02" label="DsSelect：键盘改值（设计控件）">
      <DsSelect
        data-flow-select
        options={[
          { value: 'a', label: 'Option A' },
          { value: 'b', label: 'Option B' },
          { value: 'c', label: 'Option C' },
        ]}
        value={value}
        onValueChange={setValue}
        aria-label="flow select"
      />
    </Shell>
  )
}

function FlowDs03Number() {
  const [value, setValue] = useState(2)
  const [draftNote, setDraftNote] = useState('committed')
  useEffect(() => {
    const id = window.setInterval(() => {
      const draft = readNumberFieldDraft('FLOW-DS03')
      patchOracle({
        value,
        draftNote,
        inputValue: draft.inputValue,
        midDraft: draft.inputValue !== '' && draft.inputValue !== String(value),
      })
    }, 100)
    return () => window.clearInterval(id)
  }, [value, draftNote])
  return (
    <Shell flowId="FLOW-DS03" label="DsDraftNumberField：Escape 取消草稿（设计控件）">
      <DsDraftNumberField
        label="尺寸"
        draftKey="flow-ds03-size"
        min={0}
        max={99}
        integer
        value={value}
        onCommit={(next) => {
          setValue(next ?? 0)
          setDraftNote('committed')
        }}
        onCancel={() => setDraftNote('cancelled')}
      />
      <p data-draft-state={draftNote}>{draftNote}</p>
    </Shell>
  )
}

function FlowDs04VirtualList() {
  const items = useMemo(() => Array.from({ length: 200 }, (_, i) => `row-${i}`), [])
  const [firstVisible, setFirstVisible] = useState(0)
  return (
    <Shell flowId="FLOW-DS04" label="DsVirtualList：滚动窗口（设计控件）">
      <div data-surface="virtual-list" style={{ height: 240, border: '1px solid #ccc' }}>
        <DsVirtualList
          label="Flow virtual catalog"
          items={items}
          itemHeight={32}
          height={240}
          overscan={2}
          getKey={(item) => item}
          renderItem={(item) => (
            <div data-vrow={item} style={{ height: 32, lineHeight: '32px', paddingLeft: 8 }}>
              {item}
            </div>
          )}
        />
      </div>
      <p data-first-visible={firstVisible}>firstVisible={firstVisible}</p>
      <ScrollProbe onScroll={(idx) => setFirstVisible(idx)} />
    </Shell>
  )
}

function ScrollProbe(props: { onScroll: (idx: number) => void }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(
      '[data-surface="virtual-list"] .ds-virtual-list',
    )
    if (!root) return
    const handler = () => {
      const idx = Math.floor(root.scrollTop / 32)
      props.onScroll(idx)
      patchOracle({ scrollTop: root.scrollTop, firstVisibleIndex: idx })
    }
    root.addEventListener('scroll', handler)
    return () => root.removeEventListener('scroll', handler)
  }, [props])
  return null
}

function FlowAr01Uploader() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadLegalProject>> | null>(null)
  const [status, setStatus] = useState('idle')
  useEffect(() => {
    void loadLegalProject('flow-ar01').then(setCtx)
  }, [])
  useEffect(() => {
    const id = window.setInterval(() => {
      patchOracle({
        status,
        uploadError: readUploaderError() || null,
      })
    }, 120)
    return () => window.clearInterval(id)
  }, [status])
  if (!ctx) return <p>loading…</p>
  return (
    <Shell flowId="FLOW-AR01" label="战斗上传：非法文件失败与恢复（异步）">
      <BattleSpriteUploader
        assetBase={ctx.assetBase}
        onApply={async (_blob, frames) => setStatus(`applied:${frames}`)}
        onCancel={() => setStatus('cancelled')}
      />
      <p data-async-status={status}>{status}</p>
    </Shell>
  )
}

function FlowAr02ResourceViewer() {
  const [ctx, setCtx] = useState<Awaited<ReturnType<typeof loadCursorSpriteProject>> | null>(null)
  const [asset, setAsset] = useState<import('@type-pal/content').AssetId>('sprite.flow.bad')
  useEffect(() => {
    void loadCursorSpriteProject('flow-ar02', [
      {
        asset: 'sprite.flow.bad',
        label: 'Bad',
        frameCount: 1,
        corruptBytes: true,
        definitions: [{ id: 'bad-def', label: 'Bad Def', layout: { kind: 'static' } }],
      },
      {
        asset: 'sprite.flow.good',
        label: 'Good',
        frameCount: 1,
        definitions: [{ id: 'good-def', label: 'Good Def', layout: { kind: 'static' } }],
      },
    ]).then(setCtx)
  }, [])
  useEffect(() => {
    patchOracle({ asset })
  }, [asset])
  if (!ctx) return <p>loading…</p>
  const session = new EditSession(ctx.state)
  const reader = createEditorAssetReader(ctx.source, () => session.getState())
  const def = ctx.state.sprites.find((entry) => entry.asset === asset)
  return (
    <Shell flowId="FLOW-AR02" label="资源查看器：损坏解码失败与切换恢复（异步）">
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" data-action="pick-bad" onClick={() => setAsset('sprite.flow.bad')}>
          损坏
        </button>
        <button type="button" data-action="pick-good" onClick={() => setAsset('sprite.flow.good')}>
          正常
        </button>
      </div>
      <SpriteResourceViewer
        assetBase={ctx.assetBase}
        assetReader={reader}
        asset={asset}
        revision={`${asset}-${session.getVersion()}`}
        label={def?.label ?? asset}
        consumers={ctx.state.sprites.filter((entry) => entry.asset === asset)}
        session={session}
        onLoaded={(proof) =>
          patchOracle({
            loadProof: proof ? `frames:${proof.actualFrameCount}` : 'error',
            asset,
            error: !proof,
          })
        }
        onStatusNotice={(notice) => patchOracle({ statusNotice: notice?.message ?? null })}
      />
    </Shell>
  )
}

function FlowMenu() {
  const ids = [
    'FLOW-R01',
    'FLOW-R02',
    'FLOW-R03',
    'FLOW-R04',
    'FLOW-R05',
    'FLOW-R06',
    'FLOW-DS01',
    'FLOW-DS02',
    'FLOW-DS03',
    'FLOW-DS04',
    'FLOW-AR01',
    'FLOW-AR02',
  ]
  return (
    <main style={{ padding: 24 }}>
      <h1>Cursor flow host menu</h1>
      <ul>
        {ids.map((id) => (
          <li key={id}>
            <a href={`?flow=${id}`}>{id}</a>
          </li>
        ))}
      </ul>
    </main>
  )
}

function Router() {
  switch (FLOW) {
    case 'FLOW-R01':
      return <FlowR01WorldFilter />
    case 'FLOW-R02':
      return <FlowR02BattlePurpose />
    case 'FLOW-R03':
      return <FlowR03ImageFocus />
    case 'FLOW-R04':
      return <FlowR04PreviewPixel />
    case 'FLOW-R05':
      return <FlowR05TilesetSelect />
    case 'FLOW-R06':
      return <FlowR06SoundRecover />
    case 'FLOW-DS01':
      return <FlowDs01Reorder />
    case 'FLOW-DS02':
      return <FlowDs02Select />
    case 'FLOW-DS03':
      return <FlowDs03Number />
    case 'FLOW-DS04':
      return <FlowDs04VirtualList />
    case 'FLOW-AR01':
      return <FlowAr01Uploader />
    case 'FLOW-AR02':
      return <FlowAr02ResourceViewer />
    default:
      return <FlowMenu />
  }
}

installFlowBridge()
const root = document.getElementById('root')
if (root) createRoot(root).render(<Router />)
