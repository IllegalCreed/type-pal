// 生产增强工具面板(canvas 外 DOM,非 DEV 门;只读 + 玩家便利动作)。右侧悬浮、非模态、左竖 Tab。
//   视觉复用 load 界面「仙剑 金/朱 暗底」配色(见 injectToolsPanelStyles 的 design tokens)。
//   tab 内容渲染见 renderActiveTab(Task 5 填充)。
import type { Item, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from '../core/inspect/battle-inspect.js'
import type { GameState } from '../core/game-state.js'
import type { AudioVolumeController } from '../shell/audio-volume.js'
import type { DisplayScaleController } from './display-scale.js'
import { parseImportedSave, serializeSave } from './save-io.js'
import { getSceneName } from './scene-names.js'
import { showToast } from './toast.js'

export interface PanelResources {
  playerRoles: PlayerRoles
  objectPoisons: readonly ObjectPoisonView[]
  items: readonly Item[]
}

export interface ToolsPanelDeps {
  getGs: () => GameState
  /** 战斗 tab 只读用(playerRoles/objectPoisons/items);资源加载后不变。 */
  getResources: () => PanelResources
  displayScale: DisplayScaleController
  audioVolume: AudioVolumeController
  /** 存档导出 = 当前 gs;导入 = 解析后写 slot 1。 */
  saveSlot: (slot: number, gs: GameState) => Promise<void>
}

type TabKey = 'battle' | 'scene' | 'system' | 'dialog'
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['battle', '战斗'],
  ['scene', '场景'],
  ['system', '系统'],
  ['dialog', '对话'],
]

const STYLE_ID = 'tp-tools-style'

/** 注入面板样式(幂等)。CSS 变量作用域在 #tp-tools-panel;唤出印钮在面板外故硬编码同值。 */
export function injectToolsPanelStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#tp-tools-panel {
  --tp-gold:#d8b365; --tp-cream:#f0e0b0; --tp-crimson:#8a2a2a; --tp-crimson-dark:#5a1414;
  --tp-slot:#2a1515; --tp-border:#553322; --tp-text:#cbb890; --tp-text-dim:#6b5a3e;
  --tp-error:#e06c5a; --tp-glow:rgba(160,30,30,0.5);
  position:fixed; top:12px; left:12px; width:440px; max-height:86vh; z-index:30;
  display:flex; background:rgba(17,17,17,0.92); backdrop-filter:blur(6px);
  border:1px solid var(--tp-gold); border-radius:8px;
  box-shadow:0 0 24px var(--tp-glow), 0 4px 20px rgba(0,0,0,0.6);
  font:13px/1.5 "Songti SC","SimSun",serif; color:var(--tp-text);
  overflow:hidden; animation:tp-panel-in .18s ease;
}
@keyframes tp-panel-in { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
#tp-tools-panel[hidden] { display:none; }
.tp-tabbar { flex:0 0 84px; display:flex; flex-direction:column; padding:8px 0;
  background:rgba(0,0,0,0.25); border-right:1px solid var(--tp-border); }
.tp-tab { font:14px/1 "Songti SC","SimSun",serif; color:var(--tp-text-dim);
  background:transparent; border:none; border-left:2px solid transparent;
  padding:11px 0 11px 16px; text-align:left; cursor:pointer; letter-spacing:2px;
  transition:color .12s, background .12s; }
.tp-tab:hover { color:var(--tp-text); background:rgba(216,179,101,0.08); }
.tp-tab.tp-tab-active { color:#1a140c; font-weight:bold; border-left-color:var(--tp-crimson);
  background:linear-gradient(90deg, var(--tp-gold), #c9a456); }
.tp-main { flex:1 1 auto; display:flex; flex-direction:column; min-width:0; }
.tp-header { display:flex; align-items:center; justify-content:space-between;
  padding:9px 12px 8px; border-bottom:1px solid var(--tp-border); }
.tp-title { color:var(--tp-gold); font-size:15px; letter-spacing:3px;
  text-shadow:0 0 10px rgba(160,30,30,0.5); }
.tp-close { background:transparent; border:none; color:var(--tp-text-dim);
  font-size:18px; line-height:1; cursor:pointer; padding:0 4px; transition:color .12s; }
.tp-close:hover { color:var(--tp-cream); }
.tp-body { flex:1 1 auto; overflow-y:auto; padding:10px 14px; }
.tp-body::-webkit-scrollbar { width:8px; }
.tp-body::-webkit-scrollbar-track { background:var(--tp-slot); }
.tp-body::-webkit-scrollbar-thumb {
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-gold)); border-radius:4px; }
.tp-row { display:flex; gap:8px; padding:2px 0; }
.tp-row-label { color:var(--tp-text-dim); flex:0 0 auto; }
.tp-row-value { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; }
.tp-section-title { color:var(--tp-cream); margin:12px 0 5px; letter-spacing:1px;
  border-bottom:1px solid var(--tp-border); padding-bottom:3px; }
.tp-section-title:first-child { margin-top:0; }
.tp-btn { font-family:"Songti SC","SimSun",serif; color:var(--tp-cream);
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-crimson-dark));
  border:1px solid var(--tp-gold); border-radius:4px; padding:5px 14px; cursor:pointer;
  letter-spacing:1px; box-shadow:0 0 8px var(--tp-glow); transition:transform .1s; }
