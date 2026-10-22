// 生产增强工具面板(canvas 外 DOM,非 DEV 门;只读 + 玩家便利动作)。左上角悬浮、非模态、左竖 Tab。
//   视觉复用 load 界面「仙剑 金/朱 暗底」配色(见 injectToolsPanelStyles)。tab 内容见 renderActiveTab。
import type { EnemyObject, Item, ObjectPoisonView, PlayerRoles } from '@type-pal/shared'
import type { GameState } from '../core/game-state.js'
import {
  collectEnemyStatusReadouts,
  collectFieldInfoReadout,
  collectPartyStatusReadouts,
} from '../core/inspect/battle-inspect.js'
import type { SaveSnapshot } from '../core/save/data.js'
import { getCurrentMapNum } from '../core/scene-system.js'
import { getWord } from '../core/word-lookup.js'
import { getLanguage, localize, setLanguage, subscribeLanguage } from '../localization/language.js'
import { uiText } from '../localization/ui-text.js'
import type { AudioVolumeController } from '../shell/audio-volume.js'
import type { MusicSourceController } from '../shell/music-source.js'
import { isMobileLayout, LAYOUT_CHANGE } from '../shell/presentation.js'
import { areTouchControlsVisible, setTouchControlsVisible } from '../shell/touch-preference.js'
import type { DisplayScaleController } from './display-scale.js'
import { isFpsEnabled, setFpsEnabled } from './fps-overlay.js'
import { getMapName } from './map-names.js'
import { DOT_COLORS, type MinimapController, setupMinimap } from './minimap.js'
import { parseImportedSave, serializeSave } from './save-io.js'
import { CHECKPOINTS, checkpointName } from './speedrun/checkpoints.js'
import {
  clearSpeedrunBests,
  getSpeedrunBests,
  getSpeedrunRun,
  resetSpeedrun,
  setSpeedrunBest,
  setSpeedrunBestFromCurrent,
  setSpeedrunStep,
} from './speedrun/index.js'
import { loadSettings, saveSetting } from './speedrun/store.js'
import { formatHms, parseHms } from './speedrun/time-format.js'
import { showToast } from './toast.js'

export interface PanelResources {
  playerRoles: PlayerRoles
  enemyObjects?: readonly EnemyObject[]
  objectPoisons: readonly ObjectPoisonView[]
  items: readonly Item[]
  /** DATA.MKF chunk 14 LevelUpExp[100]:我方经验「升至下一级所需」显示用。 */
  levelUpExp?: readonly number[]
}

export interface ToolsPanelDeps {
  /** English is selectable only after its display pack has loaded successfully. */
  languageAvailable?: boolean
  onOpenChange?: (open: boolean) => void
  openPrivacySettings?: () => void
  getGs: () => GameState
  /** 战斗 tab 只读用(playerRoles/objectPoisons/items);资源加载后不变。 */
  getResources: () => PanelResources
  displayScale: DisplayScaleController
  /** BGM(音乐:MIDI + OGG)音量。 */
  audioVolume: AudioVolumeController
  musicSource: MusicSourceController
  /** 音效(SFX:sounds/*.wav)音量,独立于 BGM。 */
  sfxVolume: AudioVolumeController
  /** 视频(过场 mp4)音量,独立通道。三路共用同一静音键 → 主静音一键全覆盖。 */
  videoVolume: AudioVolumeController
  /** 写存档位(导入用)。 */
  saveSlot: (slot: number, gs: SaveSnapshot) => Promise<void>
  /** 读存档位(导出用);该位无存档 → null。 */
  loadSlot: (slot: number) => Promise<SaveSnapshot | null>
  /** 小地图底图:标准地图640×640 PNG dataURL,经bootstrap renderSceneThumbnail缓存;省略则无底图。 */
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
  --tp-slot:#2a1515; --tp-border:#553322; --tp-text:#cbb890; --tp-text-dim:#a38f70;
  --tp-error:#e06c5a; --tp-glow:rgba(160,30,30,0.5);
  --tp-control-height:32px; --tp-control-font-size:14px; --tp-control-radius:5px;
  --tp-control-gap:8px; --tp-control-padding:10px;
  position:fixed; top:16px; left:16px; width:min(430px,calc(100vw - 32px)); max-height:84vh; z-index:30;
  display:flex; background:rgba(17,17,17,0.93); backdrop-filter:blur(7px);
  border:1px solid var(--tp-gold); border-radius:8px;
  box-shadow:0 0 22px var(--tp-glow), 0 6px 26px rgba(0,0,0,0.62);
  font:14px/1.6 "Songti SC","SimSun",serif; color:var(--tp-text);
  overflow:hidden; animation:tp-panel-in .18s ease; }
html[lang="en"] #tp-tools-panel { width:min(550px,calc(100vw - 32px)); }
html[lang="en"] #tp-tools-panel .tp-title,
html[lang="en"] #tp-tools-panel .tp-tab,
html[lang="en"] #tp-tools-panel .tp-section-title { letter-spacing:normal; }
html[lang="en"] #tp-tools-panel .tp-tabbar { flex-basis:96px; }
html[lang="en"] #tp-tools-panel .tp-tab { padding-left:12px; }
html[lang="en"] #tp-tools-panel .tp-stat-line .k { flex-basis:6em; }
html[lang="en"] #tp-tools-panel .tp-time-row { flex-wrap:wrap; }
html[lang="en"] #tp-tools-panel .tp-time-row .tp-ctrl-label { min-width:110px; }
@keyframes tp-panel-in { from{opacity:0;transform:scale(.97)} to{opacity:1;transform:scale(1)} }
#tp-tools-panel[hidden], #tp-tools-panel [hidden] { display:none; }
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
.tp-title-wrap { display:flex; align-items:baseline; flex-wrap:wrap; min-width:0; gap:4px 12px; }
.tp-gh-link { color:var(--tp-text-dim); font-size:12px; text-decoration:none;
  border-bottom:1px dotted var(--tp-text-dim); transition:color .12s, border-color .12s; }
