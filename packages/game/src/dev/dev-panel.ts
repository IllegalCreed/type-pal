/**
 * Dev panel —— M3 T29 战斗调试入口。
 *
 * 仅 `import.meta.env.DEV` 时挂监听;生产构建走 dead-code-elimination 直接没了。
 * 浮层是 DOM(z-index=9999),与 320×200 canvas 隔离,不进 framebuffer。
 *
 * 快捷键:
 *  - `B`(探索模式 only)→ 弹 picker,选 fixture → applyFixture(写 GameState + startBattle)
 *  - `F1`(全局)→ console.log GameState 深拷贝 dump
 *
 * **安全约束**:不用 `innerHTML`(security hook 会阻),全用 `document.createElement` +
 * `textContent`。
 *
 * **fixture 数据范围**:enemyTeam/spell/item id 在 `battle-fixtures.json` 注释里 lock,
 * 实施时 cat extracted data verify。spell id 0-101 范围;spec 原写 296/320/350 已删
 * (out of range)。
 */

import type {
  BattleField,
  Command,
  Enemy,
  EnemyObject,
  EnemyPosTable,
  EnemyTeam,
  Item,
  LevelUpMagicEntry,
  Magic,
  ObjectMagicView,
  ObjectPlayerView,
  ObjectPoisonView,
  Palette,
  PlayerRole,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { DialogSprite } from '../assets/dialog-assets.js'
import type { SceneAssets, SceneAssetsCache } from '../assets/loader.js'
import type { IndexedImage } from '../assets/png.js'
import type { SpriteAsset } from '../present/battle/draw-battle-sprites.js'
import { startBattle } from '../core/battle/battle-system.js'
import {
  buildLabelMap,
  getGlobalCommands,
  OP_ADD_MAGIC,
  OP_COLOR_FADE,
  OP_ENDING_ANIMATION,
  OP_FADE_IN,
  OP_FADE_OUT,
  OP_FADE_SCREEN,
  OP_FADE_TO_RED,
  OP_FADE_TO_SCENE,
  OP_PALETTE_FADE,
  OP_SCENE_FADE,
  OP_SET_DAY_PALETTE,
  OP_SET_NIGHT_PALETTE,
  OP_SHAKE_SCREEN,
  OP_WAVE_SCREEN,
} from '../core/event-system.js'
import type { Facing, GameState } from '../core/game-state.js'
import {
  hydratePlayerRolesRuntime,
  PARTYOFFSET_X,
  PARTYOFFSET_Y,
  projectRuntimeToBattleRoles,
} from '../core/game-state.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from '../core/inspect/battle-inspect.js'
import { loadScene } from '../core/scene-system.js'
import { getMapName, hasMapName } from '../tools/map-names.js'

/** fixture JSON entry —— 与 `packages/game/src/dev/fixtures/battle-fixtures.json` 对齐。 */
export interface BattleFixture {
  id: string
  label: string
  partyMembers: number[]
  /**
   * PlayerRole 部分字段 override(key = playerRoleId 字符串)。
   * 类型刻意宽松 —— JSON import 推断会给具体 key 类型,本字段只用于 Object.assign 写入。
   */
  playerOverrides?: Record<string, Partial<Record<string, number | number[]>>>
  /**
   * D11 升级测试:gs.Exp.rgPrimaryExp[role] override(key = roleId 字符串)。设接近升级阈值的经验,
   * 打赢后 finalizeBattle 触发升级演出。省略 → 经验不变。
   */
  expOverrides?: Record<string, { wExp: number; wLevel: number }>
  inventory?: { itemId: number; count: number }[]
  enemyTeamId: number
  battleFieldId: number
}

export interface BattleFixturesData {
  fixtures: BattleFixture[]
}

/** scene jump entry —— 与 `packages/game/src/dev/fixtures/scene-jumps.json` 对齐。 */
export interface SceneJump {
  id: string
  label: string
  sceneId: number
  mapNum?: number
  /**
   * P0.e: partyStart 已删(scene-jumps.json 删 partyStart 字段)。
   * loadScene 不传 partyStart → 走 wScriptOnEnter 自动设位置。
   * 留 optional 供需要 dev override 的极端情况(不传即走 enter script)。
   */
  partyStart?: { x: number; y: number; facing: string }
}

export interface SceneJumpsData {
  jumps: SceneJump[]
}

/**
 * dev-only 场景中文名表 —— 与 `packages/game/src/dev/fixtures/scene-names.json` 对齐。
 * key = sceneId 字符串,value = 人读地名。PAL 无场景名真值,纯 dev 导航便利,手动补全;
 * 面板缺名回退 `scene-N · map-M`。`_doc` 仅注释,运行时忽略。
 */
export interface SceneNamesData {
  names: Record<string, string>
  _doc?: string
}

/**
 * 队伍在队开关纯逻辑(devpanel 队伍 tab 用):返回 toggle roleId 后的 partyMembers。
 * - role 0(队首李逍遥)常驻,toggle 无效(user 2026-06-04:至少保留队首)。
 * - 不在队 → push 末尾(站位顺序);在队 → 保序移除。
 * - 纯函数,不 mutate 入参。
 */
export function togglePartyMembership(members: readonly number[], roleId: number): number[] {
  if (roleId === 0) return [...members]
  if (members.includes(roleId)) return members.filter((m) => m !== roleId)
  return [...members, roleId]
}

/** 正数补 `+` 号(场效 signed 显示用)。 */
function signedText(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

/** 自定义战斗临时 enemyTeam id(devpanel A);applyCustomBattle push 进 enemyTeams,startBattle 按此查。 */
export const CUSTOM_BATTLE_TEAM_ID = 90000

/** 战斗最多 5 敌(MAX_ENEMIES_IN_TEAM)。 */
const MAX_ENEMIES_IN_TEAM = 5

/**
 * 把选中的 enemy id(≤5)pad 成临时 `EnemyTeam`(空位 0xFFFF,超 5 截断)。
 * teamId 默认 CUSTOM_BATTLE_TEAM_ID。纯函数,供自定义战斗 / 测试。
 */
export function buildCustomEnemyTeam(enemyIds: number[], teamId = CUSTOM_BATTLE_TEAM_ID): EnemyTeam {
  const slots = enemyIds.slice(0, MAX_ENEMIES_IN_TEAM)
  const enemies = Array.from({ length: MAX_ENEMIES_IN_TEAM }, (_, i) => slots[i] ?? 0xffff) as [
    number, number, number, number, number,
  ]
  return { id: teamId, enemies }
}

/**
 * 全局脚本 `0x55 addMagic`(operands[1]!=0 → role=operands[1]-1 fixed,script.c:1816)的剧情/法宝授予法术,
 * 按 role 聚合(operands[1]==0 dynamic 跳过)。纯函数;caller 传 getGlobalCommands()。
 */
export function computeMagicGrantsByRole(commands: Command[]): Map<number, Set<number>> {
  const grants = new Map<number, Set<number>>()
  for (const c of commands) {
    if (c.op !== 'raw' || c.opcode !== OP_ADD_MAGIC) continue
    const r1 = c.operands[1] ?? 0
    if (r1 === 0) continue // dynamic(本游戏无)
    const role = r1 - 1
    let set = grants.get(role)
    if (!set) {
      set = new Set()
      grants.set(role, set)
    }
    set.add(c.operands[0] ?? 0)
  }
  return grants
}

/**
 * 角色在 `level` 级时会的全部仙术 = 起手 role.magic + 升级习得(`entry.level<=level`,battle-system.ts:2701
 * 权威 `m.level>level` 跳过)+ 剧情/法宝授予,去重 cap 32(MAX_PLAYER_MAGICS)。
 *
 * level-up-magic 是 `[ROW][ROLE]`(sdlpal lprgLevelUpMagic[j].m[role]),角色习得 = 遍历所有 row 取该角色列。
 * 法术测试(runSpellTest)传 level=99 即全学(等价旧 roleMagics)。
 */
export function roleMagicsAtLevel(input: {
  playerRoles: PlayerRoles
  levelUpMagic: LevelUpMagicEntry[][]
  grantsByRole: Map<number, Set<number>>
  roleId: number
  level: number
}): number[] {
  const { playerRoles, levelUpMagic, grantsByRole, roleId, level } = input
  const role = playerRoles.roles.find((r) => r.id === roleId)
  const start = (role?.magic ?? []).filter((x) => x > 0)
  const learned = (levelUpMagic ?? [])
    .map((row) => row[roleId])
    .filter((e): e is LevelUpMagicEntry => !!e && e.magic > 0 && e.level <= level)
    .map((e) => e.magic)
  const granted = [...(grantsByRole.get(roleId) ?? [])].filter((x) => x > 0)
  return [...new Set([...start, ...learned, ...granted])].slice(0, 32)
}

const DEV_LEVEL_STAT_CAP = 999
const playerRolesBaselines = new WeakMap<PlayerRoles, PlayerRoles>()

function clonePlayerRole(role: PlayerRole): PlayerRole {
  return {
    ...role,
    ...(role.equipment ? { equipment: [...role.equipment] } : {}),
    ...(role.magic ? { magic: [...role.magic] } : {}),
    elemResistance: { ...role.elemResistance },
  }
}

function baselinePlayerRoles(playerRoles: PlayerRoles): PlayerRoles {
  let baseline = playerRolesBaselines.get(playerRoles)
  if (!baseline) {
    baseline = { roles: playerRoles.roles.map((role) => clonePlayerRole(role)) }
    playerRolesBaselines.set(playerRoles, baseline)
  }
  return baseline
}

function capDevLevelStat(value: number): number {
  return Math.max(0, Math.min(DEV_LEVEL_STAT_CAP, Math.trunc(value)))
}

function devLevelGrowthBonus(roleId: number, fromLevel: number, toLevel: number): {
  maxHP: number
  maxMP: number
  attackStrength: number
  magicStrength: number
  defense: number
  dexterity: number
  fleeRate: number
} {
  const out = {
    maxHP: 0,
    maxMP: 0,
    attackStrength: 0,
    magicStrength: 0,
    defense: 0,
    dexterity: 0,
    fleeRate: 0,
  }
  // Dev tool 用确定性序列落在 PAL_PlayerLevelUp 的随机成长范围内,避免同一等级每次开战数值漂移。
  for (let level = fromLevel; level < toLevel; level++) {
    out.maxHP += 10 + ((roleId + level) % 8)
    out.maxMP += 8 + ((roleId + level) % 6)
    out.attackStrength += 4 + ((roleId + level) % 2)
    out.magicStrength += 4 + ((roleId + level + 1) % 2)
    out.defense += 2 + ((roleId + level) % 2)
    out.dexterity += 2 + ((roleId + level + 1) % 2)
    out.fleeRate += 2
  }
  return out
}

function customBattleRoleOverrideAtLevel(input: {
  playerRoles: PlayerRoles
  levelUpMagic: LevelUpMagicEntry[][]
  grantsByRole: Map<number, Set<number>>
  roleId: number
  level: number
}): Partial<Record<string, number | number[]>> {
  const baseline = baselinePlayerRoles(input.playerRoles)
  const role = baseline.roles.find((r) => r.id === input.roleId)
  const current = input.playerRoles.roles.find((r) => r.id === input.roleId)
  const base = role ?? current
  const targetLevel = Math.max(1, Math.min(99, Math.trunc(input.level)))
  const baseLevel = Math.max(1, Math.min(99, Math.trunc(base?.level ?? 1)))
  const growth = devLevelGrowthBonus(input.roleId, baseLevel, Math.max(baseLevel, targetLevel))
  const maxHP = capDevLevelStat((base?.maxHP ?? base?.hp ?? 0) + growth.maxHP)
  const maxMP = capDevLevelStat((base?.maxMP ?? base?.mp ?? 0) + growth.maxMP)

  return {
    level: targetLevel,
    hp: maxHP,
    maxHP,
    mp: maxMP,
    maxMP,
    attackStrength: capDevLevelStat((base?.attackStrength ?? 0) + growth.attackStrength),
    magicStrength: capDevLevelStat((base?.magicStrength ?? 0) + growth.magicStrength),
    defense: capDevLevelStat((base?.defense ?? 0) + growth.defense),
    dexterity: capDevLevelStat((base?.dexterity ?? 0) + growth.dexterity),
    fleeRate: capDevLevelStat((base?.fleeRate ?? 0) + growth.fleeRate),
    magic: roleMagicsAtLevel({
      playerRoles: baseline,
      levelUpMagic: input.levelUpMagic,
      grantsByRole: input.grantsByRole,
      roleId: input.roleId,
      level: targetLevel,
    }),
  }
}

function syncAllExpLevelsForRole(gs: GameState, roleId: number, level: number): void {
  const pools = [
    gs.Exp.rgPrimaryExp,
    gs.Exp.rgHealthExp,
    gs.Exp.rgMagicExp,
    gs.Exp.rgAttackExp,
    gs.Exp.rgMagicPowerExp,
    gs.Exp.rgDefenseExp,
    gs.Exp.rgDexterityExp,
    gs.Exp.rgFleeExp,
  ]
  for (const pool of pools) {
    const entry = pool[roleId]
    if (entry) entry.wLevel = level
  }
}

/**
 * 把索引位图头像(DialogSprite:R=G=B=palette index + opaque mask)用调色板上色画到 DOM canvas。
 * portraits PNG 是索引位图(非真彩),直接 <img> 会错色 —— 必须 palette 上色(同 framebuffer.toImageData)。
 */
function indexImageToCanvas(
  img: { width: number; height: number; indices: Uint8Array; opaque: Uint8Array },
  palette: Palette,
): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d')
  if (ctx) {
    const data = new Uint8ClampedArray(img.width * img.height * 4)
    for (let i = 0; i < img.indices.length; i++) {
      const col = palette.colors[img.indices[i]!] ?? [0, 0, 0]
      data[i * 4] = col[0]
      data[i * 4 + 1] = col[1]
      data[i * 4 + 2] = col[2]
      data[i * 4 + 3] = img.opaque[i] ? 255 : 0 // RLE-skip 透明 → alpha 0
    }
    ctx.putImageData(new ImageData(data, img.width, img.height), 0, 0)
  }
  // 只画像素(canvas 内在尺寸 = 原始);显示尺寸由 caller 设 style(头像 88 高 cover / 道具图标 22×22)。
  return canvas
}

export interface DevPanelDeps {
  gs: GameState
  fixtures: BattleFixturesData
  sceneJumps: SceneJumpsData
  /**
   * dev-only 场景中文名表(scene-names.json)。场景列表优先显示对应名,缺省回退 `scene-N · map-M`。
   * 省略 → 全部走回退。
   */
  sceneNames?: SceneNamesData
  /**
   * 场景缩略图渲染器(bootstrap 注入):把整张 map tilemap 渲染降采样成 PNG dataURL,**按 mapNum 缓存**
   * (同 map 多场景共享同一缩略图),返回 null = 渲染失败 / 资源缺。dev panel 在 IntersectionObserver
   * 滚入视口时 lazy 调用。省略 → 列表只显占位块(测试 / 非 dev)。
   */
  renderSceneThumbnail?: (sceneId: number, mapNum?: number) => Promise<string | null>
  /** 队伍 tab 头像渲染:RGM 头像帧(by role.avatar chunkIndex,复用 dialogAssets.portraitFrames)。 */
  portraitFrames?: Map<number, DialogSprite>
  /** 物品作弊列表图标:BALL.MKF 物品图标(by item.bitmap,复用 assets.itemIcons)。 */
  itemIcons?: Map<number, IndexedImage>
  /**
   * 自定义战斗(A)/ boss 入口(B)敌人缩略图:战斗精灵 Map(key `enemy-{id}` / `player-{chunk}`,
   * 复用 bootstrap battleSprites)。`get('enemy-{id}').frames[0]` 是 SpriteFrame(兼容 indexImageToCanvas)。
   * 省略 → 缩略图占位块。
   */
  battleSprites?: Map<string, SpriteAsset>
  /** 头像 / 图标上色用调色板(index→RGB);省略 → 占位块。 */
  palette?: Palette
  /** T17:dev jump 用的 per-scene lazy 缓存(由 bootstrap 构造、首屏 palette / sprites 复用)。 */
  sceneAssetsCache: SceneAssetsCache
  /**
   * T17 重做:scene 切换后 bootstrap 同步 presentCtx 的 hook。
   * 不传则 dev jump 只 mutate gs(canvas 仍画首屏 tilemap);bootstrap 永远传。
   * 留 optional 主要是测试 / 非 dev 场景占位。
   */
  onSceneChanged?: (sceneAssets: SceneAssets) => Promise<void> | void
  /**
   * P4.T5:字体测试 sheet 入口。
   * bootstrap 传一个 closure:清 fb → renderText 渲染混合字符串 sheet → flushToCanvas。
   * 不传则 Font Test 按钮走 console-only spot-check。
   */
  onFontTest?: () => void
  /**
   * devpanel 看开场/结局 AVI 双版:播 `/extracted/videos/{mp4}`(WIN95 mp4)。
   * 传数组 → 顺序播(结局 = 4→5→6)。bootstrap 传(suspendRaf + playAvi 包);不传则 Videos 区按钮 console-only。
   */
  playVideo?: (mp4: string | string[]) => void
  /** devpanel 看开场 DOS 双版:跑 trademark RNG + splash 卷轴 fallback。bootstrap 传(suspendRaf 包)。 */
  playDosOpening?: () => void
  /** devpanel 看结局 DOS 全片:PAL_EndingScreen DOS 编排(RNG+fade+FBP+scroll+ColorFade+EndingAnim)。 */
  playDosEnding?: () => void
  /**
   * devpanel 单播一段 RNG 演出(指定 chunk + 调色盘编号 + 速度)。bootstrap 传:
   *  - 快照当前调色盘 → 设目标调色盘(预载同步 cache)→ playRng(可按 Space/Enter/Esc 中止)→ **finally 恢复快照**。
   *  - 不走事件系统 opcode 路径(故能加 skipKeys + 保证复位,不影响真机忠实度)。
   */
  playRngCutscene?: (chunk: number, palette: number, speed: number) => void
  resources: {
    enemies: Enemy[]
    /** D10/对话:enemy-objects.json — 战斗内 scriptOnReady/scriptOnTurnStart(boss 嘲讽对话)需要。 */
    enemyObjects: EnemyObject[]
    enemyTeams: EnemyTeam[]
    battleFields: BattleField[]
    playerRoles: PlayerRoles
    /** D11:升级阈值 + 学法术表(战斗胜利升级用)。 */
    levelUpExp: number[]
    levelUpMagic: LevelUpMagicEntry[][]
    items: Item[]
    spells: Spell[]
    magics: Magic[]
    objectMagics: ObjectMagicView[]
    objectPoisons: ObjectPoisonView[]
    objectPlayers: ObjectPlayerView[]
    commands: Command[]
    /** D17a:enemy 初始 pos/posOriginal 真值(DATA.MKF chunk13,battle.c:936-939)。 */
    enemyPos: EnemyPosTable
    /** D17a:player 物理攻击命中特效帧基号(rgwBattleEffectIndex,DATA.MKF chunk11,fight.c:2055)。 */
    battleEffectIndex: number[]
    /** D17:FIRE.MKF magic sprite 帧数 Map(chunk = magic.effect → frameCount)— OffMagic 时间线 n。 */
    magicSpriteFrameCounts: Map<number, number>
    /** 召唤神精灵帧数 Map(F.MKF chunk = magic.special+10 → frameCount)— 召唤动画逐帧 loop。 */
    summonSpriteFrameCounts?: Map<number, number>
  }
}

/** 装配 dev panel —— 仅 DEV;非 DEV 直接 no-op,生产构建去这一段。 */
export function setupDevPanel(deps: DevPanelDeps): void {
  if (!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && (deps.gs.mode === 'explore' || deps.gs.mode === 'battle')) {
      // explore:起战斗 picker;battle:同一 picker 顶部「战斗状态调试」section 可给队员挂异常状态。
      // 再按 B toggle 关闭(user 2026-06-15)。
      e.preventDefault()
      if (currentPicker) closePicker()
      else openPicker(deps)
    } else if (e.code === 'F1') {
      e.preventDefault()
      // 深拷贝 dump —— 让用户在 console 翻 GameState 不被后续 mutate 影响
      console.log('[dev] GameState dump:', JSON.parse(JSON.stringify(deps.gs)))
    }
  })

  console.log(
    '[dev-panel] 装配完成。快捷键:B = battle picker(内含「队伍」tab 角色在队开关)/ F1 = GameState dump',
  )
}