.tp-btn:hover { transform:scale(1.04); } .tp-btn:active { transform:scale(0.97); }
.tp-select { background:var(--tp-slot); color:var(--tp-gold); border:1px solid var(--tp-gold);
  border-radius:4px; padding:3px 6px; font-family:inherit; }
.tp-range { accent-color:var(--tp-gold); vertical-align:middle; }
.tp-input { background:var(--tp-slot); color:var(--tp-cream); border:1px solid var(--tp-border);
  border-radius:4px; padding:4px 8px; font-family:inherit; width:100%; box-sizing:border-box; }
.tp-input:focus { outline:none; border-color:var(--tp-gold); }
.tp-muted { color:var(--tp-text-dim); }
#tp-tools-launcher { position:fixed; bottom:10px; right:10px; z-index:29;
  width:34px; height:34px; background:rgba(17,17,17,0.85); color:#d8b365;
  border:1px solid #d8b365; border-radius:6px; font:16px/1 "Songti SC","SimSun",serif;
  cursor:pointer; opacity:0.55; transition:opacity .15s, box-shadow .15s; }
#tp-tools-launcher:hover { opacity:1; box-shadow:0 0 12px rgba(160,30,30,0.5); }
`
  document.head.appendChild(style)
}

// ── tab 内容渲染辅助 ──
function row(parent: HTMLElement, label: string, value: string): void {
  const d = document.createElement('div')
  d.className = 'tp-row'
  const l = document.createElement('span')
  l.className = 'tp-row-label'
  l.textContent = label
  const v = document.createElement('span')
  v.className = 'tp-row-value'
  v.textContent = value
  d.append(l, v)
  parent.appendChild(d)
}

function sectionTitle(parent: HTMLElement, text: string): void {
  const d = document.createElement('div')
  d.className = 'tp-section-title'
  d.textContent = text
  parent.appendChild(d)
}

function muted(parent: HTMLElement, text: string): void {
  const d = document.createElement('div')
  d.className = 'tp-muted'
  d.textContent = text
  parent.appendChild(d)
}

/** 战斗 tab:队伍状态 / 敌人血量 / 场地(复用 battle-inspect 纯读函数)。非战斗 → 提示。 */
function renderBattleTab(parent: HTMLElement, gs: GameState, res: PanelResources): void {
  if (gs.mode !== 'battle' || !gs.battleState) {
    muted(parent, '(当前非战斗)')
    return
  }
  sectionTitle(parent, '队伍状态')
  for (const p of collectPartyStatusReadouts(gs, res.playerRoles, res.objectPoisons, res.items)) {
    row(parent, p.roleName, p.entries.length ? p.entries.join(' / ') : '正常')
  }
  sectionTitle(parent, '敌人状态')
  for (const e of collectEnemyStatusReadouts(gs, res.objectPoisons, res.items)) {
    row(parent, e.name, e.defeated ? '已倒' : `HP ${e.hp}/${e.maxHp}`)
  }
  const field = collectFieldInfoReadout(gs)
  if (field) {
    sectionTitle(parent, '场地')
    row(parent, 'field', `#${field.fieldId}${field.isBoss ? '  (BOSS)' : ''}`)
    row(parent, '元素场效', field.elements.map((s) => `${s.label}${s.value > 0 ? '+' : ''}${s.value}`).join('  '))
  }
}

