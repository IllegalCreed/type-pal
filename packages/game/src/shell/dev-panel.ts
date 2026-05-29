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
import {
  buildLabelMap,
  OP_FADE_OUT, OP_FADE_IN, OP_FADE_TO_RED, OP_PALETTE_FADE, OP_COLOR_FADE,
  OP_SCENE_FADE, OP_FADE_TO_SCENE, OP_FADE_SCREEN, OP_SET_DAY_PALETTE, OP_SET_NIGHT_PALETTE,
  OP_SET_RNG, OP_PLAY_RNG, OP_WAVE_SCREEN, OP_SHAKE_SCREEN, OP_SHOW_FBP, OP_SCROLL_FBP,
} from '../core/event-system.js'
import { Save } from '../core/save/api.js'
import type { SceneAssets, SceneAssetsCache } from '../assets/loader.js'
// M5.6 W2.b + T11:menu units 入口 — 一键 push 各 menu kind 到 menuStack
import { createInGameMenu, createSystemMenu } from '../core/menu/in-game-menu.js'
import { createSaveSlotMenu } from '../core/menu/save-slot-menu.js'
import { createInventoryActionMenu } from '../core/menu/inventory-action-menu.js'
import { createPlayerStatus } from '../core/menu/player-status.js'
import { createInventoryMenu } from '../core/menu/inventory-menu.js'
import { createEquipMenu } from '../core/menu/equip-menu.js'
import { createInGameMagicMenu } from '../core/menu/in-game-magic-menu.js'
import { openMenu } from '../core/menu/menu-mode.js'

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
    else if (e.code === 'KeyP') {
      e.preventDefault()
      // 强制 李逍遥(role 0)+ 赵灵儿(role 1)+ 林月如(role 2)入队,测多人状态/装备/道具。
      // 三人 runtime stats 新游戏已 hydrate(hydratePlayerRolesRuntime 遍历全 role),
      // 直接设 partyMembers 即可驱动 status/equip/magic/item 菜单显示三人。
      deps.gs.partyMembers = [0, 1, 2]
      deps.gs.partyLeaderSpriteId = deps.resources.playerRoles.roles[0]?.spriteNum ?? deps.gs.partyLeaderSpriteId
      console.log('[dev] 强制入队:李逍遥(0)+赵灵儿(1)+林月如(2)。partyMembers=', deps.gs.partyMembers)
    }
  })

  console.log('[dev-panel] 装配完成。快捷键:B = battle picker / F1 = GameState dump / P = 强制三人入队(测多人菜单)/ picker 内 "Test 4 Styles" = dialog 验证')
}

