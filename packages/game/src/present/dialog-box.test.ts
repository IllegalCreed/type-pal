import { describe, expect, it } from 'vitest'
import {
  appendDialogLine,
  confirmDialog,
  type DialogSprite,
  drawDialogBox,
  FONT_COLOR_CYAN,
  FONT_COLOR_DEFAULT,
  FONT_COLOR_RED,
  FONT_COLOR_RED_ALT,
  FONT_COLOR_YELLOW,
  FRAMES_PER_CHAR,
  getDialogBoxRect,
  getDialogTextPos,
  MAX_LINES_PER_PAGE,
  parseDialogText,
  setWaitingEndKey,
  setWaitingPageKey,
  shouldWaitPageKey,
  startDialogLine,
  tickDialog,
} from './dialog-box.js'
import { createFramebuffer } from './framebuffer.js'

function mockSprite(w: number, h: number, colorIdx: number): DialogSprite {
  return {
    width: w,
    height: h,
    indices: new Uint8Array(w * h).fill(colorIdx),
    opaque: new Uint8Array(w * h).fill(1),
  }
}

/** typing 完 1 行(任何长度)— 跑足够多 tick。 */
function completeLine(s: ReturnType<typeof startDialogLine>): void {
  if (s.currentLineText === null) return
  for (let i = 0; i < FRAMES_PER_CHAR * s.currentLineText.length; i++) tickDialog(s)
}

/** `~NN` 尾停顿时长(ms)= doneAt - 末字 revealAt。Bug3 测试用。 */
function tailDelayOf(s: ReturnType<typeof startDialogLine>): number {
  const text = s.currentLineText
  const revealAt = s.currentLineRevealAt
  const doneAt = s.currentLineDoneAt
  if (text === null || revealAt === undefined || doneAt === undefined) return 0
  const lastReveal = revealAt[text.length - 1] ?? 0
  return doneAt - lastReveal
}

