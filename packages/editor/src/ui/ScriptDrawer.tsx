/**
 * 场景模式 · 底部脚本抽屉(audit §6 Step2,作者拍板形态)—— 独立事件模式的接替者。
 * 工作流:建场景 → 选地图 → 布精灵 → **选实体就地写脚本 → 预览**,全程不离开场景模式。
 * 三栏横排:左 = 本场景脚本源(+创建器);中 = 指令树(播放跟随高亮);
 * 右 = 演出预览(上)+ 指令表单/插入菜单/日志(下)。
 * 编辑逻辑与原事件模式同源(UpdateScriptCommand → session,undo 可回)。
 */

import {
  type ActorDef,
  type AmbienceDef,
  type Command,
  type Facing,
  getScriptBody,
  type Locale,
  type MusicDef,
  type SceneDef,
  type ScriptChunkV1,
  type ScriptIndexV1,
  type ScriptRef,
  type ScriptStage,
  type ShopDef,
  type SpriteDef,
} from '@type-pal/content'
import { type AssetBase, MemoryScriptResolver, type OwnMap } from '@type-pal/reforge'
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react'
import {
  CreateScriptSourceCommand,
  DeleteScriptSourceCommand,
  type ScriptSourceRef,
  UpdateScriptBodyCommand,
  UpdateScriptCommand,
  UpdateTriggerModeCommand,
} from '../core/commands.js'
import type { EditSession } from '../core/edit-session.js'
import { Playback } from '../core/playback.js'
import { materializeSceneStages } from '../core/scene-script-view.js'
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
import { createAuthoredScriptCall } from '../core/shared-script.js'
import { CommandForm } from './CommandForm.js'
import {
  PanelResizeHandle,
  useStoredPanelBoolean,
  useStoredPanelNumber,
} from './PanelResizeHandle.js'
import { PreviewCanvas } from './PreviewCanvas.js'
import { clampPanelSize } from './panel-layout.js'
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
  {
    // E2 巡逻模板:插进实体「行为脚本(auto)」源 —— auto 跑完整套自动重跑 = 天然循环,
    // 不需要任何「循环」指令。形状提炼自 pal 真实市集游走(s004 e76 环线 / e83 驻足张望)。
    title: '巡逻(插到实体行为脚本 auto;跑完自动重复)',
    items: [
      {
        // 来回走:A(当前位)↔ B(右移 4 格);落点/速度插完就地改
        label: '🚶 来回走 A↔B',
        make: (c) => {
          const self = selfOf(c)
          const p = c.scene.entities.find((e) => e.id === c.ownerId)?.pos ?? c.scene.entry.pos
          return [
            {
              kind: 'moveEntity',
              entity: self,
              to: { col: p.col + 4, row: p.row, height: p.height },
              speed: 'slow',
            },
            { kind: 'wait', ms: 400 },
            { kind: 'moveEntity', entity: self, to: { ...p }, speed: 'slow' },
            { kind: 'wait', ms: 400 },
          ]
        },
      },
      {
        // 环线:绕当前位四角(顺时针);照 s004 e76 途经点形状
        label: '🔁 环线巡逻(四角)',
        make: (c) => {
          const self = selfOf(c)
          const p = c.scene.entities.find((e) => e.id === c.ownerId)?.pos ?? c.scene.entry.pos
          const pt = (dc: number, dr: number) => ({
            col: p.col + dc,
            row: p.row + dr,
            height: p.height,
          })
          return [
            { kind: 'moveEntity', entity: self, to: pt(4, 0), speed: 'slow' },
            { kind: 'moveEntity', entity: self, to: pt(4, 4), speed: 'slow' },
            { kind: 'moveEntity', entity: self, to: pt(0, 4), speed: 'slow' },
            { kind: 'moveEntity', entity: self, to: { ...p }, speed: 'slow' },
          ]
        },
      },
      {
        // 驻足张望:四向轮转(照 s004 e83 的 wait+facing+frame0 真实形状)
        label: '👀 驻足张望(四向)',
        make: (c) => {
          const self = selfOf(c)
          const look = (facing: Facing): Command[] => [
            { kind: 'setEntityFacing', entity: self, facing },
            { kind: 'setEntityFrame', entity: self, frame: 0 },
            { kind: 'wait', ms: 600 },
          ]
          return [...look('down'), ...look('left'), ...look('up'), ...look('right')]
        },
      },
      {
        // 随机游走:两层五五开 → 四向各 25% 单步;auto 重跑天然重掷
        label: '🎲 随机游走一步',
        make: (c) => {
          const self = selfOf(c)
          return [
            {
              kind: 'branch',
              cond: { kind: 'chance', percent: 50 },
              then: [
                {
                  kind: 'branch',
                  cond: { kind: 'chance', percent: 50 },
                  then: [{ kind: 'stepEntity', entity: self, dir: 'up' }],
                  else: [{ kind: 'stepEntity', entity: self, dir: 'down' }],
                },
              ],
              else: [
                {
                  kind: 'branch',
                  cond: { kind: 'chance', percent: 50 },
                  then: [{ kind: 'stepEntity', entity: self, dir: 'left' }],
                  else: [{ kind: 'stepEntity', entity: self, dir: 'right' }],
                },
              ],
            },
            { kind: 'wait', ms: 500 },
          ]
        },
      },
    ],
  },
]

