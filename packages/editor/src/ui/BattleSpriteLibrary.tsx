import type {
  AssetCatalogV1,
  AssetRecordV1,
  BattleSpriteDef,
  BattleSpriteDefinitionReference,
  BattleSpriteProfile,
  BattleSpriteProfileKind,
  PlayerFighterFrames,
} from '@type-pal/content'
import { collectBattleSpriteDefinitionReferences } from '@type-pal/content'
import {
  type AssetBase,
  compressGzip,
  decodeBattleSpriteAssetBytes,
  encodeSpriteChunk,
  quantizeToRleFrame,
  type RleFrame,
  sliceAtlasGrid,
} from '@type-pal/reforge'
import {
  type DragEvent as ReactDragEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  defaultBattleSpriteProfile,
  prepareBattleSpriteImport,
} from '../core/battle-sprite-import.js'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddBattleSpriteCommand,
  type BattleSpriteReplacementProof,
  DeleteUnusedBattleSpriteAssetCommand,
  RemoveBattleSpriteDefinitionCommand,
  ReplaceBattleSpriteAssetCommand,
  UpdateBattleSpriteDefinitionCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import {
  BattleSpriteInlinePreview,
  type BattleSpritePreviewProof,
  type BattleSpriteResourceSnapshot,
} from './BattleSpriteInlinePreview.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import {
  DsButton,
  DsCatalogControls,
  DsCatalogRow,
  DsFileInput,
  DsFieldGroup,
  DsInspectorHost,
  DsInspectorSection,
  DsInspectorTabs,
  DsNumberInput,
  DsObjectHero,
  DsPropertyGrid,
  DsPropertyRow,
  DsRangeInput,
  DsReferenceList,
  DsReferencePanel,
  DsReferenceRow,
  DsSelect,
  DsSelectField,
  DsSequenceIndex,
  DsTabs,
  DsTag,
  DsTextInput,
  DsTextField,
  DsVirtualList,
  DsPressable,
} from './design-system/index.js'
import { type SemanticFrameGroup, SpriteFrameCanvas } from './SpriteFrameWorkbench.js'

const PROFILE_LABEL: Record<BattleSpriteProfileKind, string> = {
  'player-fighter': '玩家战斗',
  enemy: '敌人',
  summon: '召唤现身',
}

const RAW_FRAME_MIME = 'application/x-type-pal-battle-raw-frame'
const RAW_FRAME_TEXT_PREFIX = 'type-pal-battle-raw-frame:'

type InspectorTab = 'actions' | 'references' | 'source'
type KindFilter = BattleSpriteProfileKind | 'all' | 'unconfigured'

interface PlayerActionSpec {
  key: string
  label: string
  slots: readonly { key: keyof PlayerFighterFrames; label: string; optional?: boolean }[]
  returnToIdle?: boolean
  frameMs: number
  timing?: string
}

interface NamedAction {
  key: string
  label: string
  frames: number[]
  frameMs: number
  timing?: string
}

const PLAYER_ACTIONS: readonly PlayerActionSpec[] = [
  { key: 'idle', label: '待机', slots: [{ key: 'idle', label: '姿势' }], frameMs: 200 },
  {
    key: 'attack',
    label: '普通攻击',
    slots: [
      { key: 'attackWindup', label: '蓄力' },
      { key: 'attackRush', label: '冲刺' },
      { key: 'attackStrike', label: '命中' },
    ],
    returnToIdle: true,
    frameMs: 140,
    timing: '姿势序列；实战还包含冲刺、位移与命中特效',
  },
  {
    key: 'cast',
    label: '施法',
    slots: [
      { key: 'preMagic', label: '施法前' },
      { key: 'magic', label: '释放' },
    ],
    returnToIdle: true,
    frameMs: 180,
    timing: '姿势序列；实战节奏由具体技能与特效决定',
  },
  { key: 'defend', label: '防御', slots: [{ key: 'defend', label: '姿势' }], frameMs: 200 },
  {
    key: 'hurt',
    label: '受伤',
    slots: [{ key: 'hurt', label: '姿势' }],
    returnToIdle: true,
    frameMs: 160,
  },
  { key: 'dying', label: '濒死', slots: [{ key: 'dying', label: '姿势' }], frameMs: 200 },
  { key: 'dead', label: '死亡', slots: [{ key: 'dead', label: '姿势' }], frameMs: 200 },
  {
    key: 'steal',
    label: '偷窃',
    slots: [{ key: 'steal', label: '偷窃动作', optional: true }],
    returnToIdle: true,
    frameMs: 160,
    timing: '专属姿势；实战还包含冲刺与敌方闪白',
  },
]

function actionsForProfile(
  profile: BattleSpriteProfile | undefined,
  actualFrameCount: number,
): NamedAction[] {
  const actions: NamedAction[] = []
  if (profile?.kind === 'player-fighter') {
    for (const spec of PLAYER_ACTIONS) {
      const slotFrames = spec.slots
        .map((slot) => profile.frames[slot.key])
        .filter((frame): frame is number => frame !== undefined)
      actions.push({
        key: spec.key,
        label: spec.label,
        frames:
          slotFrames.length && spec.returnToIdle
            ? [...slotFrames, profile.frames.idle]
            : slotFrames,
        frameMs: spec.frameMs,
        timing: spec.timing,
      })
    }
  } else if (profile?.kind === 'enemy') {
    for (const [label, section] of [
      ['待机', profile.idle],
      ['施法', profile.magic],
      ['攻击', profile.attack],
    ] as const) {
      const frames =
        section.count === 0
          ? []
          : label !== '待机' && profile.actTicksPerFrame === 0
            ? [section.start + section.count - 1]
            : label === '攻击'
              ? Array.from({ length: section.count + 1 }, (_, index) => section.start + index - 1)
              : Array.from({ length: section.count }, (_, index) => section.start + index)
      actions.push({
        key: label,
        label,
        frames,
        frameMs:
          label === '待机'
            ? profile.idleTicksPerFrame * 40
            : Math.max(1, profile.actTicksPerFrame) * 40,
        timing:
          label === '待机'
            ? `${profile.idleTicksPerFrame * 40} 毫秒/帧`
            : profile.actTicksPerFrame === 0
              ? '零时长：直接落到末帧'
              : `${profile.actTicksPerFrame * 40} 毫秒/帧`,
      })
    }
  } else if (profile?.kind === 'summon' && actualFrameCount) {
    actions.push({
      key: 'summon-all',
      label: '召唤现身',
      frames: Array.from({ length: actualFrameCount }, (_, index) => index),
      frameMs: 200,
      timing: '这里只预览帧序；实际播放节奏由技能决定',
    })
  }
  return actions
}

export interface BattleSpriteFrameDeletionPlan {
  repairs: NonNullable<BattleSpriteReplacementProof['repairs']>
  consumerSnapshots: NonNullable<BattleSpriteReplacementProof['consumerSnapshots']>
  changes: string[]
}

function remapDeletedFrame(index: number, deletedIndex: number, nextFrameCount: number): number {
  if (index < deletedIndex) return index
  if (index > deletedIndex) return index - 1
  return Math.min(deletedIndex, nextFrameCount - 1)
}