/** 当前打开的 picker root —— 同一时刻只允许一个。 */
let currentPicker: HTMLDivElement | undefined

/**
 * 场景缩略图 dataURL 缓存(key = `m{mapNum}` / 无 map 时 `s{sceneId}`)—— **模块级**,跨 picker 开关存活,
 * 同 map 多场景共享。renderSceneThumbnail(bootstrap)内部另按 mapNum 缓存渲染结果;这里再缓存一层
 * 让重开面板 / 同 map 卡片立即出图不闪。
 */
const sceneThumbCache = new Map<string, string>()

/**
 * M5.6 W2.a:dev panel CSS 注入。
 * 提供:统一深色背景 / 紧凑间距 / 等宽字体 / section 标题视觉分离 / 按钮 hover 反馈。
 * inline style 仍 override 具体尺寸位置;CSS class 给 base color/font 让面板有统一基调。
 */
let _devPanelCssInjected = false
function injectDevPanelCSS(): void {
  if (_devPanelCssInjected || typeof document === 'undefined') return
  _devPanelCssInjected = true
  const style = document.createElement('style')
  style.id = 'tp-dev-panel-css'
  style.textContent = `
    .tp-dev-panel {
      position: fixed; top: 12px; left: 12px; z-index: 9999;
      background: rgba(24, 24, 28, 0.96); color: #e8e8e8;
      font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-size: 12px;
      padding: 10px 12px; border-radius: 8px;
      border: 1px solid #3a3a42;
      width: 320px; max-height: 88vh; overflow-y: auto;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
    }
    .tp-dev-panel h3, .tp-dev-panel h4 {
      margin: 0; font-weight: 600;
    }
    .tp-dev-panel-title {
      font-size: 13px !important;
      padding-bottom: 6px;
      border-bottom: 1px solid #3a3a42;
      margin-bottom: 8px !important;
      color: #fdf6a8;
    }
    .tp-dev-section-h {
      font-size: 12px !important;
      margin: 10px 0 4px 0 !important;
      padding: 3px 6px;
      background: linear-gradient(90deg, #3a3a42 0%, transparent 100%);
      border-left: 3px solid #6c8eef;
      color: #c4d1ff;
    }
    .tp-dev-panel button {
      background: #2d2d34; color: #e8e8e8;
      border: 1px solid #45454f; border-radius: 4px;
      cursor: pointer; transition: background 0.15s;
    }
    .tp-dev-panel button:hover { background: #3a3a45; }
    .tp-dev-panel input {
      background: #1c1c20; color: #e8e8e8;
      border: 1px solid #45454f; border-radius: 4px;
    }
    .tp-dev-panel input:focus { outline: none; border-color: #6c8eef; }
    .tp-dev-tabbar {
      display: flex; gap: 2px; margin-bottom: 8px; flex-wrap: wrap;
      border-bottom: 1px solid #3a3a42;
    }
    .tp-dev-tab {
      flex: 1; min-width: 52px; padding: 5px 4px !important;
      font-size: 11px; background: #24242a !important;
      border: 1px solid #3a3a42 !important; border-bottom: none !important;
      border-radius: 5px 5px 0 0 !important; color: #aaa !important;
    }
    .tp-dev-tab:hover { background: #30303a !important; color: #ddd !important; }
    .tp-dev-tab-active {
      background: #3a3a48 !important; color: #fdf6a8 !important;
      border-color: #6c8eef !important; font-weight: 600;
    }
  `
  document.head.appendChild(style)
}

/** 剧情 Boss 战预设条目(devpanel B)。 */
interface BossEntry {
  /** 真 enemyTeam id(applyBossBattle 启战,保留 boss slot 编排 + 嘲讽脚本)。 */
  teamId: number
  /** 代表敌人 id(缩略图 battleSprites `enemy-{id}`)。 */
  enemyId: number
  /** 按钮文案(剧情地点 + 敌人 + id)。 */
  label: string
}

/**
 * 剧情 Boss 名单 —— **story-grounded 核过(2026-06-05 重做)**:每条 teamId 都在 all.json 有 **IP<41000 的真剧情
 * 0x07 startBattle + 战前对白锚点**(过滤掉 IP≥41130 的开发者 test-dump 枚举区),enemyId 对照 enemies.json
 * 实证且确在 team 成员里。结合 user 剧情记忆 + web 攻略(GamerSky/萌娘百科)+ 脚本对白三方校验。按剧情顺序。
 *
 * 关键修正(旧版纯按 _name 凑 + 误信 test-dump team):
 *   - 精灵名≠剧情名:姜清=剑老头(96,七星剑 give@scene-147)/鬼将军=僵尸王(75,「本将军」)/地魔兽=牛鬼(69)/
 *     木魔兽=树妖(65,拜月前)/镇狱明王=明王(121)/火麒麟=麒麟(66)/金翅凤凰=凤凰(67)/木道人=木灵道士(77)。
 *   - 七神龙(锁妖塔底七星磐龙柱)= 毒/金/土/火/冰/风/雷 七条(141-147 / t305-311),旧版只收毒神龙。
 *   - 玉佛寺两场:智杖和尚(t28)+ 智修大师方丈(t35,user 指正)。石长老两场都是 boss 战(t34 埋伏/t37 单挑,user 确认)。
 *   - 删:石长老1(t312 全脚本无 0x07=过场)、魔兽武士+刑天(t314 纯 test-dump)、八头蛇(t315 user 定杂兵)、蝶精彩依(误收)。
 *   - 赤鬼王在血池(t27,「看这血池就知道」)非将军冢;鬼将军(t26)才是将军冢,t26→t27 连号。
 */
export const BOSS_ROSTER: BossEntry[] = [
  // —— 前期 ——
  { teamId: 19, enemyId: 87, label: '苗人头领+2苗人拳·余杭客栈(87)' },
  { teamId: 21, enemyId: 82, label: '林月如·苏州城门初战(82)' },
  { teamId: 24, enemyId: 85, label: '林月如·苏州城门再战(85)' },
  { teamId: 44, enemyId: 72, label: '狐妖女·隐龙窟(72)' },
  { teamId: 45, enemyId: 88, label: '蛇妖男·隐龙窟(88)' },
  { teamId: 28, enemyId: 84, label: '玉佛寺·智杖和尚(84)' },
  { teamId: 35, enemyId: 126, label: '玉佛寺·智修大师方丈(126)' },
  // —— 中期 ——
  { teamId: 26, enemyId: 75, label: '鬼将军·将军冢(75)' },
  { teamId: 27, enemyId: 76, label: '赤鬼王·血池(76)' },
  { teamId: 29, enemyId: 81, label: '女飞贼姬三娘·扬州(81)' },
  { teamId: 38, enemyId: 127, label: '林天南·尚书府(127)' },
  { teamId: 36, enemyId: 101, label: '金蟾鬼母·蟾蜍洞(101)' },
  { teamId: 43, enemyId: 99, label: '黑蜘蛛精·门口(99)' },
  { teamId: 42, enemyId: 38, label: '毒娘子·六脚蜘蛛真身(38)' },
  { teamId: 34, enemyId: 119, label: '石长老·埋伏战(119)' },
  { teamId: 37, enemyId: 119, label: '石长老·单挑 过场自动战(119)' },
  // —— 后期 / 锁妖塔 ——
  { teamId: 163, enemyId: 96, label: '姜清·剑老头 锁妖塔七星剑(96)' },
  { teamId: 293, enemyId: 131, label: '天鬼皇·锁妖塔(131)' },
  { teamId: 188, enemyId: 121, label: '镇狱明王·锁妖塔(121)' },
  { teamId: 305, enemyId: 141, label: '毒神龙·七星磐龙柱(141)' },
  { teamId: 306, enemyId: 142, label: '金神龙·七星磐龙柱(142)' },
  { teamId: 307, enemyId: 143, label: '土神龙·七星磐龙柱(143)' },
  { teamId: 308, enemyId: 144, label: '火神龙·七星磐龙柱(144)' },
  { teamId: 309, enemyId: 145, label: '冰神龙·七星磐龙柱(145)' },
  { teamId: 310, enemyId: 146, label: '风神龙·七星磐龙柱(146)' },
  { teamId: 311, enemyId: 147, label: '雷神龙·七星磐龙柱(147)' },
  { teamId: 203, enemyId: 67, label: '金翅凤凰·神木林(67)' },
  { teamId: 221, enemyId: 77, label: '木道人·桃源村(77)' },
  { teamId: 224, enemyId: 66, label: '火麒麟·麒麟洞(66)' },
  { teamId: 223, enemyId: 102, label: '盖罗娇·圣姑家后门(102)' },
  { teamId: 287, enemyId: 69, label: '地魔兽·大理祭坛(69)' },
  { teamId: 222, enemyId: 65, label: '树妖·南诏王宫(65)' },
  { teamId: 313, enemyId: 149, label: '拜月教主·南诏王宫(149)' },
]