/** 当前打开的 picker root —— 同一时刻只允许一个。 */
let currentPicker: HTMLDivElement | undefined

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
  `
  document.head.appendChild(style)
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
  div.appendChild(h3)

  // M5.6 UX hotfix:close 按钮右上角 X(user 怒怼"Cancel 在底部不顺手")
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '×'
  closeBtn.title = 'Close (Esc)'
  closeBtn.style.cssText = 'position:absolute; top:6px; right:8px; padding:0 8px; cursor:pointer; font-size:20px; line-height:1; background:transparent; border:none; color:#fff; font-weight:bold'
  closeBtn.addEventListener('click', closePicker)
  div.appendChild(closeBtn)

  const battleH = document.createElement('h4')
  battleH.textContent = '⚔ Battle Fixtures'
  battleH.className = 'tp-dev-section-h'
  div.appendChild(battleH)

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
  const sceneH = document.createElement('h4')
  sceneH.textContent = '🗺 Scene Jump'
  sceneH.className = 'tp-dev-section-h'
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

  // M5.6 UX hotfix:底部 Cancel 按钮删除 — 走右上角 X(已加在 div 内)

  // P4.T5: Font Test sheet — 渲染中英文混合字符串到 fb,spot-check Unifont glyph 真显示
  const fontTestH = document.createElement('h4')
  fontTestH.textContent = '🔤 Font Test'
  fontTestH.className = 'tp-dev-section-h'
  div.appendChild(fontTestH)

  const fontTestBtn = document.createElement('button')
  fontTestBtn.textContent = 'Font Test'
  fontTestBtn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  fontTestBtn.addEventListener('click', () => {
    closePicker()
    if (deps.onFontTest) {
      deps.onFontTest()
    }
    else {
      // fallback:console only spot-check(bootstrap 未传 onFontTest 时)
      console.warn('[font-test] onFontTest 未注入,仅 console spot-check')
    }
  })
  div.appendChild(fontTestBtn)

  // Sync.v Step 2: Dialog Style Test —— 4 style 各一段,验证 typing / 头像 / key icon / 多页
  const dialogH = document.createElement('h4')
  dialogH.textContent = '💬 Dialog Styles'
  dialogH.className = 'tp-dev-section-h'
  div.appendChild(dialogH)

  const dialogBtn = document.createElement('button')
  dialogBtn.textContent = 'Test 4 Styles(top→center→bottom→narration)'
  dialogBtn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  dialogBtn.addEventListener('click', () => {
    closePicker()
    triggerDialogStyleTest(deps)
  })
  div.appendChild(dialogBtn)

  // M5.S-w2.1: Save / Load / List / Clear entry
  const saveH = document.createElement('h4')
  saveH.textContent = '💾 Save Slots (IndexedDB)'
  saveH.className = 'tp-dev-section-h'
  div.appendChild(saveH)

  for (let slot = 1; slot <= 5; slot++) {
    const row = document.createElement('div')
    row.style.cssText = 'display:flex; gap:4px; margin:2px 0'
    const saveBtn = document.createElement('button')
    saveBtn.textContent = `S${slot} save`
    saveBtn.style.cssText = 'padding:3px 6px; font-size:11px'
    saveBtn.addEventListener('click', async () => {
      await Save.saveSlot(slot, deps.gs)
      console.log(`[save] slot ${slot} saved`)
    })
    const loadBtn = document.createElement('button')
    loadBtn.textContent = 'load'
    loadBtn.style.cssText = 'padding:3px 6px; font-size:11px'
    loadBtn.addEventListener('click', async () => {
      const loaded = await Save.loadSlot(slot)
      if (!loaded) {
        console.warn(`[load] slot ${slot} 为空`)
        return
      }
      Object.assign(deps.gs, loaded)
      console.log(`[load] slot ${slot} loaded → gs.dwCash=${deps.gs.dwCash} scene=${deps.gs.wNumScene}`)
    })
    const delBtn = document.createElement('button')
    delBtn.textContent = 'del'
    delBtn.style.cssText = 'padding:3px 6px; font-size:11px'
    delBtn.addEventListener('click', async () => {
      await Save.deleteSlot(slot)
      console.log(`[save] slot ${slot} deleted`)
    })
    row.appendChild(saveBtn)
    row.appendChild(loadBtn)
    row.appendChild(delBtn)
    div.appendChild(row)
  }

  const listBtn = document.createElement('button')
  listBtn.textContent = 'List All Slots'
  listBtn.style.cssText = 'display:block; margin:4px 0; padding:4px 8px; width:100%; text-align:left'
  listBtn.addEventListener('click', async () => {
    const list = await Save.listSlots()
    console.log('[save] slots:', list)
  })
  div.appendChild(listBtn)

  // ── M5.6 W2.b: Menu Units ─────────────────────────────────────────
  // 每按钮一键 push 对应 menu kind 到 menuStack — 验证 W0 渲染 + 输入路由真通。
  const menuH = document.createElement('h4')
  menuH.textContent = '📋 Menu Units (M5.6 W0)'
  menuH.className = 'tp-dev-section-h'
  div.appendChild(menuH)

  const menuUnits: Array<{ label: string; openFn: () => void }> = [
    { label: 'InGame Menu (ESC)', openFn: () => openMenu(deps.gs, { kind: 'in-game', state: createInGameMenu() }) },
    { label: 'System Menu', openFn: () => openMenu(deps.gs, { kind: 'system', state: createSystemMenu() }) },
    { label: 'Save Slot (save mode)', openFn: () => openMenu(deps.gs, { kind: 'save-slot', state: createSaveSlotMenu('save') }) },
    { label: 'Player Status', openFn: () => openMenu(deps.gs, { kind: 'player-status', state: createPlayerStatus(deps.gs.partyMembers) }) },
    // T11 补 3 个 sub-menu(catalog 已通过 setMenuCatalogs 注入,createX 内部读 catalogs)
    // M5.6 session 3 加:Inventory Action 1 级 box submenu(sdlpal uigame.c:878-919 真值)
    {
      label: 'Inventory Action (装备/使用 box)',
      openFn: () => openMenu(deps.gs, {
        kind: 'inventory-action',
        state: createInventoryActionMenu(deps.gs.iCurInvActionMenuItem),
      }),
    },
    {
      label: 'Inventory (直跳 fullscreen list,dev only)',
      openFn: () => openMenu(deps.gs, { kind: 'inventory', state: createInventoryMenu(deps.gs, deps.resources.items) }),
    },
    {
      label: 'Equip',
      openFn: () => openMenu(deps.gs, { kind: 'equip', state: createEquipMenu(deps.gs, deps.resources.items) }),
    },
    {
      label: 'InGame Magic',
      openFn: () => openMenu(deps.gs, {
        kind: 'in-game-magic',
        state: createInGameMagicMenu(deps.resources.playerRoles, deps.gs.partyMembers, deps.resources.spells),
      }),
    },
  ]
  for (const unit of menuUnits) {
    const btn = document.createElement('button')
    btn.textContent = unit.label
    btn.style.cssText = 'display:block; margin:2px 0; padding:4px 8px; width:100%; text-align:left; font-size:11px'
    btn.addEventListener('click', () => {
      closePicker()
      unit.openFn()
    })
    div.appendChild(btn)
  }

  // ── M5.6 T11(user 加需求):添加全物品 — 帮 manual 测物品菜单完整显示 ──
  const inventoryAllH = document.createElement('h4')
  inventoryAllH.textContent = '🎒 Inventory Cheats'
  inventoryAllH.className = 'tp-dev-section-h'
  div.appendChild(inventoryAllH)

  const addAllBtn = document.createElement('button')
  addAllBtn.textContent = `+ 添加全部 ${deps.resources.items.length} 物品 ×99`
  addAllBtn.style.cssText = 'display:block; margin:2px 0; padding:4px 8px; width:100%; text-align:left; font-size:11px'
  addAllBtn.addEventListener('click', () => {
    closePicker()
    // 直接 mutate gs.inventory(同 event-system addItemToInventory 等价语义,但批量)
    // 修(2026-05-27 session 3,user 反馈"添加全物品没看到观音符"):**不能** skip id===0,
    // 观音符 items.json id=0 是真值物品(items.json id 0..234 对 sdlpal OBJECT 61..295)。
    // 旧 `if (item.id === 0) continue` 错误把 items.json id 0 当 sdlpal 内部 wItem=0 "no item"
    // 哨兵 — 两套 id 系统混淆,导致 观音符 永远添加不进 inventory。
    for (const item of deps.resources.items) {
      const entry = deps.gs.inventory.find((e) => e.itemId === item.id)
      if (entry) {
        entry.count = Math.min(99, entry.count + 99)
      }
      else {
        deps.gs.inventory.push({ itemId: item.id, count: 99 })
      }
    }
    // 加 1,000,000 金钱方便商店测试
    deps.gs.dwCash = 1_000_000
    console.log(`[dev] 添加了 ${deps.resources.items.length} 种物品 ×99 + 金钱 1,000,000`)
  })
  div.appendChild(addAllBtn)

  const clearInvBtn = document.createElement('button')
  clearInvBtn.textContent = '🗑 清空背包'
  clearInvBtn.style.cssText = 'display:block; margin:2px 0; padding:4px 8px; width:100%; text-align:left; font-size:11px'
  clearInvBtn.addEventListener('click', () => {
    closePicker()
    deps.gs.inventory = []
    deps.gs.dwCash = 0
    console.log('[dev] 背包清空 + 金钱归 0')
  })
  div.appendChild(clearInvBtn)

  // ✨ Effects (Opcode) —— 逐特效触发(注入合成 raw 脚本走 tickEventSystem,1:1 真实控制流)。
  const fxH = document.createElement('h4')
  fxH.textContent = '✨ Effects (Opcode)'
  fxH.className = 'tp-dev-section-h'
  div.appendChild(fxH)

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
  div.appendChild(opRow)

  const effectOps: Array<{ label: string, opcode: number, defaults: [number, number, number] }> = [
    { label: 'FadeOut 0x50 (→黑)', opcode: OP_FADE_OUT, defaults: [1, 0, 0] },
    { label: 'FadeIn 0x51 (黑→场景)', opcode: OP_FADE_IN, defaults: [1, 0, 0] },
    { label: 'FadeToRed 0x4F (game over)', opcode: OP_FADE_TO_RED, defaults: [0, 0, 0] },
    { label: 'PaletteFade 0x80 (昼夜)', opcode: OP_PALETTE_FADE, defaults: [0, 0, 0] },
    { label: 'ColorFade 0x8C', opcode: OP_COLOR_FADE, defaults: [0, 2, 0] },
    { label: 'SceneFade 0x93', opcode: OP_SCENE_FADE, defaults: [2, 0, 0] },
    { label: 'FadeToScene 0x9B (dither)', opcode: OP_FADE_TO_SCENE, defaults: [0, 0, 0] },
    { label: 'FadeScreen 0x73 (dither)', opcode: OP_FADE_SCREEN, defaults: [2, 0, 0] },
    { label: 'SetDay 0x53', opcode: OP_SET_DAY_PALETTE, defaults: [0, 0, 0] },
    { label: 'SetNight 0x54', opcode: OP_SET_NIGHT_PALETTE, defaults: [0, 0, 0] },
    { label: 'WaveScreen 0x71 (波动)', opcode: OP_WAVE_SCREEN, defaults: [40, 2, 0] },
    { label: 'Shake 0x35 (present stub)', opcode: OP_SHAKE_SCREEN, defaults: [10, 4, 0] },
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
    btn.addEventListener('click', () => {
      closePicker()
      triggerEffectScript(deps, [{ op: 'raw', opcode, operands: readOperands(defaults) }])
    })
    div.appendChild(btn)
  }

  // RNG(0x36 SetRNG + 0x37 PlayRNG):chunk 输入 + 播放。op0/1/2 = startFrame/endFrame/speed。
  const rngRow = document.createElement('div')
  rngRow.style.cssText = 'display:flex; gap:4px; margin:4px 0; align-items:center'
  const rngLabel = document.createElement('span')
  rngLabel.textContent = 'RNG chunk(0-11):'
  rngRow.appendChild(rngLabel)
  const rngChunkInput = document.createElement('input')
  rngChunkInput.type = 'number'
  rngChunkInput.value = '6'
  rngChunkInput.style.cssText = 'width:56px'
  rngRow.appendChild(rngChunkInput)
  const rngBtn = document.createElement('button')
  rngBtn.textContent = 'Play RNG (0x36+0x37)'
  rngBtn.addEventListener('click', () => {
    closePicker()
    const chunk = Number(rngChunkInput.value) || 0
    const [start, end, speed] = readOperands([0, 0, 16])
    triggerEffectScript(deps, [
      { op: 'raw', opcode: OP_SET_RNG, operands: [chunk, 0, 0] },
      { op: 'raw', opcode: OP_PLAY_RNG, operands: [start, end, speed] },
    ])
  })
  rngRow.appendChild(rngBtn)
  div.appendChild(rngRow)

  // FBP(0x76 ShowFBP):chunk + fade 输入。chunk = FBP.MKF 号(battle bg 0-77;结局 CG 74/75/76/77);
  //   fade=op1(0=瞬时,>0 dither 渐变)。有图真显(DOS 路径),0xFFFF/无图 → 黑。
  const fbpRow = document.createElement('div')
  fbpRow.style.cssText = 'display:flex; gap:4px; margin:4px 0; align-items:center'
  const fbpLabel = document.createElement('span')
  fbpLabel.textContent = 'FBP chunk/fade:'
  fbpRow.appendChild(fbpLabel)
  const fbpChunkInput = document.createElement('input')
  fbpChunkInput.type = 'number'
  fbpChunkInput.value = '75'
  fbpChunkInput.style.cssText = 'width:56px'
  fbpRow.appendChild(fbpChunkInput)
  const fbpFadeInput = document.createElement('input')
  fbpFadeInput.type = 'number'
  fbpFadeInput.value = '7'
  fbpFadeInput.style.cssText = 'width:56px'
  fbpRow.appendChild(fbpFadeInput)
  const fbpBtn = document.createElement('button')
  fbpBtn.textContent = 'Show FBP (0x76)'
  fbpBtn.addEventListener('click', () => {
    closePicker()
    triggerEffectScript(deps, [{
      op: 'raw',
      opcode: OP_SHOW_FBP,
      operands: [Number(fbpChunkInput.value) || 0, Number(fbpFadeInput.value) || 0, 0],
    }])
  })
  fbpRow.appendChild(fbpBtn)
  // ScrollFBP(0xA4):chunk = fbp 输入,speed = fade 输入(复用)。220 步下滑卷入。
  const scrollBtn = document.createElement('button')
  scrollBtn.textContent = 'Scroll FBP (0xA4)'
  scrollBtn.addEventListener('click', () => {
    closePicker()
    triggerEffectScript(deps, [{
      op: 'raw',
      opcode: OP_SCROLL_FBP,
      operands: [Number(fbpChunkInput.value) || 0, 0, Number(fbpFadeInput.value) || 15],
    }])
  })
  fbpRow.appendChild(scrollBtn)
  div.appendChild(fbpRow)

  // 🎬 Videos —— 开场 / 结局 AVI 双版(WIN95 mp4)。DOS 双版:开场用 ?build=dos 启动;结局 DOS 编排待 Phase 3。
  const vidH = document.createElement('h4')
  vidH.textContent = '🎬 Videos (开场/结局 mp4)'
  vidH.className = 'tp-dev-section-h'
  div.appendChild(vidH)
  // 开场 DOS 版(trademark RNG + splash 卷轴)— WIN95 mp4 之外的另一版。
  const dosOpeningBtn = document.createElement('button')
  dosOpeningBtn.textContent = '开场 DOS (trademark+splash)'
  dosOpeningBtn.addEventListener('click', () => {
    closePicker()
    if (deps.playDosOpening) deps.playDosOpening()
    else console.log('[dev] playDosOpening — 无注入')
  })
  div.appendChild(dosOpeningBtn)

  const videos: Array<{ label: string, mp4: string }> = [
    { label: '开场 WIN95-1 (1.mp4)', mp4: '1.mp4' },
    { label: '开场 WIN95-2 (2.mp4)', mp4: '2.mp4' },
    { label: '新游戏 (3.mp4)', mp4: '3.mp4' },
    { label: '结局 4 (4.mp4)', mp4: '4.mp4' },
    { label: '结局 5 (5.mp4)', mp4: '5.mp4' },
    { label: '结局 6 (6.mp4)', mp4: '6.mp4' },
  ]
  for (const { label, mp4 } of videos) {
    const btn = document.createElement('button')
    btn.textContent = label
    btn.addEventListener('click', () => {
      closePicker()
      if (deps.playVideo) deps.playVideo(mp4)
      else console.log(`[dev] playVideo(${mp4}) — 无 playVideo 注入`)
    })
    div.appendChild(btn)
  }
  // 结局 WIN95 全片(PAL_EndingScreen 的 AVI 序:4→5→6 连播)。DOS 结局编排留 Phase 3。
  const endingBtn = document.createElement('button')
  endingBtn.textContent = '▶ 结局 WIN95 (4→5→6 连播)'
  endingBtn.addEventListener('click', () => {
    closePicker()
    if (deps.playVideo) deps.playVideo(['4.mp4', '5.mp4', '6.mp4'])
    else console.log('[dev] playVideo ending — 无 playVideo 注入')
  })
  div.appendChild(endingBtn)

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
  console.log('[dev] trigger effect:', cmds.map((c) => (c.op === 'raw' ? `0x${c.opcode.toString(16)}[${c.operands}]` : c.op)).join(' '))
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
    // P2#5:不传切片 — startBattle 默认 getGlobalCommands()(战斗脚本是全局 entry)。
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
  }
  catch (e) {
    console.error('[dev-panel] scene jump failed:', e)
  }
}
