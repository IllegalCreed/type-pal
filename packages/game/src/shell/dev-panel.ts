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
  EnemyTeam,
  Item,
  Magic,
  PlayerRoles,
  Spell,
} from '@type-pal/shared'
import type { Facing, GameState } from '../core/game-state.js'
import { startBattle } from '../core/battle/battle-system.js'
import { loadScene } from '../core/scene-system.js'
import type { SceneAssets, SceneAssetsCache } from '../assets/loader.js'

/** fixture JSON entry —— 与 `packages/game/src/data/battle-fixtures.json` 对齐。 */
export interface BattleFixture {
  id: string
  label: string
  partyMembers: number[]
  /**
   * PlayerRole 部分字段 override(key = playerRoleId 字符串)。
   * 类型刻意宽松 —— JSON import 推断会给具体 key 类型,本字段只用于 Object.assign 写入。
   */
  playerOverrides?: Record<string, Partial<Record<string, number | number[]>>>
  inventory?: { itemId: number; count: number }[]
  enemyTeamId: number
  battleFieldId: number
}

export interface BattleFixturesData {
  fixtures: BattleFixture[]
}

/** scene jump entry —— 与 `packages/game/src/data/scene-jumps.json` 对齐。 */
export interface SceneJump {
  id: string
  label: string
  sceneId: number
  mapNum?: number
  partyStart: { col: number; row: number; facing: string }
}

export interface SceneJumpsData {
  jumps: SceneJump[]
}

export interface DevPanelDeps {
  gs: GameState
  fixtures: BattleFixturesData
  sceneJumps: SceneJumpsData
  /** T17:dev jump 用的 per-scene lazy 缓存(由 bootstrap 构造、首屏 palette / sprites 复用)。 */
  sceneAssetsCache: SceneAssetsCache
  /**
   * T17 重做:scene 切换后 bootstrap 同步 presentCtx 的 hook。
   * 不传则 dev jump 只 mutate gs(canvas 仍画首屏 tilemap);bootstrap 永远传。
   * 留 optional 主要是测试 / 非 dev 场景占位。
   */
  onSceneChanged?: (sceneAssets: SceneAssets) => Promise<void> | void
  resources: {
    enemies: Enemy[]
    enemyTeams: EnemyTeam[]
    battleFields: BattleField[]
    playerRoles: PlayerRoles
    items: Item[]
    spells: Spell[]
    magics: Magic[]
    commands: Command[]
  }
}

/** 装配 dev panel —— 仅 DEV;非 DEV 直接 no-op,生产构建去这一段。 */
export function setupDevPanel(deps: DevPanelDeps): void {
  if (!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) return

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyB' && deps.gs.mode === 'explore') {
      e.preventDefault()
      openPicker(deps)
    }
    else if (e.code === 'F1') {
      e.preventDefault()
      // 深拷贝 dump —— 让用户在 console 翻 GameState 不被后续 mutate 影响
      console.log('[dev] GameState dump:', JSON.parse(JSON.stringify(deps.gs)))
    }
  })

  console.log('[dev-panel] 装配完成。快捷键:B = battle picker(探索模式)/ F1 = GameState dump')
}

/** 当前打开的 picker root —— 同一时刻只允许一个。 */
let currentPicker: HTMLDivElement | undefined

