import type { AssetCatalogV1, AssetId, SkillAnimation } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { FireEffectPreview } from './FireEffectPreview.js'
import { SoundPicker } from './SoundPicker.js'

function AnimationNumberField(props: {
  label: string
  value: number | undefined
  placeholder?: string
  required?: boolean
  min?: number
  onChange: (value: number | undefined) => void
}) {
  return (
    <label className="skill-animation-field">
      <span className="lb">{props.label}</span>
      <input
        className="in mono ef-num"
        type="number"
        min={props.min}
        value={props.value ?? ''}
        placeholder={props.placeholder}
        onWheel={(event) => event.currentTarget.blur()}
        onChange={(event) => {
          const raw = event.currentTarget.valueAsNumber
          if (!Number.isFinite(raw)) {
            props.onChange(props.required ? (props.min ?? 0) : undefined)
            return
          }
          props.onChange(props.required ? Math.max(props.min ?? raw, Math.trunc(raw)) : raw)
        }}
      />
    </label>
  )
}

export function SkillAnimationEditor(props: {
  animation: SkillAnimation
  onChange: (animation: SkillAnimation) => void
  assetCatalog: AssetCatalogV1
  assetReader: EditorAssetReader
  assetBase?: AssetBase
  onOpenSound?: (id: AssetId) => void
}) {
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
      <div className="skill-animation-fields">
        <AnimationNumberField
          label="特效号"
          value={props.animation.effectSprite}
          required
          min={0}
          onChange={(effectSprite) => patch('effectSprite', effectSprite ?? 0)}
        />
        <label className="skill-animation-field">
          <span className="lb">落点</span>
          <select
            className="in"
            value={props.animation.placement ?? 'normal'}
            onChange={(event) =>
              patch('placement', event.target.value as SkillAnimation['placement'])
            }
          >
            <option value="normal">目标点</option>
            <option value="attackAll">逐敌各放</option>
            <option value="attackWhole">敌群中心</option>
            <option value="attackField">全屏</option>
          </select>
        </label>
        <AnimationNumberField
          label="X 偏移"
          value={props.animation.xOffset}
          placeholder="0"
          onChange={(value) => patch('xOffset', value)}
        />
        <AnimationNumberField
          label="Y 偏移"
          value={props.animation.yOffset}
          placeholder="0"
          onChange={(value) => patch('yOffset', value)}
        />
        <AnimationNumberField
          label="层级偏移"
          value={props.animation.layerOffset}
          placeholder="0"
          onChange={(value) => patch('layerOffset', value)}
        />
        <AnimationNumberField
          label="速度"
          value={props.animation.speed}
          placeholder="0"
          onChange={(value) => patch('speed', value)}
        />
        <AnimationNumberField
          label="循环起点"
          value={props.animation.fireDelay}
          placeholder="0"
          onChange={(value) => patch('fireDelay', value)}
        />
        <AnimationNumberField
          label="循环次数"
          value={props.animation.effectTimes}
          placeholder="1"
          onChange={(value) => patch('effectTimes', value)}
        />
        <AnimationNumberField
          label="震屏帧"
          value={props.animation.shake}
          placeholder="0"
          onChange={(value) => patch('shake', value)}
        />
        <AnimationNumberField
          label="前置震屏帧"
          value={props.animation.preShake?.frames}
          placeholder="关闭"
          min={1}
          onChange={(frames) =>
            patch(
              'preShake',
              frames === undefined
                ? undefined
                : { frames: Math.max(1, Math.trunc(frames)), level: props.animation.preShake?.level ?? 3 },
            )
          }
        />
        {props.animation.preShake && (
          <AnimationNumberField
            label="前置震屏强度"
            value={props.animation.preShake.level}
            required
            min={1}
            onChange={(level) =>
              patch('preShake', {
                ...props.animation.preShake!,
                level: Math.max(1, Math.trunc(level ?? 1)),
              })
            }
          />
        )}
        <AnimationNumberField
          label="屏波"
          value={props.animation.wave}
          placeholder="0"
          onChange={(value) => patch('wave', value)}
        />
        <div className="skill-animation-field">
          <span className="lb">特效音</span>
          <SoundPicker
            value={props.animation.sound}
            onChange={(sound) => patch('sound', sound)}
            catalog={props.assetCatalog}
            reader={props.assetReader}
            allowUnset
            onOpenAsset={props.onOpenSound}
          />
        </div>
        <label className="skill-animation-check">
          <input
            type="checkbox"
            checked={props.animation.keepEffect === true}
            onChange={(event) => patch('keepEffect', event.target.checked || undefined)}
          />
          保留特效末帧
        </label>
      </div>
      {props.assetBase ? (
        <FireEffectPreview
          assetBase={props.assetBase}
          anim={props.animation}
          assetReader={props.assetReader}
        />
      ) : null}
    </div>
  )
}
