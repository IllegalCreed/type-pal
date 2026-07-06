/**
 * 主菜单标题屏(照原版一阶段 uigame.c PAL_OpeningMenu):FBP 背景(盘0)+ 竖排菜单项 + 光标。
 *
 * 数据驱动:菜单项 = 工程 entryPoints(每个开局档一项:开始游戏 / DLC 入口…)。选定即 resolve
 * 该入口 id,boot 用它的 startWorld + 场景开局(见 main.ts)。UX 真值照一阶段(bg 盘0、坐标
 * PAL_XY(125, 95+16i)、三层阴影字);多入口竖排天然扩展(原版 2 项 → N 项同一竖排,非新形态)。
 *
 * 自持 rAF 渲染循环 + 键盘监听;Enter/Space 选定 → cleanup + resolve。读档项待存档浏览器接入。
 */
import { colorRgba } from './text/palette-color.js'
import type { GlyphTable } from './text/glyph.js'
import { renderSpans } from './text/text-render.js'

export interface OpeningMenuItem {
  id: string
  label: string
}

export function runOpeningMenu(deps: {
  ctx: CanvasRenderingContext2D
  glyphs: GlyphTable
  /** FBP 2 已按盘 0 上色的全屏 320×200 画布。 */
  bg: HTMLCanvasElement
  items: readonly OpeningMenuItem[]
  worldScale: number
}): Promise<string> {
  const { ctx, glyphs, bg, items, worldScale } = deps
  return new Promise<string>((resolve) => {
    let cursor = 0
    let raf = 0
    const cleanup = (): void => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey, true)
    }
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        cursor = (cursor + items.length - 1) % items.length
        e.preventDefault()
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        cursor = (cursor + 1) % items.length
        e.preventDefault()
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        e.stopImmediatePropagation() // 防选定键泄漏进游戏输入(同 video/rng 跳过键)
        const sel = items[cursor]
        if (sel) {
          cleanup()
          resolve(sel.id)
        }
      }
    }
    const draw = (): void => {
      ctx.save()
      ctx.scale(worldScale, worldScale)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(bg, 0, 0) // FBP 2 全屏底图(盘0)
      items.forEach((it, i) => {
        // 光标项青色高亮,余项默认米色;三层阴影(renderSpans shadow)。坐标照原版 PAL_XY(125, 95+16i)。
        const rgba = i === cursor ? colorRgba('cyan') : colorRgba('default')
        renderSpans(ctx, [{ text: it.label }], 125, 95 + i * 16, {
          glyphs,
          shadow: true,
          forceRgba: rgba,
        })
      })
      ctx.restore()
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('keydown', onKey, true)
    raf = requestAnimationFrame(draw)
  })
}
