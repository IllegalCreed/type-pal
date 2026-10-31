import { describe, expect, it } from 'vitest'
import {
  FONT_COLOR_CYAN,
  FONT_COLOR_DEFAULT,
  FONT_COLOR_RED,
  FONT_COLOR_RED_ALT,
  FONT_COLOR_YELLOW,
  isCharacterNameLine,
  parseDialogText,
} from './dialog-box.js'

describe('parseDialogText 控制符 state machine(sdlpal TEXT_DisplayText text.c:1458-1613)', () => {
  const defaultColor = FONT_COLOR_DEFAULT

  it('普通对话(isDialog=FALSE):`"..."` 整句黄 + 引号消费(用户报的"黄色文字")', () => {
    const r = parseDialogText('"双手端着物品无法爬下去"', defaultColor, false)
    expect(r.text).toBe('双手端着物品无法爬下去') // 引号不字面显示
    expect(r.colors).toEqual(new Array<number>(11).fill(FONT_COLOR_YELLOW)) // 全黄
    expect(r.endColor).toBe(defaultColor) // 闭合 `"` → 回 DEFAULT
  })

  it('narration(isDialog=TRUE):`"` 被消费但**不**变黄(text.c:1522 !isDialog 门控)+ DEFAULT→0', () => {
    const r = parseDialogText('"提示"', defaultColor, true)
    expect(r.text).toBe('提示')
    expect(r.colors).toEqual([0, 0]) // isDialog DEFAULT→0,黄被屏蔽
  })

  it("`-` 青 / `'` 红 / `@` 红alt toggle(普通对话)", () => {
    expect(parseDialogText('-青-', defaultColor, false).colors).toEqual([FONT_COLOR_CYAN]) // 中间 1 字
    expect(parseDialogText("'红'", defaultColor, false).colors).toEqual([FONT_COLOR_RED])
    expect(parseDialogText('@朱@', defaultColor, false).colors).toEqual([FONT_COLOR_RED_ALT])
  })

  it('`$NN` 消费 3 字符(typing 速度,不显字面)', () => {
    const r = parseDialogText('$10李逍遥', defaultColor, false)
    expect(r.text).toBe('李逍遥') // $10 吃掉
  })

  it('`~` 本行提前结束(其后丢弃,text.c:1554 return)+ endedWithTilde=true(text.c:1552 line=-1)', () => {
    const r = parseDialogText('李逍遥！~30后面不显', defaultColor, false)
    expect(r.text).toBe('李逍遥！')
    expect(r.endedWithTilde).toBe(true) // `~` 收尾 → 行计数复位 0 → 段末不等键不画箭头
  })

  it('普通行(无 `~` 收尾)endedWithTilde=false → 正文行计数 ++', () => {
    expect(parseDialogText('李逍遥', defaultColor, false).endedWithTilde).toBe(false)
    expect(parseDialogText('哦！)', defaultColor, false).endedWithTilde).toBe(false) // `)` 设 icon 但非 `~`
  })

  it('`(` / `)` 设 icon + 消费(不字面显示括号)', () => {
    expect(parseDialogText('哦！)', defaultColor, false)).toMatchObject({ text: '哦！', icon: 1 })
    expect(parseDialogText('啊．．(', defaultColor, false)).toMatchObject({
      text: '啊．．',
      icon: 2,
    })
  })

  it('`\\` 转义:画下一字符字面(\\" → 字面引号)', () => {
    const r = parseDialogText('\\"', defaultColor, false)
    expect(r.text).toBe('"') // 转义后引号字面显示
  })

  it('endColor 跨行持续:未闭合 `"` → 下一行起始仍黄', () => {
    const r1 = parseDialogText('"未闭合', defaultColor, false)
    expect(r1.endColor).toBe(FONT_COLOR_YELLOW) // 奇数个 " → 停在黄
    const r2 = parseDialogText('续行', r1.endColor, false)
    expect(r2.colors).toEqual([FONT_COLOR_YELLOW, FONT_COLOR_YELLOW]) // 续行继承黄
  })

  it('混色:默认文本 + `"黄词"` + 默认(逐字符色正确)', () => {
    const r = parseDialogText('得到"紫金丹"了', defaultColor, false)
    expect(r.text).toBe('得到紫金丹了') // 6 字:得到(默认)紫金丹(黄)了(默认)
    expect(r.colors).toEqual([
      defaultColor,
      defaultColor,
      FONT_COLOR_YELLOW,
      FONT_COLOR_YELLOW,
      FONT_COLOR_YELLOW,
      defaultColor,
    ])
  })

  it('默认 revealAt:每字 iDelayTime(3)*8=24ms(sdlpal text.c:885/1600)', () => {
    const r = parseDialogText('李逍遥', defaultColor, false)
    expect(r.revealAt).toEqual([0, 24, 48]) // 24ms/字
    expect(r.doneAt).toBe(72) // 3*24
    expect(r.endIDelay).toBe(3)
  })

  it('`$10` 变速:iDelay=floor(100/7)=14 → 112ms/字(text.c:1538)', () => {
    const r = parseDialogText('$10李逍遥', defaultColor, false)
    expect(r.text).toBe('李逍遥')
    expect(r.revealAt).toEqual([0, 112, 224]) // 14*8=112ms/字
    expect(r.endIDelay).toBe(14) // 跨行持续
  })

  it('`~NN` 尾暂停:doneAt 含 NN*80/7 ms(text.c:1551)', () => {
    const r = parseDialogText('快走！~30', defaultColor, false)
    expect(r.text).toBe('快走！') // ~30 截断
    // 3 字 24ms → cum=72;~30 → floor(30*80/7)=342;doneAt=72+342=414
    expect(r.doneAt).toBe(72 + Math.floor((30 * 80) / 7))
  })

  it('`~40` 一夜过去:原版尾暂停 floor(40*80/7)=457ms', () => {
    const r = parseDialogText('"一夜过去．．"~40', defaultColor, false)
    expect(r.text).toBe('一夜过去．．')
    expect(r.doneAt).toBe(6 * 24 + Math.floor((40 * 80) / 7))
  })

  it('iDelay 跨行:startIDelay 参数继承上行 endIDelay', () => {
    const r = parseDialogText('续行', defaultColor, false, 14) // 上行 $10 留下 iDelay=14
    expect(r.revealAt).toEqual([0, 112]) // 继承 112ms/字
  })
})

describe('parseDialogText narration tail delay(text.c:1551-1554)', () => {
  it('narration/isDialog=true consumes ~NN without waiting', () => {
    const parsed = parseDialogText('A~40', FONT_COLOR_DEFAULT, true)
    // TS parser bookkeeping retains the24ms character schedule. The narration painter
    // draws the whole line at once; C skips both character and tilde waits for isDialog.
    // This return-value test does not claim a24ms visible narration delay.
    expect(parsed.doneAt).toBe(24)
    expect(parsed.endedWithTilde).toBe(true)
  })
})

describe('isCharacterNameLine(sdlpal text.c:1717-1719 三种冒号结尾判姓名)', () => {
  it.each([
    ['半角冒号(U+003A)', '李逍遥:', true],
    ['全角冒号(U+FF1A)', '李逍遥\uFF1A', true],
    ['ratio 冒号(U+2236)', '李逍遥\u2236', true],
    ['非冒号结尾', '李逍遥来了', false],
    ['冒号在中间', '李:逍遥', false],
    ['空串', '', false],
  ])('%s → %s', (_name, text, expected) => {
    expect(isCharacterNameLine(text)).toBe(expected)
  })
})
