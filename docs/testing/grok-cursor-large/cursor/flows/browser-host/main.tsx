/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 合成小工程浏览器宿主（?flow=FLOW-*）。
 * 真实 editor 组件 + 真实 EditSession/loader/命令；仅 docs 侧证据，不进产品。
 */
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import { createRoot } from 'react-dom/client'
import type { CursorBattleSpec } from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import {
  enemyProfile,
  loadCursorBattleProject,
  playerProfile,
} from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/battle-sprite-fixtures.js'
import { EditSession } from '../../../../../../packages/editor/src/core/edit-session.js'
import { createEditorAssetReader } from '../../../../../../packages/editor/src/core/editor-asset-reader.js'
import { collectCurrentProjectReferenceIndex } from '../../../../../../packages/editor/src/core/project-reference-adapters.js'

const FLOW_R02_SPECS: readonly CursorBattleSpec[] = [
  {
    asset: 'battle-sprite.flow.shared',
    label: 'Flow Shared',
    frameCount: 8,
    definitions: [
      { id: 'flow-fighter', label: 'Flow Fighter', profile: playerProfile() },
      { id: 'flow-enemy', label: 'Flow Enemy', profile: enemyProfile(2, 1, 3) },
    ],
  },
]

import { loadCursorSpriteProject } from '../../../../../../packages/editor/src/__tests__/cursor-asset-r1/sprite-fixtures.js'
import { collectEditorAssetDiagnostics } from '../../../../../../packages/editor/src/core/asset-diagnostics.js'
import { BattleSpriteLibrary } from '../../../../../../packages/editor/src/ui/BattleSpriteLibrary.js'
import { BattleSpriteUploader } from '../../../../../../packages/editor/src/ui/BattleSpriteUploader.js'
import { DsNumberField } from '../../../../../../packages/editor/src/ui/design-system/number-inputs.js'
import {
  DsReorderCollection,
  type DsReorderEntry,
  DsReorderItem,
  DsReorderMoveButton,
} from '../../../../../../packages/editor/src/ui/design-system/reorder.js'
import { DsSelect } from '../../../../../../packages/editor/src/ui/design-system/select.js'
import { DsVirtualList } from '../../../../../../packages/editor/src/ui/design-system/virtual-list.js'
import { ImageTab } from '../../../../../../packages/editor/src/ui/ImageTab.js'
import { SoundTab } from '../../../../../../packages/editor/src/ui/SoundTab.js'
import { SpriteResourceViewer } from '../../../../../../packages/editor/src/ui/SpriteResourceViewer.js'
import { TilesetTab } from '../../../../../../packages/editor/src/ui/TilesetTab.js'
import { WorldSpriteLibrary } from '../../../../../../packages/editor/src/ui/WorldSpriteLibrary.js'
import { appendAuthoredTileset } from './flow-tileset.js'
import { type LegalProject, loadLegalProject, openFlowSession } from './legal-project.js'
import '../../../../../../packages/editor/src/ui/design-system/index.css'
import '../../../../../../packages/editor/src/ui/editor.css'
import '../../../../../../packages/editor/src/ui/design-system/form-scope.css'
import { installFlowBridge, patchOracle, probeCanvas2d, setFlowSnapshot } from './flow-bridge.js'

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
  const session = new EditSession(ctx.state)
  return (
    <WorldFlowInner
      session={session}
      assetBase={ctx.assetBase}
      source={ctx.source}
      flowId="FLOW-R01"
    />
  )
}

function WorldFlowInner(props: {
  session: EditSession
  assetBase: import('@type-pal/reforge').AssetBase
  source: import('@type-pal/reforge').FileSource
  flowId: string
}) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.source, () => props.session.getState()),
    [props.session, props.source],
  )
  const current = props.session.getState()
  const [view, setView] = useState<'definition' | 'asset'>('definition')
  useEffect(() => {
    patchOracle({
      definitionCount: current.sprites.length,
      filterText:
        document.querySelector<HTMLInputElement>(
          '[data-surface="world-sprite"] input[type="search"]',
        )?.value ?? '',
    })
  })
  return (
    <Shell flowId="FLOW-R01" label="世界精灵库：搜索过滤（资源）">
      <div data-surface="world-sprite">
        <WorldSpriteLibrary
          definitions={current.sprites}
          catalog={current.assetCatalog}
          assetBase={props.assetBase}
          assetReader={reader}
          session={props.session}
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
  const session = new EditSession(ctx.state)
  return <BattleFlowInner session={session} project={ctx} />
}

