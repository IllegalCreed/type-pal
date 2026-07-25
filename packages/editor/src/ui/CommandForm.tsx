/**
 * 指令属性表单(C-track v1)—— 事件模式右栏:选中树行 → 编辑该指令参数。
 *
 * 高频指令给专控件;其余(branch/startBattle/confirm/页切换等结构类)
 * 走 JSON 兜底(textarea + 应用,保证全指令可编)。每次变更即 onChange(整指令替换,
 * 由 EventMode 经 script-edit 纯函数 + UpdateScriptCommand 落进 EditSession)。
 *
 * 对话文本:cue.rows[].text 是 TextId(locale 键);编辑即改写为**字面量**(lookupText
 * 未命中回显原文,引擎/预览同语义)——新写的行直接放中文,旧行一改即脱离 locale 键。
 */
import type {
  AmbienceDef,
  AssetCatalogV1,
  BattleSpriteDef,
  Command,
  Facing,
  GridPos,
  LoadSceneCommand,
  Locale,
  SceneDef,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  SpriteDef,
  WalkSpeed,
} from '@type-pal/content'
import {
  type ActorDef,
  deriveScriptChunk,
  lookupText,
  resolveEntitySpriteId,
} from '@type-pal/content'
import type { AssetBase, AudioAssetReader } from '@type-pal/reforge'
import { useEffect, useState } from 'react'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import type { ScriptReferenceCatalog } from '../core/script-reference-catalog.js'
import { defaultActionTargetForEntity, sortedSpriteActions } from '../core/sprite-actions.js'
import { BattleSpritePicker } from './BattleSpritePicker.js'
import { ImageAssetPicker } from './ImageAssetPicker.js'
import { MusicPicker } from './MusicPicker.js'
import { NamedIdPicker } from './NamedIdPicker.js'
import { SoundPicker } from './SoundPicker.js'

const FACINGS: Facing[] = ['down', 'left', 'up', 'right']
const SPEEDS: WalkSpeed[] = ['slow', 'normal', 'fast', 'run']

export type LoadSceneTarget =
  | { mode: 'default' }
  | { mode: 'entry'; entryId: string }
  | { mode: 'pos'; pos: GridPos }

export function makeLoadScene(
  scene: string,
  target: LoadSceneTarget,
  facing?: Facing,
): LoadSceneCommand {
  const facingPatch = facing ? { facing } : {}
  if (target.mode === 'entry')
    return { kind: 'loadScene', scene, entryId: target.entryId, ...facingPatch }
  if (target.mode === 'pos')
    return { kind: 'loadScene', scene, pos: { ...target.pos }, ...facingPatch }
  return { kind: 'loadScene', scene, ...facingPatch }
}

export function retargetLoadScene(command: LoadSceneCommand, scene: string): LoadSceneCommand {
  return makeLoadScene(scene, { mode: 'default' }, command.facing)
}

function Row(props: { label: string; children: React.ReactNode }) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: Row 的 children 契约是表单控件，静态分析无法穿透 ReactNode。
    <label className="cf-row">
      <span className="cf-label">{props.label}</span>
      {props.children}
    </label>
  )
}

function Num(props: { value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <input
      className="in cf-num"
      type="number"
      value={props.value}
      step={props.step ?? 1}
      onChange={(e) => props.onChange(Number(e.target.value))}
      // 防滚轮误改:number input 聚焦时滚轮会步进值(滚右栏列表时极易把坐标滚歪)
      onWheel={(e) => e.currentTarget.blur()}
    />
  )
}

function Txt(props: { value: string; onChange: (s: string) => void; placeholder?: string }) {
  return (
    <input
      className="in"
      value={props.value}
      placeholder={props.placeholder}
      onChange={(e) => props.onChange(e.target.value)}
    />
  )
}

function Sel<T extends string>(props: {
  value: T
  options: readonly T[]
  /** 可选显示名(与 options 同序;缺省显示 option 值本身)。 */
  labels?: readonly string[]
  onChange: (v: T) => void
}) {
  return (
    <select
      className="in"
      value={props.value}
      onChange={(e) => props.onChange(e.target.value as T)}
    >
      {props.options.map((o, i) => (
        <option key={o} value={o}>
          {props.labels?.[i] ?? o}
        </option>
      ))}
    </select>
  )
}

/** 实体 id 下拉(含空 = 手输)。 */
function EntitySel(props: { value: string; scene: SceneDef; onChange: (id: string) => void }) {
  return (
    <select className="in" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      {props.scene.entities.map((e) => (
        <option key={e.id} value={e.id}>
          {e.id}
        </option>
      ))}
      {props.scene.entities.some((e) => e.id === props.value) ? null : (
        <option value={props.value}>{props.value}(不在场)</option>
      )}
    </select>
  )
}