interface ScriptSource {
  key: string
  label: string
  kind: 'onEnter' | 'onTeleport' | 'trigger' | 'auto'
  sub: string
  rawStages: readonly ScriptStage[]
  stages: readonly ScriptStage[]
  bindings: ReadonlyArray<ScriptRef | undefined>
}

function sourceRefOf(key: string): ScriptSourceRef {
  return key === '__onEnter__'
    ? { kind: 'onEnter' }
    : key === '__onTeleport__'
      ? { kind: 'onTeleport' }
      : key.endsWith(':trigger')
        ? { kind: 'trigger', entityId: key.slice(0, -':trigger'.length) }
        : { kind: 'auto', entityId: key.slice(0, -':auto'.length) }
}

function materializedSource(
  scene: SceneDef,
  source: Omit<ScriptSource, 'rawStages' | 'bindings'>,
  index: ScriptIndexV1 | undefined,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
): ScriptSource {
  const resolved = materializeSceneStages(
    scene.id,
    sourceRefOf(source.key),
    source.stages,
    index,
    chunks,
  )
  return {
    ...source,
    rawStages: source.stages,
    stages: resolved.stages,
    bindings: resolved.bindings,
  }
}

/** 收集一个场景的全部脚本源，并透明展开 M3 场景私有根绑定。 */
function collectSources(
  scene: SceneDef,
  index: ScriptIndexV1 | undefined,
  chunks: Readonly<Record<string, ScriptChunkV1>>,
): ScriptSource[] {
  const out: ScriptSource[] = []
  if (scene.onEnter?.length)
    out.push(
      materializedSource(
        scene,
        {
          key: '__onEnter__',
          label: '进场脚本',
          kind: 'onEnter',
          sub: `${scene.onEnter.length} 段`,
          stages: scene.onEnter,
        },
        index,
        chunks,
      ),
    )
  if (scene.onTeleport?.length)
    out.push(
      materializedSource(
        scene,
        {
          key: '__onTeleport__',
          label: '传送出口(引路蜂/土灵珠)',
          kind: 'onTeleport',
          sub: `${scene.onTeleport.length} 段`,
          stages: scene.onTeleport,
        },
        index,
        chunks,
      ),
    )
  for (const e of scene.entities) {
    const page = e.pages?.[0]
    if (page?.trigger) {
      const on = page.trigger.on === 'interact' ? '交互' : '触碰'
      out.push(
        materializedSource(
          scene,
          {
            key: `${e.id}:trigger`,
            label: e.id,
            kind: 'trigger',
            sub: `${on}触发`,
            stages: page.trigger.stages,
          },
          index,
          chunks,
        ),
      )
    }
    if (page?.auto)
      out.push(
        materializedSource(
          scene,
          {
            key: `${e.id}:auto`,
            label: e.id,
            kind: 'auto',
            sub: '巡逻/动画',
            stages: page.auto.stages,
          },
          index,
          chunks,
        ),
      )
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
const DRAWER_DEFAULT_HEIGHT = 320
const DRAWER_MIN_HEIGHT = 180
const PREVIEW_MIN_HEIGHT = 140
const DRAWER_SIDE_DEFAULT_WIDTH = 360
const DRAWER_SIDE_MIN_WIDTH = 260
const DRAWER_SIDE_MAX_WIDTH = 720
const DRAWER_TREE_MIN_WIDTH = 220
const RESIZER_SIZE = 1

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
  /** 工程 id(同源试玩页 ?project=)。 */
  projectId: string
  /** 氛围表(setAmbience 表单下拉;W6)。 */
  ambiences?: AmbienceDef[]
  /** 店铺表(openShop 表单店下拉)。 */
  shops?: ShopDef[]
  /** 网格/禁入/透视叠加开关(与布置模式同一状态;传给大预览)。 */
  layers?: { grid: boolean; blocked: boolean; ghosts?: boolean }
  /** N6:从调用行跳到数据模式的共享脚本页。 */
  onOpenScript?: (id: string) => void
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
    projectId,
    ambiences,
    shops,
    layers,
    onOpenScript,
    onClose,
  } = props
  const scriptWorkRef = useRef<HTMLDivElement>(null)
  const drawerBodyRef = useRef<HTMLDivElement>(null)
  const [scriptWorkHeight, setScriptWorkHeight] = useState(0)
  const [drawerBodyWidth, setDrawerBodyWidth] = useState(0)
  const [drawerHeight, setDrawerHeight] = useStoredPanelNumber(
    'type-pal:editor:script-drawer-height',
    DRAWER_DEFAULT_HEIGHT,
  )
  const [drawerSideWidth, setDrawerSideWidth] = useStoredPanelNumber(
    'type-pal:editor:script-side-width',
    DRAWER_SIDE_DEFAULT_WIDTH,
  )
  const [drawerSideCollapsed, setDrawerSideCollapsed] = useStoredPanelBoolean(
    'type-pal:editor:script-side-collapsed',
    false,
  )

  useEffect(() => {
    const work = scriptWorkRef.current
    const body = drawerBodyRef.current
    if (!work || !body) return
    const syncSize = (): void => {
      setScriptWorkHeight(work.clientHeight)
      setDrawerBodyWidth(body.clientWidth)
    }
    syncSize()
    const observer = new ResizeObserver(syncSize)
    observer.observe(work)
    observer.observe(body)
    return () => observer.disconnect()
  }, [])

  const [srcKey, setSrcKey] = useState<string | null>(focusSrcKey ?? null)
  // 外部定位(点检查器「去编辑」/引用跳转)→ 跟随切源
  useEffect(() => {
    if (focusSrcKey) setSrcKey(focusSrcKey)
  }, [focusSrcKey])

  const editorState = session.getState()
  const scriptIndex = editorState.scriptIndex
  const scriptChunks = editorState.scriptChunks
  // 源列**跟随选中**(作者:全场景源列和左大纲重复):实体选中 → 该实体源;场景节点 → 场景级源
  const allSources = useMemo(
    () => collectSources(scene, scriptIndex, scriptChunks),
    [scene, scriptChunks, scriptIndex],
  )
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
  }, [sources, srcKey])
  const active = sources.find((s) => s.key === srcKey) ?? sources[0]
  const [internalTrail, setInternalTrail] = useState<string[]>([])
  const internalScriptId = internalTrail.at(-1)
  const internalBody =
    internalScriptId && scriptIndex
      ? getScriptBody(scriptIndex, scriptChunks, internalScriptId)
      : undefined
  const internalStages = useMemo<ScriptStage[]>(
    () => (internalBody ? [{ body: internalBody }] : []),
    [internalBody],
  )
  const editingStages = internalScriptId ? internalStages : (active?.stages ?? EMPTY_STAGES)

  // 演出预览控制器:随场景重建;切场景/切源/卸载时停播丢弃演出态
  const playback = useMemo(() => {
    const resolver = scriptIndex ? new MemoryScriptResolver(scriptIndex, scriptChunks) : undefined
    return new Playback(scene, resolver)
  }, [scene, scriptChunks, scriptIndex])
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
  }, [active?.key, internalScriptId])

  // ── 脚本编辑:选中行 → 右栏表单;行按钮 插/移/删;整 stages 经指令落 session ──
  const [selPath, setSelPath] = useState<string | null>(null)
  const [insertFor, setInsertFor] = useState<string | null>(null)
  // biome-ignore lint/correctness/useExhaustiveDependencies: 切场景/切源即回到该场景源并清临时选择
  useEffect(() => {
    setSelPath(null)
    setInsertFor(null)
    setInternalTrail([])
  }, [scene.id, active?.key])

  const dispatchBody = (stages: readonly ScriptStage[], stageIndex: number): void => {
    const stage = stages[stageIndex]
    if (!stage) return
    if (internalScriptId) {
      session.dispatch(new UpdateScriptBodyCommand(internalScriptId, stage.body))
      return
    }
    if (!active) return
    const binding = active.bindings[stageIndex]
    if (binding) {
      session.dispatch(new UpdateScriptBodyCommand(binding.id, stage.body))
      return
    }
    const rawStages = active.rawStages.map((raw, index) =>
      index === stageIndex ? { ...raw, body: stage.body } : raw,
    )
    session.dispatch(new UpdateScriptCommand(scene.id, sourceRefOf(active.key), rawStages))
  }
  const selCmd = selPath ? getCommandAt(editingStages, parsePath(selPath)) : undefined

  const openScriptTarget = (id: string): void => {
    if (scriptIndex?.library?.[id]) {
      onOpenScript?.(id)
      return
    }
    if (!scriptIndex || !getScriptBody(scriptIndex, scriptChunks, id)) return
    setInternalTrail((current) => {
      const existing = current.indexOf(id)
      return existing >= 0 ? current.slice(0, existing + 1) : [...current, id]
    })
    setSelPath(null)
    setInsertFor(null)
  }

  const onRowAction = (path: string, action: RowAction): void => {
    if (!editingStages.length) return
    const p = parsePath(path)
    const stageIndex = p[0]
    if (typeof stageIndex !== 'number') return
    if (action === 'insert') {
      setInsertFor(path)
      return
    }
    if (action === 'remove') {
      const next = removeAt(editingStages, p)
      if (next !== editingStages) {
        dispatchBody(next, stageIndex)
        if (selPath === path) setSelPath(null)
      }
      return
    }
    const dir = action === 'up' ? -1 : 1
    const next = moveAt(editingStages, p, dir)
    if (next !== editingStages) {
      dispatchBody(next, stageIndex)
      if (selPath === path) {
        const last = p[p.length - 1] as number
        setSelPath([...p.slice(0, -1), last + dir].join('/'))
      }
    }
  }

  const insertCommands = (commands: readonly Command[]): void => {
    if (!editingStages.length || !insertFor) return
    let stages = editingStages
    let at = parsePath(insertFor)
    const stageIndex = at[0]
    if (typeof stageIndex !== 'number') return
    for (const command of commands) {
      const last = at[at.length - 1] as number
      if (last === -1) {
        stages = insertAtHead(stages, at[0] as number, command)
        at = [at[0] as number, 0]
      } else {
        stages = insertAfterAt(stages, at, command)
        at = [...at.slice(0, -1), last + 1]
      }
    }
    if (stages !== editingStages) {
      dispatchBody(stages, stageIndex)
      setSelPath(at.join('/'))
    }
    setInsertFor(null)
  }
  const authoredScripts = Object.entries(scriptIndex?.library ?? {}).sort(([, a], [, b]) =>
    a.name.localeCompare(b.name),
  )
  const measuredWorkHeight = scriptWorkHeight || 720
  const drawerMaxHeight = Math.max(
    DRAWER_MIN_HEIGHT,
    measuredWorkHeight - PREVIEW_MIN_HEIGHT - RESIZER_SIZE,
  )
  const visibleDrawerHeight = clampPanelSize(drawerHeight, DRAWER_MIN_HEIGHT, drawerMaxHeight)
  const measuredDrawerBodyWidth = drawerBodyWidth || 980
  const drawerSideResizeMax = Math.min(
    DRAWER_SIDE_MAX_WIDTH,
    Math.max(DRAWER_SIDE_MIN_WIDTH, measuredDrawerBodyWidth - DRAWER_TREE_MIN_WIDTH - RESIZER_SIZE),
  )
  const requestedDrawerSideWidth = clampPanelSize(
    drawerSideWidth,
    DRAWER_SIDE_MIN_WIDTH,
    drawerSideResizeMax,
  )
  const visibleDrawerSideWidth = drawerSideCollapsed
    ? 0
    : Math.min(
        requestedDrawerSideWidth,
        Math.max(0, measuredDrawerBodyWidth - DRAWER_TREE_MIN_WIDTH - RESIZER_SIZE),
      )
  const scriptWorkStyle = {
    '--script-drawer-height': `${visibleDrawerHeight}px`,
  } as CSSProperties
  const drawerBodyStyle = {
    '--script-side-width': `${visibleDrawerSideWidth}px`,
  } as CSSProperties

  return (
    <div ref={scriptWorkRef} className="script-work" style={scriptWorkStyle}>
      {/* 上:大预览 —— 占原地图画布位(作者:预览就该用地图的位置,不塞小角落) */}
      <div className="work-preview">
        {/* 地图 = 场景画布,脚本模式**始终**渲染(没活动源也画地图+实体,免黑屏看不见场景 —— s119 类无
            onEnter/onTeleport 场景的坑)。有源 → 焦点该源触发实体 + 可播;无源 → 焦点选中实体(或玩家)+ 提示。 */}
        <PreviewCanvas
          scene={scene}
          stages={editingStages}
          sourceKey={
            internalScriptId ? `internal:${internalScriptId}` : (active?.key ?? '__none__')
          }
          projectId={projectId}
          focusEntityId={
            active
              ? sourceRefOf(active.key).kind === 'onEnter' ||
                sourceRefOf(active.key).kind === 'onTeleport'
                ? undefined
                : (sourceRefOf(active.key) as { entityId: string }).entityId
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
      <PanelResizeHandle
        orientation="horizontal"
        className="script-height-resizer"
        value={visibleDrawerHeight}
        min={DRAWER_MIN_HEIGHT}
        max={drawerMaxHeight}
        resizeLabel="调整脚本面板高度"
        toggleDirection="down"
        toggleLabel="收起脚本面板"
        onToggle={onClose}
        onReset={() => setDrawerHeight(DRAWER_DEFAULT_HEIGHT)}
        onResize={(delta) =>
          setDrawerHeight(
            clampPanelSize(visibleDrawerHeight - delta, DRAWER_MIN_HEIGHT, drawerMaxHeight),
          )
        }
      />
      <div className="script-drawer">
        <div className="drawer-head">
          <span
            className="t"
            style={{
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minWidth: 40,
            }}
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
                onClick={() => {
                  setSrcKey(s.key)
                  setInternalTrail([])
                }}
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
                      session.dispatch(
                        new CreateScriptSourceCommand(scene.id, { kind: 'onTeleport' }),
                      )
                      setSrcKey('__onTeleport__')
                    }}
                  >
                    ＋传送出口
                  </button>
                )}
              </>
            )}
          </span>
          {internalScriptId ? (
            <span className="drawer-internal-nav">
              <button
                type="button"
                className="mini-txt"
                title="返回上一级脚本"
                onClick={() => {
                  setInternalTrail((current) => current.slice(0, -1))
                  setSelPath(null)
                  setInsertFor(null)
                }}
              >
                ← 返回
              </button>
              <code title={internalScriptId}>{internalScriptId}</code>
            </span>
          ) : null}
          {!internalScriptId && active?.kind === 'trigger' && selectedEntityId
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
          {active && !internalScriptId ? (
            <button
              type="button"
              className="mini-txt"
              style={{ marginLeft: 10, color: 'var(--err)' }}
              title="删除当前脚本源(可 ↶ 撤销)"
              onClick={() => {
                session.dispatch(new DeleteScriptSourceCommand(scene.id, sourceRefOf(active.key)))
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
        </div>
        <div
          ref={drawerBodyRef}
          className={`drawer-body${drawerSideCollapsed ? ' drawer-side-collapsed' : ''}`}
          style={drawerBodyStyle}
        >
          {/* 中:指令树(播放跟随高亮) */}
          <div className="drawer-tree">
            {active ? (
              <ScriptTree
                stages={editingStages}
                locale={locale}
                scriptIndex={scriptIndex}
                activePath={playback.activePath ?? null}
                selectedPath={selPath}
                onSelect={(path) => {
                  setSelPath(path)
                  setInsertFor(null)
                }}
                onRowAction={onRowAction}
                onStageAction={
                  internalScriptId
                    ? undefined
                    : (i, a) => {
                        const next =
                          a.kind === 'addAfter'
                            ? addStageAfter(active.rawStages, i)
                            : a.kind === 'remove'
                              ? removeStage(active.rawStages, i)
                              : setStageNext(active.rawStages, i, a.next)
                        if (next !== active.rawStages) {
                          session.dispatch(
                            new UpdateScriptCommand(scene.id, sourceRefOf(active.key), next),
                          )
                          setSelPath(null)
                        }
                      }
                }
              />
            ) : (
              <div className="insp-empty">
                {selectedEntityId
                  ? `${selectedEntityId} 还没有脚本 —— 顶部「＋触发 / ＋巡逻」创建。`
                  : '选中实体编它的脚本;或顶部创建场景进场脚本。'}
              </div>
            )}
          </div>

          <PanelResizeHandle
            orientation="vertical"
            className="script-side-resizer"
            value={visibleDrawerSideWidth}
            min={drawerSideCollapsed ? 0 : DRAWER_SIDE_MIN_WIDTH}
            max={drawerSideCollapsed ? 0 : drawerSideResizeMax}
            resizeLabel="调整脚本属性面板宽度"
            disabled={drawerSideCollapsed}
            toggleDirection={drawerSideCollapsed ? 'left' : 'right'}
            toggleLabel={drawerSideCollapsed ? '展开脚本属性面板' : '收起脚本属性面板'}
            onToggle={() => setDrawerSideCollapsed((value) => !value)}
            onReset={() => setDrawerSideWidth(DRAWER_SIDE_DEFAULT_WIDTH)}
            onResize={(delta) =>
              setDrawerSideWidth(
                clampPanelSize(
                  visibleDrawerSideWidth - delta,
                  DRAWER_SIDE_MIN_WIDTH,
                  drawerSideResizeMax,
                ),
              )
            }
          />

          {/* 右:表单/插入/日志(滚动) */}
          <div className="drawer-side">
            <div className="drawer-form">
              {insertFor && active ? (
                <div className="section">
                  <h4>插入(到选中行之后)</h4>
                  {authoredScripts.length ? (
                    <div>
                      <div className="cf-group">调用共享脚本</div>
                      <div className="cf-insert">
                        {authoredScripts.map(([id, meta]) => (
                          <button
                            key={id}
                            type="button"
                            className="pv-btn"
                            onClick={() => {
                              if (!scriptIndex) return
                              insertCommands([createAuthoredScriptCall(scriptIndex, id)])
                            }}
                          >
                            ↪ {meta.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
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
                              const ref = sourceRefOf(active.key)
                              const ctx: InsertCtx = {
                                scene,
                                ownerId:
                                  ref.kind === 'onEnter' || ref.kind === 'onTeleport'
                                    ? undefined
                                    : ref.entityId,
                              }
                              insertCommands(t.make(ctx))
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
                    shops={shops}
                    scriptIndex={scriptIndex}
                    hasImplicitSelf={active.kind === 'trigger' || active.kind === 'auto'}
                    onOpenScript={openScriptTarget}
                    onChange={(next) => {
                      const path = parsePath(selPath)
                      const stageIndex = path[0]
                      if (typeof stageIndex !== 'number') return
                      const out = updateCommandAt(editingStages, path, next)
                      if (out !== editingStages) dispatchBody(out, stageIndex)
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
