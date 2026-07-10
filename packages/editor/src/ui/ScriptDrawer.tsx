/**
 * 场景模式 · 底部脚本抽屉(audit §6 Step2,作者拍板形态)—— 独立事件模式的接替者。
 * 工作流:建场景 → 选地图 → 布精灵 → **选实体就地写脚本 → 预览**,全程不离开场景模式。
 * 三栏横排:左 = 本场景脚本源(+创建器);中 = 指令树(播放跟随高亮);
 * 右 = 演出预览(上)+ 指令表单/插入菜单/日志(下)。
 * 编辑逻辑与原事件模式同源(UpdateScriptCommand → session,undo 可回)。
 */

import type {
  ActorDef,
  AmbienceDef,
  Command,
  Locale,
  MusicDef,
  SceneDef,
  ScriptStage,
  SpriteDef,
} from '@type-pal/content'
import type { AssetBase, OwnMap } from '@type-pal/reforge'
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  CreateScriptSourceCommand,
  DeleteScriptSourceCommand,
  type ScriptSourceRef,
  UpdateScriptCommand,
  UpdateTriggerModeCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { Playback } from '../core/playback.js'
import {
  addStageAfter,
  getCommandAt,
  insertAfterAt,
  insertAtHead,
  moveAt,
  parsePath,
  removeAt,
  removeStage,
  setStageNext,
  updateCommandAt,
} from '../core/script-edit.js'
import { CommandForm } from './CommandForm.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { type RowAction, ScriptTree } from './ScriptTree.js'

/** 插入上下文:当前场景 + 「自身」实体(当前源为实体触发/auto 时 = 该实体,模板自动指自己)。 */
interface InsertCtx {
  scene: SceneDef
  ownerId: string | undefined
}
const selfOf = (c: InsertCtx): string => c.ownerId ?? c.scene.entities[0]?.id ?? 'e0'

/** ➕ 插入菜单 —— 单指令 + 事件模板(按 4382 段触发脚本形状统计的 top 模式提炼;
 *  模板插入即展开为普通指令组,逐条可调,不引入黑盒高层指令)。 */
