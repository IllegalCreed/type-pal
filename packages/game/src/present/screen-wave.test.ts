import { beforeEach, describe, expect, it } from 'vitest'
import { applyScreenWave, resetScreenWavePhase } from './screen-wave.js'

const SCREEN_WIDTH = 320

const SCREEN_HEIGHT = 200

/** 造一个像素 = (列号 + 行号) mod 256的 320×200 fb,便于检测横向卷动。 */
function diagonalMarkedRows(): Uint8Array {
  const fb = new Uint8Array(SCREEN_WIDTH * SCREEN_HEIGHT)
  for (let y = 0; y < SCREEN_HEIGHT; y++) {
    for (let x = 0; x < SCREEN_WIDTH; x++) fb[y * SCREEN_WIDTH + x] = (x + y) & 0xff
  }
  return fb
}

function columnMarkedRows(): Uint8Array {
  const indices = new Uint8Array(SCREEN_WIDTH * 200)
  for (let y = 0; y < 200; y++) {
    for (let x = 0; x < SCREEN_WIDTH; x++) indices[y * SCREEN_WIDTH + x] = x & 0xff
  }
  return indices
}

function expectRowShift(indices: Uint8Array, y: number, shift: number): void {
  const row = y * SCREEN_WIDTH
  for (let x = 0; x < SCREEN_WIDTH; x++) {
    expect(indices[row + x]).toBe(((x + shift) % SCREEN_WIDTH) & 0xff)
  }
}

function waveState(wave: number, progression: number) {
  return { wScreenWave: wave, sWaveProgression: progression }
}

function columnMarkedFirstRow(): Uint8Array {
  const indices = new Uint8Array(320 * 200)
  for (let x = 0; x < 320; x++) indices[x] = x & 0xff // 行 0 可识别图案
  return indices
}

describe('screen wave progression and row conservation', () => {
  beforeEach(() => resetScreenWavePhase())

  it('wScreenWave=0 且 sWaveProgression=0 → 无效果,不改像素', () => {
    const fb = diagonalMarkedRows()
    const before = fb.slice()
    const gs = { wScreenWave: 0, sWaveProgression: 0 }
    applyScreenWave(fb, gs)
    expect(fb).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
  })

  it('每帧 wScreenWave += sWaveProgression(渐弱)', () => {
    const fb = diagonalMarkedRows()
    const gs = { wScreenWave: 40, sWaveProgression: -8 }
    applyScreenWave(fb, gs)
    expect(gs.wScreenWave).toBe(32) // 40 + (-8)
  })

  it('wScreenWave 累加到 0 → 自动清零关闭(wave + progression 都归 0)', () => {
    const fb = diagonalMarkedRows()
    const before = fb.slice()
    const gs = { wScreenWave: 8, sWaveProgression: -8 } // += -8 → 0 → 关闭
    applyScreenWave(fb, gs)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
    expect(fb).toEqual(before) // 关闭那帧不卷动
  })

  it('活跃波动改变像素，且每行像素多重集保持不变', () => {
    const fb = diagonalMarkedRows()
    const before = fb.slice()
    const gs = { wScreenWave: 255, sWaveProgression: 0 }
    applyScreenWave(fb, gs)
    // 整体应有改变(某些行 shift>0)
    expect(fb).not.toEqual(before)
    // 循环卷动应保留每行像素多重集；这条必要条件不证明位移顺序，精确位移另由后两组核验。
    for (let y = 0; y < SCREEN_HEIGHT; y++) {
      const a = Array.from(before.subarray(y * SCREEN_WIDTH, y * SCREEN_WIDTH + SCREEN_WIDTH)).sort(
        (p, q) => p - q,
      )
      const b = Array.from(fb.subarray(y * SCREEN_WIDTH, y * SCREEN_WIDTH + SCREEN_WIDTH)).sort(
        (p, q) => p - q,
      )
      expect(b).toEqual(a)
    }
  })
})

