import { describe, expect, it } from 'vitest'
import { parseDialogControlCodes } from './dialog-text.js'

describe('parseDialogControlCodes', () => {
  it('无控制码原样返回(快路径)', () => {
    expect(parseDialogControlCodes('李逍遥你好')).toEqual({ text: '李逍遥你好' })
  })

  it('$NN → 打字速度 ⌊NN*10/7⌋*8 ms/字,剥离控制码', () => {
    // $10 → iDelay=⌊100/7⌋=14 → 112ms
    const r = parseDialogControlCodes('$10李逍遥')
    expect(r.text).toBe('李逍遥')
    expect(r.speed).toBe(112)
    expect(r.autoAdvance).toBeUndefined()
  })

  it('$02 → 快速打字 16ms/字', () => {
    // $02 → iDelay=⌊20/7⌋=2 → 16ms
    expect(parseDialogControlCodes('$02哇哇').speed).toBe(16)
  })

  it('~NN → 尾停顿自动推进 ⌊NN*80/7⌋ ms', () => {
    // ~30 → ⌊2400/7⌋=342
    const r = parseDialogControlCodes('李逍遥！~30')
    expect(r.text).toBe('李逍遥！')
    expect(r.autoAdvance).toBe(342)
  })

  it('开场 dlg.0 真值:$ 与 ~ 组合,全角 ～ 保留、半角 ~30 解析', () => {
    const r = parseDialogControlCodes('$10李～逍～遥，李～逍～遥！~30')
    expect(r.text).toBe('李～逍～遥，李～逍～遥！')
    expect(r.speed).toBe(112)
    expect(r.autoAdvance).toBe(342)
  })

  it('~ 本行止:其后文本丢弃(text.c:1554 return)', () => {
    expect(parseDialogControlCodes('前~40后').text).toBe('前')
  })

  it('~ 无数字 → autoAdvance 0(打完立即自动推进、无光标)', () => {
    expect(parseDialogControlCodes('话~').autoAdvance).toBe(0)
  })

  it('剥离 " ( ) 颜色/图标符(reforge 走 <tag>/cursorFrame)', () => {
    expect(parseDialogControlCodes('"黄"(字)').text).toBe('黄字')
  })

  it('\\ 转义:下一字符字面显示', () => {
    expect(parseDialogControlCodes('价\\$5').text).toBe('价$5')
  })
})
