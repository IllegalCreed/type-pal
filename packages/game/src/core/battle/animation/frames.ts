/** Shared frame timing and the built-in hit-effect sprite identity. */

/** BATTLE_FRAME_TIME = 1000 / BATTLE_FPS = 1000/25 = 40ms(battle.h:28-29)。 */
export const BATTLE_FRAME_TIME = 40

/** lpEffectSprite = DATA.MKF chunk 10(battle.c:1790 PAL_MKFReadChunk(..., 10, fpDATA))。 */
export const EFFECT_SPRITE_CHUNK = 10

/** N 帧 × 40ms(sdlpal PAL_BattleDelay(N))。 */
export function delayMs(frames: number): number {
  return frames * BATTLE_FRAME_TIME
}