/**
 * 剧情 Boss 战 UI section(devpanel B,战斗 tab):BOSS_ROSTER 缩略图按钮,点击一键起真 boss team(god-mode 队伍)。
 * DOM-only(启战逻辑见 applyBossBattle,已单测)。缩略图复用 battleSprites `enemy-{boss.enemyId}`。
 */
function buildBossBattleSection(deps: DevPanelDeps): HTMLDivElement {
  const section = document.createElement('div')
  const h = document.createElement('h4')
  h.textContent = '⚔ 剧情 Boss 战(god-mode 队伍 0/1/2)'
  h.className = 'tp-dev-section-h'
  section.appendChild(h)
  const hint = document.createElement('div')
  hint.textContent = '点击直接起真 boss team(战场背景近似 field 7,以真引擎为准)'
  hint.style.cssText = 'font-size:10px; margin:2px 0; color:#999'
  section.appendChild(hint)

  const grid = document.createElement('div')
  grid.style.cssText =
    'display:flex; flex-wrap:wrap; gap:4px; max-height:200px; overflow-y:auto; padding:3px; background:#1a1a1a; border:1px solid #444'
  for (const boss of BOSS_ROSTER) {
    const cell = document.createElement('button')
    cell.title = boss.label
    cell.style.cssText =
      'width:72px; padding:3px; cursor:pointer; border:1px solid #855; background:#2a1f1f; display:flex; flex-direction:column; align-items:center; color:#ecc'
    const frame = deps.battleSprites?.get(`enemy-${boss.enemyId}`)?.frames[0]
    if (frame && deps.palette) {
      const c = indexImageToCanvas(frame, deps.palette)
      c.style.cssText = 'max-width:62px; max-height:44px; image-rendering:pixelated'
      cell.appendChild(c)
    } else {
      const ph = document.createElement('div')
      ph.style.cssText = 'width:44px; height:44px; background:#332'
      cell.appendChild(ph)
    }
    const nm = document.createElement('div')
    nm.textContent = boss.label
    nm.style.cssText = 'font-size:9px; max-width:68px; line-height:1.15; word-break:break-all; margin-top:2px'
    cell.appendChild(nm)
    cell.addEventListener('click', () => {
      closePicker()
      applyBossBattle(deps, boss.teamId)
    })
    grid.appendChild(cell)
  }
  section.appendChild(grid)
  return section
}

/**
 * 自定义战斗 UI section(devpanel A,战斗 tab):敌人多选缩略图网格 + 选队员 + 设等级 + 全道具开关 + 开战。
 * DOM-only(启战数据逻辑见 applyCustomBattle,已单测);返回 section 容器供 openPicker append。
 *
 *  - 敌人:**5 空位填充模型**(点怪缩略图 → 填下一个空位,允许重复 = 可放 5 个同种怪;点已填槽 → 移除)。
 *    缩略图 battleSprites.get(`enemy-{id}`).frames[0] → indexImageToCanvas;网格每种怪带 ×N 计数徽章。
 *  - 队员:5 个可玩角色按钮(默认 [0] 李逍遥),toggle,≤3(MAX_BATTLE_PLAYERS)。
 *  - 等级 input(仙术按等级习得)+ 全道具 ×99 开关 → applyCustomBattle。
 */
function buildCustomBattleSection(deps: DevPanelDeps): HTMLDivElement {
  const section = document.createElement('div')
  const h = document.createElement('h4')
  h.textContent = '⚔ 自定义战斗'
  h.className = 'tp-dev-section-h'
  section.appendChild(h)

  // 选中态(闭包):敌人 = 5 空位填充模型(compact,**允许重复** —— 点怪往下一个空位填,可放 5 个同种怪;
  //   user 2026-06-05:旧 toggle 去重只能选 5 个不同的怪)。队员默认李逍遥(toggle,无重复)。
  const slots: number[] = []
  const selectedParty: number[] = [0]

  const enemyById = new Map(deps.resources.enemies.map((e) => [e.id, e]))
  const nameOf = (id: number): string => enemyById.get(id)?._name ?? `#${id}`
  /** 敌人缩略图(battleSprites enemy-{id} frame0 上色;缺 → 占位)。每次新建(slots 重画 ≤5,廉价)。 */
  const thumbOf = (id: number, w = 44, h = 36): HTMLElement => {
    const frame = deps.battleSprites?.get(`enemy-${id}`)?.frames[0]
    if (frame && deps.palette) {
      const c = indexImageToCanvas(frame, deps.palette)
      c.style.cssText = `max-width:${w}px; max-height:${h}px; image-rendering:pixelated`
      return c
    }
    const ph = document.createElement('div')
    ph.style.cssText = `width:${w}px; height:${h}px; background:#333`
    return ph
  }

  // —— 敌人选择:计数提示 + 5 空位行 + 怪物网格 ——
  const enemyHint = document.createElement('div')
  enemyHint.style.cssText = 'font-size:11px; margin:2px 0; color:#bbb'

  // 5 空位行:已填槽显缩略图(点 → 移除);空槽显"空N"。
  const slotsRow = document.createElement('div')
  slotsRow.style.cssText = 'display:flex; gap:4px; margin:2px 0 6px'
  // 网格每种怪的计数徽章(×N;enemy id → badge),updateSel 刷新。
  const gridBadges = new Map<number, HTMLElement>()

  const updateSel = (): void => {
    enemyHint.textContent = `敌人(点怪填空位,可重复 ≤5):已填 ${slots.length}/5`
    // 重画 5 槽
    slotsRow.replaceChildren()
    for (let i = 0; i < 5; i++) {
      const id = slots[i]
      const box = document.createElement('button')
      if (id !== undefined) {
        box.style.cssText =
          'width:50px; height:54px; padding:1px; cursor:pointer; border:2px solid #ffd700; background:#4a3a18; display:flex; flex-direction:column; align-items:center; color:#ffd; overflow:hidden'
        box.title = `点击移除:${nameOf(id)}`
        box.appendChild(thumbOf(id, 44, 34))
        const nm = document.createElement('div')
        nm.textContent = nameOf(id)
        nm.style.cssText = 'font-size:8px; max-width:46px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap'
        box.appendChild(nm)
        box.addEventListener('click', () => {
          slots.splice(i, 1) // 移除该槽(compact,后面前移)
          updateSel()
        })
      } else {
        box.style.cssText = 'width:50px; height:54px; cursor:default; border:2px dashed #555; background:#1a1a1a; color:#666; font-size:11px'
        box.textContent = `空${i + 1}`
      }
      slotsRow.appendChild(box)
    }
    // 刷新网格计数徽章
    for (const [id, badge] of gridBadges) {
      const n = slots.filter((s) => s === id).length
      badge.textContent = n > 0 ? `×${n}` : ''
      badge.style.visibility = n > 0 ? 'visible' : 'hidden'
    }
  }

  const grid = document.createElement('div')
  grid.style.cssText =
    'display:flex; flex-wrap:wrap; gap:3px; max-height:180px; overflow-y:auto; padding:3px; background:#1a1a1a; border:1px solid #444; margin-bottom:6px'
  for (const e of deps.resources.enemies.filter((en) => en.id > 0 && en._name)) {
    const cell = document.createElement('button')
    cell.title = `${e._name ?? `enemy ${e.id}`}(点击填入空位)`
    cell.style.cssText =
      'width:54px; padding:2px; cursor:pointer; border:2px solid #555; background:#222; display:flex; flex-direction:column; align-items:center'
    cell.appendChild(thumbOf(e.id, 48, 40))
    const nm = document.createElement('div')
    nm.textContent = e._name ?? String(e.id)
    nm.style.cssText =
      'font-size:9px; max-width:50px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#ddd'
    cell.appendChild(nm)
    // ×N 计数徽章(被填进几个槽)
    const badge = document.createElement('div')
    badge.style.cssText = 'font-size:9px; height:11px; color:#ffd700; font-weight:bold; visibility:hidden'
    cell.appendChild(badge)
    gridBadges.set(e.id, badge)
    cell.addEventListener('click', () => {
      if (slots.length >= 5) return // 满 5 忽略(战斗最多 5 敌)
      slots.push(e.id) // 填下一个空位(允许重复)
      updateSel()
    })
    grid.appendChild(cell)
  }
  section.append(enemyHint, slotsRow, grid)
  updateSel() // 初始空态

  // —— 选队员(≤3) ——
  const partyHint = document.createElement('div')
  partyHint.textContent = '队员(≤3):'
  partyHint.style.cssText = 'font-size:11px; margin:2px 0; color:#bbb'
  section.appendChild(partyHint)
  const partyRow = document.createElement('div')
  partyRow.style.cssText = 'display:flex; gap:4px; flex-wrap:wrap; margin-bottom:6px'
  for (const roleId of [0, 1, 2, 3, 4]) {
    const role = deps.resources.playerRoles.roles.find((r) => r.id === roleId)
    const btn = document.createElement('button')
    btn.textContent = role?._name ?? `角色${roleId}`
    btn.style.cssText = 'padding:3px 8px; cursor:pointer; border:2px solid #555; background:#222; color:#ddd'
    const refresh = (): void => {
      const on = selectedParty.includes(roleId)
      btn.style.borderColor = on ? '#7fd' : '#555'
      btn.style.background = on ? '#1d3a3a' : '#222'
    }
    btn.addEventListener('click', () => {
      const idx = selectedParty.indexOf(roleId)
      if (idx >= 0) selectedParty.splice(idx, 1)
      else {
        if (selectedParty.length >= 3) return // MAX_BATTLE_PLAYERS=3
        selectedParty.push(roleId)
      }
      refresh()
    })
    refresh()
    partyRow.appendChild(btn)
  }
  section.appendChild(partyRow)

  // —— 等级(仙术按等级)+ 全道具 ——
  const optsRow = document.createElement('div')
  optsRow.style.cssText = 'display:flex; align-items:center; gap:12px; margin-bottom:6px; font-size:12px; color:#ddd'
  const lvLabel = document.createElement('label')
  lvLabel.textContent = '等级:'
  const lvInput = document.createElement('input')
  lvInput.type = 'number'
  lvInput.min = '1'
  lvInput.max = '99'
  lvInput.value = '99'
  lvInput.style.cssText = 'width:52px; margin-left:4px'
  lvLabel.appendChild(lvInput)
  const itemsLabel = document.createElement('label')
  itemsLabel.style.cssText = 'cursor:pointer'
  const itemsChk = document.createElement('input')
  itemsChk.type = 'checkbox'
  itemsChk.checked = true
  itemsLabel.append(itemsChk, document.createTextNode(' 全道具×99'))
  // 🤖 自动战斗(0x8A fAutoBattle):AI 整场控我方 force-pick 法术/物理(全游戏唯一 t37 石长老·单挑用此);看戏验证。
  const autoLabel = document.createElement('label')
  autoLabel.style.cssText = 'cursor:pointer'
  autoLabel.title = 'sdlpal 0x8A fAutoBattle:AI 自动控我方整场(原版仅石长老·单挑过场用)'
  const autoChk = document.createElement('input')
  autoChk.type = 'checkbox'
  autoLabel.append(autoChk, document.createTextNode(' 🤖 自动战斗'))
  optsRow.append(lvLabel, itemsLabel, autoLabel)
  section.appendChild(optsRow)

  // —— 开战 ——
  const startBtn = document.createElement('button')
  startBtn.textContent = '▶ 开战'
  startBtn.style.cssText =
    'display:block; width:100%; padding:6px; cursor:pointer; background:#3a482a; font-weight:bold; border:1px solid #6a8; color:#fff'
  startBtn.addEventListener('click', () => {
    if (slots.length === 0) {
      enemyHint.textContent = '敌人(点怪填空位,可重复 ≤5):⚠ 至少填 1 个敌人'
      return
    }
    if (selectedParty.length === 0) {
      partyHint.textContent = '队员(≤3):⚠ 至少选 1 个队员'
      return
    }
    const level = Math.max(1, Math.min(99, Number(lvInput.value) || 99))
    closePicker()
    applyCustomBattle(deps, {
      enemyIds: [...slots], // 5 空位填充(允许重复)
      partyMembers: [...selectedParty],
      level,
      allItems: itemsChk.checked,
      autoBattle: autoChk.checked, // 🤖 AI 控我方
    })
  })
  section.appendChild(startBtn)

  return section
}