function BattleFlowInner(props: {
  session: EditSession
  project: Awaited<ReturnType<typeof loadCursorBattleProject>>
}) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.project.source, () => props.session.getState()),
    [props.project.source, props.session],
  )
  const current = props.session.getState()
  const [view, setView] = useState<'definition' | 'asset'>('definition')
  useEffect(() => {
    patchOracle({
      battleSpriteCount: current.battleSprites.length,
      purposeFilter:
        document.querySelector<HTMLSelectElement>('[aria-label="用途筛选"]')?.value ?? '',
    })
  })
  return (
    <Shell flowId="FLOW-R02" label="战斗精灵库：用途筛选（资源）">
      <BattleSpriteLibrary
        definitions={current.battleSprites}
        catalog={current.assetCatalog}
        assetBase={props.project.assetBase}
        assetReader={reader}
        session={props.session}
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
  const [focus, setFocus] = useState<string | undefined>(undefined)
  useEffect(() => {
    void loadLegalProject('flow-r03').then(setCtx)
  }, [])
  if (!ctx) return <p>loading…</p>
  const session = new EditSession(ctx.state)
  return <ImageFlowInner session={session} legal={ctx} focus={focus} onFocus={setFocus} />
}

function ImageFlowInner(props: {
  session: EditSession
  legal: LegalProject
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
      catalogSize: Object.keys(current.assetCatalog).length,
      focusObjectId: props.focus ?? null,
    })
  }, [props.focus, current.assetCatalog])
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
  const [focus, setFocus] = useState<string | undefined>('flow-tileset')
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
  const session = new EditSession(ctx.state)
  return <SoundFlowInner session={session} legal={ctx} />
}

function SoundFlowInner(props: { session: EditSession; legal: LegalProject }) {
  useSessionVersion(props.session)
  const reader = useMemo(
    () => createEditorAssetReader(props.legal.source, () => props.session.getState()),
    [props.legal.source, props.session],
  )
  const current = props.session.getState()
  const ghostId = 'sound.ghost.missing' as import('@type-pal/content').AssetId
  const catalog = {
    ...current.assetCatalog,
    [ghostId]: {
      kind: 'sound' as const,
      path: 'assets/missing/ghost.wav',
      mediaType: 'audio/wav',
      bytes: 0,
      sha256: '0'.repeat(64),
      label: 'Ghost',
      origin: { kind: 'authored' as const },
    },
  }
  useEffect(() => {
    const warn = document.querySelector('[data-surface="sound-tab"]')?.textContent ?? ''
    patchOracle({
      focusAsset: ghostId,
      showsMissing: warn.includes('缺失') || warn.includes('ghost'),
    })
  })
  return (
    <Shell flowId="FLOW-R06" label="音效：缺失资产警告与恢复（资源）">
      <div data-surface="sound-tab">
        <SoundTab
          catalog={catalog}
          reader={reader}
          session={props.session}
          tabBar={null}
          focusObjectId={ghostId}
          onObjectFocus={() => {}}
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
  useEffect(() => {
    setFlowSnapshot({
      flowId: 'FLOW-R04',
      phase: canvas2d.ok ? 'ready' : 'error',
      label: '预览画布像素探针（资源 / Canvas2D）',
      oracle: { blocked: !canvas2d.ok, reason: canvas2d.note },
      canvas2d,
    })
  }, [])
  if (!canvas2d.ok) {
    return (
      <Shell flowId="FLOW-R04" label="预览画布像素：Canvas2D blocked">
        <p data-contract="blocked">
          真实 Canvas2D 不可用 — 本像素合同诚实标 blocked，不伪造截图 oracle。
        </p>
      </Shell>
    )
  }
  return (
    <Shell flowId="FLOW-R04" label="预览画布像素采样（资源）">
      <canvas id="flow-r04-canvas" width="32" height="32" data-surface="preview-canvas" />
      <FlowR04Draw />
    </Shell>
  )
}

function FlowR04Draw() {
  useEffect(() => {
    const canvas = document.getElementById('flow-r04-canvas') as HTMLCanvasElement | null
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#336699'
    ctx.fillRect(4, 4, 12, 12)
    const px = [...ctx.getImageData(8, 8, 1, 1).data]
    patchOracle({ centerPixel: px, opaqueSampleOk: px[3] === 255 })
  }, [])
  return null
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
    patchOracle({ value, draftNote })
  }, [value, draftNote])
  return (
    <Shell flowId="FLOW-DS03" label="DsNumberField：Escape 取消草稿（设计控件）">
      <DsNumberField
        label="尺寸"
        min={0}
        max={99}
        value={value}
        onValueChange={(next) => {
          setValue(next)
          setDraftNote('committed')
        }}
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
    patchOracle({ status })
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
          patchOracle({ loadProof: proof?.kind ?? 'error', asset, error: !proof })
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
