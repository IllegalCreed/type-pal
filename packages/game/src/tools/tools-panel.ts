// 生产增强工具面板(canvas 外 DOM,非 DEV 门;只读 + 玩家便利动作)。左上角悬浮、非模态、左竖 Tab。
//   视觉复用 load 界面「仙剑 金/朱 暗底」配色(见 injectToolsPanelStyles)。tab 内容见 renderActiveTab。
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
import { getCurrentMapNum } from '../core/scene-system.js'
import { getMapName } from './map-names.js'
import { DOT_COLORS, type MinimapController, setupMinimap } from './minimap.js'
import { showToast } from './toast.js'

export interface PanelResources {
  playerRoles: PlayerRoles
  objectPoisons: readonly ObjectPoisonView[]
  items: readonly Item[]
  /** DATA.MKF chunk 14 LevelUpExp[100]:我方经验「升至下一级所需」显示用。 */
  levelUpExp?: readonly number[]
}

export interface ToolsPanelDeps {
  getGs: () => GameState
  /** 战斗 tab 只读用(playerRoles/objectPoisons/items);资源加载后不变。 */
  getResources: () => PanelResources
  displayScale: DisplayScaleController
  /** BGM(音乐:MIDI + OGG)音量。 */
  audioVolume: AudioVolumeController
  /** 音效(SFX:sounds/*.wav)音量,独立于 BGM。 */
  sfxVolume: AudioVolumeController
  /** 存档导出 = 当前 gs;导入 = 解析后写 slot 1。 */
  saveSlot: (slot: number, gs: GameState) => Promise<void>
  /** 小地图底图:mapNum → 96×96 PNG dataURL(复用 bootstrap renderMapThumbnail 缓存);省略 → 无底图。 */
  getMapThumbnail?: (mapNum: number) => Promise<string | null>
}

type TabKey = 'battle' | 'scene' | 'system' | 'dialog'
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['battle', '战斗'],
  ['scene', '场景'],
  ['system', '系统'],
  ['dialog', '对话'],
]

// 缩放滑块对数刻度:正中(pos=0.5)=100%,两端 10% / 1000%。
const pctToPos = (p: number): number => (Math.log10(p) - 1) / 2
const posToPct = (pos: number): number => Math.round(10 * 10 ** (2 * pos))

const STYLE_ID = 'tp-tools-style'

/** 注入面板样式(幂等)。 */
export function injectToolsPanelStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#tp-tools-panel {
  --tp-gold:#d8b365; --tp-cream:#f0e0b0; --tp-crimson:#8a2a2a; --tp-crimson-dark:#5a1414;
  --tp-slot:#2a1515; --tp-border:#553322; --tp-text:#cbb890; --tp-text-dim:#6b5a3e;
  --tp-error:#e06c5a; --tp-glow:rgba(160,30,30,0.5);
  position:fixed; top:16px; left:16px; width:430px; max-height:84vh; z-index:30;
  display:flex; background:rgba(17,17,17,0.93); backdrop-filter:blur(7px);
  border:1px solid var(--tp-gold); border-radius:8px;
  box-shadow:0 0 22px var(--tp-glow), 0 6px 26px rgba(0,0,0,0.62);
  font:14px/1.6 "Songti SC","SimSun",serif; color:var(--tp-text);
  overflow:hidden; animation:tp-panel-in .18s ease; }
@keyframes tp-panel-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
#tp-tools-panel[hidden] { display:none; }
.tp-tabbar { flex:0 0 88px; display:flex; flex-direction:column; padding:14px 0;
  background:rgba(0,0,0,0.25); border-right:1px solid var(--tp-border); }
.tp-tab { font:16px/1 "Songti SC","SimSun",serif; color:var(--tp-text-dim);
  background:transparent; border:none; border-left:3px solid transparent;
  padding:12px 0 12px 20px; text-align:left; cursor:pointer; letter-spacing:3px;
  transition:color .12s, background .12s; }
