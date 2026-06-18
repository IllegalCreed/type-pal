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
import { CHECKPOINTS } from './speedrun/checkpoints.js'
import { clearSpeedrunBests, getSpeedrunBests, resetSpeedrun, setSpeedrunBest, setSpeedrunBestFromCurrent } from './speedrun/index.js'
import { loadSettings, saveSetting } from './speedrun/store.js'
import { formatHms, parseHms } from './speedrun/time-format.js'

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
  /** 写存档位(导入用)。 */
  saveSlot: (slot: number, gs: GameState) => Promise<void>
  /** 读存档位(导出用);该位无存档 → null。 */
  loadSlot: (slot: number) => Promise<GameState | null>
  /** 小地图底图:mapNum → 96×96 PNG dataURL(复用 bootstrap renderMapThumbnail 缓存);省略 → 无底图。 */
  getMapThumbnail?: (mapNum: number) => Promise<string | null>
}

type TabKey = 'battle' | 'scene' | 'system' | 'dialog' | 'timer' | 'keys'
const TABS: ReadonlyArray<readonly [TabKey, string]> = [
  ['battle', '战斗'],
  ['scene', '场景'],
  ['system', '系统'],
  ['dialog', '对话'],
  ['timer', '计时器'],
  ['keys', '快捷键'],
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
.tp-stat-line { font-size:13px; line-height:1.85; display:flex; align-items:baseline; }
.tp-stat-line .k { color:var(--tp-text-dim); margin-right:8px; flex:0 0 3.2em; }
.tp-stat-chips { display:flex; flex-wrap:wrap; flex:1 1 0; min-width:0; }
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
  border:1px solid #d8b365; border-radius:7px; font:21px/1 system-ui,"Segoe UI Symbol",sans-serif;
  cursor:pointer; opacity:0.5; transition:opacity .15s, box-shadow .15s; }
.tp-save-row { display:flex; align-items:center; gap:12px; padding:8px 0;
  border-bottom:1px solid rgba(85,51,34,0.35); }
.tp-save-label { color:var(--tp-text); flex:0 0 auto; min-width:60px; font-size:13.5px; }
.tp-save-row .tp-btn { flex:1 1 0; padding:5px 0; font-size:13px; box-shadow:none; letter-spacing:1px; }
.tp-save-row .tp-btn + .tp-btn { margin-left:0; }
#tp-tools-launcher:hover { opacity:1; box-shadow:0 0 12px rgba(160,30,30,0.5); }
.tp-key-row { display:flex; align-items:flex-start; gap:12px; padding:6px 0;
  border-bottom:1px solid rgba(85,51,34,0.3); }
.tp-key-caps { flex:0 0 152px; display:flex; flex-wrap:wrap; align-items:center; gap:4px 3px; }
.tp-key-sep { color:var(--tp-text-dim); font-size:11px; }
.tp-kbd { display:inline-block; font-family:ui-monospace,Menlo,monospace; font-size:12px; line-height:1.1;
  color:var(--tp-cream); background:var(--tp-slot); border:1px solid var(--tp-border);
  border-bottom-width:2px; border-radius:4px; padding:3px 6px; white-space:nowrap; }
.tp-key-desc { flex:1 1 auto; color:var(--tp-text); font-size:13.5px; line-height:1.5; padding-top:2px; }
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

