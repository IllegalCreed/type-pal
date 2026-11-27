/** DEV tools installed through bootGame's guarded dynamic import.
 * Disposing the panel releases its listeners and aborts its own operations. Direct world
 * edits remain part of the active world and may be included in a later normal save.
 */
import type {
  ActivePoison,
  CharacterInstance,
  Facing,
  GridPos,
  RuntimeSceneDef,
  WalkSpeed,
  WorldState,
} from '@type-pal/content'
import { emptyWorldScriptState, isCarryableStatusId } from '@type-pal/content'
import { isAbortError } from './async-intent.js'
import type { BattleResult } from './battle/battle-result.js'
import { createDebugInspector } from './debug-tools-inspector.js'
import {
  createDebugElement as el,
  injectDebugToolsStyles,
  ROOT_ID,
  STYLE_ID,
  createDebugSection as section,
} from './debug-tools-styles.js'
import type { WorldPreset } from './dev-preset.js'
import type { LoadedCurrentProject } from './project-loader.js'
import { runtimeSceneView } from './runtime-project-view.js'
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

export type DebugMotionAuthority =
  | { kind: 'world' | 'script' | 'follow' }
  | { kind: 'mount'; parent: string; dx: number; dy: number }

export interface DebugRegisteredMotion {
  source: 'script' | 'auto'
  kind: 'move' | 'step' | 'chase'
  commandEpoch: number
  sceneSessionId: string
  activationOwnerId?: string
  activationEpoch?: number
  authorityEpochAtEnqueue?: number
  pausedByAuthority: boolean
}

export interface DebugMotionSnapshot {
  scene: string
  worldTick: number
  player: {
    id: string
    template: string
    pos: GridPos
    facing: Facing
    walking: boolean
    authority: Exclude<DebugMotionAuthority, { kind: 'follow' }>
    authorityEpoch: number
    partyMove?: { to: GridPos; speed: WalkSpeed }
  }
  followers: Array<{
    partyIndex: number
    id: string
    template: string
    pos: GridPos
    facing: Facing
    authority: Exclude<DebugMotionAuthority, { kind: 'world' }>
  }>
  extraFollowers: Array<{
    runtimeSlot: number
    spriteId: string
    pos: GridPos
    facing: Facing
    authority: { kind: 'follow' }
    renderable: boolean
  }>
  entities: Array<{
    id: string
    pos: GridPos
    facing: Facing
    authority: Exclude<DebugMotionAuthority, { kind: 'follow' }>
    authorityEpoch: number
    scriptMotion?: DebugRegisteredMotion
    autoMotion?: DebugRegisteredMotion
    gait: number | null
    gates: {
      visible: boolean
      collidable: boolean
      manualInteractable: boolean
      touchTriggerable: boolean
      autoAllowed: boolean
      hostileAllowed: boolean
    }
  }>
  pendingTouch: boolean
  pendingChase: string[]
  hostileBusy: boolean
  runnerActive: boolean
}

interface DebugPresetMember {
  actorId: string
  level?: number
  /** "slotId=itemId,slotId=itemId" */
  equipment?: string
  /** 逗号分隔的 extraStatuses status id（如 protect） */
  statuses?: string
  /** 逗号分隔的 poison id（数字） */
  poisons?: string
}

export interface DebugToolsContext {
  world(): WorldState
  motionState(): DebugMotionSnapshot
  /** current canonical 场景定义（触发器/脚本枚举与触发用）。 */
  scene(): RuntimeSceneDef | undefined
  canonicalProject: Pick<
    LoadedCurrentProject,
    'sharedScripts' | 'battleFields' | 'enemyTeamsById' | 'enemiesById' | 'actorsById'
  >
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
}

type TriggerItem =
  | { kind: 'script'; id: string; label: string }
  | { kind: 'trigger' | 'auto'; id: string; label: string; sceneId: string }
  | { kind: 'hook'; id: 'onEnter' | 'onTeleport'; label: string; sceneId: string }

type DebugTabId = 'status' | 'commands' | 'triggers' | 'battle' | 'layers'