function openPicker(deps: DevPanelDeps): void {
  // 已开 → 先关再开(防多按 B 累浮层)
  if (currentPicker) {
    currentPicker.remove()
    currentPicker = undefined
  }

  const div = document.createElement('div')
  div.style.cssText = [
    'position: fixed',
    'top: 20px',
    'left: 20px',
    'z-index: 9999',
    'background: white',
    'color: black',
    'padding: 12px',
    'border: 2px solid #333',
    'font-family: monospace',
    'font-size: 12px',
    'max-height: 80vh',
    'overflow-y: auto',
  ].join(';')

  const h3 = document.createElement('h3')
  h3.textContent = 'Dev: Battle Picker'
  h3.style.cssText = 'margin: 0 0 8px 0; font-size: 14px'
  div.appendChild(h3)

  for (const fixture of deps.fixtures.fixtures) {
    const btn = document.createElement('button')
    btn.textContent = `${fixture.id}: ${fixture.label}`
    btn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px; width: 100%; text-align: left'
    btn.addEventListener('click', () => {
      closePicker()
      applyFixture(deps, fixture)
    })
    div.appendChild(btn)
  }

  // M4 P3 T6: scene jump section —— input + filter list(294 entries)。
  const sceneH = document.createElement('h3')
  sceneH.textContent = 'Dev: Scene Jump'
  sceneH.style.cssText = 'margin: 12px 0 8px 0; font-size: 14px'
  div.appendChild(sceneH)

  const sceneInput = document.createElement('input')
  sceneInput.type = 'text'
  sceneInput.placeholder = 'scene id / map id (1-294)'
  sceneInput.style.cssText = 'width:200px; margin-bottom:6px; padding:3px 6px; font-family:monospace; font-size:12px'
  div.appendChild(sceneInput)

  const sceneList = document.createElement('div')
  sceneList.style.cssText = 'max-height:200px; overflow-y:auto'
  div.appendChild(sceneList)

  const renderSceneList = (filter: string): void => {
    sceneList.textContent = ''
    const filtered = deps.sceneJumps.jumps.filter((e) => {
      if (!filter) return true
      return (
        String(e.sceneId).includes(filter)
        || e.label.includes(filter)
        || (e.mapNum !== undefined && String(e.mapNum).includes(filter))
      )
    }).slice(0, 30)
    for (const jump of filtered) {
      const btn = document.createElement('button')
      btn.textContent = jump.label
      btn.style.cssText = 'display:block; margin:2px 0; padding:3px 8px; width:100%; text-align:left; font-family:monospace; font-size:11px'
      btn.addEventListener('click', () => {
        closePicker()
        void applySceneJump(deps, jump)
      })
      sceneList.appendChild(btn)
    }
  }

  sceneInput.addEventListener('input', () => renderSceneList(sceneInput.value.trim()))
  renderSceneList('')

  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.style.cssText = 'margin-top:8px; padding:4px 8px'
  cancel.addEventListener('click', closePicker)
  div.appendChild(cancel)

  document.body.appendChild(div)
  currentPicker = div
}

function closePicker(): void {
  if (currentPicker) {
    currentPicker.remove()
    currentPicker = undefined
  }
}

function applyFixture(deps: DevPanelDeps, fixture: BattleFixture): void {
  // 1. 应用 playerOverrides —— 直接 mutate playerRoles(M3 简版;M5 考虑 immutable 备份恢复)
  for (const [idStr, override] of Object.entries(fixture.playerOverrides ?? {})) {
    const id = Number(idStr)
    const role = deps.resources.playerRoles.roles[id]
    if (role) {
      Object.assign(role, override)
    }
    else {
      console.warn(`[dev-panel] fixture ${fixture.id} override role ${id} 不存在,跳过`)
    }
  }

  // 2. 设 partyMembers + inventory(浅拷贝 inventory 防 fixture 数据被 mutate 影响下次)
  deps.gs.partyMembers = [...fixture.partyMembers]
  deps.gs.inventory = (fixture.inventory ?? []).map(i => ({ ...i }))

  // 3. 启战(rngSeed 不传 → 用 Date.now()=非确定性,符合 dev 自由探索意图)
  console.log(`[dev-panel] applyFixture ${fixture.id} → startBattle(team=${fixture.enemyTeamId}, field=${fixture.battleFieldId})`)
  startBattle({
    gs: deps.gs,
    enemyTeamId: fixture.enemyTeamId,
    battleFieldId: fixture.battleFieldId,
    isBoss: false,
    enemies: deps.resources.enemies,
    enemyTeams: deps.resources.enemyTeams,
    battleFields: deps.resources.battleFields,
    playerRoles: deps.resources.playerRoles,
    items: deps.resources.items,
    spells: deps.resources.spells,
    magics: deps.resources.magics,
    commands: deps.resources.commands,
  })
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
async function applySceneJump(
  deps: DevPanelDeps,
  jump: SceneJump,
): Promise<void> {
  try {
    await loadScene({
      gs: deps.gs,
      sceneId: jump.sceneId,
      assets: deps.sceneAssetsCache,
      partyStart: {
        col: jump.partyStart.col,
        row: jump.partyStart.row,
        facing: jump.partyStart.facing as Facing,
      },
    })
    // loadScene 已经 mutate gs;现在拿 sceneAssets 让 bootstrap 同步 presentCtx。
    // 二次 loadScene 走 cache hit(SceneAssetsCache 的 Map.get),不会重 fetch。
    const sceneAssets = await deps.sceneAssetsCache.loadScene(jump.sceneId)
    await deps.onSceneChanged?.(sceneAssets)
    console.log('[dev-panel] scene jump done:', jump.sceneId)
  }
  catch (e) {
    console.error('[dev-panel] scene jump failed:', e)
  }
}