/** 场景 tab:简版(场景名 + 坐标 + 镜头);小地图视图 Task「小地图」升级。 */
function renderSceneTab(parent: HTMLElement, gs: GameState): void {
  sectionTitle(parent, '当前场景')
  row(parent, '场景', `${getSceneName(gs.wNumScene)}  (#${gs.wNumScene})`)
  row(parent, '主角坐标', `x=${gs.party.x}  y=${gs.party.y}`)
  row(parent, '朝向', String(gs.party.facing))
  row(parent, '镜头', `x=${gs.camera.x}  y=${gs.camera.y}`)
  row(parent, '队伍', gs.partyMembers.join(', '))
  const hint = document.createElement('div')
  hint.className = 'tp-muted'
  hint.style.marginTop = '10px'
  hint.textContent = '🗺 小地图视图开发中(缩略图 + 主角/NPC/道具定位 + 可视框)'
  parent.appendChild(hint)
}

/** 系统 tab:显示(分辨率/全屏) / 音频(BGM 音量/静音) / 存档(导出/导入到位 1)。 */
function renderSystemTab(parent: HTMLElement, deps: ToolsPanelDeps): void {
  // ── 显示 ──
  sectionTitle(parent, '显示')
  const dispRow = document.createElement('div')
  dispRow.className = 'tp-row'
  const dispLabel = document.createElement('span')
  dispLabel.className = 'tp-row-label'
  dispLabel.textContent = '缩放'
  const sel = document.createElement('select')
  sel.className = 'tp-select'
  for (const [v, l] of [['fit', '适应窗口'], ['2', '2×'], ['3', '3×'], ['4', '4×'], ['5', '5×'], ['6', '6×']] as const) {
    const o = document.createElement('option')
    o.value = v
    o.textContent = l
    sel.appendChild(o)
  }
  sel.value = String(deps.displayScale.getMode())
  sel.addEventListener('change', () => deps.displayScale.setMode(sel.value === 'fit' ? 'fit' : Number(sel.value)))
  const fsBtn = document.createElement('button')
  fsBtn.className = 'tp-btn'
  fsBtn.textContent = '全屏'
  fsBtn.style.marginLeft = '8px'
  fsBtn.addEventListener('click', () => deps.displayScale.toggleFullscreen())
  dispRow.append(dispLabel, sel, fsBtn)
  parent.appendChild(dispRow)

  // ── 音频 ──
  sectionTitle(parent, '音频')
  const vol = deps.audioVolume
  const volRow = document.createElement('div')
  volRow.className = 'tp-row'
  const volLabel = document.createElement('span')
  volLabel.className = 'tp-row-label'
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.min = '0'
  slider.max = '100'
  slider.className = 'tp-range'
  slider.style.flex = '1'
  slider.value = String(Math.round(vol.getVolume() * 100))
  const syncVol = (): void => {
    volLabel.textContent = `BGM ${slider.value}%`
  }
  syncVol()
  slider.addEventListener('input', () => {
    vol.setVolume(Number(slider.value) / 100)
    syncVol()
  })
  volRow.append(volLabel, slider)
  parent.appendChild(volRow)
  const muteBtn = document.createElement('button')
  muteBtn.className = 'tp-btn'
  const syncMute = (): void => {
    muteBtn.textContent = vol.isMuted() ? '🔇 已静音' : '🔊 静音'
  }
  syncMute()
  muteBtn.addEventListener('click', () => {
    vol.setMuted(!vol.isMuted())
    syncMute()
  })
  parent.appendChild(muteBtn)

  // ── 存档 ──
  sectionTitle(parent, '存档')
  const exportBtn = document.createElement('button')
  exportBtn.className = 'tp-btn'
  exportBtn.textContent = '导出当前进度'
  exportBtn.addEventListener('click', () => {
    const gs = deps.getGs()
    const blob = new Blob([serializeSave(gs)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `type-pal-save-${gs.wNumScene}.json`
    a.click()
    URL.revokeObjectURL(a.href)
    showToast('已导出存档文件', { type: 'success' })
  })
  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = '.json,application/json'
  importInput.style.display = 'none'
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (): void => {
      void (async (): Promise<void> => {
        try {
          const loaded = parseImportedSave(String(reader.result))
          await deps.saveSlot(1, loaded)
          showToast('已导入到存档位 1,可在读档菜单载入', { type: 'success' })
        } catch (err) {
          showToast(`导入失败:${err instanceof Error ? err.message : String(err)}`, { type: 'error' })
        }
      })()
    }
    reader.readAsText(file)
  })
  const importBtn = document.createElement('button')
  importBtn.className = 'tp-btn'
  importBtn.style.marginLeft = '8px'
  importBtn.textContent = '导入到存档位 1'
  importBtn.addEventListener('click', () => importInput.click())
  parent.append(exportBtn, importBtn, importInput)
}