.tp-gh-link:hover { color:var(--tp-gold); border-bottom-color:var(--tp-gold); }
.tp-close { background:transparent; border:none; color:var(--tp-text-dim);
  display:inline-flex; align-items:center; justify-content:center;
  width:var(--tp-control-height); height:var(--tp-control-height); flex:0 0 var(--tp-control-height);
  font-size:20px; line-height:1; cursor:pointer; padding:0; transition:color .12s; }
.tp-close:hover { color:var(--tp-cream); }
/* Pointer clicks use themed states; keyboard navigation keeps a shared visible focus ring. */
.tp-tab:focus, .tp-btn:focus, .tp-close:focus { outline:none; }
.tp-body { flex:1 1 auto; overflow-y:auto; overscroll-behavior:contain; padding:6px 18px 18px; }
.tp-body::-webkit-scrollbar { width:8px; }
.tp-body::-webkit-scrollbar-track { background:var(--tp-slot); }
.tp-body::-webkit-scrollbar-thumb {
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-gold)); border-radius:4px; }
.tp-row { display:flex; align-items:baseline; gap:10px; padding:4px 0; }
.tp-row-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:84px; }
.tp-row-value { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px;
  min-width:0; overflow-wrap:anywhere; }
.tp-section-title { color:var(--tp-cream); font-size:15px; letter-spacing:2px;
  margin:20px 0 12px; padding-bottom:6px; border-bottom:1px solid var(--tp-border); }
.tp-section-title:first-child { margin-top:4px; }
.tp-ctrl-row { display:flex; align-items:center; gap:var(--tp-control-gap);
  min-height:var(--tp-control-height); margin-bottom:var(--tp-control-gap); }
.tp-ctrl-label { color:var(--tp-text-dim); flex:0 0 auto; min-width:40px; }
.tp-ctrl-val { color:var(--tp-gold); font-family:ui-monospace,Menlo,monospace; font-size:13px;
  flex:0 0 auto; min-width:54px; text-align:right; }
.tp-btn, .tp-input { box-sizing:border-box; height:var(--tp-control-height);
  border-radius:var(--tp-control-radius);
  font:var(--tp-control-font-size)/20px "Songti SC","SimSun",serif; }
.tp-btn { display:inline-flex; align-items:center; justify-content:center; gap:6px;
  padding:0 var(--tp-control-padding); white-space:nowrap; color:var(--tp-cream);
  background:linear-gradient(180deg, var(--tp-crimson), var(--tp-crimson-dark));
  border:1px solid var(--tp-gold); cursor:pointer; letter-spacing:1px;
  box-shadow:0 0 7px var(--tp-glow); transition:transform .1s, filter .1s; }
.tp-btn:not(:disabled):hover { transform:translateY(-1px); filter:brightness(1.12); }
.tp-btn:not(:disabled):active { transform:translateY(0); }
.tp-btn:disabled, .tp-input:disabled { opacity:.5; cursor:not-allowed; }
.tp-body > .tp-btn { margin-top:var(--tp-control-gap); }
.tp-range { accent-color:var(--tp-gold); flex:1 1 auto; min-width:0;
  height:var(--tp-control-height); margin:0; cursor:pointer; }
.tp-input { background:var(--tp-slot); color:var(--tp-cream); border:1px solid var(--tp-border);
  padding:0 var(--tp-control-padding); width:100%; min-width:0; color-scheme:dark; }
.tp-input:hover { border-color:var(--tp-gold); }
.tp-input:focus { outline:none; border-color:var(--tp-gold); }
.tp-input::placeholder { color:var(--tp-text-dim); }
select.tp-input { appearance:none; flex:1 1 auto; padding-right:34px; cursor:pointer;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='m1 1 4 4 4-4' fill='none' stroke='%23d8b365' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");
  background-repeat:no-repeat; background-position:right 12px center; }