export function planBattleSpriteFrameDeletion(
  consumers: readonly BattleSpriteDef[],
  deletedIndex: number,
  previousFrameCount: number,
): BattleSpriteFrameDeletionPlan {
  if (!Number.isInteger(deletedIndex) || deletedIndex < 0 || deletedIndex >= previousFrameCount)
    throw new Error('待删除的战斗精灵帧不存在')
  if (previousFrameCount <= 1) throw new Error('战斗精灵至少必须保留 1 帧')
  const nextFrameCount = previousFrameCount - 1
  const repairs: NonNullable<BattleSpriteReplacementProof['repairs']> = {}
  const consumerSnapshots: NonNullable<BattleSpriteReplacementProof['consumerSnapshots']> = {}
  const changes: string[] = []
  for (const consumer of consumers) {
    consumerSnapshots[consumer.id] = { profile: structuredClone(consumer.profile) }
    const profile = consumer.profile
    if (profile.kind === 'player-fighter') {
      const map = (index: number): number => remapDeletedFrame(index, deletedIndex, nextFrameCount)
      const frames: PlayerFighterFrames = {
        idle: map(profile.frames.idle),
        dying: map(profile.frames.dying),
        dead: map(profile.frames.dead),
        defend: map(profile.frames.defend),
        hurt: map(profile.frames.hurt),
        preMagic: map(profile.frames.preMagic),
        magic: map(profile.frames.magic),
        attackWindup: map(profile.frames.attackWindup),
        attackRush: map(profile.frames.attackRush),
        attackStrike: map(profile.frames.attackStrike),
        ...(profile.frames.steal === undefined ? {} : { steal: map(profile.frames.steal) }),
      }
      repairs[consumer.id] = { profile: { ...profile, frames } }
      const affected = Object.entries(profile.frames)
        .filter(([, frame]) => frame === deletedIndex || frame > deletedIndex)
        .map(([key]) => key)
      if (affected.length) changes.push(`${consumer.label}：重排 ${affected.length} 个动作槽位`)
    } else if (profile.kind === 'enemy') {
      let idleCount = profile.idle.count
      let magicCount = profile.magic.count
      let attackCount = profile.attack.count
      const magicEnd = idleCount + magicCount
      const attackEnd = magicEnd + attackCount
      if (deletedIndex < idleCount) {
        if (idleCount > 1) idleCount--
        else if (magicCount > 0) magicCount--
        else if (attackCount > 0) attackCount--
      } else if (deletedIndex < magicEnd) magicCount--
      else if (deletedIndex < attackEnd) attackCount--
      const nextProfile: BattleSpriteProfile = {
        ...profile,
        idle: { start: 0, count: idleCount },
        magic: { start: idleCount, count: magicCount },
        attack: { start: idleCount + magicCount, count: attackCount },
      }
      repairs[consumer.id] = { profile: nextProfile }
      if (
        idleCount !== profile.idle.count ||
        magicCount !== profile.magic.count ||
        attackCount !== profile.attack.count
      )
        changes.push(
          `${consumer.label}：动作分段 ${profile.idle.count}/${profile.magic.count}/${profile.attack.count} → ${idleCount}/${magicCount}/${attackCount}`,
        )
    } else repairs[consumer.id] = { profile: structuredClone(profile) }
  }
  return { repairs, consumerSnapshots, changes }
}

async function imageFileToRgba(file: File): Promise<{ rgba: Uint8Array; w: number; h: number }> {
  const bitmap = await createImageBitmap(file)
  const canvas = document.createElement('canvas')
  canvas.width = bitmap.width
  canvas.height = bitmap.height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('2d context 不可用')
  context.drawImage(bitmap, 0, 0)
  bitmap.close()
  const image = context.getImageData(0, 0, canvas.width, canvas.height)
  return {
    rgba: new Uint8Array(image.data.buffer.slice(0)),
    w: canvas.width,
    h: canvas.height,
  }
}

function referenceLabel(reference: BattleSpriteDefinitionReference): string {
  const [kind, id, detail] = reference.site.split(':')
  const kindLabel: Record<string, string> = {
    actor: '角色',
    enemy: '敌人',
    item: '物品',
    skill: '技能',
    scene: '场景',
    script: '剧情脚本',
    world: '开局',
  }
  return `${kindLabel[kind ?? ''] ?? '内容'} ${id ?? reference.site}${detail ? ` · ${detail}` : ''}`
}

function definitionIdStem(value: string): string {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'battle-sprite'
  )
}

function NumberField(props: {
  label: string
  value: number | undefined
  min?: number
  optional?: boolean
  onChange: (value: number | undefined) => void
}) {
  const id = useId()
  return (
    <DsPropertyRow label={props.label} labelFor={id}>
      <DsNumberInput
        id={id}
        size="compact"
        min={props.min ?? 0}
        value={props.value ?? ''}
        placeholder={props.optional ? '无' : undefined}
        onWheel={(event) => event.currentTarget.blur()}
        onChange={(event) =>
          props.onChange(
            event.target.value === '' && props.optional
              ? undefined
              : Math.floor(event.target.valueAsNumber || 0),
          )
        }
      />
    </DsPropertyRow>
  )
}

function RangeProperty(props: {
  label: string
  min: number
  max: number
  value: number
  onChange: (value: number) => void
}) {
  const id = useId()
  return (
    <DsPropertyRow label={props.label} labelFor={id}>
      <DsRangeInput
        id={id}
        min={props.min}
        max={props.max}
        value={props.value}
        onChange={(event) => props.onChange(Number(event.target.value))}
      />
    </DsPropertyRow>
  )
}