describe('parseDialogText 控制符 state machine(sdlpal TEXT_DisplayText text.c:1458-1613)', () => {
  const D = FONT_COLOR_DEFAULT
  it('普通对话(isDialog=FALSE):`"..."` 整句黄 + 引号消费(用户报的"黄色文字")', () => {
    const r = parseDialogText('"双手端着物品无法爬下去"', D, false)
    expect(r.text).toBe('双手端着物品无法爬下去') // 引号不字面显示
    expect(r.colors.every((c) => c === FONT_COLOR_YELLOW)).toBe(true) // 全黄
    expect(r.endColor).toBe(D) // 闭合 `"` → 回 DEFAULT
  })

  it('narration(isDialog=TRUE):`"` 被消费但**不**变黄(text.c:1522 !isDialog 门控)+ DEFAULT→0', () => {
    const r = parseDialogText('"提示"', D, true)
    expect(r.text).toBe('提示')
    expect(r.colors.every((c) => c === 0)).toBe(true) // isDialog DEFAULT→0,黄被屏蔽
  })

  it("`-` 青 / `'` 红 / `@` 红alt toggle(普通对话)", () => {
    expect(parseDialogText('-青-', D, false).colors).toEqual([FONT_COLOR_CYAN]) // 中间 1 字
    expect(parseDialogText("'红'", D, false).colors).toEqual([FONT_COLOR_RED])
    expect(parseDialogText('@朱@', D, false).colors).toEqual([FONT_COLOR_RED_ALT])
  })

  it('`$NN` 消费 3 字符(typing 速度,不显字面)', () => {
    const r = parseDialogText('$10李逍遥', D, false)
    expect(r.text).toBe('李逍遥') // $10 吃掉
  })

  it('`~` 本行提前结束(其后丢弃,text.c:1554 return)+ endedWithTilde=true(text.c:1552 line=-1)', () => {
    const r = parseDialogText('李逍遥！~30后面不显', D, false)
    expect(r.text).toBe('李逍遥！')
    expect(r.endedWithTilde).toBe(true) // `~` 收尾 → 行计数复位 0 → 段末不等键不画箭头
  })

  it('普通行(无 `~` 收尾)endedWithTilde=false → 正文行计数 ++', () => {
    expect(parseDialogText('李逍遥', D, false).endedWithTilde).toBe(false)
    expect(parseDialogText('哦！)', D, false).endedWithTilde).toBe(false) // `)` 设 icon 但非 `~`
  })

  it('`(` / `)` 设 icon + 消费(不字面显示括号)', () => {
    expect(parseDialogText('哦！)', D, false)).toMatchObject({ text: '哦！', icon: 1 })
    expect(parseDialogText('啊．．(', D, false)).toMatchObject({ text: '啊．．', icon: 2 })
  })

  it('`\\` 转义:画下一字符字面(\\" → 字面引号)', () => {
    const r = parseDialogText('\\"', D, false)
    expect(r.text).toBe('"') // 转义后引号字面显示
  })

  it('endColor 跨行持续:未闭合 `"` → 下一行起始仍黄', () => {
    const r1 = parseDialogText('"未闭合', D, false)
    expect(r1.endColor).toBe(FONT_COLOR_YELLOW) // 奇数个 " → 停在黄
    const r2 = parseDialogText('续行', r1.endColor, false)
    expect(r2.colors.every((c) => c === FONT_COLOR_YELLOW)).toBe(true) // 续行继承黄
  })

  it('混色:默认文本 + `"黄词"` + 默认(逐字符色正确)', () => {
    const r = parseDialogText('得到"紫金丹"了', D, false)
    expect(r.text).toBe('得到紫金丹了') // 6 字:得到(默认)紫金丹(黄)了(默认)
    expect(r.colors).toEqual([D, D, FONT_COLOR_YELLOW, FONT_COLOR_YELLOW, FONT_COLOR_YELLOW, D])
  })

  it('默认 revealAt:每字 iDelayTime(3)*8=24ms(sdlpal text.c:885/1600)', () => {
    const r = parseDialogText('李逍遥', D, false)
    expect(r.revealAt).toEqual([0, 24, 48]) // 24ms/字
    expect(r.doneAt).toBe(72) // 3*24
    expect(r.endIDelay).toBe(3)
  })

  it('`$10` 变速:iDelay=floor(100/7)=14 → 112ms/字(text.c:1538)', () => {
    const r = parseDialogText('$10李逍遥', D, false)
    expect(r.text).toBe('李逍遥')
    expect(r.revealAt).toEqual([0, 112, 224]) // 14*8=112ms/字
    expect(r.endIDelay).toBe(14) // 跨行持续
  })

  it('`~NN` 尾暂停:doneAt 含 NN*80/7 ms(text.c:1551)', () => {
    const r = parseDialogText('快走！~30', D, false)
    expect(r.text).toBe('快走！') // ~30 截断
    // 3 字 24ms → cum=72;~30 → floor(30*80/7)=342;doneAt=72+342=414
    expect(r.doneAt).toBe(72 + Math.floor((30 * 80) / 7))
  })

  it('`~40` 一夜过去:原版尾暂停 floor(40*80/7)=457ms', () => {
    const r = parseDialogText('"一夜过去．．"~40', D, false)
    expect(r.text).toBe('一夜过去．．')
    expect(r.doneAt).toBe(6 * 24 + Math.floor((40 * 80) / 7))
  })

  it('iDelay 跨行:startIDelay 参数继承上行 endIDelay', () => {
    const r = parseDialogText('续行', D, false, 14) // 上行 $10 留下 iDelay=14
    expect(r.revealAt).toEqual([0, 112]) // 继承 112ms/字
  })
})

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
    expect(s.fontColor).toBe(FONT_COLOR_DEFAULT)
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
    completeLine(s)
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
    completeLine(s)
    expect(shouldWaitPageKey(s)).toBe(false)
    appendDialogLine(s, 'l2')
    completeLine(s)
    appendDialogLine(s, 'l3')
    completeLine(s)
    appendDialogLine(s, 'l4')
    completeLine(s)
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
    const s = startDialogLine('你好世界朋友们', { style: 'bottom', now: NOW0 }) // 8 字
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
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center', now: NOW0 })
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

  // Bug3(2026-06-26):`~` 尾行跳字后卡到完整 doneAt 的 bug。
  // 现象(用户报):梦境开场 "$10李～逍～遥~30" 这类 `~NN` 自动延时台词,打字中途按回车/空格,
  //   台词"无限重播"——实际是卡住 1.7s 才推进(doneAt),玩家以为没反应反复按。
  //
  // sdlpal 真值(text.c:1546-1554):`~NN` 行即使 fUserSkip 跳字,也只 `UTIL_Delay(NN*80/7)`
  //   (≈ ~NN 尾停顿时长),**不**从行起始重等整个 doneAt。即跳字后「剩余字符瞬显 + 等 ~NN 尾停顿」。
  //
  // 根因:bug1 wall-clock 修复(bdf6878)把 tickDialog 打字推进改成 elapsed = now - lineStartMs,
  //   但 confirmDialog 的 `~` 跳字快进仍只改 typingFrames(tick 驱动),没对齐 wall-clock。
  //   → 跳字后 tickDialog 仍按 lineStartMs 算 elapsed,必须真实墙钟走到 doneAt(含已消耗的打字时间),
  //   typingFrames 快进无效 → 玩家被迫从 0 重等整个 doneAt。
  it('Bug3:`~NN` 尾行打字中途跳字 → 只等 ~NN 尾停顿,不卡到完整 doneAt(对齐 sdlpal text.c:1551)', () => {
    const NOW0 = 2_000_000
    // "一夜过去．．"~40 : doneAt = 末字(144) + ~40 尾停(457) = 601ms
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center', now: NOW0 })
    tickDialog(s, NOW0 + 100) // 打字中途:100ms,仅显几个字,远未到 doneAt 601
    expect(s.charsRevealed).toBeLessThan(6)
    expect(s.phase).toBe('typing')
    // 此时(墙钟 100ms)按 Confirm 跳字
    const skipNow = NOW0 + 100
    expect(confirmDialog(s, skipNow)).toBe('skip-typing')
    expect(s.charsRevealed).toBe(6) // 整行瞬显
    // sdlpal 真值:跳字后只等 ~40 尾停顿,从「跳字时刻」起算。
    //   尾停顿 = doneAt - 末字 revealAt = 601 - 120 = 481ms(~40 ≈ 40*80/7=457 + 打字舍入)。
    //   即跳字时刻 + 481ms 应已 line-done,而非卡到完整 doneAt(从行起算 601ms)。
    tickDialog(s, skipNow + tailDelayOf(s)) // 跳字时刻 + ~40 尾停顿
    expect(s.phase).toBe('line-done') // 应已推进(只等了尾停顿,没卡到完整 doneAt)
  })

  // Bug3-2(2026-06-26):反复按 Confirm 不能无限重置 `~NN` 尾停顿。
  // 现象(用户报):`~30` 台词跳字后,不停按空格 → 永远卡在这句,第二句出不来。
  //
  // 根因:Bug3 修法(跳字时 lineStartMs = now - lastReveal)在「每个 tick 都按 Confirm」时会反复重设
  //   lineStartMs(跟着 nowMs 涨)→ elapsed 永远 ≈ lastReveal,永远到不了 doneAt → 尾停顿被无限重置。
  //
  // sdlpal 真值(text.c:1551):`~NN` 尾停顿是固定时长同步阻塞 UTIL_Delay(~NN),玩家按键只是「穿透」进
  //   dwKeyPress、delay 照常走完 —— 不可重置、不可加速。tick 模型对等:跳字进入尾停顿等待后,后续
  //   Confirm 应 noop(不重置 lineStartMs),让墙钟自然走到尾停顿结束。
  it('Bug3-2:`~NN` 尾行跳字后再按 Confirm → 不重置尾停顿(noop),墙钟走到尾停顿结束仍推进', () => {
    const NOW0 = 2_000_000
    const s = startDialogLine('"一夜过去．．"~40', { style: 'center', now: NOW0 })
    tickDialog(s, NOW0 + 100) // 打字中途
    const skipNow = NOW0 + 100
    expect(confirmDialog(s, skipNow)).toBe('skip-typing')
    expect(s.charsRevealed).toBe(6)
    const lineStartMsAfterSkip = s.lineStartMs
    // 反复按 Confirm —— 应 noop,不再重置 lineStartMs
    confirmDialog(s, skipNow + 50)
    confirmDialog(s, skipNow + 100)
    confirmDialog(s, skipNow + 150)
    expect(s.lineStartMs).toBe(lineStartMsAfterSkip) // 没被重置
    // 墙钟走到「跳字时刻 + 尾停顿」仍能推进(没被反复按死)
    tickDialog(s, skipNow + tailDelayOf(s))
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
    completeLine(s) // line-done
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
    expect(s.charsRevealed).toBeGreaterThanOrEqual(4)
    expect(s.charsRevealed).toBeLessThan(s.currentLineText?.length ?? 0) // 长行未全出
    expect(s.phase).toBe('typing')
  })

  it('$NN 变速:$10(iDelay=14 → 112ms/字)远慢 → 1 tick 仅 1 字', () => {
    const s = startDialogLine('$10李逍遥赵灵儿', { style: 'bottom' }) // $10 消费,iDelay=floor(140/7)=14
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

  // sdlpal 真值:箭头**常显**,"闪烁"由 present 层 palette 0xF9-0xFE 轮转产生(text.c:1408-1426),
  //   不是 show/hide。等键期间每帧都应画出 icon(旧版会在 blink-off 帧消失)。
  it('等键 phase → icon 常显(不随 tick show/hide)', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const s = startDialogLine('A', { style: 'bottom' })
    completeLine(s)
    setWaitingEndKey(s)
    for (let n = 0; n < 40; n++) {
      fb.indices.fill(0)
      tickDialog(s)
      drawDialogBox(fb, s, undefined, { iconFrames: new Map([[0, icon]]) })
      expect(Array.from(fb.indices).some((i) => i === 99)).toBe(true)
    }
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
    completeLine(s)
    expect(s.phase).toBe('line-done')
    const r = confirmDialog(s)
    expect(r).toBe('noop')
  })

  it('waiting-page-key 状态 → page-advance + 清 shownLines / currentLineText', () => {
    const s = startDialogLine('l1', { style: 'bottom' })
    completeLine(s)
    setWaitingPageKey(s)
    expect(s.phase).toBe('waiting-page-key')
    const r = confirmDialog(s)
    expect(r).toBe('page-advance')
    expect(s.shownLines).toEqual([])
    expect(s.currentLineText).toBeNull()
  })

  it('waiting-end-key 状态 → dialog-end', () => {
    const s = startDialogLine('A', { style: 'bottom' })
    completeLine(s)
    setWaitingEndKey(s)
    expect(s.phase).toBe('waiting-end-key')
    const r = confirmDialog(s)
    expect(r).toBe('dialog-end')
  })
})

