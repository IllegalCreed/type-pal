/**
 * D13-1 调试工具首刀 —— DEV-only overlay（?debug 动态引入）。
 *
 * 纪律（K1-K5 / G1-G4 验收钉）：
 * - 本模块只经 `import.meta.env.DEV && params.get('debug')` 动态 import，主包静态链不触及；
 *   生产构建 tree-shake 掉 `if(false)` 动态 import 分支。
 * - 全部状态内存态，不落档；世界变更走 runDetached（host 意图守卫）或 dev 内存 mutation。
 * - 命令注册表复用现有 host/命令能力，不新建执行路径。
 * - 任意脚本/触发器触发走 detached（runDetachedV5ScriptChain 语义），不用 startScript 静默丢。
 * - 输入隔离：面板 keydown/keyup stopPropagation，焦点期不吞游戏键，Esc 只关 overlay。
 */
import type {
  ActivePoison,
  CharacterInstance,
  SceneDefV5,
  StatusId,
  WorldState,
} from '@type-pal/content'
import type { LoadedProjectV5 } from './loader-v5.js'
import type { ScriptProjectRuntimeV5 } from './script-project-v5.js'

export interface DebugFrameStep {
  active: boolean
  requestStep(): void
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
  /** canonical script-v5 场景定义（触发器/脚本枚举与触发用）。 */
  scene(): SceneDefV5 | undefined
  canonicalProject: LoadedProjectV5
  runtime(): ScriptProjectRuntimeV5 | undefined
  runnerBusy(): boolean
  dialogBusy(): boolean
  runDetached<T>(
    signal: AbortSignal,
    invoke: (runtime: ScriptProjectRuntimeV5, signal: AbortSignal) => Promise<T>,
  ): Promise<T>
  startBattleDev(
    request: {
      team: number
      enemyOverride?: string[]
      partyPreset?: { party: CharacterInstance[]; inventory?: { itemId: string; count: number }[] }
      fieldId?: number
    },
    signal: AbortSignal,
  ): Promise<'win' | 'lose' | 'flee'>
  buildPresetParty(
    actorIds: string[],
    seedStats: Record<string, { hp?: number; mp?: number }>,
  ): CharacterInstance[]
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

const PANEL_WIDTH = 720

/**
 * 安装调试面板。只在 DEV 下由 bootGame 动态调用。
 */
export function installDebugTools(ctx: DebugToolsContext): () => void {
  const root = document.createElement('div')
  root.id = 'tp-debug'
  root.style.cssText = [
    'position:fixed',
    'top:8px',
    'right:8px',
    `width:${PANEL_WIDTH}px`,
    'max-width:94vw',
    'height:calc(100vh - 16px)',
    'overflow:auto',
    'background:rgba(18,20,24,0.96)',
    'color:#d8dee8',
    'font:12px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace',
    'border:1px solid #3a4a5e',
    'border-radius:6px',
    'z-index:2147483000',
    'padding:8px',
    'box-sizing:border-box',
    'box-shadow:0 6px 24px rgba(0,0,0,0.6)',
  ].join(';')

  const close = (): void => {
    clearInterval(badgeTimer)
    window.removeEventListener('keydown', closeOnEscCapture)
    root.remove()
  }
  // K1：表单字段键入时屏蔽游戏快捷键；Esc 只关 overlay。其余按键透传（不吞游戏对话推进键）。
  root.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation()
      close()
      return
    }
    const target = e.target as HTMLElement | null
    if (target && target.matches('input, select, textarea')) e.stopPropagation()
  })
  root.addEventListener('keyup', (e) => {
    const target = e.target as HTMLElement | null
    if (target && target.matches('input, select, textarea')) e.stopPropagation()
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

  const statusEl = (): HTMLDivElement => el('div', { style: 'margin:4px 0;color:#9fb3c8' })

  function el<K extends keyof HTMLElementTagNameMap>(
    tag: K,
    attrs: { style?: string; className?: string; html?: string } = {},
  ): HTMLElementTagNameMap[K] {
    const node = document.createElement(tag)
    if (attrs.style) node.style.cssText = attrs.style
    if (attrs.className) node.className = attrs.className
    if (attrs.html !== undefined) node.innerHTML = attrs.html
    return node
  }

  const section = (title: string): HTMLDivElement => {
    const box = el('div', { style: 'margin-bottom:10px;border-bottom:1px solid #2c3644;padding-bottom:8px' })
    box.appendChild(el('div', { style: 'font-weight:bold;color:#8fd0ff;margin-bottom:4px', html: title }))
    return box
  }

  const badge = (text: string, color: string): HTMLSpanElement => {
    const b = el('span', {
      style: `margin-left:8px;padding:0 6px;border-radius:3px;background:${color};color:#101318;font-weight:bold`,
      html: text,
    })
    return b
  }

  // ── 头部：标题 + 主 runner 占用徽标（K3） ──
  const header = section('reforge dev tools · D13-1')
  const runnerBadge = badge('主 runner 空闲', '#3ddc84')
  header.appendChild(runnerBadge)
  const dialogBadge = badge('对话空闲', '#3ddc84')
  header.appendChild(dialogBadge)
  header.appendChild(
    el('button', {
      style: 'float:right;cursor:pointer',
      html: '✕ 关闭(Esc)',
    }),
  ).addEventListener('click', close)

  const refreshBadges = (): void => {
    const busy = ctx.runnerBusy()
    runnerBadge.textContent = busy ? '主 runner 占用中' : '主 runner 空闲'
    runnerBadge.style.background = busy ? '#ffb020' : '#3ddc84'
    const db = ctx.dialogBusy()
    dialogBadge.textContent = db ? '对话进行中' : '对话空闲'
    dialogBadge.style.background = db ? '#ffb020' : '#3ddc84'
  }
  refreshBadges()
  const badgeTimer = setInterval(refreshBadges, 500)
  root.appendChild(header)

  // ── 命令状态行（K3：触发状态上屏） ──
  const status = statusEl()
  const setStatus = (text: string, color = '#9fb3c8'): void => {
    status.textContent = text
    status.style.color = color
  }
  root.appendChild(status)

  // ── 1. cheat console（G4 命令集覆盖矩阵见 docs/phase2/dev-tools.md） ──
  const consoleSection = section('① cheat console')
  const output = el('pre', {
    style:
      'height:96px;overflow:auto;background:#0c0f13;border:1px solid #2c3644;padding:4px;margin:0 0 4px;white-space:pre-wrap',
  })
  const logLine = (text: string, color = '#c8d4e0'): void => {
    output.textContent += `${text}\n`
    output.scrollTop = output.scrollHeight
  }
  const input = el('input', {
    style: 'width:100%;box-sizing:border-box;background:#0c0f13;border:1px solid #2c3644;color:#e8f0f8;padding:4px',
  }) as HTMLInputElement
  input.placeholder = 'help / scene s001 / give 144 5 / run-script shared/xx / battle 0 …'
  consoleSection.appendChild(output)
  consoleSection.appendChild(input)
  root.appendChild(consoleSection)

  // ── 2. 世界变量检视（只读） ──
  const inspectSection = section('② 世界变量检视（只读）')
  const inspectEl = el('pre', {
    style: 'height:120px;overflow:auto;background:#0c0f13;border:1px solid #2c3644;padding:4px;margin:0;white-space:pre-wrap',
  })
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
  const inspectBtn = el('button', { style: 'margin-top:4px;cursor:pointer', html: '刷新' })
  inspectBtn.addEventListener('click', refreshInspect)
  inspectSection.appendChild(inspectEl)
  inspectSection.appendChild(inspectBtn)
  root.appendChild(inspectSection)

  // ── 3. 脚本 / 触发器一键触发（K3：detached + 状态上屏 + 占用确认） ──
  const triggerSection = section('③ 脚本 / 触发器（点击触发，AbortSignal 可取消）')
  const triggerList = el('div', {
    style: 'max-height:150px;overflow:auto;background:#0c0f13;border:1px solid #2c3644;padding:4px',
  })
  const runningButtons = new Map<string, { abort(): void; text(): string }>()
  let triggerSeq = 0

  const runTriggerItem = (item: TriggerItem): void => {
    const key = `${item.kind}:${item.id}`
    const existing = runningButtons.get(key)
    if (existing) {
      existing.abort()
      return
    }
    if (ctx.runnerBusy() || ctx.dialogBusy()) {
      // K3：主 runner 占用时执行场景切换类脚本须先确认（detached 不排 onEnter）。
      if (!window.confirm(`主 runner 占用中，仍要执行 ${item.label}？\n(detached 并发不排 onEnter，场景入场脚本可能不跑)`))
        return
    }
    const ac = new AbortController()
    const runId = ++triggerSeq
    setStatus(`[${runId}] ${item.label} … running`, '#8fd0ff')
    const button = el('button', {
      style: 'cursor:pointer;margin:1px 0;text-align:left;width:100%',
      html: `${item.label} <span style="color:#8fd0ff">${item.kind}</span>`,
    })
    const text = (): string => `${item.label}`
    runningButtons.set(key, { abort: () => ac.abort(), text })
    triggerList.appendChild(button)
    button.addEventListener('click', () => runTriggerItem(item))
    const finish = (statusText: string, color: string): void => {
      runningButtons.delete(key)
      button.remove()
      setStatus(`[${runId}] ${item.label} → ${statusText}`, color)
    }
    const invoke = (runtime: ScriptProjectRuntimeV5, signal: AbortSignal): Promise<unknown> => {
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
          return runtime.runSceneHook(
            scene,
            item.id as 'onEnter' | 'onTeleport',
            { signal, runSceneEntry: true },
          )
        }
      }
    }
    void ctx
      .runDetached(ac.signal, (runtime, signal) => invoke(runtime, signal))
      .then(() => finish('done', '#3ddc84'))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') finish('cancel', '#ffb020')
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
      const button = el('button', {
        style: 'cursor:pointer;margin:1px 0;text-align:left;width:100%',
        html: `${item.label} <span style="color:#8fd0ff">${item.kind}</span>`,
      })
      button.addEventListener('click', () => runTriggerItem(item))
      triggerList.appendChild(button)
    }
    logLine(`[triggers] ${items.length} 项：shared ${Object.keys(p.sharedScripts ?? {}).length} / 场景实体 / hooks`)
  }
  renderTriggerList()
  const refreshTriggers = el('button', { style: 'margin-top:4px;cursor:pointer', html: '刷新列表' })
  refreshTriggers.addEventListener('click', renderTriggerList)
  triggerSection.appendChild(triggerList)
  triggerSection.appendChild(refreshTriggers)
  root.appendChild(triggerSection)

  // ── 4. 战斗态构建器（K2：partyPreset 快照回滚在 startBattle 内；此处只组参数） ──
  const battleSection = section('④ 战斗态构建器（内存态，结束后回战前世界）')
  const battleForm = el('div')

  const fieldSel = el('select') as HTMLSelectElement
  const fields = ctx.canonicalProject.battleFields ?? []
  if (fields.length) {
    for (const f of fields) fieldSel.appendChild(el('option', { html: `${f.id} ${f.background ?? ''}` }))
  } else {
    fieldSel.appendChild(el('option', { html: '24 默认' }))
  }

  const enemyModeTeam = el('input', {}) as HTMLInputElement
  enemyModeTeam.type = 'radio'
  enemyModeTeam.name = 'enemy-mode'
  enemyModeTeam.checked = true
  const enemyModeCustom = el('input', {}) as HTMLInputElement
  enemyModeCustom.type = 'radio'
  enemyModeCustom.name = 'enemy-mode'
  const teamSel = el('select') as HTMLSelectElement
  for (const id of Object.keys(ctx.canonicalProject.enemyTeamsById)) {
    teamSel.appendChild(el('option', { html: id }))
  }
  const enemyList = el('div', {
    style: 'max-height:90px;overflow:auto;border:1px solid #2c3644;padding:2px;display:none',
  })
  const enemyChecks = new Map<string, HTMLInputElement>()
  for (const id of Object.keys(ctx.canonicalProject.enemiesById)) {
    const row = el('label', { style: 'display:block;white-space:nowrap' })
    const cb = el('input', {}) as HTMLInputElement
    cb.type = 'checkbox'
    cb.value = id
    row.appendChild(cb)
    row.appendChild(document.createTextNode(` ${id}`))
    enemyChecks.set(id, cb)
    enemyList.appendChild(row)
  }
  enemyModeCustom.addEventListener('change', () => {
    enemyList.style.display = enemyModeCustom.checked ? 'block' : 'none'
    teamSel.disabled = enemyModeCustom.checked
  })
  enemyModeTeam.addEventListener('change', () => {
    enemyList.style.display = 'none'
    teamSel.disabled = false
  })

  const partyList = el('div', {
    style: 'max-height:90px;overflow:auto;border:1px solid #2c3644;padding:2px',
  })
  const partyChecks = new Map<string, HTMLInputElement>()
  for (const id of Object.keys(ctx.canonicalProject.actorsById)) {
    const row = el('label', { style: 'display:block;white-space:nowrap' })
    const cb = el('input', {}) as HTMLInputElement
    cb.type = 'checkbox'
    cb.value = id
    row.appendChild(cb)
    row.appendChild(document.createTextNode(` ${id}`))
    partyChecks.set(id, cb)
    partyList.appendChild(row)
  }

  const memberOverrides = el('div', {
    style: 'max-height:120px;overflow:auto;border:1px solid #2c3644;padding:2px',
  })
  const renderMemberOverrides = (): void => {
    memberOverrides.textContent = ''
    for (const [id, cb] of partyChecks) {
      if (!cb.checked) continue
      const row = el('label', { style: 'display:block;white-space:nowrap' })
      row.appendChild(document.createTextNode(`${id}  Lv`))
      const lv = el('input', {}) as HTMLInputElement
      lv.type = 'number'
      lv.style.width = '42px'
      lv.placeholder = '模板'
      const hp = el('input', {}) as HTMLInputElement
      hp.type = 'number'
      hp.style.width = '46px'
      hp.placeholder = 'HP'
      const mp = el('input', {}) as HTMLInputElement
      mp.type = 'number'
      mp.style.width = '46px'
      mp.placeholder = 'MP'
      const equip = el('input', {}) as HTMLInputElement
      equip.style.width = '120px'
      equip.placeholder = '装:slot=item,..'
      const statuses = el('input', {}) as HTMLInputElement
      statuses.style.width = '90px'
      statuses.placeholder = '态:protect,..'
      const poisons = el('input', {}) as HTMLInputElement
      poisons.style.width = '70px'
      poisons.placeholder = '毒:id,..'
      row.appendChild(lv)
      row.appendChild(hp)
      row.appendChild(mp)
      row.appendChild(equip)
      row.appendChild(statuses)
      row.appendChild(poisons)
      const data = { lv, hp, mp, equip, statuses, poisons }
      row.dataset.member = id
      ;(row as HTMLLabelElement & { _d?: typeof data })._d = data
      memberOverrides.appendChild(row)
    }
  }
  partyList.addEventListener('change', renderMemberOverrides)

  const invInput = el('input', {
    style: 'width:100%;box-sizing:border-box;background:#0c0f13;border:1px solid #2c3644;color:#e8f0f8;padding:4px',
  }) as HTMLInputElement
  invInput.placeholder = '道具预设 itemId×count,itemId×count'

  const startBattleBtn = el('button', { style: 'cursor:pointer;margin-top:6px', html: '⚔ 开战' })
  startBattleBtn.addEventListener('click', () => {
    const customEnemies = enemyModeCustom.checked
      ? [...enemyChecks.entries()]
          .filter(([, cb]) => cb.checked)
          .map(([id]) => id)
      : undefined
    const actorIds = [...partyChecks.entries()].filter(([, cb]) => cb.checked).map(([id]) => id)
    const seedStats: Record<string, { hp?: number; mp?: number }> = {}
    const presetMembers: DebugPresetMember[] = []
    for (const row of memberOverrides.children) {
      const label = row as HTMLLabelElement & { _d?: { lv: HTMLInputElement; hp: HTMLInputElement; mp: HTMLInputElement; equip: HTMLInputElement; statuses: HTMLInputElement; poisons: HTMLInputElement } }
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
    if (!actorIds.length) {
      setStatus('请至少选择一名我方成员', '#ff5f56')
      return
    }
    if (!customEnemies && !teamSel.value) {
      setStatus('请选择敌队或自定义敌人', '#ff5f56')
      return
    }
    const ac = new AbortController()
    const party = ctx.buildPresetParty(actorIds, seedStats)
    applyPresetOverrides(party, presetMembers)
    setStatus('战斗启动中…', '#8fd0ff')
    void ctx
      .startBattleDev(
        {
          team: customEnemies ? 0 : teamNumber(teamSel.value),
          ...(customEnemies ? { enemyOverride: customEnemies } : {}),
          ...(inventory.length ? { partyPreset: { party, inventory } } : { partyPreset: { party } }),
          ...(fields.length ? { fieldId: Number(fieldSel.value) } : {}),
        },
        ac.signal,
      )
      .then((r) => setStatus(`战斗结束: ${r}（世界已恢复战前）`, '#3ddc84'))
      .catch((error: unknown) =>
        setStatus(`战斗失败/取消: ${String(error).slice(0, 80)}`, '#ff5f56'),
      )
  })

  const resetBtn = el('button', { style: 'cursor:pointer;margin:6px 0 0 8px', html: '清空表单' })
  resetBtn.addEventListener('click', () => {
    for (const [, cb] of enemyChecks) cb.checked = false
    for (const [, cb] of partyChecks) cb.checked = false
    enemyModeTeam.checked = true
    teamSel.disabled = false
    enemyList.style.display = 'none'
    invInput.value = ''
    renderMemberOverrides()
  })

  const row = (label: string, node: HTMLElement): HTMLDivElement => {
    const r = el('div', { style: 'margin:3px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap' })
    r.appendChild(el('span', { html: label }))
    r.appendChild(node)
    return r
  }
  battleForm.appendChild(row('战场', fieldSel))
  const enemyModeRow = el('div', { style: 'margin:3px 0;display:flex;gap:8px;flex-wrap:wrap' })
  const teamLabel = el('label', { style: 'display:flex;align-items:center;gap:4px' })
  teamLabel.appendChild(enemyModeTeam)
  teamLabel.appendChild(document.createTextNode('现成敌队'))
  const customLabel = el('label', { style: 'display:flex;align-items:center;gap:4px' })
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
  const btnRow = el('div')
  btnRow.appendChild(startBattleBtn)
  btnRow.appendChild(resetBtn)
  battleForm.appendChild(btnRow)
  battleSection.appendChild(battleForm)
  root.appendChild(battleSection)

  // ── 5. 图层开关 + 帧步进（K5） ──
  const layersSection = section('⑤ 图层 / 帧步进')
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
  const stepBtn = el('button', { style: 'cursor:pointer', html: '▶ 单步(一拍=100ms)' })
  stepBtn.addEventListener('click', () => {
    if (!ctx.frameStep.active) ctx.frameStep.setActive(true)
    ctx.frameStep.requestStep()
  })
  const note = el('div', {
    style: 'color:#9fb3c8;margin-top:2px',
    html: '帧步进作用域 = 大世界 gameplay 相位（移动/实体/auto 脚本）；战斗/演出/对话推进不单步。',
  })
  const lrow = (label: string, cb: HTMLElement): HTMLDivElement => {
    const r = el('div', { style: 'display:flex;align-items:center;gap:6px;margin:3px 0' })
    r.appendChild(cb)
    r.appendChild(el('span', { html: label }))
    return r
  }
  layersSection.appendChild(lrow('碰撞叠加层(?collision)', collisionCb))
  layersSection.appendChild(lrow('触发区叠加层', triggerCb))
  layersSection.appendChild(lrow('帧步进（暂停墙钟，手动单步）', stepCb))
  const stepRow = el('div', { style: 'margin-top:4px' })
  stepRow.appendChild(stepBtn)
  layersSection.appendChild(stepRow)
  layersSection.appendChild(note)
  root.appendChild(layersSection)

  // ── 命令解析（G4 覆盖矩阵见 docs/phase2/dev-tools.md） ──
  const runCommand = (line: string): void => {
    const parts = line.trim().split(/\s+/)
    const cmd = (parts[0] ?? '').toLowerCase()
    const arg = (i: number): string | undefined => parts[i]
    const signal = new AbortController()
    const detached = <T>(
      invoke: (runtime: ScriptProjectRuntimeV5, s: AbortSignal) => Promise<T>,
    ): Promise<T> => ctx.runDetached(signal.signal, invoke)
    const sceneSwitch = (): boolean =>
      cmd === 'scene' || cmd === 'run-script' || cmd === 'run-trigger'

    if (cmd === 'help') {
      logLine('help | scene <id> [col,row] [facing] | pos <col,row> [facing] | give <itemId> [n]')
      logLine('money <n> | party <id,..> | skill <actorId> <skillId> | battle <team> | field <n>')
      logLine('run-script <id> | run-trigger <entityId> | step | collision | triggers | state')
      return
    }
    if (sceneSwitch() && (ctx.runnerBusy() || ctx.dialogBusy())) {
      if (!window.confirm('主 runner 占用中，仍要执行？(detached 不排 onEnter)')) return
    }
    switch (cmd) {
      case 'scene': {
        const id = arg(1)
        if (!id) return logLine('用法: scene <sceneId> [col,row] [facing]', '#ffb020')
        const posRaw = arg(2)?.split(',').map(Number)
        const pos =
          posRaw?.length === 2 && posRaw.every(Number.isFinite)
            ? { col: posRaw[0]!, row: posRaw[1]!, height: 0 }
            : undefined
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
        const posRaw = arg(1)?.split(',').map(Number)
        if (!posRaw || posRaw.length !== 2 || !posRaw.every(Number.isFinite))
          return logLine('用法: pos <col,row> [facing]', '#ffb020')
        const facing = arg(2) as 'up' | 'down' | 'left' | 'right' | undefined
        void detached((runtime, s) =>
          runtime.runCommands(
            [{ kind: 'teleportParty', pos: { col: posRaw[0]!, row: posRaw[1]!, height: 0 }, ...(facing ? { facing } : {}) }],
            { signal: s },
          ),
        )
          .then(() => setStatus('pos done', '#3ddc84'))
          .catch((e: unknown) => setStatus(`pos: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'give': {
        const itemId = arg(1)
        if (!itemId) return logLine('用法: give <itemId> [count]', '#ffb020')
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
        if (!Number.isFinite(n)) return logLine('用法: money <n>', '#ffb020')
        const delta = n - ctx.world().money
        void detached((runtime, s) =>
          runtime.runCommands([{ kind: 'giveMoney', delta }], { signal: s }),
        )
          .then(() => setStatus(`money ${n} done（内存态）`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`money: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'party': {
        const members = (arg(1) ?? '').split(',').map((s) => s.trim()).filter(Boolean)
        if (!members.length) return logLine('用法: party <actorId,actorId,…>', '#ffb020')
        ctx.setParty(members)
        setStatus(`party ${members.join(',')} done（内存态，满血满蓝）`, '#3ddc84')
        refreshInspect()
        return
      }
      case 'skill': {
        const actorId = arg(1)
        const skillId = arg(2)
        if (!actorId || !skillId) return logLine('用法: skill <actorId> <skillId>', '#ffb020')
        ctx.grantSkill(actorId, skillId)
        setStatus(`skill ${actorId} ← ${skillId} done（内存态）`, '#3ddc84')
        refreshInspect()
        return
      }
      case 'battle': {
        const team = Number(arg(1) ?? 0)
        if (!Number.isFinite(team)) return logLine('用法: battle <team>', '#ffb020')
        setStatus(`battle team ${team} …`, '#8fd0ff')
        void ctx
          .startBattleDev({ team }, new AbortController().signal)
          .then((r) => setStatus(`battle done: ${r}`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`battle: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'run-script': {
        const id = arg(1)
        if (!id) return logLine('用法: run-script <scriptId>', '#ffb020')
        setStatus(`run-script ${id} …`, '#8fd0ff')
        void detached((runtime, s) => runtime.runSharedScript(id, { signal: s }))
          .then(() => setStatus(`run-script ${id} done`, '#3ddc84'))
          .catch((e: unknown) => setStatus(`run-script: ${String(e).slice(0, 80)}`, '#ff5f56'))
        return
      }
      case 'run-trigger': {
        const id = arg(1)
        if (!id) return logLine('用法: run-trigger <entityId>', '#ffb020')
        setStatus(`run-trigger ${id} …`, '#8fd0ff')
        void detached((runtime, s) => {
          const scene = ctx.scene()
          if (!scene) return Promise.reject(new Error('当前场景无 canonical 定义'))
          return runtime.runEntityBehavior(scene, id, 'trigger', { signal: s })
        })
          .then((ran) => setStatus(`run-trigger ${id} → ${ran ? 'ran' : '未命中' }`, '#3ddc84'))
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
  input.focus()

  return close
}

function teamNumber(id: string): number {
  const m = /(\d+)$/.exec(id)
  return m ? Number(m[1]) : 0
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

function applyPresetOverrides(
  party: CharacterInstance[],
  members: DebugPresetMember[],
): void {
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
        .filter(Boolean)
        .map((status) => ({ status: status as StatusId, turns: 7 }))
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
