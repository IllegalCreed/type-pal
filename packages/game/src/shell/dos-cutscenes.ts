import type { Palette } from '@type-pal/shared'
import { fetchPalette } from '../assets/loader.js'
import type { IndexedImage } from '../assets/png.js'
import type { CharacterSprite } from '../assets/tileset-blob.js'
import type { BattleBgAsset } from '../present/battle/draw-battle-bg.js'
import type { Framebuffer } from '../present/framebuffer.js'
import {
  colorFadeBlocking,
  fadeInBlocking,
  fadeOutBlocking,
  playEndingAnimation,
  waitForKey,
} from './ending-player.js'
import { scrollFbp, showFbp } from './fbp-player.js'
import { playRng } from './rng-player.js'
import { playSplashFallback } from './splash-fallback.js'
import { playTrademarkFallback } from './trademark-fallback.js'

interface DosCutsceneDeps {
  fb: Framebuffer
  canvasCtx: CanvasRenderingContext2D
  palette: Palette
  battleBgs: ReadonlyMap<number, BattleBgAsset>
  characterSprites: ReadonlyMap<number, CharacterSprite>
  fetchMgoSprite: (id: number) => Promise<IndexedImage[]>
  getScreenPalette: () => Palette
  setMusic: (track: number) => void
}

/** Ordered DOS display sequences; callers own modal suspension and title/game transitions. */
export function createDosCutscenes({
  fb,
  canvasCtx,
  palette,
  battleBgs,
  characterSprites,
  fetchMgoSprite,
  getScreenPalette,
  setMusic,
}: DosCutsceneDeps): {
  playDosOpening: () => Promise<void>
  playDosEnding: () => Promise<void>
} {
  async function playDosOpening(): Promise<void> {
    // sdlpal main.c:199-203 DOS Trademark fallback / main.c:223-456 DOS Splash fallback
    // palette 3:trademark / palette 1:splash(sdlpal PAL_SetPalette / PAL_GetPalette 真值)
    // DM28:splash 起手播标题曲 5(NUM_RIX_TITLE,main.c:46/:293;蝶恋),退出停乐(main.c:449-455)。
    //   经 gs.wNumMusic + audio.sync(suspendRaf 只停 present,逻辑 tick 持续轮询)。
    setMusic(5)
    const palette3 = await fetchPalette(3).catch(() => palette)
    await playTrademarkFallback({
      fb,
      canvasCtx: canvasCtx!,
      palette: palette3,
    })
    const palette1 = await fetchPalette(1).catch(() => palette)
    // M15(2026-06-07 sdlpal 审查):DOS splash 用 FBP chunk 0x26/0x27,非 WIN95 的 3/4
    //   (sdlpal main.c:42-43 BITMAPNUM_SPLASH_UP/DOWN = fIsWIN95 ? 0x03/0x04 : 0x26/0x27)。
    const fbpUp = battleBgs.get(0x26)
    const fbpDown = battleBgs.get(0x27)
    const craneSprite = characterSprites.get(73)
    const titleSprite = characterSprites.get(71)
    if (!fbpUp || !fbpDown || !craneSprite || !titleSprite || titleSprite.frames.length === 0) {
      console.warn('[bootstrap] DOS splash 资产缺失,跳过 splash fallback')
      return
    }
    await playSplashFallback({
      fb,
      canvasCtx: canvasCtx!,
      palette: palette1,
      // BattleBgAsset(无 opaque)→ wrap 成 IndexedImage(全 opaque)
      bitmapUp: { ...fbpUp, opaque: new Uint8Array(fbpUp.width * fbpUp.height).fill(1) },
      bitmapDown: { ...fbpDown, opaque: new Uint8Array(fbpDown.width * fbpDown.height).fill(1) },
      craneSprite: {
        frames: craneSprite.frames.map((f) => ({
          width: f.width,
          height: f.height,
          indices: f.indices,
          opaque: f.opaque,
        })),
        anchorX: craneSprite.anchorX,
        anchorY: craneSprite.anchorY,
      },
      titleFrame: {
        width: titleSprite.frames[0]!.width,
        height: titleSprite.frames[0]!.height,
        indices: titleSprite.frames[0]!.indices,
        opaque: titleSprite.frames[0]!.opaque,
      },
    })
  }

  async function playDosEnding(): Promise<void> {
    const ctx = canvasCtx!
    const BLACK = new Uint8Array(320 * 200)
    const bg = (n: number): Uint8Array => battleBgs.get(n)?.indices ?? BLACK
    const pget = (n: number): Promise<typeof palette> => fetchPalette(n).catch(() => palette)
    const fbp = (
      chunk: number,
      fade: number,
      pal: typeof palette,
      fx?: IndexedImage[],
    ): Promise<void> =>
      showFbp({
        fbpIndices: bg(chunk),
        fade,
        chunkNum: chunk,
        isWin95: false,
        fb,
        canvasCtx: ctx,
        palette: pal,
        effectSpriteFrames: fx,
      })
    const scroll = (chunk: number, pal: typeof palette, fx?: IndexedImage[]): Promise<void> =>
      scrollFbp({
        fbpIndices: bg(chunk),
        speed: 0xf,
        fScrollDown: true,
        fb,
        canvasCtx: ctx,
        palette: pal,
        effectSpriteFrames: fx,
      })
    const rng = (
      chunkIdx: number,
      startFrame: number,
      endFrame: number,
      speed: number,
      pal: typeof palette,
    ): Promise<void> =>
      playRng({
        chunkIdx,
        startFrame,
        endFrame,
        frameDelayMs: 1000 / speed,
        fb,
        canvasCtx: ctx,
        palette: pal,
      })

    // ── Part A(ending.c:420-483)──
    // DL28:各段配乐(ending.c:424/430/448/496 AUDIO_PlayMusic;经 wNumMusic+sync 轮询)。
    const curPal = getScreenPalette()
    setMusic(0x1a) // 哭戏段(ending.c:424)
    await rng(9, 110, 150, 7, curPal)
    await rng(9, 151, -1, 9, curPal)
    await fadeOutBlocking(fb, ctx, curPal, 1200) // FadeOut(2)
    const pal5 = await pget(5)
    setMusic(0x19) // ending.c:430
    await fbp(75, 0, pal5)
    await fadeInBlocking(fb, ctx, pal5, 600) // FadeIn(5,1)
    await scroll(74, pal5)
    await fadeOutBlocking(fb, ctx, pal5, 600) // FadeOut(1)
    const pal4 = await pget(4)
    const [beast, girl] = await Promise.all([
      fetchMgoSprite(571).catch(() => [] as IndexedImage[]),
      fetchMgoSprite(572).catch(() => [] as IndexedImage[]),
    ])
    await playEndingAnimation({
      upperIndices: bg(61),
      lowerIndices: bg(62),
      beastFrames: beast,
      girlFrames: girl,
      fb,
      canvasCtx: ctx,
      palette: pal4,
    })
    setMusic(0) // ending.c:443 停乐(fade 2s;MIDI 后端忠实硬停)
    await colorFadeBlocking(fb, ctx, pal4, 15, 64 * 70) // ColorFade(7,15)
    const pal0 = await pget(0)
    setMusic(0x11) // ending.c:448
    await rng(11, 0, -1, 7, pal0)
    await fadeOutBlocking(fb, ctx, pal0, 1200) // FadeOut(2)
    const pal8 = await pget(8)
    // DL28:fNeedToFadeIn(ending.c:459)→ RNG 首帧 600ms 淡入(rng-player initialFadeInMs)。
    await playRng({
      chunkIdx: 10,
      startFrame: 0,
      endFrame: -1,
      frameDelayMs: 1000 / 6,
      fb,
      canvasCtx: ctx,
      palette: pal8,
      initialFadeInMs: 600,
    })
    await fbp(77, 10, pal8) // EndingSetEffectSprite(0) → 无叠加
    // EndingSetEffectSprite(0x27b=635):76/73/72/71/68@7 全 sticky 叠这只 21 帧 MGO 精灵(ending.c:467-475)
    const fx635 = await fetchMgoSprite(635).catch(() => [] as IndexedImage[])
    await fbp(76, 7, pal8, fx635)
    const pal5b = await pget(5)
    await fbp(73, 7, pal5b, fx635)
    await scroll(72, pal5b, fx635)
    await fbp(71, 7, pal5b, fx635)
    await fbp(68, 7, pal5b, fx635)
    await fbp(68, 6, pal5b) // EndingSetEffectSprite(0) → 无叠加(ending.c:477)
    await waitForKey() // sdlpal PAL_WaitForKey(0):等玩家按键再放演职员表(ending.c:480)
    setMusic(0) // ending.c:481 停乐

    // ── Part B(ending.c:485-511,演职员表卷动 67→59)──
    setMusic(9) // ending.c:496 演职员表曲
    for (const c of [67, 66, 65, 64, 63, 62, 61, 60, 59]) {
      await scroll(c, pal5b)
    }
    setMusic(0) // ending.c:509 停乐
    await fadeOutBlocking(fb, ctx, pal5b, 1800) // FadeOut(3)
  }
  return { playDosOpening, playDosEnding }
}
