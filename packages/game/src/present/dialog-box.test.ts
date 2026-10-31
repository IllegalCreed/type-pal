import { describe, expect, it } from 'vitest'
import { finishDefaultTickLine } from './__tests__/dialog-state-fixtures.js'
import {
  appendDialogLine,
  confirmDialog,
  FONT_COLOR_DEFAULT,
  FRAMES_PER_CHAR,
  MAX_LINES_PER_PAGE,
  resetDialogBody,
  setWaitingEndKey,
  setWaitingPageKey,
  shouldWaitPageKey,
  startDialogLine,
  tickDialog,
} from './dialog-box.js'

describe('Sync.2 DialogBox · startDialogLine / appendDialogLine', () => {
  it('startDialogLine 初始化:shownLines 空,currentLineText=text,phase=typing', () => {
    const s = startDialogLine('你好', { style: 'top' })
    expect(s.shownLines).toEqual([])
    expect(s.currentLineText).toBe('你好')
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.phase).toBe('typing')
    expect(s.keyIconBlink).toBe(false)
  })

  it('defaults:fontColor=FONT_COLOR_DEFAULT(0x4F=79),shadow=false,portraitIcon=undefined', () => {
    const s = startDialogLine('x', { style: 'bottom' })
    expect(s.fontColor).toBe(0x4f)
    expect(s.shadow).toBe(false)
    expect(s.portraitIcon).toBeUndefined()
  })

  it('opts 覆盖 defaults(含 portraitIcon)', () => {
    const s = startDialogLine('x', { style: 'top', fontColor: 12, shadow: true, portraitIcon: 55 })
    expect(s.fontColor).toBe(12)
    expect(s.shadow).toBe(true)
    expect(s.portraitIcon).toBe(55)
    expect(s.style).toBe('top')
  })

  it('appendDialogLine 把上行(已 line-done)沉进 shownLines + 新行 typing', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    finishDefaultTickLine(s)
    expect(s.phase).toBe('line-done')
    appendDialogLine(s, 'line2')
    expect(s.shownLines).toEqual(['line1'])
    expect(s.currentLineText).toBe('line2')
    expect(s.charsRevealed).toBe(0)
    expect(s.typingFrames).toBe(0)
    expect(s.phase).toBe('typing')
  })

  it('shouldWaitPageKey:第 4 行 line-done 后返 true(下条 showDialog 会撞)', () => {
    const s = startDialogLine('l1', { style: 'bottom' })
    finishDefaultTickLine(s)
    expect(shouldWaitPageKey(s)).toBe(false)
    appendDialogLine(s, 'l2')
    finishDefaultTickLine(s)
    appendDialogLine(s, 'l3')
    finishDefaultTickLine(s)
    appendDialogLine(s, 'l4')
    finishDefaultTickLine(s)
    // shownLines=[l1,l2,l3] currentLineText='l4' phase='line-done' → effective=4
    expect(shouldWaitPageKey(s)).toBe(true)
  })

  // sdlpal nCurrentDialogLine(text.c)真值:正文行 ++,`~` 收尾复位 0,title 不计入。
  it('dialogLineCount:普通正文行 ++,`~` 收尾复位 0(text.c:1746/1552)', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    expect(s.dialogLineCount).toBe(1) // PAL_StartDialog 置 0 → 正文行 ++ → 1
    appendDialogLine(s, 'line2')
    expect(s.dialogLineCount).toBe(2)
    appendDialogLine(s, '快走！~30') // `~` 收尾 → 硬复位 0(无视前面累计 2 行)
    expect(s.dialogLineCount).toBe(0)
    appendDialogLine(s, 'line4') // 复位后正文行 → 1
    expect(s.dialogLineCount).toBe(1)
  })

  // L2:fUserSkip 跨行持续(text.c:1597/1607)——打字途中按一次确认,同段后续行全部瞬显。
  it('L2:typing 中确认置 userSkip → 后续 append 行瞬显(line-done + 满字符)', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    expect(confirmDialog(s)).toBe('skip-typing')
    expect(s.userSkip).toBe(true)
    appendDialogLine(s, 'line2')
    expect(s.phase).toBe('line-done') // 瞬显,非逐字 typing
    expect(s.charsRevealed).toBe('line2'.length)
  })

  it('L2:`~` 段末复位 userSkip → 下一段重新逐字(text.c:1553)', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    confirmDialog(s) // userSkip=true
    appendDialogLine(s, '快走！~30') // `~` 行瞬显 + 复位 userSkip
    expect(s.userSkip).toBe(false)
    appendDialogLine(s, 'line3')
    expect(s.phase).toBe('typing') // 复位后恢复逐字
  })

  it('L2:翻页等键后复位 userSkip(text.c:1447)', () => {
    const s = startDialogLine('line1', { style: 'bottom' })
    s.userSkip = true
    s.phase = 'waiting-page-key'
    expect(confirmDialog(s)).toBe('page-advance')
    expect(s.userSkip).toBe(false)
  })

  it('dialogLineCount:首行即 `~` 收尾 → 0(梦境画外音"李逍遥！~30")', () => {
    const s = startDialogLine('$10李～逍～遥，李～逍～遥！~30', { style: 'center' })
    expect(s.dialogLineCount).toBe(0) // → 段末/清屏不等键不画箭头
  })

  it('dialogLineCount:姓名 title 行不计入(text.c:1715-1726)', () => {
    const s = startDialogLine('李逍遥:', { style: 'bottom' })
    expect(s.dialogLineCount).toBe(0) // title 走独立绘制,不 ++
    expect(s.titleText).toBe('李逍遥:')
    appendDialogLine(s, '哇哇！~40') // 紧接 `~` 正文 → 仍 0
    expect(s.dialogLineCount).toBe(0)
  })

  it('M1:段中续行(line>0)冒号结尾不当姓名牌(text.c:1715 nCurrentDialogLine==0)', () => {
    const s = startDialogLine('算命仙:', { style: 'top' })
    expect(s.titleText).toBe('算命仙:')
    appendDialogLine(s, '公子真是贵人多忘事') // 正文 line1 → dialogLineCount=1
    appendDialogLine(s, '小姑娘看过相。结果公子说:') // line2,冒号结尾但非首行
    expect(s.titleText).toBe('算命仙:') // 姓名牌不被覆盖
    expect(s.currentLineText).toBe('小姑娘看过相。结果公子说:') // 该句进正文,不丢失
  })

  it('L1:center 风格首行冒号结尾当居中正文,不当姓名牌(text.c:1716 != kDialogCenter)', () => {
    const s = startDialogLine('李逍遥心里想:', { style: 'center' })
    expect(s.titleText).toBeUndefined() // center 下不画姓名牌
    expect(s.currentLineText).toBe('李逍遥心里想:') // 当居中正文
  })
})

