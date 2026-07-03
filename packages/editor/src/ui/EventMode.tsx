/**
 * 事件模式 —— 脚本查看 + 演出预览(v0)。两段式 outliner:上段选有脚本的场景,下段列该
 * 场景的脚本源;中列上「演出预览画布」(播放/单步/重置/倍速)下「命令树」(跟随高亮当前
 * 命令);右栏演出日志(桩命令)。可视化编辑是后续 C-track。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ActorDef, Command, EntityDef, Locale, SceneDef, ScriptStage, SpriteDef } from '@type-pal/content'
import type { AssetBase } from '@type-pal/reforge'
import { type ScriptSourceRef, UpdateScriptCommand } from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { Playback } from '../core/playback.js'
import { getCommandAt, insertAfterAt, moveAt, parsePath, removeAt, updateCommandAt } from '../core/script-edit.js'
import { CommandForm } from './CommandForm.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { type RowAction, ScriptTree } from './ScriptTree.js'

/** 插入上下文:当前场景 + 「自身」实体(当前源为实体触发/auto 时 = 该实体,模板自动指自己)。 */
interface InsertCtx {
  scene: SceneDef
  ownerId: string | undefined
}
const selfOf = (c: InsertCtx): string => c.ownerId ?? c.scene.entities[0]?.id ?? 'e0'

/** ➕ 插入菜单 —— 单命令 + 事件模板(按 4382 段触发脚本形状统计的 top 模式提炼;
 *  模板插入即展开为普通命令组,逐条可调,不引入黑盒高层命令)。 */
