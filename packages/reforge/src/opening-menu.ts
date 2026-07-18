/**
 * 主菜单标题屏(照原版一阶段 uigame.c PAL_OpeningMenu):FBP 背景(盘0)+ 竖排菜单项 + 光标。
 *
 * 数据驱动:菜单项 = 工程 entryPoints(每个开局档一项:开始游戏 / DLC 入口…)+ 末尾「读取进度」。
 * 选开局项 → resolve {new, entryId};选「读取进度」→ 就地切存档浏览界面(load 模式,复用在途
 * 存档浏览器 reducer + drawSaveBrowser 渲染),选到已存槽 → resolve {load, slotId},Esc 退回菜单。
 * UX 真值照一阶段(bg 盘0、坐标 PAL_XY(125,95+16i)、三层阴影字;浏览器同系统菜单读档界面)。
 *
 * 自持 rAF 渲染循环 + 键盘监听(捕获相,先于游戏输入监听挂载);选定/读档 → cleanup + resolve。
 */

import type { AssetId, Locale } from '@type-pal/content'
import type { BgmPlayer } from './audio/bgm.js'
import { expectDefined } from './defined.js'
import type { MenuAssets } from './menu/menu-box.js'
import { drawSaveBrowser } from './menu/save-browser-box.js'
import {
  browserConfirm,
  browserMoveCursor,
  closeSaveBrowser,
  openSaveBrowser,
  type SaveBrowserState,
} from './save/browser-state.js'
import type { SaveStore } from './save/store.js'
import type { SlotId } from './save/types.js'
import type { GlyphTable } from './text/glyph.js'
import { CURSOR_COLOR_COUNT, CURSOR_RGBA, colorRgba } from './text/palette-color.js'
import { renderSpans } from './text/text-render.js'

export interface OpeningMenuItem {
  id: string
  label: string
}

/** 「旧的回忆」合成项的哨兵 id(不与任何 entryPoint id 撞;选中即进读档浏览界面)。 */
const LOAD_ITEM_ID = '__load__'
/** 读档项文案 = 照原版 uigame.c getWord(8) MAINMENU_LABEL_LOADGAME(id8 GBK = 旧的回忆)。 */
const LOAD_ITEM_LABEL = '旧的回忆'
/** 项间距:照原版 ITEM_Y=[95,112](步进 17);首项 95。多入口(DLC)按此步进续排。 */
const ITEM_Y0 = 95
const ITEM_DY = 17

/**
 * 照原版 uigame.c:107-108 坐标公式:x = 125 - (w>4 ? (w-4)*8 : 0),
 * w = 全宽字单位数(CJK 计 1、半角 ASCII 计 0.5)。4 全宽字(新的故事/旧的回忆)→ w=4 → x=125。
 * 长于 4 单位的文案(DLC 自定义标签)按公式左移对齐,防溢出。
 */
function openingItemX(label: string): number {
  let w = 0
  for (const ch of label) {
    const cp = ch.codePointAt(0) ?? 0
    w += cp > 0xff ? 1 : 0.5
  }
  return 125 - (w > 4 ? Math.floor((w - 4) * 8) : 0)
}

/** 主菜单选定结果:开新局(某入口点)或读某存档槽。 */
export type OpeningDecision = { kind: 'new'; entryId: string } | { kind: 'load'; slotId: SlotId }

/** 标题菜单音乐是应用壳临时态：菜单结果返回前统一 stop，不写入 WorldState。 */
export async function runOpeningMenuWithMusic<T>(
  bgm: Pick<BgmPlayer, 'play' | 'stop'>,
  asset: AssetId | undefined,
  run: () => Promise<T>,
): Promise<T> {
  if (!asset) return run()
  bgm.play(asset, true)
  try {
    return await run()
  } finally {
    bgm.stop()
  }
}