/** JSON 兜底编辑器。 */
function JsonForm(props: { cmd: Command; onChange: (c: Command) => void }) {
  const [text, setText] = useState(() => JSON.stringify(props.cmd, null, 2))
  const [err, setErr] = useState('')
  // 外部指令变化(选中另一行)→ 重置文本
  useEffect(() => {
    setText(JSON.stringify(props.cmd, null, 2))
    setErr('')
  }, [props.cmd])
  return (
    <div className="cf-json">
      <textarea
        className="in cf-ta"
        value={text}
        onChange={(e) => setText(e.target.value)}
        spellCheck={false}
      />
      {err ? <div className="cf-err">{err}</div> : null}
      <button
        type="button"
        className="pv-btn"
        onClick={() => {
          try {
            const parsed = JSON.parse(text) as Command
            if (
              typeof parsed !== 'object' ||
              !parsed ||
              typeof (parsed as { kind?: unknown }).kind !== 'string'
            )
              throw new Error('缺少 kind 字段')
            setErr('')
            props.onChange(parsed)
          } catch (e) {
            setErr(e instanceof Error ? e.message : String(e))
          }
        }}
      >
        应用 JSON
      </button>
    </div>
  )
}

export function CommandForm(props: {
  cmd: Command
  scene: SceneDef
  locale: Locale
  assetCatalog: AssetCatalogV1
  audioResolver: AudioAssetReader
  assetReader: EditorAssetReader
  /** 全场景(loadScene 目标下拉;W4)。缺省 = 只有当前场景。 */
  scenes?: SceneDef[]
  /** 资产 base(战场选择器预览;B2)。缺省退化数字输入。 */
  assetBase?: AssetBase
  /** 角色表(setParty 队伍编辑下拉;C7)。缺省退化 JSON 兜底。 */
  actors?: Record<string, ActorDef>
  battleSprites: readonly BattleSpriteDef[]
  /** 大世界精灵与预制动作；playEntityAction 使用稳定 sprite/action 复合引用。 */
  sprites?: readonly SpriteDef[]
  /** 氛围表(setAmbience 下拉;W6)。缺省退化文本输入。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 店下拉)。缺省退化数字输入。 */
  shops?: ShopDef[]
  /** 所有已有名称表的稳定引用；树、条件摘要与表单共用同一真值。 */
  references: ScriptReferenceCatalog
  /** N6 作者共享脚本目录；用于区分作者共享目标与场景内部目标。 */
  scriptIndex?: ScriptIndexV1
  /** 当前执行上下文是否保证有可继承 self。 */
  hasImplicitSelf?: boolean
  /** 打开 callScript/jumpScript 目标；调用方决定留在场景内或进入作者共享库。 */
  onOpenScript?: (id: string) => void
  onOpenSound?: (id: string) => void
  onOpenImage?: (id: string) => void
  onOpenBattleSprite?: (id: string) => void
  onOpenSpriteAction?: (spriteId: string, actionId: string) => void
  /** Legacy editors keep the escape-hatch JSON editor; canonical v5 authoring hides it. */
  showRawJson?: boolean
  onChange: (next: Command) => void
}) {
  const {
    cmd,
    scene,
    locale,
    assetCatalog,
    audioResolver,
    assetReader,
    scenes,
    actors,
    battleSprites,
    sprites = [],
    ambiences,
    shops,
    references,
    scriptIndex,
    hasImplicitSelf,
    onOpenScript,
    onOpenSound,
    onOpenImage,
    onOpenBattleSprite,
    onOpenSpriteAction,
    showRawJson = true,
    onChange,
  } = props
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)
  const actorChoices = references.choices('actor')
  const spriteChoices = references.choices('sprite')

  switch (cmd.kind) {
    case 'dialog': {
      const cue = cmd.cue
      const firstPortrait = Object.entries(assetCatalog.assets).find(
        ([, record]) => record.kind === 'portrait',
      )?.[0]
      const setCue = (patch: object): void => onChange({ ...cmd, cue: { ...cue, ...patch } })
      const setRow = (index: number, patch: object): void =>
        setCue({
          rows: cue.rows.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
        })
      return (
        <>
          <Row label="说话人">
            <Txt
              value={cue.speaker ? lookupText(cue.speaker, locale) : ''}
              onChange={(s) => setCue({ speaker: s || undefined })}
              placeholder="(旁白)"
            />
          </Row>
          {cue.rows.map((row, index) => (
            <div className="cf-dialog-row" key={index}>
              <Row label={`第 ${index + 1} 行`}>
                <textarea
                  className="in cf-ta"
                  value={lookupText(row.text, locale)}
                  onChange={(e) => setRow(index, { text: e.target.value })}
                  spellCheck={false}
                />
              </Row>
              <div className="cf-dialog-row-actions">
                <label className="cf-inline">
                  <input
                    type="checkbox"
                    checked={row.speed !== undefined}
                    onChange={(e) => setRow(index, { speed: e.target.checked ? 24 : undefined })}
                  />
                  自定速度
                </label>
                {row.speed !== undefined ? (
                  <Num value={row.speed} onChange={(speed) => setRow(index, { speed })} step={8} />
                ) : null}
                <button
                  type="button"
                  className="pv-btn"
                  title="删除此行"
                  aria-label="删除此行"
                  disabled={cue.rows.length === 1}
                  onClick={() =>
                    setCue({ rows: cue.rows.filter((_, rowIndex) => rowIndex !== index) })
                  }
                >
                  ×
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            className="pv-btn"
            title="添加一行"
            onClick={() => setCue({ rows: [...cue.rows, { text: '(新一行)' }] })}
          >
            ＋ 行
          </button>
          <Row label="位置">
            <Sel
              value={cue.slot ?? 'bottom'}
              options={['bottom', 'top', 'narration', 'center'] as const}
              labels={['下方', '上方', '横向卷轴', '中央']}
              onChange={(v) => setCue({ slot: v === 'bottom' ? undefined : v })}
            />
          </Row>
          <Row label="自动推进">
            <label className="cf-inline">
              <input
                type="checkbox"
                checked={cue.autoAdvance !== undefined}
                onChange={(e) => setCue({ autoAdvance: e.target.checked ? 0 : undefined })}
              />
              启用
            </label>
            {cue.autoAdvance !== undefined ? (
              <Num
                value={cue.autoAdvance}
                onChange={(autoAdvance) => setCue({ autoAdvance })}
                step={40}
              />
            ) : null}
          </Row>
          <Row label="光标">
            <Sel
              value={String(cue.cursorFrame ?? 0) as '0' | '1' | '2'}
              options={['0', '1', '2'] as const}
              labels={['默认', '样式 1', '样式 2']}
              onChange={(value) => {
                const cursorFrame = Number(value) as 0 | 1 | 2
                setCue({ cursorFrame: cursorFrame === 0 ? undefined : cursorFrame })
              }}
            />
          </Row>
          <Row label="立绘">
            <label className="cf-inline">
              <input
                type="checkbox"
                checked={cue.portrait !== undefined}
                disabled={!cue.portrait && !firstPortrait}
                onChange={(e) =>
                  setCue({
                    portrait:
                      e.target.checked && firstPortrait
                        ? { asset: firstPortrait, side: 'right' as const }
                        : undefined,
                  })
                }
              />
              启用
            </label>
            {cue.portrait ? (
              <>
                <ImageAssetPicker
                  value={cue.portrait.asset}
                  kind="portrait"
                  catalog={assetCatalog}
                  reader={assetReader}
                  showThumbnail={false}
                  ariaLabel="对话立绘"
                  onOpenAsset={onOpenImage}
                  onChange={(asset) => {
                    if (asset) setCue({ portrait: { asset, side: cue.portrait?.side ?? 'right' } })
                  }}
                />
                <Sel
                  value={cue.portrait.side}
                  options={['left', 'right'] as const}
                  labels={['左', '右']}
                  onChange={(side) =>
                    setCue({
                      portrait: { asset: cue.portrait?.asset ?? firstPortrait ?? '', side },
                    })
                  }
                />
              </>
            ) : null}
          </Row>
          {showRawJson ? <JsonForm cmd={cmd} onChange={onChange} /> : null}
        </>
      )
    }
    case 'wait':
      return (
        <Row label="毫秒">
          <Num value={cmd.ms} onChange={(n) => set({ ms: n })} step={40} />
        </Row>
      )
    case 'fade':
      return (
        <>
          <Row label="方向">
            <Sel
              value={cmd.dir}
              options={['in', 'out'] as const}
              onChange={(v) => set({ dir: v })}
            />
          </Row>
          <Row label="毫秒">
            <Num value={cmd.ms ?? 300} onChange={(n) => set({ ms: n })} step={60} />
          </Row>
        </>
      )
    case 'ditherScreen':
      return (
        <Row label="毫秒">
          <Num value={cmd.ms ?? 720} onChange={(n) => set({ ms: n })} step={10} />
        </Row>
      )
    case 'teleportParty':
      return (
        <>
          <Row label="col">
            <Num value={cmd.pos.col} onChange={(n) => set({ pos: { ...cmd.pos, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.pos.row} onChange={(n) => set({ pos: { ...cmd.pos, row: n } })} />
          </Row>
          <Row label="朝向">
            <Sel
              value={cmd.facing ?? 'down'}
              options={FACINGS}
              onChange={(v) => set({ facing: v })}
            />
          </Row>
        </>
      )
    case 'setPartyFacing':
      return (
        <>
          <Row label="朝向">
            <Sel value={cmd.facing} options={FACINGS} onChange={(v) => set({ facing: v })} />
          </Row>
          <Row label="姿势帧">
            <Num
              value={cmd.gesture ?? 0}
              onChange={(n) => set({ gesture: n > 0 ? n : undefined })}
            />
          </Row>
        </>
      )
    case 'moveParty':
      return (
        <>
          <Row label="col">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'moveEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="col">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
          </Row>
          <Row label="row">
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'setEntityState':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="状态">
            <Num value={cmd.state} onChange={(n) => set({ state: n })} />
          </Row>
          <p className="hint">≤0 隐藏 · 1 现身 · ≥2 现身+挡路</p>
        </>
      )
    case 'setEntityFacing':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="朝向">
            <Sel value={cmd.facing} options={FACINGS} onChange={(v) => set({ facing: v })} />
          </Row>
        </>
      )
    case 'setEntityFrame':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="帧">
            <Num value={cmd.frame} onChange={(n) => set({ frame: n })} />
          </Row>
        </>
      )
    case 'playEntityAction': {
      const actionSprites = sprites.filter((sprite) => Object.keys(sprite.poses ?? {}).length > 0)
      const selectedSprite = sprites.find((sprite) => sprite.id === cmd.sprite)
      const actions = sortedSpriteActions(selectedSprite)
      const selectedAction = actions.find((entry) => entry.id === cmd.action)
      const selectedEntity = scene.entities.find((entity) => entity.id === cmd.entity)
      const baselineSpriteId = selectedEntity
        ? resolveEntitySpriteId(selectedEntity, actors ?? {})
        : undefined
      const mismatch = !!baselineSpriteId && baselineSpriteId !== cmd.sprite
      const setEntityTarget = (entityId: string): void => {
        const entity = scene.entities.find((entry) => entry.id === entityId)
        const target = defaultActionTargetForEntity(entity, actors ?? {}, sprites)
        if (target) {
          set({ entity: entityId, sprite: target.sprite.id, action: target.action.id })
          return
        }
        const spriteId = entity ? resolveEntitySpriteId(entity, actors ?? {}) : undefined
        set({ entity: entityId, sprite: spriteId ?? '', action: '' })
      }
      const setSprite = (spriteId: string): void => {
        const sprite = sprites.find((entry) => entry.id === spriteId)
        set({ sprite: spriteId, action: sortedSpriteActions(sprite)[0]?.id ?? '' })
      }
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={setEntityTarget} />
          </Row>
          <Row label="精灵">
            <select className="in" value={cmd.sprite} onChange={(e) => setSprite(e.target.value)}>
              {actionSprites.map((sprite) => (
                <option key={sprite.id} value={sprite.id}>
                  {sprite.label} · {sprite.id}
                </option>
              ))}
              {actionSprites.some((sprite) => sprite.id === cmd.sprite) ? null : (
                <option value={cmd.sprite}>{cmd.sprite}(缺失或没有动作)</option>
              )}
            </select>
          </Row>
          <Row label="动作">
            <select
              className="in"
              value={cmd.action}
              onChange={(e) => set({ action: e.target.value })}
            >
              {actions.map(({ id, action, index }) => (
                <option key={id} value={id}>
                  #{index} {action.label} · {id}
                </option>
              ))}
              {selectedAction ? null : <option value={cmd.action}>{cmd.action}(动作不存在)</option>}
            </select>
          </Row>
          {mismatch ? (
            <p className="cf-warn">
              当前实体的基准精灵是 {baselineSpriteId}；此命令仅在之前已换装为 {cmd.sprite}{' '}
              时有效，否则运行时会明确报错。
            </p>
          ) : null}
          {!selectedAction ? (
            <p className="cf-warn">当前精灵中找不到所引用的动作，请修复引用。</p>
          ) : null}
          <Row label="播放方式">
            <Sel
              value={cmd.loop ? 'loop' : 'once'}
              options={['once', 'loop'] as const}
              labels={['单次', '循环']}
              onChange={(mode) =>
                set({ loop: mode === 'loop', wait: mode === 'loop' ? false : (cmd.wait ?? true) })
              }
            />
          </Row>
          <Row label="起始偏移(ms)">
            <Num
              value={cmd.startAtMs ?? 0}
              onChange={(value) => set({ startAtMs: value > 0 ? value : undefined })}
            />
          </Row>
          <label className="cf-inline">
            <input
              type="checkbox"
              checked={cmd.loop ? false : (cmd.wait ?? true)}
              disabled={cmd.loop}
              onChange={(event) => set({ wait: event.target.checked })}
            />
            单次动作播放完再继续脚本
          </label>
          <p className="hint">循环动作在后台持续播放；停止或被更高优先级动作替换前不会结束。</p>
          <button
            type="button"
            className="pv-btn"
            disabled={!onOpenSpriteAction || !selectedSprite}
            onClick={() => onOpenSpriteAction?.(cmd.sprite, cmd.action)}
          >
            {selectedAction ? '在精灵库编辑此动作 ↗' : '打开精灵并修复引用 ↗'}
          </button>
        </>
      )
    }
    case 'stopEntityAction':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <label className="cf-inline">
            <input
              type="checkbox"
              checked={cmd.reset}
              onChange={(event) => set({ reset: event.target.checked })}
            />
            停止后从头恢复当前页面的默认动作
          </label>
        </>
      )
    case 'stepEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="方向">
            <Sel value={cmd.dir} options={FACINGS} onChange={(v) => set({ dir: v })} />
          </Row>
        </>
      )
    case 'animEntity':
      return (
        <Row label="实体">
          <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
        </Row>
      )
    case 'nudgeEntity':
      return (
        <>
          <Row label="实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="dx(px)">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy(px)">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
        </>
      )
    case 'nudgeParty':
      return (
        <>
          <Row label="dx(px)">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy(px)">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
          <Row label="层号">
            <Num value={cmd.layer ?? 0} onChange={(n) => set({ layer: n })} />
          </Row>
        </>
      )
    case 'setActorSprite':
      return (
        <>
          <Row label="角色">
            {actorChoices.length ? (
              <NamedIdPicker
                value={cmd.actor}
                choices={actorChoices}
                kindLabel="角色"
                inputName="script-actor"
                onChange={(actor) => set({ actor })}
              />
            ) : (
              <Txt value={cmd.actor} onChange={(actor) => set({ actor })} />
            )}
          </Row>
          <Row label="大世界精灵">
            {spriteChoices.length ? (
              <NamedIdPicker
                value={cmd.sprite}
                choices={spriteChoices}
                kindLabel="大世界精灵"
                inputName="script-world-sprite"
                onChange={(sprite) => set({ sprite })}
              />
            ) : (
              <Txt value={cmd.sprite} onChange={(sprite) => set({ sprite })} />
            )}
          </Row>
        </>
      )
    case 'setActorAppearance':
      return (
        <>
          <Row label="角色">
            {actorChoices.length ? (
              <NamedIdPicker
                value={cmd.actor}
                choices={actorChoices}
                kindLabel="角色"
                inputName="script-actor"
                onChange={(actor) => set({ actor })}
              />
            ) : (
              <Txt value={cmd.actor} onChange={(actor) => set({ actor })} />
            )}
          </Row>
          <Row label="大世界精灵">
            {cmd.spriteId !== undefined && spriteChoices.length ? (
              <span className="cf-ref-row">
                <NamedIdPicker
                  value={cmd.spriteId}
                  choices={spriteChoices}
                  kindLabel="大世界精灵"
                  inputName="script-world-sprite"
                  onChange={(spriteId) => set({ spriteId })}
                />
                <button
                  type="button"
                  className="mini-txt"
                  onClick={() => set({ spriteId: undefined })}
                >
                  不修改
                </button>
              </span>
            ) : (
              <select
                className="in"
                value={cmd.spriteId ?? ''}
                onChange={(event) =>
                  set({ spriteId: event.target.value ? event.target.value : undefined })
                }
              >
                <option value="">不修改</option>
                {spriteChoices.map((sprite) => (
                  <option key={sprite.id} value={sprite.id}>
                    {sprite.name}（{sprite.id}）
                  </option>
                ))}
              </select>
            )}
          </Row>
          <Row label="对话立绘">
            <ImageAssetPicker
              value={cmd.portrait}
              kind="portrait"
              catalog={assetCatalog}
              reader={assetReader}
              allowUnset
              showThumbnail={false}
              ariaLabel="角色形象切换立绘"
              onOpenAsset={onOpenImage}
              onChange={(portrait) => set({ portrait })}
            />
          </Row>
          <Row label="战斗形象">
            <BattleSpritePicker
              value={cmd.battleSprite}
              definitions={battleSprites}
              kind="player-fighter"
              allowUnset
              onChange={(battleSprite) => set({ battleSprite: battleSprite || undefined })}
              onOpenDefinition={onOpenBattleSprite}
              ariaLabel="剧情角色战斗形象"
            />
          </Row>
        </>
      )
    case 'loadScene': {
      const availableScenes = scenes ?? [scene]
      const target = availableScenes.find((s) => s.id === cmd.scene)
      const entries = Object.entries(target?.entries ?? {})
      const mode = cmd.entryId ? 'entry' : cmd.pos ? 'pos' : 'default'
      return (
        <>
          <Row label="目标场景">
            <select
              className="in"
              value={cmd.scene}
              onChange={(e) => onChange(retargetLoadScene(cmd, e.target.value))}
            >
              {!availableScenes.some((s) => s.id === cmd.scene) && (
                <option value={cmd.scene}>{cmd.scene} (不在索引)</option>
              )}
              {availableScenes.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </Row>
          <Row label="落点">
            <fieldset className="cf-segment" aria-label="落点模式">
              <button
                type="button"
                className={mode === 'default' ? 'active' : ''}
                onClick={() => onChange(makeLoadScene(cmd.scene, { mode: 'default' }, cmd.facing))}
              >
                默认
              </button>
              <button
                type="button"
                className={mode === 'entry' ? 'active' : ''}
                disabled={!entries.length}
                onClick={() => {
                  const entryId =
                    cmd.entryId && target?.entries?.[cmd.entryId] ? cmd.entryId : entries[0]?.[0]
                  if (entryId)
                    onChange(makeLoadScene(cmd.scene, { mode: 'entry', entryId }, cmd.facing))
                }}
              >
                命名
              </button>
              <button
                type="button"
                className={mode === 'pos' ? 'active' : ''}
                onClick={() =>
                  onChange(
                    makeLoadScene(
                      cmd.scene,
                      {
                        mode: 'pos',
                        pos: { ...(target?.entry.pos ?? { col: 0, row: 0, height: 0 }) },
                      },
                      cmd.facing,
                    ),
                  )
                }
              >
                临时坐标
              </button>
            </fieldset>
          </Row>
          {cmd.entryId && (
            <Row label="命名落点">
              <select
                className="in"
                value={cmd.entryId}
                onChange={(e) =>
                  onChange(
                    makeLoadScene(
                      cmd.scene,
                      { mode: 'entry', entryId: e.target.value },
                      cmd.facing,
                    ),
                  )
                }
              >
                {!target?.entries?.[cmd.entryId] && (
                  <option value={cmd.entryId}>{cmd.entryId} (缺失)</option>
                )}
                {entries.map(([id, entry]) => (
                  <option key={id} value={id}>
                    {entry.label || id} · {id} ({entry.pos.col},{entry.pos.row},h
                    {entry.pos.height ?? 0})
                  </option>
                ))}
              </select>
            </Row>
          )}
          {cmd.pos && (
            <Row label="col / row / h">
              <Num
                value={cmd.pos.col}
                onChange={(n) =>
                  onChange(
                    makeLoadScene(
                      cmd.scene,
                      { mode: 'pos', pos: { ...cmd.pos!, col: n } },
                      cmd.facing,
                    ),
                  )
                }
              />
              <Num
                value={cmd.pos.row}
                onChange={(n) =>
                  onChange(
                    makeLoadScene(
                      cmd.scene,
                      { mode: 'pos', pos: { ...cmd.pos!, row: n } },
                      cmd.facing,
                    ),
                  )
                }
              />
              <Num
                value={cmd.pos.height ?? 0}
                onChange={(n) =>
                  onChange(
                    makeLoadScene(
                      cmd.scene,
                      { mode: 'pos', pos: { ...cmd.pos!, height: n } },
                      cmd.facing,
                    ),
                  )
                }
              />
            </Row>
          )}
          <Row label="朝向">
            <select
              className="in"
              value={cmd.facing ?? ''}
              onChange={(e) => {
                const f = e.target.value as Facing | ''
                const targetMode: LoadSceneTarget = cmd.entryId
                  ? { mode: 'entry', entryId: cmd.entryId }
                  : cmd.pos
                    ? { mode: 'pos', pos: cmd.pos }
                    : { mode: 'default' }
                onChange(makeLoadScene(cmd.scene, targetMode, f || undefined))
              }}
            >
              <option value="">(保持)</option>
              {FACINGS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </Row>
        </>
      )
    }
    case 'takeEntity':
      return (
        <Row label="接管实体">
          <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
        </Row>
      )
    case 'releaseEntity':
      return (
        <Row label="归还">
          <select
            className="in"
            value={cmd.entity ?? ''}
            onChange={(e) =>
              onChange(
                e.target.value
                  ? { kind: 'releaseEntity', entity: e.target.value }
                  : { kind: 'releaseEntity' },
              )
            }
          >
            <option value="">(全部)</option>
            {scene.entities.map((en) => (
              <option key={en.id} value={en.id}>
                {en.id}
              </option>
            ))}
          </select>
        </Row>
      )
    case 'setParty': {
      const battlers = actors ? Object.values(actors).filter((a) => a.battler) : []
      if (!battlers.length) break // 无角色表 → 走底部 JSON 兜底
      const members = cmd.members
      const setMembers = (next: string[]): void => set({ members: next })
      return (
        <>
          {members.map((id, i) => (
            <Row key={`${i}-${id}`} label={i === 0 ? '队长' : `队员 ${i}`}>
              <select
                value={id}
                onChange={(e) => setMembers(members.map((m, j) => (j === i ? e.target.value : m)))}
              >
                {battlers.map((a) => (
                  <option key={a.id} value={a.id}>
                    {references.label('actor', a.id)}
                  </option>
                ))}
              </select>
              <button type="button" onClick={() => setMembers(members.filter((_, j) => j !== i))}>
                ✕
              </button>
            </Row>
          ))}
          <Row label="">
            <button
              type="button"
              onClick={() => {
                const used = new Set(members)
                const cand = battlers.find((a) => !used.has(a.id)) ?? battlers[0]
                if (cand) setMembers([...members, cand.id])
              }}
            >
              + 添加队员
            </button>
            <span style={{ opacity: 0.6, fontSize: 12 }}>顺序=站位;落选进 reserve 不丢状态</span>
          </Row>
        </>
      )
    }
    case 'mountParty':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="偏移 dx/dy">
            <Num value={cmd.dx ?? 0} onChange={(n) => set({ dx: n || undefined })} />
            <Num value={cmd.dy ?? 0} onChange={(n) => set({ dy: n || undefined })} />
          </Row>
        </>
      )
    case 'ride':
      return (
        <>
          <Row label="载具实体">
            <EntitySel value={cmd.entity} scene={scene} onChange={(id) => set({ entity: id })} />
          </Row>
          <Row label="col / row">
            <Num value={cmd.to.col} onChange={(n) => set({ to: { ...cmd.to, col: n } })} />
            <Num value={cmd.to.row} onChange={(n) => set({ to: { ...cmd.to, row: n } })} />
          </Row>
          <Row label="速度">
            <Sel value={cmd.speed} options={SPEEDS} onChange={(v) => set({ speed: v })} />
          </Row>
        </>
      )
    case 'setFlag':
      return (
        <>
          <Row label="开关名">
            <input
              className="in"
              value={cmd.flag}
              onChange={(e) => set({ flag: e.target.value })}
              placeholder="如 met-li-daniang"
            />
          </Row>
          <Row label="设为">
            <Sel
              value={cmd.value ? 'true' : 'false'}
              options={['true', 'false']}
              onChange={(v) => set({ value: v === 'true' })}
            />
          </Row>
        </>
      )
    case 'setVar':
      return (
        <>
          <Row label="变量名">
            <input
              className="in"
              value={cmd.var}
              onChange={(e) => set({ var: e.target.value })}
              placeholder="如 wine-count"
            />
          </Row>
          <Row label="设为">
            <Num value={cmd.value} onChange={(n) => set({ value: n })} />
          </Row>
        </>
      )
    case 'branch': {
      const c = cmd.cond
      const itemCondition =
        c.kind === 'hasItem' || c.kind === 'ownsItem' || c.kind === 'itemEquipped' ? c : undefined
      return (
        <>
          {c.kind === 'flag' ? (
            <>
              <Row label="条件:开关">
                <input
                  className="in"
                  value={c.flag}
                  onChange={(e) => set({ cond: { ...c, flag: e.target.value } })}
                />
              </Row>
              <Row label="要求为">
                <Sel
                  value={c.is ? 'true' : 'false'}
                  options={['true', 'false']}
                  onChange={(v) => set({ cond: { ...c, is: v === 'true' } })}
                />
              </Row>
            </>
          ) : itemCondition ? (
            <>
              <Row label="条件">
                <span className="cf-readonly">
                  {itemCondition.kind === 'hasItem'
                    ? '背包持有'
                    : itemCondition.kind === 'ownsItem'
                      ? '背包与装备合计'
                      : '当前已装备'}
                </span>
              </Row>
              <Row label="物品">
                <NamedIdPicker
                  value={itemCondition.itemId}
                  choices={references.choices('item')}
                  kindLabel="物品"
                  inputName="script-condition-item"
                  onChange={(itemId) => set({ cond: { ...itemCondition, itemId } })}
                />
              </Row>
              <Row label="至少">
                <Num
                  value={itemCondition.atLeast ?? 1}
                  onChange={(atLeast) =>
                    set({
                      cond: {
                        ...itemCondition,
                        atLeast: atLeast > 1 ? atLeast : undefined,
                      },
                    })
                  }
                />
              </Row>
            </>
          ) : (
            <p className="hint">非 flag 条件({c.kind})用下方 JSON 编辑。</p>
          )}
          <p className="hint">
            成立走 then 臂、不成立走 else 臂 —— 树里展开臂内行,行悬停 ＋ 插指令。
          </p>
        </>
      )
    }
    case 'playSound':
      return (
        <Row label="音效">
          <SoundPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (asset) set({ asset })
            }}
            catalog={assetCatalog}
            reader={assetReader}
            onOpenAsset={onOpenSound}
          />
        </Row>
      )
    case 'playMusic':
      return (
        <Row label="音乐">
          <MusicPicker
            value={cmd.asset}
            onChange={(asset) => {
              if (typeof asset === 'string') set({ asset })
            }}
            catalog={assetCatalog}
            resolver={audioResolver}
          />
        </Row>
      )
    case 'openShop':
      return (
        <>
          <Row label="店铺">
            {shops?.length ? (
              <Sel
                value={String(cmd.shop)}
                options={shops.map((x) => String(x.id))}
                labels={shops.map((x) => `店 ${x.id}(${x.items.length} 货)`)}
                onChange={(v) => set({ shop: Number(v) })}
              />
            ) : (
              <Num value={cmd.shop} onChange={(n) => set({ shop: n })} />
            )}
          </Row>
          <Row label="模式">
            <Sel
              value={cmd.mode}
              options={['buy', 'sell']}
              labels={['买(店铺货单)', '卖(当铺收购)']}
              onChange={(v) => set({ mode: v })}
            />
          </Row>
        </>
      )
    case 'setAmbience':
      return (
        <Row label="氛围">
          {ambiences?.length ? (
            <NamedIdPicker
              value={cmd.ambience}
              choices={references.choices('ambience')}
              kindLabel="氛围"
              inputName="script-ambience"
              onChange={(ambience) => set({ ambience })}
            />
          ) : (
            <Txt value={cmd.ambience} onChange={(s) => set({ ambience: s })} />
          )}
        </Row>
      )
    case 'giveMoney':
      return (
        <Row label="增减钱">
          <Num value={cmd.delta} onChange={(n) => set({ delta: n })} />
        </Row>
      )
    case 'learnSkill':
      return (
        <>
          <Row label="原版角色槽位">
            <Num value={cmd.role} onChange={(role) => set({ role })} />
          </Row>
          <Row label="仙术">
            <NamedIdPicker
              value={cmd.skill}
              choices={references.choices('skill')}
              kindLabel="仙术"
              inputName="script-skill"
              onChange={(skill) => set({ skill })}
            />
          </Row>
          <p className="cf-warn">
            角色仍使用原版数字槽位；它不是新工程可用的稳定角色引用，已纳入脚本模型现代化整改。
          </p>
        </>
      )
    case 'giveItem':
    case 'loseItem':
      return (
        <>
          <Row label="物品">
            <NamedIdPicker
              value={cmd.itemId}
              choices={references.choices('item')}
              kindLabel="物品"
              inputName="script-item"
              onChange={(itemId) => set({ itemId })}
            />
          </Row>
          <Row label="数量">
            <Num value={cmd.count ?? 1} onChange={(n) => set({ count: n > 1 ? n : undefined })} />
          </Row>
        </>
      )
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setSceneOnEnter':
    case 'setSceneOnTeleport': {
      const targetId = cmd.script?.id
      const targetMeta = targetId ? scriptIndex?.library?.[targetId] : undefined
      return (
        <>
          {targetId ? (
            <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
              <span className="cf-ref-row">
                <code className="cf-ref-target">
                  {targetMeta ? references.label('authorScript', targetId) : targetId}
                </code>
                {onOpenScript ? (
                  <button
                    type="button"
                    className="mini"
                    title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                    onClick={() => onOpenScript(targetId)}
                  >
                    ↗
                  </button>
                ) : null}
              </span>
            </Row>
          ) : null}
          {showRawJson ? <JsonForm cmd={cmd} onChange={onChange} /> : null}
        </>
      )
    }
    case 'jumpScript': {
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label={targetMeta ? '可复用脚本' : '迁移内部实现'}>
            <span className="cf-ref-row">
              <code className="cf-ref-target">
                {targetMeta ? references.label('authorScript', cmd.ref.id) : cmd.ref.id}
              </code>
              {onOpenScript ? (
                <button
                  type="button"
                  className="mini"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  ↗
                </button>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <select
              className="in"
              value={selfValue}
              onChange={(event) => set({ self: event.target.value || undefined })}
            >
              <option value="">继承当前执行者</option>
              {explicitEntities.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
              {selfValue && !explicitEntities.includes(selfValue) ? (
                <option value={selfValue}>{selfValue}(不在场)</option>
              ) : null}
            </select>
          </Row>
        </>
      )
    }
    case 'callScript': {
      const authored: [string, SharedScriptMetaV1][] = Object.entries(
        scriptIndex?.library ?? {},
      ).sort(([, a], [, b]) => a.name.localeCompare(b.name))
      const options: [string, SharedScriptMetaV1][] = authored.some(([id]) => id === cmd.ref.id)
        ? authored
        : [[cmd.ref.id, { name: `${cmd.ref.id}（内部）`, self: 'none' as const }], ...authored]
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label="目标">
            <span className="cf-ref-row">
              <select
                className="in"
                value={cmd.ref.id}
                onChange={(event) => {
                  const id = event.target.value
                  const chunk = scriptIndex ? deriveScriptChunk(id, scriptIndex.shards) : undefined
                  set({ ref: { id, chunk: chunk ?? cmd.ref.chunk } })
                }}
              >
                {options.map(([id, meta]) => (
                  <option key={id} value={id}>
                    {references.has('authorScript', id)
                      ? references.label('authorScript', id)
                      : meta.name}
                  </option>
                ))}
              </select>
              {onOpenScript ? (
                <button
                  type="button"
                  className="mini"
                  title={targetMeta ? '打开可复用脚本' : '打开迁移内部实现'}
                  onClick={() => onOpenScript(cmd.ref.id)}
                >
                  ↗
                </button>
              ) : null}
            </span>
          </Row>
          <Row label="self">
            <select
              className="in"
              value={selfValue}
              onChange={(event) => set({ self: event.target.value || undefined })}
            >
              <option value="">继承当前执行者</option>
              {explicitEntities.map((id) => (
                <option key={id} value={id}>
                  {id}
                </option>
              ))}
              {selfValue && !explicitEntities.includes(selfValue) ? (
                <option value={selfValue}>{selfValue}(不在场)</option>
              ) : null}
            </select>
          </Row>
          {targetMeta?.self === 'required' && !cmd.self && !hasImplicitSelf ? (
            <p className="cf-err">目标要求 self；当前来源没有可继承执行者，请显式选择实体。</p>
          ) : null}
          <p className="hint mono">{cmd.ref.id}</p>
        </>
      )
    }
    case 'cameraPan':
      return (
        <>
          <Row label="dx">
            <Num value={cmd.dx} onChange={(n) => set({ dx: n })} />
          </Row>
          <Row label="dy">
            <Num value={cmd.dy} onChange={(n) => set({ dy: n })} />
          </Row>
          <Row label="帧数">
            <Num value={cmd.frames} onChange={(n) => set({ frames: n })} />
          </Row>
        </>
      )
    case 'clearDialog':
    case 'cameraSnap':
      return (
        <p className="hint">
          此指令无可编参数
          {cmd.kind === 'cameraSnap' && cmd.to && showRawJson ? '(定位坐标用 JSON)' : ''}。
        </p>
      )
    default:
      // 结构类(branch/confirm/startBattle/页切换)与低频指令:JSON 兜底
      return showRawJson ? (
        <JsonForm cmd={cmd} onChange={onChange} />
      ) : (
        <p className="hint">此指令请使用新版结构化属性表单编辑。</p>
      )
  }
}
