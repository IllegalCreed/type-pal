/** Dialogue state transitions. Event and battle drivers own sequencing and supply the clock. */
import { type DialogBoxStyle, FRAME_MS_EXPLORE } from '@type-pal/shared'
import type { DialogBoxState } from '../core/game-state.js'
import {
  DIALOG_IDELAY_DEFAULT,
  FONT_COLOR_DEFAULT,
  isCharacterNameLine,
  parseDialogText,
} from './dialog-text.js'

export {
  type DialogBoxDrawCtx,
  type DialogSprite,
  drawDialogBox,
  getDialogTextPos,
  getDialogTitlePos,
  LINE_HEIGHT_PX,
  type TextPos,
} from './dialog-draw.js'
export {
  DIALOG_IDELAY_DEFAULT,
  FONT_COLOR_CYAN,
  FONT_COLOR_CYAN_ALT,
  FONT_COLOR_DEFAULT,
  FONT_COLOR_RED,
  FONT_COLOR_RED_ALT,
  FONT_COLOR_YELLOW,
  isCharacterNameLine,
  type ParsedDialogLine,
  parseDialogText,
} from './dialog-text.js'

// ── 常量 ──────────────────────────────────────────────────────────────────────

export const FRAMES_PER_CHAR = 1

/** sdlpal text.c:1649 `nCurrentDialogLine > 3`:超过 3 (即 4) 触发等键 */
export const MAX_LINES_PER_PAGE = 4

/**
 * 姓名判定使用段首、非center风格和末字冒号三条件(text.c:1715-1720)。
 * 行间冒号句保留在正文；绘制层另拥有narration/item-box布局。
 */
function shouldRenderAsTitle(
  text: string,
  dialogLineCount: number,
  style: DialogBoxStyle,
): boolean {
  return dialogLineCount === 0 && style !== 'center' && isCharacterNameLine(text)
}

// ── startDialogLine ───────────────────────────────────────────────────────────

/**
 * 启动 dialog 显示首行。event-system showDialog opcode 在 gs.dialogBox==undefined 时调。
 * shownLines=[],currentLineText=text,phase='typing'。
 */
export function startDialogLine(
  rawText: string,
  opts: {
    style?: DialogBoxStyle
    portraitIcon?: number
    /** 缩进布局位(与 portraitIcon 解耦,见 DialogBoxState.portraitLayout);缺省回退 portraitIcon!==undefined */
    portraitLayout?: boolean
    fontColor?: number
    shadow?: boolean
    /**
     * DM21:起手打字速度(sdlpal g_TextLib.iDelayTime 是**脚本级全局**,text.c:885/1204/1538:
     * 仅 RunTriggerScript 入口重置 3,`$NN` 写入后跨 ClearDialog+StartDialog 持续到脚本结束)。
     * caller(event-system)传 gs.dialogIDelayFrames;缺省 3(旧行为/战斗对话)。
     */
    iDelayFrames?: number
    /**
     * 当前行开始的时间戳(ms)，须与tickDialog传入的now使用同一时基。
     * 无now的战斗driver使用tick计时；不能把缺省0当作真实开行时刻。
     */
    now?: number
  },
): DialogBoxState {
  const style = opts.style ?? 'bottom'
  const startColor = opts.fontColor ?? FONT_COLOR_DEFAULT
  const isDialog = style === 'narration' // sdlpal isDialog:普通对话=FALSE,narration(居中小窗)=TRUE
  const parsed = parseDialogText(
    rawText,
    startColor,
    isDialog,
    opts.iDelayFrames ?? DIALOG_IDELAY_DEFAULT,
  )
  // sdlpal text.c:1715-1727 真值:`:` 结尾的字符串 = 姓名 title,画独立位置(CYAN_ALT,PAL_DrawText 不过
  //   控制符 state machine,不改 bCurrentFontColor),不计入 line。在剥码后的可见文本上判定。
  const isTitle = shouldRenderAsTitle(parsed.text, 0, style)
  return {
    titleText: isTitle ? parsed.text : undefined,
    shownLines: [],
    shownLineColors: [],
    currentLineText: isTitle ? null : parsed.text,
    currentLineColors: isTitle ? undefined : parsed.colors,
    currentLineRevealAt: isTitle ? undefined : parsed.revealAt,
    lineStartMs: opts.now ?? 0,
    currentLineDoneAt: isTitle ? 0 : parsed.doneAt,
    currentLineEndedWithTilde: isTitle ? false : parsed.endedWithTilde,
    lineDoneRenderPending: false,
    fontColorState: isTitle ? startColor : parsed.endColor, // title 不改色态
    iDelayState: isTitle ? DIALOG_IDELAY_DEFAULT : parsed.endIDelay, // 首行姓名当前使用默认速度态
    iconKind: parsed.icon,
    typingFrames: 0,
    charsRevealed: 0,
    // sdlpal nCurrentDialogLine:PAL_StartDialog 置 0(text.c:1262)→ 本行 PAL_ShowDialogText 后:
    //   title 不 ++(0);`~` 收尾 -1→++→0;普通正文 ++→1。
    dialogLineCount: isTitle ? 0 : parsed.endedWithTilde ? 0 : 1,
    phase: isTitle ? 'line-done' : 'typing', // title 即出完,让 event-system 立即 ip++ 下条
    style,
    portraitIcon: opts.portraitIcon,
    portraitLayout: opts.portraitLayout,
    fontColor: startColor,
    shadow: opts.shadow ?? false,
    keyIconBlink: false,
  }
}

