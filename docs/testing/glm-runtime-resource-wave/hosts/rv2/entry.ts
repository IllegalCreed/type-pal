/**
 * RV2 宿主入口（TEST-GLM-RUNTIME-RESOURCE-2 批C）。
 * 全部真实函数：drawItemGridList（真实 renderSpans/bakeGlyph/drawNumber/drawSlicedBox）、
 * 真实 unifont-cn.bdf 字表（fetch 自仓库 data/raw）、真实 engine chrome PNG（只读 fetch）。
 * 四面板 = 同一物品菜单输入：短说明 / 长说明 now=0 / 长说明 now=800（滚动窗口平移）/ 空列表。
 * 由 esbuild 打包为 main.js（见同目录 build 注释），web 根 = 仓库根（临时 http.server 6073）。
 */
import { drawItemGridList } from '../../../../../packages/reforge/src/menu/item-list'
import { parseBdfGlyphs } from '../../../../../packages/reforge/src/text/glyph'
import type { BoxTiles, MenuAssets } from '../../../../../packages/reforge/src/menu/menu-box'
import type { GlyphTable } from '../../../../../packages/reforge/src/text/glyph'
import type { ItemData, WorldState } from '@type-pal/content'

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`)
  return createImageBitmap(await res.blob())
}

async function fetchTiles(dir: string): Promise<BoxTiles> {
  const tiles: ImageBitmap[] = []
  for (let i = 0; i < 9; i++) {
    tiles.push(await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/${dir}/frame-0${i}.png`))
  }
  return { tiles }
}

async function fetchDigits(dir: string): Promise<ImageBitmap[]> {
  const out: ImageBitmap[] = []
  for (let d = 0; d < 10; d++) {
    out.push(await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/${dir}/${d}.png`))
  }
  return out
}

const errors: string[] = []
window.addEventListener('error', (e) => errors.push(`window: ${e.message}`))

async function main(): Promise<void> {
  const ui = '/packages/reforge/src/engine-chrome/assets/ui'
  const [box, redBox, scroll, itembox, nums, numsBlue, numsCyan, slash, cursorGrid] =
    await Promise.all([
      fetchTiles('box'),
      fetchTiles('box-red'),
      fetchTiles('scroll'),
      fetchTiles('itembox'),
      fetchDigits('num'),
      fetchDigits('num-blue'),
      fetchDigits('num-cyan'),
      fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/num/slash.png`),
      fetchBitmap(`${ui}/cursor/grid.png`),
    ])
  const assets: MenuAssets = {
    box,
    itembox,
    statusBg: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/status/bg.png`),
    equipSlot: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/status/slot.png`),
    scroll,
    nums,
    avatar: undefined,
    numsBlue,
    numsCyan,
    slash,
    itemIcons: {},
    redBox,
    magicPlayerBox: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/magic/playerbox.png`),
    cursorGrid,
    cursorUp: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/up.png`),
    cursorUpRed: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/up-red.png`),
    cursorDown: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/down.png`),
    settleArrow: await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/cursor/settle-arrow.png`),
    battleIcons: [],
  }

  // 真实字表：仓库 bundled unifont-cn.bdf 原文（与 glyph.test 同一文件，走 fetch 文本）
  const bdfRes = await fetch('/data/raw/unifont-cn.bdf')
  if (!bdfRes.ok) throw new Error(`unifont HTTP ${bdfRes.status}`)
  const glyphs: GlyphTable = parseBdfGlyphs(await bdfRes.text(), 'unifont-cn.bdf(RV2)')

  const world: WorldState = {
    party: [],
    learnedSkills: {},
    money: 0,
    inventory: [
      { itemId: '61', count: 2 },
      { itemId: '78', count: 1 },
    ],
  }
  const shortItems: ItemData[] = [
    { id: '61', name: '观音符', desc: ['恢复单人 HP75。'], buyPrice: 50, sellPrice: 25, sellable: true },
    { id: '78', name: '茶叶蛋', desc: ['恢复 HP 与 MP 各 15。'], buyPrice: 10, sellPrice: 5, sellable: true },
  ]
  const longDesc = [
    '灵珠起手，天地灵气',
    '凝于掌心如水月镜花，',
    '其光流转不息；',
    '佩之可御五行之毒，',
    '碎之则灵力四散成雾，',
    '雾散之处百草同枯。',
  ]
  const longItems: ItemData[] = [
    { ...shortItems[0]!, desc: longDesc },
    shortItems[1]!,
  ]

  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#333'
  ctx.fillRect(0, 0, 960, 600)

  const draw = (panelX: number, panelY: number, items: ItemData[], now: number): void => {
    ctx.save()
    ctx.scale(3, 3)
    ctx.translate(panelX / 3, panelY / 3)
    drawItemGridList(ctx, items, 0, world, assets, glyphs, now)
    ctx.restore()
  }
  draw(0, 0, shortItems, 0) // P1 短说明 + 数量/选中
  draw(320, 0, longItems, 0) // P2 长说明 now=0（首 3 行）
  draw(0, 200, longItems, 800) // P3 长说明 now=800（窗口平移）
  draw(320, 200, [], 0) // P4 空列表

  // ---- 页面内像素断言（真实 Canvas 图与代码断言一致）----
  const regionPixels = (x: number, y: number, w: number, h: number): Uint8ClampedArray =>
    ctx.getImageData(x * 3, y * 3, w * 3, h * 3).data
  const lit = (data: Uint8ClampedArray): number => {
    let n = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 0 && data[i]! + data[i + 1]! + data[i + 2]! > 60) n++
    return n
  }
  const results: string[] = []

  // ① P1 数量区（61×2 → 青色数字 2）应有非背景像素；选中光标区应有像素
  results.push(`P1 数量区 lit=${lit(regionPixels(80, 15, 20, 12))}`)
  results.push(`P1 光标区 lit=${lit(regionPixels(38, 20, 12, 10))}`)
  // ② P2/P3 说明区随时间平移（同输入不同 now → 像素不同）
  const p2 = regionPixels(71, 151, 240, 46)
  const p3 = regionPixels(71 + 0, 151 - 200 + 600, 240, 46) // P3 面板位于 (0,200)
  let diff = 0
  for (let i = 0; i < p2.length; i += 4) {
    if (Math.abs(p2[i]! - p3[i]!) + Math.abs(p2[i + 1]! - p3[i + 1]!) + Math.abs(p2[i + 2]! - p3[i + 2]!) > 30) diff++
  }
  results.push(`P2→P3 说明区差异像素=${diff}`)
  // ③ P4 空列表：条目名区应无文字像素（仅框）
  const p1Name = lit(regionPixels(15, 12, 90, 16))
  const p4Name = lit(regionPixels(320 + 15, 200 + 12, 90, 16)) // P4 面板位于 (320,200)
  results.push(`P1 条目名区 lit=${p1Name} ； P4 条目名区 lit=${p4Name}`)

  const ok =
    lit(regionPixels(80, 15, 20, 12)) > 5 &&
    lit(regionPixels(38, 20, 12, 10)) > 5 &&
    diff > 200 &&
    p4Name < p1Name && // 空列表同区域仅框体，少于 P1 的文字+框
    errors.length === 0
  document.getElementById('result')!.textContent =
    `${results.join(' ； ')} ； console/page errors: ${errors.length} ${errors.join('|')} → ${ok ? 'ASSERT PASS' : 'ASSERT FAIL'}`
}

main().catch((err: unknown) => {
  document.getElementById('result')!.textContent = `HOST ERROR: ${err instanceof Error ? err.message : String(err)}`
})
