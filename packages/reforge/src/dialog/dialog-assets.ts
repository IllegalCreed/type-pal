/**
 * 对话资产加载(② 外观 Task 5 光标)。
 * 端口自 packages/game/src/assets/dialog-assets.ts 的 DATA.MKF chunk 12 光标加载。
 * Canvas2D 适配:光标 sprite → tint bake(6 步 palette 0xF9-0xFE 轮转,spec §3)。
 */
import { parseSpriteChunk, type RleFrame } from '@type-pal/shared'

/** base64 → bytes(浏览器 atob)。 */
function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

interface DialogIconsRaw {
  source: string
  size: number
  base64: string
}

/** 单个光标 frame → 离屏 canvas,不透明像素染成指定 rgba(透明背景)。
 *  6 色轮转:DialogBox 对同一 frame 用 palette[0xF9+step] 6 色 bake 出 6 个 canvas,缓存 by step。 */
export function bakeCursorTinted(
  frame: RleFrame,
  rgba: readonly [number, number, number],
): HTMLCanvasElement {
  const { width, height, opaque } = frame
  const cvs = document.createElement('canvas')
  cvs.width = width
  cvs.height = height
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('reforge: cursor 2d context 不可用')
  const img = ctx.createImageData(width, height)
  const n = width * height
  for (let i = 0; i < n; i++) {
    if (opaque[i]) {
      const o = i * 4
      img.data[o] = rgba[0]
      img.data[o + 1] = rgba[1]
      img.data[o + 2] = rgba[2]
      img.data[o + 3] = 255
    }
  }
  ctx.putImageData(img, 0, 0)
  return cvs
}

/** palette 0xF9-0xFE 6 色(spec §3 光标闪烁色轮转起始)。 */
export const CURSOR_COLOR_START = 0xf9
export const CURSOR_COLOR_COUNT = 6

/** 解码光标 sprite frames(DATA chunk12),bake 推迟到 DialogBox(它持 palette,按 step bake+缓存)。 */
export async function loadCursorFrames(baseUrl = '/extracted'): Promise<RleFrame[]> {
  const res = await fetch(`${baseUrl}/data/dialog-icons-raw.json`)
  if (!res.ok) throw new Error(`dialog-assets: dialog-icons-raw.json fetch failed (${res.status})`)
  const entry = (await res.json()) as DialogIconsRaw
  return parseSpriteChunk(base64ToBytes(entry.base64))
}

/**
 * 加载头像 PNG(`/extracted/images/portraits/XX.png`,78×91 原版角色立绘)。
 * Canvas2D 直接 drawImage(标准 PNG,无需 indexed 解码)。鬼魂无原版头像,用某 chunk 占位。
 * 返回 Map<chunkIndex, HTMLImageElement>。失败项跳过(降级无头像)。
 */
export async function loadPortraits(
  chunkIndices: readonly number[],
  baseUrl = '/extracted',
): Promise<Map<number, HTMLImageElement>> {
  const map = new Map<number, HTMLImageElement>()
  await Promise.all(
    chunkIndices.map(async (chunk) => {
      try {
        const res = await fetch(
          `${baseUrl}/images/portraits/${chunk.toString().padStart(2, '0')}.png`,
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const url = URL.createObjectURL(await res.blob())
        const img = new Image()
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve()
          img.onerror = () => reject(new Error(`portrait ${chunk} decode failed`))
          img.src = url
        })
        map.set(chunk, img)
      } catch (err) {
        console.warn(`dialog-assets: portrait ${chunk} 加载失败,跳过:`, err)
      }
    }),
  )
  return map
}
