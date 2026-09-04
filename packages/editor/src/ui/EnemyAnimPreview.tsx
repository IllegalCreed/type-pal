import type { BattleSpriteDef, EnemyBattleSpriteProfile, EnemyDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import {
  BattleSpriteAssetCache,
  bakeFrame,
  loadBattleSpriteDefinition,
  loadStandardPalette,
} from '@type-pal/reforge'
import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { prepareBattleSpriteImport } from '../core/battle-sprite-import.js'
import {
  AddBattleSpriteCommand,
  CompositeCommand,
  SetEnemyBattleSpriteCommand,
  UpdateBattleSpriteDefinitionCommand,
  UpdateEnemyCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { EditorDerivedStatus } from '../core/editor-derived-contract.js'
import type { ProjectReferenceIndex } from '../core/project-reference.js'
import type { CurrentProjectReferenceIndexProvider } from '../core/project-reference-adapters.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'
import { DsButton, DsDraftNumberInput, DsField, DsTag } from './design-system/controls.js'

type Mode = 'idle' | 'magic' | 'attack'
const MODES: readonly { id: Mode; label: string }[] = [
  { id: 'idle', label: '待机' },
  { id: 'magic', label: '施法' },
  { id: 'attack', label: '攻击' },
]

function frameSequence(
  profile: EnemyBattleSpriteProfile,
  mode: Mode,
): { frames: number[]; ms: number } {
  if (mode === 'idle')
    return {
      frames: Array.from({ length: profile.idle.count }, (_, index) => profile.idle.start + index),
      ms: profile.idleTicksPerFrame * 40,
    }
  if (mode === 'magic') {
    if (profile.magic.count === 0)
      return { frames: [profile.idle.start + profile.idle.count - 1], ms: 40 }
    if (profile.actTicksPerFrame === 0)
      return { frames: [profile.magic.start + profile.magic.count - 1], ms: 40 }
    return {
      frames: Array.from(
        { length: profile.magic.count },
        (_, index) => profile.magic.start + index,
      ),
      ms: profile.actTicksPerFrame * 40,
    }
  }
  if (profile.attack.count === 0)
    return {
      frames: [profile.idle.start + profile.idle.count - 1],
      ms: 40,
    }
  if (profile.actTicksPerFrame === 0)
    return { frames: [profile.attack.start + profile.attack.count - 1], ms: 40 }
  return {
    frames: Array.from(
      { length: profile.attack.count + 1 },
      (_, index) => profile.attack.start + index - 1,
    ),
    ms: profile.actTicksPerFrame * 40,
  }
}

function NumberInput(props: {
  id: string
  draftKey: string
  value: number
  disabled?: boolean
  min?: number
  max?: number
  syncToken: number
  onChange: (value: number) => void | boolean
}) {
  return (
    <DsDraftNumberInput
      id={props.id}
      draftKey={props.draftKey}
      syncToken={props.syncToken}
      disabled={props.disabled}
      monospace
      value={props.value}
      min={props.min ?? 0}
      max={props.max}
      enforceRange={false}
      integer
      autoComplete="off"
      onCommit={(value) => {
        const next = Math.floor(value ?? 0)
        return next === props.value ? true : props.onChange(next)
      }}
    />
  )
}

export function EnemyAnimPreview(props: {
  enemy: EnemyDef
  definitions: readonly BattleSpriteDef[]
  assetBase: AssetBase
  assetReader: EditorAssetReader
  session: EditSession
  onOpenDefinition?: (id: string) => void
  referenceIndex?: ProjectReferenceIndex
  referenceStatus: EditorDerivedStatus
  getCurrentReferenceIndex: CurrentProjectReferenceIndexProvider
}) {
  const { enemy, definitions, assetBase, assetReader, session } = props
  const fieldIdPrefix = useId()
  const definition = definitions.find((entry) => entry.id === enemy.battleSprite)
  const profile = definition?.profile.kind === 'enemy' ? definition.profile : undefined
  const cacheRef = useRef(new BattleSpriteAssetCache(12))
  const [loadedFrames, setLoadedFrames] = useState<{
    asset: string
    sha256: string
    frames: HTMLCanvasElement[]
  }>()
  const [loadError, setLoadError] = useState('')
  const [editError, setEditError] = useState('')
  const referenceCount =
    definition && props.referenceStatus === 'current' && props.referenceIndex
      ? props.referenceIndex.referencesTo({ kind: 'battle-sprite', id: definition.id }).length
      : undefined
  const [mode, setMode] = useState<Mode>('idle')
  const [tick, setTick] = useState(0)
  const [uploading, setUploading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  let revision: string | undefined
  if (definition) {
    try {
      revision = assetReader.record(definition.asset, 'battle-sprite').sha256
    } catch {
      revision = undefined
    }
  }
  const frames =
    definition &&
    revision &&
    loadedFrames?.asset === definition.asset &&
    loadedFrames.sha256 === revision
      ? loadedFrames.frames
      : []
  const profileReady = Boolean(definition && revision && frames.length)

  useEffect(() => {
    let alive = true
    setLoadedFrames(undefined)
    setLoadError('')
    if (!definition || definition.profile.kind !== 'enemy') {
      setLoadError(`战斗精灵定义“${enemy.battleSprite}”不存在或不是 enemy profile`)
      return () => {
        alive = false
      }
    }
    if (!revision) {
      setLoadError(`战斗精灵定义“${definition.id}”的 AssetId “${definition.asset}”不存在`)
      return () => {
        alive = false
      }
    }
    const expectedAsset = definition.asset
    const expectedRevision = revision
    void Promise.all([
      loadBattleSpriteDefinition(cacheRef.current, assetReader, definition, 'enemy'),
      loadStandardPalette(assetBase),
    ])
      .then(([loaded, palette]) => {
        if (alive)
          setLoadedFrames({
            asset: expectedAsset,
            sha256: expectedRevision,
            frames: loaded.sprite.frames.map((frame) => bakeFrame(frame, palette)),
          })
      })
      .catch((reason: unknown) => {
        if (alive) setLoadError(reason instanceof Error ? reason.message : String(reason))
      })
    return () => {
      alive = false
    }
  }, [assetBase, assetReader, definition, enemy.battleSprite, revision])

  const sequence = useMemo(
    () => (profile ? frameSequence(profile, mode) : { frames: [], ms: 200 }),
    [mode, profile],
  )

  useEffect(() => {
    if (!sequence.frames.length) return
    const timer = window.setInterval(() => setTick((value) => value + 1), sequence.ms)
    return () => window.clearInterval(timer)
  }, [sequence.frames.length, sequence.ms])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !frames.length || !sequence.frames.length) return
    const maxWidth = Math.max(...frames.map((frame) => frame.width))
    const maxHeight = Math.max(...frames.map((frame) => frame.height))
    const scale = 2
    canvas.width = maxWidth * scale
    canvas.height = maxHeight * scale
    context.imageSmoothingEnabled = false
    context.clearRect(0, 0, canvas.width, canvas.height)
    const image = frames[sequence.frames[tick % sequence.frames.length] ?? 0]
    if (!image) return
    context.drawImage(
      image,
      (canvas.width - image.width * scale) / 2,
      canvas.height - image.height * scale,
      image.width * scale,
      image.height * scale,
    )
  }, [frames, sequence.frames, tick])

  const patchProfile = (next: EnemyBattleSpriteProfile): boolean => {
    if (!definition || !revision || !frames.length) return false
    if (
      referenceCount === undefined &&
      !window.confirm('战斗精灵引用仍在刷新；修改动作 ABI 会影响全部使用位置。继续吗？')
    )
      return false
    if (
      referenceCount !== undefined &&
      referenceCount > 1 &&
      !window.confirm(`该定义被 ${referenceCount} 处内容共享，修改动作 ABI 会同时生效。继续吗？`)
    )
      return false
    try {
      if (
        !session.dispatch(
          new UpdateBattleSpriteDefinitionCommand(
            definition.id,
            { profile: next },
            { asset: definition.asset, sha256: revision, actualFrameCount: frames.length },
            props.getCurrentReferenceIndex,
          ),
        )
      ) {
        setEditError('战斗精灵定义已变化，请重新选择后再编辑。')
        return false
      }
      setEditError('')
      return true
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : String(reason))
      return false
    }
  }

  const patchCounts = (key: 'idle' | 'magic' | 'attack', count: number): boolean => {
    if (!profile) return false
    const counts = {
      idle: profile.idle.count,
      magic: profile.magic.count,
      attack: profile.attack.count,
      [key]: Math.max(key === 'idle' ? 1 : 0, count),
    }
    return patchProfile({
      ...profile,
      idle: { start: 0, count: counts.idle },
      magic: { start: counts.idle, count: counts.magic },
      attack: { start: counts.idle + counts.magic, count: counts.attack },
    })
  }

  return (
    <div className="enemy-anim">
      <div className="ea-head">
        <div className="ea-heading">
          <h4>外观 · 战斗精灵</h4>
          <p>选择共享精灵定义，并配置动作帧、播放节奏与战场位置。</p>
        </div>
        <div className="ea-binding">
          <BattleSpritePicker
            value={enemy.battleSprite}
            definitions={definitions}
            kind="enemy"
            onChange={(id) => session.dispatch(new SetEnemyBattleSpriteCommand(enemy.id, id))}
            onOpenDefinition={props.onOpenDefinition}
            ariaLabel="敌人战斗精灵"
          />
          {frames.length ? <DsTag tone="neutral">{frames.length} 帧</DsTag> : null}
          {(referenceCount ?? 0) > 1 ? (
            <DsTag tone="neutral">共享 {referenceCount} 处</DsTag>
          ) : null}
          <DsButton
            variant="secondary"
            icon="upload"
            onClick={() => setUploading((value) => !value)}
            aria-expanded={uploading}
          >
            {uploading ? '收起上传' : '上传新定义'}
          </DsButton>
        </div>
      </div>
      {uploading && (
        <BattleSpriteUploader
          assetBase={assetBase}
          onApply={async (bytes, frameCount) => {
            const prepared = await prepareBattleSpriteImport(session.getState(), {
              hint: enemy.id,
              label: `${enemy.id} 战斗精灵`,
              kind: 'enemy',
              bytes,
              frameCount,
              reader: assetReader,
            })
            session.dispatch(
              new CompositeCommand('上传并设置敌人战斗精灵', [
                new AddBattleSpriteCommand(
                  prepared.definition,
                  prepared.record,
                  prepared.bytes,
                  prepared.frameCount,
                ),
                new SetEnemyBattleSpriteCommand(enemy.id, prepared.definition.id),
              ]),
            )
            setUploading(false)
          }}
          onCancel={() => setUploading(false)}
        />
      )}
      {loadError && (
        <div className="err" role="status" aria-live="polite">
          精灵加载失败：{loadError}
        </div>
      )}
      <div className="ea-body">
        <section className="ea-stage" aria-label="战斗精灵动作预览">
          <canvas
            ref={canvasRef}
            className="ds-pixel-canvas"
            role="img"
            aria-label={`${enemy.id}敌人战斗动画预览`}
          />
          <fieldset className="ea-modes">
            <legend className="ds-visually-hidden">预览动作</legend>
            {MODES.map((entry) => (
              <DsButton
                key={entry.id}
                size="compact"
                variant={mode === entry.id ? 'primary' : 'quiet'}
                aria-pressed={mode === entry.id}
                onClick={() => setMode(entry.id)}
              >
                {entry.label}
              </DsButton>
            ))}
          </fieldset>
          {mode === 'magic' && profile?.magic.count === 0 && (
            <span className="hint">（该定义无施法帧）</span>
          )}
          {mode !== 'idle' && profile?.actTicksPerFrame === 0 && (
            <span className="hint">（0 tick：瞬时显示该动作末帧）</span>
          )}
        </section>
        {profile && (
          <div className="ea-settings">
            <fieldset className="ea-field-group" data-enemy-animation-group="frames">
              <legend>动作帧</legend>
              <div className="ea-field-grid ea-field-grid--frames">
                <DsField id={`${fieldIdPrefix}-idle-count`} label="待机帧">
                  <NumberInput
                    id={`${fieldIdPrefix}-idle-count`}
                    draftKey={`enemy:${enemy.id}:battle-sprite:${definition?.id ?? enemy.battleSprite}:profile:idle.count`}
                    value={profile.idle.count}
                    disabled={!profileReady}
                    min={1}
                    syncToken={session.getHistoryVersion()}
                    onChange={(n) => patchCounts('idle', n)}
                  />
                </DsField>
                <DsField id={`${fieldIdPrefix}-magic-count`} label="施法帧">
                  <NumberInput
                    id={`${fieldIdPrefix}-magic-count`}
                    draftKey={`enemy:${enemy.id}:battle-sprite:${definition?.id ?? enemy.battleSprite}:profile:magic.count`}
                    value={profile.magic.count}
                    disabled={!profileReady}
                    syncToken={session.getHistoryVersion()}
                    onChange={(n) => patchCounts('magic', n)}
                  />
                </DsField>
                <DsField id={`${fieldIdPrefix}-attack-count`} label="攻击帧">
                  <NumberInput
                    id={`${fieldIdPrefix}-attack-count`}
                    draftKey={`enemy:${enemy.id}:battle-sprite:${definition?.id ?? enemy.battleSprite}:profile:attack.count`}
                    value={profile.attack.count}
                    disabled={!profileReady}
                    syncToken={session.getHistoryVersion()}
                    onChange={(n) => patchCounts('attack', n)}
                  />
                </DsField>
              </div>
            </fieldset>
            <fieldset className="ea-field-group" data-enemy-animation-group="timing">
              <legend>节奏与位置</legend>
              <div className="ea-field-grid">
                <DsField id={`${fieldIdPrefix}-idle-speed`} label="待机速度">
                  <NumberInput
                    id={`${fieldIdPrefix}-idle-speed`}
                    draftKey={`enemy:${enemy.id}:battle-sprite:${definition?.id ?? enemy.battleSprite}:profile:idleTicksPerFrame`}
                    value={profile.idleTicksPerFrame}
                    disabled={!profileReady}
                    min={1}
                    syncToken={session.getHistoryVersion()}
                    onChange={(idleTicksPerFrame) =>
                      patchProfile({ ...profile, idleTicksPerFrame })
                    }
                  />
                </DsField>
                <DsField id={`${fieldIdPrefix}-action-speed`} label="行动速度">
                  <NumberInput
                    id={`${fieldIdPrefix}-action-speed`}
                    draftKey={`enemy:${enemy.id}:battle-sprite:${definition?.id ?? enemy.battleSprite}:profile:actTicksPerFrame`}
                    value={profile.actTicksPerFrame}
                    disabled={!profileReady}
                    syncToken={session.getHistoryVersion()}
                    onChange={(actTicksPerFrame) => patchProfile({ ...profile, actTicksPerFrame })}
                  />
                </DsField>
                <DsField id={`${fieldIdPrefix}-y-offset`} label="Y 偏移">
                  <NumberInput
                    id={`${fieldIdPrefix}-y-offset`}
                    draftKey={`enemy:${enemy.id}:yPosOffset`}
                    value={enemy.yPosOffset}
                    min={-200}
                    syncToken={session.getHistoryVersion()}
                    onChange={(yPosOffset) =>
                      session.dispatch(new UpdateEnemyCommand(enemy.id, { yPosOffset }))
                    }
                  />
                </DsField>
              </div>
            </fieldset>
            {editError && (
              <div className="err ea-settings__error" aria-live="polite">
                {editError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