/** 快捷键 tab 行:左侧若干键帽(kbd,「·」分隔)+ 右侧说明。 */
function keyRow(parent: HTMLElement, keys: readonly string[], desc: string): void {
  const r = document.createElement('div')
  r.className = 'tp-key-row'
  const caps = document.createElement('div')
  caps.className = 'tp-key-caps'
  keys.forEach((k, i) => {
    if (i > 0) {
      const sep = document.createElement('span')
      sep.className = 'tp-key-sep'
      sep.textContent = '·'
      caps.appendChild(sep)
    }
    const cap = document.createElement('kbd')
    cap.className = 'tp-kbd'
    cap.textContent = k
    caps.appendChild(cap)
  })
  const d = document.createElement('div')
  d.className = 'tp-key-desc'
  d.textContent = desc
  r.append(caps, d)
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
  // chips 单独成右列(flex-wrap):换行后左缘对齐到 label 列之后,不顶格。
  const chips = document.createElement('span')
  chips.className = 'tp-stat-chips'
  for (const it of items) chip(chips, it.text, it.cls)
  d.appendChild(chips)
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

function statusChips(statuses: { name: string; kind: string; rounds?: number }[]): { text: string; cls: string }[] {
  // buff/debuff 带剩余回合(>999 = 装备/永久效果 → 「永久」);毒无回合 → 只名。
  return statuses.map((s) => ({
    text: s.rounds && s.rounds > 0 ? `${s.name} ${s.rounds > 999 ? '永久' : s.rounds}` : s.name,
    cls: `s-${s.kind}`,
  }))
}

/** 战斗 tab:我方/敌方各独立 panel(HP/MP/抗性/状态/可偷,彩色) + 场地。非战斗 → 提示。 */
function renderBattleTab(parent: HTMLElement, gs: GameState, res: PanelResources): void {
  if (gs.mode !== 'battle' || !gs.battleState) {
    muted(parent, '(当前非战斗)')
    return
  }
  // 战况:回合数(turn 从 0 起,+1 = 玩家直觉「第 N 回合」)+ 灵葫值(全局 wCollectValue:灵葫咒吸收敌人累加、紫金葫芦炼丹消耗)。
  sectionTitle(parent, '战况')
  const ov = document.createElement('div')
  ov.className = 'tp-unit'
  parent.appendChild(ov)
  kvLine(ov, '回合', `第 ${gs.battleState.turn + 1} 回合`, 'color:var(--tp-gold)')
  kvLine(ov, '灵葫值', String(gs.wCollectValue ?? 0), 'color:#b88fd6')
  sectionTitle(parent, '我方')
  const levelUpExp = res.levelUpExp ?? []
  for (const p of collectPartyStatusReadouts(gs, res.playerRoles, res.objectPoisons, res.items, levelUpExp)) {
    // 头:角色名 + 修行(等级)。经验单独成行。
    //   我方体力/真气**不显示**:本面板读持久 PlayerRolesRuntime,战斗中当前血/蓝由战斗工作副本
    //   持有、仅在边界回写,会滞后误导(战斗框才是 live 值)。敌方 HP 读 battleState 故保留。
    const u = unitPanel(parent, p.roleName, `修行 ${p.level}`, 'color:var(--tp-gold)')
    kvLine(u, '经验', p.nextExp > 0 ? `${p.curExp} / ${p.nextExp}` : String(p.curExp), 'color:var(--tp-text)')
    // 6 属性(= 游戏内状态框,含装备加成):修行(头)+ 武术/灵力/防御/身法/吉运。
    chipLine(u, '属性', [
      { text: `武术 ${p.attack}`, cls: '' },
      { text: `灵力 ${p.magicPower}`, cls: '' },
      { text: `防御 ${p.defense}`, cls: '' },
      { text: `身法 ${p.dexterity}`, cls: '' },
      { text: `吉运 ${p.fleeRate}`, cls: '' },
    ])
    // 修为:五属性隐藏经验(累积/升点阈值;+N = 本场战斗已累积、战后结算转经验涨属性)。
    chipLine(
      u,
      '修为',
      p.hiddenExp.map((h) => ({
        text: `${h.label} ${h.next > 0 ? `${h.cur}/${h.next}` : h.cur}${h.gained > 0 ? ` +${h.gained}` : ''}`,
        cls: '',
      })),
    )
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

  // ── 存档(5 个存档位各自导入/导出) ──
  sectionTitle(parent, '存档导入导出')
  muted(parent, '每个存档位可单独导出为文件、或从文件导入(导入后在读档菜单载入)')
  for (let slot = 1; slot <= 5; slot++) {
    const row = document.createElement('div')
    row.className = 'tp-save-row'
    const lbl = document.createElement('span')
    lbl.className = 'tp-save-label'
    lbl.textContent = `存档位 ${slot}`
    row.appendChild(lbl)
    button(row, '导出', () => {
      void (async (): Promise<void> => {
        const g = await deps.loadSlot(slot)
        if (!g) {
          showToast(`存档位 ${slot} 暂无存档`, { type: 'error' })
          return
        }
        const blob = new Blob([serializeSave(g)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `type-pal-save-slot${slot}.json`
        a.click()
        URL.revokeObjectURL(a.href)
        showToast(`已导出存档位 ${slot}`, { type: 'success' })
      })()
    })
    const fileInput = document.createElement('input')
    fileInput.type = 'file'
    fileInput.accept = '.json,application/json'
    fileInput.style.display = 'none'
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = (): void => {
        void (async (): Promise<void> => {
          try {
            await deps.saveSlot(slot, parseImportedSave(String(reader.result)))
            showToast(`已导入到存档位 ${slot}`, { type: 'success' })
          } catch (err) {
            showToast(`导入失败:${err instanceof Error ? err.message : String(err)}`, { type: 'error' })
          }
        })()
      }
      reader.readAsText(file)
      fileInput.value = '' // 允许重复导入同名文件
    })
    button(row, '导入', () => fileInput.click())
    row.appendChild(fileInput)
    parent.appendChild(row)
  }
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

function renderTimerTab(parent: HTMLElement): void {
  const rerender = (): void => {
    parent.replaceChildren()
    buildTimerTab(parent, rerender)
  }
  buildTimerTab(parent, rerender)
}

function buildTimerTab(parent: HTMLElement, rerender: () => void): void {
  const s = loadSettings()
  sectionTitle(parent, '速通计时器')
  toggleRow(parent, '启用计时器', s.enabled, (v) => saveSetting('enabled', v))
  toggleRow(parent, '显示右侧覆盖层', s.show, (v) => saveSetting('show', v))
  toggleRow(parent, '剩骨架香蕉树中场休息', s.banana, (v) => saveSetting('banana', v))

  sectionTitle(parent, '操作')
  const ops = document.createElement('div')
  ops.className = 'tp-save-row'
  button(ops, '重置本局', () => {
    resetSpeedrun()
    showToast('计时器已重置', { type: 'success' })
  })
  button(ops, '本次设为最佳', () => {
    setSpeedrunBestFromCurrent()
    showToast('已设为最佳', { type: 'success' })
    rerender()
  })
  button(ops, '清空最佳', () => {
    clearSpeedrunBests()
    showToast('已清空最佳', { type: 'success' })
    rerender()
  })
  parent.appendChild(ops)

  sectionTitle(parent, '各节点最佳时间')
  const bests = getSpeedrunBests()
  for (const cp of CHECKPOINTS) {
    const row = document.createElement('div')
    row.className = 'tp-ctrl-row'
    const label = document.createElement('span')
    label.className = 'tp-ctrl-label'
    label.style.minWidth = '74px'
    label.textContent = cp.name
    const input = document.createElement('input')
    input.className = 'tp-input'
    input.style.maxWidth = '130px'
    input.placeholder = 'H:MM:SS'
    const b = bests[cp.id]
    input.value = b != null ? formatHms(b) : ''
    input.addEventListener('change', () => {
      const raw = input.value.trim()
      if (raw === '') {
        setSpeedrunBest(cp.id, null)
        return
      }
      const ms = parseHms(raw)
      if (ms == null) {
        showToast('格式应为 H:MM:SS', { type: 'error' })
        return
      }
      setSpeedrunBest(cp.id, ms)
    })
    row.append(label, input)
    parent.appendChild(row)
  }
}

/**
 * 快捷键 tab:静态速查表。按语境分区 —— 通用 / 大世界 / 战斗 / 工具 / 快速存读档。
 * 注:同一字母键在不同语境含义不同(原版即如此,见 scene-system.ts / battle-system.ts):
 *   W = 大世界「装备」/ 战斗「投掷」;F = 大世界「法术」/ 战斗「强行」。
 */
function renderKeysTab(parent: HTMLElement): void {
  sectionTitle(parent, '通用')
  keyRow(parent, ['↑↓←→', '小键盘 8246'], '移动 · 光标 · 选择目标')
  keyRow(parent, ['空格', '回车', 'Ctrl'], '确认')
  keyRow(parent, ['Esc', 'Alt', 'Insert', '小键盘0', 'M'], '取消 · 返回 · 打开菜单')
  keyRow(parent, ['PgUp', 'PgDn'], '列表翻页')
  keyRow(parent, ['Home', 'End'], '跳到首项 · 末项')
  keyRow(parent, ['空格', '回车', 'Esc'], '跳过过场动画')

  sectionTitle(parent, '大世界')
  keyRow(parent, ['空格', '回车'], '调查 · 对话(搜索面前目标)')
  keyRow(parent, ['E'], '物品')
  keyRow(parent, ['W'], '装备')
  keyRow(parent, ['F'], '法术')
  keyRow(parent, ['S'], '状态')

  sectionTitle(parent, '战斗')
  keyRow(parent, ['空格', '回车'], '确认当前选中指令')
  keyRow(parent, ['D'], '防御')
  keyRow(parent, ['A'], '自动战斗')
  keyRow(parent, ['R'], '重复上回合(整队)')
  keyRow(parent, ['F'], '强行攻击(整队)')
  keyRow(parent, ['Q'], '逃跑')
  keyRow(parent, ['E'], '用物品')
  keyRow(parent, ['W'], '投掷物品')
  keyRow(parent, ['S'], '查看状态')
  keyRow(parent, ['Esc'], '返回上一名队员')

  sectionTitle(parent, '工具')
  keyRow(parent, ['`'], '打开 / 关闭工具面板')
  keyRow(parent, ['-', '='], '缩放右下角小地图')

  sectionTitle(parent, '快速存档 / 读档')
  keyRow(parent, ['F5'], '快速存档 → 存档位 1')
  keyRow(parent, ['F9'], '快速读档 ← 存档位 1')
  muted(parent, '仅大世界、无对话与菜单时可快速存档')
}

function renderActiveTab(body: HTMLElement, active: TabKey, deps: ToolsPanelDeps, minimap: MinimapController): void {
  const gs = deps.getGs()
  if (active === 'battle') renderBattleTab(body, gs, deps.getResources())
  else if (active === 'scene') renderSceneTab(body, gs, minimap)
  else if (active === 'system') renderSystemTab(body, deps)
  else if (active === 'dialog') renderDialogTab(body, gs)
  else if (active === 'timer') renderTimerTab(body)
  else renderKeysTab(body)
}

/**
 * 战斗态轻量签名:进/出战斗(mode)、每回合 HP/MP/状态/中毒/敌死亡 变化即变。
 * 驱动战斗 tab 自动重渲染(面板常开时也实时跟上,无需手动开关一次)。
 */
function battleSig(gs: GameState): string {
  if (gs.mode !== 'battle' || !gs.battleState) return gs.mode ?? 'none'
  const rt = gs.PlayerRolesRuntime
  const bs = gs.battleState
  const statusOf = (s: Record<string, number>): string =>
    Object.entries(s)
      .filter(([, v]) => v > 0)
      .map(([k, v]) => `${k}${v}`)
      .join('')
  const party = gs.partyMembers.map((id) => `${rt.rgwHP[id] ?? 0}/${rt.rgwMP[id] ?? 0}`).join(',')
  const enemies = bs.enemies.map((e) => `${e.e.health}:${e.defeated ? 1 : 0}:${(e.poisons ?? []).length}`).join(',')
  const pStatus = bs.players.map((p) => statusOf(p.status as unknown as Record<string, number>)).join('|')
  const eStatus = bs.enemies.map((e) => statusOf(e.status as unknown as Record<string, number>)).join('|')
  const poison = Object.values(gs.rgPoisonStatus ?? {}).filter((p) => p && p.wPoisonID > 0).length
  // 隐藏经验本场累积(5 属性池 wCount 和)+ 回合 + 灵葫值:战斗中变化即触发战斗 tab 重渲染。
  const hidden = gs.partyMembers
    .map(
      (id) =>
        (gs.Exp.rgAttackExp?.[id]?.wCount ?? 0) +
        (gs.Exp.rgMagicPowerExp?.[id]?.wCount ?? 0) +
        (gs.Exp.rgDefenseExp?.[id]?.wCount ?? 0) +
        (gs.Exp.rgDexterityExp?.[id]?.wCount ?? 0) +
        (gs.Exp.rgFleeExp?.[id]?.wCount ?? 0),
    )
    .join(',')
  return `b|t${bs.turn}|cv${gs.wCollectValue ?? 0}|${party}|${enemies}|${pStatus}|${eStatus}|p${poison}|h${hidden}`
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
  launcher.textContent = '⚙'
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

  // 战斗 tab 自动刷新:面板常开 + 在战斗 tab 时,战斗态签名变化(进/出战斗、每回合 HP/状态)即重渲染。
  //   场景 tab 有自己的 rAF live 刷新(小地图),系统/对话 静态——故只对战斗 tab 轮询。
  let lastBattleSig = ''
  if (typeof setInterval === 'function') {
    setInterval(() => {
      if (!open || active !== 'battle') return
      const sig = battleSig(deps.getGs())
      if (sig !== lastBattleSig) {
        lastBattleSig = sig
        render()
      }
    }, 250)
  }
}