describe('Sync.2 DialogBox · getDialogBoxRect', () => {
  it('4 styles 返回不同 y 坐标', () => {
    expect(getDialogBoxRect('top').y).toBeLessThan(getDialogBoxRect('center').y)
    expect(getDialogBoxRect('center').y).toBeLessThan(getDialogBoxRect('bottom').y)
    expect(getDialogBoxRect('narration').y).toBe(getDialogBoxRect('bottom').y)
  })
})

describe('Sync.2 DialogBox · getDialogTextPos(sdlpal text.c:1313-1346 真值)', () => {
  it('top 无 portrait → (44, 26)', () => {
    expect(getDialogTextPos('top', false)).toEqual({ x: 44, y: 26 })
  })
  it('top 有 portrait → (96, 26)', () => {
    expect(getDialogTextPos('top', true)).toEqual({ x: 96, y: 26 })
  })
  it('center → (80, 40),不论 portrait', () => {
    expect(getDialogTextPos('center', false)).toEqual({ x: 80, y: 40 })
    expect(getDialogTextPos('center', true)).toEqual({ x: 80, y: 40 })
  })
  it('bottom 无 portrait → (44, 126)', () => {
    expect(getDialogTextPos('bottom', false)).toEqual({ x: 44, y: 126 })
  })
  it('bottom 有 portrait → (20, 126)', () => {
    expect(getDialogTextPos('bottom', true)).toEqual({ x: 20, y: 126 })
  })
  it('narration 同 bottom', () => {
    expect(getDialogTextPos('narration', false)).toEqual(getDialogTextPos('bottom', false))
    expect(getDialogTextPos('narration', true)).toEqual(getDialogTextPos('bottom', true))
  })
})