// ── appendDialogLine ──────────────────────────────────────────────────────────

/**
 * 把上一行(已 line-done)推进 shownLines,开始新行 typing。
 * event-system showDialog opcode 在 gs.dialogBox!=undefined 时调。
 *
 * **必须先在 caller 中检查 shouldWaitPageKey(state)** — 如果会到第 5 行,
 * 不调本函数,而是 setWaitingPageKey(state) 等键后再调。
 */
export function appendDialogLine(state: DialogBoxState, rawText: string, now?: number): void {
  const isDialog = state.style === 'narration'
  // 续行起始色 = 上一行行末色态(toggle 跨行持续,sdlpal g_TextLib.bCurrentFontColor 同段不重置)
  const startColor = state.fontColorState ?? state.fontColor ?? FONT_COLOR_DEFAULT
  // 续行起始 iDelayTime = 上一行行末态(`$NN` 段内跨行持续,sdlpal g_TextLib.iDelayTime 不自动重置)
  const startIDelay = state.iDelayState ?? DIALOG_IDELAY_DEFAULT
  const parsed = parseDialogText(rawText, startColor, isDialog, startIDelay)
  // sdlpal text.c:1715 姓名识别 — `:` 结尾的字符串画 title 位置(CYAN_ALT,独立路径),不进 shownLines、不改色/速态。
  if (shouldRenderAsTitle(parsed.text, state.dialogLineCount, state.style)) {
    state.titleText = parsed.text
    // **不**修改 currentLineText / phase — title 跟现在 typing 的 dialog 并存
    return
  }
  // 把"上次 line-done 的 currentLineText"沉入 shownLines(连同其逐字符色)
  if (state.currentLineText !== null) {
    state.shownLines.push(state.currentLineText)
    state.shownLineColors ??= []
    state.shownLineColors.push(state.currentLineColors ?? [])
  }
  state.currentLineText = parsed.text
  state.currentLineColors = parsed.colors
  state.currentLineRevealAt = parsed.revealAt
  // 新行重建时间锚点；与tickDialog的now保持同一时基。
  state.lineStartMs = now ?? 0
  state.currentLineDoneAt = parsed.doneAt
  state.currentLineEndedWithTilde = parsed.endedWithTilde
  state.lineDoneRenderPending = false
  state.fontColorState = parsed.endColor
  state.iDelayState = parsed.endIDelay
  if (parsed.icon) state.iconKind = parsed.icon
  // sdlpal nCurrentDialogLine:正文行显示后 ++(text.c:1746);`~` 收尾 -1→++→0(text.c:1552 硬复位,
  //   无视前面累计行数)。title 行在上面 isCharacterNameLine 分支已 return,不到这里(不计入,对齐 text.c:1715-1726)。
  state.dialogLineCount = parsed.endedWithTilde ? 0 : state.dialogLineCount + 1
  // L2:fUserSkip 跨行(text.c:1597)——打字途中按一次确认后,同段后续行瞬显,直到翻页/`~`/新对话复位。
  state.typingFrames = 0
  if (state.userSkip) {
    state.charsRevealed = parsed.text.length // 整行瞬显
    state.phase = 'line-done'
    if (parsed.endedWithTilde) state.userSkip = false // `~` 段末复位(text.c:1553),下一段重新逐字
  } else {
    state.charsRevealed = 0
    state.phase = 'typing'
  }
  state.keyIconBlink = false
}

/**
 * 判定:再加一行是否会撞满(>=4 行已显 + 新行)→ caller 应先 setWaitingPageKey。
 *
 * 触发条件:shownLines 中已有 4 条(即 phase='line-done' 时的 currentLineText 是第 4 行,
 * 或 phase 已 'waiting-page-key' 表示尚未沉入)。本函数在 appendDialogLine 之**前**调用。
 */
export function shouldWaitPageKey(state: DialogBoxState): boolean {
  // currentLineText 若已 typing 完,逻辑上算 1 行;还没沉 shownLines 因为 append 才沉
  const effectiveLines =
    state.shownLines.length +
    (state.currentLineText !== null && state.phase === 'line-done' ? 1 : 0)
  return effectiveLines >= MAX_LINES_PER_PAGE
}

