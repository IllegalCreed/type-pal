/**
 * 指令属性表单(C-track v1)—— 事件模式右栏:选中树行 → 编辑该指令参数。
 *
 * 高频指令给专控件;其余(branch/startBattle/confirm/页切换/unmigrated 等结构类)
 * 走 JSON 兜底(textarea + 应用,保证全指令可编)。每次变更即 onChange(整指令替换,
 * 由 EventMode 经 script-edit 纯函数 + UpdateScriptCommand 落进 EditSession)。
 *
 * 对话文本:line.text 是 TextId(locale 键);编辑即改写为**字面量**(lookupText
 * 未命中回显原文,引擎/预览同语义)——新写的行直接放中文,旧行一改即脱离 locale 键。
 */
import type {
  AmbienceDef,
  Command,
  Facing,
  Locale,
  MusicDef,
  SceneDef,
  ScriptIndexV1,
  SharedScriptMetaV1,
  ShopDef,
  WalkSpeed,
} from '@type-pal/content'
import { type ActorDef, deriveScriptChunk, lookupText } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { useEffect, useState } from 'react'
import { MusicPicker } from './MusicPicker.js'

const FACINGS: Facing[] = ['down', 'left', 'up', 'right']
const SPEEDS: WalkSpeed[] = ['slow', 'normal', 'fast', 'run']

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
  /** 音乐库 + 试听资产前缀(BGM 选择器;库空退化数字输入)。 */
  music: MusicDef[]
  musicBase: string
  /** 全场景(loadScene 目标下拉;W4)。缺省 = 只有当前场景。 */
  scenes?: SceneDef[]
  /** 资产 base(战场选择器预览;B2)。缺省退化数字输入。 */
  assetBase?: AssetBase
  /** 角色表(setParty 队伍编辑下拉;C7)。缺省退化 JSON 兜底。 */
  actors?: Record<string, ActorDef>
  /** 氛围表(setAmbience 下拉;W6)。缺省退化文本输入。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 店下拉)。缺省退化数字输入。 */
  shops?: ShopDef[]
  /** N6 作者共享脚本目录；用于区分作者共享目标与场景内部目标。 */
  scriptIndex?: ScriptIndexV1
  /** 当前执行上下文是否保证有可继承 self。 */
  hasImplicitSelf?: boolean
  /** 打开 callScript/jumpScript 目标；调用方决定留在场景内或进入作者共享库。 */
  onOpenScript?: (id: string) => void
  onChange: (next: Command) => void
}) {
  const {
    cmd,
    scene,
    locale,
    music,
    musicBase,
    scenes,
    actors,
    ambiences,
    shops,
    scriptIndex,
    hasImplicitSelf,
    onOpenScript,
    onChange,
  } = props
  const set = (patch: object): void => onChange({ ...cmd, ...patch } as Command)

  switch (cmd.kind) {
    case 'dialog': {
      const line = cmd.line
      const setLine = (patch: object): void => onChange({ ...cmd, line: { ...line, ...patch } })
      const shown = lookupText(line.text, locale)
      return (
        <>
          <Row label="说话人">
            <Txt
              value={line.speaker ? lookupText(line.speaker, locale) : ''}
              onChange={(s) => setLine({ speaker: s || undefined })}
              placeholder="(旁白)"
            />
          </Row>
          <Row label="文本">
            <textarea
              className="in cf-ta"
              value={shown}
              onChange={(e) => setLine({ text: e.target.value })}
              spellCheck={false}
            />
          </Row>
          <Row label="位置">
            <Sel
              value={line.slot ?? 'bottom'}
              options={['bottom', 'top', 'narration'] as const}
              onChange={(v) => setLine({ slot: v === 'bottom' ? undefined : v })}
            />
          </Row>
          <p className="hint">
            编辑即写为字面文本(脱离 locale 键;显示=所见即所得)。立绘等其余字段用下方 JSON。
          </p>
          <JsonForm cmd={cmd} onChange={onChange} />
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
        </>
      )
    case 'setActorSprite':
      return (
        <>
          <Row label="角色">
            <Txt value={cmd.actor} onChange={(s) => set({ actor: s })} />
          </Row>
          <Row label="精灵 id">
            <Txt value={cmd.sprite} onChange={(s) => set({ sprite: s })} />
          </Row>
        </>
      )
    case 'loadScene': {
      // W4 传送编辑:目标场景下拉 + 落点(缺省 = 目标场景进场点)+ 朝向。
      const target = (scenes ?? [scene]).find((s) => s.id === cmd.scene)
      return (
        <>
          <Row label="目标场景">
            <select
              className="in"
              value={cmd.scene}
              onChange={(e) => set({ scene: e.target.value })}
            >
              {!(scenes ?? [scene]).some((s) => s.id === cmd.scene) && (
                <option value={cmd.scene}>{cmd.scene} (不在索引)</option>
              )}
              {(scenes ?? [scene]).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.id}
                </option>
              ))}
            </select>
          </Row>
          <Row label="落点">
            <label className="cf-inline">
              <input
                type="checkbox"
                checked={cmd.pos !== undefined}
                onChange={(e) =>
                  e.target.checked
                    ? set({ pos: { ...(target?.entry.pos ?? { col: 0, row: 0, height: 0 }) } })
                    : onChange({
                        kind: 'loadScene',
                        scene: cmd.scene,
                        ...(cmd.facing ? { facing: cmd.facing } : {}),
                      })
                }
              />{' '}
              自定(不勾 = 目标场景进场点)
            </label>
          </Row>
          {cmd.pos && (
            <Row label="col / row">
              <Num value={cmd.pos.col} onChange={(n) => set({ pos: { ...cmd.pos!, col: n } })} />
              <Num value={cmd.pos.row} onChange={(n) => set({ pos: { ...cmd.pos!, row: n } })} />
            </Row>
          )}
          <Row label="朝向">
            <select
              className="in"
              value={cmd.facing ?? ''}
              onChange={(e) => {
                const f = e.target.value as Facing | ''
                const next: Command = { kind: 'loadScene', scene: cmd.scene }
                if (cmd.pos) (next as { pos?: unknown }).pos = cmd.pos
                if (f) (next as { facing?: Facing }).facing = f
                onChange(next)
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
                    {lookupText(a.name, locale)}
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
        <Row label="音效 id">
          <Num value={cmd.soundId} onChange={(n) => set({ soundId: n })} />
        </Row>
      )
    case 'playMusic':
      return (
        <Row label="音乐">
          <MusicPicker
            value={cmd.musicId}
            onChange={(v) => set({ musicId: v ?? 0 })}
            music={music}
            baseUrl={musicBase}
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
            <Sel
              value={cmd.ambience}
              options={ambiences.map((a) => a.id)}
              labels={ambiences.map((a) => a.name)}
              onChange={(v) => set({ ambience: v })}
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
    case 'giveItem':
    case 'loseItem':
      return (
        <>
          <Row label="物品 id">
            <Txt value={cmd.itemId} onChange={(s) => set({ itemId: s })} />
          </Row>
          <Row label="数量">
            <Num value={cmd.count ?? 1} onChange={(n) => set({ count: n > 1 ? n : undefined })} />
          </Row>
        </>
      )
    case 'setEntityAuto':
    case 'setEntityTrigger':
    case 'setSceneOnTeleport': {
      const targetId = cmd.script?.id
      const targetMeta = targetId ? scriptIndex?.library?.[targetId] : undefined
      return (
        <>
          {targetId ? (
            <Row label={targetMeta ? '共享目标' : '内部目标'}>
              <span className="cf-ref-row">
                <code className="cf-ref-target">{targetId}</code>
                {onOpenScript ? (
                  <button
                    type="button"
                    className="mini"
                    title={targetMeta ? '打开共享脚本' : '在当前场景脚本中打开内部目标'}
                    onClick={() => onOpenScript(targetId)}
                  >
                    ↗
                  </button>
                ) : null}
              </span>
            </Row>
          ) : null}
          <JsonForm cmd={cmd} onChange={onChange} />
        </>
      )
    }
    case 'jumpScript': {
      const targetMeta = scriptIndex?.library?.[cmd.ref.id]
      const explicitEntities = scene.entities.map((entity) => entity.id)
      const selfValue = cmd.self ?? ''
      return (
        <>
          <Row label={targetMeta ? '共享目标' : '内部目标'}>
            <span className="cf-ref-row">
              <code className="cf-ref-target">{cmd.ref.id}</code>
              {onOpenScript ? (
                <button
                  type="button"
                  className="mini"
                  title={targetMeta ? '打开共享脚本' : '在当前场景脚本中打开内部目标'}
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
                    {meta.name}
                  </option>
                ))}
              </select>
              {onOpenScript ? (
                <button
                  type="button"
                  className="mini"
                  title={targetMeta ? '打开共享脚本' : '在当前场景脚本中打开内部目标'}
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
          此指令无可编参数{cmd.kind === 'cameraSnap' && cmd.to ? '(定位坐标用 JSON)' : ''}。
        </p>
      )
    default:
      // 结构类(branch/confirm/startBattle/页切换)与低频指令:JSON 兜底
      return <JsonForm cmd={cmd} onChange={onChange} />
  }
}