describe('Sync.2 DialogBox · drawDialogBox 不画 box bg', () => {
  it('charsRevealed=0 且无 portrait → fb 完全空', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('x', { style: 'bottom' })
    drawDialogBox(fb, state, undefined, undefined)
    const nonZero = Array.from(fb.indices).some((i) => i !== 0)
    expect(nonZero).toBe(false)
  })

  it('typing 完一字 → fontColor 像素存在,无 255 边框色', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true)
    expect(Array.from(fb.indices).some((i) => i === 255)).toBe(false)
  })

  it('多行(shownLines + currentLine)都画在 fb', () => {
    const fb = createFramebuffer()
    const state = startDialogLine('l1', { style: 'bottom', fontColor: 200 })
    completeLine(state)
    appendDialogLine(state, 'l2')
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    const count = Array.from(fb.indices).filter((i) => i === 200).length
    expect(count).toBeGreaterThan(0)
  })

  // sdlpal text.c:1144-1156 真值:文字阴影 = 三层 (+1,0)/(0,+1)/(+1,+1) **color 0**(非旧单层 color 50)。
  //   color 0 与空 fb 默认值同 → 用非 0 背景填充让阴影像素可辨。
  it('对话文字 → 主色 200 + 三层阴影 color 0(取代旧单层 color 50)', () => {
    const fb = createFramebuffer()
    fb.indices.fill(77) // 非 0 背景:阴影 color 0 才能与背景区分
    const state = startDialogLine('A', { style: 'bottom', fontColor: 200 })
    completeLine(state)
    drawDialogBox(fb, state, undefined, undefined)
    expect(Array.from(fb.indices).some((i) => i === 200)).toBe(true) // 主色
    expect(Array.from(fb.indices).some((i) => i === 0)).toBe(true) // 三层阴影 color 0
    expect(Array.from(fb.indices).some((i) => i === 50)).toBe(false) // 不再是旧单层 color 50
  })

  it('5 styles 绘制不抛错(无 ctx)', () => {
    for (const style of ['top', 'center', 'bottom', 'narration', 'item-box'] as const) {
      const fb = createFramebuffer()
      const state = startDialogLine('x', { style })
      expect(() => drawDialogBox(fb, state, undefined, undefined)).not.toThrow()
    }
  })

  it('item-box 物品框:居中 ITEMBOX 精灵 + 物品 BALL 图标@box+(8,7)(script.c:1483-1508)', () => {
    const fb = createFramebuffer()
    // uiSpriteFrames:SingleLineBox(44/45/46)+ ITEMBOX(70,64×64)
    const ui: unknown[] = []
    ui[44] = mockSprite(4, 16, 11)
    ui[45] = mockSprite(8, 16, 11)
    ui[46] = mockSprite(4, 16, 11)
    ui[70] = mockSprite(64, 64, 22)
    const icon = mockSprite(24, 24, 33) // 物品 BALL 图标(bitmap=5)
    const state = {
      shownLines: [],
      currentLineText: null,
      typingFrames: 0,
      charsRevealed: 0,
      dialogLineCount: 0,
      phase: 'line-done' as const,
      style: 'item-box' as const,
      fontColor: 0,
      shadow: true,
      keyIconBlink: false,
      itemBox: { itemId: 100, line1: '炼出', line2: '金创药' },
    }
    drawDialogBox(fb, state as any, undefined, {
      uiSpriteFrames: ui as any,
      itemIcons: new Map([[5, icon as any]]),
      items: [{ id: 100, bitmap: 5 } as any],
    })
    // ITEMBOX 屏幕居中:(320-64)/2=128, (200-64)/2=68 → 画了 22
    expect(fb.indices[68 * 320 + 128]).toBe(22)
    // 物品图标 @ box+(8,7) = (136, 75) → 画了 33
    expect(fb.indices[75 * 320 + 136]).toBe(33)
  })
})

