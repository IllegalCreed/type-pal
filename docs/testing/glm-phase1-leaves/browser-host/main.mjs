// LV1-LV4 隔离宿主入口：只导实际生产 draw/setup，fixture 与测试同构（合法小输入）。
// 不接剧情链/真实存档/真实 SW/网络遥测；/extracted 只读（调色板 + 字形 + SPRITEUI）。
import { fetchPalette } from '/packages/game/src/assets/loader.js'
import { decodePngToIndices } from '/packages/game/src/assets/png.js'
import { createInitialGameState } from '/packages/game/src/core/game-state.js'
import {
  createInGameMenu,
  createSystemMenu,
  systemMenuEnterSwitch,
} from '/packages/game/src/core/menu/in-game-menu.js'
import { openMenu } from '/packages/game/src/core/menu/menu-stack.js'
import { createSaveSlotMenu } from '/packages/game/src/core/menu/save-slot-menu.js'
import { drawBattleSettlement } from '/packages/game/src/present/battle/draw-battle-settlement.js'
import { drawBattleUI } from '/packages/game/src/present/battle/draw-battle-ui.js'
import { loadGlyphs } from '/packages/game/src/present/font.js'
import { createFramebuffer } from '/packages/game/src/present/framebuffer.js'
import { drawMenuStack } from '/packages/game/src/present/menu/draw-menu.js'
import { createUnifiedProgressUi } from '/packages/game/src/shell/precache-ui.js'
import { drawMinimap } from '/packages/game/src/tools/minimap.js'
import { CHECKPOINTS } from '/packages/game/src/tools/speedrun/checkpoints.js'
import { showCountdown } from '/packages/game/src/tools/speedrun/countdown.js'
import {
  hideOverlay,
  injectOverlayStyles,
  renderOverlay,
} from '/packages/game/src/tools/speedrun/overlay.js'
import { setupToolsPanel } from '/packages/game/src/tools/tools-panel.js'

const log = (line) => {
  const el = document.getElementById('log')
  el.textContent = `${new Date().toISOString().slice(11, 23)} ${line}\n${el.textContent}`
}
const status = (id, text) => {
  document.getElementById(id).textContent = text
}

const palette = await fetchPalette(0).catch((e) => {
  log(`fetchPalette 失败（灰阶兜底）: ${e}`)
  return { colors: Array.from({ length: 256 }, (_, i) => [i, i, i]), cycles: [] }
})
const glyphs = await loadGlyphs('/extracted').catch((e) => {
  log(`字形加载失败（tofu 兜底）: ${e}`)
  return undefined
})

// SPRITEUI：真实资源（frame-NN.png）按 manifest 下标就位。
const uiSpriteFrames = []
try {
  const meta = await (await fetch('/extracted/data/ui-sprite/spriteui.json')).json()
  await Promise.all(
    meta.frames.map(async (f) => {
      try {
        const blob = await (
          await fetch(`/extracted/images/ui/frame-${f.index.toString().padStart(2, '0')}.png`)
        ).blob()
        uiSpriteFrames[f.index] = await decodePngToIndices(blob)
      } catch {
        /* 单帧缺失留空（生产 fail-loud 语义照旧） */
      }
    }),
  )
  log(`SPRITEUI 就绪 ${uiSpriteFrames.filter(Boolean).length}/${meta.frames.length} 帧`)
} catch (e) {
  log(`spriteui.json 缺失: ${e}`)
}

function paint(fb, canvasId) {
  const canvas = document.getElementById(canvasId)
  const ctx = canvas.getContext('2d')
  ctx.putImageData(fb.toImageData(palette), 0, 0)
}

// ── LV1：真实菜单栈三态 ────────────────────────────────────────────────────
function lv1(mode) {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.dwCash = 1234
  gs.menuStack.length = 0
  if (mode === 0) {
    openMenu(gs, { kind: 'in-game', state: createInGameMenu() })
  } else if (mode === 1) {
    const sys = createSystemMenu()
    systemMenuEnterSwitch(sys, 'music', true)
    openMenu(gs, { kind: 'system', state: sys })
  } else {
    const slot = createSaveSlotMenu('save')
    slot.slotMetas.set(2, { partyLevel: 12, cash: 3456, sceneId: 4, savedAt: 0, savedTimes: 12 })
    openMenu(gs, { kind: 'save-slot', state: slot })
  }
  const fb = createFramebuffer()
  fb.indices.fill(0x5a)
  drawMenuStack(fb, gs, uiSpriteFrames, glyphs)
  paint(fb, 'lv1-canvas')
  status('log', '')
  log(`LV1 状态 ${mode} 渲染完成`)
}