function openPicker(deps: DevPanelDeps): void {
  // 已开 → 先关再开(防多按 B 累浮层)
  if (currentPicker) {
    currentPicker.remove()
    currentPicker = undefined
  }

  injectDevPanelCSS()

  const div = document.createElement('div')
  div.className = 'tp-dev-panel'
  // 注:不要 set `position: relative` — `.tp-dev-panel` CSS 已 `position: fixed`,
  // 自动是 positioned ancestor。覆盖会让 panel 从 fixed 退回 normal flow → 飘到页底。

  const h3 = document.createElement('h3')
  h3.textContent = 'Dev Panel'
  h3.className = 'tp-dev-panel-title'

  // M5.6 UX hotfix:close 按钮右上角 X(user 怒怼"Cancel 在底部不顺手")
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.title = 'Close (Esc)'
  closeBtn.style.cssText =
    'position:absolute; top:6px; right:8px; padding:0 8px; cursor:pointer; font-size:20px; line-height:1; background:transparent; border:none; color:#fff; font-weight:bold'
  closeBtn.addEventListener('click', closePicker)

  // ── Tab 栏 + 5 个 content 容器(战斗 / 队伍 / 场景 / 演出 / 系统);各 section 开头切 `body` 决定归属 ──
  const TAB_DEFS = [
    ['battle', '⚔ 战斗'],
    ['party', '👥 队伍'],
    ['scene', '🗺 场景'],
    ['effect', '🎬 演出'],
    ['system', '⚙ 系统'],
  ] as const
  const tabBar = document.createElement('div')
  tabBar.className = 'tp-dev-tabbar'
  const contents = {} as Record<string, HTMLDivElement>
  const tabButtons = {} as Record<string, HTMLButtonElement>
  const showTab = (key: string): void => {
    for (const [k] of TAB_DEFS) {
      contents[k]!.style.display = k === key ? 'block' : 'none'
      tabButtons[k]!.classList.toggle('tp-dev-tab-active', k === key)
    }
  }
  for (const [key, label] of TAB_DEFS) {
    const c = document.createElement('div')
    c.style.display = 'none'
    contents[key] = c
    const tb = document.createElement('button')
    tb.textContent = label
    tb.className = 'tp-dev-tab'
    tb.addEventListener('click', () => showTab(key))
    tabButtons[key] = tb
    tabBar.appendChild(tb)
  }
  const tabBattle = contents.battle!
  const tabParty = contents.party!
  const tabScene = contents.scene!
  const tabEffect = contents.effect!
  const tabSystem = contents.system!
  div.append(h3, closeBtn, tabBar, tabBattle, tabParty, tabScene, tabEffect, tabSystem)

  // 当前 section 的 append 目标(每个 section 开头重设);初始 = 战斗 tab。
  let body: HTMLDivElement = tabBattle

  const battleH = document.createElement('h4')
  battleH.textContent = '⚔ 快捷战斗'
  battleH.className = 'tp-dev-section-h'
  body.appendChild(battleH)

  for (const fixture of deps.fixtures.fixtures) {
    const btn = document.createElement('button')
    btn.textContent = fixture.label
    btn.style.cssText =
      'display:block; margin:4px 0; padding:4px 8px; width: 100%; text-align: left'
    btn.addEventListener('click', () => {
      closePicker()
      applyFixture(deps, fixture)
    })
    body.appendChild(btn)
  }

  // 🤖 全游戏唯一过场自动战斗 t37(盖罗娇+苗女 vs 石长老,fAutoBattle)— 验证 NPC 自动战斗演出(user 2026-06-05)。
  const autoT37Btn = document.createElement('button')
  autoT37Btn.textContent = '🤖 石长老·单挑(盖罗娇+苗女 过场自动战 t37)'
  autoT37Btn.style.cssText =
    'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left; background:#2a2a48; font-weight:bold'
  autoT37Btn.addEventListener('click', () => {
    closePicker()
    applyAutoBattleT37(deps)
  })
  body.appendChild(autoT37Btn)

  // 法术测试战斗:李逍遥(0)/赵灵儿(1)/林月如(2)各自学会**本角色原本会的技能** + 高 HP/MP/灵力,
  // vs 5 敌(team 7)。用来测 E 类法术伤害结算(inline / 0x42 / 0x57·0x88 等)。
  // 每角色技能 = 起手 magic(playerRoles[i].magic)+ 升级习得(levelUpMagic[i]),非全员同一套
  //   (user 2026-05-31:"按照每个人原本会的技能分配")。**key 必须是 `magic`**(PlayerRole 真字段;
  //   hydratePlayerRolesRuntime 读 role.magic → rgwMagic → 战斗投影 → 法术菜单)。
  // 法术测试:三人各带**本角色原本会的技能**(起手 magic + 升级习得 + 剧情授予)+ 高 HP/MP/灵力,vs 5 敌。
  //   分两组覆盖全 6 角色:A 组 0/1/2(李逍遥/赵灵儿/林月如),B 组 0/3/4(李逍遥/阿奴/巫后)。
  const runSpellTest = (members: number[], label: string): void => {
    closePicker()
    // 某角色**能学会的全部技能** = 起手 magic + 升级习得(全等级)+ 剧情/法宝授予(0x55 addMagic)。
    //   复用模块级共享 helper(roleMagicsAtLevel level=99 = 全学;自定义战斗 A 同源,按 customLevel 过滤)。
    const grantsByRole = computeMagicGrantsByRole(getGlobalCommands())
    const makeOverride = (roleId: number): Partial<Record<string, number | number[]>> => ({
      magic: roleMagicsAtLevel({
        playerRoles: deps.resources.playerRoles,
        levelUpMagic: deps.resources.levelUpMagic,
        grantsByRole,
        roleId,
        level: 99, // 法术测试全学
      }),
      level: 99,
      hp: 9999,
      maxHP: 9999,
      mp: 999,
      maxMP: 999,
      magicStrength: 200, // 灵力拉高 → 法术伤害可见
    })
    const playerOverrides: Record<number, Partial<Record<string, number | number[]>>> = {}
    for (const m of members) playerOverrides[m] = makeOverride(m)
    applyFixture(deps, {
      id: 'spell-test',
      label,
      partyMembers: members, // MAX_BATTLE_PLAYERS=3
      playerOverrides,
      inventory: [{ itemId: 61, count: 99 }],
      enemyTeamId: 244, // 后期 team(5 敌各 1100 血,测全体法术;user 2026-06-04 要后期怪耐打)
      battleFieldId: 7,
    })
    // 敌人加血(法术测试要持久观察伤害,magicStrength 200 威力高,血少几下就空;user 2026-06-04)。
    for (const be of deps.gs.battleState?.enemies ?? []) {
      be.e.health = 99999
      be.prevHp = 99999
    }
    // 全道具 ×99 + 金钱(测物品 / 法宝)。
    for (const item of deps.resources.items) {
      const entry = deps.gs.inventory.find((e) => e.itemId === item.id)
      if (entry) entry.count = 99
      else deps.gs.inventory.push({ itemId: item.id, count: 99 })
    }
    deps.gs.dwCash = 1_000_000
  }
  for (const [members, text, label] of [
    [[0, 1, 2], '★ 法术测试(李/灵/月)', '法术测试A'],
    [[0, 3, 4], '★ 法术测试(李/阿奴/巫后)', '法术测试B'],
  ] as Array<[number[], string, string]>) {
    const btn = document.createElement('button')
    btn.textContent = text
    btn.style.cssText =
      'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left; background:#3a2a48; font-weight:bold'
    btn.addEventListener('click', () => runSpellTest(members, label))
    body.appendChild(btn)
  }

  // ── ⚔ 自定义战斗(A):敌人多选缩略图 + 选队员 + 设等级(仙术按等级)+ 全道具 → 开战 ──
  body.appendChild(buildCustomBattleSection(deps))

  // ── ⚔ 剧情 Boss 战(B):缩略图按钮一键起对应真 boss team(god-mode 队伍)──
  body.appendChild(buildBossBattleSection(deps))

  // ── ⚔ 战斗状态调试(B1/D8 等)——只在战斗中生效,给 player 0(李逍遥)挂异常状态/buff ──
  //   sdlpal CLASSIC kStatus 全 9 种 + 中毒。点按钮 → 设到 player 0 status[key]=5 回合(中毒设 rgPoisonStatus),
  //   closePicker 让战斗继续观察。需先在战斗中(B 键战斗中也能开本 picker)。
  // 仅战斗中显示(user 2026-06-04):非战斗时整段不渲染。
  if (deps.gs.mode === 'battle') {
    const statusH = document.createElement('h4')
    statusH.textContent = '⚔ 战斗状态调试(挂到 P0 李逍遥)'
    statusH.className = 'tp-dev-section-h'
    body.appendChild(statusH)

    // [label, statusKey | 'poison' | 'clear', 中文说明]
    const STATUS_BTNS: Array<[string, string]> = [
      ['混乱 confused(攻友军)', 'confused'],
      ['定身/麻痹 paralyzed(跳回合)', 'paralyzed'],
      ['睡眠 sleep(跳回合)', 'sleep'],
      ['沉默 silence(禁施法)', 'silence'],
      ['傀儡 puppet(死后续战)', 'puppet'],
      ['狂暴 bravery(必暴击)', 'bravery'],
      ['护体 protect(减半受伤)', 'protect'],
      ['加速 haste(dex×3)', 'haste'],
      ['双攻 dualAttack(双击)', 'dualAttack'],
      ['中毒 poison(战末解)', 'poison'],
      ['✗ 清除 P0 全部状态/毒', 'clear'],
    ]
    const statusNote = document.createElement('div')
    statusNote.style.cssText = 'font-size:11px; color:#aaa; margin:2px 0 4px'
    statusNote.textContent =
      '注:需在战斗中(可按 B 在战斗里开本面板)。混乱/AttackMate 需先在「队伍」tab 组多人队。'
    body.appendChild(statusNote)
    for (const [label, key] of STATUS_BTNS) {
      const btn = document.createElement('button')
      btn.textContent = label
      btn.style.cssText =
        'display:block; margin:3px 0; padding:4px 8px; width:100%; text-align:left; font-size:12px'
      btn.addEventListener('click', () => {
        const st = deps.gs.battleState
        if (!st || deps.gs.mode !== 'battle') {
          console.warn('[dev] 战斗状态调试:需在战斗中(当前 mode=' + deps.gs.mode + ')')
          return
        }
        const p0 = st.players[0]
        const role0 = deps.gs.partyMembers[0]
        if (!p0) {
          console.warn('[dev] 战斗状态调试:无 player 0')
          return
        }
        if (key === 'poison') {
          if (role0 !== undefined)
            deps.gs.rgPoisonStatus[`0_${role0}`] = { wPoisonID: 5, wPoisonScript: 0 }
          console.log(
            `[dev] P0(role ${role0})中毒 rgPoisonStatus[0_${role0}]=id5;打完战斗应被清(D21)`,
          )
        } else if (key === 'clear') {
          const s = p0.status as unknown as Record<string, number>
          for (const k of [
            'confused',
            'paralyzed',
            'sleep',
            'silence',
            'puppet',
            'bravery',
            'protect',
            'haste',
            'slow',
            'dualAttack',
          ])
            s[k] = 0
          if (role0 !== undefined)
            for (let slot = 0; slot < 16; slot++) delete deps.gs.rgPoisonStatus[`${slot}_${role0}`]
          console.log('[dev] P0 全部状态/毒已清')
        } else {
          ;(p0.status as unknown as Record<string, number>)[key] = 5
          console.log(`[dev] P0 status.${key}=5(5 回合)。回合末逐回合 -1`)
        }
        closePicker()
      })
      body.appendChild(btn)
    }
  } // end if (mode==='battle') — 战斗状态调试仅战斗中显示

  // M4 P3 T6: scene jump section —— input + filter list(294 entries)。
  // ── 🗺 场景 tab ──
  body = tabScene
  const sceneH = document.createElement('h4')
  sceneH.textContent = '🗺 场景跳转'
  sceneH.className = 'tp-dev-section-h'
  body.appendChild(sceneH)

  const sceneInput = document.createElement('input')
  sceneInput.type = 'text'
  sceneInput.placeholder = '过滤:场景 id / map id / 地名'
  sceneInput.style.cssText =
    'width:100%; box-sizing:border-box; margin-bottom:4px; padding:3px 6px; font-family:monospace; font-size:12px'
  body.appendChild(sceneInput)

  // 计数 / 状态提示(显示全部 294,不再 slice(30) 截断)
  const sceneCount = document.createElement('div')
  sceneCount.style.cssText = 'font-size:10px; color:#999; margin-bottom:4px'
  body.appendChild(sceneCount)

  // 📍 坐标传送:同场景内直接搬 party(x,y 世界像素坐标)+ camera 跟随。
  //   跳场景卡片无 partyStart 时落点可能不合法(困在水面/墙里),用这个救;也方便对准触发垫调试。
  const teleRow = document.createElement('div')
  teleRow.style.cssText = 'display:flex; gap:4px; margin-bottom:6px; align-items:center'
  const teleLabel = document.createElement('span')
  teleLabel.textContent = '📍'
  teleLabel.title = '坐标传送(世界像素坐标)'
  const teleX = document.createElement('input')
  const teleY = document.createElement('input')
  for (const [inp, ph] of [[teleX, 'x'], [teleY, 'y']] as const) {
    inp.type = 'number'
    inp.placeholder = ph
    inp.style.cssText = 'width:72px; padding:3px 6px; font-family:monospace; font-size:12px'
  }
  const teleBtn = document.createElement('button')
  teleBtn.textContent = '传送'
  teleBtn.addEventListener('click', () => {
    const x = Number(teleX.value)
    const y = Number(teleY.value)
    if (!Number.isFinite(x) || !Number.isFinite(y)) return
    deps.gs.party.x = x
    deps.gs.party.y = y
    deps.gs.camera = { x: x - PARTYOFFSET_X, y: y - PARTYOFFSET_Y }
    console.log(`[dev-panel] teleport → (${x}, ${y})`)
  })
  teleRow.append(teleLabel, teleX, teleY, teleBtn)
  body.appendChild(teleRow)

  // 缩略图卡片网格:全部场景,可滚动;缩略图 IntersectionObserver lazy 渲染。
  const sceneList = document.createElement('div')
  sceneList.style.cssText =
    'display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:5px; max-height:360px; overflow-y:auto; padding:2px 0 4px; background:#1a1a1a'
  body.appendChild(sceneList)

  const thumbKeyOf = (j: SceneJump): string =>
    j.mapNum !== undefined ? `m${j.mapNum}` : `s${j.sceneId}`
  // 场景无名,只有地图有名(map-names)。供搜索过滤用。
  const mapNameOf = (j: SceneJump): string =>
    j.mapNum !== undefined && hasMapName(j.mapNum) ? getMapName(j.mapNum) : ''

  // 缩略图 lazy 加载:命中模块级缓存立即出图;否则调 bootstrap renderSceneThumbnail(按 mapNum 缓存)。
  const loadThumb = (img: HTMLImageElement, ph: HTMLElement, j: SceneJump): void => {
    const key = thumbKeyOf(j)
    const apply = (url: string): void => {
      img.src = url
      img.style.display = 'block'
      ph.style.display = 'none'
    }
    const cached = sceneThumbCache.get(key)
    if (cached) {
      apply(cached)
      return
    }
    if (!deps.renderSceneThumbnail) return
    ph.textContent = '渲染中…'
    void deps.renderSceneThumbnail(j.sceneId, j.mapNum).then((url) => {
      if (!url) {
        ph.textContent = j.mapNum !== undefined ? `map ${j.mapNum}` : '—'
        return
      }
      sceneThumbCache.set(key, url)
      apply(url)
    })
  }

  // 单一 observer,每次 filter 重建(列表重建)。场景 tab 初始 display:none → observer 不触发;
  // 用户切到场景 tab 显示后,可见卡片才渲染缩略图(避免 294 张同时打爆网络)。
  let sceneObserver: IntersectionObserver | undefined
  const hasIO = typeof IntersectionObserver !== 'undefined'

  const renderSceneList = (filter: string): void => {
    sceneObserver?.disconnect()
    sceneList.textContent = ''
    const f = filter.toLowerCase()
    const filtered = deps.sceneJumps.jumps.filter((e) => {
      if (!f) return true
      const name = mapNameOf(e)
      return (
        String(e.sceneId).includes(f) ||
        e.label.toLowerCase().includes(f) ||
        name.toLowerCase().includes(f) ||
        (e.mapNum !== undefined && String(e.mapNum).includes(f))
      )
    })
    const total = deps.sceneJumps.jumps.length
    sceneCount.textContent =
      (filter ? `匹配 ${filtered.length} / 共 ${total}` : `共 ${total} 个场景`) +
      (deps.renderSceneThumbnail ? ' · 缩略图滚动加载' : ' · 无缩略图渲染器')

    const cardToJump = new WeakMap<Element, SceneJump>()
    if (hasIO) {
      sceneObserver = new IntersectionObserver(
        (entries, obs) => {
          for (const ent of entries) {
            if (!ent.isIntersecting) continue
            const j = cardToJump.get(ent.target)
            const img = ent.target.querySelector('img')
            const ph = ent.target.querySelector('[data-ph]')
            if (j && img && ph) loadThumb(img as HTMLImageElement, ph as HTMLElement, j)
            obs.unobserve(ent.target)
          }
        },
        { root: sceneList, rootMargin: '150px' },
      )
    }

    for (const jump of filtered) {
      const card = document.createElement('div')
      card.title = jump.label
      card.style.cssText =
        'min-width:0; cursor:pointer; border:1px solid #3a3a42; border-radius:4px; background:#222; padding:3px; display:flex; flex-direction:column; align-items:center; gap:2px'
      card.addEventListener('mouseenter', () => (card.style.borderColor = '#6c8eef'))
      card.addEventListener('mouseleave', () => (card.style.borderColor = '#3a3a42'))

      const thumbWrap = document.createElement('div')
      thumbWrap.style.cssText =
        'width:100%; aspect-ratio:1 / 1; max-height:96px; background:#111; display:flex; align-items:center; justify-content:center; overflow:hidden; border:1px solid #2a2a2a'
      const ph = document.createElement('div')
      ph.dataset.ph = '1'
      ph.textContent = jump.mapNum !== undefined ? `map ${jump.mapNum}` : '…'
      ph.style.cssText = 'font-size:10px; color:#555'
      const img = document.createElement('img')
      img.alt = ''
      img.style.cssText = 'max-width:100%; max-height:100%; image-rendering:auto; display:none'
      thumbWrap.append(ph, img)
      card.appendChild(thumbWrap)

      // 第一行:场景号(场景无名)。
      const sceneLine = document.createElement('div')
      sceneLine.textContent = `#${jump.sceneId}`
      sceneLine.style.cssText = 'font-size:12px; line-height:1.2; text-align:center; width:100%; color:#ddd; font-family:monospace'
      card.appendChild(sceneLine)

      // 第二行:地图号 + 地图名(map-names);未起名灰色显「地图N」,方便补名。
      const mn = jump.mapNum
      const named = mn !== undefined && hasMapName(mn)
      const mapLine = document.createElement('div')
      mapLine.textContent = mn !== undefined ? `map-${mn} ${getMapName(mn)}` : 'map-?'
      mapLine.style.cssText = `font-size:10px; line-height:1.2; font-family:monospace; width:100%; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-align:center; color:${named ? '#fdf6a8' : '#888'}`
      card.appendChild(mapLine)

      card.addEventListener('click', () => {
        closePicker()
        void applySceneJump(deps, jump)
      })
      sceneList.appendChild(card)
      cardToJump.set(card, jump)
      if (sceneObserver) sceneObserver.observe(card)
      else loadThumb(img, ph, jump) // 无 IO 兜底:直接加载(命中缓存即出图)
    }
  }

  sceneInput.addEventListener('input', () => renderSceneList(sceneInput.value.trim()))
  renderSceneList('')

  // M5.6 UX hotfix:底部 Cancel 按钮删除 — 走右上角 X(已加在 div 内)

  // P4.T5: Font Test sheet — 渲染中英文混合字符串到 fb,spot-check Unifont glyph 真显示
  // ── 🎬 演出 tab(字体 / 对话 / 特效 / RNG / FBP / 视频)──
  body = tabEffect
  const fontTestH = document.createElement('h4')
  fontTestH.textContent = '🔤 字体测试'
  fontTestH.className = 'tp-dev-section-h'
  body.appendChild(fontTestH)

  const fontTestBtn = document.createElement('button')
  fontTestBtn.textContent = '渲染字体 sheet(中英混排）'
  fontTestBtn.style.cssText =
    'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  fontTestBtn.addEventListener('click', () => {
    closePicker()
    if (deps.onFontTest) {
      deps.onFontTest()
    } else {
      // fallback:console only spot-check(bootstrap 未传 onFontTest 时)
      console.warn('[font-test] onFontTest 未注入,仅 console spot-check')
    }
  })
  body.appendChild(fontTestBtn)

  // Sync.v Step 2: Dialog Style Test —— 4 style 各一段,验证 typing / 头像 / key icon / 多页
  const dialogH = document.createElement('h4')
  dialogH.textContent = '💬 对话样式'
  dialogH.className = 'tp-dev-section-h'
  body.appendChild(dialogH)

  const dialogBtn = document.createElement('button')
  dialogBtn.textContent = '测试 4 种对话样式(上→中→下→旁白)'
  dialogBtn.style.cssText =
    'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  dialogBtn.addEventListener('click', () => {
    closePicker()
    triggerDialogStyleTest(deps)
  })
  body.appendChild(dialogBtn)

  // 🦋 剧情过场:直接看彩依抱刘晋元飞走 + 镜头平移跟随(scene 108 战后,验证镜头滞后)
  const cutsceneH = document.createElement('h4')
  cutsceneH.textContent = '🦋 剧情过场'
  cutsceneH.className = 'tp-dev-section-h'
  body.appendChild(cutsceneH)

  const caiyiBtn = document.createElement('button')
  caiyiBtn.textContent = '彩依飞走(镜头平移跟随)'
  caiyiBtn.style.cssText =
    'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  caiyiBtn.addEventListener('click', () => {
    closePicker()
    void triggerCaiyiFlyaway(deps)
  })
  body.appendChild(caiyiBtn)

  // M5.S-w2.1: Save / Load / List / Clear entry
  // ── Save Slots + Menu Units 已删(2026-06-04 user:游戏内已实现,dev 入口冗余)──
  //   系统 tab 现在 = 物品作弊(精细化)+ MIDI 音乐(各自 body=tabSystem)。

  // ── 👥 队伍 tab:6 角色在队开关(头像 + 灯,绿=在队/红=离队;队首李逍遥 role0 常驻)──
  body = tabParty
  const partyH = document.createElement('h4')
  partyH.textContent = '👥 队伍编辑(点头像切换在队;队首李逍遥常驻)'
  partyH.className = 'tp-dev-section-h'
  body.appendChild(partyH)

  const partyGrid = document.createElement('div')
  partyGrid.style.cssText =
    'display:grid; grid-template-columns:repeat(3, 1fr); gap:6px; margin:4px 0' // 2 行 × 3 列
  const partyStatusList = document.createElement('div')
  partyStatusList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #444; background:#18181d; font-size:11px; line-height:1.45'

  const renderPartyStatusList = (): void => {
    partyStatusList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#fdf6a8; font-weight:bold; margin-bottom:4px'
    title.textContent = '当前队伍状态'
    partyStatusList.appendChild(title)

    const readouts = collectPartyStatusReadouts(
      deps.gs,
      deps.resources.playerRoles,
      deps.resources.objectPoisons,
      deps.resources.items,
    )
    if (readouts.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '无队员'
      partyStatusList.appendChild(empty)
      return
    }

    for (const r of readouts) {
      const row = document.createElement('div')
      row.style.cssText =
        'display:grid; grid-template-columns:70px 1fr; gap:6px; padding:2px 0; border-top:1px solid #2a2a32'
      const name = document.createElement('div')
      name.style.cssText = 'color:#ddd; white-space:nowrap; overflow:hidden; text-overflow:ellipsis'
      name.textContent = `P${r.slot + 1} ${r.roleName}`
      name.title = `role ${r.roleId} · ${r.source === 'battle' ? '战斗局部状态' : '持久/装备状态'}`
      const status = document.createElement('div')
      status.style.cssText = r.entries.length > 0 ? 'color:#bde0ff' : 'color:#777'
      status.textContent = r.entries.length > 0 ? r.entries.join(' / ') : '无 buff / 异常 / 毒'
      row.append(name, status)
      partyStatusList.appendChild(row)
    }
  }

  const renderPartyCards = (): void => {
    partyGrid.textContent = ''
    for (let roleId = 0; roleId <= 5; roleId++) {
      const role = deps.resources.playerRoles.roles.find((r) => r.id === roleId)
      const inParty = deps.gs.partyMembers.includes(roleId)
      const isLeader = roleId === 0
      const card = document.createElement('button')
      card.style.cssText =
        `display:flex; flex-direction:column; align-items:center;` +
        ` padding:0; overflow:hidden; height:140px; cursor:${isLeader ? 'default' : 'pointer'};` +
        ` background:${inParty ? '#1f3a24' : '#3a1f1f'};` +
        ` border:1px solid ${inParty ? '#4c8' : '#c55'}; border-radius:4px`
      // 头像:object-fit:cover 自适应裁剪(统一尺寸、不变形、顶对齐显示脸);缺 palette/帧 → 名字占位块
      const sprite = deps.portraitFrames?.get(role?.avatar ?? -1)
      if (sprite && deps.palette) {
        const c = indexImageToCanvas(sprite, deps.palette)
        c.style.cssText =
          'width:100%; height:90px; object-fit:cover; object-position:top center; display:block'
        card.appendChild(c)
      } else {
        const ph = document.createElement('div')
        ph.style.cssText =
          'width:100%; height:90px; background:#555; display:flex; align-items:center; justify-content:center; font-size:9px; color:#ccc'
        ph.textContent = role?._name ?? `R${roleId}`
        card.appendChild(ph)
      }
      const nm = document.createElement('div')
      nm.style.cssText = 'font-size:11px; white-space:nowrap; margin-top:4px'
      nm.textContent = role?._name ?? `role${roleId}`
      card.appendChild(nm)
      // 灯:绿=在队 / 红=离队;margin-top:auto 推到卡片底部 → 6 个灯统一对齐
      const lamp = document.createElement('div')
      lamp.style.cssText =
        `width:9px; height:9px; border-radius:50%; margin:auto 0 7px;` +
        ` background:${inParty ? '#4f4' : '#f44'}; box-shadow:0 0 4px ${inParty ? '#4f4' : '#f44'}`
      card.appendChild(lamp)
      card.title = isLeader ? '队首李逍遥常驻,不可离队' : inParty ? '点击离队' : '点击入队'
      if (!isLeader) {
        card.addEventListener('click', () => {
          deps.gs.partyMembers = togglePartyMembership(deps.gs.partyMembers, roleId)
          // Dev 切队后同步当前队首 runtime sprite;present 会按 partyMembers[0] 的 rgwSpriteNum 渲染。
          const leader = deps.gs.partyMembers[0]
          if (leader !== undefined) {
            const spriteNum = deps.resources.playerRoles.roles.find((r) => r.id === leader)?.spriteNum
            if (spriteNum !== undefined) deps.gs.PlayerRolesRuntime.rgwSpriteNum[leader] = spriteNum
            if (leader === 0 && deps.gs.PlayerRolesRuntime.rgwSpriteNum[0] !== undefined) {
              deps.gs.partyLeaderSpriteId = deps.gs.PlayerRolesRuntime.rgwSpriteNum[0]
            }
          }
          renderPartyCards()
        })
      }
      partyGrid.appendChild(card)
    }
    renderPartyStatusList()
  }
  renderPartyCards()
  body.appendChild(partyGrid)
  body.appendChild(partyStatusList)

  // ── 敌方状态 + 场地信息(战斗中读 battleState;user 2026-06-08)——挨着「当前队伍状态」放,
  //    三块合成"当前战况"快照。带 🔄 刷新(逐回合 state 会变,而面板是开局快照)。──
  const enemyStatusList = document.createElement('div')
  enemyStatusList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #553f2a; background:#1d1813; font-size:11px; line-height:1.5'
  const renderEnemyStatusList = (): void => {
    enemyStatusList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#ffcaa0; font-weight:bold; margin-bottom:4px'
    title.textContent = '敌方状态'
    enemyStatusList.appendChild(title)
    const readouts = collectEnemyStatusReadouts(deps.gs, deps.resources.objectPoisons, deps.resources.items)
    if (readouts.length === 0) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '不在战斗中(无敌方单位)'
      enemyStatusList.appendChild(empty)
      return
    }
    for (const r of readouts) {
      const block = document.createElement('div')
      block.style.cssText = 'padding:3px 0; border-top:1px solid #332a22'
      const head = document.createElement('div')
      head.style.cssText = `color:${r.defeated ? '#888' : '#ffd9b3'}; font-weight:bold`
      const ratio = r.maxHp > 0 ? Math.round((r.hp / r.maxHp) * 100) : 0
      head.textContent =
        `E${r.slot + 1} ${r.name}#${r.enemyId}  HP ${r.hp}/${r.maxHp}(${ratio}%)${r.defeated ? ' [已倒]' : ''}`
      block.appendChild(head)
      const stats = document.createElement('div')
      stats.style.cssText = 'color:#cdbfa8'
      stats.textContent = r.stats.map((s) => `${s.label}${s.value}`).join(' ')
      block.appendChild(stats)
      const resist = document.createElement('div')
      resist.style.cssText = 'color:#b8c9a8'
      resist.textContent = `抗性 ${r.resistances.map((s) => `${s.label}${s.value}`).join(' ')}`
      block.appendChild(resist)
      const steal = document.createElement('div')
      steal.style.cssText = `color:${r.canSteal ? '#ffe08a' : '#777'}`
      steal.textContent = `偷 ${r.steal}`
      block.appendChild(steal)
      if (r.statusEntries.length > 0) {
        const st = document.createElement('div')
        st.style.cssText = 'color:#ffb0b0'
        st.textContent = `异常/毒 ${r.statusEntries.join(' / ')}`
        block.appendChild(st)
      }
      enemyStatusList.appendChild(block)
    }
  }

  const fieldInfoList = document.createElement('div')
  fieldInfoList.style.cssText =
    'margin:6px 0 8px; padding:6px; border:1px solid #3a445c; background:#15181d; font-size:11px; line-height:1.5'
  const renderFieldInfo = (): void => {
    fieldInfoList.textContent = ''
    const title = document.createElement('div')
    title.style.cssText = 'color:#a8d0ff; font-weight:bold; margin-bottom:4px'
    title.textContent = '场地信息'
    fieldInfoList.appendChild(title)
    const info = collectFieldInfoReadout(deps.gs)
    if (!info) {
      const empty = document.createElement('div')
      empty.style.cssText = 'color:#888'
      empty.textContent = '不在战斗中'
      fieldInfoList.appendChild(empty)
      return
    }
    const head = document.createElement('div')
    head.style.cssText = 'color:#cfe0ff'
    head.textContent = `场地#${info.fieldId}${info.isBoss ? ' · BOSS战' : ''}  屏幕波纹 ${info.screenWave}`
    fieldInfoList.appendChild(head)
    const el = document.createElement('div')
    el.style.cssText = 'color:#bcd'
    el.textContent = `元素场效 ${info.elements.map((s) => `${s.label}${signedText(s.value)}`).join(' ')}`
    fieldInfoList.appendChild(el)
    const note = document.createElement('div')
    note.style.cssText = 'color:#778; font-size:10px; margin-top:2px'
    note.textContent = '(场效=该元素法术在本场地的增/减成,signed;正=增伤)'
    fieldInfoList.appendChild(note)
  }

  const refreshBtn = document.createElement('button')
  refreshBtn.textContent = '🔄 刷新战况(队伍/敌方/场地)'
  refreshBtn.style.cssText = 'display:block; width:100%; padding:4px; margin:4px 0; cursor:pointer'
  refreshBtn.addEventListener('click', () => {
    renderPartyStatusList()
    renderEnemyStatusList()
    renderFieldInfo()
  })

  body.appendChild(refreshBtn)
  body.appendChild(enemyStatusList)
  body.appendChild(fieldInfoList)
  renderEnemyStatusList()
  renderFieldInfo()

  // ── 🎒 物品作弊(2026-06-04 user:挪系统 tab + 精细化)——全道具 / 清空 / 逐道具数量编辑 ──
  //   (道具图标待第 2 批:需 bootstrap 预加载 item sprite,与敌人/boss 缩略图同类接线。)
  body = tabSystem
  const inventoryAllH = document.createElement('h4')
  inventoryAllH.textContent = '🎒 物品作弊'
  inventoryAllH.className = 'tp-dev-section-h'
  body.appendChild(inventoryAllH)

  // 道具列表(搜索过滤 + 逐项数量编辑)— 提前声明,全道具 / 清空后刷新。
  const invSearch = document.createElement('input')
  invSearch.type = 'text'
  invSearch.placeholder = '搜索道具名 / id 过滤'
  invSearch.style.cssText = 'width:200px; margin:4px 0; padding:3px 6px; font-size:12px'
  const invList = document.createElement('div')
  invList.style.cssText = 'max-height:240px; overflow-y:auto; margin-top:4px'
  const buildInvRow = (item: Item): HTMLDivElement => {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex; align-items:center; gap:6px; margin:2px 0; font-size:11px'
    // 图标(item.bitmap → BALL.MKF itemIcons;缺 → 占位保持对齐)
    const icon = deps.itemIcons?.get(item.bitmap)
    if (icon && deps.palette) {
      const c = indexImageToCanvas(icon, deps.palette)
      c.style.cssText =
        'width:22px; height:22px; object-fit:contain; image-rendering:pixelated; flex:none'
      row.appendChild(c)
    } else {
      const sp = document.createElement('span')
      sp.style.cssText = 'width:22px; flex:none'
      row.appendChild(sp)
    }
    const nm = document.createElement('span')
    nm.style.cssText = 'flex:1; white-space:nowrap; overflow:hidden; text-overflow:ellipsis'
    nm.textContent = `${item.id} ${item._name ?? ''}`
    const qty = document.createElement('input')
    qty.type = 'number'
    qty.min = '0'
    qty.max = '99'
    qty.value = String(deps.gs.inventory.find((e) => e.itemId === item.id)?.count ?? 0)
    qty.style.cssText = 'width:48px; padding:2px 4px; font-size:11px; flex:none'
    const apply = (): void => {
      const n = Math.max(0, Math.min(99, Math.trunc(Number(qty.value) || 0)))
      const entry = deps.gs.inventory.find((e) => e.itemId === item.id)
      if (n === 0) deps.gs.inventory = deps.gs.inventory.filter((e) => e.itemId !== item.id)
      else if (entry) entry.count = n
      else deps.gs.inventory.push({ itemId: item.id, count: n })
    }
    qty.addEventListener('input', apply) // 边输边生效(实时)
    qty.addEventListener('change', apply) // 失焦 / 回车兜底
    row.appendChild(nm)
    row.appendChild(qty)
    return row
  }
  const renderInvList = (filter: string): void => {
    invList.textContent = ''
    const matched = deps.resources.items.filter((it) => {
      if (!filter) return true
      return (it._name ?? '').includes(filter) || String(it.id).includes(filter)
    })
    // 分组:装备(scriptOnEquip != 0 可装备)/ 道具(消耗·使用类)
    const groups: Array<[string, Item[]]> = [
      ['🎒 道具(可用)', matched.filter((it) => it.scriptOnEquip === 0)],
      ['⚔ 装备', matched.filter((it) => it.scriptOnEquip !== 0)],
    ]
    let shown = 0
    for (const [groupName, groupItems] of groups) {
      if (groupItems.length === 0) continue
      const gh = document.createElement('div')
      gh.style.cssText =
        'font-size:11px; color:#8ab4d8; font-weight:600; margin:6px 0 2px; border-bottom:1px solid #3a3a42'
      gh.textContent = `${groupName}(${groupItems.length})`
      invList.appendChild(gh)
      for (const item of groupItems) {
        if (shown >= 140) break // 总上限防 DOM 过重(搜索缩小范围)
        invList.appendChild(buildInvRow(item))
        shown++
      }
    }
  }

  const addAllBtn = document.createElement('button')
  addAllBtn.textContent = `全道具 ×99(+100万钱)`
  addAllBtn.style.cssText =
    'display:block; margin:2px 0; padding:4px 8px; width:100%; text-align:left; font-size:11px'
  addAllBtn.addEventListener('click', () => {
    // items.json id 0(观音符)也是真值物品 → 不 skip(2026-05-27 user 报"加全物品没观音符")。
    for (const item of deps.resources.items) {
      const entry = deps.gs.inventory.find((e) => e.itemId === item.id)
      if (entry) entry.count = 99
      else deps.gs.inventory.push({ itemId: item.id, count: 99 })
    }
    deps.gs.dwCash = 1_000_000
    renderInvList(invSearch.value.trim()) // 刷新列表(不关面板,方便继续编辑)
    console.log(`[dev] 全道具 ×99 + 金钱 100 万`)
  })
  body.appendChild(addAllBtn)

  const clearInvBtn = document.createElement('button')
  clearInvBtn.textContent = '🗑 清空背包(钱归 0)'
  clearInvBtn.style.cssText =
    'display:block; margin:2px 0; padding:4px 8px; width:100%; text-align:left; font-size:11px'
  clearInvBtn.addEventListener('click', () => {
    deps.gs.inventory = []
    deps.gs.dwCash = 0
    renderInvList(invSearch.value.trim())
    console.log('[dev] 背包清空 + 金钱归 0')
  })
  body.appendChild(clearInvBtn)

  invSearch.addEventListener('input', () => renderInvList(invSearch.value.trim()))
  body.appendChild(invSearch)
  renderInvList('')
  body.appendChild(invList)

  // ✨ Effects (Opcode) —— 逐特效触发(注入合成 raw 脚本走 tickEventSystem,1:1 真实控制流)。
  // ── 回到 🎬 演出 tab(特效 opcode / RNG / FBP / 视频)──
  body = tabEffect
  const fxH = document.createElement('h4')
  fxH.textContent = '✨ 特效(opcode 触发)'
  fxH.className = 'tp-dev-section-h'
  body.appendChild(fxH)

  // 3 个共享 operand 输入(空 = 用该特效的 defaults)。
  const opRow = document.createElement('div')
  opRow.style.cssText = 'display:flex; gap:4px; margin-bottom:4px; align-items:center'
  const opLabel = document.createElement('span')
  opLabel.textContent = 'op0/1/2:'
  opRow.appendChild(opLabel)
  const opInputs: HTMLInputElement[] = []
  for (let i = 0; i < 3; i++) {
    const inp = document.createElement('input')
    inp.type = 'number'
    inp.placeholder = `op${i}`
    inp.style.cssText = 'width:56px'
    opRow.appendChild(inp)
    opInputs.push(inp)
  }
  body.appendChild(opRow)

  const effectOps: Array<{ label: string; opcode: number; defaults: [number, number, number] }> = [
    { label: '淡出→黑 0x50', opcode: OP_FADE_OUT, defaults: [1, 0, 0] },
    { label: '淡入←黑 0x51', opcode: OP_FADE_IN, defaults: [1, 0, 0] },
    { label: '渐红(死亡)0x4F', opcode: OP_FADE_TO_RED, defaults: [0, 0, 0] },
    { label: '调色板渐变(昼夜)0x80', opcode: OP_PALETTE_FADE, defaults: [0, 0, 0] },
    { label: '色彩渐变 0x8C', opcode: OP_COLOR_FADE, defaults: [0, 2, 0] },
    { label: '场景渐变 0x93', opcode: OP_SCENE_FADE, defaults: [2, 0, 0] },
    { label: '抖动切场景 0x9B', opcode: OP_FADE_TO_SCENE, defaults: [0, 0, 0] },
    { label: '抖动渐变屏 0x73', opcode: OP_FADE_SCREEN, defaults: [2, 0, 0] },
    { label: '设为白天 0x53', opcode: OP_SET_DAY_PALETTE, defaults: [0, 0, 0] },
    { label: '设为夜晚 0x54', opcode: OP_SET_NIGHT_PALETTE, defaults: [0, 0, 0] },
    { label: '屏幕波动 0x71', opcode: OP_WAVE_SCREEN, defaults: [40, 2, 0] },
    { label: '震屏 0x35', opcode: OP_SHAKE_SCREEN, defaults: [10, 4, 0] },
  ]
  const readOperands = (defaults: [number, number, number]): [number, number, number] => {
    return [0, 1, 2].map((i) => {
      const v = opInputs[i]!.value.trim()
      return v === '' ? defaults[i]! : Number(v)
    }) as [number, number, number]
  }
  for (const { label, opcode, defaults } of effectOps) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText =
      'display:block; width:100%; margin:2px 0; padding:4px 8px; text-align:left; font-size:11px' // 整齐单列(原 inline 挤成一团)
    btn.addEventListener('click', () => {
      closePicker()
      triggerEffectScript(deps, [{ op: 'raw', opcode, operands: readOperands(defaults) }])
    })
    body.appendChild(btn)
  }

  // ── 🎞 RNG 动画(剧情演出)──────────────────────────────────────────────
  //   每个 RNG.MKF chunk 是一段动画;帧只含像素索引,**颜色取决于当前调色盘**(sdlpal PAL_RNGPlay
  //   用 wNumPalette)。故预设按各演出**真实**(chunk + 调色盘 + 速度)播。chunk 3(酒剑仙坐葫芦)=调色盘 2、
  //   chunk 7(灵儿祭雨)=调色盘 6,其余继承场景默认 0(这些场景脚本无 setPalette)。
  //   走 deps.playRngCutscene(bootstrap 注入):快照调色盘 → 播 → **finally 恢复**;**播放中按 Space/Enter/Esc 中止**。
  const rngH = document.createElement('h4')
  rngH.textContent = '🎞 RNG 动画(剧情演出;播放中 Space 中止)'
  rngH.className = 'tp-dev-section-h'
  body.appendChild(rngH)

  const playRngCutscene = (chunk: number, pal: number, speed: number): void => {
    closePicker()
    deps.playRngCutscene?.(chunk, pal, speed)
  }

  // 自由播放器:chunk / 调色盘 / 速度,任意组合(预设看着不对时可现场调)。
  const rngRow = document.createElement('div')
  rngRow.style.cssText = 'display:flex; gap:4px; margin:4px 0; align-items:center; flex-wrap:wrap'
  const mkNumInput = (placeholder: string, value: string): HTMLInputElement => {
    const inp = document.createElement('input')
    inp.type = 'number'
    inp.placeholder = placeholder
    inp.value = value
    inp.title = placeholder
    inp.style.cssText = 'width:52px'
    return inp
  }
  const rngChunkInput = mkNumInput('chunk', '3')
  const rngPalInput = mkNumInput('调色盘', '2')
  const rngSpeedInput = mkNumInput('速度', '8')
  rngRow.append(
    Object.assign(document.createElement('span'), { textContent: 'chunk/调色盘/速度:' }),
    rngChunkInput,
    rngPalInput,
    rngSpeedInput,
  )
  const rngPlayBtn = document.createElement('button')
  rngPlayBtn.textContent = '▶ 播放'
  rngPlayBtn.style.cssText = 'padding:4px 10px'
  rngPlayBtn.addEventListener('click', () => {
    playRngCutscene(
      Number(rngChunkInput.value) || 0,
      Number(rngPalInput.value) || 0,
      Number(rngSpeedInput.value) || 16,
    )
  })
  rngRow.appendChild(rngPlayBtn)
  body.appendChild(rngRow)

  // 命名剧情预设(真实 chunk/调色盘/速度,考据自 scene 脚本)。点击 = 回填输入 + 立即播。
  const RNG_CUTSCENES: Array<{ name: string; chunk: number; pal: number; speed: number }> = [
    { name: '序章·酒剑仙授艺', chunk: 1, pal: 0, speed: 16 },
    { name: '将军冢·赤鬼王醒', chunk: 0, pal: 0, speed: 14 },
    { name: '酒剑仙坐葫芦飞行〔调色盘2〕', chunk: 3, pal: 2, speed: 8 },
    { name: '灵儿祭雨〔调色盘6〕', chunk: 7, pal: 6, speed: 8 },
    { name: '神迹', chunk: 8, pal: 0, speed: 8 },
    { name: '结局演出', chunk: 9, pal: 0, speed: 8 },
    { name: 'chunk 2', chunk: 2, pal: 0, speed: 16 },
    { name: 'chunk 4', chunk: 4, pal: 0, speed: 6 },
    { name: 'chunk 5', chunk: 5, pal: 0, speed: 7 },
  ]
  for (const { name, chunk, pal, speed } of RNG_CUTSCENES) {
    const btn = document.createElement('button')
    btn.textContent = `${name}（c${chunk}/p${pal}）`
    btn.style.cssText =
      'display:block; width:100%; margin:2px 0; padding:4px 8px; text-align:left; font-size:11px'
    btn.addEventListener('click', () => {
      rngChunkInput.value = String(chunk)
      rngPalInput.value = String(pal)
      rngSpeedInput.value = String(speed)
      playRngCutscene(chunk, pal, speed)
    })
    body.appendChild(btn)
  }

  // 🎬 视频(开场 / 结局)—— 一行一个按钮,简化中文文案。
  const vidH = document.createElement('h4')
  vidH.textContent = '🎬 视频(开场/结局)'
  vidH.className = 'tp-dev-section-h'
  body.appendChild(vidH)
  const VID_BTN =
    'display:block; width:100%; margin:2px 0; padding:4px 8px; text-align:left; font-size:11px'
  const vidBtns: Array<[string, () => void]> = [
    ['开场 DOS 版(商标 + 卷轴)', () => deps.playDosOpening?.()],
    ['开场 WIN95(上)', () => deps.playVideo?.('1.mp4')],
    ['开场 WIN95(下)', () => deps.playVideo?.('2.mp4')],
    ['新游戏动画', () => deps.playVideo?.('3.mp4')],
    ['结局片段 4', () => deps.playVideo?.('4.mp4')],
    ['结局片段 5', () => deps.playVideo?.('5.mp4')],
    ['结局片段 6', () => deps.playVideo?.('6.mp4')],
    ['▶ 结局 WIN95 全片(4→5→6)', () => deps.playVideo?.(['4.mp4', '5.mp4', '6.mp4'])],
    [
      '▶ 结局 DOS 动画',
      () =>
        triggerEffectScript(deps, [
          { op: 'raw', opcode: OP_ENDING_ANIMATION, operands: [0, 0, 0] },
        ]),
    ],
    ['▶ 结局 DOS 全片', () => deps.playDosEnding?.()],
  ]
  for (const [label, onClick] of vidBtns) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.style.cssText = VID_BTN
    btn.addEventListener('click', () => {
      closePicker()
      onClick()
    })
    body.appendChild(btn)
  }

  // ── M6 MIDI 音乐调试 ─────────────────────────────────────────────────────
  // 点 track 号 → gs.wNumMusic = N → AudioManager 每帧轮询切 BGM(SpessaSynth 播 music/{NNN}.mid)。
  //   注:会覆盖当前场景乐(调试副作用,重进场景恢复)。manifest midi:[1..87] 缺 29。
  // ── 回到 ⚙ 系统 tab(MIDI 音乐)──
  body = tabSystem
  const musicH = document.createElement('h4')
  musicH.textContent = '♪ MIDI 音乐(点号试听;停=0)'
  musicH.className = 'tp-dev-section-h'
  body.appendChild(musicH)

  const musicGrid = document.createElement('div')
  musicGrid.style.cssText = 'display:flex; flex-wrap:wrap; gap:3px; max-width:340px'
  // sdlpal music track 号(MIDI manifest midi:[1..87],缺 29)。停曲按钮 = 0。
  const MIDI_TRACKS = Array.from({ length: 87 }, (_, i) => i + 1).filter((n) => n !== 29)
  const stopBtn = document.createElement('button')
  stopBtn.textContent = '■停'
  stopBtn.style.cssText = 'padding:2px 6px; min-width:34px; background:#48282a'
  stopBtn.addEventListener('click', () => {
    deps.gs.wNumMusic = 0
    deps.gs.musicLoop = true
  })
  musicGrid.appendChild(stopBtn)
  for (const track of MIDI_TRACKS) {
    const btn = document.createElement('button')
    btn.textContent = String(track)
    btn.style.cssText = 'padding:2px 5px; min-width:30px; text-align:center'
    btn.addEventListener('click', () => {
      // 不 closePicker —— 方便连续点不同曲对比。设 wNumMusic + loop,AudioManager 下帧切。
      deps.gs.wNumMusic = track
      deps.gs.musicLoop = true
      console.log(`[dev] 试听 MIDI track ${track}`)
    })
    musicGrid.appendChild(btn)
  }
  body.appendChild(musicGrid)

  showTab('battle') // 默认显示战斗 tab
  document.body.appendChild(div)
  currentPicker = div
}

