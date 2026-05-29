/**
 * 特效 B:屏幕波动(port sdlpal scene.c:365-450 PAL_ApplyWave)。
 *
 * 逐扫描线按 32 相位偏移表横向**循环卷动**(每行左移 b 像素,卷出去的 b 个像素接回行尾),
 * `index` 每帧 +1 → 波形随时间向上滚动(水波/热浪荡漾感)。每帧先 `wScreenWave += sWaveProgression`;
 * 到 0 或 >= 256 自动清零关闭(sScreenWave 渐增/渐弱动画)。
 *
 * sdlpal 在 PAL_MakeScene 里**画完两层地图、画 sprite 之前**调它(scene.c:486)→ 只波动地图层,
 * sprite 不受影响。我们 present 同序:drawTilemap×2 之后、sprite entries 之前调。
 *
 * 假定 320×200 8-bit indexed framebuffer(fb.indices,行 stride = 320)。
 */
const SCREEN_W = 320
const SCREEN_H = 200

// sdlpal PAL_ApplyWave 的 `static int index` —— 每帧 +1 % 32,跨帧持久(波形滚动相位)。
let s_waveIndex = 0

/** 测试用:重置内部相位(确定性断言)。 */
export function resetScreenWavePhase(): void {
  s_waveIndex = 0
}

/**
 * 对 indices(320×200)原地施加屏幕波动 + 推进 gs.wScreenWave。
 * @param gs 读写 wScreenWave / sWaveProgression(每帧累加 + 越界清零)。
 */
export function applyScreenWave(
  indices: Uint8Array,
  gs: { wScreenWave: number, sWaveProgression: number },
): void {
  // scene.c:389 每帧波幅累加;==0 或 >=256 → 关闭并清零(scene.c:391-398)。
  gs.wScreenWave += gs.sWaveProgression
  if (gs.wScreenWave === 0 || gs.wScreenWave >= 256) {
    gs.wScreenWave = 0
    gs.sWaveProgression = 0
    return
  }

  // 32 相位偏移表(scene.c:404-417):a/b 递推 a=0,b=68;16 次 b-=8,a+=b;
  //   wave[i] = a * wScreenWave / 256(整除截断);wave[i+16] = 320 - wave[i](镜像凑满 32 相位)。
  const wave = new Array<number>(32)
  let a = 0
  let b = 60 + 8
  for (let i = 0; i < 16; i++) {
    b -= 8
    a += b
    wave[i] = Math.trunc((a * gs.wScreenWave) / 256)
    wave[i + 16] = SCREEN_W - wave[i]!
  }

  // scene.c:423-449 逐行(200 行)左移卷动;每行相位 = (index + row) % 32,index 每帧 +1。
  const buf = new Uint8Array(SCREEN_W)
  let ai = s_waveIndex
  for (let y = 0; y < SCREEN_H; y++) {
    const shift = wave[ai]!
    if (shift > 0 && shift < SCREEN_W) {
      const row = y * SCREEN_W
      // memcpy buf,p,shift; memmove p,&p[shift],W-shift; memcpy &p[W-shift],buf,shift(左移 shift,卷回行尾)
      buf.set(indices.subarray(row, row + shift))
      indices.copyWithin(row, row + shift, row + SCREEN_W)
      indices.set(buf.subarray(0, shift), row + SCREEN_W - shift)
    }
    ai = (ai + 1) % 32
  }
  s_waveIndex = (s_waveIndex + 1) % 32
}
