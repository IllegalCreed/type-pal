/** 八模块导航下的数据型业务页挂载器。页面归属由 editor-navigation 单一注册表决定。 */

import type {
  AssetCatalogV1,
  BattleFieldDef,
  BattleSpriteDef,
  EnemyDef,
  EnemyTeamDef,
  Locale,
  SceneDef,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { type ReactNode, useEffect, useState } from 'react'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedData } from '../core/editor-derived-contract.js'
import type { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import type { EditorPlayIdentity } from '../core/play-url.js'
import type { ManifestLike, ProjectIssue } from '../core/project-diagnostics.js'
import type { ProjectReferenceEdge, ProjectReferenceIndex } from '../core/project-reference.js'
import {
  type CurrentProjectReferenceIndexProvider,
  collectCurrentProjectReferenceIndex,
} from '../core/project-reference-adapters.js'
import type { ScriptEditorState, ScriptEditSession } from '../core/script-editor.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { findDefaultEntry } from '../core/startup-entries.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'
import { AmbienceTab } from './AmbienceTab.js'
import { BattleFieldTab } from './BattleFieldTab.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'
import { CutsceneTab } from './CutsceneTab.js'
import { EnemyTab } from './EnemyTab.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'
import { EventLibTab } from './EventLibTab.js'
import { type DataPageId, editorSubpageForDataPage } from './editor-navigation.js'
import { ImageTab } from './ImageTab.js'
import { CraftingAlchemyTab, SpiritGourdAlchemyTab } from './ItemAlchemyTab.js'
import { ItemTab } from './ItemTab.js'
import { MusicTab } from './MusicTab.js'
import { PoisonTab } from './PoisonTab.js'
import { CanonicalSharedScriptTab } from './SharedScriptTab.js'
import { ShopTab } from './ShopTab.js'
import { SkillTab } from './SkillTab.js'
import { SoundTab } from './SoundTab.js'
import { StampLibraryTab } from './StampLibraryTab.js'
import { TilesetTab } from './TilesetTab.js'
import { VarsTab } from './VarsTab.js'
import { WorldSpriteLibrary } from './WorldSpriteLibrary.js'

export type DataTab = DataPageId

export function DataMode(props: {
  sprites: SpriteDef[]
  battleSprites: readonly BattleSpriteDef[]
  skills: SkillDataMap
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
  /** W7G 图章模板与地图索引；图章库做 CRUD 和全项目来源扫描。 */
  stamps: import('@type-pal/content').StampTemplate[]
  mapIndex: import('@type-pal/content').MapIndexV1
  sceneIndex?: import('@type-pal/content').SceneIndexV1
  /** 战场表(战场页;D24;项目没带 = 空)。 */
  battleFields: BattleFieldDef[]
  /** 毒定义表(毒页,B10;项目没带 = 空)。 */
  poisons: import('@type-pal/content').PoisonDef[]
  /** 氛围表(氛围页,W6;项目没带 = 空)。 */
  ambiences: import('@type-pal/content').AmbienceDef[]
  /** 店铺表(商店页;项目没带 = 空)。 */
  shops: import('@type-pal/content').ShopDef[]
  /** 技能数组(SkillTab 编辑;= session state.skills)。 */
  skillList: import('@type-pal/content').SkillData[]
  /** 全场景(N5 引用反向索引数据源;入口点场景下拉)。 */
  scenes: SceneDef[]
  /** 项目清单(入口点页编 manifest.entryPoints)。 */
  manifest: ManifestLike
  projectIssues: readonly ProjectIssue[]
  projectDiagnosticsStatus: 'checking' | 'stale' | 'current' | 'failed'
  derivedData?: EditorDerivedData
  derivedDiagnosticsMessage?: string
  projectReferenceIndex?: ProjectReferenceIndex
  projectReferenceStatus: 'checking' | 'stale' | 'current' | 'failed'
  getCurrentProjectReferenceIndex: CurrentProjectReferenceIndexProvider
  onOpenProjectReference: (reference: ProjectReferenceEdge) => void
  workspaceId?: string
  playIdentity: EditorPlayIdentity
  /** 角色定义(入口点 startWorld 队伍选人)。 */
  actors: import('@type-pal/content').ActorDef[]
  /** 引用跳转:变量页/物品页点引用 → 事件模式定位。 */
  onJumpToEvent: (sceneId: string, srcKey: string) => void
  /** N6:从场景调用行跳入指定共享/内部脚本。 */
  focusScriptId?: string
  focusScriptRevision?: number
  focusScriptCommandPath?: string
  /** 当前模块的子页导航，由八模块注册表派生。 */
  tabBar: ReactNode
  tab: DataTab
  focusObjectId?: string
  focusItemPrivateScript?: {
    itemId: string
    ability: 'use' | 'throw'
    scriptId: string
    commandPath?: string
    revision: number
  }
  focusActionId?: string
  onObjectFocus?: (id: string | undefined) => void
  spriteDomain?: 'world' | 'battle'
  spriteView?: 'definition' | 'asset'
  onSpriteLocation?: (
    domain: 'world' | 'battle',
    view: 'definition' | 'asset',
    objectId?: string,
    actionId?: string,
  ) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenBattleField?: (id: number) => void
  onOpenEnemy?: (id: string) => void
  onOpenEnemyTeam?: (id: string) => void
  onOpenScript?: (id: string) => void
  onOpenWorldVariable?: (id: string) => void
  onOpenItem?: (id: string) => void
  onOpenItemAlchemy?: (surface: 'crafting' | 'spirit-gourd', itemId: string) => void
  onOpenProjectIssues?: () => void
  onJumpWorldSpriteAutomaticScriptInstance?: (site: SpriteAutomaticScriptInstanceSite) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
  onRequestSave?: () => void
  script?: {
    state: ScriptEditorState
    session: ScriptEditSession
  }
  historyCoordinator?: EditorHistoryCoordinator
}) {
  const {
    sprites,
    battleSprites,
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
    sceneIndex,
    battleFields,
    poisons,
    ambiences,
    shops,
    scenes,
    manifest,
    workspaceId,
    playIdentity,
    actors,
    skillList,
    projectReferenceIndex,
    projectReferenceStatus,
    getCurrentProjectReferenceIndex,
    onOpenProjectReference,
    focusScriptId,
    focusScriptRevision,
    focusScriptCommandPath,
    tabBar,
    tab,
    focusObjectId,
    focusItemPrivateScript,
    focusActionId,
    onObjectFocus,
    spriteDomain: controlledSpriteDomain,
    spriteView: controlledSpriteView,
    onSpriteLocation,
    onOpenSound,
    onOpenImage,
    onOpenBattleSprite,
    onOpenBattleField,
    onOpenScript,
    onOpenWorldVariable,
    onOpenItem,
    onOpenItemAlchemy,
    onOpenProjectIssues,
    onJumpWorldSpriteAutomaticScriptInstance,
    onStatusNotice,
    onRequestSave,
    script,
  } = props
  const assetDiagnostics = props.derivedData?.assetDiagnostics ?? []
  const [spriteDomain, setSpriteDomain] = useState<'world' | 'battle'>(
    () =>
      controlledSpriteDomain ??
      (focusObjectId &&
      (battleSprites.some((entry) => entry.id === focusObjectId) ||
        assetCatalog.assets[focusObjectId]?.kind === 'battle-sprite')
        ? 'battle'
        : 'world'),
  )
  useEffect(() => {
    if (tab !== 'sprite') return
    if (controlledSpriteDomain) setSpriteDomain(controlledSpriteDomain)
  }, [controlledSpriteDomain, tab])

  useEffect(() => {
    if (tab !== 'sprite' || focusObjectId === undefined) return
    if (controlledSpriteDomain !== undefined) {
      setSpriteDomain(controlledSpriteDomain)
      return
    }
    if (
      battleSprites.some((candidate) => candidate.id === focusObjectId) ||
      assetCatalog.assets[focusObjectId]?.kind === 'battle-sprite'
    ) {
      setSpriteDomain('battle')
    } else if (
      sprites.some((candidate) => candidate.id === focusObjectId) ||
      assetCatalog.assets[focusObjectId]?.kind === 'sprite'
    )
      setSpriteDomain('world')
  }, [assetCatalog, battleSprites, controlledSpriteDomain, focusObjectId, sprites, tab])

  if (tab === 'enemy') {
    return (
      <EnemyTab
        assetBase={assetBase}
        playIdentity={playIdentity}
        enemies={enemies}
        enemyTeams={enemyTeams}
        skills={Object.values(skills)}
        items={itemList}
        locale={locale}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        battleSprites={battleSprites}
        onOpenBattleSprite={onOpenBattleSprite}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onStatusNotice={onStatusNotice}
        onOpenSound={onOpenSound}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
        onOpenEnemyTeam={props.onOpenEnemyTeam}
      />
    )
  }

  if (tab === 'enemy-team') {
    return (
      <EnemyTeamTab
        enemyTeams={enemyTeams}
        enemies={enemies}
        items={itemList}
        locale={locale}
        assetCatalog={assetCatalog}
        worldVariables={session.getState().worldVariables ?? {}}
        actors={actors}
        scenes={scenes}
        playIdentity={playIdentity}
        session={session}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenEnemy={props.onOpenEnemy}
        onOpenReference={onOpenProjectReference}
      />
    )
  }

  if (tab === 'crafting') {
    return (
      <CraftingAlchemyTab
        items={itemList}
        session={session}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenItem={onOpenItem}
        tabBar={tabBar}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        onStatusNotice={onStatusNotice}
      />
    )
  }

  if (tab === 'spirit-gourd') {
    return (
      <SpiritGourdAlchemyTab
        items={itemList}
        session={session}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenItem={onOpenItem}
        tabBar={tabBar}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        onStatusNotice={onStatusNotice}
      />
    )
  }

  if (tab === 'item') {
    return (
      <ItemTab
        items={itemList}
        actors={actors}
        skills={skillList}
        poisons={poisons}
        locale={locale}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        assetBase={assetBase}
        audioResolver={audioResolver}
        battleSprites={battleSprites}
        battleFields={battleFields}
        onOpenBattleSprite={onOpenBattleSprite}
        onOpenBattleField={onOpenBattleField}
        focusObjectId={focusObjectId}
        focusPrivateScript={focusItemPrivateScript}
        onObjectFocus={onObjectFocus}
        onStatusNotice={onStatusNotice}
        onOpenSound={onOpenSound}
        onOpenImage={onOpenImage}
        onOpenScript={onOpenScript}
        onOpenReference={onOpenProjectReference}
        onOpenItemAlchemy={onOpenItemAlchemy}
        onOpenProjectIssues={onOpenProjectIssues}
        tabBar={tabBar}
        script={script}
        historyCoordinator={props.historyCoordinator}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
      />
    )
  }

  if (tab === 'skill') {
    return (
      <SkillTab
        skills={skillList}
        items={itemList}
        session={session}
        assetBase={assetBase}
        playIdentity={playIdentity}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        battleSprites={battleSprites}
        onOpenBattleSprite={onOpenBattleSprite}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onStatusNotice={onStatusNotice}
        onOpenSound={onOpenSound}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
      />
    )
  }

  if (tab === 'poison') {
    return (
      <PoisonTab
        poisons={poisons}
        items={itemList}
        session={session}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onStatusNotice={onStatusNotice}
        onOpenReference={onOpenProjectReference}
      />
    )
  }

  if (tab === 'ambience') {
    return (
      <AmbienceTab
        ambiences={ambiences}
        session={session}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={onOpenProjectReference}
        tabBar={tabBar}
        preview={{
          manifest,
          scenes,
          actors,
          sprites,
          assetBase,
          assetCatalog,
          assetReader,
          mapIndex,
          sceneIndex,
          tilesets,
          projectKey: `${manifest.id}:${workspaceId ?? ''}`,
        }}
      />
    )
  }

  if (tab === 'shop') {
    return (
      <ShopTab
        shops={shops}
        items={itemList}
        session={session}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
        playIdentity={playIdentity}
        isProjectDirty={() => session.isDirty() || (script?.session.isDirty() ?? false)}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        tabBar={tabBar}
      />
    )
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
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={onOpenProjectReference}
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
        onStatusNotice={onStatusNotice}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={onOpenProjectReference}
      />
    )
  }
  if (tab === 'music') {
    return (
      <MusicTab
        catalog={assetCatalog}
        reader={assetReader}
        session={session}
        assetDiagnostics={assetDiagnostics}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
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
        assetDiagnostics={assetDiagnostics}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
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
        assetDiagnostics={assetDiagnostics}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
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
        assetDiagnostics={assetDiagnostics}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
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
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenBattleFieldReference={onOpenProjectReference}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
      />
    )
  }

  if (tab === 'events') {
    return <EventLibTab tabBar={tabBar} />
  }

  if (tab === 'vars') {
    return (
      <VarsTab
        variables={session.getState().worldVariables ?? {}}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        session={session}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={onOpenProjectReference}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'scripts') {
    const state = session.getState()
    const defaultEntry = findDefaultEntry(manifest)
    if (script) {
      const references = createScriptReferenceCatalog({
        locale,
        items: itemList,
        skills: skillList,
        actors,
        poisons,
        sprites,
        battleSprites,
        ambiences,
        mapIndex,
        assetCatalog,
        authorScripts: Object.entries(script.state.sharedScripts).map(([id, script]) => ({
          id,
          name: script.name,
        })),
      })
      return (
        <CanonicalSharedScriptTab
          tabBar={tabBar}
          state={script.state}
          session={script.session}
          projectId={manifest.id}
          projectMaps={state.maps}
          mapIndex={state.mapIndex}
          tilesets={tilesets}
          leaderSpriteId={
            actors.find((actor) => actor.id === defaultEntry?.startWorld.party[0])?.spriteId
          }
          focusScriptId={focusScriptId}
          focusCommandPath={focusScriptCommandPath}
          focusRevision={focusScriptRevision}
          onSelectedScriptId={onObjectFocus}
          onError={(message) => onStatusNotice?.({ kind: 'error', message })}
          referenceIndex={projectReferenceIndex}
          referenceStatus={projectReferenceStatus}
          getCurrentReferenceIndex={(canonical) =>
            collectCurrentProjectReferenceIndex(session.getState(), canonical)
          }
          onOpenReference={onOpenProjectReference}
          context={{
            state: script.state,
            shellScenes: scenes,
            locale,
            assetCatalog,
            audioResolver,
            assetReader,
            assetBase,
            actors: Object.fromEntries(actors.map((actor) => [actor.id, actor])),
            battleSprites,
            battleFields,
            sprites,
            ambiences,
            shops,
            references,
            worldVariables: state.worldVariables,
            onOpenScript,
            onOpenWorldVariable,
            onOpenSound,
            onOpenImage,
            onOpenBattleSprite,
            onOpenBattleField,
            onOpenSpriteAction: (spriteId, actionId) =>
              onSpriteLocation?.('world', 'definition', spriteId, actionId),
          }}
        />
      )
    }
    return (
      <section className="canonical-script-load-error" role="alert">
        <h2>无法加载可复用脚本</h2>
        <p>当前项目没有建立 canonical Script Current 编辑会话。请重新打开项目后再试。</p>
      </section>
    )
  }

  if (tab === 'sprite' && spriteDomain === 'battle')
    return (
      <BattleSpriteLibrary
        definitions={battleSprites}
        catalog={assetCatalog}
        assetBase={assetBase}
        assetReader={assetReader}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        view={controlledSpriteView ?? 'definition'}
        onViewChange={(view, objectId) => onSpriteLocation?.('battle', view, objectId)}
        onWorldDomain={() => {
          setSpriteDomain('world')
          const definitionId = sprites[0]?.id
          const assetId = Object.entries(assetCatalog.assets).find(
            ([, record]) => record.kind === 'sprite',
          )?.[0]
          const id = definitionId ?? assetId
          const view = definitionId ? 'definition' : 'asset'
          onSpriteLocation?.('world', view, id)
          if (!onSpriteLocation) onObjectFocus?.(id)
        }}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
        onStatusNotice={onStatusNotice}
      />
    )

  if (tab === 'sprite')
    return (
      <WorldSpriteLibrary
        definitions={sprites}
        catalog={assetCatalog}
        assetBase={assetBase}
        assetReader={assetReader}
        session={session}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        focusActionId={focusActionId}
        onObjectFocus={onObjectFocus}
        view={controlledSpriteView ?? 'definition'}
        onViewChange={(view, objectId) => onSpriteLocation?.('world', view, objectId)}
        onActionFocus={(spriteId, actionId) =>
          onSpriteLocation?.('world', 'definition', spriteId, actionId)
        }
        onBattleDomain={() => {
          setSpriteDomain('battle')
          const definitionId = battleSprites[0]?.id
          const assetId = Object.entries(assetCatalog.assets).find(
            ([, record]) => record.kind === 'battle-sprite',
          )?.[0]
          const id = definitionId ?? assetId
          const view = definitionId ? 'definition' : 'asset'
          onSpriteLocation?.('battle', view, id)
          if (!onSpriteLocation) onObjectFocus?.(id)
        }}
        referenceIndex={projectReferenceIndex}
        referenceStatus={projectReferenceStatus}
        getCurrentReferenceIndex={getCurrentProjectReferenceIndex}
        onOpenReference={onOpenProjectReference}
        onJumpAutomaticScriptInstance={onJumpWorldSpriteAutomaticScriptInstance}
        onStatusNotice={onStatusNotice}
        onRequestSave={onRequestSave}
        canonical={script?.state}
      />
    )

  const unavailable = `${editorSubpageForDataPage(tab).label} 编辑器尚未实现`
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="insp-empty ds-empty-state--compact">{unavailable}</div>
      </div>
      <div className="center actor-center">
        <div className="insp-empty ds-empty-state--roomy">{unavailable}</div>
      </div>
      <div className="inspector">
        <div className="insp-empty">{unavailable}</div>
      </div>
    </>
  )
}
