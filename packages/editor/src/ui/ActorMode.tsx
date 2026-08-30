/**
 * 角色工作区：角色本身是主对象，外观、战斗、成长与关系是并列维度。
 * 行走图只在“外观资源”子页展开，不再占据默认主画布。
 */

import type {
  ActorDef,
  AssetCatalogV1,
  AssetId,
  BattlerSounds,
  BattlerSpec,
  BattleSpriteDef,
  ItemDataMap,
  LevelUpSkill,
  Locale,
  SkillDataMap,
  SpriteDef,
} from '@type-pal/content'
import { lookupText } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { memo, type ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import type { ActorReference } from '../core/actor-references.js'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import {
  AddActorCommand,
  AddBattleSpriteCommand,
  CompositeCommand,
  CopyActorCommand,
  DeleteActorCommand,
  SetActorBattleSpriteCommand,
  UpdateActorCommand,
  UpdateLocaleCommand,
} from '../core/commands.js'
import type { EditorState, EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  type EditorDerivedStore,
  effectiveEditorDerivedStatus,
} from '../core/editor-derived-store.js'
import type { ScriptEditSession } from '../core/script-editor.js'
import { BattleSpriteInlinePreview } from './BattleSpriteInlinePreview.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import { battleSpriteSemanticGroup } from './battle-sprite-action-preview.js'
import { CasualtyEditor } from './CasualtyEditor.js'
import {
  DsButton,
  DsControlGroup,
  DsDraftNumberField,
  DsDraftTextInput,
  DsField,
  DsIconButton,
  DsListHeader,
  DsOverflowText,
  DsSelect,
  DsTabs,
  DsTag,
  DsTextInput,
} from './design-system/controls.js'
import {
  DsActionGroup,
  DsCatalogRow,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsNumberFieldGrid,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsRepeatRow,
  DsWorkbenchSection,
} from './design-system/recipes.js'
import {
  DsReorderCollection,
  type DsReorderIntent,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  useDsReorderKeys,
} from './design-system/reorder.js'
import { ACTOR_WORKSPACE_SECTIONS, type ActorWorkspaceSection } from './editor-navigation.js'
import { ImageAssetPicker, ImageAssetThumbnail } from './ImageAssetPicker.js'
import { LevelCurveEditor } from './LevelCurveEditor.js'
import { LevelingEditor } from './LevelingEditor.js'
import { PortraitEditor } from './PortraitEditor.js'
import { SoundPicker } from './SoundPicker.js'
import { SpriteFrames } from './SpriteFrames.js'
import { useEditorDerivedSnapshotAfterPaint } from './session-selector.js'

type ActorInspectorTab = 'summary' | 'references'

const SLOT_LABEL: Record<string, string> = {
  weapon: '武器',
  head: '头',
  body: '身',
  cloak: '披',
  feet: '足',
  accessory: '饰',
}

const BATTLER_SOUND_FIELDS: readonly { key: keyof BattlerSounds; label: string }[] = [
  { key: 'attack', label: '普攻出招' },
  { key: 'critical', label: '暴击出招' },
  { key: 'weapon', label: '兵器命中' },
  { key: 'magic', label: '施法吟唱' },
  { key: 'cover', label: '替挡 / 格挡' },
  { key: 'dying', label: '濒死' },
  { key: 'death', label: '阵亡' },
]

const SECTION_LABEL: Record<ActorWorkspaceSection, string> = {
  overview: '总览',
  battle: '战斗与成长',
  relationships: '关系与脚本',
  appearance: '外观资源',
}

function actorSection(value: string | undefined): ActorWorkspaceSection {
  return ACTOR_WORKSPACE_SECTIONS.includes(value as ActorWorkspaceSection)
    ? (value as ActorWorkspaceSection)
    : 'overview'
}

function worldSpriteLayoutDescription(sprite: SpriteDef): string {
  if (sprite.layout.kind === 'directional') return `4 向 × ${sprite.layout.framesPerDir} 帧`
  if (sprite.layout.kind === 'loop') return `循环 ${sprite.layout.frameCount} 帧`
  return '静态精灵'
}

function ActorAvatar(props: {
  actor: ActorDef
  catalog: AssetCatalogV1
  reader: EditorAssetReader
  placement: 'catalog' | 'hero'
}) {
  const { actor, catalog, reader, placement } = props
  const faceRecord = actor.face ? catalog.assets[actor.face] : undefined
  return (
    <span
      className={
        placement === 'catalog'
          ? actor.face
            ? 'actor-avatar actor-avatar--catalog actor-avatar--face'
            : 'actor-avatar actor-avatar--catalog actor-avatar--fallback'
          : actor.face
            ? 'actor-avatar actor-avatar--hero actor-avatar--face'
            : 'actor-avatar actor-avatar--hero actor-avatar--fallback'
      }
      aria-hidden="true"
    >
      {actor.face ? (
        <ImageAssetThumbnail
          asset={actor.face}
          kind="face"
          reader={reader}
          revision={faceRecord?.kind === 'face' ? faceRecord.sha256 : undefined}
          className="actor-avatar__image"
        />
      ) : actor.battler ? (
        '🧑'
      ) : (
        '👤'
      )}
    </span>
  )
}

export function ActorMode(props: {
  actors: ActorDef[]
  sprites: SpriteDef[]
  battleSprites: readonly BattleSpriteDef[]
  items: ItemDataMap
  skills: SkillDataMap
  locale: Locale
  assetBase: AssetBase
  session: EditSession
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  levelUp: Record<string, LevelUpSkill[]>
  navigation?: React.ReactNode
  focusActorId?: string
  focusSection?: string
  onActorFocus?: (id: string) => void
  onSectionChange?: (section: ActorWorkspaceSection) => void
  onOpenSprite?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenActorReference?: (reference: ActorReference) => void
  derivedStore: EditorDerivedStore
  scriptSession: ScriptEditSession
  getCurrentAuthorState: () => EditorState | undefined
}) {
  const {
    actors,
    sprites,
    battleSprites,
    items,
    skills,
    locale,
    assetBase,
    session,
    assetCatalog,
    assetReader,
    levelUp,
    navigation,
    focusActorId,
    focusSection,
    onActorFocus,
    onSectionChange,
    onOpenSprite,
    onOpenBattleSprite,
    onOpenSound,
    onOpenImage,
    onOpenActorReference,
    derivedStore,
    scriptSession,
    getCurrentAuthorState,
  } = props
  const [selId, setSelId] = useState(focusActorId ?? actors[0]?.id ?? '')
  const [section, setSection] = useState<ActorWorkspaceSection>(() => actorSection(focusSection))
  const [centerEditor, setCenterEditor] = useState<'curve' | 'casualty' | null>(null)
  const [actorDraft, setActorDraft] = useState<
    | { mode: 'create'; id: string; displayName: string; spriteId: string }
    | {
        mode: 'copy'
        sourceActorId: string
        id: string
        displayName: string
        spriteId: string
      }
    | undefined
  >()
  const [mutationError, setMutationError] = useState('')
  const spriteById = useMemo(() => new Map(sprites.map((sprite) => [sprite.id, sprite])), [sprites])
  const actor = actors.find((candidate) => candidate.id === selId)
  const sprite = actor ? spriteById.get(actor.spriteId) : undefined
  const battler = actor?.battler

  useEffect(() => {
    if (focusActorId !== undefined) {
      setSelId(focusActorId)
      setCenterEditor(null)
    }
  }, [focusActorId])

  useEffect(() => {
    setSection(actorSection(focusSection))
    setCenterEditor(null)
  }, [focusSection])

  useEffect(() => {
    if (actors.some((candidate) => candidate.id === selId)) return
    const fallback = actors[0]?.id ?? ''
    setSelId(fallback)
    if (fallback) onActorFocus?.(fallback)
  }, [actors, onActorFocus, selId])

  const nm = (id: string): string => {
    const text = lookupText(id, locale)
    return text === id ? id : text
  }

  const openSection = (next: ActorWorkspaceSection): void => {
    setSection(next)
    setCenterEditor(null)
    onSectionChange?.(next)
  }

  const beginCreate = (): void => {
    setMutationError('')
    setActorDraft({ mode: 'create', id: '', displayName: '', spriteId: sprites[0]?.id ?? '' })
  }

  const beginCopy = (): void => {
    if (!actor) return
    setMutationError('')
    setActorDraft({
      mode: 'copy',
      sourceActorId: actor.id,
      id: `${actor.id}-copy`,
      displayName: `${nm(actor.name)} 副本`,
      spriteId: actor.spriteId,
    })
  }

  const submitActorDraft = (): void => {
    if (!actorDraft) return
    const id = actorDraft.id.trim()
    const displayName = actorDraft.displayName.trim()
    if (!id || !displayName || !actorDraft.spriteId) {
      setMutationError('人物 ID、显示名称和默认精灵都必须填写。')
      return
    }
    const nameId = `name.${id}`
    try {
      const command =
        actorDraft.mode === 'copy'
          ? new CompositeCommand('复制人物', [
              new UpdateLocaleCommand(nameId, displayName),
              new CopyActorCommand(actorDraft.sourceActorId, id, nameId),
            ])
          : new CompositeCommand('创建人物', [
              new UpdateLocaleCommand(nameId, displayName),
              new AddActorCommand({ id, name: nameId, spriteId: actorDraft.spriteId }),
            ])
      if (!session.dispatch(command)) return
      setMutationError('')
      setActorDraft(undefined)
      setSelId(id)
      setCenterEditor(null)
      onActorFocus?.(id)
    } catch (error) {
      setMutationError(error instanceof Error ? error.message : String(error))
    }
  }

  const selectedActorId = actor?.id
  const setStat = useCallback(
    (key: keyof BattlerSpec['baseStats'], value: number): void => {
      if (!Number.isFinite(value)) return
      const current = session
        .getState()
        .actors.find((candidate) => candidate.id === selectedActorId)
      if (!current?.battler) return
      const baseStats = { ...current.battler.baseStats, [key]: value }
      session.dispatch(
        new UpdateActorCommand(current.id, {
          battler: { ...current.battler, baseStats },
        }),
      )
    },
    [selectedActorId, session],
  )
  const setInitialMagic = useCallback(
    (initialMagic: string[]): void => {
      const current = session
        .getState()
        .actors.find((candidate) => candidate.id === selectedActorId)
      if (!current?.battler) return
      session.dispatch(
        new UpdateActorCommand(current.id, {
          battler: { ...current.battler, initialMagic },
        }),
      )
    },
    [selectedActorId, session],
  )
  const setBattlerSound = useCallback(
    (key: keyof BattlerSounds, value: AssetId | undefined): void => {
      const current = session
        .getState()
        .actors.find((candidate) => candidate.id === selectedActorId)
      if (!current?.battler) return
      const sounds = { ...current.battler.sounds, [key]: value }
      if (value === undefined) delete sounds[key]
      session.dispatch(
        new UpdateActorCommand(current.id, {
          battler: {
            ...current.battler,
            sounds: Object.keys(sounds).length ? sounds : undefined,
          },
        }),
      )
    },
    [selectedActorId, session],
  )
  const battlerSoundHandlers = useMemo(
    () =>
      Object.fromEntries(
        BATTLER_SOUND_FIELDS.map(({ key }) => [
          key,
          (value: AssetId | undefined) => setBattlerSound(key, value),
        ]),
      ) as Record<keyof BattlerSounds, (value: AssetId | undefined) => void>,
    [setBattlerSound],
  )
  const setBattleSprite = useCallback(
    (id: string) => {
      if (selectedActorId) session.dispatch(new SetActorBattleSpriteCommand(selectedActorId, id))
    },
    [selectedActorId, session],
  )
  const openLevelCurve = useCallback(() => setCenterEditor('curve'), [])

  const relationshipSummary = battler
    ? [
        battler.coveredBy
          ? `援护：${nm(actors.find((it) => it.id === battler.coveredBy)?.name ?? battler.coveredBy)}`
          : '无援护者',
        battler.cooperativeMagicSkillId
          ? `合体技：${skills[battler.cooperativeMagicSkillId]?.name ?? battler.cooperativeMagicSkillId}`
          : '无合体技',
      ]
    : []

  return (
    <>
      <div className="outliner outliner--split">
        {navigation}
        <DsListHeader
          title="角色"
          count={actors.length}
          unit="位"
          actions={[
            { id: 'create-actor', label: '新建人物', icon: 'add', onClick: beginCreate },
            {
              id: 'copy-actor',
              label: '复制当前人物',
              icon: 'copy',
              disabled: !actor,
              onClick: beginCopy,
            },
          ]}
        />
        {actorDraft ? (
          <div
            className="actor-create-panel"
            aria-label={actorDraft.mode === 'copy' ? '复制人物' : '新建人物'}
          >
            <strong>{actorDraft.mode === 'copy' ? '复制人物' : '新建人物'}</strong>
            <DsField label="人物 ID">
              {(field) => (
                <DsTextInput
                  {...field}
                  monospace
                  aria-label="新人物 ID"
                  value={actorDraft.id}
                  onChange={(event) => setActorDraft({ ...actorDraft, id: event.target.value })}
                />
              )}
            </DsField>
            <DsField label="显示名称">
              {(field) => (
                <DsTextInput
                  {...field}
                  aria-label="新人物显示名称"
                  value={actorDraft.displayName}
                  onChange={(event) =>
                    setActorDraft({ ...actorDraft, displayName: event.target.value })
                  }
                />
              )}
            </DsField>
            {actorDraft.mode === 'create' ? (
              <DsField label="默认精灵">
                {(field) => (
                  <DsSelect
                    {...field}
                    aria-label="新人物默认精灵"
                    value={actorDraft.spriteId}
                    onValueChange={(spriteId) => setActorDraft({ ...actorDraft, spriteId })}
                    options={sprites.map((candidate) => ({
                      value: candidate.id,
                      label: `${candidate.label || candidate.id} (${candidate.id})`,
                    }))}
                  />
                )}
              </DsField>
            ) : null}
            {!sprites.length ? <span className="hint">请先在资源库创建大世界精灵。</span> : null}
            <div className="actor-create-actions">
              <DsButton variant="primary" disabled={!sprites.length} onClick={submitActorDraft}>
                {actorDraft.mode === 'copy' ? '复制' : '创建'}
              </DsButton>
              <DsButton variant="secondary" onClick={() => setActorDraft(undefined)}>
                取消
              </DsButton>
            </div>
          </div>
        ) : null}
        {mutationError ? (
          <div className="actor-mutation-error" role="alert">
            {mutationError}
          </div>
        ) : null}
        <div className="actor-list">
          {actors.map((candidate) => (
            <DsCatalogRow
              key={candidate.id}
              selected={candidate.id === selId}
              leading={
                <ActorAvatar
                  actor={candidate}
                  catalog={assetCatalog}
                  reader={assetReader}
                  placement="catalog"
                />
              }
              title={nm(candidate.name)}
              meta={<span translate="no">{candidate.id}</span>}
              trailing={
                <DsTag tone={candidate.battler ? 'accent' : 'neutral'}>
                  {candidate.battler ? '可入队' : 'NPC'}
                </DsTag>
              }
              onClick={() => {
                setSelId(candidate.id)
                setCenterEditor(null)
                onActorFocus?.(candidate.id)
              }}
            />
          ))}
        </div>
      </div>

      <main className="center actor-center actor-workspace">
        {centerEditor === 'casualty' && actor?.battler ? (
          <CasualtyEditor
            key={actor.id}
            actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
            session={session}
            locale={locale}
            onClose={() => setCenterEditor(null)}
          />
        ) : centerEditor === 'curve' && actor?.battler ? (
          <LevelCurveEditor
            key={actor.id}
            actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
            levelUpRows={levelUp[actor.id] ?? []}
            skills={skills}
            session={session}
            onClose={() => setCenterEditor(null)}
          />
        ) : actor ? (
          <>
            <DsObjectHero
              media={
                <ActorAvatar
                  actor={actor}
                  catalog={assetCatalog}
                  reader={assetReader}
                  placement="hero"
                />
              }
              eyebrow={battler ? '可入队角色' : '剧情角色 / NPC'}
              title={nm(actor.name)}
              objectId={actor.id}
              summary={
                battler
                  ? '战斗、成长、队伍关系与视觉资源的统一角色定义。'
                  : '剧情中可复用的角色定义与视觉资源集合。'
              }
              meta={
                <>
                  <DsTag tone={battler ? 'accent' : 'neutral'}>
                    {battler ? '可参战' : '非战斗角色'}
                  </DsTag>
                  <DsTag tone="neutral" monospace translate="no">
                    {actor.spriteId}
                  </DsTag>
                </>
              }
              actions={
                <ActorDeleteButton
                  actorId={actor.id}
                  session={session}
                  scriptSession={scriptSession}
                  derivedStore={derivedStore}
                  getCurrentAuthorState={getCurrentAuthorState}
                  onError={setMutationError}
                  onDeleted={(fallback) => {
                    setMutationError('')
                    setSelId(fallback)
                    onActorFocus?.(fallback)
                  }}
                />
              }
            />

            <DsTabs
              label="角色编辑分区"
              items={ACTOR_WORKSPACE_SECTIONS.map((candidate) => ({
                id: candidate,
                label: SECTION_LABEL[candidate],
              }))}
              activeId={section}
              onChange={(id) => openSection(actorSection(id))}
            />

            <div className="actor-workspace-scroll">
              {section === 'overview' ? (
                <div className="actor-dashboard-grid" aria-label="角色总览">
                  <ActorPanel
                    className="actor-card-identity"
                    eyebrow="身份"
                    title="角色定义"
                    description="管理角色名称、稳定标识与类型。"
                  >
                    <dl className="actor-definition-list">
                      <div>
                        <dt>显示名称</dt>
                        <dd>
                          <DsDraftTextInput
                            size="compact"
                            aria-label="人物显示名称"
                            draftKey={`actor:${actor.id}:name`}
                            syncToken={session.getHistoryVersion()}
                            value={nm(actor.name)}
                            validate={(value) =>
                              value.trim() ? undefined : '人物显示名称不能为空。'
                            }
                            onCommit={(value) =>
                              session.dispatch(new UpdateLocaleCommand(actor.name, value.trim()))
                            }
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>文本 ID</dt>
                        <dd translate="no">{actor.name}</dd>
                      </div>
                      <div>
                        <dt>角色 ID</dt>
                        <dd translate="no">{actor.id}</dd>
                      </div>
                      <div>
                        <dt>类型</dt>
                        <dd>{battler ? '可入队 / 可参战' : 'NPC / 剧情角色'}</dd>
                      </div>
                    </dl>
                  </ActorPanel>

                  <ActorPanel
                    eyebrow="外观"
                    title="视觉资产"
                    description="汇总角色在大世界、对话、菜单与战斗中的视觉资源。"
                    actions={
                      <DsButton
                        size="compact"
                        variant="secondary"
                        onClick={() => openSection('appearance')}
                      >
                        编辑外观
                      </DsButton>
                    }
                  >
                    <div className="actor-summary-lines">
                      <span>
                        大世界精灵<strong>{sprite?.label ?? actor.spriteId}</strong>
                      </span>
                      <span>
                        对话立绘
                        <strong>
                          {actor.portraits
                            ? `${1 + Object.keys(actor.portraits.expressions ?? {}).length} 张`
                            : '未配置'}
                        </strong>
                      </span>
                      <span>
                        菜单头像<strong>{actor.face ? '已配置' : '未配置'}</strong>
                      </span>
                      {battler ? (
                        <span>
                          战斗形象<strong>{battler.battleSprite}</strong>
                        </span>
                      ) : null}
                    </div>
                  </ActorPanel>

                  {battler ? (
                    <>
                      <ActorPanel
                        className="actor-card-wide"
                        eyebrow="战斗"
                        title="基础能力"
                        description="当前角色的核心战斗数值摘要。"
                        actions={
                          <DsButton
                            size="compact"
                            variant="secondary"
                            onClick={() => openSection('battle')}
                          >
                            编辑战斗与成长
                          </DsButton>
                        }
                      >
                        <div className="actor-stat-summary">
                          <SummaryStat label="等级" value={battler.baseStats.level} />
                          <SummaryStat
                            label="当前 / 最大体力"
                            value={`${battler.baseStats.hp} / ${battler.baseStats.maxHP}`}
                          />
                          <SummaryStat
                            label="当前 / 最大真气"
                            value={`${battler.baseStats.mp} / ${battler.baseStats.maxMP}`}
                          />
                          <SummaryStat label="武术" value={battler.baseStats.attack} />
                          <SummaryStat label="防御" value={battler.baseStats.defense} />
                          <SummaryStat label="灵力" value={battler.baseStats.magicAttack} />
                          <SummaryStat label="身法" value={battler.baseStats.speed} />
                          <SummaryStat label="吉运" value={battler.baseStats.luck} />
                        </div>
                      </ActorPanel>

                      <ActorPanel
                        eyebrow="成长"
                        title="升级与初始配置"
                        description="查看经验曲线、升级习得、初始装备与初始仙术。"
                        actions={
                          <DsButton
                            size="compact"
                            variant="secondary"
                            onClick={() => openSection('battle')}
                          >
                            管理成长
                          </DsButton>
                        }
                      >
                        <div className="actor-summary-lines">
                          <span>
                            经验曲线
                            <strong>
                              {battler.leveling?.expTable.length
                                ? `${battler.leveling.expTable.length} 级`
                                : '未配置'}
                            </strong>
                          </span>
                          <span>
                            升级习得<strong>{levelUp[actor.id]?.length ?? 0} 项</strong>
                          </span>
                          <span>
                            初始装备
                            <strong>{Object.keys(battler.initialEquipment).length} 件</strong>
                          </span>
                          <span>
                            初始仙术<strong>{battler.initialMagic.length} 项</strong>
                          </span>
                        </div>
                      </ActorPanel>

                      <ActorPanel
                        eyebrow="关系"
                        title="队伍关系与脚本"
                        description="查看援护、合体技与伤亡反应脚本。"
                        actions={
                          <DsButton
                            size="compact"
                            variant="secondary"
                            onClick={() => openSection('relationships')}
                          >
                            编辑关系
                          </DsButton>
                        }
                      >
                        <div className="actor-summary-lines">
                          {relationshipSummary.map((line) => (
                            <span key={line}>{line}</span>
                          ))}
                          <span>
                            队友阵亡脚本
                            <strong>{battler.casualty?.friendDeath ? '已配置' : '未配置'}</strong>
                          </span>
                          <span>
                            濒死脚本<strong>{battler.casualty?.dying ? '已配置' : '未配置'}</strong>
                          </span>
                        </div>
                      </ActorPanel>
                    </>
                  ) : (
                    <ActorPanel
                      className="actor-card-wide actor-card-empty"
                      eyebrow="角色能力"
                      title="这是一个非战斗角色"
                    >
                      <p>它仍可用于场景实例、对话立绘和剧情演出；当前没有队伍、战斗或成长数据。</p>
                    </ActorPanel>
                  )}
                </div>
              ) : null}

              {section === 'battle' ? (
                battler ? (
                  <div className="actor-detail-grid">
                    <ActorBaseStatsPanel
                      actorId={actor.id}
                      baseStats={battler.baseStats}
                      syncToken={session.getHistoryVersion()}
                      onStat={setStat}
                    />

                    <ActorBattleAppearancePanel
                      actorId={actor.id}
                      actorLabel={nm(actor.name)}
                      battleSprite={battler.battleSprite}
                      definitions={battleSprites}
                      assetBase={assetBase}
                      assetReader={assetReader}
                      session={session}
                      onChange={setBattleSprite}
                      onOpenDefinition={onOpenBattleSprite}
                    />

                    <ActorInitialSetupPanel
                      actorId={actor.id}
                      equipment={battler.initialEquipment}
                      magic={battler.initialMagic}
                      items={items}
                      skills={skills}
                      syncToken={session.getHistoryVersion()}
                      onMagicChange={setInitialMagic}
                    />

                    <ActorPanel
                      className="actor-card-wide"
                      eyebrow="成长"
                      title="升级曲线与习得技能"
                      description="管理经验曲线、等级上限与各等级自动习得的技能。"
                    >
                      <LevelingEditor
                        actor={actor as ActorDef & { battler: NonNullable<ActorDef['battler']> }}
                        levelUpRows={levelUp[actor.id] ?? []}
                        skills={skills}
                        session={session}
                        onEditCurve={openLevelCurve}
                      />
                    </ActorPanel>

                    <ActorSoundPanel
                      sounds={battler.sounds}
                      handlers={battlerSoundHandlers}
                      catalog={assetCatalog}
                      reader={assetReader}
                      onOpenAsset={onOpenSound}
                    />
                  </div>
                ) : (
                  <ActorNonBattler onOverview={() => openSection('overview')} />
                )
              ) : null}

              {section === 'relationships' ? (
                battler ? (
                  <div className="actor-detail-grid actor-relationship-grid">
                    <ActorPanel
                      eyebrow="队伍"
                      title="援护关系"
                      description="指定该角色濒死或失能时承担援护的队友。"
                    >
                      <DsField label="援护者">
                        {(field) => (
                          <DsSelect
                            {...field}
                            value={battler.coveredBy ?? ''}
                            onValueChange={(coveredBy) =>
                              session.dispatch(
                                new UpdateActorCommand(actor.id, {
                                  battler: {
                                    ...battler,
                                    coveredBy: coveredBy || undefined,
                                  },
                                }),
                              )
                            }
                            options={[
                              { value: '', label: '（无）' },
                              ...actors
                                .filter((candidate) => candidate.battler)
                                .map((candidate) => ({
                                  value: candidate.id,
                                  label: `${nm(candidate.name)} (${candidate.id})`,
                                })),
                            ]}
                          />
                        )}
                      </DsField>
                    </ActorPanel>

                    <ActorPanel
                      eyebrow="队伍"
                      title="合体技"
                      description="配置角色在战斗中发起合击时使用的专属技能。"
                    >
                      <DsField label="角色专属合体技">
                        {(field) => (
                          <DsSelect
                            {...field}
                            value={battler.cooperativeMagicSkillId ?? ''}
                            onValueChange={(cooperativeMagicSkillId) =>
                              session.dispatch(
                                new UpdateActorCommand(actor.id, {
                                  battler: {
                                    ...battler,
                                    cooperativeMagicSkillId: cooperativeMagicSkillId || undefined,
                                  },
                                }),
                              )
                            }
                            options={[
                              { value: '', label: '（无）' },
                              ...Object.entries(skills).map(([id, skill]) => ({
                                value: id,
                                label: `${skill.name} (${id})`,
                              })),
                            ]}
                          />
                        )}
                      </DsField>
                    </ActorPanel>

                    <ActorPanel
                      className="actor-card-wide"
                      eyebrow="脚本"
                      title="伤亡反应"
                      description="配置队友阵亡与角色自身濒死时执行的剧情脚本。"
                      actions={
                        <DsButton
                          size="compact"
                          variant="secondary"
                          onClick={() => setCenterEditor('casualty')}
                        >
                          编辑伤亡脚本
                        </DsButton>
                      }
                    >
                      <div className="actor-casualty-grid">
                        {(['friendDeath', 'dying'] as const).map((slot) => (
                          <div className="actor-casualty-slot" key={slot}>
                            <span>{slot === 'friendDeath' ? '队友阵亡' : '自己濒死'}</span>
                            <strong>{battler.casualty?.[slot] ? '已配置' : '未配置'}</strong>
                            {battler.casualty?.[slot] ? (
                              <DsButton
                                size="compact"
                                variant="danger"
                                onClick={() => {
                                  const next: NonNullable<BattlerSpec['casualty']> = {
                                    ...(battler.casualty ?? {}),
                                  }
                                  delete next[slot]
                                  session.dispatch(
                                    new UpdateActorCommand(actor.id, {
                                      battler: {
                                        ...battler,
                                        casualty:
                                          next.friendDeath !== undefined || next.dying !== undefined
                                            ? next
                                            : undefined,
                                      },
                                    }),
                                  )
                                }}
                              >
                                移除{slot === 'friendDeath' ? '队友阵亡' : '濒死'}
                              </DsButton>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </ActorPanel>
                  </div>
                ) : (
                  <ActorNonBattler onOverview={() => openSection('overview')} />
                )
              ) : null}

              {section === 'appearance' ? (
                <div className="actor-appearance-layout">
                  <ActorPanel
                    className="actor-frame-card"
                    contentClassName="actor-frame-card__content"
                    eyebrow="大世界"
                    title="行走图与动作帧"
                    description="选择角色使用的行走精灵，并预览方向、站立、行走与命名动作帧。"
                  >
                    <div className="actor-world-sprite-binding">
                      <DsField
                        label="行走精灵"
                        help="这里只更换角色引用；帧、布局与动作请在资源库编辑。"
                      >
                        {(field) => (
                          <DsControlGroup
                            className="actor-world-sprite-binding__control"
                            control={
                              <DsSelect
                                {...field}
                                size="compact"
                                value={actor.spriteId}
                                searchable="auto"
                                onValueChange={(spriteId) =>
                                  session.dispatch(new UpdateActorCommand(actor.id, { spriteId }))
                                }
                                options={[
                                  ...(!sprites.some((candidate) => candidate.id === actor.spriteId)
                                    ? [
                                        {
                                          value: actor.spriteId,
                                          label: actor.spriteId,
                                          description: '当前引用缺失',
                                        },
                                      ]
                                    : []),
                                  ...sprites.map((candidate) => ({
                                    value: candidate.id,
                                    label: candidate.label || candidate.id,
                                    description: `${candidate.id} · ${worldSpriteLayoutDescription(candidate)}`,
                                    title: `${candidate.label || candidate.id} · ${candidate.id} · ${worldSpriteLayoutDescription(candidate)}`,
                                  })),
                                ]}
                              />
                            }
                            actions={
                              <DsButton
                                size="compact"
                                variant="secondary"
                                icon="open"
                                disabled={!sprite || !onOpenSprite}
                                onClick={() => onOpenSprite?.(actor.spriteId)}
                              >
                                在资源库编辑
                              </DsButton>
                            }
                          />
                        )}
                      </DsField>
                    </div>
                    {sprite ? (
                      <SpriteFrames
                        key={sprite.id}
                        sprite={sprite}
                        assetBase={assetBase}
                        assetReader={assetReader}
                      />
                    ) : (
                      <div className="actor-resource-empty">
                        精灵“{actor.spriteId}”不在注册表中，请前往资源库修复引用。
                      </div>
                    )}
                  </ActorPanel>

                  <div className="actor-appearance-side">
                    <PortraitEditor
                      actor={actor}
                      session={session}
                      catalog={assetCatalog}
                      reader={assetReader}
                      onOpenAsset={onOpenImage}
                    />
                    <ActorPanel
                      eyebrow="菜单 / 战斗"
                      title="小头像"
                      description="选择角色在菜单和战斗界面中使用的小头像。"
                    >
                      <ImageAssetPicker
                        value={actor.face}
                        kind="face"
                        catalog={assetCatalog}
                        reader={assetReader}
                        allowUnset
                        ariaLabel="菜单和战斗小头像"
                        onOpenAsset={onOpenImage}
                        onChange={(face) =>
                          session.dispatch(new UpdateActorCommand(actor.id, { face }))
                        }
                      />
                    </ActorPanel>
                  </div>
                </div>
              ) : null}
            </div>
          </>
        ) : (
          <div className="insp-empty actor-workspace-empty">无角色</div>
        )}
      </main>

      <ActorInspector
        actor={actor}
        sprite={sprite}
        displayName={actor ? nm(actor.name) : '未选择'}
        session={session}
        scriptSession={scriptSession}
        derivedStore={derivedStore}
        onOpenSprite={onOpenSprite}
        onOpenActorReference={onOpenActorReference}
      />
    </>
  )
}

function useActorReferenceState(
  actorId: string | undefined,
  session: EditSession,
  scriptSession: ScriptEditSession,
  derivedStore: EditorDerivedStore,
) {
  const snapshot = useEditorDerivedSnapshotAfterPaint(derivedStore)
  const data =
    snapshot.status === 'current'
      ? snapshot.data
      : snapshot.status === 'stale' || snapshot.status === 'failed'
        ? snapshot.lastKnown?.data
        : undefined
  const references = actorId
    ? (data?.actorReferenceIndex.find(([id]) => id === actorId)?.[1] ?? [])
    : []
  const status = effectiveEditorDerivedStatus(snapshot, {
    mainHistoryVersion: session.getHistoryVersion(),
    scriptHistoryVersion: scriptSession.getHistoryVersion(),
  })
  return { references, status }
}

function ActorDeleteButton(props: {
  actorId: string
  session: EditSession
  scriptSession: ScriptEditSession
  derivedStore: EditorDerivedStore
  getCurrentAuthorState: () => EditorState | undefined
  onError: (message: string) => void
  onDeleted: (fallbackActorId: string) => void
}) {
  const { references, status } = useActorReferenceState(
    props.actorId,
    props.session,
    props.scriptSession,
    props.derivedStore,
  )
  return (
    <DsButton
      variant="danger"
      icon="delete"
      disabled={status !== 'current' || references.length > 0}
      title={
        status !== 'current'
          ? '人物引用仍在检查，暂不能删除'
          : references.length
            ? `仍有 ${references.length} 处引用，请先从右侧处理`
            : '删除人物'
      }
      onClick={() => {
        if (status !== 'current') {
          props.onError('人物引用仍在检查，暂不能删除。')
          return
        }
        try {
          if (
            !props.session.dispatch(
              new DeleteActorCommand(props.actorId, props.getCurrentAuthorState),
            )
          )
            return
          props.onDeleted(props.session.getState().actors[0]?.id ?? '')
        } catch (error) {
          props.onError(error instanceof Error ? error.message : String(error))
        }
      }}
    >
      删除人物
    </DsButton>
  )
}

function ActorInspector(props: {
  actor: ActorDef | undefined
  sprite: SpriteDef | undefined
  displayName: string
  session: EditSession
  scriptSession: ScriptEditSession
  derivedStore: EditorDerivedStore
  onOpenSprite?: (id: string) => void
  onOpenActorReference?: (reference: ActorReference) => void
}) {
  const [activeTab, setActiveTab] = useState<ActorInspectorTab>('summary')
  const { references, status } = useActorReferenceState(
    props.actor?.id,
    props.session,
    props.scriptSession,
    props.derivedStore,
  )
  const actor = props.actor
  const battler = actor?.battler
  const referenceCount =
    status === 'current'
      ? { kind: 'exact' as const, value: references.length }
      : references.length
        ? { kind: 'at-least' as const, value: references.length }
        : { kind: 'unknown' as const }
  const referencePanelState =
    status === 'current'
      ? references.length
        ? ('ready' as const)
        : ('empty' as const)
      : status === 'failed'
        ? ('error' as const)
        : status === 'stale'
          ? ('partial' as const)
          : ('loading' as const)

  return (
    <DsInspectorHost as="aside" className="inspector inspector--tabbed actor-summary-panel">
      <div className="insp-head actor-summary-head">
        <div className="what">角色</div>
        <div className="who">{props.displayName}</div>
        {actor ? <code translate="no">{actor.id}</code> : null}
      </div>
      {actor ? (
        <DsInspectorTabs
          id="actor-inspector"
          label="角色检查器"
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as ActorInspectorTab)}
          items={[
            {
              id: 'summary',
              label: '摘要',
              panel: (
                <>
                  <DsInspectorSection title="身份与资源">
                    <DsPropertyGrid>
                      <DsPropertyRow label="类型">
                        {battler ? '可入队 / 可参战' : 'NPC / 剧情角色'}
                      </DsPropertyRow>
                      <DsPropertyRow label="名称 ID">
                        <DsOverflowText as="code" className="ds-inspector-readonly" translate="no">
                          {actor.name}
                        </DsOverflowText>
                      </DsPropertyRow>
                      <DsPropertyRow label="大世界精灵">
                        <span className="actor-inspector-linked-value">
                          <span>{props.sprite?.label ?? actor.spriteId}</span>
                          <DsIconButton
                            size="compact"
                            variant="secondary"
                            icon="open"
                            label={`在资源库打开精灵 ${actor.spriteId}`}
                            onClick={() => props.onOpenSprite?.(actor.spriteId)}
                          />
                        </span>
                      </DsPropertyRow>
                    </DsPropertyGrid>
                  </DsInspectorSection>

                  {battler ? (
                    <DsInspectorSection title="当前摘要">
                      <DsPropertyGrid>
                        <DsPropertyRow label="等级">{battler.baseStats.level}</DsPropertyRow>
                        <DsPropertyRow label="当前 / 最大体力">
                          {battler.baseStats.hp} / {battler.baseStats.maxHP}
                        </DsPropertyRow>
                        <DsPropertyRow label="当前 / 最大真气">
                          {battler.baseStats.mp} / {battler.baseStats.maxMP}
                        </DsPropertyRow>
                        <DsPropertyRow label="装备 / 仙术">
                          {Object.keys(battler.initialEquipment).length} /{' '}
                          {battler.initialMagic.length}
                        </DsPropertyRow>
                        <DsPropertyRow label="立绘 / 表情">
                          {actor.portraits
                            ? 1 + Object.keys(actor.portraits.expressions ?? {}).length
                            : 0}
                        </DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  ) : null}
                </>
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <section className="section actor-reference-section">
                  <DsReferencePanel
                    state={referencePanelState}
                    count={referenceCount}
                    impact={{
                      kind: 'blocking',
                      description: references.length
                        ? '解除外部引用后才能删除人物。'
                        : '删除人物不会回收共享精灵、立绘或 locale 文本。',
                    }}
                  >
                    {references.length ? (
                      <DsReferenceList>
                        {references.map((reference) => (
                          <DsReferenceRow
                            key={`${reference.kind}:${reference.where}`}
                            title={reference.label}
                            detail={reference.detail}
                            path={reference.where}
                            action={
                              reference.locator && props.onOpenActorReference
                                ? {
                                    label: '打开',
                                    onActivate: () => props.onOpenActorReference?.(reference),
                                  }
                                : undefined
                            }
                            status={
                              reference.locator && props.onOpenActorReference
                                ? undefined
                                : {
                                    label: '暂不可定位',
                                    reason:
                                      reference.unavailableReason ?? '当前没有可编辑的精确位置。',
                                    tone: 'warning',
                                  }
                            }
                          />
                        ))}
                      </DsReferenceList>
                    ) : null}
                  </DsReferencePanel>
                </section>
              ),
            },
          ]}
        />
      ) : (
        <div className="insp-empty">无角色</div>
      )}
    </DsInspectorHost>
  )
}

function SummaryStat(props: { label: string; value: number | string }) {
  return (
    <div className="actor-summary-stat">
      <span>{props.label}</span>
      <strong>{props.value}</strong>
    </div>
  )
}

const BASE_STAT_FIELDS: readonly {
  key: keyof BattlerSpec['baseStats']
  label: string
}[] = [
  { key: 'level', label: '等级' },
  { key: 'hp', label: '当前体力' },
  { key: 'maxHP', label: '最大体力' },
  { key: 'mp', label: '当前真气' },
  { key: 'maxMP', label: '最大真气' },
  { key: 'attack', label: '武术' },
  { key: 'defense', label: '防御' },
  { key: 'magicAttack', label: '灵力' },
  { key: 'speed', label: '身法' },
  { key: 'luck', label: '吉运' },
]

const ActorBaseStatsPanel = memo(function ActorBaseStatsPanel(props: {
  actorId: string
  baseStats: BattlerSpec['baseStats']
  syncToken: number
  onStat: (key: keyof BattlerSpec['baseStats'], value: number) => void
}) {
  return (
    <ActorPanel
      className="actor-card-wide"
      eyebrow="战斗"
      title="基础能力"
      description="编辑角色的当前/最大体力与真气基线，以及等级和基础属性。"
    >
      <DsNumberFieldGrid className="actor-stat-editor">
        {BASE_STAT_FIELDS.map(({ key, label }) => (
          <ActorStatField
            key={key}
            actorId={props.actorId}
            statKey={key}
            syncToken={props.syncToken}
            label={label}
            value={props.baseStats[key]}
            onStat={props.onStat}
          />
        ))}
      </DsNumberFieldGrid>
    </ActorPanel>
  )
})

const ActorStatField = memo(
  function ActorStatField(props: {
    actorId: string
    statKey: keyof BattlerSpec['baseStats']
    syncToken: number
    label: string
    value: number
    onStat: (key: keyof BattlerSpec['baseStats'], value: number) => void
  }) {
    return (
      <DsDraftNumberField
        label={props.label}
        fieldClassName="actor-stat-field"
        size="compact"
        monospace
        name={`actor-${props.label}`}
        autoComplete="off"
        aria-label={props.label}
        draftKey={`actor:${props.actorId}:baseStats.${props.statKey}`}
        syncToken={props.syncToken}
        value={props.value}
        min={0}
        integer
        normalize={Math.floor}
        onCommit={(value) => value !== undefined && props.onStat(props.statKey, value)}
      />
    )
  },
  (left, right) =>
    left.actorId === right.actorId &&
    left.statKey === right.statKey &&
    left.label === right.label &&
    left.value === right.value &&
    left.onStat === right.onStat,
)

const ActorBattleAppearancePanel = memo(function ActorBattleAppearancePanel(props: {
  actorId: string
  actorLabel: string
  battleSprite?: string
  definitions: readonly BattleSpriteDef[]
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  onChange: (id: string) => void
  onOpenDefinition?: (id: string) => void
}) {
  const [uploadOpen, setUploadOpen] = useState(false)
  const selectedDefinition = props.definitions.find(
    (definition) =>
      definition.id === props.battleSprite && definition.profile.kind === 'player-fighter',
  )
  return (
    <ActorPanel
      eyebrow="表现"
      title="战斗形象"
      description="选择角色战斗精灵并预览全部战斗动作与组成帧，或上传新的帧带定义。"
      actions={
        <DsButton
          size="compact"
          variant="secondary"
          title="导入一组战斗帧，并立即设为当前角色的战斗形象"
          onClick={() => setUploadOpen((value) => !value)}
        >
          {uploadOpen ? '收起导入' : '导入战斗形象'}
        </DsButton>
      }
    >
      <BattleSpritePicker
        value={props.battleSprite}
        definitions={props.definitions}
        kind="player-fighter"
        onChange={props.onChange}
        onOpenDefinition={props.onOpenDefinition}
        ariaLabel="角色战斗精灵"
      />
      <div className="actor-battle-appearance-preview">
        {selectedDefinition ? (
          <BattleSpriteInlinePreview
            key={selectedDefinition.id}
            definition={selectedDefinition}
            expected="player-fighter"
            assetBase={props.assetBase}
            assetReader={props.assetReader}
            semanticGroups={[battleSpriteSemanticGroup(selectedDefinition, 0, true)]}
            semanticPresentation="embedded"
            showPrimaryPreview={false}
          />
        ) : (
          <p className="actor-battle-appearance-preview__empty">
            选择有效的我方战斗精灵后，这里会显示全部战斗动作与组成帧。
          </p>
        )}
      </div>
      {uploadOpen ? (
        <BattleSpriteUploader
          assetBase={props.assetBase}
          onApply={async (bytes, frameCount) => {
            const prepared = await prepareBattleSpriteImport(props.session.getState(), {
              hint: props.actorId,
              label: `${props.actorLabel} 战斗精灵`,
              kind: 'player-fighter',
              bytes,
              frameCount,
              reader: props.assetReader,
            })
            props.session.dispatch(
              new CompositeCommand('上传并设置角色战斗精灵', [
                new AddBattleSpriteCommand(
                  prepared.definition,
                  prepared.record,
                  prepared.bytes,
                  prepared.frameCount,
                ),
                new SetActorBattleSpriteCommand(props.actorId, prepared.definition.id),
              ]),
            )
            setUploadOpen(false)
          }}
          onCancel={() => setUploadOpen(false)}
        />
      ) : null}
    </ActorPanel>
  )
})

function sameStringRecord(left: object | undefined, right: object | undefined): boolean {
  if (left === right) return true
  const leftEntries = Object.entries(left ?? {})
  const rightEntries = Object.entries(right ?? {})
  return (
    leftEntries.length === rightEntries.length &&
    leftEntries.every(
      ([key, value]) => (right as Record<string, unknown> | undefined)?.[key] === value,
    )
  )
}

const ActorInitialSetupPanel = memo(
  function ActorInitialSetupPanel(props: {
    actorId: string
    equipment: BattlerSpec['initialEquipment']
    magic: string[]
    items: ItemDataMap
    skills: SkillDataMap
    syncToken: number
    onMagicChange: (value: string[]) => void
  }) {
    const equipmentLabels = useMemo(
      () =>
        Object.entries(props.equipment).map(
          ([slot, itemId]) =>
            `${props.items[itemId]?.name ?? itemId} · ${SLOT_LABEL[slot] ?? slot}`,
        ),
      [props.equipment, props.items],
    )
    return (
      <ActorPanel
        eyebrow="配置"
        title="初始装备与仙术"
        description="角色首次加入队伍时，运行时会从这里深拷贝出厂仙术。"
      >
        <SummaryChips label="初始装备" values={equipmentLabels} />
        <InitialMagicEditor
          actorId={props.actorId}
          value={props.magic}
          skills={props.skills}
          syncToken={props.syncToken}
          onChange={props.onMagicChange}
        />
      </ActorPanel>
    )
  },
  (left, right) =>
    left.actorId === right.actorId &&
    sameStringRecord(left.equipment, right.equipment) &&
    left.magic.length === right.magic.length &&
    left.magic.every((value, index) => value === right.magic[index]) &&
    left.items === right.items &&
    left.skills === right.skills &&
    left.syncToken === right.syncToken &&
    left.onMagicChange === right.onMagicChange,
)

const ActorSoundPanel = memo(
  function ActorSoundPanel(props: {
    sounds?: BattlerSounds
    handlers: Record<keyof BattlerSounds, (value: AssetId | undefined) => void>
    catalog: AssetCatalogV1
    reader: EditorAssetReader
    onOpenAsset?: (id: string) => void
  }) {
    return (
      <ActorPanel
        className="actor-card-wide"
        eyebrow="声音"
        title="战斗音效"
        description="配置普攻、施法、受击、濒死与阵亡等战斗反馈音效。"
      >
        <div className="actor-sound-grid">
          {BATTLER_SOUND_FIELDS.map(({ key, label }) => (
            <DsField label={label} key={key}>
              {(field) => (
                <SoundPicker
                  id={field.id}
                  value={props.sounds?.[key]}
                  onChange={props.handlers[key]}
                  catalog={props.catalog}
                  reader={props.reader}
                  allowUnset
                  ariaLabel={`${label}音效`}
                  onOpenAsset={props.onOpenAsset}
                />
              )}
            </DsField>
          ))}
        </div>
      </ActorPanel>
    )
  },
  (left, right) =>
    sameStringRecord(left.sounds, right.sounds) &&
    left.handlers === right.handlers &&
    left.catalog === right.catalog &&
    left.reader === right.reader &&
    left.onOpenAsset === right.onOpenAsset,
)

const InitialMagicEditor = memo(
  function InitialMagicEditor(props: {
    actorId: string
    value: string[]
    skills: SkillDataMap
    syncToken: number
    onChange: (value: string[]) => void
  }) {
    const reorderKeys = useDsReorderKeys(props.value)
    const skillIds = useMemo(() => Object.keys(props.skills), [props.skills])
    const valueKey = props.value.join('\0')
    const addableSkillIds = useMemo(
      () => skillIds.filter((skillId) => !props.value.includes(skillId)),
      // UpdateActorCommand clones battler arrays; the semantic key avoids rebuilding unchanged rows.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [skillIds, valueKey],
    )
    const rowOptions = useMemo(
      () =>
        props.value.map((skillId, index) => [
          ...(!props.skills[skillId] ? [{ value: skillId, label: `${skillId}（缺失）` }] : []),
          ...skillIds
            .filter(
              (candidate) =>
                candidate === skillId ||
                !props.value.some(
                  (existing, existingIndex) => existingIndex !== index && existing === candidate,
                ),
            )
            .map((candidate) => ({
              value: candidate,
              label: props.skills[candidate]?.name ?? candidate,
              description: candidate,
            })),
        ]),
      // See valueKey above; identical cloned arrays intentionally reuse the option collections.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [props.skills, skillIds, valueKey],
    )
    const reorderMagic = (intent: DsReorderIntent): boolean => {
      const next = reorderDsItems(props.value, intent)
      if (next === props.value) return false
      reorderKeys.move(intent)
      props.onChange([...next])
      return true
    }
    return (
      <div className="actor-initial-magic-editor">
        <span className="field-label">初始仙术</span>
        <DsReorderCollection
          adoptionId="actor/initial-magic"
          scopeKey={`actor:${props.actorId}:initial-magic`}
          entries={props.value.map((skillId, index) => ({
            key: reorderKeys.keys[index]!,
            label: props.skills[skillId]?.name ?? skillId,
          }))}
          revision={props.syncToken}
          onReorder={reorderMagic}
        >
          {props.value.map((skillId, index) => {
            const reorderKey = reorderKeys.keys[index]!
            const label = props.skills[skillId]?.name ?? skillId
            return (
              <DsReorderItem itemKey={reorderKey} key={reorderKey}>
                <DsRepeatRow density="compact" className="actor-initial-magic-row">
                  <DsSelect
                    aria-label={`第 ${index + 1} 项初始仙术`}
                    value={skillId}
                    options={rowOptions[index] ?? []}
                    onValueChange={(next) =>
                      props.onChange(
                        props.value.map((existing, existingIndex) =>
                          existingIndex === index ? next : existing,
                        ),
                      )
                    }
                  />
                  <DsActionGroup density="compact" className="actor-initial-magic-actions">
                    <DsReorderMoveButton
                      itemKey={reorderKey}
                      direction="backward"
                      label={`上移 ${label}`}
                    />
                    <DsReorderMoveButton
                      itemKey={reorderKey}
                      direction="forward"
                      label={`下移 ${label}`}
                    />
                    <DsButton
                      variant="secondary"
                      onClick={() =>
                        props.onChange(props.value.filter((_, itemIndex) => itemIndex !== index))
                      }
                    >
                      移除
                    </DsButton>
                  </DsActionGroup>
                </DsRepeatRow>
              </DsReorderItem>
            )
          })}
        </DsReorderCollection>
        {props.value.length === 0 ? <span className="hint">未配置初始仙术。</span> : null}
        <DsButton
          data-ds-add-picker-deferred="actor/initial-magic-append-default"
          size="compact"
          variant="secondary"
          disabled={addableSkillIds.length === 0}
          onClick={() => {
            const skillId = addableSkillIds[0]
            if (skillId) props.onChange([...props.value, skillId])
          }}
        >
          ＋ 添加初始仙术
        </DsButton>
      </div>
    )
  },
  (left, right) =>
    left.actorId === right.actorId &&
    left.skills === right.skills &&
    left.syncToken === right.syncToken &&
    left.onChange === right.onChange &&
    left.value.length === right.value.length &&
    left.value.every((value, index) => value === right.value[index]),
)

function ActorPanel(props: {
  eyebrow?: ReactNode
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <DsWorkbenchSection
      eyebrow={props.eyebrow}
      title={props.title}
      description={props.description}
      actions={props.actions}
      className={['actor-card', props.className].filter(Boolean).join(' ')}
      contentClassName={props.contentClassName}
    >
      {props.children}
    </DsWorkbenchSection>
  )
}

function SummaryChips(props: { label: string; values: string[] }) {
  return (
    <div className="actor-summary-chip-group">
      <span>{props.label}</span>
      <div className="chips">
        {props.values.length ? (
          props.values.map((value, index) => (
            <span className="chip2" key={`${value}-${index}`}>
              {value}
            </span>
          ))
        ) : (
          <span className="hint">（无）</span>
        )}
      </div>
    </div>
  )
}

function ActorNonBattler(props: { onOverview: () => void }) {
  return (
    <ActorPanel
      className="actor-card-empty actor-non-battler"
      eyebrow="非战斗角色"
      title="当前角色没有战斗数据"
    >
      <p>战斗、成长、援护与伤亡脚本只适用于可入队角色。</p>
      <DsButton variant="secondary" onClick={props.onOverview}>
        返回角色总览
      </DsButton>
    </ActorPanel>
  )
}