/**
 * 特效触发:注入一段合成 raw 命令(+ 'end')到 eventCursor,mode 切 'event' 让 tickEventSystem 跑。
 * 与 triggerDialogStyleTest 同模式 —— 1:1 复现 opcode 真实控制流(waiting / needToFadeIn / nightPalette
 * toggle / sceneLoading),不绕过。cursor 带 commands override → 不污染全局脚本数组。
 */
function triggerEffectScript(deps: DevPanelDeps, cmds: Command[]): void {
  const commands: Command[] = [...cmds, { op: 'end' }]
  const labelMap = buildLabelMap(commands)
  deps.gs.eventCursor = { commands, labelMap, ip: 0 }
  deps.gs.mode = 'event'
  console.log(
    '[dev] trigger effect:',
    cmds
      .map((c) => (c.op === 'raw' ? `0x${c.opcode.toString(16)}[${c.operands}]` : c.op))
      .join(' '),
  )
}

/**
 * Sync.v: 注入 4 个 setDialogStyle* + showDialog 命令序列到 eventCursor,
 * mode 切 'event' 后 EventSystem tick 跑完。验证 typing / portrait / key icon / 多页 / 阴影。
 *
 * 4 style:top / center / bottom / narration —— 每段一行短文 + 一行多页提示。
 */