.tp-tab:hover { color:var(--tp-text); background:rgba(216,179,101,0.07); }
.tp-tab.tp-tab-active { color:#1a140c; font-weight:bold; border-left-color:var(--tp-crimson);
  background:linear-gradient(90deg, var(--tp-gold), #c9a456); }
.tp-main { flex:1 1 auto; display:flex; flex-direction:column; min-width:0; }
.tp-header { display:flex; align-items:center; justify-content:space-between;
  padding:13px 18px 12px; border-bottom:1px solid var(--tp-border); }
.tp-title { color:var(--tp-gold); font-size:17px; letter-spacing:5px;
  text-shadow:0 0 10px rgba(160,30,30,0.45); }
.tp-close { background:transparent; border:none; color:var(--tp-text-dim);
  font-size:20px; line-height:1; cursor:pointer; padding:0 4px; transition:color .12s; }
.tp-close:hover { color:var(--tp-cream); }
.tp-body { flex:1 1 auto; overflow-y:auto; padding:6px 18px 18px; }
.tp-body::-webkit-scrollbar { width:8px; }
.tp-body::-webkit-scrollbar-track { background:var(--tp-slot); }
.tp-body::-webkit-scrollbar-thumb {
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-gold)); border-radius:4px; }
.tp-row { display:flex; align-items:baseline; gap:10px; padding:4px 0; }
.tp-row-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:84px; }
.tp-row-value { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px; }
.tp-section-title { color:var(--tp-cream); font-size:15px; letter-spacing:2px;
  margin:20px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--tp-border); }
.tp-section-title:first-child { margin-top:4px; }
.tp-ctrl-row { display:flex; align-items:center; gap:13px; margin-bottom:4px; }
.tp-ctrl-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:40px; }
.tp-ctrl-val { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px;
  flex:0 0 auto; min-width:54px; text-align:right; }
.tp-btn { font:14px/1 "Songti SC","SimSun",serif; color:var(--tp-cream);
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-crimson-dark));
  border:1px solid var(--tp-gold); border-radius:5px; padding:8px 20px; cursor:pointer;
  letter-spacing:2px; box-shadow:0 0 7px var(--tp-glow); transition:transform .1s, filter .1s; }
.tp-btn:hover { transform:translateY(-1px); filter:brightness(1.12); }
.tp-btn:active { transform:translateY(0); }
.tp-btn + .tp-btn { margin-left:10px; }
.tp-range { accent-color:var(--tp-gold); flex:1 1 auto; min-width:0; height:5px; cursor:pointer; }
.tp-input { background:var(--tp-slot); color:var(--tp-cream); border:1px solid var(--tp-border);
  border-radius:5px; padding:7px 11px; font:14px/1.4 "Songti SC","SimSun",serif; width:100%;
  box-sizing:border-box; }
.tp-input:focus { outline:none; border-color:var(--tp-gold); }
.tp-input::placeholder { color:var(--tp-text-dim); }
.tp-muted { color:var(--tp-text-dim); }
.tp-dialog-line { padding:6px 0; border-bottom:1px solid var(--tp-border); line-height:1.55; }
.tp-unit { border:1px solid var(--tp-border); border-radius:6px; padding:9px 12px 7px;
  margin-bottom:11px; background:rgba(0,0,0,0.18); }
.tp-unit-head { display:flex; justify-content:space-between; align-items:baseline;
  margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid rgba(85,51,34,0.55); }