const INSERT_GROUPS: { title: string; items: { label: string; make: (c: InsertCtx) => Command[] }[] }[] = [
  {
    title: '单命令',
    items: [
      { label: '💬 对话', make: () => [{ kind: 'dialog', line: { text: '(新对话)' } }] },
      { label: '⏱ 等待', make: () => [{ kind: 'wait', ms: 200 }] },
      { label: '🚶 队伍走到', make: (c) => [{ kind: 'moveParty', to: { ...c.scene.entry.pos }, speed: 'normal' }] },
      { label: '🚶 实体走到', make: (c) => [{ kind: 'moveEntity', entity: selfOf(c), to: { ...c.scene.entry.pos }, speed: 'normal' }] },
      { label: '📍 队伍瞬移', make: (c) => [{ kind: 'teleportParty', pos: { ...c.scene.entry.pos } }] },
      { label: '🧭 队伍转向', make: () => [{ kind: 'setPartyFacing', facing: 'down' }] },
      { label: '👁 实体显隐', make: (c) => [{ kind: 'setEntityState', entity: selfOf(c), state: 1 }] },
      { label: '🧭 实体转向', make: (c) => [{ kind: 'setEntityFacing', entity: selfOf(c), facing: 'down' }] },
      { label: '🌓 淡入/淡出', make: () => [{ kind: 'fade', dir: 'out', ms: 300 }] },
      { label: '🎵 音乐', make: () => [{ kind: 'playMusic', musicId: 1 }] },
      { label: '🚪 切场景', make: (c) => [{ kind: 'loadScene', scene: c.scene.id, pos: { ...c.scene.entry.pos } }] },
      { label: '⚔ 战斗', make: () => [{ kind: 'startBattle', team: 0 }] },
    ],
  },
  {
    title: '事件模板(展开为命令组)',
    items: [
      {
        // 435 例:宝箱 —— 开盖帧**持久**(状态切换);防重复 = 原版全部走多段
        // (段0 给物 next=1,段1「空箱」提示)。v1 插的是段内命令组,第 2 段请手动补。
        label: '📦 宝箱(开盖给物)',
        make: (c) => [
          { kind: 'setEntityFacing', entity: selfOf(c), facing: 'down' },
          { kind: 'setEntityFrame', entity: selfOf(c), frame: 1 },
          { kind: 'playSound', soundId: 2 },
          { kind: 'dialog', line: { text: '(得到○○!)' } },
          { kind: 'giveItem', itemId: '0' },
        ],
      },
      {
        // 145 例:地上道具(有精灵)—— 给完**末尾自隐**(玩家看着捡走);触发随实体灭
        label: '🌿 地上道具(捡走消失)',
        make: (c) => [
          { kind: 'playSound', soundId: 2 },
          { kind: 'dialog', line: { text: '(得到○○!)' } },
          { kind: 'giveItem', itemId: '0' },
          { kind: 'setEntityState', entity: selfOf(c), state: 0 },
        ],
      },
      {
        // 76 例:柜中搜刮(无精灵 zone)—— **首条自灭**防重入(看不见,先关触发再给物)
        label: '🗄 柜中搜刮(无精灵)',
        make: (c) => [
          { kind: 'setEntityState', entity: selfOf(c), state: 0 },
          { kind: 'playSound', soundId: 2 },
          { kind: 'dialog', line: { text: '(得到○○!)' } },
          { kind: 'giveItem', itemId: '0' },
        ],
      },
      {
        // 19/16 例:给钱变体
        label: '💰 得钱',
        make: (c) => [
          { kind: 'playSound', soundId: 2 },
          { kind: 'dialog', line: { text: '(得到○○文钱!)' } },
          { kind: 'giveMoney', delta: 100 },
          { kind: 'setEntityState', entity: selfOf(c), state: 0 },
        ],
      },
      {
        // 100 例:跨房间镜头 —— 走近 → 镜头平移过去 → 队伍瞬移 → 镜头回正 → 走出
        label: '🎥 跨房间镜头',
        make: (c) => [
          { kind: 'moveParty', to: { ...c.scene.entry.pos }, speed: 'normal' },
          { kind: 'cameraPan', dx: 16, dy: 8, frames: 20 },
          { kind: 'teleportParty', pos: { ...c.scene.entry.pos } },
          { kind: 'cameraSnap' },
          { kind: 'moveParty', to: { ...c.scene.entry.pos }, speed: 'normal' },
        ],
      },
      {
        // 33 例(迷宫楼梯口,s060×12/s065×11 等;map 连号邻层):原版单层渲染的跨层
        // 楼梯演出 —— 登阶(朝上碎步)→ 转身带走姿原路走下(= 新层视角走出楼梯口,
        // 净位移 0)→ 切层落位。参数取 s060:e1117 真值。⚠ 曾误名「钻洞爬行」:无换
        // 爬行精灵、有走姿帧,非爬行;真爬行(0x65 换 193)只在剧情演出里。
        label: '⛰ 跨层楼梯(登阶切层)',
        make: (c) => [
          { kind: 'setPartyFacing', facing: 'up' },
          { kind: 'nudgeParty', dx: 10, dy: -10 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: 6, dy: -6 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: 10, dy: -10 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: 6, dy: -6 },
          { kind: 'wait', ms: 40 },
          { kind: 'setPartyFacing', facing: 'down', gesture: 1 },
          { kind: 'nudgeParty', dx: -10, dy: 10 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: -6, dy: 6 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: -10, dy: 10 },
          { kind: 'wait', ms: 40 },
          { kind: 'nudgeParty', dx: -6, dy: 6 },
          { kind: 'wait', ms: 40 },
          { kind: 'loadScene', scene: c.scene.id, pos: { ...c.scene.entry.pos } },
        ],
      },
      {
        // 简单 NPC 对话:转向玩家 → 说话(触发脚本最常见的开场组合)
        label: '🗣 NPC 搭话',
        make: (c) => [
          { kind: 'setEntityFacing', entity: selfOf(c), facing: 'down' },
          { kind: 'dialog', line: { text: '(新对话)' } },
        ],
      },
    ],
  },
]

interface ScriptSource {
  key: string
  label: string
  kind: 'onEnter' | 'trigger' | 'auto'
  sub: string
  stages: readonly ScriptStage[]
}

