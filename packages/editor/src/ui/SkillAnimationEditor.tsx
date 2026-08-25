import type { AssetCatalogV1, AssetId, SkillAnimation } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useId } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { DsCheckbox, DsDraftNumberInput, DsField, DsSelect } from './design-system/controls.js'
import { FireEffectPreview } from './FireEffectPreview.js'
import { SoundPicker } from './SoundPicker.js'

const NO_FIRE_EFFECT_SPRITE = 0xffff

function AnimationNumberField(props: {
  id: string
  label: string
  value: number | undefined
  placeholder?: string
  required?: boolean
  help?: string
  min?: number
  max?: number
  emptyValue?: number
  draftKey: string
  syncToken: string | number
  onChange: (value: number | undefined) => void
}) {
  return (
    <DsField
      id={props.id}
      label={props.label}
      required={props.required}
      help={props.help}
      className="skill-animation-field"
    >
      {(control) => (
        <DsDraftNumberInput
          {...control}
          draftKey={props.draftKey}
          syncToken={props.syncToken}
          monospace
          name={props.id}
          autoComplete="off"
          min={props.min}
          max={props.max}
          enforceRange={false}
          value={props.value === props.emptyValue ? undefined : props.value}
          allowEmpty={!props.required || props.emptyValue !== undefined}
          integer
          placeholder={props.placeholder}
          onWheel={(event) => event.currentTarget.blur()}
          onCommit={(raw) => {
            if (raw === undefined) {
              props.onChange(props.emptyValue ?? (props.required ? (props.min ?? 0) : undefined))
              return
            }
            const integral = Math.trunc(raw)
            const lowerBounded = Math.max(props.min ?? integral, integral)
            props.onChange(Math.min(props.max ?? lowerBounded, lowerBounded))
          }}
        />
      )}
    </DsField>
  )
}

