import type {
  AssetId,
  ItemDataMap,
  PoisonDef,
  SkillDataMap,
  WorldItemUseOutcome,
  WorldState,
} from '@type-pal/content'
import {
  closeEquipMenu,
  type EquipMenuState,
  equipApply,
  equipBackToList,
  equipConfirmItem,
  equipMoveCursor,
  openEquipMenu,
} from '../equip-menu-state.js'
import {
  castOutdoorSkill,
  closeMagicMenu,
  type MagicMenuState,
  magicBackFromTarget,
  magicConfirmCaster,
  magicConfirmSpell,
  magicMoveCaster,
  magicMoveCursor,
  magicMoveTarget,
  openMagicMenu,
} from '../magic-menu-state.js'
import { back, CLOSED, confirm, type MenuState, moveCursor, openMenu } from '../menu-state.js'
import {
  browserConfirm,
  browserConfirmOverwriteNo,
  browserConfirmOverwriteYes,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
  type SaveBrowserState,
} from '../save/browser-state.js'
import { ALL_SLOT_IDS, type SaveMeta, type SlotId } from '../save/types.js'
import {
  closeSystemMenu,
  openSystemMenu,
  type SystemMenuState,
  systemConfirm,
  systemConfirmYes,
  systemMoveCursor,
  systemSwitchCommit,
  systemToggleConfirm,
} from '../system-menu-state.js'
import {
  closeUseMenu,
  finishUseExecution,
  openUseMenu,
  type UseExecutionRequest,
  type UseMenuState,
  useApply,
  useBackFromTarget,
  useConfirm,
  useMoveCursor,
} from '../use-menu-state.js'
import { buildItemUseResultEntries, type ItemUseResultEntry } from './item-use-result.js'
import type { ItemUseSession } from './item-use-session.js'

/** Content only: no scene, renderer, project loader, persistence store or game-loop state. */
export interface MenuContent {
  items: ItemDataMap
  skills: SkillDataMap
  poisonsById: Record<number, PoisonDef>
}

/** Explicit side effects; the menu never owns world, storage transactions or browser resources. */
export interface MenuPorts {
  readWorld(): WorldState
  replaceWorld(world: WorldState): void
  sceneId(): string
  executeItemUse(request: UseExecutionRequest, signal: AbortSignal): Promise<WorldItemUseOutcome>
  playSound(asset: AssetId): void
  presentItemResults(entries: readonly ItemUseResultEntry[], signal: AbortSignal): Promise<void>
  showToast(text: string): void
  report(text: string): void
  audioPreferences(): Readonly<{ music: boolean; sound: boolean }>
  setAudioPreference(kind: 'music' | 'sound', on: boolean): void
  saveMetadata(): SaveMeta[]
  lastSaveSlot(): SlotId | undefined
  writeSlot(slot: SlotId): Promise<void>
  loadSlot(slot: SlotId): Promise<void>
  reportSaveFailure(error: unknown): void
  quit(): void
}

/** Read-only presentation view. Only this session replaces menu/child state. */
export interface MenuView {
  readonly menu: Readonly<MenuState>
  readonly magicMenu: Readonly<MagicMenuState>
  readonly equipMenu: Readonly<EquipMenuState>
  readonly useMenu: Readonly<UseMenuState>
  readonly systemMenu: Readonly<SystemMenuState>
  readonly saveBrowser: Readonly<SaveBrowserState>
  readonly statusIdx: number
  readonly overwriteYes: boolean
  readonly systemPlaceholder: string | undefined
}

export class MenuSession {
  #menu: MenuState = CLOSED
  #magicMenu = closeMagicMenu()
  #equipMenu = closeEquipMenu()
  #useMenu = closeUseMenu()
  #systemMenu = closeSystemMenu()
  #saveBrowser = closeSaveBrowser()
  #lastUseCursor = 0
  #lastMagicCaster = 0
  #lastMainCursor = 0
  #lastSystemCursor = 0
  #statusIdx = 0
  #overwriteYes = false
  #systemPlaceholder: string | undefined