describe('Bug1 fix · tickDialog wall-clock 驱动(24ms/字逐字,非 100ms 成块)', () => {
  // Bug1:旧实现 tickDialog 用 typingFrames*FRAME_MS_EXPLORE(100ms/tick)算 elapsed,
  //   把 sdlpal 24ms/字的逐字打成"每 100ms 蹦 ~4 字成块"。新实现用 wall-clock:
  //   charsRevealed = floor((now - lineStartMs) / 24ms) 等价(revealAt[i] <= elapsed)。
  //   精度由调用频率(rAF 60fps)保证,不再受 10fps tick 限制。

  it('24ms/字:60ms 时应显 3 字(revealAt 0/24/48<=60;旧实现 0-100ms 内 0 字或蹦 4 字,都不对)', () => {
    const NOW0 = 1_000_000
    const s = startDialogLine('你好世界朋友们', { style: 'bottom', now: NOW0 }) // 7 字
    expect(s.lineStartMs).toBe(NOW0)
    tickDialog(s, NOW0 + 60) // 60ms:revealAt 0/24/48 <=60 → 3 字
    expect(s.charsRevealed).toBe(3)
    expect(s.phase).toBe('typing')
  })

  it('24ms/字:逐字推进(24ms→2字,48ms→3字,72ms→4字)非成块蹦', () => {
    const NOW0 = 5_000_000
    const s = startDialogLine('一二三四五六', { style: 'bottom', now: NOW0 })
    tickDialog(s, NOW0 + 24)
    expect(s.charsRevealed).toBe(2) // 0,24<=24
    tickDialog(s, NOW0 + 47)
    expect(s.charsRevealed).toBe(2) // 48>47,仍 2 字(逐字精度)
    tickDialog(s, NOW0 + 48)
    expect(s.charsRevealed).toBe(3) // 0,24,48<=48
    tickDialog(s, NOW0 + 72)
    expect(s.charsRevealed).toBe(4) // +72
    tickDialog(s, NOW0 + 24 * 6)
    expect(s.charsRevealed).toBe(6)
    expect(s.phase).toBe('line-done')
  })

  it('$NN 变速语义保留:$10(iDelay=14→112ms/字)50ms 仅 1 字,200ms 2 字,224ms 3 字', () => {
    const NOW0 = 0
    const s = startDialogLine('$10李逍遥赵灵儿', { style: 'bottom', now: NOW0 })
    expect(s.currentLineText).toBe('李逍遥赵灵儿')
    tickDialog(s, NOW0 + 50)
    expect(s.charsRevealed).toBe(1) // 50 < 112
    tickDialog(s, NOW0 + 200)
    expect(s.charsRevealed).toBe(2) // 0,112<=200;224>200
    tickDialog(s, NOW0 + 224)
    expect(s.charsRevealed).toBe(3) // 0,112,224<=224
  })

  it('~NN 尾暂停语义保留:doneAt 前仍 typing,doneAt 后 line-done + renderPending', () => {
    const NOW0 = 2_000_000
    // "一夜过去．．"~40 : 6 字 × 24 = 144ms + ~40 尾停 457ms = doneAt 601
    const s = startDialogLine('"一夜过去．．"~40', { style: 'bottom', now: NOW0 })
    tickDialog(s, NOW0 + 500) // 整句已出(6 字),但 500 < 601
    expect(s.charsRevealed).toBe(6)
    expect(s.phase).toBe('typing')
    expect(s.lineDoneRenderPending).toBe(false)
    tickDialog(s, NOW0 + 600) // < 601
    expect(s.phase).toBe('typing')
    tickDialog(s, NOW0 + 700) // 尾暂停结束
    expect(s.phase).toBe('line-done')
    expect(s.lineDoneRenderPending).toBe(true)
  })

  // Existing TS wall-clock contract: last reveal120ms, done601ms.
  // Skip rebases to120ms, leaving24ms final-character delay plus457ms tilde.
  // C polls skip after each character delay; exact key-event timing parity is not established here.
  it('tilde skip completes at the independent TS 481ms boundary', () => {
    const NOW0 = 2_000_000
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center', now: NOW0 })
    tickDialog(s, NOW0 + 100)
    expect(s.charsRevealed).toBe(5)
    expect(s.phase).toBe('typing')
    const skipNow = NOW0 + 100
    expect(confirmDialog(s, skipNow)).toBe('skip-typing')
    expect(s.charsRevealed).toBe(6)
    expect(s.lineStartMs).toBe(NOW0 - 20)
    tickDialog(s, skipNow + 480)
    expect(s.phase).toBe('typing')
    tickDialog(s, skipNow + 481)
    expect(s.phase).toBe('line-done')
    expect(s.lineDoneRenderPending).toBe(true)
  })

  // Repeated confirm must not move the fixed TS completion boundary.
  it('Bug3-2:`~NN` 尾行跳字后再按 Confirm → 不重置尾停顿(noop),墙钟走到尾停顿结束仍推进', () => {
    const NOW0 = 2_000_000
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center', now: NOW0 })
    tickDialog(s, NOW0 + 100) // 打字中途
    const skipNow = NOW0 + 100
    expect(confirmDialog(s, skipNow)).toBe('skip-typing')
    expect(s.charsRevealed).toBe(6)
    // 反复按 Confirm —— 应 noop,不再重置 lineStartMs
    confirmDialog(s, skipNow + 50)
    confirmDialog(s, skipNow + 100)
    confirmDialog(s, skipNow + 150)
    expect(s.lineStartMs).toBe(NOW0 - 20) // 没被重置
    // 墙钟走到「跳字时刻 + 尾停顿」仍能推进(没被反复按死)
    tickDialog(s, skipNow + 480)
    expect(s.phase).toBe('typing')
    tickDialog(s, skipNow + 481)
    expect(s.phase).toBe('line-done')
  })

  it('line-done 后继续 tick → charsRevealed 不再增长', () => {
    const NOW0 = 0
    const s = startDialogLine('AB', { style: 'bottom', now: NOW0 })
    tickDialog(s, NOW0 + 1000) // 远超 doneAt
    expect(s.charsRevealed).toBe(2)
    expect(s.phase).toBe('line-done')
    tickDialog(s, NOW0 + 2000) // 继续 tick 不增长
    expect(s.charsRevealed).toBe(2)
  })

  it('appendDialogLine 续行重置 lineStartMs 为新行 now', () => {
    const NOW0 = 0
    const s = startDialogLine('第一行', { style: 'bottom', now: NOW0 })
    tickDialog(s, NOW0 + 100)
    finishDefaultTickLine(s) // line-done
    const NOW1 = 10_000_000
    appendDialogLine(s, '第二行长一点字', NOW1) // 续行传新 now
    expect(s.lineStartMs).toBe(NOW1)
    expect(s.phase).toBe('typing')
    tickDialog(s, NOW1 + 24)
    expect(s.charsRevealed).toBe(2) // 续行从 NOW1 起算
  })
})

