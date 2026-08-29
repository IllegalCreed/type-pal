/**
 * D13-1 调试工具首刀 —— DEV-only overlay（?debug 动态引入）。
 *
 * 纪律（K1-K5 / G1-G4 验收钉）：
 * - 本模块只经 `import.meta.env.DEV && params.get('debug')` 动态 import，主包静态链不触及；
 *   生产构建 tree-shake 掉 `if(false)` 动态 import 分支。
 * - 全部状态内存态，不落档；世界变更走 runDetached（host 意图守卫）或 dev 内存 mutation。
 * - 命令注册表复用现有 host/命令能力，不新建执行路径。
 * - 任意脚本/触发器触发走 detached current runtime，不用 startScript 静默丢。
 * - 输入隔离：面板 keydown/keyup stopPropagation，焦点期不吞游戏键，Esc 只关 overlay。
 */
import type {
  ActivePoison,
  CharacterInstance,
  RuntimeSceneDef,
  WorldState,
} from '@type-pal/content'
import { isCarryableStatusId } from '@type-pal/content'
import type { BattleResult } from './battle/battle-result.js'
import type { WorldPreset } from './dev-preset.js'
import type { LoadedCurrentProject } from './project-loader.js'
import type { ScriptProjectRuntime } from './runtime-script-project.js'

export interface DebugFrameStep {
  active: boolean
  requestStep(): void
  reset(): void
  setActive(active: boolean): void
}

export interface DebugLayers {
  collision: boolean
  triggers: boolean
}

export interface DebugPresetMember {
  actorId: string
  level?: number
  hp?: number
  mp?: number
  /** "slotId=itemId,slotId=itemId" */
  equipment?: string
  /** 逗号分隔的 extraStatuses status id（如 protect） */
  statuses?: string
  /** 逗号分隔的 poison id（数字） */
  poisons?: string
}

export interface DebugToolsContext {
  world(): WorldState
  sceneId(): string
  /** current canonical 场景定义（触发器/脚本枚举与触发用）。 */
  scene(): RuntimeSceneDef | undefined
  canonicalProject: LoadedCurrentProject
  runtime(): ScriptProjectRuntime | undefined
  runnerBusy(): boolean
  dialogBusy(): boolean
  /** D14-2(K2):呈现占用(intent 在途 ∪ runner 活跃)——触发确认判定用。 */
  presentationBusy(): boolean
  runDetached<T>(
    signal: AbortSignal,
    invoke: (runtime: ScriptProjectRuntime, signal: AbortSignal) => Promise<T>,
  ): Promise<T>
  startBattleDev(
    request: {
      enemyTeamId: string
      enemyOverride?: string[]
      partyPreset?: WorldPreset
      fieldId?: number
    },
    signal: AbortSignal,
  ): Promise<BattleResult>
  buildPresetParty(
    actorIds: string[],
    seedStats: Record<string, { hp?: number; mp?: number }>,
  ): WorldPreset
  setParty(actorIds: string[]): void
  grantSkill(actorId: string, skillId: string): void
  frameStep: DebugFrameStep
  layers: DebugLayers
  showToast(text: string): void
}

interface TriggerItem {
  kind: 'script' | 'trigger' | 'auto' | 'hook'
  id: string
  label: string
  scene?: string
}

const ROOT_ID = 'tp-debug'
const STYLE_ID = 'tp-reforge-debug-style'

type DebugTabId = 'status' | 'commands' | 'triggers' | 'battle' | 'layers'

const DEBUG_TABS: readonly { id: DebugTabId; label: string }[] = [
  { id: 'status', label: '状态' },
  { id: 'commands', label: '指令' },
  { id: 'triggers', label: '触发' },
  { id: 'battle', label: '战斗' },
  { id: 'layers', label: '图层' },
]

let activeDebugCleanup: (() => void) | undefined