/** 收集一个场景的全部脚本源。 */
function collectSources(scene: SceneDef): ScriptSource[] {
  const out: ScriptSource[] = []
  if (scene.onEnter?.length) out.push({ key: '__onEnter__', label: '进场脚本', kind: 'onEnter', sub: `${scene.onEnter.length} 段`, stages: scene.onEnter })
  for (const e of scene.entities) {
    const page = e.pages?.[0]
    if (page?.trigger) {
      const on = page.trigger.on === 'interact' ? '交互' : '触碰'
      out.push({ key: `${e.id}:trigger`, label: e.id, kind: 'trigger', sub: `${on}触发`, stages: page.trigger.stages })
    }
    if (page?.auto) out.push({ key: `${e.id}:auto`, label: e.id, kind: 'auto', sub: '巡逻/动画', stages: page.auto.stages })
  }
  return out
}

/** 统计一个场景的脚本源数(outliner 徽标)。 */
function sourceCount(scene: SceneDef): number {
  let n = scene.onEnter?.length ? 1 : 0
  for (const e of scene.entities) {
    const p = e.pages?.[0]
    if (p?.trigger) n++
    if (p?.auto) n++
  }
  return n
}

const ICON: Record<ScriptSource['kind'], string> = { onEnter: '🚩', trigger: '🔗', auto: '🔁' }

