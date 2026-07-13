import { describe, expect, it } from 'vitest'
import { decodeGbk, fixupTranscodeResidue } from './gbk.js'

// PUA 字符用码点构造,避免源码内出现不可见私用区字符。
const P = (...cps: number[]): string => String.fromCodePoint(...cps)

describe('decodeGbk', () => {
  it('单字符 ASCII 不动', () => {
    expect(decodeGbk(new Uint8Array([0x41]))).toBe('A')
  })

  it('GBK "李逍遥" → UTF-8', () => {
    // 李 = 0xC0 0xEE, 逍 = 0xE5 0xD0, 遥 = 0xD2 0xA3
    const bytes = new Uint8Array([0xc0, 0xee, 0xe5, 0xd0, 0xd2, 0xa3])
    expect(decodeGbk(bytes)).toBe('李逍遥')
  })

  it('遇到 0x00 截断(C 字符串语义)', () => {
    const bytes = new Uint8Array([0x41, 0x00, 0x42])
    expect(decodeGbk(bytes)).toBe('A')
  })

  it('GBK 正文 + 造字区残留字节 端到端还原(余杭镇 婶婶房◆传来声音)', () => {
    // 婶=C9F4 婶=C9F4 房=B7BF [AFBA=裡] 传=B4AB 来=C0B4 声=C9F9 音=D2F4
    const bytes = new Uint8Array([
      0xc9, 0xf4, 0xc9, 0xf4, 0xb7, 0xbf, 0xaf, 0xba, 0xb4, 0xab, 0xc0, 0xb4, 0xc9, 0xf9, 0xd2,
      0xf4,
    ])
    expect(decodeGbk(bytes)).toBe('婶婶房里传来声音')
  })
})

describe('fixupTranscodeResidue(转码残留还原)', () => {
  it('正常文本无 PUA → 原样快速返回', () => {
    expect(fixupTranscodeResidue('婶婶房传来声音')).toBe('婶婶房传来声音')
    expect(fixupTranscodeResidue('李逍遥')).toBe('李逍遥')
  })

  it('繁体字残留 PUA → 用户确认的简体正字', () => {
    expect(fixupTranscodeResidue(`婶婶房${P(0xe1ef)}传来声音`)).toBe('婶婶房里传来声音') // 裡→里
    expect(fixupTranscodeResidue(`武功${P(0xe1e0)}逐出师门`)).toBe('武功并逐出师门') // 並→并
    expect(fixupTranscodeResidue(`花多少钱都没关${P(0xe1c7)}`)).toBe('花多少钱都没关系') // 係→系
    expect(fixupTranscodeResidue(`不${P(0xe18c)},我向来`)).toBe('不过,我向来') // 過→过
    expect(fixupTranscodeResidue(`方老${P(0xe179)}`)).toBe('方老板')
    expect(fixupTranscodeResidue(`妾身再去${P(0xe1e2)}`)).toBe('妾身再去采')
    expect(fixupTranscodeResidue(`我觉得好${P(0xe1a1)}`)).toBe('我觉得好困')
    expect(fixupTranscodeResidue(`你去${P(0xe1f1)}`)).toBe('你去啰')
  })

  it('BIG5 标点残留 PUA → 标准标点', () => {
    expect(fixupTranscodeResidue(`刃部锋利${P(0xe4c7)}`)).toBe('刃部锋利，') // A141
    expect(fixupTranscodeResidue(`使死者复活${P(0xe4c9)}`)).toBe('使死者复活。') // A143
    expect(fixupTranscodeResidue(`什么${P(0xe4cf)}`)).toBe('什么！') // A149
  })

  it('颜文字 / 噪声 PUA → 删(对齐 sdlpal 缺字空白)', () => {
    expect(fixupTranscodeResidue(`陪您玩了${P(0xe010)}`)).toBe('陪您玩了')
    expect(fixupTranscodeResidue(`不可以跟陌生人讲话${P(0xe790)}`)).toBe('不可以跟陌生人讲话')
    expect(fixupTranscodeResidue(`逍遥哥哥${P(0xe16d, 0xe16d)}`)).toBe('逍遥哥哥')
    expect(fixupTranscodeResidue(`我也决${P(0xe47e)}不会离开他`)).toBe('我也决不会离开他')
  })

  it('整条未转码 BIG5 → 正确简体', () => {
    expect(fixupTranscodeResidue(P(0xe16c, 0xe4cf))).toBe('哼！')
    expect(fixupTranscodeResidue(`${P(0xe4ca)}瑈猐${P(0xe5e7)}`)).toBe('流氓乙')
    expect(fixupTranscodeResidue(`${P(0xe4ca)}瑈猐ヒ`)).toBe('流氓甲')
    expect(fixupTranscodeResidue(`芬袍${P(0xe019, 0xe7b4, 0xe19d)}ぃì`)).toBe('炼蛊的材料不足')
  })

  it('未在映射表的 PUA → 删(空白,不残留方块)', () => {
    expect(fixupTranscodeResidue(`abc${P(0xe999)}def`)).toBe('abcdef')
  })
})