describe('Sync.2 DialogBox · tickDialog typing', () => {
  it('默认速度时间驱动(sdlpal iDelayTime=3 → 24ms/字):100ms/tick 内一次出多字', () => {
    const s = startDialogLine('你好世界朋友们大家好啊', { style: 'bottom' }) // 11 字
    tickDialog(s) // elapsed=100ms,24ms/字 → revealAt 0/24/48/72/96 <=100 → 5 字
    expect(s.charsRevealed).toBe(5)
    expect(s.phase).toBe('typing')
  })

  it('$NN 变速:$10(iDelay=14 → 112ms/字)远慢 → 1 tick 仅 1 字', () => {
    const s = startDialogLine('$10李逍遥赵灵儿', { style: 'bottom' }) // $10 消费,iDelay=floor(100/7)=14
    expect(s.currentLineText).toBe('李逍遥赵灵儿') // $10 不显字面
    tickDialog(s) // elapsed=100ms < 112 → 仅 revealAt[0]=0<=100 → 1 字
    expect(s.charsRevealed).toBe(1)
    tickDialog(s) // 200ms → revealAt 0,112 <=200 → 2 字
    expect(s.charsRevealed).toBe(2)
  })

  it('charsRevealed === currentLineText.length 时 phase → line-done', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(1)
    expect(s.phase).toBe('line-done')
  })

  it('`~NN` 尾暂停结束后标记保留完整文字一帧', () => {
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center' })
    for (let i = 0; i < 5; i++) tickDialog(s) // 500ms:整句已出,但未到 601ms doneAt
    expect(s.charsRevealed).toBe(6)
    expect(s.phase).toBe('typing')
    expect(s.lineDoneRenderPending).toBe(false)

    tickDialog(s) // 600ms 仍略小于 144+457=601ms
    expect(s.phase).toBe('typing')

    tickDialog(s) // 700ms:尾暂停结束,但 event-system 需先渲染完整文字一帧
    expect(s.phase).toBe('line-done')
    expect(s.lineDoneRenderPending).toBe(true)
  })

  it('line-done 后继续 tick → charsRevealed 不再增长', () => {
    const s = startDialogLine('AB', { style: 'bottom' })
    for (let i = 0; i < FRAMES_PER_CHAR * 10; i++) tickDialog(s)
    expect(s.charsRevealed).toBe(2)
    expect(s.phase).toBe('line-done')
  })
})