function ProfileEditor(props: {
  profile: BattleSpriteProfile
  actualFrameCount: number
  onChange: (profile: BattleSpriteProfile) => void
}) {
  const profile = props.profile
  if (profile.kind === 'summon')
    return <p className="hint2">召唤现身按源帧顺序播放；速度、染色和声音由引用它的技能设置。</p>
  if (profile.kind === 'player-fighter')
    return (
      <div className="battle-profile-advanced">
        <DsPropertyGrid>
          <NumberField
            label="施法特效基帧"
            value={profile.castEffectBase}
            onChange={(castEffectBase) =>
              props.onChange({ ...profile, castEffectBase: castEffectBase ?? 0 })
            }
          />
          <NumberField
            label="攻击特效基帧"
            value={profile.attackEffectBase}
            onChange={(attackEffectBase) =>
              props.onChange({ ...profile, attackEffectBase: attackEffectBase ?? 0 })
            }
          />
        </DsPropertyGrid>
      </div>
    )

  const total = Math.max(
    1,
    props.actualFrameCount || profile.idle.count + profile.magic.count + profile.attack.count,
  )
  const idleEnd = Math.min(total, Math.max(1, profile.idle.count))
  const magicEnd = Math.min(total, Math.max(idleEnd, profile.magic.start + profile.magic.count))
  const setBoundaries = (nextIdleEnd: number, nextMagicEnd: number): void => {
    const idleBoundary = Math.min(total, Math.max(1, nextIdleEnd))
    const magicBoundary = Math.min(total, Math.max(idleBoundary, nextMagicEnd))
    props.onChange({
      ...profile,
      idle: { start: 0, count: idleBoundary },
      magic: { start: idleBoundary, count: magicBoundary - idleBoundary },
      attack: { start: magicBoundary, count: total - magicBoundary },
    })
  }
  return (
    <div className="battle-enemy-profile-editor">
      <section className="battle-enemy-timeline" aria-label="敌人动作分段">
        <span>
          待机 #{profile.idle.start}–{idleEnd - 1}
        </span>
        {profile.magic.count ? (
          <span>
            施法 #{profile.magic.start}–{magicEnd - 1}
          </span>
        ) : null}
        {profile.attack.count ? (
          <span>
            攻击 #{profile.attack.start}–{total - 1}
          </span>
        ) : null}
      </section>
      <DsPropertyGrid>
        <RangeProperty
          label={`待机结束：#${idleEnd - 1}`}
          min={1}
          max={total}
          value={idleEnd}
          onChange={(value) => setBoundaries(value, magicEnd)}
        />
        <RangeProperty
          label={`施法结束：${magicEnd === idleEnd ? '无施法段' : `#${magicEnd - 1}`}`}
          min={idleEnd}
          max={total}
          value={magicEnd}
          onChange={(value) => setBoundaries(idleEnd, value)}
        />
        <NumberField
          label="待机毫秒/帧"
          value={profile.idleTicksPerFrame * 40}
          min={40}
          onChange={(milliseconds) =>
            props.onChange({
              ...profile,
              idleTicksPerFrame: Math.max(1, Math.round((milliseconds ?? 40) / 40)),
            })
          }
        />
        <NumberField
          label="行动毫秒/帧"
          value={profile.actTicksPerFrame * 40}
          onChange={(milliseconds) =>
            props.onChange({
              ...profile,
              actTicksPerFrame: Math.max(0, Math.round((milliseconds ?? 0) / 40)),
            })
          }
        />
      </DsPropertyGrid>
    </div>
  )
}

export function BattleSpriteLibrary(props: {
  definitions: readonly BattleSpriteDef[]
  catalog: AssetCatalogV1
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  tabBar: ReactNode
  focusObjectId?: string
  view: 'definition' | 'asset'
  onViewChange: (view: 'definition' | 'asset', objectId?: string) => void
  onObjectFocus?: (id: string | undefined) => void
  onWorldDomain: () => void
  onJumpReference?: (reference: BattleSpriteDefinitionReference) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}) {
  const assets = useMemo(
    () =>
      Object.entries(props.catalog.assets)
        .filter(([, record]) => record.kind === 'battle-sprite')
        .sort(([left], [right]) => left.localeCompare(right)),
    [props.catalog],
  )
  const definitionsByAsset = useMemo(() => {
    const result = new Map<string, BattleSpriteDef[]>()
    for (const definition of props.definitions)
      result.set(definition.asset, [...(result.get(definition.asset) ?? []), definition])
    return result
  }, [props.definitions])
  const initialDefinition =
    props.view === 'definition'
      ? (props.definitions.find((entry) => entry.id === props.focusObjectId) ??
        props.definitions[0])
      : undefined
  const initialAsset =
    props.view === 'asset' &&
    props.catalog.assets[props.focusObjectId ?? '']?.kind === 'battle-sprite'
      ? (props.focusObjectId ?? '')
      : (initialDefinition?.asset ?? assets[0]?.[0] ?? '')
  const [selectedAsset, setSelectedAsset] = useState(initialAsset)
  const [selectedId, setSelectedId] = useState(
    initialDefinition?.id ?? definitionsByAsset.get(initialAsset)?.[0]?.id ?? '',
  )
  const [filter, setFilter] = useState('')
  const [kind, setKind] = useState<KindFilter>('all')
  const [uploading, setUploading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [uploadKind, setUploadKind] = useState<BattleSpriteProfileKind>('player-fighter')
  const [uploadId, setUploadId] = useState('authored')
  const [uploadLabel, setUploadLabel] = useState('新战斗精灵')
  const [previewProof, setPreviewProof] = useState<BattleSpritePreviewProof | undefined>()
  const [resourceSnapshot, setResourceSnapshot] = useState<
    BattleSpriteResourceSnapshot | undefined
  >()
  const [rawEditorBusy, setRawEditorBusy] = useState(false)
  const [rawEditorMessage, setRawEditorMessage] = useState('')
  const [rawEditorMessageKind, setRawEditorMessageKind] = useState<'info' | 'error'>('info')
  const [rawAppendDraft, setRawAppendDraft] = useState<{
    rgba: Uint8Array
    w: number
    h: number
    cols: number
    rows: number
  }>()
  const rawReplaceIndex = useRef(0)
  const rawReplaceFileRef = useRef<HTMLInputElement>(null)
  const rawAppendFileRef = useRef<HTMLInputElement>(null)
  const [draftLabel, setDraftLabel] = useState('')
  const [draftProfile, setDraftProfile] = useState<BattleSpriteProfile | undefined>()
  const [draftDefinitionId, setDraftDefinitionId] = useState<string>()
  const [creatingUsage, setCreatingUsage] = useState(false)
  const [showUsageMenu, setShowUsageMenu] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>()
  const [selectedPlayerSlot, setSelectedPlayerSlot] = useState<keyof PlayerFighterFrames>()
  const [dragOverPlayerSlot, setDragOverPlayerSlot] = useState<keyof PlayerFighterFrames>()
  const [selectedRawFrame, setSelectedRawFrame] = useState(0)
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>(
    props.view === 'asset' ? 'source' : 'actions',
  )

  const consumers = definitionsByAsset.get(selectedAsset) ?? []
  const definition = consumers.find((entry) => entry.id === selectedId) ?? consumers[0]
  const record = props.catalog.assets[selectedAsset]
  const allReferences = collectBattleSpriteDefinitionReferences(props.session.getState())
  const references = definition
    ? allReferences.filter((reference) => reference.battleSprite === definition.id)
    : []
  const proofReady =
    record?.kind === 'battle-sprite' &&
    previewProof?.asset === selectedAsset &&
    previewProof.sha256 === record.sha256
  const actualFrameCount = proofReady ? previewProof.actualFrameCount : 0

  useEffect(() => {
    const objectId = props.focusObjectId
    if (!objectId) return
    if (props.view === 'definition') {
      const focusedDefinition = props.definitions.find((entry) => entry.id === objectId)
      if (!focusedDefinition) return
      setSelectedAsset(focusedDefinition.asset)
      setSelectedId(focusedDefinition.id)
      setInspectorTab('actions')
    } else if (props.catalog.assets[objectId]?.kind === 'battle-sprite') {
      setSelectedAsset(objectId)
      setSelectedId(definitionsByAsset.get(objectId)?.[0]?.id ?? '')
      setInspectorTab('source')
    }
    setCreatingUsage(false)
    setUploading(false)
    setReplacing(false)
  }, [definitionsByAsset, props.catalog, props.definitions, props.focusObjectId, props.view])

  useEffect(() => {
    if (record?.kind === 'battle-sprite') return
    const nextAsset = assets[0]?.[0] ?? ''
    if (!nextAsset || nextAsset === selectedAsset) return
    const nextDefinition = definitionsByAsset.get(nextAsset)?.[0]
    setSelectedAsset(nextAsset)
    setSelectedId(nextDefinition?.id ?? '')
    props.onViewChange(nextDefinition ? 'definition' : 'asset', nextDefinition?.id ?? nextAsset)
    props.onObjectFocus?.(nextDefinition?.id ?? nextAsset)
  }, [assets, definitionsByAsset, props.onObjectFocus, props.onViewChange, record, selectedAsset])

  useEffect(() => {
    if (creatingUsage) return
    setDraftDefinitionId(definition?.id)
    setDraftLabel(definition?.label ?? '')
    setDraftProfile(definition ? structuredClone(definition.profile) : undefined)
  }, [creatingUsage, definition])

  useEffect(() => {
    if (creatingUsage || consumers.some((entry) => entry.id === selectedId)) return
    const nextDefinition = consumers[0]
    if (!nextDefinition && !selectedId) return
    setSelectedId(nextDefinition?.id ?? '')
    props.onViewChange(nextDefinition ? 'definition' : 'asset', nextDefinition?.id ?? selectedAsset)
    props.onObjectFocus?.(nextDefinition?.id ?? selectedAsset)
  }, [consumers, creatingUsage, props.onObjectFocus, props.onViewChange, selectedAsset, selectedId])

  // biome-ignore lint/correctness/useExhaustiveDependencies: 切换用途、profile 或资源时必须主动重置动作槽位。
  useEffect(() => {
    setSelectedAction(undefined)
    setSelectedPlayerSlot(undefined)
    setDragOverPlayerSlot(undefined)
  }, [draftDefinitionId, draftProfile?.kind, selectedAsset])

  useEffect(() => {
    void selectedAsset
    setResourceSnapshot(undefined)
    setRawAppendDraft(undefined)
    setRawEditorMessage('')
    setSelectedRawFrame(0)
  }, [selectedAsset])

  const resourceFrameCount = resourceSnapshot?.frames.length
  useEffect(() => {
    if (!resourceFrameCount) return
    setSelectedRawFrame((current) => Math.min(current, resourceFrameCount - 1))
  }, [resourceFrameCount])

  const shownAssets = assets.filter(([asset, assetRecord]) => {
    const entries = definitionsByAsset.get(asset) ?? []
    const matchesKind =
      kind === 'all' ||
      (kind === 'unconfigured'
        ? entries.length === 0
        : entries.some((entry) => entry.profile.kind === kind))
    if (!matchesKind) return false
    const query = filter.trim().toLocaleLowerCase()
    if (!query) return true
    return [
      asset,
      assetRecord.label,
      assetRecord.path,
      ...entries.flatMap((entry) => [entry.id, entry.label]),
    ]
      .filter((value): value is string => !!value)
      .some((value) => value.toLocaleLowerCase().includes(query))
  })

  const reportError = (reason: unknown): void =>
    props.onStatusNotice?.({
      kind: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
    })

  const focusResource = (asset: string): void => {
    const nextDefinition = definitionsByAsset.get(asset)?.[0]
    setSelectedAsset(asset)
    setSelectedId(nextDefinition?.id ?? '')
    setCreatingUsage(false)
    setShowUsageMenu(false)
    setUploading(false)
    setReplacing(false)
    setInspectorTab('actions')
    props.onViewChange(nextDefinition ? 'definition' : 'asset', nextDefinition?.id ?? asset)
    props.onObjectFocus?.(nextDefinition?.id ?? asset)
  }

  const focusDefinition = (next: BattleSpriteDef): void => {
    setSelectedAsset(next.asset)
    setSelectedId(next.id)
    setCreatingUsage(false)
    setShowUsageMenu(false)
    setInspectorTab('actions')
    props.onViewChange('definition', next.id)
    props.onObjectFocus?.(next.id)
  }

  const beginUsage = (profileKind: BattleSpriteProfileKind): void => {
    if (!record || record.kind !== 'battle-sprite' || !proofReady || !actualFrameCount) {
      reportError(new Error('帧源尚未完成解码校验，请稍后再新增用途。'))
      return
    }
    try {
      const base = `${definitionIdStem(record.label ?? selectedAsset)}-${profileKind}`
      const ids = new Set(props.session.getState().battleSprites.map((entry) => entry.id))
      let id = base
      for (let suffix = 2; ids.has(id); suffix++) id = `${base}-${suffix}`
      setDraftDefinitionId(id)
      setDraftLabel(`${record.label ?? selectedAsset} · ${PROFILE_LABEL[profileKind]}`)
      setDraftProfile(defaultBattleSpriteProfile(profileKind, actualFrameCount))
      setCreatingUsage(true)
      setShowUsageMenu(false)
      setInspectorTab('actions')
    } catch (reason) {
      reportError(reason)
    }
  }

  const discardDraft = (): void => {
    setCreatingUsage(false)
    setDraftDefinitionId(definition?.id)
    setDraftLabel(definition?.label ?? '')
    setDraftProfile(definition ? structuredClone(definition.profile) : undefined)
    setShowUsageMenu(false)
  }

  const applyDefinitionDraft = async (): Promise<void> => {
    if (
      !record ||
      record.kind !== 'battle-sprite' ||
      !draftDefinitionId ||
      !draftLabel.trim() ||
      !draftProfile ||
      !proofReady ||
      !previewProof
    ) {
      reportError(new Error('战斗精灵尚未完成当前帧源的解码校验，不能应用修改。'))
      return
    }
    try {
      if (creatingUsage) {
        const nextDefinition: BattleSpriteDef = {
          id: draftDefinitionId,
          label: draftLabel.trim(),
          asset: selectedAsset,
          profile: structuredClone(draftProfile),
        }
        const bytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
        props.session.dispatch(
          new AddBattleSpriteCommand(nextDefinition, record, bytes, previewProof.actualFrameCount),
        )
        setCreatingUsage(false)
        setSelectedId(nextDefinition.id)
        props.onViewChange('definition', nextDefinition.id)
        props.onObjectFocus?.(nextDefinition.id)
      } else if (definition && draftDefinitionId === definition.id) {
        const profileChanged = JSON.stringify(draftProfile) !== JSON.stringify(definition.profile)
        if (
          profileChanged &&
          references.length > 1 &&
          !window.confirm(
            `当前用途被 ${references.length} 处内容引用，修改动作会同时影响这些引用。继续吗？`,
          )
        )
          return
        props.session.dispatch(
          new UpdateBattleSpriteDefinitionCommand(
            definition.id,
            { label: draftLabel.trim(), profile: draftProfile },
            {
              asset: selectedAsset,
              sha256: previewProof.sha256,
              actualFrameCount: previewProof.actualFrameCount,
            },
          ),
        )
      }
      props.onStatusNotice?.(undefined)
    } catch (reason) {
      reportError(reason)
    }
  }

  const deleteDefinition = (): void => {
    if (!definition || references.length || creatingUsage) return
    if (!window.confirm(`删除用途“${definition.label}”？源文件会保留。`)) return
    try {
      props.session.dispatch(new RemoveBattleSpriteDefinitionCommand(definition.id))
      const nextDefinition = consumers.find((entry) => entry.id !== definition.id)
      setSelectedId(nextDefinition?.id ?? '')
      setInspectorTab(nextDefinition ? 'actions' : 'source')
      props.onViewChange(
        nextDefinition ? 'definition' : 'asset',
        nextDefinition?.id ?? selectedAsset,
      )
      props.onObjectFocus?.(nextDefinition?.id ?? selectedAsset)
    } catch (reason) {
      reportError(reason)
    }
  }

  const deleteAsset = async (): Promise<void> => {
    if (!record || record.kind !== 'battle-sprite' || consumers.length) return
    if (!window.confirm(`永久移除未使用帧源“${record.label ?? selectedAsset}”？`)) return
    try {
      const bytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
      await decodeBattleSpriteAssetBytes(record, bytes, `删除前校验 ${selectedAsset}`)
      props.session.dispatch(new DeleteUnusedBattleSpriteAssetCommand(selectedAsset, bytes))
      const next = assets.find(([asset]) => asset !== selectedAsset)?.[0] ?? ''
      const nextDefinition = definitionsByAsset.get(next)?.[0]
      setSelectedAsset(next)
      setSelectedId(nextDefinition?.id ?? '')
      props.onViewChange(nextDefinition ? 'definition' : 'asset', nextDefinition?.id ?? next)
      props.onObjectFocus?.(nextDefinition?.id ?? next)
    } catch (reason) {
      reportError(reason)
    }
  }

  const replaceAsset = async (bytes: ArrayBuffer, frameCount: number): Promise<void> => {
    if (
      !record ||
      record.kind !== 'battle-sprite' ||
      !consumers.length ||
      !proofReady ||
      !previewProof
    )
      return
    if (frameCount < previewProof.actualFrameCount) {
      reportError(
        new Error(
          `替换文件只有 ${frameCount} 帧，少于当前 ${previewProof.actualFrameCount} 帧；默认禁止缩帧。受影响用途：${consumers.map((entry) => entry.id).join('、')}`,
        ),
      )
      return
    }
    if (!window.confirm(`替换共享帧源会影响 ${consumers.length} 个用途。继续吗？`)) return
    try {
      const sha256 = await sha256Hex(bytes)
      const nextRecord: AssetRecordV1 = {
        ...record,
        path: `assets/authored/battle-sprites/${sha256}.rle`,
        bytes: bytes.byteLength,
        sha256,
        origin: { kind: 'authored' },
      }
      const previousBytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
      await decodeBattleSpriteAssetBytes(record, previousBytes, `替换前校验 ${selectedAsset}`)
      props.session.dispatch(
        new ReplaceBattleSpriteAssetCommand(
          consumers[0]!.id,
          selectedAsset,
          nextRecord,
          bytes,
          previousBytes,
          {
            asset: selectedAsset,
            previousSha256: record.sha256,
            previousFrameCount: previewProof.actualFrameCount,
            nextFrameCount: frameCount,
            consumerIds: consumers.map((entry) => entry.id),
          },
        ),
      )
      setReplacing(false)
    } catch (reason) {
      reportError(reason)
    }
  }

  const reportRawError = (reason: unknown): void => {
    const message = reason instanceof Error ? reason.message : String(reason)
    setRawEditorMessage(message)
    setRawEditorMessageKind('error')
    reportError(reason)
  }

  const commitRawFrames = async (
    frames: RleFrame[],
    label: string,
    deletionPlan?: BattleSpriteFrameDeletionPlan,
  ): Promise<void> => {
    if (!resourceSnapshot || !record || record.kind !== 'battle-sprite') return
    setRawEditorBusy(true)
    setRawEditorMessage('')
    try {
      const currentState = props.session.getState()
      const currentRecord = currentState.assetCatalog.assets[selectedAsset]
      if (!currentRecord || currentRecord.kind !== 'battle-sprite')
        throw new Error('当前战斗精灵源文件已不在 catalog')
      const currentConsumers = currentState.battleSprites.filter(
        (entry) => entry.asset === selectedAsset,
      )
      const gzip = await compressGzip(encodeSpriteChunk(frames))
      const bytes = gzip.buffer.slice(
        gzip.byteOffset,
        gzip.byteOffset + gzip.byteLength,
      ) as ArrayBuffer
      const sha256 = await sha256Hex(bytes)
      const previousBytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
      const nextRecord: AssetRecordV1 = {
        ...currentRecord,
        path: `assets/authored/battle-sprites/${sha256}.rle`,
        bytes: bytes.byteLength,
        sha256,
        origin: { kind: 'authored' },
      }
      const shrinking = frames.length < resourceSnapshot.frames.length
      const proof: BattleSpriteReplacementProof = {
        asset: selectedAsset,
        previousSha256: currentRecord.sha256,
        previousFrameCount: resourceSnapshot.frames.length,
        nextFrameCount: frames.length,
        consumerIds: currentConsumers.map((entry) => entry.id),
        ...(shrinking
          ? {
              repairs: deletionPlan?.repairs ?? {},
              consumerSnapshots: deletionPlan?.consumerSnapshots ?? {},
            }
          : {}),
      }
      props.session.dispatch(
        new ReplaceBattleSpriteAssetCommand(
          currentConsumers[0]?.id,
          selectedAsset,
          nextRecord,
          bytes,
          previousBytes,
          proof,
        ),
      )
      setRawEditorMessage(`${label}；可使用撤销恢复。`)
      setRawEditorMessageKind('info')
      props.onStatusNotice?.({ kind: 'info', message: `${label}；可撤销。` })
    } catch (reason) {
      reportRawError(reason)
    } finally {
      setRawEditorBusy(false)
    }
  }

  const replaceRawFrame = async (file: File, index: number): Promise<void> => {
    if (!resourceSnapshot || index < 0 || index >= resourceSnapshot.frames.length) return
    try {
      const image = await imageFileToRgba(file)
      const replacement = quantizeToRleFrame(image.rgba, image.w, image.h, resourceSnapshot.palette)
      if (
        consumers.length &&
        !window.confirm(`替换原始帧 #${index} 会同时影响 ${consumers.length} 个用途。继续吗？`)
      )
        return
      await commitRawFrames(
        resourceSnapshot.frames.map((frame, frameIndex) =>
          frameIndex === index ? replacement : frame,
        ),
        `替换战斗精灵原始帧 #${index}`,
      )
    } catch (reason) {
      reportRawError(reason)
    }
  }

  const appendRawFrames = async (): Promise<void> => {
    if (!resourceSnapshot || !rawAppendDraft) return
    if (
      rawAppendDraft.w % rawAppendDraft.cols !== 0 ||
      rawAppendDraft.h % rawAppendDraft.rows !== 0
    )
      return
    try {
      const appended = sliceAtlasGrid(
        rawAppendDraft.rgba,
        rawAppendDraft.w,
        rawAppendDraft.h,
        rawAppendDraft.w / rawAppendDraft.cols,
        rawAppendDraft.h / rawAppendDraft.rows,
      ).map((frame) =>
        quantizeToRleFrame(frame.rgba, frame.width, frame.height, resourceSnapshot.palette),
      )
      if (
        consumers.length &&
        !window.confirm(
          `追加 ${appended.length} 帧会更新 ${consumers.length} 个用途共享的原始帧容器。继续吗？`,
        )
      )
        return
      await commitRawFrames(
        [...resourceSnapshot.frames, ...appended],
        `追加战斗精灵原始帧 ×${appended.length}`,
      )
      setRawAppendDraft(undefined)
    } catch (reason) {
      reportRawError(reason)
    }
  }

  const deleteRawFrame = async (index: number): Promise<void> => {
    if (!resourceSnapshot || resourceSnapshot.frames.length <= 1) return
    try {
      const currentConsumers = props.session
        .getState()
        .battleSprites.filter((entry) => entry.asset === selectedAsset)
      const plan = planBattleSpriteFrameDeletion(
        currentConsumers,
        index,
        resourceSnapshot.frames.length,
      )
      const impact = plan.changes.length
        ? `\n\n同步修复：\n${plan.changes.map((change) => `• ${change}`).join('\n')}`
        : ''
      if (
        !window.confirm(
          `删除战斗精灵原始帧 #${index}？后续帧号会前移，动作槽位与分段会在同一次可撤销修改中修复。${impact}`,
        )
      )
        return
      await commitRawFrames(
        resourceSnapshot.frames.filter((_, frameIndex) => frameIndex !== index),
        `删除战斗精灵原始帧 #${index}`,
        plan,
      )
    } catch (reason) {
      reportRawError(reason)
    }
  }

  const draftIsCurrent = creatingUsage || draftDefinitionId === definition?.id
  const actionProfile = draftIsCurrent ? draftProfile : definition?.profile
  const namedActions = actionsForProfile(actionProfile, actualFrameCount)
  const semanticSources: BattleSpriteDef[] = consumers.map((entry) =>
    entry.id === draftDefinitionId && draftProfile
      ? { ...entry, label: draftLabel || entry.label, profile: draftProfile }
      : entry,
  )
  if (creatingUsage && draftDefinitionId && draftProfile)
    semanticSources.push({
      id: draftDefinitionId,
      label: draftLabel || '新用途',
      asset: selectedAsset,
      profile: draftProfile,
    })
  const semanticGroups: SemanticFrameGroup[] = semanticSources.map((entry) => ({
    id: entry.id,
    label: entry.label,
    typeLabel: PROFILE_LABEL[entry.profile.kind],
    active: entry.id === (draftDefinitionId ?? definition?.id),
    rows: actionsForProfile(entry.profile, actualFrameCount).map((action) => ({
      id: `${entry.id}:${action.key}`,
      label: action.label,
      frames: action.frames,
      playbackFrames: action.frames,
      frameMs: action.frameMs,
      note: action.timing,
    })),
  }))
  const effectiveAction = namedActions.some((action) => action.key === selectedAction)
    ? selectedAction
    : namedActions[0]?.key
  const activeAction = namedActions.find((action) => action.key === effectiveAction)
  const activePlayerSpec =
    actionProfile?.kind === 'player-fighter'
      ? PLAYER_ACTIONS.find((action) => action.key === effectiveAction)
      : undefined
  const effectivePlayerSlot =
    activePlayerSpec?.slots.find((slot) => slot.key === selectedPlayerSlot)?.key ??
    activePlayerSpec?.slots[0]?.key
  const assignPlayerStage = (slot: keyof PlayerFighterFrames, frame: number): void => {
    if (actionProfile?.kind !== 'player-fighter') return
    setDraftProfile({
      ...actionProfile,
      frames: { ...actionProfile.frames, [slot]: frame },
    })
    setSelectedPlayerSlot(slot)
  }

  const clearOptionalPlayerStage = (slot: keyof PlayerFighterFrames): void => {
    if (actionProfile?.kind !== 'player-fighter') return
    const frames = { ...actionProfile.frames }
    delete frames[slot]
    setDraftProfile({ ...actionProfile, frames })
  }

  const onPlayerStageDrop = (
    event: ReactDragEvent<HTMLElement>,
    slot: keyof PlayerFighterFrames,
  ): void => {
    event.preventDefault()
    setDragOverPlayerSlot(undefined)
    const typedPayload = event.dataTransfer.getData(RAW_FRAME_MIME)
    const plainPayload = event.dataTransfer.getData('text/plain')
    const rawPayload =
      typedPayload ||
      (plainPayload.startsWith(RAW_FRAME_TEXT_PREFIX)
        ? plainPayload.slice(RAW_FRAME_TEXT_PREFIX.length)
        : '')
    const rawFrame = Number(rawPayload)
    const frameCount = resourceSnapshot?.frames.length ?? actualFrameCount
    if (rawPayload !== '' && Number.isInteger(rawFrame) && rawFrame >= 0 && rawFrame < frameCount)
      assignPlayerStage(slot, rawFrame)
  }

  const draftChanged =
    creatingUsage ||
    (!!definition &&
      (draftLabel !== definition.label ||
        JSON.stringify(draftProfile) !== JSON.stringify(definition.profile)))
  const displayLabel = record?.label ?? definition?.label ?? selectedAsset
  const rawAppendPanel = rawAppendDraft ? (
    <div className="sprite-raw-append-panel">
      <span>
        将 {rawAppendDraft.w}×{rawAppendDraft.h} 图片切为
      </span>
      <label>
        列
        <DsNumberInput
          min={1}
          max={16}
          value={rawAppendDraft.cols}
          onChange={(event) =>
            setRawAppendDraft({
              ...rawAppendDraft,
              cols: Math.max(1, Math.floor(event.target.valueAsNumber) || 1),
            })
          }
        />
      </label>
      <span>×</span>
      <label>
        行
        <DsNumberInput
          min={1}
          max={16}
          value={rawAppendDraft.rows}
          onChange={(event) =>
            setRawAppendDraft({
              ...rawAppendDraft,
              rows: Math.max(1, Math.floor(event.target.valueAsNumber) || 1),
            })
          }
        />
      </label>
      <span className="hint2">
        {rawAppendDraft.w % rawAppendDraft.cols === 0 &&
        rawAppendDraft.h % rawAppendDraft.rows === 0
          ? `${rawAppendDraft.cols * rawAppendDraft.rows} 帧，每帧 ${rawAppendDraft.w / rawAppendDraft.cols}×${rawAppendDraft.h / rawAppendDraft.rows}`
          : '图片宽高必须能被行列整除'}
      </span>
      <span className="spacer" />
      <DsButton onClick={() => setRawAppendDraft(undefined)} size="compact" variant="secondary">
        取消
      </DsButton>
      <DsButton
        disabled={
          rawEditorBusy ||
          rawAppendDraft.w % rawAppendDraft.cols !== 0 ||
          rawAppendDraft.h % rawAppendDraft.rows !== 0
        }
        onClick={() => void appendRawFrames()}
        size="compact"
        variant="primary"
      >
        确认追加
      </DsButton>
    </div>
  ) : null

  return (
    <>
      <div className="outliner data-outliner battle-sprite-outliner">
        {props.tabBar}
        <DsCatalogControls
          title="精灵库"
          count={assets.length}
          unit="项"
          actions={[
            {
              id: 'import-battle-sprite',
              label: '导入战斗精灵',
              icon: 'add',
              onClick: () => setUploading(true),
            },
          ]}
          scope={
            <DsTabs
              size="compact"
              label="精灵资源域"
              items={[
                { id: 'world', label: '大世界' },
                { id: 'battle', label: '战斗' },
              ]}
              activeId="battle"
              onChange={(domain) => {
                if (domain === 'world') props.onWorldDomain()
              }}
            />
          }
          search={{
            'aria-label': '过滤战斗精灵库',
            placeholder: '名称 / id',
            value: filter,
            onChange: (event) => setFilter(event.target.value),
          }}
          filters={
            <DsSelect
              size="compact"
              aria-label="用途筛选"
              value={kind}
              onValueChange={(value) => setKind(value as KindFilter)}
              options={(['all', 'player-fighter', 'enemy', 'summon', 'unconfigured'] as const).map(
                (entry) => ({
                  value: entry,
                  label:
                    entry === 'all'
                      ? '全部'
                      : entry === 'unconfigured'
                        ? '未配置'
                        : PROFILE_LABEL[entry],
                }),
              )}
            />
          }
        />
        {shownAssets.length ? (
          <DsVirtualList
            label="战斗精灵目录"
            items={shownAssets}
            itemHeight={68}
            height={720}
            fill
            overscan={5}
            getKey={([asset]) => asset}
            selectedKey={selectedAsset}
            onSelect={([asset]) => focusResource(asset)}
            renderItem={([asset, assetRecord], _index, control) => {
              const entries = definitionsByAsset.get(asset) ?? []
              const label = assetRecord.label?.trim() || entries[0]?.label?.trim() || asset
              return (
                <DsCatalogRow
                  className="sprite-resource-row"
                  tabIndex={control.tabIndex}
                  onFocus={control.onFocus}
                  selected={asset === selectedAsset}
                  title={label}
                  meta={asset}
                  trailing={entries.length ? undefined : <DsTag tone="warning">未配置</DsTag>}
                  aria-label={`${label}，${asset}${entries.length ? '' : '，未配置'}`}
                  onClick={() => focusResource(asset)}
                />
              )
            }}
          />
        ) : (
          <div className="insp-empty">没有匹配的精灵。</div>
        )}
      </div>

      <div className="center actor-center battle-sprite-center ds-object-workspace">
        <DsObjectHero
          eyebrow="战斗精灵"
          title={uploading ? '导入战斗精灵' : displayLabel || '未选择资源'}
          objectId={uploading ? undefined : selectedAsset}
          summary="集中管理共享源帧、战斗用途与动作语义。"
          meta={
            uploading ? null : (
              <DsTag tone="neutral">
                {actualFrameCount} 帧 · {consumers.length} 个用途定义
              </DsTag>
            )
          }
          actions={
            uploading ? null : (
              <>
                {consumers.length ? (
                  <DsButton
                    size="compact"
                    variant="secondary"
                    disabled={!proofReady}
                    onClick={() => setReplacing(true)}
                  >
                    替换源文件…
                  </DsButton>
                ) : (
                  <DsButton size="compact" variant="danger" onClick={() => void deleteAsset()}>
                    删除源文件…
                  </DsButton>
                )}
                {definition ? (
                  <DsButton
                    size="compact"
                    variant="danger"
                    disabled={references.length > 0 || creatingUsage}
                    title={
                      references.length
                        ? `仍有 ${references.length} 处用途引用，不能删除`
                        : '删除当前用途，保留共享源文件'
                    }
                    onClick={deleteDefinition}
                  >
                    删除用途…
                  </DsButton>
                ) : null}
              </>
            )
          }
        />
        <div className="battle-sprite-workspace-scroll ds-object-workspace__content">
          {uploading ? (
            <div className="battle-sprite-upload-panel">
              <h3>导入战斗精灵</h3>
              <DsFieldGroup>
                <DsTextField
                  id="battle-sprite-upload-id"
                  label="配置 ID 前缀"
                  value={uploadId}
                  monospace
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setUploadId(event.target.value)}
                />
                <DsTextField
                  id="battle-sprite-upload-label"
                  label="显示名"
                  value={uploadLabel}
                  autoComplete="off"
                  onChange={(event) => setUploadLabel(event.target.value)}
                />
                <DsSelectField
                  id="battle-sprite-upload-kind"
                  label="用途"
                  value={uploadKind}
                  options={[
                    { value: 'player-fighter', label: '玩家战斗' },
                    { value: 'enemy', label: '敌人' },
                    { value: 'summon', label: '召唤现身' },
                  ]}
                  onValueChange={(value) => setUploadKind(value as BattleSpriteProfileKind)}
                />
              </DsFieldGroup>
              <BattleSpriteUploader
                assetBase={props.assetBase}
                onApply={async (bytes, frameCount) => {
                  try {
                    const prepared = await prepareBattleSpriteImport(props.session.getState(), {
                      hint: uploadId,
                      label: uploadLabel,
                      kind: uploadKind,
                      bytes,
                      frameCount,
                      reader: props.assetReader,
                    })
                    props.session.dispatch(
                      new AddBattleSpriteCommand(
                        prepared.definition,
                        prepared.record,
                        prepared.bytes,
                        prepared.frameCount,
                      ),
                    )
                    setUploading(false)
                    setSelectedAsset(prepared.definition.asset)
                    setSelectedId(prepared.definition.id)
                    props.onViewChange('definition', prepared.definition.id)
                    props.onObjectFocus?.(prepared.definition.id)
                  } catch (reason) {
                    reportError(reason)
                    throw reason
                  }
                }}
                onCancel={() => setUploading(false)}
              />
            </div>
          ) : record?.kind === 'battle-sprite' ? (
            <>
              <DsFileInput
                ref={rawReplaceFileRef}
                className="sprite-hidden-file-input"
                accept="image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (file) void replaceRawFrame(file, rawReplaceIndex.current)
                }}
              />
              <DsFileInput
                ref={rawAppendFileRef}
                className="sprite-hidden-file-input"
                accept="image/png,image/webp,image/gif"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  event.target.value = ''
                  if (!file) return
                  void imageFileToRgba(file)
                    .then((image) => setRawAppendDraft({ ...image, cols: 1, rows: 1 }))
                    .catch(reportRawError)
                }}
              />
              <BattleSpriteInlinePreview
                asset={selectedAsset}
                label={displayLabel}
                assetBase={props.assetBase}
                assetReader={props.assetReader}
                layout="library"
                semanticGroups={semanticGroups}
                activeDefinitionId={draftDefinitionId ?? definition?.id}
                consumerCount={consumers.length}
                onDefinitionSelect={(id) => {
                  const next = consumers.find((entry) => entry.id === id)
                  if (next) focusDefinition(next)
                }}
                onFrameSelect={setSelectedRawFrame}
                onLoaded={setPreviewProof}
                onResourceLoaded={setResourceSnapshot}
                onRawAppend={() => rawAppendFileRef.current?.click()}
                onRawReplace={(index) => {
                  rawReplaceIndex.current = index
                  rawReplaceFileRef.current?.click()
                }}
                onRawDelete={(index) => void deleteRawFrame(index)}
                onRawFrameDragStart={(event, index) => {
                  setSelectedRawFrame(index)
                  event.dataTransfer.effectAllowed = 'copy'
                  event.dataTransfer.setData(RAW_FRAME_MIME, String(index))
                  event.dataTransfer.setData('text/plain', `${RAW_FRAME_TEXT_PREFIX}${index}`)
                }}
                rawEditorBusy={rawEditorBusy}
                rawEditorMessage={rawEditorMessage}
                rawEditorMessageKind={rawEditorMessageKind}
                rawEditorPanel={rawAppendPanel}
                showHero={false}
              />
              {replacing ? (
                <div className="battle-replace-panel">
                  <h4>替换当前共享帧源</h4>
                  <BattleSpriteUploader
                    assetBase={props.assetBase}
                    onApply={replaceAsset}
                    onCancel={() => setReplacing(false)}
                  />
                </div>
              ) : null}
            </>
          ) : (
            <div className="insp-empty">没有可预览的战斗精灵。</div>
          )}
        </div>
      </div>

      <DsInspectorHost className="inspector inspector--tabbed battle-sprite-inspector">
        <div className="insp-head">
          <div className="what">战斗精灵</div>
          <div className="who">{displayLabel || '未选择'}</div>
        </div>
        <DsInspectorTabs
          id="battle-sprite-inspector"
          label="战斗精灵检查器"
          activeId={inspectorTab}
          onChange={(id) => setInspectorTab(id as InspectorTab)}
          items={[
            {
              id: 'actions',
              label: '动作',
              panel: (
                <div>
                  <DsInspectorSection
                    title="用途"
                    actions={
                      <DsButton
                        size="compact"
                        variant="secondary"
                        onClick={() => setShowUsageMenu((value) => !value)}
                      >
                        新增用途
                      </DsButton>
                    }
                  >
                    {consumers.length > 1 && !creatingUsage ? (
                      <div className="ds-inspector-choice-list" role="group" aria-label="切换用途">
                        {consumers.map((entry) => (
                          <DsCatalogRow
                            key={entry.id}
                            selected={entry.id === definition?.id}
                            title={entry.label}
                            meta={entry.id}
                            trailing={PROFILE_LABEL[entry.profile.kind]}
                            onClick={() => focusDefinition(entry)}
                          />
                        ))}
                      </div>
                    ) : null}
                    {showUsageMenu ? (
                      <div
                        className="ds-inspector-option-row"
                        role="group"
                        aria-label="新增用途类型"
                      >
                        {(['player-fighter', 'enemy', 'summon'] as const).map((entry) => (
                          <DsButton
                            key={entry}
                            size="compact"
                            variant="secondary"
                            onClick={() => beginUsage(entry)}
                          >
                            {PROFILE_LABEL[entry]}
                          </DsButton>
                        ))}
                      </div>
                    ) : null}
                    {creatingUsage ? (
                      <p className="ds-inspector-supporting-copy">
                        新用途尚未写入项目；应用后才会成为一次可撤销修改。
                      </p>
                    ) : null}
                    {!definition && !creatingUsage ? (
                      <p className="ds-inspector-inline-empty">
                        这组源帧尚未设置用途。点击“新增用途”开始配置。
                      </p>
                    ) : null}
                  </DsInspectorSection>

                  {draftProfile ? (
                    <>
                      <DsInspectorSection
                        title="用途信息"
                        description={`${PROFILE_LABEL[draftProfile.kind]} · ${draftDefinitionId}`}
                      >
                        <DsPropertyGrid>
                          <DsPropertyRow label="名称" labelFor="battle-sprite-usage-name">
                            <DsTextInput
                              id="battle-sprite-usage-name"
                              name="battle-sprite-usage-name"
                              autoComplete="off"
                              size="compact"
                              value={draftLabel}
                              onChange={(event) => setDraftLabel(event.target.value)}
                            />
                          </DsPropertyRow>
                        </DsPropertyGrid>
                      </DsInspectorSection>
                      <DsInspectorSection title="动作">
                        <div
                          className="ds-inspector-choice-list"
                          role="group"
                          aria-label="动作列表"
                        >
                          {namedActions.map((action) => (
                            <DsCatalogRow
                              key={action.key}
                              selected={effectiveAction === action.key}
                              title={action.label}
                              meta={
                                action.frames.length
                                  ? action.frames.map((frame) => `#${frame}`).join(' → ')
                                  : '未设置'
                              }
                              onClick={() => {
                                setSelectedAction(action.key)
                                setDragOverPlayerSlot(undefined)
                                const spec = PLAYER_ACTIONS.find(
                                  (entry) => entry.key === action.key,
                                )
                                setSelectedPlayerSlot(spec?.slots[0]?.key)
                              }}
                            />
                          ))}
                        </div>

                        {actionProfile?.kind === 'player-fighter' && activePlayerSpec ? (
                          <div className="battle-action-stage-editor">
                            <div className="battle-action-stage-head">
                              <div>
                                <h5>{activeAction?.label} · 原版动作阶段</h5>
                                <p className="hint2">
                                  阶段顺序与行为由 PAL
                                  战斗逻辑固定。将中间的原始帧拖到某个阶段，只会替换该阶段姿势。
                                </p>
                              </div>
                              <span className="battle-action-stage-mode">
                                原版兼容 · 固定 {activePlayerSpec.slots.length} 槽
                              </span>
                            </div>
                            <ol className="battle-action-stage-list" aria-label="原版动作阶段">
                              {activePlayerSpec.slots.map((slot, index) => {
                                const frame = actionProfile.frames[slot.key]
                                const selected = slot.key === effectivePlayerSlot
                                const dropTarget = slot.key === dragOverPlayerSlot
                                return (
                                  <li
                                    key={`${slot.key}:${index}`}
                                    className={`${selected ? 'selected' : ''}${dropTarget ? ' drop-target' : ''}`}
                                    onDragEnter={(event) => {
                                      if (
                                        !Array.from(event.dataTransfer.types).includes(
                                          RAW_FRAME_MIME,
                                        )
                                      )
                                        return
                                      setDragOverPlayerSlot(slot.key)
                                    }}
                                    onDragLeave={(event) => {
                                      const related = event.relatedTarget
                                      if (
                                        related instanceof Node &&
                                        event.currentTarget.contains(related)
                                      )
                                        return
                                      if (dragOverPlayerSlot === slot.key)
                                        setDragOverPlayerSlot(undefined)
                                    }}
                                    onDragOver={(event) => {
                                      if (
                                        !Array.from(event.dataTransfer.types).includes(
                                          RAW_FRAME_MIME,
                                        )
                                      )
                                        return
                                      event.preventDefault()
                                      event.dataTransfer.dropEffect = 'copy'
                                      setDragOverPlayerSlot(slot.key)
                                    }}
                                    onDrop={(event) => {
                                      event.stopPropagation()
                                      onPlayerStageDrop(event, slot.key)
                                    }}
                                  >
                                    <DsPressable
                                      type="button"
                                      className="battle-action-stage-select"
                                      aria-pressed={selected}
                                      aria-label={
                                        frame === undefined
                                          ? `选中${slot.label}，当前未设置`
                                          : `选中${slot.label}，当前为原始帧 ${frame}`
                                      }
                                      onClick={() => setSelectedPlayerSlot(slot.key)}
                                    >
                                      <DsSequenceIndex value={index + 1} decorative />
                                      <SpriteFrameCanvas
                                        source={
                                          frame === undefined
                                            ? undefined
                                            : resourceSnapshot?.baked[frame]
                                        }
                                        width={54}
                                        height={54}
                                        maxScale={2}
                                      />
                                      <span className="battle-action-stage-meta">
                                        <b>{slot.label}</b>
                                        {frame === undefined ? (
                                          <small>未设置</small>
                                        ) : (
                                          <code>#{frame}</code>
                                        )}
                                      </span>
                                    </DsPressable>
                                    <span className="battle-action-stage-controls">
                                      <DsPressable
                                        type="button"
                                        aria-label={`用已选 #${selectedRawFrame} 替换${slot.label}`}
                                        onClick={() =>
                                          assignPlayerStage(slot.key, selectedRawFrame)
                                        }
                                      >
                                        用已选 #{selectedRawFrame}
                                      </DsPressable>
                                      {slot.optional && frame !== undefined ? (
                                        <DsPressable
                                          type="button"
                                          aria-label={`清除${slot.label}`}
                                          onClick={() => clearOptionalPlayerStage(slot.key)}
                                        >
                                          清除
                                        </DsPressable>
                                      ) : null}
                                    </span>
                                    {dropTarget ? (
                                      <span className="battle-action-stage-drop-hint">
                                        释放以将“{slot.label}”替换为 #{selectedRawFrame}
                                      </span>
                                    ) : null}
                                  </li>
                                )
                              })}
                            </ol>
                            {activePlayerSpec.returnToIdle ? (
                              <div className="battle-action-end-behavior">
                                <span className="battle-action-end-lock" aria-hidden="true">
                                  🔒
                                </span>
                                <SpriteFrameCanvas
                                  source={resourceSnapshot?.baked[actionProfile.frames.idle]}
                                  width={54}
                                  height={54}
                                  maxScale={2}
                                />
                                <span className="battle-action-stage-meta">
                                  <b>结束行为：回到待机</b>
                                  <code>#{actionProfile.frames.idle}</code>
                                  <small>由待机动作派生，不占用当前动作槽位</small>
                                </span>
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        <ProfileEditor
                          profile={draftProfile}
                          actualFrameCount={actualFrameCount}
                          onChange={setDraftProfile}
                        />
                      </DsInspectorSection>
                      <div className="ds-inspector-actions battle-draft-actions">
                        <DsButton size="compact" variant="secondary" onClick={discardDraft}>
                          放弃修改
                        </DsButton>
                        <DsButton
                          size="compact"
                          variant="primary"
                          disabled={!proofReady || !draftLabel.trim() || !draftChanged}
                          onClick={() => void applyDefinitionDraft()}
                        >
                          应用修改
                        </DsButton>
                      </div>
                    </>
                  ) : null}
                </div>
              ),
            },
            {
              id: 'references',
              label: '引用',
              count: references.length,
              panel: (
                <div>
                  <div className="section sprite-definition-lifecycle">
                    <DsReferencePanel
                      state={references.length ? 'ready' : 'empty'}
                      count={{ kind: 'exact', value: references.length }}
                      impact={{
                        kind: 'blocking',
                        description: !definition
                          ? '尚无用途定义，因此没有内容引用。'
                          : references.length
                            ? '先处理所有用途引用，才能删除战斗精灵用途定义。'
                            : '当前用途尚未被使用。',
                      }}
                    >
                      {references.length ? (
                        <DsReferenceList>
                          {references.map((reference) => (
                            <DsReferenceRow
                              key={`${reference.site}:${reference.where}`}
                              title={referenceLabel(reference)}
                              path={reference.where}
                              labels={[{ label: PROFILE_LABEL[reference.expectedProfile] }]}
                              action={
                                props.onJumpReference
                                  ? {
                                      label: '打开',
                                      onActivate: () => props.onJumpReference?.(reference),
                                    }
                                  : undefined
                              }
                              status={
                                props.onJumpReference
                                  ? undefined
                                  : {
                                      label: '暂不可定位',
                                      reason: '当前宿主没有提供战斗精灵引用定位能力。',
                                      tone: 'warning',
                                    }
                              }
                            />
                          ))}
                        </DsReferenceList>
                      ) : null}
                    </DsReferencePanel>
                  </div>
                </div>
              ),
            },
            {
              id: 'source',
              label: '源文件',
              panel: (
                <div>
                  {record?.kind === 'battle-sprite' ? (
                    <DsInspectorSection title="源文件">
                      <DsPropertyGrid>
                        <DsPropertyRow label="AssetId">
                          <code className="ds-inspector-readonly" translate="no">
                            {selectedAsset}
                          </code>
                        </DsPropertyRow>
                        <DsPropertyRow label="路径">
                          <code className="ds-inspector-readonly" translate="no">
                            {record.path}
                          </code>
                        </DsPropertyRow>
                        <DsPropertyRow label="实际帧数">
                          {actualFrameCount || '读取中…'}
                        </DsPropertyRow>
                        <DsPropertyRow label="字节">{record.bytes.toLocaleString()}</DsPropertyRow>
                        <DsPropertyRow label="SHA-256">
                          <code
                            className="ds-inspector-readonly"
                            translate="no"
                            title={record.sha256}
                          >
                            {record.sha256.slice(0, 16)}…
                          </code>
                        </DsPropertyRow>
                        <DsPropertyRow label="来源">{record.origin.kind}</DsPropertyRow>
                      </DsPropertyGrid>
                    </DsInspectorSection>
                  ) : (
                    <div className="insp-empty">未选择源文件。</div>
                  )}
                </div>
              ),
            },
          ]}
        />
      </DsInspectorHost>
    </>
  )
}
