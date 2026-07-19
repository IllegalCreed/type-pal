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
import { type AssetBase, decodeBattleSpriteAssetBytes } from '@type-pal/reforge'
import { useEffect, useMemo, useState } from 'react'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import { sha256Hex } from '../core/binary-signature.js'
import {
  AddBattleSpriteCommand,
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
} from './BattleSpriteInlinePreview.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'

const PROFILE_LABEL: Record<BattleSpriteProfileKind, string> = {
  'player-fighter': '玩家战斗',
  enemy: '敌人',
  summon: '召唤现身',
}

const PLAYER_FRAME_FIELDS: readonly { key: keyof PlayerFighterFrames; label: string }[] = [
  { key: 'idle', label: '待机' },
  { key: 'dying', label: '濒死' },
  { key: 'dead', label: '死亡' },
  { key: 'defend', label: '防御' },
  { key: 'hurt', label: '受伤' },
  { key: 'preMagic', label: '施法前' },
  { key: 'magic', label: '施法' },
  { key: 'attackWindup', label: '攻击蓄力' },
  { key: 'attackRush', label: '攻击冲刺' },
  { key: 'attackStrike', label: '攻击命中' },
  { key: 'steal', label: '偷窃（可选）' },
]

function NumberField(props: {
  label: string
  value: number | undefined
  min?: number
  optional?: boolean
  onChange: (value: number | undefined) => void
}) {
  return (
    <label className="battle-profile-field">
      <span>{props.label}</span>
      <input
        className="in mono"
        type="number"
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
    </label>
  )
}

function ProfileEditor(props: {
  profile: BattleSpriteProfile
  onChange: (profile: BattleSpriteProfile) => void
}) {
  const profile = props.profile
  if (profile.kind === 'summon')
    return <p className="hint2">召唤定义按资源顺序播放全部帧，没有额外动作 ABI。</p>
  if (profile.kind === 'player-fighter')
    return (
      <div className="battle-profile-grid">
        {PLAYER_FRAME_FIELDS.map(({ key, label }) => (
          <NumberField
            key={key}
            label={label}
            value={profile.frames[key]}
            optional={key === 'steal'}
            onChange={(value) => {
              const frames = { ...profile.frames }
              if (value === undefined) delete frames.steal
              else frames[key] = value
              props.onChange({ ...profile, frames })
            }}
          />
        ))}
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
      </div>
    )
  const setCount = (key: 'idle' | 'magic' | 'attack', count: number): void => {
    const counts = {
      idle: profile.idle.count,
      magic: profile.magic.count,
      attack: profile.attack.count,
      [key]: Math.max(key === 'idle' ? 1 : 0, count),
    }
    props.onChange({
      ...profile,
      idle: { start: 0, count: counts.idle },
      magic: { start: counts.idle, count: counts.magic },
      attack: { start: counts.idle + counts.magic, count: counts.attack },
    })
  }
  return (
    <div className="battle-profile-grid">
      <NumberField
        label="待机帧数"
        value={profile.idle.count}
        min={1}
        onChange={(value) => setCount('idle', value ?? 1)}
      />
      <NumberField
        label="施法帧数"
        value={profile.magic.count}
        onChange={(value) => setCount('magic', value ?? 0)}
      />
      <NumberField
        label="攻击帧数"
        value={profile.attack.count}
        onChange={(value) => setCount('attack', value ?? 0)}
      />
      <NumberField
        label="待机 tick/帧"
        value={profile.idleTicksPerFrame}
        min={1}
        onChange={(idleTicksPerFrame) =>
          props.onChange({ ...profile, idleTicksPerFrame: idleTicksPerFrame ?? 1 })
        }
      />
      <NumberField
        label="行动 tick/帧"
        value={profile.actTicksPerFrame}
        onChange={(actTicksPerFrame) =>
          props.onChange({ ...profile, actTicksPerFrame: actTicksPerFrame ?? 0 })
        }
      />
    </div>
  )
}