/** Reforge 私有样式；复用一阶段视觉 token，但不建立跨包运行时依赖。 */
export function injectDebugToolsStyles(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = `
#${ROOT_ID} {
  --tpd-bg:rgba(24,24,28,.96); --tpd-surface:#1c1c20; --tpd-control:#2d2d34;
  --tpd-control-hover:#3a3a45; --tpd-border:#3a3a42; --tpd-border-strong:#45454f;
  --tpd-text:#e8e8e8; --tpd-text-dim:#a0a0aa; --tpd-title:#fdf6a8;
  --tpd-section:#c4d1ff; --tpd-accent:#6c8eef; --tpd-error:#ff7a70;
  --tpd-success:#75d38b; --tpd-warn:#f0b35a; --tpd-info:#8ab4d8;
  position:fixed; top:12px; left:12px; z-index:2147483000;
  width:min(420px, calc(100vw - 24px)); height:min(680px, 88vh); max-height:88vh;
  display:flex; flex-direction:column; overflow:hidden; color:var(--tpd-text);
  background:var(--tpd-bg); border:1px solid var(--tpd-border); border-radius:8px;
  box-shadow:0 4px 16px rgba(0,0,0,.5);
  font:12px/1.45 ui-monospace,"SF Mono",Menlo,Monaco,Consolas,monospace;
  color-scheme:dark;
}
#${ROOT_ID} * { box-sizing:border-box; }
#${ROOT_ID} .tpd-main { flex:1 1 auto; min-width:0; min-height:0; display:flex; flex-direction:column; }
#${ROOT_ID} .tpd-header {
  flex:0 0 auto; display:flex; align-items:flex-start; justify-content:space-between; gap:8px;
  padding:9px 10px 7px;
}
#${ROOT_ID} .tpd-title {
  flex:0 0 auto; color:var(--tpd-title); font-size:13px; font-weight:600; line-height:1.7;
  white-space:nowrap;
}
#${ROOT_ID} .tpd-header-meta {
  flex:1 1 auto; min-width:0; display:flex; flex-wrap:wrap; align-items:center;
  justify-content:flex-end; gap:3px 5px;
}
#${ROOT_ID} .tpd-badge {
  padding:1px 5px; border:1px solid currentColor; border-radius:999px;
  font-size:10px; line-height:1.45; white-space:nowrap;
}
#${ROOT_ID} .tpd-badge[data-state="idle"] { color:var(--tpd-success); }
#${ROOT_ID} .tpd-badge[data-state="busy"] { color:var(--tpd-warn); }
#${ROOT_ID} .tpd-status {
  flex:1 0 100%; min-height:1.45em; overflow:hidden; color:var(--tpd-text-dim);
  font-size:11px; text-align:right; text-overflow:ellipsis; white-space:nowrap;
}
#${ROOT_ID} [data-tone="success"] { color:var(--tpd-success); }
#${ROOT_ID} [data-tone="warn"] { color:var(--tpd-warn); }
#${ROOT_ID} [data-tone="error"] { color:var(--tpd-error); }
#${ROOT_ID} [data-tone="info"] { color:var(--tpd-info); }
#${ROOT_ID} .tpd-close {
  flex:0 0 auto; width:24px; height:24px; padding:0; border:1px solid transparent;
  border-radius:4px; color:var(--tpd-text-dim); background:transparent;
  font:18px/1 system-ui,sans-serif; cursor:pointer;
}
#${ROOT_ID} .tpd-close:hover { color:var(--tpd-text); background:var(--tpd-control); }
#${ROOT_ID} .tpd-tabbar {
  flex:0 0 auto; display:flex; gap:2px; padding:0 10px; overflow-x:auto;
  border-bottom:1px solid var(--tpd-border);
}
#${ROOT_ID} .tpd-tab {
  flex:1 0 58px; min-height:28px; padding:5px 7px; margin:0 0 -1px;
  border:1px solid var(--tpd-border); border-bottom-color:var(--tpd-border);
  border-radius:5px 5px 0 0; color:var(--tpd-text-dim); background:#24242a;
  font:11px/1.2 inherit; cursor:pointer; transition:background .15s,color .15s;
}
#${ROOT_ID} .tpd-tab:hover { color:var(--tpd-text); background:#30303a; }
#${ROOT_ID} .tpd-tab[aria-selected="true"] {
  color:var(--tpd-title); font-weight:600; background:#3a3a48;
  border-color:var(--tpd-accent); border-bottom-color:#3a3a48;
}
#${ROOT_ID} .tpd-body { flex:1 1 auto; min-height:0; }
#${ROOT_ID} .tpd-panel { height:100%; overflow:auto; padding:7px 10px 12px; }
#${ROOT_ID} .tpd-panel[hidden] { display:none; }
#${ROOT_ID} .tpd-section { margin:0 0 10px; padding:0 0 8px; }
#${ROOT_ID} .tpd-section:last-child { margin-bottom:0; border-bottom:0; }
#${ROOT_ID} .tpd-section-title {
  margin:7px 0 6px; padding:3px 6px; color:var(--tpd-section);
  background:linear-gradient(90deg,var(--tpd-border) 0%,transparent 100%);
  border-left:3px solid var(--tpd-accent); font-size:12px; font-weight:600;
}
#${ROOT_ID} .tpd-section-title:first-child { margin-top:1px; }
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close) {
  border:1px solid var(--tpd-border-strong); border-radius:4px; padding:5px 8px;
  color:var(--tpd-text); background:var(--tpd-control); font:inherit;
  cursor:pointer; transition:background .15s,border-color .15s;
}
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close):hover { background:var(--tpd-control-hover); border-color:#5a5a68; }
#${ROOT_ID} button:not(.tpd-tab):not(.tpd-close):active { background:#24242a; }
#${ROOT_ID} input:not([type="checkbox"]):not([type="radio"]),
#${ROOT_ID} select, #${ROOT_ID} textarea {
  min-width:0; width:100%; border:1px solid var(--tpd-border-strong); border-radius:4px;
  padding:5px 7px; color:var(--tpd-text); background:var(--tpd-surface); font:inherit;
}
#${ROOT_ID} input::placeholder, #${ROOT_ID} textarea::placeholder { color:var(--tpd-text-dim); }
#${ROOT_ID} input[type="checkbox"], #${ROOT_ID} input[type="radio"] { flex:0 0 auto; accent-color:var(--tpd-accent); }
#${ROOT_ID} button:focus-visible, #${ROOT_ID} input:focus-visible, #${ROOT_ID} select:focus-visible,
#${ROOT_ID} textarea:focus-visible, #${ROOT_ID} [role="tab"]:focus-visible,
#${ROOT_ID} [role="tabpanel"]:focus-visible {
  outline:2px solid var(--tpd-accent); outline-offset:1px; border-color:var(--tpd-accent);
}
#${ROOT_ID} .tpd-console, #${ROOT_ID} .tpd-inspector {
  width:100%; margin:0 0 6px; padding:7px; overflow:auto; white-space:pre-wrap;
  color:var(--tpd-text); background:#141417; border:1px solid var(--tpd-border); border-radius:4px;
  font:11px/1.45 inherit;
}
#${ROOT_ID} .tpd-console { height:160px; }
#${ROOT_ID} .tpd-inspector { height:390px; }
#${ROOT_ID} .tpd-console-line { display:block; }
#${ROOT_ID} .tpd-scrollbox { max-height:180px; overflow:auto; padding:6px;
  background:var(--tpd-surface); border:1px solid var(--tpd-border); border-radius:4px; }
#${ROOT_ID} .tpd-scrollbox-compact { max-height:110px; }
#${ROOT_ID} .tpd-scrollbox-tall { max-height:150px; }
#${ROOT_ID} .tpd-option { display:flex; align-items:center; gap:5px; min-height:24px; white-space:nowrap; }
#${ROOT_ID} .tpd-trigger-button { display:block; width:100%; margin:2px 0; text-align:left; }
#${ROOT_ID} .tpd-trigger-kind { color:var(--tpd-info); }
#${ROOT_ID} .tpd-row { display:flex; align-items:center; gap:6px; flex-wrap:wrap; margin:4px 0; }
#${ROOT_ID} .tpd-row-label { flex:0 0 3.5em; color:var(--tpd-text-dim); }
#${ROOT_ID} .tpd-row > :not(.tpd-row-label) { flex:1 1 140px; }
#${ROOT_ID} .tpd-inline-options { display:flex; align-items:center; gap:6px 9px; flex-wrap:wrap; margin:4px 0; }
#${ROOT_ID} .tpd-inline-label { display:inline-flex; align-items:center; gap:4px; }
#${ROOT_ID} .tpd-member-row { display:grid; grid-template-columns:auto 48px 54px 54px minmax(100px,1fr);
  align-items:center; gap:5px; margin:4px 0; }
#${ROOT_ID} .tpd-member-extra { grid-column:2 / -1; display:grid;
  grid-template-columns:minmax(105px,1.3fr) minmax(88px,1fr) minmax(72px,.8fr); gap:5px; }
#${ROOT_ID} .tpd-actions { display:flex; align-items:center; gap:8px; flex-wrap:wrap; margin-top:8px; }
#${ROOT_ID} .tpd-note { margin-top:7px; color:var(--tpd-text-dim); font-size:11px; line-height:1.5; }
#${ROOT_ID} .tpd-toggle { display:flex; align-items:center; gap:7px; padding:6px 2px;
  border-bottom:1px solid var(--tpd-border); cursor:pointer; }
#${ROOT_ID} .tpd-toggle input { width:16px; height:16px; }
#${ROOT_ID} .tpd-panel, #${ROOT_ID} .tpd-scrollbox, #${ROOT_ID} pre { scrollbar-color:#555560 var(--tpd-surface); }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar,
#${ROOT_ID} pre::-webkit-scrollbar { width:7px; height:7px; }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar-track, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar-track,
#${ROOT_ID} pre::-webkit-scrollbar-track { background:var(--tpd-surface); }
#${ROOT_ID} .tpd-panel::-webkit-scrollbar-thumb, #${ROOT_ID} .tpd-scrollbox::-webkit-scrollbar-thumb,
#${ROOT_ID} pre::-webkit-scrollbar-thumb { background:#555560; border-radius:4px; }
@media (max-width:480px) {
  #${ROOT_ID} { top:8px; left:8px; width:calc(100vw - 16px); height:min(700px, 90vh); max-height:90vh; }
  #${ROOT_ID} .tpd-header { flex-wrap:wrap; }
  #${ROOT_ID} .tpd-header-meta { order:3; flex-basis:100%; justify-content:flex-start; }
  #${ROOT_ID} .tpd-status { text-align:left; }
}
@media (max-width:430px) {
  #${ROOT_ID} .tpd-member-row { grid-template-columns:auto repeat(3, minmax(42px,1fr)); }
  #${ROOT_ID} .tpd-member-row > input:nth-of-type(n+4) { grid-column:2 / -1; }
}
`
  document.head.appendChild(style)
}