export function EventMode(props: {
  scenes: SceneDef[]
  locale: Locale
  initialSceneId: string
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  session: EditSession
}) {
  const { scenes, locale, initialSceneId, sprites, actorsById, leaderSpriteId, assetBase, session } = props
  const [sceneId, setSceneId] = useState(initialSceneId)
  const [filter, setFilter] = useState('')
  const [srcKey, setSrcKey] = useState<string | null>(null)

  // 只列有脚本的场景(验证眼睛:空场景无意义)
  const scriptedScenes = useMemo(
    () => scenes.map((s) => ({ scene: s, n: sourceCount(s) })).filter((x) => x.n > 0),
    [scenes],
  )
  const shown = useMemo(
    () => scriptedScenes.filter((x) => !filter || x.scene.id.includes(filter)),
    [scriptedScenes, filter],
  )
  const scene = scenes.find((s) => s.id === sceneId)
  const sources = useMemo(() => (scene ? collectSources(scene) : []), [scene])
  const active = sources.find((s) => s.key === srcKey) ?? sources[0]

  // 演出预览控制器:随场景重建;切场景/切源/卸载时停播丢弃演出态
  const playback = useMemo(() => (scene ? new Playback(scene) : null), [scene])
  const [, setUiTick] = useState(0)
  const prevRef = useRef<Playback | null>(null)
  useEffect(() => {
    prevRef.current?.stop()
    prevRef.current = playback
    if (playback) playback.onUi = () => setUiTick((x) => x + 1) // 低频 UI:高亮/对话/日志/mode
    return () => playback?.stop()
  }, [playback])
  // 切脚本源:停播(演出态归当前源)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在源切换时停播
  useEffect(() => {
    playback?.stop()
  }, [active?.key])

  // ── 脚本编辑(v1):选中行 → 右栏表单;行按钮 插/移/删;整 stages 经命令落 session ──
  const [selPath, setSelPath] = useState<string | null>(null)
  const [insertFor, setInsertFor] = useState<string | null>(null) // ➕ 目标路径(右栏出模板菜单)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切场景/切源即清选中
  useEffect(() => {
    setSelPath(null)
    setInsertFor(null)
  }, [sceneId, active?.key])

  const refOf = (key: string): ScriptSourceRef =>
    key === '__onEnter__'
      ? { kind: 'onEnter' }
      : key.endsWith(':trigger')
        ? { kind: 'trigger', entityId: key.slice(0, -':trigger'.length) }
        : { kind: 'auto', entityId: key.slice(0, -':auto'.length) }

  const dispatchStages = (stages: readonly ScriptStage[]): void => {
    if (!scene || !active) return
    session.dispatch(new UpdateScriptCommand(scene.id, refOf(active.key), stages))
  }
  const selCmd = active && selPath ? getCommandAt(active.stages, parsePath(selPath)) : undefined

  const onRowAction = (path: string, action: RowAction): void => {
    if (!active) return
    const p = parsePath(path)
    if (action === 'insert') {
      setInsertFor(path)
      return
    }
    if (action === 'remove') {
      const next = removeAt(active.stages, p)
      if (next !== active.stages) {
        dispatchStages(next)
        if (selPath === path) setSelPath(null)
      }
      return
    }
    const dir = action === 'up' ? -1 : 1
    const next = moveAt(active.stages, p, dir)
    if (next !== active.stages) {
      dispatchStages(next)
      // 选中跟随移动后的位置
      if (selPath === path) {
        const last = p[p.length - 1] as number
        setSelPath([...p.slice(0, -1), last + dir].join('/'))
      }
    }
  }

  // 预览/命令树 高度比(拖分隔条调;夹 15%~85%)
  const [previewFrac, setPreviewFrac] = useState(0.46)
  const centerRef = useRef<HTMLDivElement>(null)
  const onSplitDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.preventDefault()
    const el = centerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const move = (ev: PointerEvent): void => {
      const frac = (ev.clientY - rect.top - 34) / Math.max(1, rect.height - 34) // 34 ≈ 顶部 toolbar
      setPreviewFrac(Math.min(0.85, Math.max(0.15, frac)))
    }
    const up = (): void => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  return (
    <>
      {/* 左:场景列表(上段)+ 脚本源列表(下段)—— 两段式,源垂直排不挤 */}
      <div className="outliner event-outliner">
        <div className="pane-h"><span className="t">有脚本的场景</span><span className="spacer" /><span className="k">{scriptedScenes.length}</span></div>
        <input className="in" placeholder="过滤场景 id…" value={filter} onChange={(e) => setFilter(e.target.value)} style={{ margin: '0 8px 6px' }} />
        <div className="scene-list">
          {shown.map(({ scene: s, n }) => (
            <button key={s.id} className={`node${s.id === sceneId ? ' sel' : ''}`} onClick={() => { setSceneId(s.id); setSrcKey(null) }}>
              <span className="ico">🗺️</span><span>{s.id}</span><span className="k">{n}</span>
            </button>
          ))}
        </div>
        <div className="src-section">
          <div className="pane-h sub"><span className="t">{sceneId} · 脚本源</span><span className="spacer" /><span className="k">{sources.length}</span></div>
          <div className="src-list">
            {sources.map((s) => (
              <button key={s.key} className={`src-item${active?.key === s.key ? ' sel' : ''}`} onClick={() => setSrcKey(s.key)}>
                <span className="src-ico">{ICON[s.kind]}</span>
                <span className="src-label">{s.label}</span>
                <span className="src-sub">{s.sub}</span>
              </button>
            ))}
            {sources.length === 0 ? <div className="script-empty">此场景无脚本源。</div> : null}
          </div>
        </div>
      </div>

      {/* 中:上演出预览 + 拖拽分隔 + 下命令树(跟随高亮) */}
      <div className="center event-center" ref={centerRef}>
        <div className="toolbar">
          <span style={{ fontWeight: 600 }}>{active ? `${ICON[active.kind]} ${active.label}` : sceneId}</span>
          {active ? <span className="src-sub" style={{ marginLeft: 6 }}>{active.sub}</span> : null}
          <span className="spacer" />
          <span style={{ color: 'var(--faint)', fontSize: 11 }}>树只读 · 预览可播</span>
        </div>
        {scene && active && playback ? (
          <>
            <div style={{ flex: `0 0 ${(previewFrac * 100).toFixed(1)}%`, display: 'flex', minHeight: 120 }}>
              <PreviewCanvas
                scene={scene}
                stages={active.stages}
                sourceKey={active.key}
                focusEntityId={refOf(active.key).kind === 'onEnter' ? undefined : (refOf(active.key) as { entityId: string }).entityId}
                sprites={sprites}
                actorsById={actorsById}
                leaderSpriteId={leaderSpriteId}
                assetBase={assetBase}
                locale={locale}
                playback={playback}
              />
            </div>
            <div className="v-split" onPointerDown={onSplitDown} title="拖动调节预览/命令树高度" />
          </>
        ) : null}
        <div className="script-view">
          {active ? (
            <ScriptTree
              stages={active.stages}
              locale={locale}
              activePath={playback?.activePath ?? null}
              selectedPath={selPath}
              onSelect={(path) => {
                setSelPath(path)
                setInsertFor(null)
              }}
              onRowAction={onRowAction}
            />
          ) : (
            <div className="insp-empty">此场景无脚本源。</div>
          )}
        </div>
      </div>

      {/* 右:命令编辑 / 插入菜单 / 演出日志 */}
      <div className="inspector">
        <div className="insp-head"><div className="what">事件 · 脚本 + 预览</div><div className="who">{active ? `${active.label} · ${active.sub}` : '—'}</div></div>
        {insertFor && active && scene ? (
          <div className="section">
            <h4>插入(到选中行之后)</h4>
            {INSERT_GROUPS.map((g) => (
              <div key={g.title}>
                <div className="cf-group">{g.title}</div>
                <div className="cf-insert">
                  {g.items.map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="pv-btn"
                      onClick={() => {
                        const ref = refOf(active.key)
                        const ctx: InsertCtx = { scene, ownerId: ref.kind === 'onEnter' ? undefined : ref.entityId }
                        const cmds = t.make(ctx)
                        const p = parsePath(insertFor)
                        // 逐条插入(路径递增),整批一次 dispatch
                        let stages = active.stages
                        let at = p
                        for (const cmd of cmds) {
                          stages = insertAfterAt(stages, at, cmd)
                          const last = at[at.length - 1] as number
                          at = [...at.slice(0, -1), last + 1]
                        }
                        if (stages !== active.stages) {
                          dispatchStages(stages)
                          const first = p[p.length - 1] as number
                          setSelPath([...p.slice(0, -1), first + 1].join('/'))
                        }
                        setInsertFor(null)
                      }}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="cf-insert" style={{ marginTop: 6 }}>
              <button type="button" className="pv-btn" onClick={() => setInsertFor(null)}>取消</button>
            </div>
            <p className="hint">模板按全 295 场景触发脚本的 top 形状提炼;「自身」自动指当前触发实体。插入后逐条可调。</p>
          </div>
        ) : null}
        {selCmd && scene && active && selPath ? (
          <div className="section">
            <h4>编辑命令 <span className="cf-path">{selPath}</span></h4>
            <CommandForm
              cmd={selCmd}
              scene={scene}
              locale={locale}
              onChange={(next) => {
                const out = updateCommandAt(active.stages, parsePath(selPath), next)
                if (out !== active.stages) dispatchStages(out)
              }}
            />
            <p className="hint">改动即入 undo 历史(↶/↷);💾 保存写回工程文件。改完可在预览单步复验。</p>
          </div>
        ) : null}
        {playback && playback.view.logs.length > 0 ? (
          <div className="section">
            <h4>演出日志(桩命令)</h4>
            <div className="pv-logs">
              {playback.view.logs.slice(-40).map((l, i) => (
                <div key={i} className="pv-log">{l}</div>
              ))}
            </div>
          </div>
        ) : null}
        {!selCmd && !insertFor ? (
          <div className="section">
            <h4>脚本编辑 + 演出预览</h4>
            <p className="hint">
              点树中命令行选中 → 此处编辑参数;行悬停 ＋/↑/↓/🗑 插入/移动/删除。
              ▶ 从头播;⏭ 单步逐条(树中高亮);对话点「继续」。演出态是临时副本,不改数据。
            </p>
            <p className="hint"><span className="warn-inline">⚠ 黄色</span> = 未翻译(逃生口,多为战斗侧 op,归 M4);结构类命令用 JSON 编辑。</p>
          </div>
        ) : null}
        {active && active.stages.length > 1 ? (
          <div className="section">
            <h4>多段触发</h4>
            <p className="hint">{active.stages.length} 段:原版「再按一次继续下一段」的结构化版。v0 预览播第 1 段。</p>
          </div>
        ) : null}
      </div>
    </>
  )
}

/** 供 App 判断实体是否有脚本(布置模式 outliner 加徽标可选用)。 */
export function entityHasScript(e: EntityDef): boolean {
  const p = e.pages?.[0]
  return Boolean(p?.trigger || p?.auto)
}