// ── setWaitingPageKey / setWaitingEndKey ──────────────────────────────────────

/**
 * 第 5 行 showDialog 到来 → 进 waiting-page-key,等 Confirm 清屏。
 *
 * 可选 pendingStyle:若由 setDialogStyleX 在已有 dialog 上触发的 PAL_ClearDialog(TRUE),
 * 把新 style/portrait/fontColor 暂存,Confirm 翻页时 caller 应用到 gs。
 *
 * Sync.2 fix8:可选 fullClear:若由 0x05 ClearDialog 或 setDialogStyleX 触发,
 * Confirm 翻页后 caller 应 gs.dialogBox = undefined(对应 sdlpal PAL_ClearDialog(TRUE))。
 */
export function setWaitingPageKey(
  state: DialogBoxState,
  pendingStyle?: DialogBoxState['pendingStyle'],
  fullClear?: boolean,
  preOpClear?: boolean,
  partialClear?: boolean,
): void {
  state.phase = 'waiting-page-key'
  state.typingFrames = 0
  state.keyIconBlink = true
  if (pendingStyle !== undefined) {
    state.pendingStyle = pendingStyle
  }
  if (fullClear) {
    state.pendingFullClear = true
  }
  if (preOpClear) {
    state.pendingPreOpClear = true
  }
  if (partialClear) {
    state.pendingPartialClear = true
  }
}

/** dialog 整段结束(end opcode 触发)+ 有行 → 进 waiting-end-key。 */
export function setWaitingEndKey(state: DialogBoxState): void {
  state.phase = 'waiting-end-key'
  state.typingFrames = 0
  state.keyIconBlink = true
}

/**
 * 清当前页正文(shownLines + currentLine)并把行计数归 0,phase→'line-done'。保留 titleText / portraitIcon
 * / style / fontColorState(对应 sdlpal PAL_ClearDialog 把 nCurrentDialogLine=0 但不擦 title/portrait,
 * text.c:1775;0x8E VIDEO_RestoreScreen 也只 restore 到"含 title、无 body"的 backup)。
 * 用于:翻页 Confirm 后(confirmDialog)、`~` 收尾句 count==0 时被 0x8E 立即清 body(event-system)。
 */
export function resetDialogBody(state: DialogBoxState): void {
  state.shownLines = []
  state.shownLineColors = []
  state.currentLineText = null
  state.currentLineColors = undefined
  state.currentLineRevealAt = undefined
  state.currentLineDoneAt = undefined
  state.currentLineEndedWithTilde = false
  state.lineDoneRenderPending = false
  state.dialogLineCount = 0
  state.typingFrames = 0
  state.charsRevealed = 0
  state.phase = 'line-done'
  state.keyIconBlink = false
}

// ── tickDialog ────────────────────────────────────────────────────────────────

/**
 * 推进typing，不拥有driver时钟或输入消费。
 * 大世界传now，elapsed=now-lineStartMs；战斗每40ms累加，满100ms后无now调用，
 * elapsed=typingFrames*FRAME_MS_EXPLORE。无revealAt的旧状态仍走恒速路径。
 * 等键箭头由绘制层常显，闪烁由present调色板轮转；本函数不切换keyIconBlink。
 */
export function tickDialog(state: DialogBoxState, now?: number): void {
  state.typingFrames++

  if (state.phase === 'typing' && state.currentLineText !== null) {
    const len = state.currentLineText.length
    const revealAt = state.currentLineRevealAt
    if (revealAt) {
      // 两种driver共用reveal时间表，单位均为ms。
      const elapsed =
        now !== undefined && state.lineStartMs !== undefined
          ? now - state.lineStartMs
          : state.typingFrames * FRAME_MS_EXPLORE
      let shown = 0
      while (shown < len && (revealAt[shown] ?? 0) <= elapsed) shown++
      state.charsRevealed = shown
      // doneAt = 末字延时 +(`~NN` 尾暂停);全字显完后的尾暂停 = `~` 的戏剧停顿,到点才 line-done。
      if (elapsed >= (state.currentLineDoneAt ?? 0)) {
        state.charsRevealed = len
        state.phase = 'line-done'
        if (state.currentLineEndedWithTilde) state.lineDoneRenderPending = true
      }
    } else {
      // fallback(无 revealAt 的手搭 state / 旧测试):恒速 FRAMES_PER_CHAR。
      const want = Math.floor(state.typingFrames / FRAMES_PER_CHAR)
      state.charsRevealed = Math.min(want, len)
      if (state.charsRevealed >= len) state.phase = 'line-done'
    }
  }

  // 注:箭头"闪烁"已改为 present 层 palette 0xF9-0xFE 轮转(sdlpal text.c:1408-1426),
  //   箭头本身常显 → 不再用 keyIconBlink show/hide。字段保留(初始 false)以兼容存档/类型。
}