/**
 * 安装调试面板。只在 DEV 下由 bootGame 动态调用。
 */
export function installDebugTools(ctx: DebugToolsContext): () => void {
  activeDebugCleanup?.()
  injectDebugToolsStyles()

  const root = document.createElement('div')
  root.id = ROOT_ID

  let closed = false
  let badgeTimer: ReturnType<typeof setInterval> | undefined

  const close = (): void => {
    if (closed) return
    closed = true
    ctx.frameStep.setActive(false)
    ctx.frameStep.reset()
    if (badgeTimer !== undefined) clearInterval(badgeTimer)
    window.removeEventListener('keydown', closeOnEscCapture)
    root.remove()
    document.getElementById(STYLE_ID)?.remove()
    if (activeDebugCleanup === close) activeDebugCleanup = undefined
  }
  activeDebugCleanup = close
  // K1：表单字段键入时屏蔽游戏快捷键；Esc 只关 overlay。其余按键透传（不吞游戏对话推进键）。
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
      return
    }
    const target = e.target as HTMLElement | null
    if (target?.matches('input, select, textarea')) e.stopPropagation()
  })
  root.addEventListener('keyup', (e) => {
    const target = e.target as HTMLElement | null
    if (target?.matches('input, select, textarea')) e.stopPropagation()
  })
  // 焦点不在面板内时 Esc 也关 overlay（不触游戏菜单：capture 早于游戏 bubble 监听，且 preventDefault）。
  const closeOnEscCapture = (e: KeyboardEvent): void => {
    if (e.key !== 'Escape') return
    if (root.contains(e.target as Node)) return
    e.preventDefault()
    e.stopPropagation()
    close()
  }
  window.addEventListener('keydown', closeOnEscCapture, { capture: true })

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: { className?: string; html?: string; text?: string } = {},
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    if (attrs.className) node.className = attrs.className
    if (attrs.html !== undefined) node.innerHTML = attrs.html
    if (attrs.text !== undefined) node.textContent = attrs.text
    return node
  }

  const section = (title: string): HTMLElement => {
    const box = el('section', { className: 'tpd-section' })
    box.appendChild(el('h2', { className: 'tpd-section-title', text: title }))
    return box
  }

  const badge = (text: string): HTMLSpanElement => {
    const b = el('span', { className: 'tpd-badge', text })
    b.dataset.state = 'idle'
    return b
  }

  const tabbar = el('div', { className: 'tpd-tabbar' })
  tabbar.setAttribute('role', 'tablist')
  tabbar.setAttribute('aria-label', '调试工具分类')
  tabbar.setAttribute('aria-orientation', 'horizontal')
  const main = el('div', { className: 'tpd-main' })
  const header = el('header', { className: 'tpd-header' })
  const title = el('div', { className: 'tpd-title', text: '仙剑 · 调试' })
  const headerMeta = el('div', { className: 'tpd-header-meta' })
  const runnerBadge = badge('主 runner 空闲')
  const dialogBadge = badge('对话空闲')
  const status = el('div', { className: 'tpd-status' })
  status.setAttribute('role', 'status')
  status.setAttribute('aria-live', 'polite')
  const closeButton = el('button', { className: 'tpd-close', text: '×' })
  closeButton.type = 'button'
  closeButton.setAttribute('aria-label', '关闭调试面板（Esc）')
  closeButton.addEventListener('click', close)
  headerMeta.append(runnerBadge, dialogBadge, status)
  header.append(title, headerMeta, closeButton)

  const body = el('div', { className: 'tpd-body' })
  const panels = new Map<DebugTabId, HTMLDivElement>()
  const tabButtons = new Map<DebugTabId, HTMLButtonElement>()
  let activeTab: DebugTabId = 'status'
  let onBattleTabActivated = (): void => undefined
  const panelFor = (id: DebugTabId): HTMLDivElement => {
    const panel = panels.get(id)
    if (!panel) throw new Error(`调试面板 ${id} 尚未初始化`)
    return panel
  }

  const activateTab = (id: DebugTabId, focus = false): void => {
    activeTab = id
    for (const [candidate, button] of tabButtons) {
      const selected = candidate === id
      button.setAttribute('aria-selected', String(selected))
      button.tabIndex = selected ? 0 : -1
      panelFor(candidate).hidden = !selected
    }
    if (id === 'battle') onBattleTabActivated()
    if (focus) tabButtons.get(id)?.focus()
  }

  DEBUG_TABS.forEach(({ id, label }, index) => {
    const tab = el('button', { className: 'tpd-tab', text: label })
    tab.type = 'button'
    tab.id = `tp-debug-tab-${id}`
    tab.setAttribute('role', 'tab')
    tab.setAttribute('aria-controls', `tp-debug-panel-${id}`)
    tab.addEventListener('click', () => activateTab(id))
    tab.addEventListener('keydown', (event) => {
      const current = DEBUG_TABS.findIndex((entry) => entry.id === activeTab)
      let next = current
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight')
        next = (current + 1) % DEBUG_TABS.length
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft')
        next = (current - 1 + DEBUG_TABS.length) % DEBUG_TABS.length
      else if (event.key === 'Home') next = 0
      else if (event.key === 'End') next = DEBUG_TABS.length - 1
      else return
      event.preventDefault()
      event.stopPropagation()
      const nextTab = DEBUG_TABS[next]
      if (nextTab) activateTab(nextTab.id, true)
    })
    tabButtons.set(id, tab)
    tabbar.appendChild(tab)

    const panel = el('div', { className: 'tpd-panel' })
    panel.id = `tp-debug-panel-${id}`
    panel.setAttribute('role', 'tabpanel')
    panel.setAttribute('aria-labelledby', tab.id)
    panel.tabIndex = 0
    panel.hidden = index !== 0
    panels.set(id, panel)
    body.appendChild(panel)
  })
  activateTab(activeTab)
  main.append(header, tabbar, body)
  root.append(main)

  const refreshBadges = (): void => {
    const busy = ctx.runnerBusy()
    runnerBadge.textContent = busy ? '主 runner 占用中' : '主 runner 空闲'
    runnerBadge.dataset.state = busy ? 'busy' : 'idle'
    const db = ctx.dialogBusy()
    dialogBadge.textContent = db ? '对话进行中' : '对话空闲'
    dialogBadge.dataset.state = db ? 'busy' : 'idle'
  }
  refreshBadges()
  badgeTimer = setInterval(refreshBadges, 500)

  // ── 命令状态行（K3：触发状态上屏） ──
  const setStatus = (text: string, color = '#9fb3c8'): void => {
    status.textContent = text
    status.dataset.tone = debugTone(color)
  }

  // ── 1. cheat console（G4 命令集覆盖矩阵见 docs/phase2/dev-tools.md） ──
  const consoleSection = section('命令控制台')
  const output = el('pre', { className: 'tpd-console' })
  const logLine = (text: string, color = '#c8d4e0'): void => {
    const line = el('span', { className: 'tpd-console-line', text })
    line.dataset.tone = debugTone(color)
    output.appendChild(line)
    output.scrollTop = output.scrollHeight
  }
  const input = el('input') as HTMLInputElement
  input.setAttribute('aria-label', '调试命令')
  input.placeholder = 'help / scene s001 / give 144 5 / run-script shared/xx / battle 0 …'
  consoleSection.appendChild(output)
  consoleSection.appendChild(input)
  panelFor('commands').appendChild(consoleSection)

  // ── 2. 世界变量检视（只读） ──
  const inspectSection = section('世界变量检视（只读）')
  const inspectEl = el('pre', { className: 'tpd-inspector' })
  const refreshInspect = (): void => {
    const w = ctx.world()
    inspectEl.textContent = JSON.stringify(
      {
        money: w.money,
        party: w.party.map((c) => ({
          id: c.id,
          level: c.level,
          hp: `${c.hp}/${c.maxHP}`,
          mp: `${c.mp}/${c.maxMP}`,
          equipment: c.equipment,
          statuses: c.extraStatuses?.map((s) => `${s.status}:${s.turns}`),
          poisons: c.poisons?.map((p) => p.poisonId),
        })),
        inventory: w.inventory,
        learnedSkills: w.learnedSkills,
        collectValue: w.collectValue,
        flags: Object.keys(w.script?.flags ?? {}).length,
        vars: w.script?.vars,
        entityStates: Object.keys(w.script?.entityState ?? {}).length,
      },
      null,
      1,
    )
  }
  refreshInspect()
  const inspectBtn = el('button', { text: '刷新状态' })
  inspectBtn.type = 'button'
  inspectBtn.addEventListener('click', refreshInspect)
  inspectSection.appendChild(inspectEl)
  inspectSection.appendChild(inspectBtn)
  panelFor('status').appendChild(inspectSection)

  // ── 3. 脚本 / 触发器一键触发（K3：detached + 状态上屏 + 占用确认） ──
  const triggerSection = section('脚本 / 触发器（再次点击可取消）')
  const triggerList = el('div', { className: 'tpd-scrollbox tpd-scrollbox-tall' })
  const runningButtons = new Map<string, { abort(): void; text(): string }>()
  let triggerSeq = 0

  const runTriggerItem = (item: TriggerItem): void => {
    const key = `${item.kind}:${item.id}`
    const existing = runningButtons.get(key)
    if (existing) {
      existing.abort()
      return
    }
    if (ctx.presentationBusy()) {
      // K3：主 runner 占用时执行场景切换类脚本须先确认（detached 不排 onEnter）。
      if (
        !window.confirm(
          `主 runner 占用中，仍要执行 ${item.label}？\n(detached 并发不排 onEnter，场景入场脚本可能不跑)`,
        )
      )
        return
    }
    const ac = new AbortController()
    const runId = ++triggerSeq
    setStatus(`[${runId}] ${item.label} … running`, '#8fd0ff')
    const button = el('button', { className: 'tpd-trigger-button', text: `${item.label} ` })
    button.type = 'button'
    button.appendChild(el('span', { className: 'tpd-trigger-kind', text: item.kind }))
    const text = (): string => `${item.label}`
    runningButtons.set(key, { abort: () => ac.abort(), text })
    triggerList.appendChild(button)
    button.addEventListener('click', () => runTriggerItem(item))
    const finish = (statusText: string, color: string): void => {
      runningButtons.delete(key)
      button.remove()
      setStatus(`[${runId}] ${item.label} → ${statusText}`, color)
    }
    const invoke = (runtime: ScriptProjectRuntime, signal: AbortSignal): Promise<unknown> => {
      switch (item.kind) {
        case 'script':
          return runtime.runSharedScript(item.id, { signal })
        case 'trigger':
        case 'auto': {
          const scene = ctx.scene()
          if (!scene) throw new Error('当前场景无 canonical 定义')
          return runtime.runEntityBehavior(scene, item.id, item.kind, { signal })
        }
        case 'hook': {
          const scene = ctx.scene()
          if (!scene) throw new Error('hook 缺少场景定义')
          return runtime.runSceneHook(scene, item.id as 'onEnter' | 'onTeleport', {
            signal,
            runSceneEntry: true,
          })
        }
      }
    }
    void ctx
      .runDetached(ac.signal, (runtime, signal) => invoke(runtime, signal))
      .then(() => finish('done', '#3ddc84'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError')
          finish('cancel', '#ffb020')
        else finish(`error: ${String(error).slice(0, 80)}`, '#ff5f56')
      })
  }

  const renderTriggerList = (): void => {
    triggerList.textContent = ''
    const items: TriggerItem[] = []
    const p = ctx.canonicalProject
    for (const id of Object.keys(p.sharedScripts ?? {})) {
      items.push({ kind: 'script', id, label: `shared/${id}` })
    }
    const scene = ctx.scene()
    if (scene) {
      for (const e of scene.entities) {
        const page = e.pages?.[0]
        const act = page?.triggerActivation
        if (page?.trigger && act?.on)
          items.push({
            kind: 'trigger',
            id: e.id,
            label: `${e.id} [${act.on}${act.range !== undefined ? ` r${act.range}` : ''}]`,
            scene: scene.id,
          })
        if (page?.auto)
          items.push({ kind: 'auto', id: e.id, label: `${e.id} [auto]`, scene: scene.id })
      }
      if (scene.hooks?.onEnter?.variants)
        items.push({ kind: 'hook', id: 'onEnter', label: `${scene.id} onEnter` })
      if (scene.hooks?.onTeleport?.variants)
        items.push({ kind: 'hook', id: 'onTeleport', label: `${scene.id} onTeleport` })
    }
    for (const item of items) {
      const button = el('button', { className: 'tpd-trigger-button', text: `${item.label} ` })
      button.type = 'button'
      button.appendChild(el('span', { className: 'tpd-trigger-kind', text: item.kind }))
      button.addEventListener('click', () => runTriggerItem(item))
      triggerList.appendChild(button)
    }
    logLine(
      `[triggers] ${items.length} 项：shared ${Object.keys(p.sharedScripts ?? {}).length} / 场景实体 / hooks`,
    )
  }
  renderTriggerList()
  const refreshTriggers = el('button', { text: '刷新列表' })
  refreshTriggers.type = 'button'
  refreshTriggers.addEventListener('click', renderTriggerList)
  triggerSection.appendChild(triggerList)
  const triggerActions = el('div', { className: 'tpd-actions' })
  triggerActions.appendChild(refreshTriggers)
  triggerSection.appendChild(triggerActions)
  panelFor('triggers').appendChild(triggerSection)

  // ── 4. 战斗态构建器（K2：partyPreset 快照回滚在 startBattle 内；此处只组参数） ──
  const battleSection = section('战斗态构建器（内存态，结束后回战前世界）')
  const battleForm = el('div', { className: 'tpd-battle-form' })

  const fieldSel = el('select') as HTMLSelectElement
  fieldSel.setAttribute('aria-label', '战场')
  const fields = ctx.canonicalProject.battleFields ?? []
  if (fields.length) {
    for (const f of fields) {
      const option = el('option', { text: `${f.id} ${f.background ?? ''}` })
      option.value = String(f.id)
      fieldSel.appendChild(option)
    }
  } else {
    const option = el('option', { text: '24 默认' })
    option.value = '24'
    fieldSel.appendChild(option)
  }

  const enemyModeTeam = el('input', {}) as HTMLInputElement
  enemyModeTeam.type = 'radio'
  enemyModeTeam.name = 'enemy-mode'
  enemyModeTeam.id = 'tp-debug-enemy-team'
  enemyModeTeam.checked = true
  const enemyModeCustom = el('input', {}) as HTMLInputElement
  enemyModeCustom.type = 'radio'
  enemyModeCustom.name = 'enemy-mode'
  enemyModeCustom.id = 'tp-debug-enemy-custom'
  const teamSel = el('select') as HTMLSelectElement
  teamSel.setAttribute('aria-label', '现成敌队')
  for (const id of Object.keys(ctx.canonicalProject.enemyTeamsById)) {
    teamSel.appendChild(el('option', { text: id }))
  }
  const enemyList = el('div', { className: 'tpd-scrollbox tpd-scrollbox-compact' })
  enemyList.hidden = true
  const enemyChecks = new Map<string, HTMLInputElement>()
  for (const id of Object.keys(ctx.canonicalProject.enemiesById)) {
    const row = el('label', { className: 'tpd-option' })
    const cb = el('input', {}) as HTMLInputElement
    cb.type = 'checkbox'
    cb.value = id
    row.appendChild(cb)
    row.appendChild(document.createTextNode(` ${id}`))
    enemyChecks.set(id, cb)
    enemyList.appendChild(row)
  }
  enemyModeCustom.addEventListener('change', () => {
    enemyList.hidden = !enemyModeCustom.checked
    teamSel.disabled = enemyModeCustom.checked
  })
  enemyModeTeam.addEventListener('change', () => {
    enemyList.hidden = true
    teamSel.disabled = false
  })

  const partyList = el('div', { className: 'tpd-scrollbox tpd-scrollbox-compact' })
  const partyChecks = new Map<string, HTMLInputElement>()
  for (const id of Object.keys(ctx.canonicalProject.actorsById)) {
    const row = el('label', { className: 'tpd-option' })
    const cb = el('input', {}) as HTMLInputElement
    cb.type = 'checkbox'
    cb.value = id
    row.appendChild(cb)
    row.appendChild(document.createTextNode(` ${id}`))
    partyChecks.set(id, cb)
    partyList.appendChild(row)
  }

  const memberOverrides = el('div', { className: 'tpd-scrollbox tpd-scrollbox-tall' })
  memberOverrides.hidden = true
  const renderMemberOverrides = (): void => {
    memberOverrides.textContent = ''
    for (const [id, cb] of partyChecks) {
      if (!cb.checked) continue
      const row = el('div', { className: 'tpd-member-row' })
      row.appendChild(el('span', { text: id }))
      const lv = el('input', {}) as HTMLInputElement
      lv.type = 'number'
      lv.placeholder = '模板'
      lv.setAttribute('aria-label', `${id} 等级`)
      const hp = el('input', {}) as HTMLInputElement
      hp.type = 'number'
      hp.placeholder = 'HP'
      hp.setAttribute('aria-label', `${id} HP`)
      const mp = el('input', {}) as HTMLInputElement
      mp.type = 'number'
      mp.placeholder = 'MP'
      mp.setAttribute('aria-label', `${id} MP`)
      const equip = el('input', {}) as HTMLInputElement
      equip.placeholder = '装:slot=item,..'
      equip.setAttribute('aria-label', `${id} 装备`)
      const statuses = el('input', {}) as HTMLInputElement
      statuses.placeholder = '态:protect,..'
      statuses.setAttribute('aria-label', `${id} 状态`)
      const poisons = el('input', {}) as HTMLInputElement
      poisons.placeholder = '毒:id,..'
      poisons.setAttribute('aria-label', `${id} 中毒`)
      row.appendChild(lv)
      row.appendChild(hp)
      row.appendChild(mp)
      const extras = el('div', { className: 'tpd-member-extra' })
      extras.append(equip, statuses, poisons)
      row.appendChild(extras)
      const data = { lv, hp, mp, equip, statuses, poisons }
      row.dataset.member = id
      ;(row as HTMLDivElement & { _d?: typeof data })._d = data
      memberOverrides.appendChild(row)
    }
    memberOverrides.hidden = memberOverrides.childElementCount === 0
  }
  partyList.addEventListener('change', renderMemberOverrides)

  const invInput = el('input') as HTMLInputElement
  invInput.setAttribute('aria-label', '道具预设')
  invInput.placeholder = '道具预设 itemId×count,itemId×count'

  const startBattleBtn = el('button', { text: '⚔ 开战' })
  startBattleBtn.type = 'button'
  startBattleBtn.addEventListener('click', () => {
    const customEnemies = enemyModeCustom.checked
      ? [...enemyChecks.entries()].filter(([, cb]) => cb.checked).map(([id]) => id)
      : undefined
    const actorIds = [...partyChecks.entries()].filter(([, cb]) => cb.checked).map(([id]) => id)
    const seedStats: Record<string, { hp?: number; mp?: number }> = {}
    const presetMembers: DebugPresetMember[] = []
    for (const row of memberOverrides.children) {
      const label = row as HTMLDivElement & {
        _d?: {
          lv: HTMLInputElement
          hp: HTMLInputElement
          mp: HTMLInputElement
          equip: HTMLInputElement
          statuses: HTMLInputElement
          poisons: HTMLInputElement
        }
      }
      const d = label._d
      const id = label.dataset.member
      if (!d || !id) continue
      const lv = d.lv.value ? Number(d.lv.value) : undefined
      const hp = d.hp.value ? Number(d.hp.value) : undefined
      const mp = d.mp.value ? Number(d.mp.value) : undefined
      seedStats[id] = { ...(hp !== undefined ? { hp } : {}), ...(mp !== undefined ? { mp } : {}) }
      presetMembers.push({
        actorId: id,
        ...(lv !== undefined ? { level: lv } : {}),
        ...(d.equip.value ? { equipment: d.equip.value } : {}),
        ...(d.statuses.value ? { statuses: d.statuses.value } : {}),
        ...(d.poisons.value ? { poisons: d.poisons.value } : {}),
      })
    }
    const inventory = parseInventoryPreset(invInput.value)
    const fieldId = Number(fieldSel.value)
    if (!Number.isFinite(fieldId)) {
      setStatus('战场 id 必须是有限数字', '#ff5f56')
      return
    }
    if (!actorIds.length) {
      setStatus('请至少选择一名我方成员', '#ff5f56')
      return
    }
    if (!customEnemies && !teamSel.value) {
      setStatus('请选择敌队或自定义敌人', '#ff5f56')
      return
    }
    const ac = new AbortController()
    const preset = ctx.buildPresetParty(actorIds, seedStats)
    applyPresetOverrides(preset.party, presetMembers)
    setStatus('战斗启动中…', '#8fd0ff')
    void ctx
      .startBattleDev(
        {
          enemyTeamId: customEnemies ? 'debug-custom' : teamSel.value,
          ...(customEnemies ? { enemyOverride: customEnemies } : {}),
          ...(inventory.length
            ? { partyPreset: { ...preset, inventory } }
            : { partyPreset: preset }),
          ...(fields.length ? { fieldId } : {}),
        },
        ac.signal,
      )
      .then((r) => setStatus(`战斗结束: ${r}（世界已恢复战前）`, '#3ddc84'))
      .catch((error: unknown) =>
        setStatus(`战斗失败/取消: ${String(error).slice(0, 80)}`, '#ff5f56'),
      )
  })

  const resetBtn = el('button', { text: '清空表单' })
  resetBtn.type = 'button'
  resetBtn.addEventListener('click', () => {
    for (const [, cb] of enemyChecks) cb.checked = false
    for (const [, cb] of partyChecks) cb.checked = false
    enemyModeTeam.checked = true
    teamSel.disabled = false
    enemyList.hidden = true
    invInput.value = ''
    renderMemberOverrides()
  })

  const row = (label: string, node: HTMLElement): HTMLDivElement => {
    const r = el('div', { className: 'tpd-row' })
    r.appendChild(el('span', { className: 'tpd-row-label', text: label }))
    r.appendChild(node)
    return r
  }
  battleForm.appendChild(row('战场', fieldSel))
  const enemyModeRow = el('div', { className: 'tpd-inline-options' })
  const teamLabel = el('label', { className: 'tpd-inline-label' })
  teamLabel.appendChild(enemyModeTeam)
  teamLabel.appendChild(document.createTextNode('现成敌队'))
  const customLabel = el('label', { className: 'tpd-inline-label' })
  customLabel.appendChild(enemyModeCustom)
  customLabel.appendChild(document.createTextNode('自定义敌人'))
  enemyModeRow.appendChild(teamLabel)
  enemyModeRow.appendChild(teamSel)
  enemyModeRow.appendChild(customLabel)
  battleForm.appendChild(enemyModeRow)
  battleForm.appendChild(enemyList)
  battleForm.appendChild(row('我方', partyList))
  battleForm.appendChild(memberOverrides)
  battleForm.appendChild(row('道具', invInput))
  const btnRow = el('div', { className: 'tpd-actions' })
  btnRow.appendChild(startBattleBtn)
  btnRow.appendChild(resetBtn)
  battleForm.appendChild(btnRow)
  battleSection.appendChild(battleForm)
  panelFor('battle').appendChild(battleSection)
  onBattleTabActivated = () => {
    enemyList.hidden = !enemyModeCustom.checked
    teamSel.disabled = enemyModeCustom.checked
    if (
      memberOverrides.childElementCount === 0 &&
      [...partyChecks.values()].some((checkbox) => checkbox.checked)
    )
      renderMemberOverrides()
  }

  // ── 5. 图层开关 + 帧步进（K5） ──
  const layersSection = section('图层 / 帧步进')
  const collisionCb = el('input', {}) as HTMLInputElement
  collisionCb.type = 'checkbox'
  collisionCb.checked = ctx.layers.collision
  collisionCb.addEventListener('change', () => {
    ctx.layers.collision = collisionCb.checked
  })
  const triggerCb = el('input', {}) as HTMLInputElement
  triggerCb.type = 'checkbox'
  triggerCb.checked = ctx.layers.triggers
  triggerCb.addEventListener('change', () => {
    ctx.layers.triggers = triggerCb.checked
  })
  const stepCb = el('input', {}) as HTMLInputElement
  stepCb.type = 'checkbox'
  stepCb.checked = ctx.frameStep.active
  stepCb.addEventListener('change', () => {
    ctx.frameStep.setActive(stepCb.checked)
  })
  const stepBtn = el('button', { text: '▶ 单步（一拍 = 100ms）' })
  stepBtn.type = 'button'
  stepBtn.addEventListener('click', () => {
    if (!ctx.frameStep.active) {
      ctx.frameStep.setActive(true)
      stepCb.checked = true
    }
    ctx.frameStep.requestStep()
  })
  const note = el('div', {
    className: 'tpd-note',
    text: '帧步进作用域 = 大世界 gameplay 相位（移动 / 实体 / auto 脚本）；战斗、演出、对话推进不单步。',
  })
  const lrow = (label: string, cb: HTMLElement): HTMLLabelElement => {
    const r = el('label', { className: 'tpd-toggle' })
    r.appendChild(cb)
    r.appendChild(el('span', { text: label }))
    return r
  }
  layersSection.appendChild(lrow('碰撞叠加层(?collision)', collisionCb))
  layersSection.appendChild(lrow('触发区叠加层', triggerCb))
  layersSection.appendChild(lrow('帧步进（暂停墙钟，手动单步）', stepCb))
  const stepRow = el('div', { className: 'tpd-actions' })
  stepRow.appendChild(stepBtn)
  layersSection.appendChild(stepRow)
  layersSection.appendChild(note)
  panelFor('layers').appendChild(layersSection)

  // ── 命令解析（G4 覆盖矩阵见 docs/phase2/dev-tools.md） ──
  const runCommand = (line: string): void => {
    const parts = line.trim().split(/\s+/)
    const cmd = (parts[0] ?? '').toLowerCase()
    const arg = (i: number): string | undefined => parts[i]
    const signal = new AbortController()
    const detached = <T>(
      invoke: (runtime: ScriptProjectRuntime, s: AbortSignal) => Promise<T>,
    ): Promise<T> => ctx.runDetached(signal.signal, invoke)
    const sceneSwitch = (): boolean =>
      cmd === 'scene' || cmd === 'run-script' || cmd === 'run-trigger'

    if (cmd === 'help') {
      logLine('help | scene <id> [col,row] [facing] | pos <col,row> [facing] | give <itemId> [n]')
      logLine('money <n> | party <id,..> | skill <actorId> <skillId> | battle <team> | field <n>')
      logLine('run-script <id> | run-trigger <entityId> | step | collision | triggers | state')
      return
    }
    if (sceneSwitch() && ctx.presentationBusy()) {
      if (!window.confirm('主 runner 占用中，仍要执行？(detached 不排 onEnter)')) return
    }
    switch (cmd) {
      case 'scene': {
        const id = arg(1)
        if (!id) {
          logLine('用法: scene <sceneId> [col,row] [facing]', '#ffb020')
          return
        }
        const pos = parseDebugPosition(arg(2))
        const facing = arg(3) as 'up' | 'down' | 'left' | 'right' | undefined
        setStatus(`scene ${id} …`, '#8fd0ff')
        void detached((runtime, s) =>
          runtime.runCommands(
            pos
              ? [
                  {
                    kind: 'loadScene' as const,
                    scene: id,
                    pos,
                    ...(facing ? { facing } : {}),
                  },
                ]
              : [{ kind: 'loadScene' as const, scene: id, ...(facing ? { facing } : {}) }],
            { signal: s },
          ),
        )
          .then(() => setStatus(`scene ${id} done`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`scene ${id}: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'pos': {
        const pos = parseDebugPosition(arg(1))
        if (!pos) {
          logLine('用法: pos <col,row> [facing]', '#ffb020')
          return
        }
        const facing = arg(2) as 'up' | 'down' | 'left' | 'right' | undefined
        void detached((runtime, s) =>
          runtime.runCommands(
            [
              {
                kind: 'teleportParty',
                pos,
                ...(facing ? { facing } : {}),
              },
            ],
            { signal: s },
          ),
        )
          .then(() => setStatus('pos done', '#3ddc84'))
          .catch((e: unknown) => setStatus(`pos: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'give': {
        const itemId = arg(1)
        if (!itemId) {
          logLine('用法: give <itemId> [count]', '#ffb020')
          return
        }
        const count = Number(arg(2) ?? 1)
        void detached((runtime, s) =>
          runtime.runCommands([{ kind: 'giveItem', itemId, count }], { signal: s }),
        )
          .then(() => setStatus(`give ${itemId} ×${count} done（内存态）`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`give: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'money': {
        const n = Number(arg(1))
        if (!Number.isFinite(n)) {
          logLine('用法: money <n>', '#ffb020')
          return
        }
        const delta = n - ctx.world().money
        void detached((runtime, s) =>
          runtime.runCommands([{ kind: 'giveMoney', delta }], { signal: s }),
        )
          .then(() => setStatus(`money ${n} done（内存态）`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`money: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'party': {
        const members = (arg(1) ?? '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
        if (!members.length) {
          logLine('用法: party <actorId,actorId,…>', '#ffb020')
          return
        }
        ctx.setParty(members)
        setStatus(`party ${members.join(',')} done（内存态，满血满蓝）`, '#3ddc84')
        refreshInspect()
        return
      }
      case 'skill': {
        const actorId = arg(1)
        const skillId = arg(2)
        if (!actorId || !skillId) {
          logLine('用法: skill <actorId> <skillId>', '#ffb020')
          return
        }
        ctx.grantSkill(actorId, skillId)
        setStatus(`skill ${actorId} ← ${skillId} done（内存态）`, '#3ddc84')
        refreshInspect()
        return
      }
      case 'battle': {
        const enemyTeamId = arg(1)
        if (!enemyTeamId) {
          logLine('用法: battle <enemyTeamId>', '#ffb020')
          return
        }
        setStatus(`battle ${enemyTeamId} …`, '#8fd0ff')
        void ctx
          .startBattleDev({ enemyTeamId }, new AbortController().signal)
          .then((r) => setStatus(`battle done: ${r}`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`battle: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'run-script': {
        const id = arg(1)
        if (!id) {
          logLine('用法: run-script <scriptId>', '#ffb020')
          return
        }
        setStatus(`run-script ${id} …`, '#8fd0ff')
        void detached((runtime, s) => runtime.runSharedScript(id, { signal: s }))
          .then(() => setStatus(`run-script ${id} done`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`run-script: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'run-trigger': {
        const id = arg(1)
        if (!id) {
          logLine('用法: run-trigger <entityId>', '#ffb020')
          return
        }
        setStatus(`run-trigger ${id} …`, '#8fd0ff')
        void detached((runtime, s) => {
          const scene = ctx.scene()
          if (!scene) return Promise.reject(new Error('当前场景无 canonical 定义'))
          return runtime.runEntityBehavior(scene, id, 'trigger', { signal: s })
        })
          .then((ran) => setStatus(`run-trigger ${id} → ${ran ? 'ran' : '未命中'}`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`run-trigger: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'step':
        ctx.frameStep.requestStep()
        setStatus('step 一拍', '#3ddc84')
        return
      case 'collision':
        ctx.layers.collision = !ctx.layers.collision
        collisionCb.checked = ctx.layers.collision
        setStatus(`collision ${ctx.layers.collision ? 'on' : 'off'}`, '#3ddc84')
        return
      case 'triggers':
        ctx.layers.triggers = !ctx.layers.triggers
        triggerCb.checked = ctx.layers.triggers
        setStatus(`triggers ${ctx.layers.triggers ? 'on' : 'off'}`, '#3ddc84')
        return
      case 'state':
        refreshInspect()
        setStatus('state 已刷新', '#3ddc84')
        return
      default:
        logLine(`未知命令: ${cmd}（help 查看）`, '#ffb020')
    }
  }

  input.addEventListener('keydown', (e) => {
    e.stopPropagation()
    if (e.key === 'Enter') {
      const line = input.value.trim()
      if (line) {
        logLine(`> ${line}`)
        runCommand(line)
      }
      input.value = ''
    } else if (e.key === 'Escape') {
      e.preventDefault()
      close()
    }
  })

  document.body.appendChild(root)
  tabButtons.get(activeTab)?.focus()

  return close
}

function debugTone(color: string): 'success' | 'warn' | 'error' | 'info' | '' {
  switch (color.toLowerCase()) {
    case '#3ddc84':
      return 'success'
    case '#ffb020':
      return 'warn'
    case '#ff5f56':
      return 'error'
    case '#8fd0ff':
      return 'info'
    default:
      return ''
  }
}

function parseDebugPosition(
  raw: string | undefined,
): { col: number; row: number; height: 0 } | undefined {
  if (!raw) return undefined
  const parts = raw.split(',').map(Number)
  if (parts.length !== 2) return undefined
  const [col, row] = parts
  if (col === undefined || row === undefined || !Number.isFinite(col) || !Number.isFinite(row))
    return undefined
  return { col, row, height: 0 }
}

function parseInventoryPreset(raw: string): { itemId: string; count: number }[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [itemId, countRaw] = entry.split('×')
      const count = countRaw ? Number(countRaw) : 5
      return { itemId: itemId?.trim() ?? '', count: Number.isFinite(count) ? count : 5 }
    })
    .filter((x) => x.itemId)
}

function applyPresetOverrides(party: CharacterInstance[], members: DebugPresetMember[]): void {
  for (const m of members) {
    const inst = party.find((c) => c.id === m.actorId || c.template === m.actorId)
    if (!inst) continue
    if (m.level !== undefined) inst.level = m.level
    if (m.equipment) {
      inst.equipment = {}
      for (const pair of m.equipment.split(',')) {
        const [slot, item] = pair.split('=')
        if (slot && item) inst.equipment[slot.trim()] = item.trim()
      }
    }
    if (m.statuses) {
      inst.extraStatuses = m.statuses
        .split(',')
        .map((s) => s.trim())
        .filter(isCarryableStatusId)
        .map((status) => ({ status, turns: 7 }))
    }
    if (m.poisons) {
      inst.poisons = m.poisons
        .split(',')
        .map((s) => Number(s.trim()))
        .filter(Number.isFinite)
        .map((poisonId): ActivePoison => ({ poisonId, tickIndex: 0 }))
    }
  }
}
