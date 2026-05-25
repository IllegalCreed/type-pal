/**
 * DialogBox 资产加载(M5 Sync.2):
 *  - portraits:RGM.MKF 92 chunks(rgm-raw.json),每 chunk = 单帧 RLE 角色头像
 *  - dialog icons:DATA.MKF chunk 12 282 字节 sprite group(dialog-icons-raw.json),
 *    多帧(key continue / cursor / 等),index 由 sdlpal g_TextLib.bIcon 选。
 *
 * 运行时 bootstrap 调 loadDialogAssets() 一次,产 portraitFrames + iconFrames 注入
 * PresentContext。drawDialogBox 按 state.portraitIcon / keyIconBlink 取对应帧 blit。
 */

import { base64ToBytes, decodeRle, parseSpriteChunk } from './rle-decode.js'

/** SpriteImage 与 draw-sprite.ts 的 SpriteImage 同结构,共享渲染。 */
export interface DialogSprite {
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}

interface RgmRawEntry {
  chunkIndex: number
  size: number
  base64: string
}

interface DialogIconsRaw {
  source: string
  size: number
  base64: string
}

const BASE = '/extracted'

/**
 * 加载并解码所有 92 RGM.MKF 头像。
 * size=0 的 chunk(原版部分 slot 空)skip。
 */
async function loadPortraits(): Promise<Map<number, DialogSprite>> {
  const res = await fetch(`${BASE}/data/rgm-raw.json`)
  if (!res.ok) throw new Error(`dialog-assets: rgm-raw.json fetch failed (${res.status})`)
  const entries = await res.json() as RgmRawEntry[]
  const map = new Map<number, DialogSprite>()
  for (const e of entries) {
    if (e.size === 0 || e.base64.length === 0) continue
    try {
      const buf = base64ToBytes(e.base64)
      const frame = decodeRle(buf)
      if (frame.width === 0 || frame.height === 0) continue
      map.set(e.chunkIndex, {
        width: frame.width,
        height: frame.height,
        indices: frame.pixels,
        opaque: frame.opaque,
      })
    }
    catch (err) {
      console.warn(`dialog-assets: portrait ${e.chunkIndex} decode failed, skip:`, err)
    }
  }
  return map
}

/**
 * 加载并解码 DATA.MKF chunk 12 dialog icons(sprite group)。
 * 返 frame index → DialogSprite map。
 */
async function loadDialogIcons(): Promise<Map<number, DialogSprite>> {
  const res = await fetch(`${BASE}/data/dialog-icons-raw.json`)
  if (!res.ok) throw new Error(`dialog-assets: dialog-icons-raw.json fetch failed (${res.status})`)
  const entry = await res.json() as DialogIconsRaw
  const buf = base64ToBytes(entry.base64)
  const frames = parseSpriteChunk(buf)
  const map = new Map<number, DialogSprite>()
  frames.forEach((f, i) => {
    map.set(i, {
      width: f.width,
      height: f.height,
      indices: f.pixels,
      opaque: f.opaque,
    })
  })
  return map
}

export interface DialogAssets {
  portraitFrames: Map<number, DialogSprite>
  iconFrames: Map<number, DialogSprite>
}

/**
 * 一次性加载所有 DialogBox 资产 — bootstrap.ts 在启动时调用。
 * 失败时返回空 map(降级为占位,游戏可玩性不受影响)。
 */
export async function loadDialogAssets(): Promise<DialogAssets> {
  try {
    const [portraitFrames, iconFrames] = await Promise.all([
      loadPortraits().catch((err: unknown) => {
        console.warn('[dialog-assets] portraits failed, skip:', err)
        return new Map<number, DialogSprite>()
      }),
      loadDialogIcons().catch((err: unknown) => {
        console.warn('[dialog-assets] icons failed, skip:', err)
        return new Map<number, DialogSprite>()
      }),
    ])
    return { portraitFrames, iconFrames }
  }
  catch (err) {
    console.warn('[dialog-assets] all assets failed:', err)
    return { portraitFrames: new Map(), iconFrames: new Map() }
  }
}