function triggerDialogStyleTest(deps: DevPanelDeps): void {
  const commands: Command[] = [
    // 1) top + portrait icon=1 + color=55(默认) — 多页测试(2 段)
    { op: 'setDialogStyleTop', arg0: 1 },
    { op: 'showDialog', messageIndex: 0, text: '李大娘:' },
    { op: 'showDialog', messageIndex: 1, text: '上方对话框 + 头像 + typing 测试' },
    { op: 'showDialog', messageIndex: 2, text: '第二页:多页翻动 + key icon' },
    // 2) center —— 居中无头像
    { op: 'setDialogStyleCenter' },
    { op: 'showDialog', messageIndex: 3, text: '居中对话框(无头像)' },
    // 3) bottom + portrait icon=5
    { op: 'setDialogStyleBottom', arg0: 5 },
    { op: 'showDialog', messageIndex: 4, text: '下方对话框 + portrait icon=5' },
    // 4) narration(不带边框)
    { op: 'setDialogStyleNarration' },
    { op: 'showDialog', messageIndex: 5, text: 'narration 旁白模式 — 不带边框' },
    { op: 'end' },
  ]
  const labelMap = buildLabelMap(commands)
  deps.gs.eventCursor = { commands, labelMap, ip: 0 }
  deps.gs.mode = 'event'
  console.log('[dev] Triggered dialog style test sequence (4 styles, 7 dialogs).')
}

