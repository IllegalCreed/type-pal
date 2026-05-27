/**
 * DialogBox 资产加载(M5 Sync.2 + M5.6 T10d):
 *  - portraits:RGM.MKF 92 chunks → 88 PNG(M5.6 T10d audit 第 2 漏洞修,decode 进 pal-extract
 *    `parsers/rgm.ts` → `images/portraits/{NN}.png` + `data/portraits.json` manifest)。
 *    旧 `rgm-raw.json` runtime RLE decode 路径已淘汰。
 *  - dialog icons:DATA.MKF chunk 12 282 字节 sprite group(dialog-icons-raw.json),
 *    多帧(key continue / cursor / 等),index 由 sdlpal g_TextLib.bIcon 选。
 *
 * 运行时 bootstrap 调 loadDialogAssets() 一次,产 portraitFrames + iconFrames 注入
 * PresentContext。drawDialogBox 按 state.portraitIcon / keyIconBlink 取对应帧 blit。
 *
 * portraitFrames 同样被 M5.6 T10d PlayerStatus fullscreen UI 复用(同 chunkIndex 索引)。
 */

import { decodePngToIndices } from './png.js'
import { base64ToBytes, parseSpriteChunk } from './rle-decode.js'

/** SpriteImage 与 draw-sprite.ts 的 SpriteImage 同结构,共享渲染。 */
export interface DialogSprite {
  width: number
  height: number
  indices: Uint8Array
  opaque: Uint8Array
}

interface PortraitsManifest {
  count: number
  portraits: Array<{ chunkIndex: number; width: number; height: number }>
}

interface DialogIconsRaw {
  source: string
  size: number
  base64: string
}

const BASE = '/extracted'

/**
 * 加载所有 RGM.MKF 头像 PNG(M5.6 T10d 已 pal-extract 端 RLE decode → PNG)。
 * chunk 0 与个别空 slot skip(pal-extract 不输出 PNG)。
 */
async function loadPortraits(): Promise<Map<number, DialogSprite>> {
  const res = await fetch(`${BASE}/data/portraits.json`)
  if (!res.ok) throw new Error(`dialog-assets: portraits.json fetch failed (${res.status})`)
  const manifest = await res.json() as PortraitsManifest
  const map = new Map<number, DialogSprite>()
  await Promise.all(
    manifest.portraits.map(async (entry) => {
      try {
        const pngRes = await fetch(
          `${BASE}/images/portraits/${entry.chunkIndex.toString().padStart(2, '0')}.png`,
        )
        if (!pngRes.ok) throw new Error(`HTTP ${pngRes.status}`)
        const png = await decodePngToIndices(await pngRes.blob())
        map.set(entry.chunkIndex, {
          width: png.width,
          height: png.height,
          indices: png.indices,
          opaque: png.opaque,
        })
      }
      catch (err) {
        console.warn(`dialog-assets: portrait ${entry.chunkIndex} load failed, skip:`, err)
      }
    }),
  )
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
