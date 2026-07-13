/**
 * G9 ScreenShake(port sdlpal video.c:571-616 VIDEO_UpdateScreen 的 shake 分支)。
 *
 * 触发:script.c:1521-1535 case 0x0035 → VIDEO_ShakeScreen(time, level)(level==0→4),
 *   只写 static g_wShakeTime/g_wShakeLevel(video.c:59-60,非存档字段)。
 * 真抖在 VIDEO_UpdateScreen:每帧 while g_wShakeTime!=0 把整幅 320×200 在垂直方向
 *   奇偶交替 ±shakeLevel 跳动 + 黑条,末尾 g_wShakeTime--。纯垂直,不左右。
 *
 * sdlpal 用 SDL_SoftStretch(srcrect → dstrect)做缩放 blit,我们 framebuffer 无缩放
 * (1:1 320×200),所以化简为整幅垂直平移 + 露出行填黑:
 *   - 奇帧(shakeTime&1):srcrect.y=shakeLevel(源**顶部**裁掉 shakeLevel 行)→ 整幅
 *       **上移** shakeLevel(像素从 row shakeLevel..199 搬到 row 0..199-shakeLevel),
 *       屏**底部** shakeLevel 行填黑。
 *   - 偶帧:srcrect.y=0,dstrect.y=shakeLevel → 整幅**下移** shakeLevel(像素从 row
 *       0..199-shakeLevel 搬到 row shakeLevel..199),屏**顶部** shakeLevel 行填黑。
 *   - 末尾 gs.shakeTime--。
 *
 * 假定 320×200 8-bit indexed framebuffer(fb.indices,行 stride = 320)。
 */
const SCREEN_W = 320
const SCREEN_H = 200

/**
 * 对 indices(320×200)原地施加屏幕摇晃当前帧 + 递减 gs.shakeTime。
 * @param indices 320×200 indexed framebuffer(行 stride 320),原地 mutate。
 * @param gs 读 shakeTime(奇偶判帧 + 末尾递减)/ shakeLevel(垂直偏移行数)。
 */
export function applyScreenShake(
  indices: Uint8Array,
  gs: { shakeTime: number; shakeLevel: number },
  // DM32:false = fade-only 补帧——shakeTime 不自减,只按当前奇偶位移。
  advance = true,
): void {
  const level = gs.shakeLevel
  // level<=0 或 >=SCREEN_H 时无可见偏移,但仍要递减 shakeTime(对齐 sdlpal while 末尾 g_wShakeTime--)。
  if (level > 0 && level < SCREEN_H) {
    if (gs.shakeTime & 1) {
      // 奇帧:整幅上移 level 行(源顶部裁 level 行),底部 level 行填黑。
      //   sdlpal srcrect.y=level → blit 源 row level..199 到屏 row 0..199-level。
      const shift = level * SCREEN_W
      indices.copyWithin(0, shift, SCREEN_H * SCREEN_W)
      indices.fill(0, (SCREEN_H - level) * SCREEN_W, SCREEN_H * SCREEN_W)
    } else {
      // 偶帧:整幅下移 level 行(dstrect.y=level),顶部 level 行填黑。
      //   sdlpal srcrect.y=0 + dstrect.y=level → blit 源 row 0..199-level 到屏 row level..199。
      const shift = level * SCREEN_W
      indices.copyWithin(shift, 0, (SCREEN_H - level) * SCREEN_W)
      indices.fill(0, 0, shift)
    }
  }

  // video.c:614 末尾 g_wShakeTime--(无论是否可见偏移都递减)。
  if (advance) gs.shakeTime--
}
