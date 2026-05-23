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
import type { GameState } from '../core/game-state.js'
import { startBattle } from '../core/battle/battle-system.js'

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

export interface DevPanelDeps {
  gs: GameState
  fixtures: BattleFixturesData
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