.tp-unit-name { color:var(--tp-cream); font-size:15px; letter-spacing:1px; }
.tp-unit-hp { font-family:ui-monospace,Menlo,monospace; font-size:13px; }
.tp-stat-line { font-size:13px; line-height:1.85; }
.tp-stat-line .k { color:var(--tp-text-dim); margin-right:6px; }
.tp-chip { display:inline-block; margin:0 8px 1px 0; font-family:ui-monospace,Menlo,monospace; font-size:12.5px; }
.e-wind{color:#6fcf97} .e-thunder{color:#bb8fce} .e-water{color:#5dade2} .e-fire{color:#ec7063}
.e-earth{color:#d4ac6e} .e-phys{color:#9aa6a8} .e-poison{color:#a3d977} .e-sorcery{color:#e3a3d6}
.s-debuff{color:#e06c5a} .s-buff{color:#7fc88a} .s-poison{color:#b88fd6} .s-steal{color:#f0c674}
.tp-mm-wrap { display:flex; justify-content:center; margin:4px 0 9px; }
.tp-minimap-canvas { border:1px solid var(--tp-border); border-radius:5px; background:#0d0b08; max-width:100%; }
.tp-mm-legend { display:flex; gap:18px; justify-content:center; margin-bottom:12px;
  font-size:12.5px; color:var(--tp-text-dim); }
.tp-mm-leg { display:inline-flex; align-items:center; gap:5px; }
.tp-mm-leg i { width:9px; height:9px; border-radius:50%; display:inline-block; box-shadow:0 0 2px rgba(0,0,0,0.6); }
.tp-toggle { display:flex; align-items:center; justify-content:space-between; gap:12px;
  padding:8px 2px; cursor:pointer; border-bottom:1px solid rgba(85,51,34,0.4); }
.tp-toggle span { color:var(--tp-text); }
.tp-toggle input { accent-color:var(--tp-gold); width:16px; height:16px; cursor:pointer; flex:0 0 auto; }
#tp-minimap-widget { position:fixed; bottom:12px; right:12px; z-index:28; pointer-events:none; }
#tp-minimap-widget canvas { display:block; border-radius:6px; padding:5px;
  background:rgba(17,17,17,0.82); border:1px solid #d8b365;
  box-shadow:0 0 14px rgba(160,30,30,0.4),0 2px 10px rgba(0,0,0,0.5); }
.tp-mm-zoom { position:absolute; top:9px; right:9px; display:flex; flex-direction:column; gap:5px; pointer-events:auto; }
.tp-mm-zoom button { width:19px; height:19px; padding:0; line-height:1;
  background:rgba(17,17,17,0.7); color:#d8b365; border:1px solid #d8b365; border-radius:4px;
  font:13px/1 ui-monospace,monospace; cursor:pointer; opacity:0.7; transition:opacity .12s, background .12s; }
.tp-mm-zoom button:hover { opacity:1; background:rgba(160,30,30,0.55); }
#tp-tools-launcher { position:fixed; bottom:12px; left:12px; z-index:29;
  width:38px; height:38px; background:rgba(17,17,17,0.85); color:#d8b365;
  border:1px solid #d8b365; border-radius:7px; font:19px/1 "Songti SC","SimSun",serif;
  cursor:pointer; opacity:0.5; transition:opacity .15s, box-shadow .15s; }
#tp-tools-launcher:hover { opacity:1; box-shadow:0 0 12px rgba(160,30,30,0.5); }
`
  document.head.appendChild(style)
}

// ── tab 内容渲染辅助 ──
/** 可更新的「键 值」行:返回设值函数(场景信息 live 刷新用,值不变则不写 DOM)。 */
function liveRow(parent: HTMLElement, label: string): (value: string) => void {
  const d = document.createElement('div')
  d.className = 'tp-row'
  const l = document.createElement('span')
  l.className = 'tp-row-label'
  l.textContent = label
  const v = document.createElement('span')
  v.className = 'tp-row-value'
  d.append(l, v)
  parent.appendChild(d)
  return (value) => {
    if (v.textContent !== value) v.textContent = value
  }
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

/** 单位内「键 值」行(复用 .tp-stat-line):键(dim) + 等宽值(可上色)。 */
function kvLine(parent: HTMLElement, label: string, value: string, valueCss = ''): void {
  const d = document.createElement('div')
  d.className = 'tp-stat-line'
  const k = document.createElement('span')
  k.className = 'k'
  k.textContent = label
  const v = document.createElement('span')
  v.textContent = value
  v.style.cssText = `font-family:ui-monospace,Menlo,monospace;font-size:13px;${valueCss}`
  d.append(k, v)
  parent.appendChild(d)
}

/** 滑块行:label(左) + 滑块(flex) + 值(右)。返回滑块 + 值标签同步钩子由 caller 接。 */
function sliderRow(
  parent: HTMLElement,
  label: string,
  opts: { min: number; max: number; step?: number; value: number },
): { slider: HTMLInputElement; val: HTMLSpanElement } {
  const r = document.createElement('div')
  r.className = 'tp-ctrl-row'
  const l = document.createElement('span')
  l.className = 'tp-ctrl-label'
  l.textContent = label
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'tp-range'
  slider.min = String(opts.min)
  slider.max = String(opts.max)
  if (opts.step !== undefined) slider.step = String(opts.step)
  slider.value = String(opts.value)
  const val = document.createElement('span')
  val.className = 'tp-ctrl-val'
  r.append(l, slider, val)
  parent.appendChild(r)
  return { slider, val }
}

function button(parent: HTMLElement, text: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button')
  b.className = 'tp-btn'
  b.textContent = text
  b.addEventListener('click', onClick)
  parent.appendChild(b)
  return b
}

/** 开关行:文字(左) + 复选框(右)。 */
function toggleRow(parent: HTMLElement, label: string, checked: boolean, onChange: (v: boolean) => void): void {
  const r = document.createElement('label')
  r.className = 'tp-toggle'
  const span = document.createElement('span')
  span.textContent = label
  const cb = document.createElement('input')
  cb.type = 'checkbox'
  cb.checked = checked
  cb.addEventListener('change', () => onChange(cb.checked))
  r.append(span, cb)
  parent.appendChild(r)
}

/** 小地图图例:主角/NPC/宝物 三色点。 */
function minimapLegend(parent: HTMLElement): void {
  const wrap = document.createElement('div')
  wrap.className = 'tp-mm-legend'
  const items: [string, string][] = [
    ['主角', DOT_COLORS.player.fill],
    ['NPC', DOT_COLORS.npc.fill],
    ['宝物', DOT_COLORS.item.fill],
  ]
  for (const [name, color] of items) {
    const it = document.createElement('span')
    it.className = 'tp-mm-leg'
    const sw = document.createElement('i')
    sw.style.cssText = `background:${color}`
    it.append(sw, document.createTextNode(name))
    wrap.appendChild(it)
  }
  parent.appendChild(wrap)
}

// ── 战斗 tab 辅助:unit panel + 彩色 chip ──
const ELEM_CLASS: Record<string, string> = {
  风: 'e-wind', 雷: 'e-thunder', 水: 'e-water', 火: 'e-fire', 土: 'e-earth',
  物理: 'e-phys', 毒: 'e-poison', 巫抗: 'e-sorcery',
}

function chip(parent: HTMLElement, text: string, cls: string): void {
  const s = document.createElement('span')
  s.className = cls ? `tp-chip ${cls}` : 'tp-chip'
  s.textContent = text
  parent.appendChild(s)
}

function chipLine(parent: HTMLElement, label: string, items: { text: string; cls: string }[]): void {
  if (!items.length) return
  const d = document.createElement('div')
  d.className = 'tp-stat-line'
  const k = document.createElement('span')
  k.className = 'k'
  k.textContent = label
  d.appendChild(k)
  for (const it of items) chip(d, it.text, it.cls)
  parent.appendChild(d)
}

function unitPanel(parent: HTMLElement, name: string, right: string, rightCss: string): HTMLElement {
  const u = document.createElement('div')
  u.className = 'tp-unit'
  const head = document.createElement('div')
  head.className = 'tp-unit-head'
  const nm = document.createElement('span')
  nm.className = 'tp-unit-name'
  nm.textContent = name
  const r = document.createElement('span')
  r.className = 'tp-unit-hp'
  r.textContent = right
  if (rightCss) r.style.cssText = rightCss
  head.append(nm, r)
  u.appendChild(head)
  parent.appendChild(u)
  return u
}

/** HP 比例 → 颜色(绿>50% 黄>20% 红)。 */
function hpCss(hp: number, maxHp: number): string {
  const ratio = maxHp > 0 ? hp / maxHp : 0
  return `color:${ratio > 0.5 ? '#7fc88a' : ratio > 0.2 ? '#e8c060' : '#e06c5a'}`
}

function resistChips(resistances: { label: string; value: number }[]): { text: string; cls: string }[] {
  return resistances.map((r) => ({
    text: `${r.label}${r.value > 0 ? '+' : ''}${r.value}`,
    cls: ELEM_CLASS[r.label] ?? '',
  }))
}

function statusChips(statuses: { name: string; kind: string }[]): { text: string; cls: string }[] {
  return statuses.map((s) => ({ text: s.name, cls: `s-${s.kind}` }))
}

/** 战斗 tab:我方/敌方各独立 panel(HP/MP/抗性/状态/可偷,彩色) + 场地。非战斗 → 提示。 */
function renderBattleTab(parent: HTMLElement, gs: GameState, res: PanelResources): void {
  if (gs.mode !== 'battle' || !gs.battleState) {
    muted(parent, '(当前非战斗)')
    return
  }
  sectionTitle(parent, '我方')
  const levelUpExp = res.levelUpExp ?? []
  for (const p of collectPartyStatusReadouts(gs, res.playerRoles, res.objectPoisons, res.items, levelUpExp)) {
    // 头:角色名 + 修行(等级)。体力/真气/经验 各自成行(避免 HP+MP 同行换行)。
    const u = unitPanel(parent, p.roleName, `修行 ${p.level}`, 'color:var(--tp-gold)')
    kvLine(u, '体力', `${p.hp} / ${p.maxHp}`, hpCss(p.hp, p.maxHp))
    kvLine(u, '真气', `${p.mp} / ${p.maxMp}`, 'color:#5dade2')
    kvLine(u, '经验', p.nextExp > 0 ? `${p.curExp} / ${p.nextExp}` : String(p.curExp), 'color:var(--tp-text)')
    // 6 属性(= 游戏内状态框,含装备加成):修行(头)+ 武术/灵力/防御/身法/吉运。
    chipLine(u, '属性', [
      { text: `武术 ${p.attack}`, cls: '' },
      { text: `灵力 ${p.magicPower}`, cls: '' },
      { text: `防御 ${p.defense}`, cls: '' },
      { text: `身法 ${p.dexterity}`, cls: '' },
      { text: `吉运 ${p.fleeRate}`, cls: '' },
    ])
    chipLine(u, '抗性', resistChips(p.resistances))
    chipLine(u, '状态', statusChips(p.statuses)) // 含中毒(紫 s-poison chip)
  }
  sectionTitle(parent, '敌方')
  for (const e of collectEnemyStatusReadouts(gs, res.objectPoisons, res.items)) {
    const u = unitPanel(
      parent,
      e.name,
      e.defeated ? '已倒' : `HP ${e.hp}/${e.maxHp}`,
      e.defeated ? 'color:var(--tp-text-dim)' : hpCss(e.hp, e.maxHp),
    )
    // 属性:全战斗属性(隐藏 法术id 调试项);经验/金钱单独成「战利」行。
    const combat = e.stats.filter((s) => !['法术id', '经验', '金钱'].includes(s.label))
    chipLine(u, '属性', combat.map((s) => ({ text: `${s.label}${s.value}`, cls: '' })))
    const drops = e.stats.filter((s) => s.label === '经验' || s.label === '金钱')
    chipLine(u, '战利', drops.map((s) => ({ text: `${s.label}${s.value}`, cls: '' })))
    chipLine(u, '抗性', resistChips(e.resistances))
    chipLine(u, '状态', statusChips(e.statuses)) // 含中毒
    chipLine(u, '偷取', [{ text: e.steal, cls: 's-steal' }]) // 始终显示(可偷物/金钱 或「不可偷」)
  }
  const field = collectFieldInfoReadout(gs)
  if (field) {
    sectionTitle(parent, '场地')
    const u = unitPanel(
      parent,
      `场地 #${field.fieldId}`,
      field.isBoss ? 'BOSS' : '',
      field.isBoss ? 'color:var(--tp-crimson);font-weight:bold' : '',
    )
    chipLine(
      u,
      '场效',
      field.elements.map((s) => ({ text: `${s.label}${s.value > 0 ? '+' : ''}${s.value}`, cls: ELEM_CLASS[s.label] ?? '' })),
    )
  }
}

