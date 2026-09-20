/**
 * TEST-EDITOR-IMPORT-CODEC-1 C8：video-metadata BMFF 三态（video-metadata.ts）。
 * 钉 undefined（非可识别 MP4）/ false（可解析、无音轨）/ true（含 soun hdlr）三态，
 * 以及 64 位扩展 size、size=0 到文件尾、截断拒绝、meta 容器 +4 偏移、hdlr 深度嵌套。
 */
import { describe, expect, test } from 'vitest'
import {
  audioMp4,
  box,
  concat,
  fourCc,
  u32Be,
  videoOnlyMp4,
} from './__tests__/glm-import-codec-fixtures.js'
import { mp4HasAudioTrack } from './video-metadata.js'

const u32 = u32Be

describe('C8 三态钉 undefined / false / true', () => {
  test('短文件与非 ftyp 开头 → undefined；纯视频 → false；含 soun → true', () => {
    expect(mp4HasAudioTrack(new Uint8Array(8))).toBeUndefined()
    expect(mp4HasAudioTrack(box('moov', fourCc('x')))).toBeUndefined() // 首 box 非 ftyp
    expect(mp4HasAudioTrack(videoOnlyMp4())).toBe(false)
    expect(mp4HasAudioTrack(audioMp4())).toBe(true)
  })
  test('hdlr 指向 vide 不算音轨；hdlr 内容不足 12 字节跳过', () => {
    // hdlr 内容: version/flags(4) + pre-defined(4) + handler(4)。handler='vide' → 不命中
    const videHdlr = box(
      'hdlr',
      concat([u32(0), fourCc('soun'), fourCc('vide'), new Uint8Array(12)]),
    )
    const videoTrack = concat([box('ftyp', fourCc('isom')), box('moov', box('trak', videHdlr))])
    expect(mp4HasAudioTrack(videoTrack)).toBe(false)
    // hdlr 内容只有 8 字节（handler 域越界）→ 不命中也不崩
    const shortHdlr = box('hdlr', concat([u32(0), fourCc('vide')]))
    const shortTrack = concat([box('ftyp', fourCc('isom')), box('moov', box('trak', shortHdlr))])
    expect(mp4HasAudioTrack(shortTrack)).toBe(false)
  })
})

describe('C8 box 尺寸方言', () => {
  test('size=1 的 64 位扩展 size：正常解析；声明越界或非安全整数拒绝', () => {
    // ftyp + 扩展 size 的 moov（内容 = trak→hdlr soun）
    const hdlrContent = concat([u32(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])
    const inner = box('trak', box('mdia', box('minf', box('hdlr', hdlrContent))))
    const moovBody = concat([u32(1), fourCc('moov'), u32(0), u32(inner.byteLength + 16), inner])
    const extended = concat([box('ftyp', fourCc('isom')), moovBody])
    expect(extended.byteLength).toBeGreaterThanOrEqual(12)
    expect(mp4HasAudioTrack(extended)).toBe(true)

    // 扩展 size 声明超出文件尾 → false（解析失败）
    const oversized = concat([u32(1), fourCc('moov'), u32(0), u32(0xffff_ffff), inner])
    const truncated = concat([box('ftyp', fourCc('isom')), oversized]).subarray(0, 40)
    expect(mp4HasAudioTrack(truncated)).toBe(false)

    // 扩展 size 头本身被截断（不足 16 字节）→ false
    const cutHeader = concat([box('ftyp', fourCc('isom')), u32(1), fourCc('moov'), u32(0)])
    expect(mp4HasAudioTrack(cutHeader)).toBe(false)
  })
  test('size=0 表示到文件尾：尾段 moov 内含音轨 → true；仅头 12 字节 ftyp → false', () => {
    const hdlrContent = concat([u32(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])
    const tailMoov = box('moov', box('hdlr', hdlrContent))
    // 重写 moov size 为 0
    const withZero = new Uint8Array(tailMoov)
    new DataView(withZero.buffer).setUint32(0, 0)
    expect(mp4HasAudioTrack(concat([box('ftyp', fourCc('isom')), withZero]))).toBe(true)
    // ftyp 声明 size=0 → ftyp 占满全文件，无处递归 → false
    const zeroFtyp = new Uint8Array(box('ftyp', fourCc('isom')))
    new DataView(zeroFtyp.buffer).setUint32(0, 0)
    expect(mp4HasAudioTrack(concat([zeroFtyp]))).toBe(false)
  })
  test('size < header（如 4）与 offset+size 越界都拒绝', () => {
    const hdlrContent = concat([u32(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])
    const tiny = new Uint8Array(box('moov', box('hdlr', hdlrContent)))
    new DataView(tiny.buffer).setUint32(0, 4) // size=4 < header=8
    expect(mp4HasAudioTrack(concat([box('ftyp', fourCc('isom')), tiny]))).toBe(false)
    const overflowing = new Uint8Array(box('moov', box('hdlr', hdlrContent)))
    new DataView(overflowing.buffer).setUint32(0, overflowing.byteLength + 100)
    expect(mp4HasAudioTrack(concat([box('ftyp', fourCc('isom')), overflowing]))).toBe(false)
  })
})

describe('C8 meta 容器与嵌套深度', () => {
  test('meta 按 content+4 起扫子 box；音轨藏在 meta→moov 链内仍可命中', () => {
    const hdlrContent = concat([u32(0), fourCc('vide'), fourCc('soun'), new Uint8Array(12)])
    const metaBody = concat([
      u32(0), // version/flags，meta 子 box 从 content+4 起
      box('moov', box('trak', box('mdia', box('minf', box('hdlr', hdlrContent))))),
    ])
    const nested = concat([box('ftyp', fourCc('isom')), box('meta', metaBody)])
    expect(mp4HasAudioTrack(nested)).toBe(true)
    // 深层 edts/udta 容器路径同样可达
    const viaUdta = concat([
      box('ftyp', fourCc('isom')),
      box('moov', box('udta', box('edts', box('hdlr', hdlrContent)))),
    ])
    expect(mp4HasAudioTrack(viaUdta)).toBe(true)
  })
})