// ── LV2：固定战斗快照 + 结算屏 ─────────────────────────────────────────────
const ZERO_STATUS = { sleep: 0, paralyzed: 0, confused: 0, haste: 0, slow: 0 }
function battleState(patch = {}) {
  return {
    players: [
      { roleId: 0, prevHp: 41, prevMp: 12, defending: false, status: { ...ZERO_STATUS } },
      { roleId: 1, prevHp: 77, prevMp: 25, defending: false, status: { ...ZERO_STATUS } },
    ],
    enemies: [],
    field: {
      id: 0,
      screenWave: 0,
      magicEffect: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    },
    isBoss: false,
    phase: 'selectAction',
    turn: 1,
    actionQueue: [],
    currentActionIndex: 0,
    pendingActions: new Map(),
    uiState: 'selectMove',
    menuState: 'main',
    selectedAction: 0,
    uiCursor: 0,
    miscMenuCursor: 0,
    miscSubMenuCursor: 0,
    expGained: 0,
    cashGained: 0,
    rng: {
      next: () => 0,
      range: () => 0,
      rangeInclusive: () => 0,
      rangeFloat: () => 0,
      getState: () => 0,
    },
    phaseStallTicks: 0,
    selectionStartedForTurn: 1,
    selectingPlayerIdx: 0,
    ...patch,
  }
}
function battleGs() {
  const gs = createInitialGameState({ x: 0, y: 0, facing: 'down' })
  gs.mode = 'battle'
  gs.partyMembers = [0, 1]
  const rt = gs.PlayerRolesRuntime
  rt.rgwLevel[0] = 3
  rt.rgwHP[0] = 41
  rt.rgwMaxHP[0] = 58
  rt.rgwMP[0] = 12
  rt.rgwMaxMP[0] = 34
  rt.rgwHP[1] = 77
  rt.rgwMaxHP[1] = 90
  rt.rgwMP[1] = 25
  rt.rgwMaxMP[1] = 66
  return gs
}
const roles = {
  roles: ['李逍遥', '赵灵儿'].map((name, id) => ({
    id,
    _name: name,
    avatar: 0,
    spriteNumInBattle: 0,
    spriteNum: 0,
    name: 36 + id,
    attackAll: 0,
    level: 1,
    maxHP: 100,
    maxMP: 40,
    hp: 99,
    mp: 99,
    attackStrength: 1,
    magicStrength: 1,
    defense: 1,
    dexterity: 1,
    fleeRate: 1,
    poisonResistance: 0,
    elemResistance: { wind: 0, thunder: 0, water: 0, fire: 0, earth: 0 },
    walkFrames: 3,
    attackSound: 0,
    weaponSound: 0,
    criticalSound: 0,
    magicSound: 0,
    deathSound: 0,
  })),
}
function lv2(mode) {
  const fb = createFramebuffer()
  fb.indices.fill(0x5a)
  if (mode === 0) {
    drawBattleUI(fb, battleState(), roles, [], [], battleGs(), glyphs, uiSpriteFrames)
  } else if (mode === 1) {
    drawBattleSettlement({
      fb,
      screen: { kind: 'exp-cash', expGained: 120, cashGained: 7, isBoss: false },
      uiSpriteFrames,
      glyphs,
    })
  } else if (mode === 2) {
    const pair = (old, cur) => ({ old, cur })
    drawBattleSettlement({
      fb,
      screen: {
        kind: 'level-up',
        data: {
          roleId: 0,
          name: '李逍遥',
          level: pair(4, 5),
          hp: { old: 41, oldMax: 58, cur: 88, curMax: 105 },
          mp: { old: 12, oldMax: 34, cur: 25, curMax: 66 },
          attack: pair(30, 33),
          magic: pair(20, 24),
          defense: pair(10, 12),
          dexterity: pair(18, 21),
          flee: pair(7, 9),
        },
      },
      uiSpriteFrames,
      glyphs,
    })
  } else {
    drawBattleSettlement({
      fb,
      screen: { kind: 'learn-magic', data: { roleId: 0, name: '赵灵儿', magicName: '观音咒' } },
      uiSpriteFrames,
      glyphs,
    })
  }
  paint(fb, 'lv2-canvas')
  log(`LV2 状态 ${mode} 渲染完成`)
}