describe('Sync.2 DialogBox · confirmDialog 4 case', () => {
  it('typing 中 → skip-typing(跳行末,不翻页)', () => {
    const s = startDialogLine('hello world', { style: 'bottom' })
    expect(s.charsRevealed).toBeLessThan(11)
    const r = confirmDialog(s)
    expect(r).toBe('skip-typing')
    expect(s.charsRevealed).toBe(11)
    expect(s.phase).toBe('line-done')
  })

  it('line-done 状态下 Confirm → noop(等自动推进)', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    finishDefaultTickLine(s)
    expect(s.phase).toBe('line-done')
    const r = confirmDialog(s)
    expect(r).toBe('noop')
  })

  it('waiting-page-key 状态 → page-advance + 清 shownLines / currentLineText', () => {
    const s = startDialogLine('l1', { style: 'bottom' })
    finishDefaultTickLine(s)
    setWaitingPageKey(s)
    expect(s.phase).toBe('waiting-page-key')
    const r = confirmDialog(s)
    expect(r).toBe('page-advance')
    expect(s.shownLines).toEqual([])
    expect(s.currentLineText).toBeNull()
  })

  it('waiting-end-key 状态 → dialog-end', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    finishDefaultTickLine(s)
    setWaitingEndKey(s)
    expect(s.phase).toBe('waiting-end-key')
    const r = confirmDialog(s)
    expect(r).toBe('dialog-end')
  })
})