/**
 * dev:直接预览「彩依抱刘晋元飞走」过场(scene 108 战后),验证镜头平移跟随。
 *
 * 跳 scene 108 → 激活彩依事件对象(eo14,triggerLabel `L_20784`,默认 sState=0 隐藏)→ 注入战后
 * 飞走 opcode 窗口(all.json 全局 ~20859-20868:0x7D 移彩依 / 0x24 给彩依挂飞 autoScript L_19683 /
 * 0x46 设队伍位 / 0x7F 镜头跳 + 平移 / 0x09 延迟 / 0x49 隐彩依 / 0x7F 复位)。窗口以独特的平移 op
 * (0x7F[10,-7,42])为锚定位,抗提取器 index 漂移。
 *
 * 过滤 0x7A 队伍行走(dev 跳场景无战后队伍/寻路状态,走不到目标会卡死整段)—— 镜头(0x7F)与彩依
 * autoScript 各自逐 tick 推进,正是本次排查对象,不依赖队伍行走。
 */
async function triggerCaiyiFlyaway(deps: DevPanelDeps): Promise<void> {
  await applySceneJump(deps, { id: 'caiyi-flyaway', label: '彩依飞走', sceneId: 108 })

  // 找彩依事件对象:优先 cutscene owner(triggerLabel L_20784),回退飞 autoScript 持有者(L_19683)
  const caiyi
    = deps.gs.npcs.find((n) => n.triggerLabel === 'L_20784')
      ?? deps.gs.npcs.find((n) => n.autoLabel === 'L_19683')
  if (!caiyi) {
    console.warn('[dev] 彩依飞走:scene 108 未找到彩依事件对象(L_20784/L_19683),放弃')
    return
  }
  caiyi.sState = 1 // 默认隐藏(故事门控);强制可见 + 让 autoScript 跑(tickAutoScripts 要 sState>0)

  // 从全局脚本切战后飞走窗口:以独特 pan op(0x7F[10,-7,42])为锚,取前 6 ~ 后 3 条
  const global = getGlobalCommands()
  const panIdx = global.findIndex(
    (c) => c.op === 'raw' && c.opcode === 0x7f
      && c.operands?.[0] === 10 && c.operands?.[1] === 65529 && c.operands?.[2] === 42,
  )
  if (panIdx < 0) {
    console.warn('[dev] 彩依飞走:全局脚本未找到平移 op(0x7F[10,-7,42]),放弃')
    return
  }
  const flyawayOps = global.slice(panIdx - 6, panIdx + 4)
  const commands: Command[] = [
    ...flyawayOps.filter((c) => !(c.op === 'raw' && c.opcode === 0x7a)), // 滤 0x7A 队伍行走(122)
    { op: 'end' },
  ]
  const labelMap = buildLabelMap(commands)

  // 镜头先摆正:抵消随后 0x7D(彩依 -80)+ 0x7F 跳(128,-96),让平移起始彩依大致居中
  // (战后真实镜头由 battle 收尾设,dev 跳过 → 自己摆,否则平移从错误视角开始)。
  deps.gs.camera = { x: caiyi.x - 288, y: caiyi.y - 96 }
  deps.gs.sceneLoading = false
  deps.gs.paletteFadeState = undefined // 清场景淡入,别冻住过场 tick
  deps.gs.fadeState = undefined
  deps.gs.eventCursor = {
    commands,
    labelMap,
    ip: 0,
    currentEventObjectId: caiyi.id, // self(0x7D/0x24/0x49 的 65535)→ 彩依
    triggerOwnerId: caiyi.id,
    startedExecution: true, // 已开跑:owner autoScript 不被"触发后首帧间隙"跳过
  }
  deps.gs.mode = 'event'
  console.log(`[dev] 彩依飞走过场:彩依 id=${caiyi.id} @(${caiyi.x},${caiyi.y}),pan@global ${panIdx}`)
}

function closePicker(): void {
  if (currentPicker) {
    currentPicker.remove()
    currentPicker = undefined
  }
}

