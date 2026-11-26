export const WAVE_WIDTH = 320
export const WAVE_HEIGHT = 200
export const WAVE_PHASES = 32

/** SDLPal scene.c PAL_ApplyWave uses integer shifts and mirrors the second half of the cycle. */
export function waveOffsets(amplitude: number): number[] {
  const wave = new Array<number>(WAVE_PHASES)
  let offset = 0
  let step = 68
  for (let phase = 0; phase < WAVE_PHASES / 2; phase++) {
    step -= 8
    offset += step
    const shift = Math.trunc((offset * amplitude) / 256)
    wave[phase] = shift
    wave[phase + WAVE_PHASES / 2] = WAVE_WIDTH - shift
  }
  return wave
}

/** Copy each background row with an integer left wrap, before sprites and foreground layers. */
export function drawWaveRows(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  amplitude: number,
  phase: number,
  scale: number,
): void {
  const wave = waveOffsets(amplitude)
  const width = WAVE_WIDTH * scale
  for (let row = 0; row < WAVE_HEIGHT; row++) {
    const shift = wave[(phase + row) % WAVE_PHASES] ?? 0
    const y = row * scale
    if (shift > 0 && shift < WAVE_WIDTH) {
      const left = shift * scale
      const right = width - left
      ctx.drawImage(source, left, y, right, scale, 0, y, right, scale)
      ctx.drawImage(source, 0, y, left, scale, right, y, left, scale)
    } else {
      ctx.drawImage(source, 0, y, width, scale, 0, y, width, scale)
    }
  }
}
