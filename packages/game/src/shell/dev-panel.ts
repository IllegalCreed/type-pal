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
import { buildLabelMap } from '../core/event-system.js'
import { Save } from '../core/save/api.js'
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

  console.log('[dev-panel] 装配完成。快捷键:B = battle picker(探索模式)/ F1 = GameState dump / picker 内 "Test 4 Styles" = dialog 验证')
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

  const h3 = document.createElement('h3')
  h3.textContent = 'Dev Panel'
  h3.className = 'tp-dev-panel-title'
  div.appendChild(h3)

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

  const cancel = document.createElement('button')
  cancel.textContent = 'Cancel'
  cancel.style.cssText = 'margin-top:8px; padding:4px 8px'
  cancel.addEventListener('click', closePicker)
  div.appendChild(cancel)

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

  document.body.appendChild(div)
  currentPicker = div
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