describe('Sync.2 DialogBox · MAX_LINES_PER_PAGE 真值', () => {
  it('MAX_LINES_PER_PAGE = 4(sdlpal text.c:1649 nCurrentDialogLine > 3)', () => {
    expect(MAX_LINES_PER_PAGE).toBe(4)
  })
})

describe('resetDialogBody(sdlpal PAL_ClearDialog 等价:清正文不擦 title/portrait)', () => {
  it('清 shownLines/current/计数/typing 态 → line-done;保留 titleText/portraitIcon/style/fontColor', () => {
    const state = startDialogLine('李逍遥:', { style: 'top', portraitIcon: 7 })
    expect(state.titleText).toBe('李逍遥:') // 前提:姓名行走 title 路径

    appendDialogLine(state, '正文第一句')
    tickDialog(state, 120) // 五字各24ms，首行已自然完成；不用跳字改变后续userSkip。
    appendDialogLine(state, '正文第二句', 120)
    tickDialog(state, 144)
    expect(state.phase).toBe('typing')
    expect(state.typingFrames).toBe(1)
    expect(state.charsRevealed).toBe(2)
    expect(state.shownLines).toEqual(['正文第一句'])
    expect(state.dialogLineCount).toBe(2)

    resetDialogBody(state)

    // 正文/翻页态全清:
    expect(state.shownLines).toEqual([])
    expect(state.shownLineColors).toEqual([])
    expect(state.currentLineText).toBeNull()
    expect(state.currentLineColors).toBeUndefined()
    expect(state.currentLineRevealAt).toBeUndefined()
    expect(state.dialogLineCount).toBe(0)
    expect(state.typingFrames).toBe(0)
    expect(state.charsRevealed).toBe(0)
    expect(state.phase).toBe('line-done')
    expect(state.keyIconBlink).toBe(false)
    // title/portrait/style/fontColor 保留(sdlpal text.c:1775:ClearDialog 不擦 title/portrait):
    expect(state.titleText).toBe('李逍遥:')
    expect(state.portraitIcon).toBe(7)
    expect(state.style).toBe('top')
    expect(state.fontColor).toBe(FONT_COLOR_DEFAULT)
  })
})