/** 场景 tab:小地图(底图 + 主角/NPC/宝物点 + 可视框)+ 两开关 + 文本信息(随小地图 tick live 刷新)。 */
function renderSceneTab(parent: HTMLElement, gs: GameState, minimap: MinimapController): void {
  sectionTitle(parent, '场景小地图')
  const mm = document.createElement('div')
  mm.className = 'tp-mm-wrap'
  parent.appendChild(mm)
  minimapLegend(parent)
  toggleRow(parent, '右下角常驻显示', minimap.isWidgetEnabled(), (v) => minimap.setWidgetEnabled(v))
  toggleRow(parent, '显示 NPC 定位点', minimap.isShowNpc(), (v) => minimap.setShowNpc(v))
  toggleRow(parent, '显示宝物定位点', minimap.isShowItems(), (v) => minimap.setShowItems(v))

  sectionTitle(parent, '场景信息')
  const vMap = liveRow(parent, '地图')
  const vScene = liveRow(parent, '场景号')
  const vPos = liveRow(parent, '主角坐标')
  const vFacing = liveRow(parent, '朝向')
  const vCam = liveRow(parent, '镜头')
  const vParty = liveRow(parent, '队伍')
  const refresh = (): void => {
    const mapNum = getCurrentMapNum()
    vMap(`${getMapName(mapNum)}  (map ${mapNum})`)
    vScene(`#${gs.wNumScene}`)
    vPos(`x=${gs.party.x}  y=${gs.party.y}`)
    vFacing(String(gs.party.facing))
    vCam(`x=${gs.camera.x}  y=${gs.camera.y}`)
    vParty(gs.partyMembers.join(', '))
  }
  // 小地图主视图(随面板存活自更新);onTick = refresh → 场景信息文本随主角移动/换场景 live 刷新。
  minimap.mountSceneView(mm, 280, refresh)
}

