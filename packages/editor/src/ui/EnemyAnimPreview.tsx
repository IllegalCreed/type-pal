import type { BattleSpriteDef, EnemyBattleSpriteProfile, EnemyDef } from '@type-pal/content'
import { collectBattleSpriteDefinitionReferences } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import {
  BattleSpriteAssetCache,
  bakeFrame,
  loadBattleSpriteDefinition,
  loadStandardPalette,
} from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
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
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { BattleSpriteUploader } from './BattleSpriteUploader.js'

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
  value: number
  min?: number
  max?: number
  onChange: (value: number) => void
}) {
  return (
    <input
      className="in mono"
      type="number"
      value={props.value}
      min={props.min ?? 0}
      max={props.max}
      onWheel={(event) => event.currentTarget.blur()}
      onChange={(event) => props.onChange(Math.floor(event.target.valueAsNumber || 0))}
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
}) {
  const { enemy, definitions, assetBase, assetReader, session } = props
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
  const referenceCount = definition
    ? collectBattleSpriteDefinitionReferences(session.getState()).filter(
        (reference) => reference.battleSprite === definition.id,
      ).length
    : 0
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

  const patchProfile = (next: EnemyBattleSpriteProfile): void => {
    if (!definition || !revision || !frames.length) return
    if (
      referenceCount > 1 &&
      !window.confirm(`该定义被 ${referenceCount} 处内容共享，修改动作 ABI 会同时生效。继续吗？`)
    )
      return
    try {
      session.dispatch(
        new UpdateBattleSpriteDefinitionCommand(
          definition.id,
          { profile: next },
          { asset: definition.asset, sha256: revision, actualFrameCount: frames.length },
        ),
      )
      setEditError('')
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : String(reason))
    }
  }

  const patchCounts = (key: 'idle' | 'magic' | 'attack', count: number): void => {
    if (!profile) return
    const counts = {
      idle: profile.idle.count,
      magic: profile.magic.count,
      attack: profile.attack.count,
      [key]: Math.max(key === 'idle' ? 1 : 0, count),
    }
    patchProfile({
      ...profile,
      idle: { start: 0, count: counts.idle },
      magic: { start: counts.idle, count: counts.magic },
      attack: { start: counts.idle + counts.magic, count: counts.attack },
    })
  }

  return (
    <div className="enemy-anim">
      <div className="ea-head">
        <span className="t">外观 · 战斗精灵</span>
        <BattleSpritePicker
          value={enemy.battleSprite}
          definitions={definitions}
          kind="enemy"
          onChange={(id) => session.dispatch(new SetEnemyBattleSpriteCommand(enemy.id, id))}
          onOpenDefinition={props.onOpenDefinition}
          ariaLabel="敌人战斗精灵"
        />
        <span className="hint">{frames.length ? `${frames.length} 帧` : ''}</span>
        {referenceCount > 1 && <span className="hint2">共享定义 · {referenceCount} 处引用</span>}
        <button type="button" className="mini-txt" onClick={() => setUploading((value) => !value)}>
          ⬆ 上传新定义
        </button>
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
        <div className="ea-stage">
          <canvas
            ref={canvasRef}
            style={{ imageRendering: 'pixelated' }}
            role="img"
            aria-label={`${enemy.id}敌人战斗动画预览`}
          />
          <div className="ea-modes">
            {MODES.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className={`tool${mode === entry.id ? ' active' : ''}`}
                onClick={() => setMode(entry.id)}
              >
                {entry.label}
              </button>
            ))}
          </div>
          {mode === 'magic' && profile?.magic.count === 0 && (
            <span className="hint">（该定义无施法帧）</span>
          )}
          {mode !== 'idle' && profile?.actTicksPerFrame === 0 && (
            <span className="hint">（0 tick：瞬时显示该动作末帧）</span>
          )}
        </div>
        {profile && (
          <div className="ea-fields">
            <div className="ea-field">
              <span>待机帧</span>
              <NumberInput
                value={profile.idle.count}
                min={1}
                onChange={(n) => patchCounts('idle', n)}
              />
            </div>
            <div className="ea-field">
              <span>施法帧</span>
              <NumberInput value={profile.magic.count} onChange={(n) => patchCounts('magic', n)} />
            </div>
            <div className="ea-field">
              <span>攻击帧</span>
              <NumberInput
                value={profile.attack.count}
                onChange={(n) => patchCounts('attack', n)}
              />
            </div>
            <div className="ea-field">
              <span>待机速</span>
              <NumberInput
                value={profile.idleTicksPerFrame}
                min={1}
                onChange={(idleTicksPerFrame) => patchProfile({ ...profile, idleTicksPerFrame })}
              />
            </div>
            <div className="ea-field">
              <span>行动速</span>
              <NumberInput
                value={profile.actTicksPerFrame}
                onChange={(actTicksPerFrame) => patchProfile({ ...profile, actTicksPerFrame })}
              />
            </div>
            <div className="ea-field">
              <span>Y 偏移</span>
              <NumberInput
                value={enemy.yPosOffset}
                min={-200}
                onChange={(yPosOffset) =>
                  session.dispatch(new UpdateEnemyCommand(enemy.id, { yPosOffset }))
                }
              />
            </div>
            {editError && (
              <div className="err" aria-live="polite">
                {editError}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