// ── confirmDialog ─────────────────────────────────────────────────────────────

/**
 * Confirm按键时调；event与battle driver按返回值推进自己的游标或队列：
 *  - 'skip-typing':  当前行 typing 中 → 跳行末(fUserSkip)。caller 不动 cursor。
 *  - 'page-advance': 之前 waiting-page-key → 清屏 + line=0。普通分页保留当前未消费showDialog，
 *                    caller重入并append本行；只有已完成的样式/显式清屏指令才推进ip。
 *  - 'dialog-end':   waiting-end-key结束；caller负责清框，并推进游标或战斗队列。
 *  - 'noop':         其他状态(line-done 等),Confirm 无效(等自动推进)。
 */
export type ConfirmResult = 'skip-typing' | 'page-advance' | 'dialog-end' | 'noop'

export function confirmDialog(state: DialogBoxState, now?: number): ConfirmResult {
  if (state.phase === 'typing' && state.currentLineText !== null) {
    // Bug3-2(2026-06-26):`~NN` 尾行字已全显(已进入尾停顿等待)后再按 Confirm → noop。sdlpal 真值
    //   (text.c:1551):`~NN` 尾停顿是固定时长同步 UTIL_Delay,玩家按键只穿透进 dwKeyPress、delay 照常走完
    //   —— 不可重置、不可加速。否则每按一次重设 lineStartMs 会无限重置尾停顿(反复按 → 永远卡这句)。
    //   必须在「跳字设满 charsRevealed」之前判断,用跳字前的原始值。
    if (state.currentLineEndedWithTilde && state.charsRevealed >= state.currentLineText.length) {
      return 'noop'
    }
    state.charsRevealed = state.currentLineText.length
    state.userSkip = true // L2:置 fUserSkip → 同段后续行瞬显(text.c:1607)
    // DL18:`~` 行跳字 —— 尾停顿 ~NN **无条件保留**(text.c:1546-1554 fUserSkip 仍先 UpdateScreen
    //   再 UTIL_Delay(NN*80/7)),且行尾复位 fUserSkip(下一行恢复逐字,:1553-1554)。
    //   快进 typingFrames 到末字已显处,phase 留 typing → tickDialog 等完 doneAt(含尾停顿)。
    if (state.currentLineEndedWithTilde) {
      state.userSkip = false
      const len = state.currentLineText.length
      const lastReveal = state.currentLineRevealAt?.[len - 1] ?? 0
      // Bug3(2026-06-26):wall-clock 对齐 —— 跳字后只等 ~NN 尾停顿,不重等整行打字时间。Bug1 wall-clock 后
      //   tickDialog 用 elapsed=now-lineStartMs 判 doneAt;把 lineStartMs 调成「此刻末字刚打完」=now-lastReveal,
      //   则后续 elapsed 走到 ~NN 尾停顿即 line-done,忠实 sdlpal text.c:1546-1554。缺省 now(旧测试)回退快进。
      if (now !== undefined) {
        state.lineStartMs = now - lastReveal
      } else {
        const fastForward = Math.ceil((lastReveal + 1) / FRAME_MS_EXPLORE)
        if (state.typingFrames < fastForward) state.typingFrames = fastForward
      }
      return 'skip-typing'
    }
    state.phase = 'line-done'
    return 'skip-typing'
  }
  if (state.phase === 'waiting-page-key') {
    // 清屏 + line=0，准备继续尚未显示的本行（普通分页不得推进ip）。
    // 注意:caller 应在 page-advance 后读 state.pendingStyle:
    //   - 非空 → 由 setDialogStyleX 触发的 ClearDialog,caller 应 apply pendingStyle 到 gs +
    //           清 gs.dialogBox(让下次 showDialog 重建)
    //   - 空且无显式清屏标志 → 累计4行触发，caller保留ip，当前showDialog显示第5行。
    // 清正文 + 行计数归 0(sdlpal PAL_ClearDialog text.c:1775 nCurrentDialogLine=0)。phase→'line-done'(临时;
    //   caller回到showDialog，调append切到typing）。
    // 注:fontColorState 不重置 — sdlpal PAL_ClearDialog 仅 kDialogCenter 重置 bCurrentFontColor
    //   (text.c:1777-1781),普通翻页(kDialogUpper)色态跨页持续。
    resetDialogBody(state)
    state.userSkip = false // L2:翻页等键后复位 fUserSkip(text.c:1447),新页重新逐字
    return 'page-advance'
  }
  if (state.phase === 'waiting-end-key') {
    return 'dialog-end'
  }
  return 'noop'
}
