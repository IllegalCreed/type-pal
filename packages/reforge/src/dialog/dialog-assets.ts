/**
 * 对话资产加载(② 外观 Task 5 光标 + Task 6 头像)。
 * 端口自 packages/game/src/assets/dialog-assets.ts。
 * Canvas2D 适配:光标 sprite → tint bake(6 步轮转);头像 → 预烘 RGBA PNG(@type-pal/migrate bake-assets),直接 drawImage。
 */
import { parseSpriteChunk, type RleFrame } from '@type-pal/shared'
import { ENGINE_CHROME } from '../engine-chrome/registry.js'

/** base64 → bytes(浏览器 atob)。 */
function base64ToBytes(b64: string): Uint8Array {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
}

interface DialogIconsRaw {
  source: string
  size: number
  base64: string
}

/** DATA chunk 12 的纯解码边界；metadata 与 bytes 不一致时拒绝静默继续。 */
export function decodeCursorFrames(entry: DialogIconsRaw, source = 'dialog cursor'): RleFrame[] {
  const bytes = base64ToBytes(entry.base64)
  if (bytes.byteLength !== entry.size)
    throw new Error(
      `引擎 chrome 对话光标长度错误:${source}:metadata=${entry.size}, actual=${bytes.byteLength}`,
    )
  const frames = parseSpriteChunk(bytes)
  if (frames.length === 0) throw new Error(`引擎 chrome 对话光标为空:${source}`)
  return frames
}

/** 单个光标 frame → 离屏 canvas,不透明像素染成指定 rgba(透明背景)。
 *  6 色轮转:DialogBox 对同一 frame 用固定 6 色 bake 出 6 个 canvas,缓存 by step。 */
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

/** 解码光标 sprite frames(DATA chunk12),bake 推迟到 DialogBox(按 step bake+缓存)。 */
export async function loadCursorFrames(url = ENGINE_CHROME.dialogCursor): Promise<RleFrame[]> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`引擎 chrome 对话光标加载失败(${res.status}):${url}`)
  const entry = (await res.json()) as DialogIconsRaw
  return decodeCursorFrames(entry, url)
}