  constructor(
    private readonly content: MenuContent,
    private readonly ports: MenuPorts,
    private readonly itemUse: ItemUseSession,
  ) {}

  get active(): boolean {
    return this.#menu.active
  }
  /** Preserve CLOSED identity semantics used by hostile-world arbitration. */
  get closed(): boolean {
    return this.#menu === CLOSED
  }
  get view(): MenuView {
    return {
      menu: this.#menu,
      magicMenu: this.#magicMenu,
      equipMenu: this.#equipMenu,
      useMenu: this.#useMenu,
      systemMenu: this.#systemMenu,
      saveBrowser: this.#saveBrowser,
      statusIdx: this.#statusIdx,
      overwriteYes: this.#overwriteYes,
      systemPlaceholder: this.#systemPlaceholder,
    }
  }

  open(): void {
    this.#menu = openMenu(this.#lastMainCursor)
  }
  close(): void {
    this.#saveBrowser = closeSaveBrowser()
    this.#menu = CLOSED
  }
  refreshSaveBrowser(mode: SaveBrowserState['mode'], metas: SaveMeta[], cursor: number): void {
    if (this.#saveBrowser.active) this.#saveBrowser = openSaveBrowser(mode, metas, cursor)
  }

  input(pressed: ReadonlySet<string>): void {
    if (!this.active) return
    if (this.#saveBrowser.active) this.handleSaveBrowserInput(pressed)
    else if (this.#menu.openPanel === 'magic') this.handleMagicInput(pressed)
    else if (this.#menu.openPanel === 'equip') this.handleEquipmentInput(pressed)
    else if (this.#menu.openPanel === 'use') this.handleItemInput(pressed)
    else if (this.#menu.openPanel === 'status') this.handleStatusInput(pressed)
    else if (this.#menu.openPanel === 'system') this.handleSystemInput(pressed)
    else this.handleHubInput(pressed)
  }

  private handleSaveBrowserInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')

    // 存档浏览界面(全屏,优先于菜单输入)
    if (this.#saveBrowser.confirmOverwrite) {
      // 覆盖确认:四方向 toggle 否/是;Enter 确认;Esc=否
      if (
        pressed.has('ArrowUp') ||
        pressed.has('ArrowDown') ||
        pressed.has('ArrowLeft') ||
        pressed.has('ArrowRight')
      ) {
        this.#overwriteYes = !this.#overwriteYes
      } else if (interact) {
        const r = this.#overwriteYes
          ? browserConfirmOverwriteYes(this.#saveBrowser)
          : { state: browserConfirmOverwriteNo(this.#saveBrowser), action: undefined }
        this.#saveBrowser = r.state
        if (r.action?.kind === 'write')
          void this.ports.writeSlot(r.action.slotId).catch(this.ports.reportSaveFailure)
        this.#overwriteYes = false
      } else if (esc) {
        this.#saveBrowser = browserConfirmOverwriteNo(this.#saveBrowser)
        this.#overwriteYes = false
      }
    } else {
      if (pressed.has('ArrowUp')) this.#saveBrowser = browserMoveCursor(this.#saveBrowser, 'up')
      if (pressed.has('ArrowDown')) this.#saveBrowser = browserMoveCursor(this.#saveBrowser, 'down')
      if (pressed.has('ArrowLeft')) this.#saveBrowser = browserMoveCursor(this.#saveBrowser, 'left')
      if (pressed.has('ArrowRight'))
        this.#saveBrowser = browserMoveCursor(this.#saveBrowser, 'right')
      if (interact) {
        const r = browserConfirm(this.#saveBrowser)
        this.#saveBrowser = r.state
        if (r.action?.kind === 'write')
          void this.ports.writeSlot(r.action.slotId).catch(this.ports.reportSaveFailure)
        else if (r.action?.kind === 'load')
          // SAVE-PREFLIGHT-1：菜单读槽顶层未预期异常兜底（已知失败已由 doLoad 稳定反馈）。
          void this.ports.loadSlot(r.action.slotId).catch((error) => {
            console.warn('[save] 菜单读档失败:', error)
            this.ports.showToast('读档失败')
          })
      }
      if (esc) this.#saveBrowser = closeSaveBrowser() // 回系统菜单(menu 仍 active)
    }
  }

  private handleMagicInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const world = this.ports.readWorld()
    const project = this.content

    if (this.#magicMenu.phase === 'pick-caster') {
      // 选施法人(uigame.c:686-723):上下循环(可停死人,确认拦);确认记忆光标(DL22 static w)
      if (pressed.has('ArrowUp') || pressed.has('ArrowLeft'))
        this.#magicMenu = magicMoveCaster(this.#magicMenu, world, 'up')
      if (pressed.has('ArrowDown') || pressed.has('ArrowRight'))
        this.#magicMenu = magicMoveCaster(this.#magicMenu, world, 'down')
      if (interact) {
        this.#magicMenu = magicConfirmCaster(this.#magicMenu, world, project.skills)
        if (this.#magicMenu.phase === 'pick-spell')
          this.#lastMagicCaster = this.#magicMenu.casterIdx
      }
      if (esc) {
        // 退出回 hub(作者拍板的统一 UX,同 system 菜单;不复刻原版 goto out 弹回大世界)
        this.#magicMenu = closeMagicMenu()
        this.#menu = back(this.#menu)
      }
    } else if (this.#magicMenu.phase === 'pick-target') {
      // 选目标(uigame.c:769-861):↑←/↓→ ±1 不 wrap;Enter 施放(fSuccess 才扣 MP,
      // 满血/死人不吃消耗),放完 MP 不够再来一发 → 退回选技能;够则留此连放;Esc 回选技能
      if (pressed.has('ArrowUp') || pressed.has('ArrowLeft'))
        this.#magicMenu = magicMoveTarget(this.#magicMenu, world, 'up')
      if (pressed.has('ArrowDown') || pressed.has('ArrowRight'))
        this.#magicMenu = magicMoveTarget(this.#magicMenu, world, 'down')
      if (interact) {
        const skill = this.#magicMenu.spells[this.#magicMenu.cursor]
        if (skill) {
          castOutdoorSkill(
            world,
            skill,
            this.#magicMenu.casterIdx,
            this.#magicMenu.targetIdx,
            project.poisonsById,
          )
          const c = world.party[this.#magicMenu.casterIdx]
          if (!c || c.mp < (skill.cost.mp ?? 0))
            this.#magicMenu = magicBackFromTarget(this.#magicMenu)
        }
      }
      if (esc) this.#magicMenu = magicBackFromTarget(this.#magicMenu)
    } else {
      // 选技能:网格导航;Enter → allAllies 直放留此连放 / 单体进选目标;
      // Esc 退出回 hub(作者拍板统一 UX;原版是 goto out 弹回大世界 + 不回选人框,不复刻)
      if (pressed.has('ArrowUp')) this.#magicMenu = magicMoveCursor(this.#magicMenu, 'up')
      if (pressed.has('ArrowDown')) this.#magicMenu = magicMoveCursor(this.#magicMenu, 'down')
      if (pressed.has('ArrowLeft')) this.#magicMenu = magicMoveCursor(this.#magicMenu, 'left')
      if (pressed.has('ArrowRight')) this.#magicMenu = magicMoveCursor(this.#magicMenu, 'right')
      if (interact) {
        const r = magicConfirmSpell(this.#magicMenu, world)
        if (r?.kind === 'castAll')
          castOutdoorSkill(world, r.skill, this.#magicMenu.casterIdx, 'all', project.poisonsById)
      }
      if (esc) {
        this.#magicMenu = closeMagicMenu()
        this.#menu = back(this.#menu)
      }
    }
  }

  private handleEquipmentInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const world = this.ports.readWorld()
    const project = this.content

    if (this.#equipMenu.phase === 'pick-role') {
      // 确认面板:Enter 换上(equipApply 回写 world)/ Esc 回列表
      if (interact) {
        const r = equipApply(this.#equipMenu, world, project.items)
        this.ports.replaceWorld(r.world)
        this.#equipMenu = r.state
      } else if (esc) {
        this.#equipMenu = equipBackToList(this.#equipMenu, world, project.items)
      }
    } else {
      // list:网格选可装物 + Enter 进确认面板 + Esc 关装备面板
      if (pressed.has('ArrowUp')) this.#equipMenu = equipMoveCursor(this.#equipMenu, 'up')
      if (pressed.has('ArrowDown')) this.#equipMenu = equipMoveCursor(this.#equipMenu, 'down')
      if (pressed.has('ArrowLeft')) this.#equipMenu = equipMoveCursor(this.#equipMenu, 'left')
      if (pressed.has('ArrowRight')) this.#equipMenu = equipMoveCursor(this.#equipMenu, 'right')
      if (interact) this.#equipMenu = equipConfirmItem(this.#equipMenu)
      if (esc) {
        this.#equipMenu = closeEquipMenu()
        this.#menu = back(this.#menu)
      }
    }
  }

  private handleItemInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const world = this.ports.readWorld()
    const project = this.content

    if (this.itemUse.pending) {
      // 用途脚本/场景钩子正在接管输入；完成后 dispatchItemUse 会恢复或关闭本菜单。
    } else if (this.#useMenu.phase === 'pick-target') {
      // 选目标:Enter 施用(useApply 回写 world)/ Esc 回列表
      if (interact) {
        const request = useApply(this.#useMenu, world, world.party[0]?.id ?? '', project.items)
        if (request) void this.dispatchItemUse(request)
      } else if (esc) {
        this.#useMenu = useBackFromTarget(this.#useMenu)
      }
    } else {
      // pick-item:网格选可用物 + Enter(单体进选目标 / 脚本类直接执行)+ Esc 关使用面板
      if (pressed.has('ArrowUp')) this.#useMenu = useMoveCursor(this.#useMenu, 'up')
      if (pressed.has('ArrowDown')) this.#useMenu = useMoveCursor(this.#useMenu, 'down')
      if (pressed.has('ArrowLeft')) this.#useMenu = useMoveCursor(this.#useMenu, 'left')
      if (pressed.has('ArrowRight')) this.#useMenu = useMoveCursor(this.#useMenu, 'right')
      if (interact) {
        const result = useConfirm(this.#useMenu, world, project.items)
        if (result.kind === 'execute') void this.dispatchItemUse(result.request)
        else this.#useMenu = result.state
      }
      if (esc) {
        this.#lastUseCursor = this.#useMenu.cursor // 记忆光标,重开恢复(原版 iCurInvMenuItem)
        this.#useMenu = closeUseMenu()
        this.#menu = back(this.#menu)
      }
    }
  }

  private handleStatusInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const world = this.ports.readWorld()

    // 状态板:Up/Left 上一员、Down/Right/Enter 下一员、越界关面板(原版 PAL_PlayerStatus iCurrent)
    if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) {
      this.#statusIdx -= 1
      if (this.#statusIdx < 0) this.#menu = back(this.#menu)
    } else if (pressed.has('ArrowDown') || pressed.has('ArrowRight') || interact) {
      this.#statusIdx += 1
      if (this.#statusIdx >= world.party.length) this.#menu = back(this.#menu)
    } else if (esc) {
      this.#menu = back(this.#menu)
    }
  }

  private handleSystemInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const audioPrefs = this.ports.audioPreferences()
    const saveMetas = this.ports.saveMetadata()
    const lastSaveSlot = this.ports.lastSaveSlot()

    // 系统菜单:menu 阶段网格选 / confirm 阶段确认框;quit-否/Esc → back(menu) 回主菜单 hub
    // (不复刻原版「弹回大世界」;详见 system-menu-plan.md Task C)
    if (this.#systemMenu.phase === 'switch') {
      // 音乐/音效开关子选单:四方向 toggle 关/开;Enter 落定(应用+持久)→ 回 hub;
      // Esc 取消保持当前态 → 回 hub(原版切换/取消后 PAL_SystemMenu 关整菜单,reforge 映射同 quit-否)
      if (
        pressed.has('ArrowUp') ||
        pressed.has('ArrowDown') ||
        pressed.has('ArrowLeft') ||
        pressed.has('ArrowRight')
      ) {
        this.#systemMenu = systemToggleConfirm(this.#systemMenu)
      } else if (interact || esc) {
        this.#lastSystemCursor = this.#systemMenu.cursor
        if (interact) {
          const r = systemSwitchCommit(this.#systemMenu)
          if (r.action?.kind === 'set-music') this.ports.setAudioPreference('music', r.action.on)
          else if (r.action?.kind === 'set-sound')
            this.ports.setAudioPreference('sound', r.action.on)
        }
        this.#systemMenu = closeSystemMenu()
        this.#menu = back(this.#menu)
      }
    } else if (this.#systemMenu.phase === 'confirm') {
      // 确认框:四方向 toggle 是/否;Enter 确认;Esc = 否(回 hub)
      if (
        pressed.has('ArrowUp') ||
        pressed.has('ArrowDown') ||
        pressed.has('ArrowLeft') ||
        pressed.has('ArrowRight')
      ) {
        this.#systemMenu = systemToggleConfirm(this.#systemMenu)
      } else if (interact || esc) {
        const wantYes = interact ? this.#systemMenu.confirmYes : false // Esc = 否
        this.#systemMenu = { ...this.#systemMenu, confirmYes: wantYes }
        const r = systemConfirmYes(this.#systemMenu)
        if (r.action?.kind === 'quit') {
          // 退出「是」→ 回标题屏(作者拍板 2026-07-11):导航到 ?menu 干净重启
          // (丢弃 dev 参数;未存进度即弃,原版 quit 同语义 —— 想留进度先存档)
          this.ports.quit()
        } else {
          this.#lastSystemCursor = this.#systemMenu.cursor
          this.#systemMenu = closeSystemMenu()
          this.#menu = back(this.#menu) // 否/Esc → 回主菜单 hub(非弹回大世界)
        }
      }
    } else {
      // menu 阶段:方向键选;Enter 确认(quit→confirm / 占位→提示);Esc 回 hub
      if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) {
        this.#systemMenu = systemMoveCursor(this.#systemMenu, 'up')
        this.#systemPlaceholder = undefined
      }
      if (pressed.has('ArrowDown') || pressed.has('ArrowRight')) {
        this.#systemMenu = systemMoveCursor(this.#systemMenu, 'down')
        this.#systemPlaceholder = undefined
      }
      if (interact) {
        const r = systemConfirm(this.#systemMenu, {
          musicOn: audioPrefs.music,
          soundOn: audioPrefs.sound,
        })
        this.#systemMenu = r.state
        // 默认槽(bCurrentSaveSlot):光标停上次存/读的槽;从未操作过 → 0
        const defCursor = lastSaveSlot ? Math.max(0, ALL_SLOT_IDS.indexOf(lastSaveSlot)) : 0
        if (r.action?.kind === 'open-save') {
          this.#saveBrowser = openSaveBrowser('save', saveMetas, defCursor) // 开浏览界面·存模式
          this.#overwriteYes = false
        } else if (r.action?.kind === 'open-load') {
          this.#saveBrowser = openSaveBrowser('load', saveMetas, defCursor) // 开浏览界面·读模式
          this.#overwriteYes = false
        }
      } else if (esc) {
        this.#lastSystemCursor = this.#systemMenu.cursor
        this.#systemMenu = closeSystemMenu()
        this.#menu = back(this.#menu)
      }
    }
  }

  private handleHubInput(pressed: ReadonlySet<string>): void {
    const interact = pressed.has(' ') || pressed.has('Enter')
    const esc = pressed.has('Escape')
    const world = this.ports.readWorld()
    const project = this.content

    // 菜单级联导航(Left=Up / Right=Down,对齐 DL21 kKeyUp|kKeyLeft / kKeyDown|kKeyRight)
    if (pressed.has('ArrowUp') || pressed.has('ArrowLeft')) this.#menu = moveCursor(this.#menu, -1)
    if (pressed.has('ArrowDown') || pressed.has('ArrowRight'))
      this.#menu = moveCursor(this.#menu, 1)
    if (interact) {
      this.#menu = confirm(this.#menu)
      this.#lastMainCursor = this.#menu.stack[0]?.cursor ?? 0 // 主菜单光标记忆(iCurMainMenuItem)
      const caster = world.party[0]
      // 进面板初始化子态:仙术解析可用 / 装备解析可装
      if (this.#menu.openPanel === 'magic') {
        // 多人队进选施法人(光标 = 上次记忆);单人队直进技能网格(uigame.c:677-681)
        this.#magicMenu = openMagicMenu(world, project.skills, this.#lastMagicCaster)
      } else if (this.#menu.openPanel === 'equip' && caster) {
        this.#equipMenu = openEquipMenu(world, caster.id, project.items)
      } else if (this.#menu.openPanel === 'use') {
        this.#useMenu = openUseMenu(world, project.items, this.#lastUseCursor) // 恢复上次光标(原版 iCurInvMenuItem)
      } else if (this.#menu.openPanel === 'status') {
        this.#statusIdx = 0 // 开状态板从首位队员看起
      } else if (this.#menu.openPanel === 'system') {
        this.#systemMenu = openSystemMenu(this.#lastSystemCursor) // 恢复上次光标(原版 iCurSystemMenuItem)
        this.#systemPlaceholder = undefined
      }
    }
    if (esc) this.#menu = back(this.#menu)
  }

  /** Suspend menu presentation while the real world/script executor owns input. */
  private dispatchItemUse(request: UseExecutionRequest): Promise<void> {
    return this.itemUse.run(async (signal) => {
      const menuBefore = this.#menu
      const sceneBefore = this.ports.sceneId()
      this.#lastUseCursor = request.state.cursor
      this.#useMenu = closeUseMenu()
      this.#menu = CLOSED
      try {
        let outcome = await this.ports.executeItemUse(request, signal)
        if (signal.aborted) return
        if (outcome.status === 'success') {
          if (this.ports.sceneId() !== sceneBefore) outcome = { ...outcome, menu: 'close' }
          this.ports.replaceWorld(outcome.world)
          const sound = this.content.items[request.itemId]?.use?.sound
          if (sound) this.ports.playSound(sound)
          const results = buildItemUseResultEntries(outcome.presentations, this.content.items)
          if (results.length > 0) await this.ports.presentItemResults(results, signal)
        } else {
          const message = itemUseFailureText(outcome.reason, outcome.message)
          this.ports.showToast(message)
          this.ports.report(`itemUse(${request.itemId}): ${message}`)
        }
        this.#useMenu = finishUseExecution(request, outcome, this.content.items)
        if (this.#useMenu.active) this.#menu = menuBefore
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          error.name === 'AbortError'
        )
          return
        console.error('[item-use]', request.itemId, error)
        this.ports.showToast('物品用途执行失败，请检查脚本或配置')
        this.#useMenu = request.state
        this.#menu = menuBefore
      }
    })
  }
}

function itemUseFailureText(reason: string | undefined, message: string | undefined): string {
  if (message) return message
  switch (reason) {
    case 'not-owned':
      return '物品已经不在背包或装备中'
    case 'missing-target':
      return '没有可作用的目标'
    case 'wrong-context':
      return '这个物品不能在大世界使用'
    case 'gate-failed':
      return '没有产生效果'
    case 'missing-materials':
      return '材料不足'
    case 'empty-resource-pool':
      return '当前没有可用资源'
    case 'external-unavailable':
      return '当前场景无法执行这个用途'
    case 'invalid-effect-chain':
      return '物品用途配置不完整'
    default:
      return '现在无法使用这个物品'
  }
}