const DEBUG_TABS: readonly { id: DebugTabId; label: string }[] = [
  { id: 'status', label: '状态' },
  { id: 'commands', label: '指令' },
  { id: 'triggers', label: '触发' },
  { id: 'battle', label: '战斗' },
  { id: 'layers', label: '图层' },
]

let activeDebugCleanup: (() => void) | undefined

/**
 * 安装调试面板。只在 DEV 下由 bootGame 动态调用。
 */
export function installDebugTools(ctx: DebugToolsContext): () => void {
  activeDebugCleanup?.()
  injectDebugToolsStyles()
  const ownedStyle = document.getElementById(STYLE_ID)

  const root = document.createElement('div')
  root.id = ROOT_ID

  let hidden = false
  let disposed = false
  let badgeTimer: ReturnType<typeof setInterval> | undefined
  const panelOperations = new Set<AbortController>()

  const stopBadgePolling = (): void => {
    if (badgeTimer === undefined) return
    clearInterval(badgeTimer)
    badgeTimer = undefined
  }
  const hidePanel = (): void => {
    if (disposed || hidden) return
    hidden = true
    ctx.frameStep.setActive(false)
    ctx.frameStep.reset()
    stopBadgePolling()
    const focused = document.activeElement
    if (focused instanceof HTMLElement && root.contains(focused)) focused.blur()
    root.hidden = true
  }
  const showPanel = (): void => {
    if (disposed || !hidden) return
    hidden = false
    root.hidden = false
    refreshInspect()
    startBadgePolling()
    tabButtons.get(activeTab)?.focus()
  }
  const dispose = (): void => {
    if (disposed) return
    if (!hidden) hidePanel()
    disposed = true
    stopBadgePolling()
    for (const operation of panelOperations) operation.abort()
    panelOperations.clear()
    window.removeEventListener('keydown', onControllerKeyDown, true)
    root.remove()
    if (ownedStyle?.isConnected && document.getElementById(STYLE_ID) === ownedStyle)
      ownedStyle.remove()
    if (activeDebugCleanup === dispose) activeDebugCleanup = undefined
  }
  activeDebugCleanup = dispose

  const editableTarget = (target: EventTarget | null): boolean => {
    if (!(target instanceof Element)) return false
    return (
      target.closest('input,select,textarea,[contenteditable]:not([contenteditable="false"])') !==
      null
    )
  }
  function onControllerKeyDown(event: KeyboardEvent): void {
    if (disposed) return
    if (!hidden && event.key === 'Escape') {
      event.preventDefault()
      event.stopImmediatePropagation()
      hidePanel()
      return
    }
    if (
      !hidden ||
      event.code !== 'Backquote' ||
      event.repeat ||
      event.isComposing ||
      event.shiftKey ||
      event.ctrlKey ||
      event.altKey ||
      event.metaKey ||
      editableTarget(event.target)
    )
      return
    event.preventDefault()
    event.stopImmediatePropagation()
    showPanel()
  }
  window.addEventListener('keydown', onControllerKeyDown, { capture: true })

  // K1：表单字段键入时屏蔽游戏快捷键。Esc 由唯一 controller capture listener 处理。
  root.addEventListener('keydown', (e) => {
    const target = e.target as HTMLElement | null
    if (target?.matches('input, select, textarea')) e.stopPropagation()
  })
  root.addEventListener('keyup', (e) => {
    const target = e.target as HTMLElement | null
    if (target?.matches('input, select, textarea')) e.stopPropagation()
  })
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
  closeButton.addEventListener('click', hidePanel)
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
  function startBadgePolling(): void {
    if (badgeTimer !== undefined || disposed || hidden) return
    refreshBadges()
    badgeTimer = setInterval(refreshBadges, 500)
  }
  startBadgePolling()

  // ── 命令状态行（K3：触发状态上屏） ──
  const setStatus = (text: string, color = '#9fb3c8'): void => {
    if (disposed) return
    status.textContent = text
    status.dataset.tone = debugTone(color)
  }
  const createPanelOperation = (): AbortController => {
    const controller = new AbortController()
    panelOperations.add(controller)
    return controller
  }
  const runPanelOperation = <T>(invoke: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const controller = createPanelOperation()
    try {
      return invoke(controller.signal).finally(() => panelOperations.delete(controller))
    } catch (error) {
      panelOperations.delete(controller)
      return Promise.reject(error)
    }
  }

  // ── 1. cheat console（G4 命令集覆盖矩阵见 docs/phase2/guides/debug-tools.md） ──
  const consoleSection = section('命令控制台')
  const output = el('pre', { className: 'tpd-console' })
  const logLine = (text: string, color = '#c8d4e0'): void => {
    const line = el('span', { className: 'tpd-console-line', text })
    line.dataset.tone = debugTone(color)
    output.appendChild(line)
    output.scrollTop = output.scrollHeight
  }
  const input = el('input')
  input.setAttribute('aria-label', '调试命令')
  input.placeholder = 'help / scene s001 / give 144 5 / run-script shared/xx / battle 0 …'
  consoleSection.appendChild(output)
  consoleSection.appendChild(input)
  panelFor('commands').appendChild(consoleSection)

  const inspector = createDebugInspector(
    () => ctx.world(),
    () => ctx.motionState(),
  )
  const refreshInspect = inspector.refresh
  panelFor('status').append(inspector.motionSection, inspector.inspectSection)

  // ── 3. 脚本 / 触发器一键触发（K3：detached + 状态上屏 + 占用确认） ──
  const triggerSection = section('脚本 / 触发器（再次点击可取消）')
  const triggerList = el('div', { className: 'tpd-scrollbox tpd-scrollbox-tall' })
  const runningTriggers = new Map<
    string,
    { controller: AbortController; button: HTMLButtonElement }
  >()
  let triggerSeq = 0

  const runTriggerItem = (item: TriggerItem): void => {
    const key = JSON.stringify(
      item.kind === 'script' ? [item.kind, item.id] : [item.kind, item.sceneId, item.id],
    )
    const existing = runningTriggers.get(key)
    if (existing) {
      existing.controller.abort()
      return
    }
    if (ctx.presentationBusy()) {
      if (
        !window.confirm(
          `主 runner 占用中，仍要执行 ${item.label}？\n已有 runner 时，本次调用不负责接续入场脚本。`,
        )
      )
        return
    }
    let invoke: (runtime: ScriptProjectRuntime, signal: AbortSignal) => Promise<boolean>
    if (item.kind === 'script') {
      invoke = async (runtime, signal) => {
        await runtime.runSharedScript(item.id, { signal })
        return true
      }
    } else {
      const scene = ctx.scene()
      if (scene?.id !== item.sceneId) {
        const reason = scene ? '场景已切换，请刷新列表' : '当前场景无 canonical 定义'
        setStatus(`${item.label} → error: ${reason}`, '#ff5f56')
        return
      }
      invoke =
        item.kind === 'hook'
          ? (runtime, signal) =>
              runtime.runSceneHook(scene, item.id, { signal, runSceneEntry: true })
          : (runtime, signal) => runtime.runEntityBehavior(scene, item.id, item.kind, { signal })
    }
    const ac = createPanelOperation()
    const runId = ++triggerSeq
    setStatus(`[${runId}] ${item.label} … running`, '#8fd0ff')
    const runningLabel = item.kind === 'script' ? item.label : `${item.label} (${item.sceneId})`
    const button = el('button', { className: 'tpd-trigger-button', text: `${runningLabel} ` })
    button.type = 'button'
    button.appendChild(el('span', { className: 'tpd-trigger-kind', text: item.kind }))
    runningTriggers.set(key, { controller: ac, button })
    triggerList.appendChild(button)
    button.addEventListener('click', () => runTriggerItem(item))
    const finish = (statusText: string, color: string): void => {
      panelOperations.delete(ac)
      runningTriggers.delete(key)
      button.remove()
      setStatus(`[${runId}] ${item.label} → ${statusText}`, color)
    }
    void ctx
      .runDetached(ac.signal, invoke)
      .then((ran) => {
        if (ran === false) finish('未命中', '#ffb020')
        else finish('done', '#3ddc84')
      })
      .catch((error: unknown) => {
        if (isAbortError(error)) finish('cancel', '#ffb020')
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
      const view = runtimeSceneView(scene, ctx.world().script ?? emptyWorldScriptState())
      for (const entity of view.entities) {
        const page = entity.pages?.[0]
        const trigger = page?.trigger
        if (trigger)
          items.push({
            kind: 'trigger',
            id: entity.id,
            label: `${entity.id} [${trigger.on}${trigger.range !== undefined ? ` r${trigger.range}` : ''}]`,
            sceneId: scene.id,
          })
        if (page?.auto)
          items.push({
            kind: 'auto',
            id: entity.id,
            label: `${entity.id} [auto]`,
            sceneId: scene.id,
          })
      }
      for (const slot of ['onEnter', 'onTeleport'] as const) {
        if (view[slot])
          items.push({ kind: 'hook', id: slot, label: `${scene.id} ${slot}`, sceneId: scene.id })
      }
    }
    for (const item of items) {
      const button = el('button', { className: 'tpd-trigger-button', text: `${item.label} ` })
      button.type = 'button'
      button.appendChild(el('span', { className: 'tpd-trigger-kind', text: item.kind }))
      button.addEventListener('click', () => runTriggerItem(item))
      triggerList.appendChild(button)
    }
    for (const { button } of runningTriggers.values()) triggerList.appendChild(button)
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

  const fieldSel = el('select')
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

  const enemyModeTeam = el('input')
  enemyModeTeam.type = 'radio'
  enemyModeTeam.name = 'enemy-mode'
  enemyModeTeam.id = 'tp-debug-enemy-team'
  enemyModeTeam.checked = true
  const enemyModeCustom = el('input')
  enemyModeCustom.type = 'radio'
  enemyModeCustom.name = 'enemy-mode'
  enemyModeCustom.id = 'tp-debug-enemy-custom'
  const teamSel = el('select')
  teamSel.setAttribute('aria-label', '现成敌队')
  for (const id of Object.keys(ctx.canonicalProject.enemyTeamsById)) {
    teamSel.appendChild(el('option', { text: id }))
  }
  const enemyList = el('div', { className: 'tpd-scrollbox tpd-scrollbox-compact' })
  enemyList.hidden = true
  const enemyChecks = new Map<string, HTMLInputElement>()
  for (const id of Object.keys(ctx.canonicalProject.enemiesById)) {
    const row = el('label', { className: 'tpd-option' })
    const cb = el('input')
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
    const cb = el('input')
    cb.type = 'checkbox'
    cb.value = id
    row.appendChild(cb)
    row.appendChild(document.createTextNode(` ${id}`))
    partyChecks.set(id, cb)
    partyList.appendChild(row)
  }

  const memberOverrides = el('div', { className: 'tpd-scrollbox tpd-scrollbox-tall' })
  memberOverrides.hidden = true
  const memberFields = new Map<
    string,
    {
      level: HTMLInputElement
      hp: HTMLInputElement
      mp: HTMLInputElement
      equipment: HTMLInputElement
      statuses: HTMLInputElement
      poisons: HTMLInputElement
    }
  >()
  const renderMemberOverrides = (): void => {
    memberOverrides.textContent = ''
    memberFields.clear()
    for (const [id, cb] of partyChecks) {
      if (!cb.checked) continue
      const row = el('div', { className: 'tpd-member-row' })
      row.appendChild(el('span', { text: id }))
      const lv = el('input')
      lv.type = 'number'
      lv.placeholder = '模板'
      lv.setAttribute('aria-label', `${id} 等级`)
      const hp = el('input')
      hp.type = 'number'
      hp.placeholder = 'HP'
      hp.setAttribute('aria-label', `${id} HP`)
      const mp = el('input')
      mp.type = 'number'
      mp.placeholder = 'MP'
      mp.setAttribute('aria-label', `${id} MP`)
      const equip = el('input')
      equip.placeholder = '装:slot=item,..'
      equip.setAttribute('aria-label', `${id} 装备`)
      const statuses = el('input')
      statuses.placeholder = '态:protect,..'
      statuses.setAttribute('aria-label', `${id} 状态`)
      const poisons = el('input')
      poisons.placeholder = '毒:id,..'
      poisons.setAttribute('aria-label', `${id} 中毒`)
      row.appendChild(lv)
      row.appendChild(hp)
      row.appendChild(mp)
      const extras = el('div', { className: 'tpd-member-extra' })
      extras.append(equip, statuses, poisons)
      row.appendChild(extras)
      row.dataset.member = id
      memberFields.set(id, { level: lv, hp, mp, equipment: equip, statuses, poisons })
      memberOverrides.appendChild(row)
    }
    memberOverrides.hidden = memberOverrides.childElementCount === 0
  }
  partyList.addEventListener('change', renderMemberOverrides)

  const invInput = el('input')
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
    for (const [id, fields] of memberFields) {
      const level = fields.level.value ? Number(fields.level.value) : undefined
      const hp = fields.hp.value ? Number(fields.hp.value) : undefined
      const mp = fields.mp.value ? Number(fields.mp.value) : undefined
      seedStats[id] = { ...(hp !== undefined ? { hp } : {}), ...(mp !== undefined ? { mp } : {}) }
      presetMembers.push({
        actorId: id,
        ...(level !== undefined ? { level } : {}),
        ...(fields.equipment.value ? { equipment: fields.equipment.value } : {}),
        ...(fields.statuses.value ? { statuses: fields.statuses.value } : {}),
        ...(fields.poisons.value ? { poisons: fields.poisons.value } : {}),
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
    const preset = ctx.buildPresetParty(actorIds, seedStats)
    applyPresetOverrides(preset.party, presetMembers)
    setStatus('战斗启动中…', '#8fd0ff')
    void runPanelOperation((signal) =>
      ctx.startBattleDev(
        {
          enemyTeamId: customEnemies ? 'debug-custom' : teamSel.value,
          ...(customEnemies ? { enemyOverride: customEnemies } : {}),
          ...(inventory.length
            ? { partyPreset: { ...preset, inventory } }
            : { partyPreset: preset }),
          ...(fields.length ? { fieldId } : {}),
        },
        signal,
      ),
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
  const collisionCb = el('input')
  collisionCb.type = 'checkbox'
  collisionCb.checked = ctx.layers.collision
  collisionCb.addEventListener('change', () => {
    ctx.layers.collision = collisionCb.checked
  })
  const triggerCb = el('input')
  triggerCb.type = 'checkbox'
  triggerCb.checked = ctx.layers.triggers
  triggerCb.addEventListener('change', () => {
    ctx.layers.triggers = triggerCb.checked
  })
  const stepCb = el('input')
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

  // ── 命令解析（G4 覆盖矩阵见 docs/phase2/guides/debug-tools.md） ──
  const runCommand = (line: string): void => {
    const parts = line.trim().split(/\s+/)
    const cmd = (parts[0] ?? '').toLowerCase()
    const arg = (i: number): string | undefined => parts[i]
    const detached = <T>(
      invoke: (runtime: ScriptProjectRuntime, s: AbortSignal) => Promise<T>,
    ): Promise<T> => runPanelOperation((signal) => ctx.runDetached(signal, invoke))
    const needsBusyConfirmation = cmd === 'scene' || cmd === 'run-script' || cmd === 'run-trigger'

    if (cmd === 'help') {
      logLine('help | scene <id> [col,row] [facing] | pos <col,row> [facing] | give <itemId> [n]')
      logLine('money <n> | party <id,..> | skill <actorId> <skillId> | battle <team>')
      logLine('run-script <id> | run-trigger <entityId> | step | collision | triggers | state')
      return
    }
    if (needsBusyConfirmation && ctx.presentationBusy()) {
      if (!window.confirm('主 runner 占用中，仍要执行？已有 runner 时，本次调用不接续入场脚本。'))
        return
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
        void runPanelOperation((signal) => ctx.startBattleDev({ enemyTeamId }, signal))
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
    }
  })

  document.body.appendChild(root)
  tabButtons.get(activeTab)?.focus()

  return dispose
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