export function BattleSpriteLibrary(props: {
  definitions: readonly BattleSpriteDef[]
  catalog: AssetCatalogV1
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  tabBar: React.ReactNode
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
  const focusedIsAsset = props.view === 'asset'
  const [selectedId, setSelectedId] = useState(
    !focusedIsAsset && props.focusObjectId ? props.focusObjectId : (props.definitions[0]?.id ?? ''),
  )
  const [selectedAsset, setSelectedAsset] = useState(
    focusedIsAsset && props.focusObjectId ? props.focusObjectId : (assets[0]?.[0] ?? ''),
  )
  const [filter, setFilter] = useState('')
  const [kind, setKind] = useState<BattleSpriteProfileKind | 'all'>('all')
  const [uploading, setUploading] = useState(false)
  const [replacing, setReplacing] = useState(false)
  const [uploadKind, setUploadKind] = useState<BattleSpriteProfileKind>('player-fighter')
  const [uploadId, setUploadId] = useState('authored')
  const [uploadLabel, setUploadLabel] = useState('新战斗精灵')
  const [previewProof, setPreviewProof] = useState<BattleSpritePreviewProof | undefined>()
  const [draftLabel, setDraftLabel] = useState('')
  const [draftProfile, setDraftProfile] = useState<BattleSpriteProfile | undefined>()
  const [draftDefinitionId, setDraftDefinitionId] = useState<string>()
  const [showAllReferences, setShowAllReferences] = useState(false)
  const [selectedAction, setSelectedAction] = useState<string>()

  useEffect(() => {
    const objectId = props.focusObjectId
    if (!objectId) return
    if (props.view === 'definition' && props.definitions.some((entry) => entry.id === objectId)) {
      setSelectedId(objectId)
    } else if (props.view === 'asset' && props.catalog.assets[objectId]?.kind === 'battle-sprite') {
      setSelectedAsset(objectId)
    }
  }, [props.catalog, props.definitions, props.focusObjectId, props.view])

  useEffect(() => {
    if (
      props.view === 'definition' &&
      !props.definitions.some((entry) => entry.id === selectedId)
    ) {
      const next = props.definitions[0]?.id
      if (selectedId === (next ?? '')) return
      setSelectedId(next ?? '')
      props.onViewChange('definition', next)
      props.onObjectFocus?.(next)
    }
    if (props.view === 'asset' && props.catalog.assets[selectedAsset]?.kind !== 'battle-sprite') {
      const next = assets[0]?.[0]
      if (selectedAsset === (next ?? '')) return
      setSelectedAsset(next ?? '')
      props.onViewChange('asset', next)
      props.onObjectFocus?.(next)
    }
  }, [
    assets,
    props.catalog,
    props.definitions,
    props.onObjectFocus,
    props.onViewChange,
    props.view,
    selectedAsset,
    selectedId,
  ])

  const shownDefinitions = props.definitions.filter(
    (entry) =>
      (kind === 'all' || entry.profile.kind === kind) &&
      (!filter ||
        entry.id.includes(filter) ||
        entry.label.includes(filter) ||
        entry.asset.includes(filter)),
  )
  const shownAssets = assets.filter(
    ([asset, record]) =>
      !filter ||
      asset.includes(filter) ||
      record.path.includes(filter) ||
      record.label?.includes(filter),
  )
  const definition = props.definitions.find((entry) => entry.id === selectedId)
  const record = props.catalog.assets[selectedAsset]
  const consumers = definitionsByAsset.get(selectedAsset) ?? []
  const allReferences = collectBattleSpriteDefinitionReferences(props.session.getState())
  const references = definition
    ? allReferences.filter((reference) => reference.battleSprite === definition.id)
    : []
  const referenceCounts = new Map<string, number>()
  for (const reference of allReferences)
    referenceCounts.set(
      reference.battleSprite,
      (referenceCounts.get(reference.battleSprite) ?? 0) + 1,
    )
  const currentAsset = props.view === 'definition' ? definition?.asset : selectedAsset
  const currentRecord = currentAsset ? props.catalog.assets[currentAsset] : undefined
  const proofReady =
    !!currentAsset &&
    currentRecord?.kind === 'battle-sprite' &&
    previewProof?.asset === currentAsset &&
    previewProof.sha256 === currentRecord.sha256
  const actualFrameCount = proofReady ? previewProof.actualFrameCount : 0
  const actionContext = `${props.view}\0${definition?.id ?? ''}\0${currentAsset ?? ''}`

  useEffect(() => {
    setDraftDefinitionId(definition?.id)
    setDraftLabel(definition?.label ?? '')
    setDraftProfile(definition ? structuredClone(definition.profile) : undefined)
    setShowAllReferences(false)
  }, [definition])

  useEffect(() => {
    if (!actionContext) return
    setSelectedAction(undefined)
  }, [actionContext])

  const reportError = (reason: unknown): void =>
    props.onStatusNotice?.({
      kind: 'error',
      message: reason instanceof Error ? reason.message : String(reason),
    })

  const applyDefinitionDraft = (): void => {
    if (
      !definition ||
      draftDefinitionId !== definition.id ||
      !draftProfile ||
      !proofReady ||
      !previewProof
    ) {
      reportError(new Error('战斗精灵尚未完成当前资源的解码校验，不能应用修改。'))
      return
    }
    const profileChanged = JSON.stringify(draftProfile) !== JSON.stringify(definition.profile)
    if (
      profileChanged &&
      references.length > 1 &&
      !window.confirm(
        `当前语义定义被 ${references.length} 处内容引用，修改动作 ABI 会同时影响这些引用。继续吗？`,
      )
    )
      return
    try {
      props.session.dispatch(
        new UpdateBattleSpriteDefinitionCommand(
          definition.id,
          { label: draftLabel.trim(), profile: draftProfile },
          {
            asset: definition.asset,
            sha256: previewProof.sha256,
            actualFrameCount: previewProof.actualFrameCount,
          },
        ),
      )
      props.onStatusNotice?.(undefined)
    } catch (reason) {
      reportError(reason)
    }
  }

  const openView = (view: 'definition' | 'asset', objectId?: string): void => {
    if (view === 'definition' && objectId) setSelectedId(objectId)
    if (view === 'asset' && objectId) setSelectedAsset(objectId)
    setUploading(false)
    setReplacing(false)
    props.onViewChange(view, objectId)
  }

  const deleteDefinition = (): void => {
    if (!definition || references.length) return
    if (!window.confirm(`删除定义“${definition.label}”？物理资源会保留。`)) return
    try {
      const asset = definition.asset
      props.session.dispatch(new RemoveBattleSpriteDefinitionCommand(definition.id))
      openView('asset', asset)
    } catch (reason) {
      reportError(reason)
    }
  }

  const deleteAsset = async (): Promise<void> => {
    if (!record || consumers.length) return
    if (!window.confirm(`永久移除未使用战斗精灵资源“${selectedAsset}”？`)) return
    try {
      const bytes = await props.assetReader.readBytes(selectedAsset, 'battle-sprite')
      await decodeBattleSpriteAssetBytes(record, bytes, `删除前校验 ${selectedAsset}`)
      props.session.dispatch(new DeleteUnusedBattleSpriteAssetCommand(selectedAsset, bytes))
      const next = assets.find(([asset]) => asset !== selectedAsset)?.[0] ?? ''
      setSelectedAsset(next)
      props.onViewChange('asset', next || undefined)
    } catch (reason) {
      reportError(reason)
    }
  }

  const replaceAsset = async (bytes: ArrayBuffer, frameCount: number): Promise<void> => {
    if (!record || !consumers.length || !proofReady || !previewProof) return
    if (frameCount < previewProof.actualFrameCount) {
      reportError(
        new Error(
          `替换文件只有 ${frameCount} 帧，少于当前 ${previewProof.actualFrameCount} 帧；默认禁止缩帧。受影响定义：${consumers.map((entry) => entry.id).join('、')}`,
        ),
      )
      return
    }
    if (!window.confirm(`替换共享资源会影响 ${consumers.length} 个定义。继续吗？`)) return
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
  }

  const previewDefinition = useMemo(
    () =>
      props.view === 'definition'
        ? definition
        : record?.kind === 'battle-sprite'
          ? ({
              id: `asset-preview-${selectedAsset}`,
              label: record.label ?? selectedAsset,
              asset: selectedAsset,
              profile: { kind: 'summon' },
            } satisfies BattleSpriteDef)
          : undefined,
    [definition, props.view, record, selectedAsset],
  )
  const draftIsCurrent = draftDefinitionId === definition?.id
  const actionProfile =
    props.view === 'definition'
      ? draftIsCurrent
        ? (draftProfile ?? definition?.profile)
        : definition?.profile
      : undefined
  const namedActions: Array<{
    key: string
    label: string
    frames: number[]
    frameMs: number
    timing?: string
  }> = []
  if (actionProfile?.kind === 'player-fighter') {
    for (const { key, label } of PLAYER_FRAME_FIELDS) {
      const frame = actionProfile.frames[key]
      if (frame !== undefined) namedActions.push({ key, label, frames: [frame], frameMs: 200 })
    }
  } else if (actionProfile?.kind === 'enemy') {
    for (const [label, section] of [
      ['待机', actionProfile.idle],
      ['施法', actionProfile.magic],
      ['攻击', actionProfile.attack],
    ] as const) {
      const frames =
        section.count === 0
          ? []
          : label !== '待机' && actionProfile.actTicksPerFrame === 0
            ? [section.start + section.count - 1]
            : label === '攻击'
              ? Array.from({ length: section.count + 1 }, (_, index) => section.start + index - 1)
              : Array.from({ length: section.count }, (_, index) => section.start + index)
      namedActions.push({
        key: label,
        label,
        frames,
        frameMs:
          label === '待机'
            ? actionProfile.idleTicksPerFrame * 40
            : Math.max(1, actionProfile.actTicksPerFrame) * 40,
        timing:
          label === '待机'
            ? `${actionProfile.idleTicksPerFrame} tick/帧`
            : actionProfile.actTicksPerFrame === 0
              ? '0 tick：瞬时落到末帧'
              : `${actionProfile.actTicksPerFrame} tick/帧`,
      })
    }
  } else if (actionProfile?.kind === 'summon' && actualFrameCount) {
    namedActions.push({
      key: 'summon-all',
      label: '召唤现身（全部帧）',
      frames: Array.from({ length: actualFrameCount }, (_, index) => index),
      frameMs: 200,
    })
  }
  const activeAction = namedActions.find((action) => action.key === selectedAction)

  return (
    <>
      <div className="outliner data-outliner">
        {props.tabBar}
        <div className="pane-h">
          <span className="t">精灵库</span>
          <span className="spacer" />
          <span className="k">
            {props.view === 'definition'
              ? `${shownDefinitions.length}/${props.definitions.length}`
              : `${shownAssets.length}/${assets.length}`}
          </span>
        </div>
        <fieldset className="sprite-domain-switch" aria-label="精灵资源域">
          <button type="button" onClick={props.onWorldDomain}>
            大世界
          </button>
          <button type="button" className="on" aria-pressed="true">
            战斗
          </button>
        </fieldset>
        <fieldset className="sprite-library-switch" aria-label="战斗精灵库视图">
          <button
            type="button"
            className={props.view === 'definition' ? 'on' : ''}
            aria-pressed={props.view === 'definition'}
            onClick={() => openView('definition', selectedId || props.definitions[0]?.id)}
          >
            语义定义 <b>{props.definitions.length}</b>
          </button>
          <button
            type="button"
            className={props.view === 'asset' ? 'on' : ''}
            aria-pressed={props.view === 'asset'}
            onClick={() =>
              openView(
                'asset',
                props.view === 'definition' ? definition?.asset : selectedAsset || assets[0]?.[0],
              )
            }
          >
            二进制资源 <b>{assets.length}</b>
          </button>
        </fieldset>
        <input
          className="in"
          aria-label="过滤战斗精灵库"
          placeholder="过滤 id / 标签 / AssetId…"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          style={{ margin: '0 8px 6px' }}
        />
        {props.view === 'definition' && (
          <>
            <div className="kind-filter">
              {(['all', 'player-fighter', 'enemy', 'summon'] as const).map((entry) => (
                <button
                  type="button"
                  key={entry}
                  className={`kchip${kind === entry ? ' on' : ''}`}
                  onClick={() => setKind(entry)}
                >
                  {entry === 'all' ? '全部' : PROFILE_LABEL[entry]}
                </button>
              ))}
            </div>
            <button
              type="button"
              className="sprite-upload-action"
              onClick={() => setUploading(true)}
            >
              ＋ 上传并创建定义
            </button>
          </>
        )}
        <div className="sprite-list">
          {props.view === 'definition'
            ? shownDefinitions.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className={`arow sprite-resource-row${entry.id === selectedId ? ' sel' : ''}`}
                  onClick={() => {
                    setSelectedId(entry.id)
                    setUploading(false)
                    props.onViewChange('definition', entry.id)
                  }}
                >
                  <span className="face">⚔️</span>
                  <span className="nm">
                    <b>{entry.label}</b>
                    <span>
                      {entry.id} · {entry.asset}
                    </span>
                  </span>
                  <span className="abadge npc">
                    {(referenceCounts.get(entry.id) ?? 0) > 1
                      ? `共享 ${referenceCounts.get(entry.id)} 处`
                      : referenceCounts.get(entry.id) === 1
                        ? '引用 1'
                        : '未引用'}
                  </span>
                </button>
              ))
            : shownAssets.map(([asset, assetRecord]) => {
                const count = definitionsByAsset.get(asset)?.length ?? 0
                return (
                  <button
                    type="button"
                    key={asset}
                    className={`arow sprite-resource-row${asset === selectedAsset ? ' sel' : ''}`}
                    onClick={() => {
                      setSelectedAsset(asset)
                      props.onViewChange('asset', asset)
                    }}
                  >
                    <span className="face">📦</span>
                    <span className="nm">
                      <b>{assetRecord.label ?? asset}</b>
                      <span title={`${asset} · ${assetRecord.path}`}>
                        {asset} · {assetRecord.path}
                      </span>
                    </span>
                    <span className={`abadge${count ? ' npc' : ' sprite-unused-badge'}`}>
                      {count ? `${count} 个定义` : '未使用'}
                    </span>
                  </button>
                )
              })}
        </div>
      </div>

      <div className="center actor-center">
        {uploading ? (
          <div className="battle-sprite-upload-panel">
            <h3>创建战斗精灵定义</h3>
            <label>
              <span>定义 id 前缀</span>
              <input
                className="in"
                value={uploadId}
                onChange={(event) => setUploadId(event.target.value)}
              />
            </label>
            <label>
              <span>显示名</span>
              <input
                className="in"
                value={uploadLabel}
                onChange={(event) => setUploadLabel(event.target.value)}
              />
            </label>
            <label>
              <span>用途 profile</span>
              <select
                className="in"
                value={uploadKind}
                onChange={(event) => setUploadKind(event.target.value as BattleSpriteProfileKind)}
              >
                <option value="player-fighter">玩家战斗</option>
                <option value="enemy">敌人</option>
                <option value="summon">召唤现身</option>
              </select>
            </label>
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
                  setSelectedId(prepared.definition.id)
                  props.onViewChange('definition', prepared.definition.id)
                } catch (reason) {
                  reportError(reason)
                  throw reason
                }
              }}
              onCancel={() => setUploading(false)}
            />
          </div>
        ) : previewDefinition ? (
          <BattleSpriteInlinePreview
            definition={previewDefinition}
            expected={previewDefinition.profile.kind}
            assetBase={props.assetBase}
            assetReader={props.assetReader}
            playAllFrames
            frameSequence={activeAction?.frames}
            frameMs={activeAction?.frameMs}
            sequenceKey={selectedAction ?? 'all'}
            onLoaded={setPreviewProof}
          />
        ) : (
          <div className="insp-empty">没有可预览的战斗精灵。</div>
        )}
        {!uploading && proofReady && namedActions.length ? (
          <section className="battle-named-actions" aria-label="命名动作预览">
            <h4>命名动作</h4>
            <button
              type="button"
              className={`battle-named-action${selectedAction === undefined ? ' on' : ''}`}
              aria-pressed={selectedAction === undefined}
              onClick={() => setSelectedAction(undefined)}
            >
              <b>全部帧循环</b>
              <span>选择下方动作可按 ABI 速度预览</span>
            </button>
            {namedActions.map((action) => (
              <button
                type="button"
                className={`battle-named-action${selectedAction === action.key ? ' on' : ''}`}
                aria-pressed={selectedAction === action.key}
                disabled={!action.frames.length}
                key={action.key}
                onClick={() => setSelectedAction(action.key)}
              >
                <b>{action.label}</b>
                <code>
                  {action.frames.length
                    ? action.frames.length === 1
                      ? `#${action.frames[0]}`
                      : `#${action.frames[0]}–${action.frames.at(-1)}`
                    : '无帧'}
                </code>
                {action.timing ? <span>{action.timing}</span> : null}
              </button>
            ))}
          </section>
        ) : null}
        {replacing && record?.kind === 'battle-sprite' && (
          <div className="battle-replace-panel">
            <h4>替换当前共享二进制</h4>
            <BattleSpriteUploader
              assetBase={props.assetBase}
              onApply={replaceAsset}
              onCancel={() => setReplacing(false)}
            />
          </div>
        )}
      </div>

      <div className="inspector">
        {props.view === 'definition' && definition ? (
          <>
            <div className="insp-head">
              <div className="what">战斗精灵定义</div>
              <div className="who">{definition.label}</div>
            </div>
            <div className="section">
              <h4>登记</h4>
              <div className="field">
                <span className="field-label">id</span>
                <div className="in mono">{definition.id}</div>
              </div>
              <div className="field">
                <span className="field-label">AssetId</span>
                <button
                  type="button"
                  className="in mono sprite-asset-link"
                  onClick={() => openView('asset', definition.asset)}
                >
                  {definition.asset} ↗
                </button>
              </div>
              <div className="field">
                <span className="field-label">标签</span>
                <input
                  className="in"
                  aria-label="战斗精灵定义标签"
                  value={draftIsCurrent ? draftLabel : definition.label}
                  onChange={(event) => {
                    setDraftDefinitionId(definition.id)
                    setDraftLabel(event.target.value)
                    if (!draftIsCurrent) setDraftProfile(structuredClone(definition.profile))
                  }}
                />
              </div>
              <div className="hint2">
                {PROFILE_LABEL[definition.profile.kind]} · 实际 {actualFrameCount || '…'} 帧
              </div>
            </div>
            <div className="section">
              <h4>动作 ABI</h4>
              {draftIsCurrent && draftProfile ? (
                <ProfileEditor profile={draftProfile} onChange={setDraftProfile} />
              ) : (
                <ProfileEditor
                  profile={definition.profile}
                  onChange={(profile) => {
                    setDraftDefinitionId(definition.id)
                    setDraftLabel(definition.label)
                    setDraftProfile(profile)
                  }}
                />
              )}
              <div className="battle-profile-actions">
                <button
                  type="button"
                  className="tool"
                  onClick={() => {
                    setDraftDefinitionId(definition.id)
                    setDraftLabel(definition.label)
                    setDraftProfile(structuredClone(definition.profile))
                  }}
                >
                  还原草稿
                </button>
                <button
                  type="button"
                  className="tool primary"
                  disabled={
                    !proofReady ||
                    !draftIsCurrent ||
                    !draftLabel.trim() ||
                    !draftProfile ||
                    (draftLabel === definition.label &&
                      JSON.stringify(draftProfile) === JSON.stringify(definition.profile))
                  }
                  onClick={applyDefinitionDraft}
                >
                  应用定义修改
                </button>
              </div>
            </div>
            <div className="section sprite-definition-lifecycle">
              <h4>引用与生命周期 · {references.length}</h4>
              {references.slice(0, showAllReferences ? undefined : 12).map((reference) =>
                props.onJumpReference ? (
                  <button
                    type="button"
                    className="sprite-reference-link"
                    key={`${reference.site}:${reference.where}`}
                    onClick={() => props.onJumpReference?.(reference)}
                  >
                    <code>{reference.where}</code>
                    <span>跳转 ↗</span>
                  </button>
                ) : (
                  <div
                    className="sprite-reference-link is-static"
                    key={`${reference.site}:${reference.where}`}
                  >
                    <code>{reference.where}</code>
                  </div>
                ),
              )}
              {references.length > 12 ? (
                <button
                  type="button"
                  className="tool"
                  onClick={() => setShowAllReferences((value) => !value)}
                >
                  {showAllReferences ? '收起引用' : `展开其余 ${references.length - 12} 处引用`}
                </button>
              ) : null}
              <button
                type="button"
                className="tool danger-action"
                disabled={references.length > 0}
                onClick={deleteDefinition}
              >
                删除定义（保留资源）
              </button>
            </div>
          </>
        ) : props.view === 'asset' && record?.kind === 'battle-sprite' ? (
          <>
            <div className="insp-head">
              <div className="what">战斗精灵资产</div>
              <div className="who">{record.label ?? selectedAsset}</div>
            </div>
            <div className="section sprite-resource-meta">
              <h4>资源登记</h4>
              <div className="field">
                <span className="field-label">AssetId</span>
                <div className="in mono">{selectedAsset}</div>
              </div>
              <div className="field">
                <span className="field-label">路径</span>
                <div className="in mono">{record.path}</div>
              </div>
              <div className="field">
                <span className="field-label">帧数</span>
                <div className="in mono">{actualFrameCount || '…'}</div>
              </div>
              <div className="field">
                <span className="field-label">字节</span>
                <div className="in mono">{record.bytes.toLocaleString()}</div>
              </div>
              <div className="field">
                <span className="field-label">SHA-256</span>
                <div className="in mono" title={record.sha256}>
                  {record.sha256.slice(0, 16)}…
                </div>
              </div>
              <div className="field">
                <span className="field-label">来源</span>
                <div className="in mono">{record.origin.kind}</div>
              </div>
            </div>
            <div className="section">
              <h4>语义定义 · {consumers.length}</h4>
              {consumers.map((entry) => (
                <button
                  type="button"
                  className="sprite-consumer-link"
                  key={entry.id}
                  onClick={() => openView('definition', entry.id)}
                >
                  <b>{entry.label}</b>
                  <code>{entry.id}</code>
                </button>
              ))}
              <button
                type="button"
                className="tool"
                disabled={!consumers.length || !proofReady}
                onClick={() => setReplacing(true)}
              >
                替换共享二进制…
              </button>
              <button
                type="button"
                className="tool danger-action"
                disabled={consumers.length > 0}
                onClick={() => void deleteAsset()}
              >
                删除未使用资源
              </button>
            </div>
          </>
        ) : (
          <div className="insp-empty">从左侧选择定义或资源。</div>
        )}
      </div>
    </>
  )
}