// ── LV3：真实 setupToolsPanel + drawMinimap ────────────────────────────────
function lv3() {
  const vol = { getVolume: () => 0.8, setVolume() {}, isMuted: () => false, setMuted() {} }
  setupToolsPanel({
    getGs: () => createInitialGameState({ x: 1600, y: 1040, facing: 'down' }),
    getResources: () => ({ playerRoles: { roles: [] }, objectPoisons: [], items: [] }),
    displayScale: {
      getPercent: () => 100,
      setPercent: (p) => log(`displayScale.setPercent(${p})`),
      toggleFullscreen: () => log('toggleFullscreen()'),
    },
    audioVolume: vol,
    sfxVolume: vol,
    videoVolume: vol,
    saveSlot: async () => log('saveSlot 委托（隔离桩）'),
    loadSlot: async () => null,
  })
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
  window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' })) // 唤出后即收起，避免盖住 LV1/LV2；LV3 交互时再唤出
  log('tools-panel 已挂载（真实 DOM，默认收起；Backquote 或下方按钮唤出）')
  const canvas = document.getElementById('lv3-minimap')
  const data = {
    camera: { x: 1600, y: 1040 },
    player: { x: 1600, y: 1040 },
    items: [
      { x: 1000, y: 600, name: '宝物' },
      { x: 2000, y: 1500, name: '宝物' },
    ],
    npcs: [
      { x: 800, y: 800 },
      { x: 1800, y: 400 },
    ],
  }
  drawMinimap(canvas, null, data, { showNpc: true, showItems: true }, { sx: 0, sy: 0, sw: 640 })
  document.getElementById('lv3-open').addEventListener('click', () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { code: 'Backquote' }))
    log('LV3 Backquote 切换面板显隐')
  })
  document.getElementById('lv3-click').addEventListener('click', () => {
    status('lv3-callback', '（点击委派已记录：见回调注册说明）')
    log(
      'LV3 点击：minimap 点击回调按 setupMinimap 合同委派（本宿主只画 drawMinimap；控制器点击坐标回调在单测已证）',
    )
  })
}

// ── LV4：假消息源推进加载进度 → 完成/错误 + 计时 overlay 显隐 ──────────────
function lv4() {
  // createUnifiedProgressUi 绑定真实 boot-loading DOM（同 index.html 结构，隔离宿主内联）
  const host = document.getElementById('lv4-progress-host')
  host.innerHTML = `
    <div id="boot-loading" style="position:relative;width:420px;height:90px;border:1px solid #553322;background:#111;padding:10px">
      <div id="boot-loading-status">正在准备必要资源…</div>
      <div style="position:relative;height:14px;background:#2a1515;margin-top:8px">
        <div id="boot-loading-fill" style="height:100%;width:0%;background:#d8b365"></div>
        <div id="boot-loading-mark" style="position:absolute;top:-3px;height:20px;width:2px;background:#e06c5a"></div>
      </div>
      <div id="boot-loading-enter" style="display:none;margin-top:8px">
        <button id="boot-loading-enter-btn">进入游戏</button>
      </div>
    </div>`
  const ui = createUnifiedProgressUi()
  let pct = 0
  const timer = setInterval(() => {
    pct += 10
    ui.setNecessaryProgress(Math.min(pct, 100))
    if (pct >= 100) {
      clearInterval(timer)
      ui.markPlayable()
      log('LV4 必要资源 100% → 可玩按钮已出（虚线 12% 映射已含）')
    }
  }, 120)
  const countdownHost = document.getElementById('lv4-countdown-host')
  countdownHost.appendChild(
    document.getElementById('tp-speedrun-countdown') ?? document.createElement('div'),
  )
  let n = 3
  showCountdown(String(n))
  const cdTimer = setInterval(() => {
    n -= 1
    if (n <= 0) {
      showCountdown(null)
      clearInterval(cdTimer)
      log('LV4 倒计时 3→2→1→null 收尾')
    } else {
      showCountdown(String(n))
    }
  }, 700)
  injectOverlayStyles()
  document.getElementById('lv4-overlay-show').addEventListener('click', () => {
    const run = {
      phase: 'running',
      elapsedMs: 65432,
      stepIndex: 1,
      splits: [12345, null],
      bananaPaused: false,
      manualPaused: false,
      hasUnCheated: false,
      countdownEndMs: null,
    }
    renderOverlay(
      run,
      CHECKPOINTS,
      Object.fromEntries(CHECKPOINTS.map((c) => [c.id, c.defaultBestMs])),
    )
    status('lv4-overlay-state', '显示')
    log('LV4 overlay 显示（renderOverlay 真函数）')
  })
  document.getElementById('lv4-overlay-hide').addEventListener('click', () => {
    hideOverlay()
    status('lv4-overlay-state', '隐藏')
    log('LV4 overlay 隐藏（hideOverlay 真函数）')
  })
}

window.addEventListener('error', (e) => log(`页面错误: ${e.message}`))
window.__lv = { lv1, lv2 }
document.querySelectorAll('button[data-lv1]').forEach((b) => {
  b.addEventListener('click', () => lv1(Number(b.dataset.lv1)))
})
document.querySelectorAll('button[data-lv2]').forEach((b) => {
  b.addEventListener('click', () => lv2(Number(b.dataset.lv2)))
})
lv1(0)
lv2(0)
lv3()
lv4()
log('宿主就绪：LV1/LV2 用按钮或 __lv.lv1(n)/__lv.lv2(n) 切换状态')