export function runOpeningMenu(deps: {
  ctx: CanvasRenderingContext2D
  glyphs: GlyphTable
  /** FBP 2 已按盘 0 烘成 RGBA 的 engine chrome 图像。 */
  bg: CanvasImageSource
  items: readonly OpeningMenuItem[]
  worldScale: number
  locale: Locale
  /** 存档浏览界面渲染所需 UI 资产(9 块卷轴框等);读档相位才用到。 */
  menuAssets: MenuAssets
  saveStore: SaveStore
}): Promise<OpeningDecision> {
  const { ctx, glyphs, bg, items, worldScale, locale, menuAssets, saveStore } = deps
  // 菜单项 = 开局项(新的故事 + DLC 入口,标签来自 entryPoint 数据)+ 末尾「旧的回忆」读档项。
  const menuItems: OpeningMenuItem[] = [...items, { id: LOAD_ITEM_ID, label: LOAD_ITEM_LABEL }]
  return new Promise<OpeningDecision>((resolve) => {
    // 相位:'menu' 选开局/读取;'load' 存档浏览界面(load 模式)。
    let phase: 'menu' | 'load' = 'menu'
    let cursor = 0
    let browser: SaveBrowserState = closeSaveBrowser()
    const thumbs = new Map<SlotId, ImageBitmap>()
    let raf = 0
    let now = 0

    const cleanup = (): void => {
      cancelAnimationFrame(raf)
      window.removeEventListener('keydown', onKey, true)
    }

    // 进读档相位:载 metas + 解码缩略图(同系统菜单 refreshSaveMetas),开浏览器(load 模式)。
    const enterLoad = async (): Promise<void> => {
      const metas = await saveStore.listMeta()
      thumbs.clear()
      for (const m of metas) {
        const blob = await saveStore.getThumb(m.slotId)
        if (blob) thumbs.set(m.slotId, await createImageBitmap(blob))
      }
      browser = openSaveBrowser('load', metas)
      phase = 'load'
    }

    const onKey = (e: KeyboardEvent): void => {
      if (phase === 'menu') {
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
          cursor = (cursor + menuItems.length - 1) % menuItems.length
          e.preventDefault()
        } else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
          cursor = (cursor + 1) % menuItems.length
          e.preventDefault()
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          e.stopImmediatePropagation() // 防选定键泄漏进游戏输入(同 video/rng 跳过键)
          const sel = menuItems[cursor]
          if (!sel) return
          if (sel.id === LOAD_ITEM_ID) {
            void enterLoad() // 异步载档界面(载完切相位;载入前多按无副作用)
          } else {
            cleanup()
            resolve({ kind: 'new', entryId: sel.id })
          }
        }
        return
      }
      // phase === 'load':存档浏览界面(load 模式,无覆盖确认)。方向导航、Enter 读、Esc 退回菜单。
      if (e.key === 'ArrowUp') browser = browserMoveCursor(browser, 'up')
      else if (e.key === 'ArrowDown') browser = browserMoveCursor(browser, 'down')
      else if (e.key === 'ArrowLeft') browser = browserMoveCursor(browser, 'left')
      else if (e.key === 'ArrowRight') browser = browserMoveCursor(browser, 'right')
      else if (e.key === 'Enter' || e.key === ' ') {
        e.stopImmediatePropagation()
        const r = browserConfirm(browser)
        browser = r.state
        if (r.action?.kind === 'load') {
          cleanup()
          resolve({ kind: 'load', slotId: r.action.slotId })
          return
        }
      } else if (e.key === 'Escape') {
        phase = 'menu' // 退回菜单列表(空槽/改主意)
      } else {
        return // 未处理键不拦
      }
      e.preventDefault()
    }

    const draw = (t: number): void => {
      now = t
      ctx.save()
      ctx.scale(worldScale, worldScale)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(bg, 0, 0) // FBP 2 全屏底图(盘0)
      if (phase === 'menu') {
        menuItems.forEach((it, i) => {
          // 照原版 ui.h:选中 0xF9-0xFE 6 色轮闪(CURSOR_RGBA)、未选 0x4F(default);三层阴影;
          // x 走 uigame.c:107-108 公式(4 全宽字退化 125),y = 95 + 17i(照原版 ITEM_Y=[95,112])。
          const rgba =
            i === cursor
              ? (CURSOR_RGBA[Math.floor(now / 100) % CURSOR_COLOR_COUNT] ??
                expectDefined(CURSOR_RGBA[0]))
              : colorRgba('default')
          renderSpans(ctx, [{ text: it.label }], openingItemX(it.label), ITEM_Y0 + i * ITEM_DY, {
            glyphs,
            shadow: true,
            forceRgba: rgba,
          })
        })
      } else {
        // 读档相位:标题屏之上叠存档浏览卷轴(同系统菜单读档界面;载入完成前 browser.active=false 不绘)。
        drawSaveBrowser(ctx, browser, menuAssets, glyphs, now, locale, thumbs)
      }
      ctx.restore()
      raf = requestAnimationFrame(draw)
    }
    window.addEventListener('keydown', onKey, true)
    raf = requestAnimationFrame(draw)
  })
}