describe('Sync.2 DialogBox · portrait 真做(sdlpal text.c:1289-1310 真位置)', () => {
  it('top + portrait → blit 在 (48 - w/2, 55 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'top', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(fb.indices[39 * 320 + 32]).toBe(77)
    expect(fb.indices[(39 + 31) * 320 + (32 + 31)]).toBe(77)
    expect(fb.indices[39 * 320 + 31]).toBe(0)
  })

  it('bottom + portrait → blit 在 (270 - w/2, 144 - h/2)', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'bottom', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(fb.indices[128 * 320 + 254]).toBe(77)
    expect(fb.indices[(128 + 31) * 320 + (254 + 31)]).toBe(77)
  })

  it('center style → 不画 portrait', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('hi', { style: 'center', portraitIcon: 5 })
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    expect(Array.from(fb.indices).some((i) => i === 77)).toBe(false)
  })

  it('portraitLayout=true 但 portraitIcon=undefined(0x05 擦立绘后续话):不画图、文本仍缩进 x≥96', () => {
    // 扬州师爷"大人息怒"解耦真值:立绘图被 PAL_MakeScene 擦(portraitIcon=undefined),但 posDialogText
    //   持久缩进(portraitLayout=true)→ 屏上无立绘像素、文本 x≥96(非无缩进的 44)。画图与布局解耦。
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('A', {
      style: 'top',
      portraitIcon: undefined,
      portraitLayout: true,
      fontColor: 200,
    })
    completeLine(state)
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]), // 图库在,但 portraitIcon=undefined → 不取用
    })
    expect(Array.from(fb.indices).some((i) => i === 77)).toBe(false) // 不画立绘图
    let minX = 320
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 200 && x < minX) minX = x
      }
    }
    expect(minX).toBeGreaterThanOrEqual(96) // 缩进保留(对齐有立绘布局,而非无缩进 44)
  })

  it('top + portrait → text X 起始 ≥ 96', () => {
    const fb = createFramebuffer()
    const portrait = mockSprite(32, 32, 77)
    const state = startDialogLine('A', { style: 'top', portraitIcon: 5, fontColor: 200 })
    completeLine(state)
    drawDialogBox(fb, state, undefined, {
      portraitFrames: new Map([[5, portrait]]),
    })
    let minX = 320
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 200 && x < minX) minX = x
      }
    }
    expect(minX).toBeGreaterThanOrEqual(96)
  })
})

