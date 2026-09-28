/**
 * RV3+RV4 宿主入口（TEST-GLM-RUNTIME-RESOURCE-2 批D）。
 * RV3 = 真实 battle-ui 绘制（drawBattleGrid 两种菜单/禁用态 + drawMpBox 非零哨兵 +
 * drawItemDetailBox/drawCurrentFinger/drawPlayerTargetArrow）。
 * RV4 = 真实 settlement（buildSettlementScreens 非空报告逐屏 + 空报告对照）。
 * 全部真实函数 + 真实 unifont-cn.bdf + 真实 engine chrome PNG（只读）。
 */
import {
  drawBattleGrid,
  drawCurrentFinger,
  drawItemDetailBox,
  drawMpBox,
  drawPlayerTargetArrow,
  MAGIC_GRID,
} from '../../../../../packages/reforge/src/battle/battle-ui'
import { buildSettlementScreens, drawSettlementScreen } from '../../../../../packages/reforge/src/battle/settlement'
import { parseBdfGlyphs } from '../../../../../packages/reforge/src/text/glyph'
import type { BoxTiles, MenuAssets } from '../../../../../packages/reforge/src/menu/menu-box'
import type { GlyphTable } from '../../../../../packages/reforge/src/text/glyph'
import type { ItemDataMap } from '@type-pal/content'

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
  const [box, redBox, scroll, itembox, nums, numsBlue, numsCyan, slash, cursorGrid, cursorDown, cursorUp, cursorUpRed] =
    await Promise.all([
      fetchTiles('box'),
      fetchTiles('box-red'),
      fetchTiles('scroll'),
      fetchTiles('itembox'),
      fetchDigits('num'),
      fetchDigits('num-blue'),
      fetchDigits('num-cyan'),
      fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/num/slash.png'),
      fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/cursor/grid.png'),
      fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/cursor/down.png'),
      fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/cursor/up.png'),
      fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/cursor/up-red.png'),
    ])
  const menu: MenuAssets = {
    box,
    itembox,
    statusBg: await fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/status/bg.png'),
    equipSlot: await fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/status/slot.png'),
    scroll,
    nums,
    avatar: undefined,
    numsBlue,
    numsCyan,
    slash,
    itemIcons: { 'i:herb': await fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/battle/icon-attack.png') },
    redBox,
    magicPlayerBox: await fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/magic/playerbox.png'),
    cursorGrid,
    cursorUp,
    cursorUpRed,
    cursorDown,
    settleArrow: await fetchBitmap('/packages/reforge/src/engine-chrome/assets/ui/cursor/settle-arrow.png'),
    battleIcons: [],
  }
  const bdf = await fetch('/data/raw/unifont-cn.bdf')
  if (!bdf.ok) throw new Error(`unifont HTTP ${bdf.status}`)
  const glyphs: GlyphTable = parseBdfGlyphs(await bdf.text(), 'unifont-cn.bdf(RV3/4)')

  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#333'
  ctx.fillRect(0, 0, 960, 600)

  // ── RV3：固定合法战斗绘制快照（四面板 320×200×3）──
  const battlePanel = (px: number, py: number, draw: () => void): void => {
    ctx.save()
    ctx.scale(3, 3)
    ctx.translate(px / 3, py / 3)
    draw()
    ctx.restore()
  }
  const rowsEnabled = [
    { label: '物理' },
    { label: '仙术' },
    { label: '合击' },
    { label: '杂项', right: 3 },
  ]
  const rowsDisabled = [
    { label: '物理', disabled: true },
    { label: '仙术', disabled: true },
    { label: '合击', disabled: true },
  ]
  battlePanel(0, 0, () => drawBattleGrid(ctx, menu, glyphs, rowsEnabled, 1, 0, MAGIC_GRID))
  battlePanel(320, 0, () => drawBattleGrid(ctx, menu, glyphs, rowsDisabled, 0, 0, MAGIC_GRID))
  battlePanel(0, 200, () => {
    drawMpBox(ctx, menu, 23, 8)
    drawItemDetailBox(ctx, menu, menu.itemIcons['i:herb'])
  })
  battlePanel(320, 200, () => {
    drawCurrentFinger(ctx, menu, 160, 120, 0)
    drawPlayerTargetArrow(ctx, menu, 240, 150, 0)
  })

  // ── RV4：非空 RewardReport 屏序 + 空对照（下方条带 960×120，每屏 320×120×... 简化 1:1 缩放 2）──
  const screens = buildSettlementScreens(
    15,
    100,
    [
      {
        characterId: 'li-xiaoyao',
        from: 9,
        to: 10,
        learned: ['296'],
        before: { level: 9, hp: 300, maxHP: 300, mp: 50, maxMP: 50, attack: 90, magicAttack: 60, defense: 80, speed: 70, luck: 65 },
        after: { level: 10, hp: 330, maxHP: 330, mp: 55, maxMP: 55, attack: 95, magicAttack: 63, defense: 83, speed: 73, luck: 66 },
      },
    ],
    [{ characterId: 'zhao-linger', stat: 'luck', delta: 2 }],
    (id) => (id === 'li-xiaoyao' ? '李逍遥' : '赵灵儿'),
    (id) => (id === '296' ? '气疗术' : id),
  )
  const strip = document.getElementById('settle') as HTMLCanvasElement
  const sctx = strip.getContext('2d')!
  sctx.imageSmoothingEnabled = false
  sctx.fillStyle = '#222'
  sctx.fillRect(0, 0, 960, 120)
  screens.forEach((screen, i) => {
    sctx.save()
    sctx.scale(1.6, 1.6)
    sctx.translate(8 + i * 200, 8)
    drawSettlementScreen(sctx, screen, menu, glyphs)
    sctx.restore()
  })
  sctx.font = '12px system-ui'
  sctx.fillStyle = '#9cf'
  sctx.fillText(`空报告屏数 = ${buildSettlementScreens(0, 0, [], [], (i) => i, (i) => i).length}（对照：0 屏 → 无绘制）`, 8, 116)

  // ── 页面内像素断言 ──
  const lit = (x: number, y: number, w: number, h: number): number => {
    const data = ctx.getImageData(x * 3, y * 3, w * 3, h * 3).data
    let n = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 0 && data[i]! + data[i + 1]! + data[i + 2]! > 60) n++
    return n
  }
  const p1row1 = lit(35 + 87, 54, 60, 14) // P1 '仙术' 选中（非禁用）
  const p2row0 = lit(35, 54, 60, 14) // P2 '物理' 禁用
  const mpDigits = lit(0, 8, 60, 12)
  const finger = lit(152 - 8, 46 - 8, 30, 20) // P4 头顶三角区（160,120 → 152,46）
  const arrow = lit(232 - 8, 83 - 8, 30, 20) // P4 箭头（240,150 → 232,83）
  const settleLit = (() => {
    const data = sctx.getImageData(0, 0, 960, 100).data
    let n = 0
    for (let i = 0; i < data.length; i += 4) if (data[i + 3]! > 0 && data[i]! + data[i + 1]! + data[i + 2]! > 60) n++
    return n
  })()
  const results = [
    `P1 选中行 lit=${p1row1}`,
    `P2 禁用行 lit=${p2row0}`,
    `MP 哨兵数字区 lit=${mpDigits}`,
    `P4 头指 lit=${finger} 箭头 lit=${arrow}`,
    `RV4 结算条 lit=${settleLit}`,
  ]
  const ok =
    p1row1 > 50 && p2row0 > 50 && mpDigits > 30 && finger > 20 && arrow > 20 && settleLit > 500 && errors.length === 0
  document.getElementById('result')!.textContent =
    `${results.join(' ； ')} ； console/page errors: ${errors.length} ${errors.join('|')} → ${ok ? 'ASSERT PASS' : 'ASSERT FAIL'}`
}

main().catch((err: unknown) => {
  document.getElementById('result')!.textContent = `HOST ERROR: ${err instanceof Error ? err.message : String(err)}`
})