export function SkillAnimationEditor(props: {
  animation: SkillAnimation
  onChange: (animation: SkillAnimation) => void
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase?: AssetBase
  onOpenSound?: (id: AssetId) => void
  draftScope: string
  syncToken: string | number
}) {
  const fieldPrefix = useId()
  const fieldId = (name: string): string => `${fieldPrefix}-${name}`
  const hasFireEffect = props.animation.effectSprite !== NO_FIRE_EFFECT_SPRITE
  const patch = <K extends keyof SkillAnimation>(
    key: K,
    value: SkillAnimation[K] | undefined,
  ): void => {
    const next = { ...props.animation }
    if (value === undefined) delete next[key]
    else next[key] = value
    props.onChange(next)
  }

  return (
    <div className="skill-animation-editor">
      <div className="skill-animation-layout">
        <div className="skill-animation-groups">
          <fieldset className="skill-animation-group" data-animation-group="placement">
            <legend>素材与落点</legend>
            <div className="skill-animation-group__grid">
              <AnimationNumberField
                id={fieldId('effect-sprite')}
                label="特效号"
                value={props.animation.effectSprite}
                placeholder="无特效"
                help="填写 FIRE 特效编号；留空表示无特效。"
                min={0}
                max={NO_FIRE_EFFECT_SPRITE - 1}
                emptyValue={NO_FIRE_EFFECT_SPRITE}
                draftKey={`${props.draftScope}:effectSprite`}
                syncToken={props.syncToken}
                onChange={(effectSprite) =>
                  patch('effectSprite', effectSprite ?? NO_FIRE_EFFECT_SPRITE)
                }
              />
              <DsField id={fieldId('placement')} label="落点" className="skill-animation-field">
                <DsSelect
                  id={fieldId('placement')}
                  value={props.animation.placement ?? 'normal'}
                  options={[
                    { value: 'normal', label: '目标点' },
                    { value: 'attackAll', label: '逐敌各放' },
                    { value: 'attackWhole', label: '敌群中心' },
                    { value: 'attackField', label: '全屏' },
                  ]}
                  onValueChange={(value) =>
                    patch('placement', value as SkillAnimation['placement'])
                  }
                />
              </DsField>
              <AnimationNumberField
                id={fieldId('x-offset')}
                label="X 偏移"
                value={props.animation.xOffset}
                placeholder="0"
                draftKey={`${props.draftScope}:xOffset`}
                syncToken={props.syncToken}
                onChange={(value) => patch('xOffset', value)}
              />
              <AnimationNumberField
                id={fieldId('y-offset')}
                label="Y 偏移"
                value={props.animation.yOffset}
                placeholder="0"
                draftKey={`${props.draftScope}:yOffset`}
                syncToken={props.syncToken}
                onChange={(value) => patch('yOffset', value)}
              />
              <AnimationNumberField
                id={fieldId('layer-offset')}
                label="层级偏移"
                value={props.animation.layerOffset}
                placeholder="0"
                draftKey={`${props.draftScope}:layerOffset`}
                syncToken={props.syncToken}
                onChange={(value) => patch('layerOffset', value)}
              />
            </div>
          </fieldset>

          <fieldset className="skill-animation-group" data-animation-group="playback">
            <legend>播放与循环</legend>
            <div className="skill-animation-group__grid">
              <AnimationNumberField
                id={fieldId('speed')}
                label="速度"
                value={props.animation.speed}
                placeholder="0"
                draftKey={`${props.draftScope}:speed`}
                syncToken={props.syncToken}
                onChange={(value) => patch('speed', value)}
              />
              <AnimationNumberField
                id={fieldId('fire-delay')}
                label="循环起点"
                value={props.animation.fireDelay}
                placeholder="0"
                draftKey={`${props.draftScope}:fireDelay`}
                syncToken={props.syncToken}
                onChange={(value) => patch('fireDelay', value)}
              />
              <AnimationNumberField
                id={fieldId('effect-times')}
                label="循环次数"
                value={props.animation.effectTimes}
                placeholder="1"
                draftKey={`${props.draftScope}:effectTimes`}
                syncToken={props.syncToken}
                onChange={(value) => patch('effectTimes', value)}
              />
            </div>
          </fieldset>

          <fieldset className="skill-animation-group" data-animation-group="feedback">
            <legend>画面与声音</legend>
            <div className="skill-animation-group__grid">
              <AnimationNumberField
                id={fieldId('shake')}
                label="震屏帧"
                value={props.animation.shake}
                placeholder="0"
                draftKey={`${props.draftScope}:shake`}
                syncToken={props.syncToken}
                onChange={(value) => patch('shake', value)}
              />
              <AnimationNumberField
                id={fieldId('pre-shake-frames')}
                label="前置震屏帧"
                value={props.animation.preShake?.frames}
                placeholder="关闭"
                min={1}
                draftKey={`${props.draftScope}:preShake.frames`}
                syncToken={props.syncToken}
                onChange={(frames) =>
                  patch(
                    'preShake',
                    frames === undefined
                      ? undefined
                      : {
                          frames: Math.max(1, Math.trunc(frames)),
                          level: props.animation.preShake?.level ?? 3,
                        },
                  )
                }
              />
              {props.animation.preShake && (
                <AnimationNumberField
                  id={fieldId('pre-shake-level')}
                  label="前置震屏强度"
                  value={props.animation.preShake.level}
                  required
                  min={1}
                  draftKey={`${props.draftScope}:preShake.level`}
                  syncToken={props.syncToken}
                  onChange={(level) =>
                    patch('preShake', {
                      ...props.animation.preShake!,
                      level: Math.max(1, Math.trunc(level ?? 1)),
                    })
                  }
                />
              )}
              <AnimationNumberField
                id={fieldId('wave')}
                label="屏波"
                value={props.animation.wave}
                placeholder="0"
                draftKey={`${props.draftScope}:wave`}
                syncToken={props.syncToken}
                onChange={(value) => patch('wave', value)}
              />
              <DsField
                id={fieldId('sound')}
                label="特效音"
                className="skill-animation-field skill-animation-field--wide"
              >
                <SoundPicker
                  id={fieldId('sound')}
                  value={props.animation.sound}
                  onChange={(sound) => patch('sound', sound)}
                  catalog={props.assetCatalog}
                  reader={props.assetReader}
                  allowUnset
                  onOpenAsset={props.onOpenSound}
                />
              </DsField>
              <div className="skill-animation-check skill-animation-field--wide">
                <DsCheckbox
                  checked={props.animation.keepEffect === true}
                  onChange={(event) => patch('keepEffect', event.target.checked || undefined)}
                  label="保留特效末帧"
                />
              </div>
            </div>
          </fieldset>
        </div>

        <aside className="skill-animation-preview-panel" aria-label="FIRE 特效预览">
          <header className="skill-animation-preview-panel__header">
            <strong>实时预览</strong>
            <span>{hasFireEffect ? `FIRE #${props.animation.effectSprite}` : '无特效'}</span>
          </header>
          {!hasFireEffect ? (
            <div className="skill-animation-preview-panel__empty" role="status">
              该技能不播放 FIRE 特效。
            </div>
          ) : props.assetBase ? (
            <FireEffectPreview
              assetBase={props.assetBase}
              anim={props.animation}
              assetReader={props.assetReader}
            />
          ) : (
            <div className="skill-animation-preview-panel__empty" role="status">
              当前环境未载入 FIRE 资源；参数仍可编辑和保存。
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