/** 系统 tab:显示(缩放滑块 10%~1000% 正中100% + 全屏) / 音频(BGM 滑块 + 静音) / 存档(导出/导入)。 */
function renderSystemTab(parent: HTMLElement, deps: ToolsPanelDeps): void {
  // ── 显示 ──
  sectionTitle(parent, '显示')
  const ds = deps.displayScale
  const { slider: scaleSlider, val: scaleVal } = sliderRow(parent, '缩放', {
    min: 0,
    max: 1,
    step: 0.001,
    value: pctToPos(ds.getPercent()),
  })
  const syncScale = (): void => {
    scaleVal.textContent = `${posToPct(Number(scaleSlider.value))}%`
  }
  syncScale()
  scaleSlider.addEventListener('input', () => {
    ds.setPercent(posToPct(Number(scaleSlider.value)))
    syncScale()
  })
  const fsBtn = button(parent, '全屏', () => ds.toggleFullscreen())
  fsBtn.style.marginTop = '6px'

  // ── 音频(音乐 BGM / 音效 SFX 各自独立) ──
  sectionTitle(parent, '音频')
  const addVolRow = (label: string, ctrl: AudioVolumeController): void => {
    const { slider, val } = sliderRow(parent, label, { min: 0, max: 100, value: Math.round(ctrl.getVolume() * 100) })
    const sync = (): void => {
      val.textContent = `${slider.value}%`
    }
    sync()
    slider.addEventListener('input', () => {
      ctrl.setVolume(Number(slider.value) / 100)
      sync()
    })
  }
  addVolRow('音乐', deps.audioVolume)
  addVolRow('音效', deps.sfxVolume)
  const vol = deps.audioVolume
  const muteBtn = button(parent, vol.isMuted() ? '🔇 音乐已静音' : '🔊 音乐静音', () => {
    vol.setMuted(!vol.isMuted())
    muteBtn.textContent = vol.isMuted() ? '🔇 音乐已静音' : '🔊 音乐静音'
  })
  muteBtn.style.marginTop = '6px'

  // ── 存档 ──
  sectionTitle(parent, '存档')
  const saveRow = document.createElement('div')
  button(saveRow, '导出当前进度', () => {
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
  button(saveRow, '导入到存档位 1', () => importInput.click())
  saveRow.appendChild(importInput)
  parent.appendChild(saveRow)
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
  list.style.marginTop = '8px'
  parent.appendChild(list)
  const renderList = (q: string): void => {
    list.replaceChildren()
    const kw = q.trim()
    let lastMap: number | undefined
    for (const entry of history) {
      if (kw && !entry.text.includes(kw)) continue
      if (entry.map !== lastMap) {
        const g = document.createElement('div')
        g.className = 'tp-section-title tp-dialog-group'
        g.textContent = getMapName(entry.map)
        list.appendChild(g)
        lastMap = entry.map
      }
      const line = document.createElement('div')
      line.className = 'tp-dialog-line'
      line.textContent = entry.text
      list.appendChild(line)
    }
    if (!list.childElementCount) muted(list, '(无匹配)')
  }
  renderList('')
  search.addEventListener('input', () => renderList(search.value))
}

function renderActiveTab(body: HTMLElement, active: TabKey, deps: ToolsPanelDeps, minimap: MinimapController): void {
  const gs = deps.getGs()
  if (active === 'battle') renderBattleTab(body, gs, deps.getResources())
  else if (active === 'scene') renderSceneTab(body, gs, minimap)
  else if (active === 'system') renderSystemTab(body, deps)
  else renderDialogTab(body, gs)
}

export function setupToolsPanel(deps: ToolsPanelDeps): void {
  if (typeof document === 'undefined') return
  if (document.getElementById('tp-tools-panel')) return // 幂等
  injectToolsPanelStyles()

  const minimap = setupMinimap({
    getGs: deps.getGs,
    getMapThumbnail: deps.getMapThumbnail ?? (async () => null),
  })

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
    renderActiveTab(body, active, deps, minimap)
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
