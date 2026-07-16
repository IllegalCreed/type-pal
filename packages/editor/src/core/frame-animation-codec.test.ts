import { decodeFrameSequenceFrame, parseFrameSequence } from '@type-pal/content'
import { describe, expect, it } from 'vitest'
import {
  encodeFrameAnimationRequest,
  type FrameAnimationEncodeFrame,
  quantizeFrameAnimationRequest,
} from './frame-animation-codec.js'

function pixel(r: number, g: number, b: number): ArrayBuffer {
  return Uint8Array.from([r, g, b, 255]).buffer
}

async function inflate(bytes: Uint8Array): Promise<Uint8Array> {
  const input = new Uint8Array(bytes).buffer
  const stream = new Blob([input]).stream().pipeThrough(new DecompressionStream('deflate'))
  return new Uint8Array(await new Response(stream).arrayBuffer())
}

describe('frame animation codec worker core', () => {
  it('批量量化仍以完整 RGBA8 帧输入输出', () => {
    const [quantized] = quantizeFrameAnimationRequest({
      width: 1,
      height: 1,
      colors: [[0, 0, 0]],
      mode: 'nearest',
      frames: [pixel(100, 120, 140)],
    })
    expect(new Uint8Array(quantized!)).toEqual(Uint8Array.from([0, 0, 0, 255]))
  })

  it('用旧完整帧引用完成重排和单帧替换，重开后逐像素一致', async () => {
    const sourceFrames: FrameAnimationEncodeFrame[] = [
      { rgba: pixel(255, 0, 0) },
      { rgba: pixel(0, 255, 0) },
      { rgba: pixel(0, 0, 255) },
    ]
    const source = await encodeFrameAnimationRequest({
      width: 1,
      height: 1,
      defaultFrameMs: 40,
      colorTreatment: 'preserve',
      frames: sourceFrames,
    })
    const edited = await encodeFrameAnimationRequest({
      width: 1,
      height: 1,
      defaultFrameMs: 50,
      colorTreatment: 'project-standard',
      source: new Uint8Array(source).buffer,
      frames: [
        { sourceFrame: 2 },
        { rgba: pixel(255, 255, 0), durationMs: 75 },
        { sourceFrame: 0 },
      ],
    })
    const reopened = parseFrameSequence(edited)
    await expect(decodeFrameSequenceFrame(reopened, 0, inflate)).resolves.toEqual(
      new Uint8Array(pixel(0, 0, 255)),
    )
    await expect(decodeFrameSequenceFrame(reopened, 1, inflate)).resolves.toEqual(
      new Uint8Array(pixel(255, 255, 0)),
    )
    await expect(decodeFrameSequenceFrame(reopened, 2, inflate)).resolves.toEqual(
      new Uint8Array(pixel(255, 0, 0)),
    )
    expect(reopened.index.defaultFrameMs).toBe(50)
    expect(reopened.index.frames[1]?.durationMs).toBe(75)
    expect(reopened.index.colorTreatment).toBe('project-standard')
  })
})