const INSERT_GROUPS: {
  title: string
  items: { label: string; make: (c: InsertCtx) => Command[] }[]
}[] = [
  {
    title: '单指令',
    items: [
      { label: '💬 对话', make: () => [{ kind: 'dialog', line: { text: '(新对话)' } }] },
      { label: '⏱ 等待', make: () => [{ kind: 'wait', ms: 200 }] },
      {
        label: '🚶 队伍走到',
        make: (c) => [{ kind: 'moveParty', to: { ...c.scene.entry.pos }, speed: 'normal' }],
      },
      {
        label: '🚶 实体走到',
        make: (c) => [
          { kind: 'moveEntity', entity: selfOf(c), to: { ...c.scene.entry.pos }, speed: 'normal' },
        ],
      },
      {
        label: '📍 队伍瞬移',
        make: (c) => [{ kind: 'teleportParty', pos: { ...c.scene.entry.pos } }],
      },
      { label: '🧭 队伍转向', make: () => [{ kind: 'setPartyFacing', facing: 'down' }] },
      {
        label: '👁 实体显隐',
        make: (c) => [{ kind: 'setEntityState', entity: selfOf(c), state: 1 }],
      },
      {
        label: '🧭 实体转向',
        make: (c) => [{ kind: 'setEntityFacing', entity: selfOf(c), facing: 'down' }],
      },
      { label: '🌓 淡入/淡出', make: () => [{ kind: 'fade', dir: 'out', ms: 300 }] },
      { label: '🎵 音乐', make: () => [{ kind: 'playMusic', musicId: 1 }] },
      {
        label: '🚪 切场景',
        make: (c) => [{ kind: 'loadScene', scene: c.scene.id, pos: { ...c.scene.entry.pos } }],
      },
      { label: '⚔ 战斗', make: () => [{ kind: 'startBattle', team: 0 }] },
    ],
  },
  {
    title: '剧情开关(flag/var —— 数据模式「变量」页自动收录)',
    items: [
      { label: '🚩 设开关', make: () => [{ kind: 'setFlag', flag: 'my-flag', value: true }] },
      { label: '🔢 设数值', make: () => [{ kind: 'setVar', var: 'my-var', value: 1 }] },
      {
        label: '🔀 按开关分支',
        make: () => [
          {
            kind: 'branch',
            cond: { kind: 'flag', flag: 'my-flag', is: true },
            then: [{ kind: 'dialog', line: { text: '(开关已开)' } }],
            else: [{ kind: 'dialog', line: { text: '(开关未开)' } }],
          },
        ],
      },
    ],
  },
  {
    title: '事件模板(展开为指令组)',
    items: [
      {
        // 435 例:宝箱 —— 开盖帧**持久**(状态切换);防重复 = 原版全部走多段
        // (段0 给物 next=1,段1「空箱」提示)。v1 插的是段内指令组,第 2 段请手动补。
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
  kind: 'onEnter' | 'onTeleport' | 'trigger' | 'auto'
  sub: string
  stages: readonly ScriptStage[]
}

/** 收集一个场景的全部脚本源。 */
function collectSources(scene: SceneDef): ScriptSource[] {
  const out: ScriptSource[] = []
  if (scene.onEnter?.length)
    out.push({
      key: '__onEnter__',
      label: '进场脚本',
      kind: 'onEnter',
      sub: `${scene.onEnter.length} 段`,
      stages: scene.onEnter,
    })
  if (scene.onTeleport?.length)
    out.push({
      key: '__onTeleport__',
      label: '传送出口(引路蜂/土灵珠)',
      kind: 'onTeleport',
      sub: `${scene.onTeleport.length} 段`,
      stages: scene.onTeleport,
    })
  for (const e of scene.entities) {
    const page = e.pages?.[0]
    if (page?.trigger) {
      const on = page.trigger.on === 'interact' ? '交互' : '触碰'
      out.push({
        key: `${e.id}:trigger`,
        label: e.id,
        kind: 'trigger',
        sub: `${on}触发`,
        stages: page.trigger.stages,
      })
    }
    if (page?.auto)
      out.push({
        key: `${e.id}:auto`,
        label: e.id,
        kind: 'auto',
        sub: '巡逻/动画',
        stages: page.auto.stages,
      })
  }
  return out
}

const KIND_LABEL: Record<ScriptSource['kind'], string> = {
  onEnter: '进场',
  onTeleport: '传送出口',
  trigger: '触发',
  auto: '巡逻',
}

const ICON: Record<ScriptSource['kind'], string> = {
  onEnter: '🚩',
  onTeleport: '🌀',
  trigger: '🔗',
  auto: '🔁',
}

/** 稳定空 stages 引用(无活动源时喂给预览;每渲染新 [] 会破 spriteNums memo)。 */
const EMPTY_STAGES: readonly ScriptStage[] = []

export function ScriptDrawer(props: {
  scene: SceneDef
  scenes: SceneDef[]
  locale: Locale
  /** 当前选中实体(左树/画布唯一选择入口;null = 场景节点)。源列跟随选中,不重复大纲。 */
  selectedEntityId?: string | null
  /** 定位脚本源(检查器「去编辑」/数据模式引用跳转:__onEnter__ / <eid>:trigger / <eid>:auto)。 */
  focusSrcKey?: string | null
  sprites: SpriteDef[]
  actorsById: Record<string, ActorDef>
  leaderSpriteId: string | undefined
  assetBase: AssetBase
  /** 自有地图实时副本(键 = ownMap 路径);传给大预览渲染 own 场景。 */
  ownMaps: Record<string, OwnMap>
  /** tileset 注册表(W7B;转发大预览)。 */
  tilesets: readonly import('@type-pal/reforge').TilesetDef[]
  tilesetBlobs: Record<string, ArrayBuffer>
  session: EditSession
  music: MusicDef[]
  /** 氛围表(setAmbience 表单下拉;W6)。 */
  ambiences?: AmbienceDef[]
  /** 网格/禁入/透视叠加开关(与布置模式同一状态;传给大预览)。 */
  layers?: { grid: boolean; blocked: boolean; ghosts?: boolean }
  onClose: () => void
}) {
  const {
    scene,
    scenes,
    locale,
    selectedEntityId,
    focusSrcKey,
    sprites,
    actorsById,
    leaderSpriteId,
    assetBase,
    ownMaps,
    tilesets,
    tilesetBlobs,
    session,
    music,
    ambiences,
    layers,
    onClose,
  } = props
  const [srcKey, setSrcKey] = useState<string | null>(focusSrcKey ?? null)
  // 外部定位(点检查器「去编辑」/引用跳转)→ 跟随切源
  useEffect(() => {
    if (focusSrcKey) setSrcKey(focusSrcKey)
  }, [focusSrcKey])

  // 源列**跟随选中**(作者:全场景源列和左大纲重复):实体选中 → 该实体源;场景节点 → 场景级源
  const allSources = useMemo(() => collectSources(scene), [scene])
  const sources = useMemo(
    () =>
      selectedEntityId
        ? allSources.filter((s) => s.key.startsWith(`${selectedEntityId}:`))
        : allSources.filter((s) => s.kind === 'onEnter' || s.kind === 'onTeleport'),
    [allSources, selectedEntityId],
  )
  // 换选中:当前源不属于新范围 → 自动落到范围内首源
  useEffect(() => {
    if (srcKey && sources.some((s) => s.key === srcKey)) return
    setSrcKey(sources[0]?.key ?? null)
    // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在选中范围变化时收敛
  }, [sources])
  const active = sources.find((s) => s.key === srcKey) ?? sources[0]

  // 演出预览控制器:随场景重建;切场景/切源/卸载时停播丢弃演出态
  const playback = useMemo(() => new Playback(scene), [scene])
  const [, setUiTick] = useState(0)
  const prevRef = useRef<Playback | null>(null)
  useEffect(() => {
    prevRef.current?.stop()
    prevRef.current = playback
    playback.onUi = () => setUiTick((x) => x + 1) // 低频 UI:高亮/对话/日志/mode
    return () => playback.stop()
  }, [playback])
  // biome-ignore lint/correctness/useExhaustiveDependencies: 仅在源切换时停播
  useEffect(() => {
    playback.stop()
  }, [active?.key])

  // ── 脚本编辑:选中行 → 右栏表单;行按钮 插/移/删;整 stages 经指令落 session ──
  const [selPath, setSelPath] = useState<string | null>(null)
  const [insertFor, setInsertFor] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切场景/切源即清选中
  useEffect(() => {
    setSelPath(null)
    setInsertFor(null)
  }, [scene.id, active?.key])

  const refOf = (key: string): ScriptSourceRef =>
    key === '__onEnter__'
      ? { kind: 'onEnter' }
      : key === '__onTeleport__'
        ? { kind: 'onTeleport' } // 旧事件模式漏此分支 → 编辑 onTeleport 会写坏 auto(隐性 bug,迁抽屉时修)
        : key.endsWith(':trigger')
          ? { kind: 'trigger', entityId: key.slice(0, -':trigger'.length) }
          : { kind: 'auto', entityId: key.slice(0, -':auto'.length) }

  const dispatchStages = (stages: readonly ScriptStage[]): void => {
    if (!active) return
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
      if (selPath === path) {
        const last = p[p.length - 1] as number
        setSelPath([...p.slice(0, -1), last + dir].join('/'))
      }
    }
  }

  return (
    <div className="script-work">
      {/* 上:大预览 —— 占原地图画布位(作者:预览就该用地图的位置,不塞小角落) */}
      <div className="work-preview">
        {/* 地图 = 场景画布,脚本模式**始终**渲染(没活动源也画地图+实体,免黑屏看不见场景 —— s119 类无
            onEnter/onTeleport 场景的坑)。有源 → 焦点该源触发实体 + 可播;无源 → 焦点选中实体(或玩家)+ 提示。 */}
        <PreviewCanvas
          scene={scene}
          stages={active?.stages ?? EMPTY_STAGES}
          sourceKey={active?.key ?? '__none__'}
          focusEntityId={
            active
              ? refOf(active.key).kind === 'onEnter' || refOf(active.key).kind === 'onTeleport'
                ? undefined
                : (refOf(active.key) as { entityId: string }).entityId
              : (selectedEntityId ?? undefined)
          }
          sprites={sprites}
          actorsById={actorsById}
          leaderSpriteId={leaderSpriteId}
          assetBase={assetBase}
          ownMaps={ownMaps}
          tilesets={tilesets}
          tilesetBlobs={tilesetBlobs}
          locale={locale}
          playback={playback}
          layers={layers}
          sceneFraming={!active && !selectedEntityId}
          hint={
            active
              ? undefined
              : selectedEntityId
                ? '此实体还没有脚本 —— 用下方「＋触发 / ＋巡逻」给它加'
                : '选中左侧实体看它的脚本;场景级脚本用下方「＋进场脚本 / ＋传送出口」'
          }
        />
      </div>
      <div className="script-drawer">
      <div className="drawer-head">
        <span
          className="t"
          style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 40 }}
        >
          📜 {scene.id}
          {selectedEntityId ? ` · ${selectedEntityId}` : ''}
        </span>
        {/* 源页签(作者:源列一栏冗余 → 收进头部):有则切换,缺则就地创建 */}
        <span className="drawer-tabs">
          {sources.map((s) => (
            <button
              key={s.key}
              type="button"
              className={`mini-txt${active?.key === s.key ? ' sel' : ''}`}
              title={s.sub}
              onClick={() => setSrcKey(s.key)}
            >
              {ICON[s.kind]} {KIND_LABEL[s.kind]}
            </button>
          ))}
          {selectedEntityId ? (
            <>
              {!scene.entities.find((e) => e.id === selectedEntityId)?.pages?.[0]?.trigger && (
                <button
                  type="button"
                  className="mini-txt"
                  title="给选中实体创建交互触发脚本"
                  onClick={() => {
                    session.dispatch(
                      new CreateScriptSourceCommand(scene.id, {
                        kind: 'trigger',
                        entityId: selectedEntityId,
                      }),
                    )
                    setSrcKey(`${selectedEntityId}:trigger`)
                  }}
                >
                  ＋触发
                </button>
              )}
              {!scene.entities.find((e) => e.id === selectedEntityId)?.pages?.[0]?.auto && (
                <button
                  type="button"
                  className="mini-txt"
                  title="给选中实体创建巡逻/自动脚本"
                  onClick={() => {
                    session.dispatch(
                      new CreateScriptSourceCommand(scene.id, {
                        kind: 'auto',
                        entityId: selectedEntityId,
                      }),
                    )
                    setSrcKey(`${selectedEntityId}:auto`)
                  }}
                >
                  ＋巡逻
                </button>
              )}
            </>
          ) : (
            <>
              {!scene.onEnter?.length && (
                <button
                  type="button"
                  className="mini-txt"
                  title="创建进场脚本"
                  onClick={() => {
                    session.dispatch(new CreateScriptSourceCommand(scene.id, { kind: 'onEnter' }))
                    setSrcKey('__onEnter__')
                  }}
                >
                  ＋进场脚本
                </button>
              )}
              {!scene.onTeleport?.length && (
                <button
                  type="button"
                  className="mini-txt"
                  title="创建传送出口脚本(引路蜂/土灵珠用它把队伍送出本场景;通常淡出+loadScene 回洞口)"
                  onClick={() => {
                    session.dispatch(new CreateScriptSourceCommand(scene.id, { kind: 'onTeleport' }))
                    setSrcKey('__onTeleport__')
                  }}
                >
                  ＋传送出口
                </button>
              )}
            </>
          )}
        </span>
        {active?.kind === 'trigger' && selectedEntityId
          ? (() => {
              const trig = scene.entities.find((e) => e.id === selectedEntityId)?.pages?.[0]
                ?.trigger
              if (!trig) return null
              return (
                <span className="drawer-tabs" title="触发方式与距离(格)">
                  <span style={{ color: 'var(--faint)', fontSize: 11, alignSelf: 'center' }}>
                    方式
                  </span>
                  <select
                    className="in"
                    style={{ height: 22, fontSize: 12, width: 104, flex: 'none' }}
                    value={trig.on ?? 'interact'}
                    onChange={(e) =>
                      session.dispatch(
                        new UpdateTriggerModeCommand(
                          scene.id,
                          selectedEntityId,
                          e.target.value as 'interact' | 'touch',
                          trig.range,
                        ),
                      )
                    }
                  >
                    <option value="interact">交互(空格)</option>
                    <option value="touch">触碰即发</option>
                  </select>
                  <span style={{ color: 'var(--faint)', fontSize: 11, alignSelf: 'center' }}>
                    距离
                  </span>
                  <input
                    className="in"
                    type="number"
                    min={0}
                    style={{ width: 48, height: 22, fontSize: 12 }}
                    title="触发距离(格;交互缺省 1,触碰缺省 0)"
                    value={trig.range ?? (trig.on === 'touch' ? 0 : 1)}
                    onChange={(e) =>
                      session.dispatch(
                        new UpdateTriggerModeCommand(
                          scene.id,
                          selectedEntityId,
                          trig.on ?? 'interact',
                          Math.max(0, Number(e.target.value) || 0),
                        ),
                      )
                    }
                  />
                </span>
              )
            })()
          : null}
        {active ? (
          <button
            type="button"
            className="mini-txt"
            style={{ marginLeft: 10, color: 'var(--err)' }}
            title="删除当前脚本源(可 ↶ 撤销)"
            onClick={() => {
              session.dispatch(new DeleteScriptSourceCommand(scene.id, refOf(active.key)))
              setSrcKey(null)
            }}
          >
            🗑 删此脚本
          </button>
        ) : null}
        <span className="spacer" />
        <span
          style={{
            color: 'var(--faint)',
            fontSize: 11,
            marginRight: 8,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            flex: '0 1 auto',
          }}
          title="改动即入 undo(↺/↻);▶ 预览是临时副本,不改数据"
        >
          改动即入 undo · ▶ 预览不改数据
        </span>
        <button type="button" className="mini-txt" onClick={onClose} title="收起抽屉">
          ▾ 收起
        </button>
      </div>
      <div className="drawer-body">
        {/* 中:指令树(播放跟随高亮) */}
        <div className="drawer-tree">
          {active ? (
            <ScriptTree
              stages={active.stages}
              locale={locale}
              activePath={playback.activePath ?? null}
              selectedPath={selPath}
              onSelect={(path) => {
                setSelPath(path)
                setInsertFor(null)
              }}
              onRowAction={onRowAction}
              onStageAction={(i, a) => {
                if (!active) return
                const next =
                  a.kind === 'addAfter'
                    ? addStageAfter(active.stages, i)
                    : a.kind === 'remove'
                      ? removeStage(active.stages, i)
                      : setStageNext(active.stages, i, a.next)
                if (next !== active.stages) {
                  dispatchStages(next)
                  setSelPath(null)
                }
              }}
            />
          ) : (
            <div className="insp-empty">
              {selectedEntityId
                ? `${selectedEntityId} 还没有脚本 —— 顶部「＋触发 / ＋巡逻」创建。`
                : '选中实体编它的脚本;或顶部创建场景进场脚本。'}
            </div>
          )}
        </div>

        {/* 右:演出预览(上)+ 表单/插入/日志(下滚动) */}
        <div className="drawer-side">
          <div className="drawer-form">
            {insertFor && active ? (
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
                            const ctx: InsertCtx = {
                              scene,
                              ownerId:
                                ref.kind === 'onEnter' || ref.kind === 'onTeleport'
                                  ? undefined
                                  : ref.entityId,
                            }
                            const cmds = t.make(ctx)
                            const p = parsePath(insertFor)
                            let stages = active.stages
                            let at = p
                            for (const cmd of cmds) {
                              const last = at[at.length - 1] as number
                              if (last === -1) {
                                // 空段「＋ 插入第一条指令」:段首插入
                                stages = insertAtHead(stages, at[0] as number, cmd)
                                at = [at[0] as number, 0]
                              } else {
                                stages = insertAfterAt(stages, at, cmd)
                                at = [...at.slice(0, -1), last + 1]
                              }
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
                  <button type="button" className="pv-btn" onClick={() => setInsertFor(null)}>
                    取消
                  </button>
                </div>
              </div>
            ) : null}
            {selCmd && active && selPath ? (
              <div className="section">
                <h4>
                  编辑指令 <span className="cf-path">{selPath}</span>
                </h4>
                <CommandForm
                  actors={actorsById}
                  cmd={selCmd}
                  scene={scene}
                  locale={locale}
                  music={music}
                  musicBase={assetBase.music}
                  scenes={scenes}
                  assetBase={assetBase}
                  ambiences={ambiences}
                  onChange={(next) => {
                    const out = updateCommandAt(active.stages, parsePath(selPath), next)
                    if (out !== active.stages) dispatchStages(out)
                  }}
                />
              </div>
            ) : null}
            {playback.view.logs.length > 0 ? (
              <div className="section">
                <h4>演出日志(桩指令)</h4>
                <div className="pv-logs">
                  {playback.view.logs.slice(-40).map((l, i) => (
                    <div key={i} className="pv-log">
                      {l}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {!selCmd && !insertFor ? (
              <div className="section">
                <h4>就地写脚本</h4>
                <p className="hint">
                  点树中指令行 → 此处编辑;行悬停 ＋/↑/↓/🗑。▶ 从头播;⏭ 单步(树中高亮)。
                  <span className="warn-inline">⚠ 黄色</span> = 未翻译逃生口。
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}