export function applyFixture(deps: DevPanelDeps, fixture: BattleFixture, rngSeed?: number): void {
  baselinePlayerRoles(deps.resources.playerRoles)
  // 1. 应用 playerOverrides —— 直接 mutate playerRoles(M3 简版;M5 考虑 immutable 备份恢复)
  const levelOverrides = new Map<number, number>()
  for (const [idStr, override] of Object.entries(fixture.playerOverrides ?? {})) {
    const id = Number(idStr)
    const role = deps.resources.playerRoles.roles[id]
    if (role) {
      Object.assign(role, override)
      if (typeof override.level === 'number')
        levelOverrides.set(id, override.level)
    } else {
      console.warn(`[dev-panel] fixture ${fixture.id} override role ${id} 不存在,跳过`)
    }
  }

  // 2. 设 partyMembers + inventory(浅拷贝 inventory 防 fixture 数据被 mutate 影响下次)
  deps.gs.partyMembers = [...fixture.partyMembers]
  deps.gs.inventory = (fixture.inventory ?? []).map((i) => ({ ...i }))

  // 2.5 边界同步:把(override 后的)静态 roles hydrate 进 gs.PlayerRolesRuntime —— 战斗经 projection
  //     吃这份当前属性,战后回写/升级也读这份(原 fixture 绕过 runtime → 升级/持久化读不到)。
  hydratePlayerRolesRuntime(deps.gs.PlayerRolesRuntime, deps.resources.playerRoles)

  // 2.55 level override 也必须同步主经验等级。战斗显示读 runtime,但胜利结算 / 状态 EXP 栏会读 gs.Exp;
  //      若只改 PlayerRolesRuntime,自定义战斗的等级会在结算链路看起来"没生效"。
  for (const [id, level] of levelOverrides) {
    syncAllExpLevelsForRole(deps.gs, id, level)
  }

  // 2.6 D11:expOverrides → gs.Exp.rgPrimaryExp(设接近阈值的经验,打赢触发升级演出)。
  for (const [idStr, exp] of Object.entries(fixture.expOverrides ?? {})) {
    const id = Number(idStr)
    deps.gs.Exp.rgPrimaryExp[id] = { wExp: exp.wExp, wLevel: exp.wLevel }
    if (deps.gs.PlayerRolesRuntime.rgwLevel[id] !== undefined)
      deps.gs.PlayerRolesRuntime.rgwLevel[id] = exp.wLevel
  }

  // 3. 启战。rngSeed 省略 → startBattle 用 Date.now()=非确定性,符合 dev 自由探索意图;
  //    测试传固定 seed → 确定性(D7 W1:dex jitter 后 fixture 战斗结果对 RNG 敏感,测试须显式 seed)。
  // try/catch:fixture 错配(team/field id 不存在)startBattle 会抛(by design fail-fast),
  //   dev 工具不该因此整个崩 → 捕获 + 清晰报错,方便定位是哪个 fixture 配错。
  console.log(
    `[dev-panel] applyFixture ${fixture.id} → startBattle(team=${fixture.enemyTeamId}, field=${fixture.battleFieldId})`,
  )
  try {
    startBattle({
      gs: deps.gs,
      enemyTeamId: fixture.enemyTeamId,
      battleFieldId: fixture.battleFieldId,
      isBoss: false,
      enemies: deps.resources.enemies,
      enemyObjects: deps.resources.enemyObjects, // 对话:enemy scriptOnReady/scriptOnTurnStart(boss 嘲讽)
      enemyTeams: deps.resources.enemyTeams,
      battleFields: deps.resources.battleFields,
      // 边界:用 runtime 当前属性投影战斗 roles(吃升级后属性;与真实 startBattleHandler 一致)
      // D14:第 3 参 gs.rgEquipmentEffect → 战斗 stat = effective(base + 装备 + Extra),与 startBattleHandler 一致。
      playerRoles: projectRuntimeToBattleRoles(
        deps.gs.PlayerRolesRuntime,
        deps.resources.playerRoles,
        deps.gs.rgEquipmentEffect,
      ),
      levelUpExp: deps.resources.levelUpExp, // D11:战斗胜利升级阈值
      levelUpMagic: deps.resources.levelUpMagic, // D11:升级学新法术
      items: deps.resources.items,
      spells: deps.resources.spells,
      magics: deps.resources.magics,
      objectMagics: deps.resources.objectMagics, // E2:0x42 SimulateMagic 解析 magic object id
      objectPoisons: deps.resources.objectPoisons, // 0x28 apply poison
      objectPlayers: deps.resources.objectPlayers, // OBJECT_PLAYER:队友死亡 / 濒死脚本
      enemyPos: deps.resources.enemyPos, // D17a:enemy 初始 pos/posOriginal(battle.c:936-939)
      battleEffectIndex: deps.resources.battleEffectIndex, // D17a:命中特效帧基号(fight.c:2055)
      magicSpriteFrameCounts: deps.resources.magicSpriteFrameCounts, // D17:OffMagic 时间线 n
      summonSpriteFrameCounts: deps.resources.summonSpriteFrameCounts, // 召唤神逐帧 loop 帧数
      rngSeed, // 省略 → startBattle 用 Date.now();测试传固定值保确定性
      // P2#5:不传切片 — startBattle 默认 getGlobalCommands()(战斗脚本是全局 entry)。
    })
  } catch (e) {
    console.error(
      `[dev-panel] fixture ${fixture.id} 启战失败(team=${fixture.enemyTeamId} / field=${fixture.battleFieldId} 可能错配):`,
      e,
    )
  }
}

/** 自定义战斗参数(devpanel A)。 */
export interface CustomBattleParams {
  /** 选中的敌人 id(≤5;>5 截断)。 */
  enemyIds: number[]
  /** 出战队员 roleId(≤3,MAX_BATTLE_PLAYERS)。 */
  partyMembers: number[]
  /** 我方等级(每队员 level override + 仙术按等级习得)。 */
  level: number
  /** 全道具开关:true → 全 items ×99 进背包。 */
  allItems: boolean
  /**
   * 自动战斗(sdlpal 0x8A fAutoBattle,全游戏唯一 t37 石长老·单挑用):true → AI 整场控我方 force-pick
   * 法术/物理,不显示菜单。缺省 false = 正常手动战斗。createBattleState 从 gs.fAutoBattle seed(battle-state.ts:685)。
   */
  autoBattle?: boolean
}

/**
 * 自定义战斗(devpanel A):选中敌人 → 临时 EnemyTeam(id 90000)→ applyFixture 启战。
 *
 *  - 敌人:buildCustomEnemyTeam(pad 0xFFFF),filter 掉旧临时 team 再 push(不堆积),startBattle 按 90000 查。
 *  - 队员:每人 level override + 仙术按 level 习得(roleMagicsAtLevel,起手+升级<=level+授予)。
 *  - 道具:allItems → 全 items ×99。
 *  - 战场固定 7(沿用 fixture 惯例)。rngSeed 透传(测试确定性)。
 */
export function applyCustomBattle(deps: DevPanelDeps, params: CustomBattleParams, rngSeed?: number): void {
  const { enemyIds, partyMembers, level, allItems } = params
  const customLevel = Math.max(1, Math.min(99, Math.trunc(level)))
  // 自动战斗(0x8A fAutoBattle):applyFixture→startBattle→createBattleState 从 gs.fAutoBattle seed,故启战前置。
  deps.gs.fAutoBattle = params.autoBattle ?? false
  // 1. 临时 team:filter 掉旧临时(防多次开战堆积)+ push 新的
  deps.resources.enemyTeams = [
    ...deps.resources.enemyTeams.filter((t) => t.id !== CUSTOM_BATTLE_TEAM_ID),
    buildCustomEnemyTeam(enemyIds),
  ]
  // 2. playerOverrides:每队员 level + 该 level 会的仙术(grants 来自全局脚本 0x55)
  const grantsByRole = computeMagicGrantsByRole(getGlobalCommands())
  const playerOverrides: Record<number, Partial<Record<string, number | number[]>>> = {}
  const expOverrides: Record<string, { wExp: number; wLevel: number }> = {}
  for (const m of partyMembers) {
    playerOverrides[m] = customBattleRoleOverrideAtLevel({
      playerRoles: deps.resources.playerRoles,
      levelUpMagic: deps.resources.levelUpMagic,
      grantsByRole,
      roleId: m,
      level: customLevel,
    })
    expOverrides[String(m)] = { wExp: 0, wLevel: customLevel }
  }
  // 3. 全道具 ×99
  const inventory = allItems ? deps.resources.items.map((it) => ({ itemId: it.id, count: 99 })) : []
  // 4. 复用 applyFixture 启战(临时 team / 战场 7)
  applyFixture(
    deps,
    {
      id: 'custom-battle',
      label: '自定义战斗',
      partyMembers,
      playerOverrides,
      expOverrides,
      inventory,
      enemyTeamId: CUSTOM_BATTLE_TEAM_ID,
      battleFieldId: 7,
    },
    rngSeed,
  )
}

/**
 * 一键 boss 战(devpanel B):用**真 boss enemyTeam**(非临时 team)+ god-mode 队伍(lv99 + 全仙术 + 全道具)启战,
 * 让 dev 直接观察 boss 动画 / 嘲讽脚本。
 *
 *  - enemyTeamId = 真 team(保留 boss slot 编排 + enemyObject scriptOnReady/Turn 嘲讽);不建临时 team。
 *  - 队伍 god-mode(同法术测试):每队员 lv99 全仙术 + 9999HP/999MP/灵力 200。members 默认 [0,1,2]。
 *  - 战场默认 7(boss 真场景 field 走 scene wNumBattleField,非 0x07 operand → 此处不强求,背景以 user 真引擎为准)。
 */
export function applyBossBattle(
  deps: DevPanelDeps,
  teamId: number,
  opts?: { members?: number[]; fieldId?: number; rngSeed?: number },
): void {
  const members = opts?.members ?? [0, 1, 2]
  const grantsByRole = computeMagicGrantsByRole(getGlobalCommands())
  const playerOverrides: Record<number, Partial<Record<string, number | number[]>>> = {}
  for (const m of members) {
    playerOverrides[m] = {
      magic: roleMagicsAtLevel({
        playerRoles: deps.resources.playerRoles,
        levelUpMagic: deps.resources.levelUpMagic,
        grantsByRole,
        roleId: m,
        level: 99,
      }),
      level: 99,
      hp: 9999,
      maxHP: 9999,
      mp: 999,
      maxMP: 999,
      magicStrength: 200,
    }
  }
  applyFixture(
    deps,
    {
      id: `boss-${teamId}`,
      label: `Boss team ${teamId}`,
      partyMembers: members,
      playerOverrides,
      inventory: deps.resources.items.map((it) => ({ itemId: it.id, count: 99 })),
      enemyTeamId: teamId,
      battleFieldId: opts?.fieldId ?? 7,
    },
    opts?.rngSeed,
  )
}

/**
 * 1:1 复刻全游戏唯一的**过场自动战斗** t37 石长老·单挑(devpanel B,验证 NPC 自动战斗演出)。
 * 对照 all.json:16677-16683 脚本真值:
 *   - 0x75[5,6,5] → 我方 party = roles [4,5,4](role5=盖罗娇 / role4 此过场当苗女 ×2)。**不做 god-mode override**,
 *     用真实角色属性(盖罗娇 hp3600 lv40 / 巫后-苗女 hp480 lv28),才看得到忠实演出。
 *   - 0x4A[23] → 战场 23;0x8A → fAutoBattle=TRUE(AI 控我方);0x07[37] → 敌 team 37 石长老。
 * 不全道具(过场无背包);rngSeed 透传。
 */
export function applyAutoBattleT37(deps: DevPanelDeps, rngSeed?: number): void {
  deps.gs.fAutoBattle = true // 0x8A(applyFixture→startBattle→createBattleState 从 gs.fAutoBattle seed)
  applyFixture(
    deps,
    {
      id: 'auto-battle-t37',
      label: '石长老·单挑(盖罗娇+苗女 过场自动战)',
      partyMembers: [4, 5, 4], // 0x75[5,6,5] → roles[4,5,4]
      enemyTeamId: 37,
      battleFieldId: 23, // 0x4A[23]
    },
    rngSeed,
  )
}

/**
 * T17:dev scene jump 真做 —— 调 scene-system.loadScene + 走 SceneAssetsCache lazy fetch。
 *
 * 重做版顺序:
 *  1. loadScene:lazy fetch sceneAssets + mutate gs.npcs / party / camera
 *  2. cache.loadScene 再取一次(cache hit,~0 cost),拿到 sceneAssets 引用
 *  3. onSceneChanged(sceneAssets):bootstrap 在 callback 内 mutate presentCtx.tilemap
 *     + 重置 scene-system 的 ctx singleton,canvas 下一帧画新地图
 *
 * 不跑 onEnter(D34 dev shortcut)。tile PNG / palette 留首屏(已知 visual 错;M5 升)。
 */
async function applySceneJump(deps: DevPanelDeps, jump: SceneJump): Promise<void> {
  try {
    // P0.e: partyStart 字段已从 scene-jumps.json 删除;loadScene 不传 → 走 wScriptOnEnter。
    // 若 jump.partyStart 仍存在(极端 dev override),仍可透传。
    await loadScene({
      gs: deps.gs,
      sceneId: jump.sceneId,
      assets: deps.sceneAssetsCache,
      partyStart: jump.partyStart
        ? { x: jump.partyStart.x, y: jump.partyStart.y, facing: jump.partyStart.facing as Facing }
        : undefined,
    })
    // loadScene 已经 mutate gs;现在拿 sceneAssets 让 bootstrap 同步 presentCtx。
    // 二次 loadScene 走 cache hit(SceneAssetsCache 的 Map.get),不会重 fetch。
    const sceneAssets = await deps.sceneAssetsCache.loadScene(jump.sceneId)
    await deps.onSceneChanged?.(sceneAssets)
    console.log('[dev-panel] scene jump done:', jump.sceneId)
  } catch (e) {
    console.error('[dev-panel] scene jump failed:', e)
  }
}
