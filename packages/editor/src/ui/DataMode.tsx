/** 八模块导航下的数据型业务页挂载器。页面归属由 editor-navigation 单一注册表决定。 */

import type {
  AssetCatalogV1,
  BattleFieldDef,
  BattleSpriteDef,
  BattleSpriteDefinitionReference,
  EnemyDef,
  EnemyTeamDef,
  ItemDataMap,
  Locale,
  SceneDef,
  SkillDataMap,
  SpriteDef,
  SpriteDefinitionReference,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { type ReactNode, useEffect, useState } from 'react'
import type { BattleDataReference } from '../core/battle-data-references.js'
import type { BlockingBattleFieldReference } from '../core/battle-field-references.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorHistoryCoordinator } from '../core/editor-history-coordinator.js'
import type { BlockingEnemyTeamReference } from '../core/enemy-team-references.js'
import type { ItemReference } from '../core/item-references.js'
import type { ManifestLike } from '../core/project-diagnostics.js'
import { createScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import type {
  CanonicalScriptReference,
  ScriptEditorState,
  ScriptEditSession,
} from '../core/script-editor.js'
import type { SpriteAutomaticScriptInstanceSite } from '../core/world-sprite-behavior.js'
import {
  collectWorldVariableReferencesV1,
  worldVariableScriptStateFromEditorStateV1,
} from '../core/world-variable-references.js'
import { AmbienceTab } from './AmbienceTab.js'
import { BattleFieldTab } from './BattleFieldTab.js'
import { BattleSpriteLibrary } from './BattleSpriteLibrary.js'
import { CanonicalSharedScriptTab } from './SharedScriptTab.js'
import { CutsceneTab } from './CutsceneTab.js'
import { EnemyTab } from './EnemyTab.js'
import { EnemyTeamTab } from './EnemyTeamTab.js'
import { EntryPointTab } from './EntryPointTab.js'
import { EventLibTab } from './EventLibTab.js'
import { type DataPageId, editorSubpageForDataPage } from './editor-navigation.js'
import { ImageTab } from './ImageTab.js'
import { ItemTab } from './ItemTab.js'
import { MusicTab } from './MusicTab.js'
import { PoisonTab } from './PoisonTab.js'
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
  stamps: import('@type-pal/content').StampTemplate[]
  mapIndex: import('@type-pal/content').MapIndexV1
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
  manifest: ManifestLike
  workspaceId?: string
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
    commandPath: string
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
  onOpenMap?: (id: string) => void
  onOpenTileset?: (id: string) => void
  onOpenStamp?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenBattleField?: (id: number) => void
  onOpenBattleFieldReference?: (reference: BlockingBattleFieldReference) => void
  onOpenEnemyTeamReference?: (reference: BlockingEnemyTeamReference) => void
  onOpenEnemy?: (id: string) => void
  onOpenEnemyTeam?: (id: string) => void
  onOpenScript?: (id: string) => void
  onOpenWorldVariable?: (id: string) => void
  onOpenCanonicalReference?: (reference: CanonicalScriptReference) => void
  onOpenItemReference?: (reference: ItemReference) => void
  onOpenBattleDataReference?: (reference: BattleDataReference) => void
  onOpenProjectIssues?: () => void
  onJumpWorldSpriteReference?: (reference: SpriteDefinitionReference) => void
  onJumpWorldSpriteActionReference?: (
    reference: import('@type-pal/content').SpriteActionReference,
  ) => void
  onJumpWorldSpriteAutomaticScriptInstance?: (site: SpriteAutomaticScriptInstanceSite) => void
  onJumpBattleSpriteReference?: (reference: BattleSpriteDefinitionReference) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
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
    battleFields,
    poisons,
    ambiences,
    shops,
    scenes,
    manifest,
    workspaceId,
    actors,
    skillList,
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
    onOpenMap,
    onOpenTileset,
    onOpenStamp,
    onOpenBattleSprite,
    onOpenBattleField,
    onOpenBattleFieldReference,
    onOpenEnemyTeamReference,
    onOpenScript,
    onOpenWorldVariable,
    onOpenCanonicalReference,
    onOpenItemReference,
    onOpenProjectIssues,
    onJumpWorldSpriteReference,
    onJumpWorldSpriteActionReference,
    onJumpWorldSpriteAutomaticScriptInstance,
    onJumpBattleSpriteReference,
    onStatusNotice,
    script,
  } = props
  const variableReferences = collectWorldVariableReferencesV1(
    script?.state ?? worldVariableScriptStateFromEditorStateV1(session.getState()),
  )
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
        projectId={manifest.id}
        workspaceId={workspaceId}
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
        onOpenSound={onOpenSound}
        onOpenReference={props.onOpenBattleDataReference}
        onOpenEnemyTeam={props.onOpenEnemyTeam}
      />
    )
  }

  if (tab === 'enemy-team') {
    return (
      <EnemyTeamTab
        enemyTeams={enemyTeams}
        enemies={enemies}
        locale={locale}
        projectId={manifest.id}
        workspaceId={workspaceId}
        session={session}
        scriptState={script?.state}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenEnemy={props.onOpenEnemy}
        onOpenReference={onOpenEnemyTeamReference}
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
        onOpenItemReference={onOpenItemReference}
        onOpenProjectIssues={onOpenProjectIssues}
        tabBar={tabBar}
        script={script}
        historyCoordinator={props.historyCoordinator}
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
        projectId={manifest.id}
        workspaceId={workspaceId}
        assetCatalog={assetCatalog}
        assetReader={assetReader}
        battleSprites={battleSprites}
        onOpenBattleSprite={onOpenBattleSprite}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onStatusNotice={onStatusNotice}
        onOpenSound={onOpenSound}
        onOpenReference={props.onOpenBattleDataReference}
      />
    )
  }

  if (tab === 'poison') {
    return (
      <PoisonTab
        poisons={poisons}
        items={itemList}
        session={session}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={props.onOpenBattleDataReference}
      />
    )
  }

  if (tab === 'ambience') {
    return (
      <AmbienceTab
        ambiences={ambiences}
        session={session}
        script={script}
        onOpenReference={onOpenCanonicalReference}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'shop') {
    return (
      <ShopTab
        shops={shops}
        items={itemList}
        session={session}
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
        onStatusNotice={onStatusNotice}
        tabBar={tabBar}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenMap={onOpenMap}
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
        onOpenBattleFieldReference={onOpenBattleFieldReference}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        scriptState={script?.state}
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
        references={variableReferences}
        session={session}
        focusObjectId={focusObjectId}
        onObjectFocus={onObjectFocus}
        onOpenReference={onOpenCanonicalReference}
        tabBar={tabBar}
      />
    )
  }

  if (tab === 'scripts') {
    const state = session.getState()
    if (script) {
      const references = createScriptReferenceCatalog({
        locale,
        items: itemList,
        skills: skillList,
        actors,
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
            actors.find((actor) => actor.id === manifest.startWorld.party[0])?.spriteId
          }
          focusScriptId={focusScriptId}
          focusCommandPath={focusScriptCommandPath}
          focusRevision={focusScriptRevision}
          onSelectedScriptId={onObjectFocus}
          onError={(message) => onStatusNotice?.({ kind: 'error', message })}
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
        <p>当前工程没有建立 canonical Script Current 编辑会话。请重新打开工程后再试。</p>
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
        onJumpReference={onJumpBattleSpriteReference}
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
        onJumpReference={onJumpWorldSpriteReference}
        onJumpActionReference={onJumpWorldSpriteActionReference}
        onJumpAutomaticScriptInstance={onJumpWorldSpriteAutomaticScriptInstance}
        onStatusNotice={onStatusNotice}
        canonical={script?.state}
      />
    )

  const unavailable = `${editorSubpageForDataPage(tab).label} 编辑器尚未实现`
  return (
    <>
      <div className="outliner data-outliner">
        {tabBar}
        <div className="insp-empty" style={{ padding: 20 }}>
          {unavailable}
        </div>
      </div>
      <div className="center actor-center">
        <div className="insp-empty" style={{ padding: 40 }}>
          {unavailable}
        </div>
      </div>
      <div className="inspector">
        <div className="insp-empty">{unavailable}</div>
      </div>
    </>
  )
}