.tp-input:focus-visible, .tp-btn:focus-visible, .tp-tab:focus-visible,
.tp-close:focus-visible, #tp-tools-launcher:focus-visible {
  outline:2px solid var(--tp-gold, #d8b365); outline-offset:2px; }
.tp-tab:focus-visible { outline-offset:-3px; }
.tp-muted { color:var(--tp-text-dim); }
.tp-dialog-line { padding:6px 0; border-bottom:1px solid var(--tp-border); line-height:1.55; }
.tp-unit { border:1px solid var(--tp-border); border-radius:6px; padding:9px 12px 7px;
  margin-bottom:11px; background:rgba(0,0,0,0.18); }
.tp-unit-head { display:flex; justify-content:space-between; align-items:baseline;
  flex-wrap:wrap; min-width:0; gap:4px var(--tp-control-gap);
  margin-bottom:7px; padding-bottom:6px; border-bottom:1px solid rgba(85,51,34,0.55); }
.tp-unit-name { color:var(--tp-cream); font-size:15px; letter-spacing:1px;
  min-width:0; overflow-wrap:anywhere; }
.tp-unit-hp { font-family:ui-monospace,Menlo,monospace; font-size:13px;
  min-width:0; overflow-wrap:anywhere; }
.tp-stat-line { font-size:13px; line-height:1.85; display:flex; align-items:baseline; }
.tp-stat-line .k { color:var(--tp-text-dim); margin-right:8px; flex:0 0 3.2em; }
.tp-stat-chips { display:flex; flex-wrap:wrap; flex:1 1 0; min-width:0; }
.tp-chip { display:inline-block; margin:0 8px 1px 0; font-family:ui-monospace,Menlo,monospace; font-size:12.5px; }
.e-wind{color:#6fcf97} .e-thunder{color:#bb8fce} .e-water{color:#5dade2} .e-fire{color:#ec7063}
.e-earth{color:#d4ac6e} .e-phys{color:#9aa6a8} .e-poison{color:#a3d977} .e-sorcery{color:#e3a3d6}
.s-debuff{color:#e06c5a} .s-buff{color:#7fc88a} .s-poison{color:#b88fd6} .s-steal{color:#f0c674} .s-collect{color:#caa6e8}
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
.tp-action-row { display:flex; align-items:center; flex-wrap:wrap;
  gap:var(--tp-control-gap); margin:8px 0; min-width:0; }
.tp-action-row > .tp-btn { flex:1 1 auto; }
.tp-action-row > .tp-input { flex:1 1 144px; width:auto; }
.tp-time-row .tp-ctrl-label { flex:1 1 0; min-width:0; overflow-wrap:anywhere; }
.tp-time-row .tp-input { flex:0 0 120px; width:120px; max-width:50%;
  font-family:ui-monospace,Menlo,monospace; font-variant-numeric:tabular-nums; }
.tp-save-row { display:flex; align-items:center; gap:var(--tp-control-gap); padding:8px 0;
  border-bottom:1px solid rgba(85,51,34,0.35); }
.tp-save-label { color:var(--tp-text); flex:0 0 auto; min-width:60px; font-size:14px; }
.tp-save-row .tp-btn { flex:1 1 0; min-width:0; }
#tp-tools-launcher:hover { opacity:1; box-shadow:0 0 12px rgba(160,30,30,0.5); }
.tp-key-row { display:flex; align-items:flex-start; gap:12px; padding:6px 0;
  border-bottom:1px solid rgba(85,51,34,0.3); }
.tp-key-caps { flex:0 0 152px; display:flex; flex-wrap:wrap; align-items:center; gap:4px 3px; }
.tp-key-sep { color:var(--tp-text-dim); font-size:11px; }
.tp-kbd { display:inline-block; font-family:ui-monospace,Menlo,monospace; font-size:12px; line-height:1.1;
  color:var(--tp-cream); background:var(--tp-slot); border:1px solid var(--tp-border);
  border-bottom-width:2px; border-radius:4px; padding:3px 6px; white-space:nowrap; }
.tp-key-desc { flex:1 1 auto; color:var(--tp-text); font-size:13.5px; line-height:1.5; padding-top:2px; }
@media (max-width:420px) {
  .tp-key-row { flex-direction:column; gap:6px; }
  .tp-key-caps { flex:0 0 auto; }
  .tp-key-desc { padding-top:0; }
}
@media (prefers-reduced-motion:reduce) {
  #tp-tools-panel { animation:none; }
  .tp-tab, .tp-btn, .tp-close, .tp-gh-link, #tp-tools-launcher { transition:none; }
  .tp-btn:not(:disabled):hover { transform:none; }
}
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
  l.textContent = uiText(label)
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
  d.textContent = uiText(text)
  parent.appendChild(d)
}

function muted(parent: HTMLElement, text: string): void {
  const d = document.createElement('div')
  d.className = 'tp-muted'
  d.textContent = uiText(text)
  parent.appendChild(d)
}

/** 单位内「键 值」行(复用 .tp-stat-line):键(dim) + 等宽值(可上色)。 */
function kvLine(parent: HTMLElement, label: string, value: string, valueCss = ''): void {
  const d = document.createElement('div')
  d.className = 'tp-stat-line'
  const k = document.createElement('span')
  k.className = 'k'
  k.textContent = uiText(label)
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
  l.textContent = uiText(label)
  const slider = document.createElement('input')
  slider.type = 'range'
  slider.className = 'tp-range'
  slider.setAttribute('aria-label', uiText(label))
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
  b.textContent = uiText(text)
  b.addEventListener('click', onClick)
  parent.appendChild(b)
  return b
}

/** 开关行:文字(左) + 复选框(右)。 */
function toggleRow(
  parent: HTMLElement,
  label: string,
  checked: boolean,
  onChange: (v: boolean) => void,
): void {
  const r = document.createElement('label')
  r.className = 'tp-toggle'
  const span = document.createElement('span')
  span.textContent = uiText(label)
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
    cap.textContent = uiText(k)
    caps.appendChild(cap)
  })
  const d = document.createElement('div')
  d.className = 'tp-key-desc'
  d.textContent = uiText(desc)
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
    it.append(sw, document.createTextNode(uiText(name)))
    wrap.appendChild(it)
  }
  parent.appendChild(wrap)
}

// ── 战斗 tab 辅助:unit panel + 彩色 chip ──
const ELEM_CLASS: Record<string, string> = {
  风: 'e-wind',
  雷: 'e-thunder',
  水: 'e-water',
  火: 'e-fire',
  土: 'e-earth',
  物理: 'e-phys',
  毒: 'e-poison',
  巫抗: 'e-sorcery',
}