/** 对话 tab:搜索框 + 按「进入场景」分组(时序正序,场景名标题) + 行列表。 */
function renderDialogTab(parent: HTMLElement, gs: GameState): void {
  const history = gs.dialogHistory ?? []
  if (!history.length) {
    muted(parent, '(暂无历史对话)')
    return
  }
  const search = document.createElement('input')
  search.type = 'text'
  search.className = 'tp-input'
  search.placeholder = '搜索对话…'
  parent.appendChild(search)
  const list = document.createElement('div')
  list.style.marginTop = '6px'
  parent.appendChild(list)
  const renderList = (q: string): void => {
    list.replaceChildren()
    const kw = q.trim()
    let lastScene: number | undefined
    for (const entry of history) {
      if (kw && !entry.text.includes(kw)) continue
      if (entry.scene !== lastScene) {
        const g = document.createElement('div')
        g.className = 'tp-section-title tp-dialog-group'
        g.textContent = getSceneName(entry.scene)
        list.appendChild(g)
        lastScene = entry.scene
      }
      const line = document.createElement('div')
      line.className = 'tp-dialog-line'
      line.style.cssText = 'padding:3px 0;border-bottom:1px solid var(--tp-border)'
      line.textContent = entry.text
      list.appendChild(line)
    }
    if (!list.childElementCount) muted(list, '(无匹配)')
  }
  renderList('')
  search.addEventListener('input', () => renderList(search.value))
}

function renderActiveTab(body: HTMLElement, active: TabKey, deps: ToolsPanelDeps): void {
  const gs = deps.getGs()
  if (active === 'battle') renderBattleTab(body, gs, deps.getResources())
  else if (active === 'scene') renderSceneTab(body, gs)
  else if (active === 'system') renderSystemTab(body, deps)
  else renderDialogTab(body, gs)
}

export function setupToolsPanel(deps: ToolsPanelDeps): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('tp-tools-panel')) return // 幂等
  injectToolsPanelStyles()

  const root = document.createElement('div')
  root.id = 'tp-tools-panel'
  root.hidden = true

  const tabbar = document.createElement('div')
  tabbar.className = 'tp-tabbar'

  const main = document.createElement('div')
  main.className = 'tp-main'
  const header = document.createElement('div')
  header.className = 'tp-header'
  const title = document.createElement('div')
  title.className = 'tp-title'
  title.textContent = '仙剑 · 工具'
  const closeBtn = document.createElement('button')
  closeBtn.className = 'tp-close'
  closeBtn.textContent = '×'
  closeBtn.setAttribute('aria-label', '关闭')
  header.append(title, closeBtn)
  const body = document.createElement('div')
  body.className = 'tp-body'
  main.append(header, body)

  let active: TabKey = 'scene'
  const tabButtons = new Map<TabKey, HTMLButtonElement>()
  const render = (): void => {
    for (const [k, btn] of tabButtons) btn.classList.toggle('tp-tab-active', k === active)
    body.replaceChildren()
    renderActiveTab(body, active, deps)
  }
  for (const [key, label] of TABS) {
    const b = document.createElement('button')
    b.className = 'tp-tab'
    b.textContent = label
    b.addEventListener('click', () => {
      active = key
      render()
    })
    tabButtons.set(key, b)
    tabbar.appendChild(b)
  }
  root.append(tabbar, main)
  document.body.appendChild(root)

  const launcher = document.createElement('button')
  launcher.id = 'tp-tools-launcher'
  launcher.textContent = '具'
  launcher.title = '工具面板(`)'

  let open = false
  const setOpen = (next: boolean): void => {
    open = next
    root.hidden = !next
    if (next) render()
  }
  launcher.addEventListener('click', () => setOpen(!open))
  closeBtn.addEventListener('click', () => setOpen(false))
  document.body.appendChild(launcher)

  // 反引号 toggle(游戏输入不消费 Backquote);面板内 keydown 不冒泡给游戏 window 监听。
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Backquote') {
      e.preventDefault()
      setOpen(!open)
    }
  })
  root.addEventListener('keydown', (e) => e.stopPropagation())
}