describe('screen wave mirror and supplemental frames', () => {
  beforeEach(() => resetScreenWavePhase())

  it('相位 0 波幅 128 时第 16 行是 320 减 wave[0] 的镜像左移 290', () => {
    const indices = columnMarkedRows()
    const gs = { wScreenWave: 128, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 16, 290)
    expect(gs.wScreenWave).toBe(128)
  })

  it('波幅 255 仍卷动，行 0 左移 trunc(60*255/256)=59', () => {
    const indices = columnMarkedRows()
    const gs = { wScreenWave: 255, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 0, 59)
    expect(gs.wScreenWave).toBe(255)
  })

  it('波幅 4 时行 0 的偏移表为 0 故不卷，行 7 左移 4', () => {
    const indices = columnMarkedRows()
    const gs = { wScreenWave: 4, sWaveProgression: 0 }
    applyScreenWave(indices, gs, true)
    expectRowShift(indices, 0, 0)
    expectRowShift(indices, 7, 4)
  })

  it('advance=false 且波幅已经是 256 时不卷动也不清零', () => {
    const indices = columnMarkedRows()
    const before = indices.slice()
    const gs = { wScreenWave: 256, sWaveProgression: 7 }
    applyScreenWave(indices, gs, false)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(256)
    expect(gs.sWaveProgression).toBe(7)
  })

  it('波幅恰好 256 且 advance=true 时波幅和 progression 都归 0，像素不动', () => {
    const indices = columnMarkedRows()
    const before = indices.slice()
    const gs = { wScreenWave: 252, sWaveProgression: 4 }
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('推进一次后 advance=false 停在 wave[1]，连卷两次是 56 再 112', () => {
    const gs = { wScreenWave: 128, sWaveProgression: 0 }
    applyScreenWave(new Uint8Array(SCREEN_WIDTH * 200), gs, true)
    const indices = columnMarkedRows()
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 56)
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 112)
    expect(gs.wScreenWave).toBe(128)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('先累加再判断，250+10 越过 256 则清零且本帧不卷', () => {
    const indices = columnMarkedRows()
    const before = indices.slice()
    const gs = { wScreenWave: 250, sWaveProgression: 10 }
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('advance=false 的活跃波幅 200 行 0 精确左移 46，计数不累加', () => {
    const indices = columnMarkedRows()
    const gs = { wScreenWave: 200, sWaveProgression: 8 }
    applyScreenWave(indices, gs, false)
    expectRowShift(indices, 0, 46)
    expect(gs.wScreenWave).toBe(200)
    expect(gs.sWaveProgression).toBe(8)
  })
})

describe('screen wave wraparound and successive phases', () => {
  it('真实 0x71 raw 的负 progression 跨过 0 时立即关断，不用负波幅卷动', () => {
    resetScreenWavePhase()
    const indices = columnMarkedFirstRow()
    const before = indices.slice()
    const gs = waveState(3, -4) // data/extracted/events/all.json raw operands [255,65532,0] 的收尾形态
    applyScreenWave(indices, gs, true)
    expect(indices).toEqual(before)
    expect(gs.wScreenWave).toBe(0)
    expect(gs.sWaveProgression).toBe(0)
  })

  it('循环卷动：行 0 整体左移 shift=trunc(60·w/256)，卷出像素接回行尾', () => {
    resetScreenWavePhase()
    const indices = columnMarkedFirstRow()
    const gs = waveState(128, 0) // 活跃、<256
    // 波形表首相位：b=68-8=60, a=60 → wave[0]=trunc(60*128/256)=30
    applyScreenWave(indices, gs, true)
    for (let x = 0; x < 320; x++) {
      expect(indices[x]).toBe(((x + 30) % 320) & 0xff)
    }
    expect(gs.wScreenWave).toBe(128) // progression 0 → 不变
  })

  it('相位跨帧推进：第二帧行 0 用 wave[1]=trunc(112·w/256)，图案继续滚动', () => {
    resetScreenWavePhase()
    const indices = columnMarkedFirstRow()
    const gs = waveState(128, 0)
    applyScreenWave(indices, gs, true)
    const afterFirst = new Uint8Array(indices.subarray(0, 320))
    applyScreenWave(indices, gs, true)
    // 第二帧 index=1：b=52, a=112 → wave[1]=trunc(112*128/256)=56；在已左移 30 的内容上
    // 原地再卷 → 等价总左移 86
    for (let x = 0; x < 320; x++) expect(indices[x]).toBe(((x + 86) % 320) & 0xff)
    expect(Array.from(indices.subarray(0, 320))).not.toEqual(Array.from(afterFirst))
  })
})
