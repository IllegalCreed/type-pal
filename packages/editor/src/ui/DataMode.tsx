/** 八模块导航下的数据型业务页挂载器。页面归属由 editor-navigation 单一注册表决定。 */

import type {
  AssetCatalogV1,
  BattleFieldDef,
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  Locale,
  SceneDef,
  SkillDataMap,
  SpriteDef,
  SpriteLayout,
} from '@type-pal/content'
import { collectSpriteDefinitionReferences } from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import {
  DeleteUnusedSpriteAssetCommand,
  RemoveSpriteDefinitionCommand,
  type SpriteLayoutEditProof,
  UpdateSpriteCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { buildRefIndex } from '../core/ref-index.js'
import { AmbienceTab } from './AmbienceTab.js'
import { BattleFieldTab } from './BattleFieldTab.js'
import { CutsceneTab } from './CutsceneTab.js'
import { EnemyTab } from './EnemyTab.js'
import { EntryPointTab } from './EntryPointTab.js'
import { EventLibTab } from './EventLibTab.js'
import { type DataPageId, editorSubpageForDataPage } from './editor-navigation.js'
import { ImageTab } from './ImageTab.js'
import { ItemTab } from './ItemTab.js'
import { MusicTab } from './MusicTab.js'
import { PoisonTab } from './PoisonTab.js'
import { SharedScriptTab } from './SharedScriptTab.js'
import { ShopTab } from './ShopTab.js'
import { SkillTab } from './SkillTab.js'
import { SoundTab } from './SoundTab.js'
import { SpriteFrames } from './SpriteFrames.js'
import { SpriteThumb } from './SpriteThumb.js'
import { SpriteUploadWizard } from './SpriteUploadWizard.js'
import { StampLibraryTab } from './StampLibraryTab.js'
import { TilesetTab } from './TilesetTab.js'
import { VarsTab } from './VarsTab.js'

export type DataTab = DataPageId

const KIND_LABEL: Record<SpriteDef['layout']['kind'], string> = {
  directional: '行走',
  static: '静物',
  loop: '循环',
}
const KIND_ICON: Record<SpriteDef['layout']['kind'], string> = {
  directional: '🚶',
  static: '🪑',
  loop: '🔥',
}

/** 布局类型切换时的默认参数(directional 默认 3 帧/向,loop 默认全帧循环)。 */
function defaultLayout(
  kind: SpriteLayout['kind'],
  prev: SpriteLayout,
  actualFrameCount: number,
): SpriteLayout {
  if (kind === 'directional')
    return {
      kind,
      framesPerDir:
        prev.kind === 'directional'
          ? prev.framesPerDir
          : Math.max(1, Math.min(3, Math.floor(actualFrameCount / 4))),
    }
  if (kind === 'loop')
    return {
      kind,
      frameCount:
        prev.kind === 'loop' ? prev.frameCount : Math.max(1, Math.min(4, actualFrameCount)),
    }
  return { kind: 'static' }
}

export function DataMode(props: {
  sprites: SpriteDef[]
  skills: SkillDataMap
  items: ItemDataMap
  /** 物品数组(ItemTab 编辑;= session state.items)。 */
  itemList: import('@type-pal/content').ItemData[]
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  enemies: EnemyDef[]
  enemyTeams: EnemyTeamDef[]
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  audioResolver: AudioAssetReader
  /** tileset 注册表 + 上传字节暂存(瓦片集页,W7B)。 */
  tilesets: import('@type-pal/reforge').TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  /** W7G 图章模板与地图索引；图章库做 CRUD 和全工程来源扫描。 */
  stamps: import('@type-pal/content').StampTemplateV1[]
  mapIndex: import('@type-pal/content').MapIndexV1
  stampSelectionSource?: import('../core/stamp-template.js').StampSelectionSource
  /** 战场表(战场页;D24;工程没带 = 空)。 */
  battleFields: BattleFieldDef[]
  /** 毒定义表(毒页,B10;工程没带 = 空)。 */
  poisons: import('@type-pal/content').PoisonDef[]
  /** 氛围表(氛围页,W6;工程没带 = 空)。 */
  ambiences: import('@type-pal/content').AmbienceDef[]
  /** 店铺表(商店页;工程没带 = 空)。 */
  shops: import('@type-pal/content').ShopDef[]
  /** 技能数组(SkillTab 编辑;= session state.skills)。 */
  skillList: import('@type-pal/content').SkillData[]
  /** 全场景(N5 引用反向索引数据源;入口点场景下拉)。 */
  scenes: SceneDef[]
  /** 工程清单(入口点页编 manifest.entryPoints)。 */
  manifest: import('@type-pal/content').LoadedManifest
  /** 角色定义(入口点 startWorld 队伍选人)。 */
  actors: import('@type-pal/content').ActorDef[]
  /** 引用跳转:变量页/物品页点引用 → 事件模式定位。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  /** N6:从场景调用行跳入指定共享/内部脚本。 */
  focusScriptId?: string
  focusScriptRevision?: number
  /** 当前模块的子页导航，由八模块注册表派生。 */
  tabBar: ReactNode
  tab: DataTab
  focusObjectId?: string
  onObjectFocus?: (id: string | undefined) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenMap?: (id: string) => void
  onOpenTileset?: (id: string) => void
  onOpenStamp?: (id: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const {
    sprites,
    assetBase,
    session,
    enemies,
    enemyTeams,
    skills,
    locale,
    itemList,
    assetCatalog,
    assetReader,
    audioResolver,
    tilesets,
    stamps,
    mapIndex,
    stampSelectionSource,
    battleFields,
    poisons,
    ambiences,
    shops,
    scenes,
    manifest,
    actors,
    skillList,
    onJumpToEvent,
    focusScriptId,
    focusScriptRevision,
    tabBar,
    tab,
    focusObjectId,
    onObjectFocus,
    onOpenSound,
    onOpenImage,
    onOpenMap,
    onOpenTileset,
    onOpenStamp,
    onStatusNotice,
  } = props
  // N5:引用反向索引(flag/var/item ← 事件脚本);scenes 变才重算(全量扫描毫秒级)
  const refIndex = useMemo(() => buildRefIndex(scenes), [scenes])
  const [filter, setFilter] = useState('')
  const [kindFilter, setKindFilter] = useState<'all' | SpriteDef['layout']['kind']>('all')
  const spriteAssets = useMemo(
    () =>
      Object.entries(assetCatalog.assets)
        .filter(([, record]) => record.kind === 'sprite')
        .sort(([left], [right]) => left.localeCompare(right)),
    [assetCatalog],
  )
  const definitionsByAsset = useMemo(() => {
    const result = new Map<string, SpriteDef[]>()
    for (const definition of sprites)
      result.set(definition.asset, [...(result.get(definition.asset) ?? []), definition])
    return result
  }, [sprites])
  const [libraryView, setLibraryView] = useState<'definition' | 'asset'>(() =>
    focusObjectId && assetCatalog.assets[focusObjectId]?.kind === 'sprite' ? 'asset' : 'definition',
  )
  const [selId, setSelId] = useState(focusObjectId ?? sprites[0]?.id ?? '')
  const [selAssetId, setSelAssetId] = useState(
    focusObjectId && assetCatalog.assets[focusObjectId]?.kind === 'sprite'
      ? focusObjectId
      : (spriteAssets[0]?.[0] ?? ''),
  )
  const [uploadingSprite, setUploadingSprite] = useState(false)
  const [layoutProof, setLayoutProof] = useState<SpriteLayoutEditProof | undefined>()
  const handleLayoutProof = useCallback(
    (proof: SpriteLayoutEditProof | undefined) => setLayoutProof(proof),
    [],
  )

  useEffect(() => {
    if (tab !== 'sprite' || focusObjectId === undefined) return
    if (sprites.some((candidate) => candidate.id === focusObjectId)) {
      setLibraryView('definition')
      setSelId(focusObjectId)
    } else if (assetCatalog.assets[focusObjectId]?.kind === 'sprite') {
      setLibraryView('asset')
      setSelAssetId(focusObjectId)
    }
  }, [assetCatalog, focusObjectId, sprites, tab])

  const shown = useMemo(
    () =>
      sprites.filter(
        (s) =>
          (kindFilter === 'all' || s.layout.kind === kindFilter) &&
          (!filter ||
            s.id.includes(filter) ||
            s.label.includes(filter) ||
            s.asset.includes(filter)),
      ),
    [sprites, filter, kindFilter],
  )
  const sprite = sprites.find((s) => s.id === selId)
  const shownAssets = useMemo(
    () =>
      spriteAssets.filter(([asset, record]) => {
        if (!filter) return true
        return (
          asset.includes(filter) ||
          record.path.includes(filter) ||
          record.label?.includes(filter) ||
          record.origin.kind.includes(filter)
        )
      }),
    [filter, spriteAssets],
  )
  const selectedAsset =
    assetCatalog.assets[selAssetId]?.kind === 'sprite' ? assetCatalog.assets[selAssetId] : undefined
  const selectedAssetConsumers = definitionsByAsset.get(selAssetId) ?? []
  const currentEditorState = session.getState()
  const spriteReferences = useMemo(
    () =>
      sprite
        ? collectSpriteDefinitionReferences(currentEditorState).filter(
            (reference) => reference.sprite === sprite.id,
          )
        : [],
    [currentEditorState, sprite],
  )
  const proofReady =
    !!sprite &&
    layoutProof?.asset === sprite.asset &&
    layoutProof.sha256 === assetCatalog.assets[sprite.asset]?.sha256

  const dispatchSpritePatch = (
    patch: ConstructorParameters<typeof UpdateSpriteCommand>[1],
  ): void => {
    if (!sprite || !proofReady || !layoutProof) {
      onStatusNotice?.({ kind: 'error', message: '精灵帧尚未载入，不能修改布局或姿势。' })
      return
    }
    try {
      session.dispatch(new UpdateSpriteCommand(sprite.id, patch, layoutProof))
      onStatusNotice?.(undefined)
    } catch (error) {
      onStatusNotice?.({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const removeSelectedDefinition = (): void => {
    if (!sprite || spriteReferences.length) return
    if (!window.confirm(`删除精灵定义“${sprite.label}”（${sprite.id}）？二进制资源会保留。`)) return
    try {
      const asset = sprite.asset
      session.dispatch(new RemoveSpriteDefinitionCommand(sprite.id))
      setUploadingSprite(false)
      setLibraryView('asset')
      setSelAssetId(asset)
      onObjectFocus?.(asset)
      onStatusNotice?.({ kind: 'info', message: '精灵定义已删除；资源仍保留，可单独检查或删除。' })
    } catch (error) {
      onStatusNotice?.({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  const deleteSelectedAsset = async (): Promise<void> => {
    if (!selectedAsset || selectedAssetConsumers.length) return
    if (!window.confirm(`永久移除未使用资源“${selAssetId}”及其工程文件？此操作可撤销。`)) return
    try {
      const bytes = await assetReader.readBytes(selAssetId, 'sprite')
      const nextAsset = spriteAssets.find(([asset]) => asset !== selAssetId)?.[0] ?? ''
      session.dispatch(new DeleteUnusedSpriteAssetCommand(selAssetId, bytes))
      setSelAssetId(nextAsset)
      onObjectFocus?.(nextAsset || undefined)
      onStatusNotice?.({ kind: 'info', message: `已移除未使用精灵资源 ${selAssetId}。` })
    } catch (error) {
      onStatusNotice?.({
        kind: 'error',
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }

  if (tab === 'enemy') {
    return (
      <EnemyTab
        assetBase={assetBase}
        projectId={manifest.id}
        enemies={enemies}
        enemyTeams={enemyTeams}
        skills={Object.values(skills)}
        locale={locale}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        onOpenSound={onOpenSound}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'item') {
    return (
      <ItemTab
        items={itemList}
        actors={actors}
        skills={skillList}
        locale={locale}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        onOpenSound={onOpenSound}
        onOpenImage={onOpenImage}
        itemRefs={refIndex.items}
        onJumpToEvent={onJumpToEvent}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'skill') {
    return (
      <SkillTab
        skills={skillList}
        session={session}
        assetBase={assetBase}
        projectId={manifest.id}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        onOpenSound={onOpenSound}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'poison') {
    return <PoisonTab poisons={poisons} items={itemList} session={session} tabBar={tabBar} />
  }

  if (tab === 'ambience') {
    return <AmbienceTab ambiences={ambiences} session={session} tabBar={tabBar} />
  }

  if (tab === 'shop') {
    return <ShopTab shops={shops} items={itemList} session={session} tabBar={tabBar} />
  }

  if (tab === 'tileset') {
    return (
      <TilesetTab
        tilesets={tilesets}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        assetBase={assetBase}
        session={session}
        mapIndex={mapIndex}
        stamps={stamps}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenMap={onOpenMap}
        onOpenStamp={onOpenStamp}
      />
    )
  }
  if (tab === 'stamp') {
    return (
      <StampLibraryTab
        stamps={stamps}
        tilesets={tilesets}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        assetBase={assetBase}
        session={session}
        mapIndex={mapIndex}
        selectionSource={stampSelectionSource}
        onStatusNotice={onStatusNotice}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenMap={onOpenMap}
        onOpenTileset={onOpenTileset}
      />
    )
  }
  if (tab === 'music') {
    return (
      <MusicTab
        catalog={assetCatalog}
        resolver={audioResolver}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
      />
    )
  }

  if (tab === 'image') {
    return (
      <ImageTab
        assetBase={assetBase}
        catalog={assetCatalog}
        reader={assetReader}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
      />
    )
  }

  if (tab === 'sound') {
    return (
      <SoundTab
        catalog={assetCatalog}
        reader={assetReader}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
      />
    )
  }

  if (tab === 'cutscene') {
    return (
      <CutsceneTab
        assetBase={assetBase}
        catalog={assetCatalog}
        reader={assetReader}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
      />
    )
  }

  if (tab === 'entrypoint') {
    return (
      <EntryPointTab
        manifest={manifest}
        scenes={scenes}
        actors={actors}
        items={itemList}
        skills={skillList}
        locale={locale}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        session={session}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'battlefield') {
    return (
      <BattleFieldTab
        battleFields={battleFields}
        assetBase={assetBase}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        onOpenImage={onOpenImage}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'events') {
    return <EventLibTab tabBar={tabBar} />
  }

  if (tab === 'vars') {
    return <VarsTab refIndex={refIndex} onJumpToEvent={onJumpToEvent} tabBar={tabBar} />
  }

  if (tab === 'scripts') {
    const state = session.getState()
    return (
      <SharedScriptTab
        tabBar={tabBar}
        session={session}
        scriptIndex={state.scriptIndex}
        scriptChunks={state.scriptChunks}
        scenes={scenes}
        locale={locale}
        sprites={sprites}
        actors={actors}
        assetBase={assetBase}
        assetCatalog={assetCatalog}
        audioResolver={audioResolver}
        assetReader={assetReader}
        projectMaps={state.maps}
        mapIndex={state.mapIndex}
        tilesets={tilesets}
        projectId={manifest.id}
        focusScriptId={focusScriptId}
        focusScriptRevision={focusScriptRevision}
        onJumpToEvent={onJumpToEvent}
        onSelectedScriptId={onObjectFocus}
        onOpenSound={onOpenSound}
        onOpenImage={onOpenImage}
      />
    )
  }

  return (
    <>
      {/* 左:数据标签 + 精灵列表 */}
      <div className="outliner data-outliner">
        {tabBar}
        {tab === 'sprite' ? (
          <>
            <div className="pane-h">
              <span className="t">精灵库</span>
              <span className="spacer" />
              <span className="k">
                {libraryView === 'definition'
                  ? `${shown.length}/${sprites.length}`
                  : `${shownAssets.length}/${spriteAssets.length}`}
              </span>
            </div>
            <fieldset className="sprite-library-switch" aria-label="精灵库视图">
              <button
                type="button"
                aria-pressed={libraryView === 'definition'}
                className={libraryView === 'definition' ? 'on' : ''}
                onClick={() => {
                  setLibraryView('definition')
                  setUploadingSprite(false)
                  if (sprite) onObjectFocus?.(sprite.id)
                }}
              >
                语义定义 <b>{sprites.length}</b>
              </button>
              <button
                type="button"
                aria-pressed={libraryView === 'asset'}
                className={libraryView === 'asset' ? 'on' : ''}
                onClick={() => {
                  setLibraryView('asset')
                  setUploadingSprite(false)
                  if (selAssetId) onObjectFocus?.(selAssetId)
                }}
              >
                二进制资源 <b>{spriteAssets.length}</b>
              </button>
            </fieldset>
            <input
              className="in"
              aria-label="过滤精灵库"
              placeholder={
                libraryView === 'definition'
                  ? '过滤定义 id / 标签 / AssetId…'
                  : '过滤 AssetId / 路径…'
              }
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ margin: '0 8px 6px' }}
            />
            {libraryView === 'definition' ? (
              <>
                <div className="kind-filter">
                  {(['all', 'directional', 'static', 'loop'] as const).map((k) => (
                    <button
                      type="button"
                      key={k}
                      className={`kchip${kindFilter === k ? ' on' : ''}`}
                      onClick={() => setKindFilter(k)}
                    >
                      {k === 'all' ? '全部' : `${KIND_ICON[k]} ${KIND_LABEL[k]}`}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="sprite-upload-action"
                  title="上传 PNG 行走图/静物/循环动画，自动贴合工程主色风格"
                  onClick={() => setUploadingSprite(true)}
                >
                  ＋ 上传并创建定义
                </button>
              </>
            ) : (
              <div className="sprite-resource-summary">
                {
                  spriteAssets.filter(([asset]) => !(definitionsByAsset.get(asset)?.length ?? 0))
                    .length
                }{' '}
                个未使用资源 · 删除与定义分开
              </div>
            )}
            <div className="sprite-list">
              {libraryView === 'definition'
                ? shown.map((s) => (
                    <button
                      type="button"
                      key={s.id}
                      className={`arow${s.id === selId ? ' sel' : ''}`}
                      onClick={() => {
                        setSelId(s.id)
                        setUploadingSprite(false)
                        onObjectFocus?.(s.id)
                      }}
                    >
                      <span className="face">{KIND_ICON[s.layout.kind]}</span>
                      <span className="nm">
                        <b title={s.label}>{s.label}</b>
                        <span title={`${s.id} · ${s.asset}`}>
                          {s.id} · {s.asset}
                        </span>
                      </span>
                      <span className="abadge npc">{KIND_LABEL[s.layout.kind]}</span>
                    </button>
                  ))
                : shownAssets.map(([asset, record]) => {
                    const consumerCount = definitionsByAsset.get(asset)?.length ?? 0
                    return (
                      <button
                        type="button"
                        key={asset}
                        className={`arow sprite-resource-row${asset === selAssetId ? ' sel' : ''}`}
                        onClick={() => {
                          setSelAssetId(asset)
                          setUploadingSprite(false)
                          onObjectFocus?.(asset)
                        }}
                      >
                        <span className="face">📦</span>
                        <span className="nm">
                          <b title={record.label ?? asset}>{record.label ?? asset}</b>
                          <span title={`${asset} · ${record.path}`}>
                            {asset} · {record.path}
                          </span>
                        </span>
                        <span
                          className={`abadge${consumerCount ? ' npc' : ' sprite-unused-badge'}`}
                        >
                          {consumerCount ? `${consumerCount} 个定义` : '未使用'}
                        </span>
                      </button>
                    )
                  })}
            </div>
          </>
        ) : (
          <div className="insp-empty" style={{ padding: 20 }}>
            {editorSubpageForDataPage(tab).label} 编辑器尚未实现
          </div>
        )}
      </div>

      {/* 中:精灵帧(上传态 → 向导) */}
      <div className="center actor-center">
        {tab === 'sprite' ? (
          uploadingSprite ? (
            <SpriteUploadWizard
              sprites={sprites}
              assetBase={assetBase}
              session={session}
              onDone={(id) => {
                setUploadingSprite(false)
                if (id) {
                  setLibraryView('definition')
                  setSelId(id)
                  onObjectFocus?.(id)
                }
              }}
            />
          ) : libraryView === 'definition' && sprite ? (
            <SpriteFrames
              sprite={sprite}
              assetBase={assetBase}
              assetReader={assetReader}
              session={session}
              onLayoutProof={handleLayoutProof}
            />
          ) : libraryView === 'asset' && selectedAsset ? (
            <div className="sprite-resource-viewer">
              <SpriteThumb
                assetBase={assetBase}
                assetReader={assetReader}
                asset={selAssetId}
                revision={selectedAsset.sha256}
                size={220}
                maxScale={6}
                align="center"
                label={selectedAsset.label ?? selAssetId}
              />
              <div>
                <strong>{selectedAsset.label ?? selAssetId}</strong>
                <code>{selAssetId}</code>
                <span>
                  {selectedAssetConsumers.length
                    ? `由 ${selectedAssetConsumers.length} 个语义定义使用；点右侧定义可进入逐帧编辑。`
                    : '当前没有语义定义使用这份资源。你可以保留备用，也可以在右侧显式删除。'}
                </span>
              </div>
            </div>
          ) : (
            <div className="insp-empty" style={{ padding: 40 }}>
              {focusObjectId ? `找不到精灵“${focusObjectId}”` : '无精灵'}
            </div>
          )
        ) : (
          <div className="insp-empty" style={{ padding: 40 }}>
            此业务页尚未实现。
          </div>
        )}
      </div>

      {/* 右:精灵信息 + 布局(编辑后续) */}
      <div className="inspector">
        {tab === 'sprite' && libraryView === 'definition' && sprite ? (
          <>
            <div className="insp-head">
              <div className="what">选中精灵</div>
              <div className="who">{sprite.label}</div>
            </div>
            <div className="section">
              <h4>登记</h4>
              <div className="field">
                <span className="field-label">id</span>
                <div className="in mono pick">
                  <span>{sprite.id}</span>
                </div>
              </div>
              <div className="field">
                <span className="field-label">AssetId</span>
                <div className="in mono">{sprite.asset}</div>
              </div>
            </div>
            <div className="section">
              <h4>
                帧布局 <span className="hint2">可改 · 火把/流水标循环</span>
              </h4>
              <div className="field">
                <span className="field-label">类型</span>
                <select
                  className="in"
                  value={sprite.layout.kind}
                  disabled={!proofReady}
                  onChange={(e) => {
                    if (!layoutProof) return
                    dispatchSpritePatch({
                      layout: defaultLayout(
                        e.target.value as SpriteLayout['kind'],
                        sprite.layout,
                        layoutProof.actualFrameCount,
                      ),
                    })
                  }}
                >
                  <option value="directional" disabled={(layoutProof?.actualFrameCount ?? 0) < 4}>
                    🚶 行走(4向)
                  </option>
                  <option value="static">🪑 静物(单帧)</option>
                  <option value="loop">🔥 循环(自动画)</option>
                </select>
              </div>
              {sprite.layout.kind === 'directional' ? (
                <div className="field">
                  <span className="field-label">每向帧数</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    step={1}
                    disabled={!proofReady}
                    value={sprite.layout.framesPerDir}
                    onChange={(e) =>
                      Number.isInteger(e.target.valueAsNumber) &&
                      e.target.valueAsNumber >= 1 &&
                      dispatchSpritePatch({
                        layout: {
                          kind: 'directional',
                          framesPerDir: e.target.valueAsNumber,
                        },
                      })
                    }
                  />
                </div>
              ) : sprite.layout.kind === 'loop' ? (
                <div className="field">
                  <span className="field-label">循环帧数</span>
                  <input
                    className="in mono"
                    type="number"
                    min={1}
                    step={1}
                    disabled={!proofReady}
                    value={sprite.layout.frameCount}
                    onChange={(e) =>
                      Number.isInteger(e.target.valueAsNumber) &&
                      e.target.valueAsNumber >= 1 &&
                      dispatchSpritePatch({
                        layout: { kind: 'loop', frameCount: e.target.valueAsNumber },
                      })
                    }
                  />
                </div>
              ) : null}
              {!proofReady ? (
                <div className="hint2">正在读取实际帧数；载入完成后可编辑。</div>
              ) : null}
            </div>
            <div className="section sprite-definition-lifecycle">
              <h4>引用与生命周期</h4>
              <p className="hint2">
                {spriteReferences.length
                  ? `当前有 ${spriteReferences.length} 处语义引用，需先在对应内容中改用其它定义。`
                  : '当前无语义引用；删除定义不会静默删除二进制资源。'}
              </p>
              {spriteReferences.slice(0, 5).map((reference) => (
                <code key={reference.where} className="sprite-reference-path">
                  {reference.where}
                </code>
              ))}
              <button
                type="button"
                className="danger-action sprite-delete-action"
                disabled={spriteReferences.length > 0}
                onClick={removeSelectedDefinition}
              >
                删除精灵定义（保留资源）
              </button>
            </div>
          </>
        ) : tab === 'sprite' && libraryView === 'asset' && selectedAsset ? (
          <>
            <div className="insp-head">
              <div className="what">选中二进制资源</div>
              <div className="who">{selectedAsset.label ?? selAssetId}</div>
            </div>
            <div className="section sprite-resource-meta">
              <h4>资源登记</h4>
              <div className="field">
                <span className="field-label">AssetId</span>
                <div className="in mono">{selAssetId}</div>
              </div>
              <div className="field">
                <span className="field-label">路径</span>
                <div className="in mono">{selectedAsset.path}</div>
              </div>
              <div className="field">
                <span className="field-label">字节</span>
                <div className="in mono">{selectedAsset.bytes.toLocaleString()}</div>
              </div>
              <div className="field">
                <span className="field-label">SHA-256</span>
                <div className="in mono" title={selectedAsset.sha256}>
                  {selectedAsset.sha256.slice(0, 16)}…
                </div>
              </div>
              <div className="field">
                <span className="field-label">来源</span>
                <div className="in mono">{selectedAsset.origin.kind}</div>
              </div>
            </div>
            <div className="section sprite-resource-consumers">
              <h4>语义定义 · {selectedAssetConsumers.length}</h4>
              {selectedAssetConsumers.map((definition) => (
                <button
                  type="button"
                  key={definition.id}
                  className="sprite-consumer-link"
                  onClick={() => {
                    setLibraryView('definition')
                    setSelId(definition.id)
                    onObjectFocus?.(definition.id)
                  }}
                >
                  <b>{definition.label}</b>
                  <code>{definition.id}</code>
                </button>
              ))}
              {selectedAssetConsumers.length === 0 ? (
                <p className="hint2">未被任何 SpriteDef 使用；保留会作为资源库备用项。</p>
              ) : null}
              <button
                type="button"
                className="danger-action sprite-delete-action"
                disabled={selectedAssetConsumers.length > 0}
                onClick={() => void deleteSelectedAsset()}
              >
                删除未使用资源（含工程文件）
              </button>
            </div>
          </>
        ) : (
          <div className="insp-empty">选左侧精灵看它的帧布局。</div>
        )}
      </div>
    </>
  )
}