function chip(parent: HTMLElement, text: string, cls: string): void {
  const s = document.createElement('span')
  s.className = cls ? `tp-chip ${cls}` : 'tp-chip'
  s.textContent = text
  parent.appendChild(s)
}

function chipLine(
  parent: HTMLElement,
  label: string,
  items: { text: string; cls: string }[],
): void {
  if (!items.length) return
  const d = document.createElement('div')
  d.className = 'tp-stat-line'
  const k = document.createElement('span')
  k.className = 'k'
  k.textContent = uiText(label)
  d.appendChild(k)
  // chips 单独成右列(flex-wrap):换行后左缘对齐到 label 列之后,不顶格。
  const chips = document.createElement('span')
  chips.className = 'tp-stat-chips'
  for (const it of items) chip(chips, it.text, it.cls)
  d.appendChild(chips)
  parent.appendChild(d)
}

function unitPanel(
  parent: HTMLElement,
  name: string,
  right: string,
  rightCss: string,
): HTMLElement {
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

function resistChips(
  resistances: { label: string; value: number }[],
): { text: string; cls: string }[] {
  return resistances.map((r) => ({
    text: `${uiText(r.label)}${r.value > 0 ? '+' : ''}${r.value}`,
    cls: ELEM_CLASS[r.label] ?? '',
  }))
}

function statusChips(
  statuses: { name: string; kind: string; rounds?: number }[],
): { text: string; cls: string }[] {
  // buff/debuff 带剩余回合(>999 = 装备/永久效果 → 「永久」);毒无回合 → 只名。
  return statuses.map((s) => {
    // Some poison-only objects have no Item row. The inspector's explicit #ID fallback retains identity.
    const poisonId =
      getLanguage() === 'en' && s.kind === 'poison' ? /^毒#(\d+)$/.exec(s.name)?.[1] : undefined
    const name = poisonId
      ? getWord(Number(poisonId), localize(s.name, `Poison #${poisonId}`))
      : uiText(s.name)
    return {
      text:
        s.rounds && s.rounds > 0 ? `${name} ${s.rounds > 999 ? uiText('永久') : s.rounds}` : name,
      cls: `s-${s.kind}`,
    }
  })
}

function enemyDisplayName(
  gs: GameState,
  res: PanelResources,
  slot: number,
  fallback: string,
): string {
  const enemy = gs.battleState?.enemies[slot]
  if (!enemy) return fallback
  const exact = res.enemyObjects?.find((object) => object.objectIndex === enemy.objectId)
  if (exact?.enemyId === enemy.e.id) return getWord(exact.objectIndex, fallback)
  const candidates = res.enemyObjects?.filter((object) => object.enemyId === enemy.e.id)
  return candidates?.length === 1 ? getWord(candidates[0]!.objectIndex, fallback) : fallback
}

function enemyStealText(gs: GameState, slot: number, fallback: string): string {
  if (getLanguage() !== 'en') return fallback
  const enemy = gs.battleState?.enemies[slot]?.e
  if (!enemy) return fallback
  const count = enemy.stealItemCount ?? 0
  if (count <= 0) return 'Nothing to steal'
  const id = enemy.stealItem ?? 0
  return `${id === 0 ? 'Coins' : getWord(id, `Item #${id}`)} ×${count}`
}

function enemyAttackEffectText(gs: GameState, slot: number, fallback: string): string {
  if (getLanguage() !== 'en') return fallback
  const enemy = gs.battleState?.enemies[slot]?.e
  if (!enemy) return fallback
  const id = enemy.attackEquivItem ?? 0
  return `${getWord(id, `Item #${id}`)}#${id} (${enemy.attackEquivItemRate ?? 0}/10)`
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
  kvLine(
    ov,
    '回合',
    localize(`第 ${gs.battleState.turn + 1} 回合`, `Turn ${gs.battleState.turn + 1}`),
    'color:var(--tp-gold)',
  )
  kvLine(ov, '灵葫值', String(gs.wCollectValue ?? 0), 'color:#b88fd6')
  sectionTitle(parent, '我方')
  const levelUpExp = res.levelUpExp ?? []
  // Inspector labels remain stable logic keys; only item names enter its display snapshot.
  const displayItems = res.items.map((item) => ({
    ...item,
    _name: getWord(item.id, item._name ?? ''),
  }))
  for (const p of collectPartyStatusReadouts(
    gs,
    res.playerRoles,
    res.objectPoisons,
    displayItems,
    levelUpExp,
  )) {
    // 头:角色名 + 修行(等级)。经验单独成行。
    //   我方体力/真气**不显示**:本面板读持久 PlayerRolesRuntime,战斗中当前血/蓝由战斗工作副本
    //   持有、仅在边界回写,会滞后误导(战斗框才是 live 值)。敌方 HP 读 battleState 故保留。
    const role = res.playerRoles.roles.find((r) => r.id === p.roleId)
    const roleName = role ? getWord(role.name, p.roleName) : p.roleName
    const u = unitPanel(
      parent,
      roleName,
      localize(`修行 ${p.level}`, `Level ${p.level}`),
      'color:var(--tp-gold)',
    )
    kvLine(
      u,
      '经验',
      p.nextExp > 0 ? `${p.curExp} / ${p.nextExp}` : String(p.curExp),
      'color:var(--tp-text)',
    )
    // 6 属性(= 游戏内状态框,含装备加成):修行(头)+ 武术/灵力/防御/身法/吉运。
    chipLine(u, '属性', [
      { text: `${uiText('武术')} ${p.attack}`, cls: '' },
      { text: `${uiText('灵力')} ${p.magicPower}`, cls: '' },
      { text: `${uiText('防御')} ${p.defense}`, cls: '' },
      { text: `${uiText('身法')} ${p.dexterity}`, cls: '' },
      { text: `${uiText('吉运')} ${p.fleeRate}`, cls: '' },
    ])
    // 修为:五属性隐藏经验(累积/升点阈值;+N = 本场战斗已累积、战后结算转经验涨属性)。
    chipLine(
      u,
      '修为',
      p.hiddenExp.map((h) => ({
        text: `${uiText(h.label)} ${h.next > 0 ? `${h.cur}/${h.next}` : h.cur}${h.gained > 0 ? ` +${h.gained}` : ''}`,
        cls: '',
      })),
    )
    chipLine(u, '抗性', resistChips(p.resistances))
    chipLine(u, '状态', statusChips(p.statuses)) // 含中毒(紫 s-poison chip)
  }
  sectionTitle(parent, '敌方')
  for (const e of collectEnemyStatusReadouts(gs, res.objectPoisons, displayItems)) {
    const u = unitPanel(
      parent,
      enemyDisplayName(gs, res, e.slot, e.name),
      e.defeated ? uiText('已倒') : `HP ${e.hp}/${e.maxHp}`,
      e.defeated ? 'color:var(--tp-text-dim)' : hpCss(e.hp, e.maxHp),
    )
    // 属性:全战斗属性(隐藏 法术id 调试项);经验/金钱单独成「战利」行。
    const combat = e.stats.filter((s) => !['法术id', '经验', '金钱'].includes(s.label))
    chipLine(
      u,
      '属性',
      combat.map((s) => ({
        text: localize(`${s.label}${s.value}`, `${uiText(s.label)} ${s.value}`),
        cls: '',
      })),
    )
    const drops = e.stats.filter((s) => s.label === '经验' || s.label === '金钱')
    chipLine(
      u,
      '战利',
      drops.map((s) => ({
        text: localize(`${s.label}${s.value}`, `${uiText(s.label)} ${s.value}`),
        cls: '',
      })),
    )
    chipLine(u, '抗性', resistChips(e.resistances))
    chipLine(u, '状态', statusChips(e.statuses)) // 含中毒
    chipLine(u, '偷取', [{ text: enemyStealText(gs, e.slot, e.steal), cls: 's-steal' }]) // 始终显示(可偷物/金钱 或「不可偷」)
    // 灵葫值:>0 = 灵葫咒可收(秒掉时并入全局灵葫值供炼丹);=0 → 灵葫咒永远收不掉,显「无」提示。始终显示。
    chipLine(u, '灵葫', [
      { text: e.collectValue > 0 ? String(e.collectValue) : uiText('无'), cls: 's-collect' },
    ])
    // 普攻毒:敌普攻命中按 rate/10 概率附该道具(全 0x29 单体毒)效果;无此机制(equiv 或 rate 为 0)→ null 不显示。
    // label 取 3 字(「普攻附毒」4 字会在 label 列换行)。
    if (e.attackEquivPoison)
      chipLine(u, '普攻毒', [
        { text: enemyAttackEffectText(gs, e.slot, e.attackEquivPoison), cls: 's-poison' },
      ])
  }
  const field = collectFieldInfoReadout(gs)
  if (field) {
    sectionTitle(parent, '场地')
    const u = unitPanel(
      parent,
      localize(`场地 #${field.fieldId}`, `Field #${field.fieldId}`),
      field.isBoss ? 'BOSS' : '',
      field.isBoss ? 'color:var(--tp-crimson);font-weight:bold' : '',
    )
    chipLine(
      u,
      '场效',
      field.elements.map((s) => ({
        text: `${uiText(s.label)}${s.value > 0 ? '+' : ''}${s.value}`,
        cls: ELEM_CLASS[s.label] ?? '',
      })),
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
  sectionTitle(parent, localize('语言 / Language', 'Language / 语言'))
  const languageRow = document.createElement('label')
  languageRow.className = 'tp-ctrl-row'
  const languageSelect = document.createElement('select')
  languageSelect.id = 'tp-language'
  languageSelect.className = 'tp-input'
  languageSelect.setAttribute('aria-label', '语言 / Language')
  for (const [value, label] of [
    ['zh-CN', '简体中文'],
    ['en', 'English'],
  ] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = label
    option.disabled = value === 'en' && deps.languageAvailable !== true
    languageSelect.append(option)
  }
  languageSelect.value = getLanguage()
  languageSelect.addEventListener('change', () => {
    if (languageSelect.value === 'en' && deps.languageAvailable === true) setLanguage('en')
    else if (languageSelect.value === 'zh-CN') setLanguage('zh-CN')
    else languageSelect.value = getLanguage()
  })
  languageRow.append(languageSelect)
  parent.append(languageRow)
  if (deps.languageAvailable !== true) {
    muted(
      parent,
      localize(
        '英文语言包未就绪，暂时使用中文。',
        'English language pack is unavailable; using Chinese.',
      ),
    )
  }
  muted(
    parent,
    localize(
      '英文补丁：Xire及原翻译者；SDLPal移植与修订：Nostaljaded，v3.3（2019）。本项目另补界面和残留文本。',
      'English patch: Xire and the original translators. SDLPal port and revisions: Nostaljaded, v3.3 (2019). Additional UI and remaining text translated for type-pal.',
    ),
  )
  sectionTitle(parent, '操作')
  if (isMobileLayout()) {
    toggleRow(parent, '显示虚拟按键', areTouchControlsVisible(), setTouchControlsVisible)
  }
  muted(
    parent,
    '手柄：十字键/左摇杆移动，底部面键确认，右侧面键取消，Start打开菜单。连接后按任意键激活。',
  )
  // ── 显示 ──
  const ds = deps.displayScale
  if (!isMobileLayout()) {
    sectionTitle(parent, '显示')
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
    button(parent, '全屏', () => ds.toggleFullscreen())
    toggleRow(parent, '左上角显示 FPS', isFpsEnabled(), (v) => setFpsEnabled(v))
  }

  // ── 音频(音乐 BGM / 音效 SFX / 视频 mp4 各自独立音量;静音为一键覆盖三路的主开关) ──
  sectionTitle(parent, '音频')
  const addVolRow = (label: string, ctrl: AudioVolumeController): void => {
    const { slider, val } = sliderRow(parent, label, {
      min: 0,
      max: 100,
      value: Math.round(ctrl.getVolume() * 100),
    })
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
  const sourceRow = document.createElement('label')
  sourceRow.className = 'tp-ctrl-row'
  const sourceLabel = document.createElement('span')
  sourceLabel.className = 'tp-ctrl-label'
  sourceLabel.textContent = uiText('音源')
  const sourceSelect = document.createElement('select')
  sourceSelect.id = 'tp-music-source'
  sourceSelect.className = 'tp-input'
  sourceSelect.setAttribute('aria-label', uiText('音乐音源'))
  for (const [value, text] of [
    ['midi', 'MIDI（当前音色）'],
    ['rix', 'DOS FM（RIX）'],
  ] as const) {
    const option = document.createElement('option')
    option.value = value
    option.textContent = uiText(text)
    sourceSelect.appendChild(option)
  }
  sourceSelect.addEventListener('change', () => {
    deps.musicSource.setSource(sourceSelect.value === 'rix' ? 'rix' : 'midi')
  })
  sourceRow.append(sourceLabel, sourceSelect)
  parent.appendChild(sourceRow)
  const status = document.createElement('div')
  status.id = 'tp-music-source-status'
  status.className = 'tp-muted'
  status.setAttribute('role', 'status')
  parent.appendChild(status)
  const retry = button(parent, '重试音乐加载', () => {
    deps.musicSource.setSource(deps.musicSource.getState().source)
  })
  retry.id = 'tp-music-source-retry'
  updateMusicSourceUi(parent, deps.musicSource)
  addVolRow('音效', deps.sfxVolume)
  addVolRow('视频', deps.videoVolume)
  // 主静音:一键静音/恢复 音乐+音效+视频。三路控制器共用同一静音 localStorage 键(见 bootstrap),
  //   故 audioVolume.isMuted() 即代表当前主静音态;静音只叠加开关、不改各路滑块音量,恢复即回滑块值。
  const muteChannels = [deps.audioVolume, deps.sfxVolume, deps.videoVolume]
  const muteLabel = (): string =>
    deps.audioVolume.isMuted() ? uiText('🔇 已静音') : uiText('🔊 静音')
  const muteBtn = button(parent, muteLabel(), () => {
    const next = !deps.audioVolume.isMuted()
    for (const c of muteChannels) c.setMuted(next)
    muteBtn.textContent = muteLabel()
  })

  if (isMobileLayout()) {
    if (deps.openPrivacySettings) button(parent, '隐私设置', deps.openPrivacySettings)
    return
  }

  // ── 存档(5 个存档位各自导入/导出) ──
  sectionTitle(parent, '存档导入导出')
  muted(parent, '每个存档位可单独导出为文件、或从文件导入(导入后在读档菜单载入)')
  for (let slot = 1; slot <= 5; slot++) {
    const row = document.createElement('div')
    row.className = 'tp-save-row'
    const lbl = document.createElement('span')
    lbl.className = 'tp-save-label'
    lbl.textContent = localize(`存档位 ${slot}`, `Slot ${slot}`)
    row.appendChild(lbl)
    button(row, '导出', () => {
      void (async (): Promise<void> => {
        const g = await deps.loadSlot(slot)
        if (!g) {
          showToast(localize(`存档位 ${slot} 暂无存档`, `Slot ${slot} is empty`), { type: 'error' })
          return
        }
        const blob = new Blob([serializeSave(g)], { type: 'application/json' })
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `type-pal-save-slot${slot}.json`
        a.click()
        URL.revokeObjectURL(a.href)
        showToast(localize(`已导出存档位 ${slot}`, `Exported slot ${slot}`), { type: 'success' })
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
            showToast(localize(`已导入到存档位 ${slot}`, `Imported to slot ${slot}`), {
              type: 'success',
            })
          } catch (err) {
            showToast(
              `${localize('导入失败:', 'Import failed: ')}${err instanceof Error ? err.message : String(err)}`,
              {
                type: 'error',
              },
            )
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

function updateMusicSourceUi(parent: HTMLElement, controller: MusicSourceController): void {
  const state = controller.getState()
  const select = parent.querySelector<HTMLSelectElement>('#tp-music-source')
  const status = parent.querySelector<HTMLElement>('#tp-music-source-status')
  const retry = parent.querySelector<HTMLElement>('#tp-music-source-retry')
  if (select) select.value = state.source
  if (status) {
    status.textContent =
      state.status === 'loading'
        ? uiText('正在加载音乐…')
        : state.status === 'error'
          ? localize(`音乐加载失败：${state.error}`, `Music failed to load: ${state.error}`)
          : ''
  }
  if (retry) retry.hidden = state.status !== 'error'
}

/** 对话 tab:搜索框 + 按「进入场景」分组(时序倒序:新在上、旧在下,场景名标题) + 行列表。 */
function renderDialogTab(parent: HTMLElement, gs: GameState): void {
  const history = gs.dialogHistory ?? []
  if (!history.length) {
    muted(parent, '(暂无历史对话)')
    return
  }
  const search = document.createElement('input')
  search.type = 'text'
  search.className = 'tp-input'
  search.setAttribute('aria-label', uiText('搜索对话'))
  search.autocomplete = 'off'
  search.placeholder = uiText('搜索对话…')
  parent.appendChild(search)
  const list = document.createElement('div')
  list.style.marginTop = '8px'
  parent.appendChild(list)
  const renderList = (q: string): void => {
    list.replaceChildren()
    const kw = q.trim()
    let lastMap: number | undefined
    // 倒序遍历:新对话在上、旧对话在下(history 本身按时间正序追加,这里反向渲染)。
    for (let i = history.length - 1; i >= 0; i--) {
      const entry = history[i]! // i 在界内必存在(满足 noUncheckedIndexedAccess)
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
  ops.className = 'tp-action-row'
  button(ops, '重置本局', () => {
    resetSpeedrun()
    showToast(uiText('计时器已重置'), { type: 'success' })
  })
  button(ops, '本次设为最佳', () => {
    setSpeedrunBestFromCurrent()
    showToast(uiText('已设为最佳'), { type: 'success' })
    rerender()
  })
  button(ops, '清空最佳', () => {
    clearSpeedrunBests()
    showToast(uiText('已清空最佳'), { type: 'success' })
    rerender()
  })
  parent.appendChild(ops)

  // 测试用:读档后把"依序打点"指针跳到指定节点,从该段起检测(否则计时器严格按顺序、
  //   读档过了前面节点也不生效)。跳过的节点不计时。
  sectionTitle(parent, '测试:跳到节点')
  muted(parent, '读档后选目标节点跳过去,从该段起测检测(计时器本身严格按顺序;跳过的节点不计)')
  const curStep = getSpeedrunRun().stepIndex
  const jumpRow = document.createElement('div')
  jumpRow.className = 'tp-action-row'
  const sel = document.createElement('select')
  sel.className = 'tp-input'
  sel.setAttribute('aria-label', uiText('计时器跳转节点'))
  CHECKPOINTS.forEach((cp, i) => {
    const opt = document.createElement('option')
    opt.value = String(i)
    opt.textContent = `${i + 1}. ${checkpointName(cp)}`
    if (i === curStep) opt.selected = true
    sel.appendChild(opt)
  })
  jumpRow.appendChild(sel)
  button(jumpRow, '跳到此节点', () => {
    const idx = Number(sel.value)
    setSpeedrunStep(idx)
    showToast(
      localize(
        `已跳到「${CHECKPOINTS[idx]?.name}」,从此节点起检测`,
        `Detection starts at ${CHECKPOINTS[idx] ? checkpointName(CHECKPOINTS[idx]) : idx}`,
      ),
      { type: 'success' },
    )
    rerender()
  })
  parent.appendChild(jumpRow)

  sectionTitle(parent, '各节点最佳时间')
  const bests = getSpeedrunBests()
  for (const cp of CHECKPOINTS) {
    const row = document.createElement('div')
    row.className = 'tp-ctrl-row tp-time-row'
    const label = document.createElement('span')
    label.className = 'tp-ctrl-label'
    label.textContent = checkpointName(cp)
    const input = document.createElement('input')
    input.className = 'tp-input'
    input.setAttribute(
      'aria-label',
      localize(`${cp.name}最佳时间`, `${checkpointName(cp)} best time`),
    )
    input.autocomplete = 'off'
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
        showToast(uiText('格式应为 H:MM:SS'), { type: 'error' })
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

  sectionTitle(parent, '速通计时器')
  keyRow(parent, ['F8'], '暂停 / 恢复(恢复有 3 秒倒计时)')
  keyRow(parent, ['F4'], '重置计时器本局')
  keyRow(parent, ['F2'], '显示 / 隐藏计时器覆盖层')
  muted(parent, '仅在「计时器」tab 启用计时器后生效')
}

function renderActiveTab(
  body: HTMLElement,
  active: TabKey,
  deps: ToolsPanelDeps,
  minimap: MinimapController,
): void {
  const gs = deps.getGs()
  if (active === 'battle') renderBattleTab(body, gs, deps.getResources())
  else if (active === 'scene') renderSceneTab(body, gs, minimap)
  else if (active === 'system') renderSystemTab(body, deps)
  else if (active === 'dialog') renderDialogTab(body, gs)
  else if (active === 'timer') renderTimerTab(body)
  else renderKeysTab(body)
}

/**
 * 战斗态轻量签名:只拼接下方选定字段,不是完整状态checksum。
 * HP/MP读持久runtime、毒读数量;同数量换毒或其它未拼接字段不保证立即刷新。
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
  const enemies = bs.enemies
    .map((e) => `${e.e.health}:${e.defeated ? 1 : 0}:${(e.poisons ?? []).length}`)
    .join(',')
  const pStatus = bs.players
    .map((p) => statusOf(p.status as unknown as Record<string, number>))
    .join('|')
  const eStatus = bs.enemies
    .map((e) => statusOf(e.status as unknown as Record<string, number>))
    .join('|')
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
  const titleWrap = document.createElement('div')
  titleWrap.className = 'tp-title-wrap'
  const title = document.createElement('div')
  title.className = 'tp-title'
  title.textContent = uiText('仙剑 · 工具')
  const ghLink = document.createElement('a')
  ghLink.className = 'tp-gh-link'
  ghLink.href = 'https://github.com/IllegalCreed/type-pal'
  ghLink.target = '_blank'
  ghLink.rel = 'noopener noreferrer'
  ghLink.textContent = 'GitHub'
  ghLink.title = 'github.com/IllegalCreed/type-pal'
  titleWrap.append(title, ghLink)
  const closeBtn = document.createElement('button')
  closeBtn.className = 'tp-close'
  closeBtn.textContent = '×'
  closeBtn.setAttribute('aria-label', uiText('关闭'))
  header.append(titleWrap, closeBtn)
  const body = document.createElement('div')
  body.className = 'tp-body'
  main.append(header, body)

  let active: TabKey = isMobileLayout() ? 'system' : 'scene'
  const tabButtons = new Map<TabKey, HTMLButtonElement>()
  const render = (): void => {
    if (isMobileLayout() && (active === 'timer' || active === 'keys')) active = 'system'
    for (const [k, btn] of tabButtons) {
      btn.textContent = uiText(TABS.find(([key]) => key === k)?.[1] ?? '')
      btn.hidden = isMobileLayout() && (k === 'timer' || k === 'keys')
      btn.classList.toggle('tp-tab-active', k === active)
      btn.setAttribute('aria-pressed', String(k === active))
      if (k === 'scene') btn.textContent = uiText(isMobileLayout() ? '地图' : '场景')
      if (k === 'system') btn.textContent = uiText(isMobileLayout() ? '设置' : '系统')
    }
    body.replaceChildren()
    renderActiveTab(body, active, panelDeps, minimap)
  }
  for (const [key, label] of TABS) {
    const b = document.createElement('button')
    b.className = 'tp-tab'
    b.dataset.key = key
    if (key === 'battle' || key === 'dialog' || key === 'keys') b.dataset.extra = ''
    b.textContent = uiText(label)
    b.addEventListener('click', () => {
      active = key
      render()
    })
    tabButtons.set(key, b)
    tabbar.appendChild(b)
  }
  const moreTabs = document.createElement('button')
  moreTabs.className = 'tp-tabs-more'
  moreTabs.textContent = uiText('更多')
  moreTabs.setAttribute('aria-expanded', 'false')
  moreTabs.addEventListener('click', () => {
    const expanded = tabbar.toggleAttribute('data-expanded')
    moreTabs.setAttribute('aria-expanded', String(expanded))
  })
  tabbar.append(moreTabs)
  root.append(tabbar, main)
  document.body.appendChild(root)
  deps.musicSource.subscribe(() => updateMusicSourceUi(body, deps.musicSource))

  const launcher = document.createElement('button')
  launcher.id = 'tp-tools-launcher'
  launcher.textContent = '⚙'
  launcher.title = uiText('工具面板(`)')
  launcher.setAttribute('aria-label', uiText('打开工具面板'))

  let open = false
  let previousFocus: HTMLElement | null = null
  const setOpen = (next: boolean): void => {
    if (next === open) return
    open = next
    root.hidden = !next
    deps.onOpenChange?.(next)
    if (next) {
      previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
      if (isMobileLayout()) {
        root.setAttribute('role', 'dialog')
        root.setAttribute('aria-label', uiText('游戏工具'))
        render()
        closeBtn.focus()
      } else render()
    } else previousFocus?.focus()
  }
  const panelDeps: ToolsPanelDeps = {
    ...deps,
    openPrivacySettings: deps.openPrivacySettings
      ? () => {
          setOpen(false)
          deps.openPrivacySettings?.()
        }
      : undefined,
  }
  const unsubscribeLanguage = subscribeLanguage(() => {
    if (!root.isConnected) {
      unsubscribeLanguage()
      return
    }
    title.textContent = uiText('仙剑 · 工具')
    closeBtn.setAttribute('aria-label', uiText('关闭'))
    moreTabs.textContent = uiText('更多')
    launcher.title = uiText('工具面板(`)')
    launcher.setAttribute('aria-label', uiText('打开工具面板'))
    if (root.hasAttribute('aria-label')) root.setAttribute('aria-label', uiText('游戏工具'))
    if (open) {
      const focusedId =
        document.activeElement instanceof HTMLElement ? document.activeElement.id : ''
      const scrollTop = body.scrollTop
      render()
      body.scrollTop = scrollTop
      if (focusedId) document.getElementById(focusedId)?.focus()
    }
  })
  window.addEventListener(LAYOUT_CHANGE, () => {
    if (open) render()
  })
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
  // 面板内 keydown 不冒泡给游戏 window 监听(防搜索框打字漏成游戏输入);但 **放行 Backquote** ——
  //   否则点过 tab 后焦点落在面板内按钮上,` 被这里 stopPropagation 拦死,到不了上方 window 切换器 → 关不掉面板。
  root.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && isMobileLayout()) {
      e.preventDefault()
      setOpen(false)
    }
    if (e.code !== 'Backquote') e.stopPropagation()
  })

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