describe('Sync.2 DialogBox · key icon(sdlpal text.c:1391)', () => {
  it('waiting-page-key → blit icon(常显,不再 gate keyIconBlink)', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialogLine('A', { style: 'bottom' })
    completeLine(state)
    setWaitingPageKey(state)
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(true)
  })

  // sdlpal text.c:1745 `posIcon = PAL_XY(x, y)`:x = 本行文字画完后的末尾 x,y = 本行 y。
  // 不是固定右下角(旧 bug:iconX=280, iconY=行y+12)。
  it('icon 位置 = 本行文字末尾 x + 本行 y(sdlpal posIcon 真值)', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    // style=bottom 无 portrait → basePos=(44,126);glyphs=undefined → measureText 每字 16px。
    const state = startDialogLine('AB', { style: 'bottom' })
    completeLine(state)
    setWaitingEndKey(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    let minX = 320
    let minY = 200
    for (let y = 0; y < 200; y++) {
      for (let x = 0; x < 320; x++) {
        if (fb.indices[y * 320 + x] === 99) {
          if (x < minX) minX = x
          if (y < minY) minY = y
        }
      }
    }
    // 'AB' = 2 字 × 16px = 32 → iconX = 44 + 32 = 76;iconY = 126 + 0*18 = 126(无 +12)
    expect(minX).toBe(76)
    expect(minY).toBe(126)
    // 绝不在固定右下角 280
    expect(minX).toBeLessThan(280)
  })

  it('typing 中(phase=typing)→ 不画 icon', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialogLine('A long line', { style: 'bottom' })
    tickDialog(state)
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(false)
  })

  // sdlpal text.c:1385-1386 守卫:bDialogPosition==kDialogCenter 即便等键也**不**画 icon。
  it('center style 即使 waiting → 不画 icon(sdlpal kDialogCenter 守卫)', () => {
    const fb = createFramebuffer()
    const icon = mockSprite(8, 8, 99)
    const state = startDialogLine('画外音', { style: 'center' })
    completeLine(state)
    setWaitingEndKey(state) // 即便强行进等键态
    drawDialogBox(fb, state, undefined, { iconFrames: new Map([[0, icon]]) })
    expect(Array.from(fb.indices).some((i) => i === 99)).toBe(false) // center 无箭头
  })
})

describe('Sync.2 DialogBox · MAX_LINES_PER_PAGE 真值', () => {
  it('MAX_LINES_PER_PAGE = 4(sdlpal text.c:1649 nCurrentDialogLine > 3)', () => {
    expect(MAX_LINES_PER_PAGE).toBe(4)
  })
})
