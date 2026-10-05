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
} from '../../../../../../../../packages/reforge/src/battle/battle-ui'
import {
  buildSettlementScreens,
  drawSettlementScreen,
} from '../../../../../../../../packages/reforge/src/battle/settlement'
import type {
  BoxTiles,
  MenuAssets,
} from '../../../../../../../../packages/reforge/src/menu/menu-box'
import type { GlyphTable } from '../../../../../../../../packages/reforge/src/text/glyph'
import { parseBdfGlyphs } from '../../../../../../../../packages/reforge/src/text/glyph'

async function fetchBitmap(url: string): Promise<ImageBitmap> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`${url} HTTP ${res.status}`)
  return createImageBitmap(await res.blob())
}
async function fetchTiles(dir: string): Promise<BoxTiles> {
  const tiles: ImageBitmap[] = []
  for (let i = 0; i < 9; i++) {
    tiles.push(
      await fetchBitmap(`/packages/reforge/src/engine-chrome/assets/ui/${dir}/frame-0${i}.png`),
    )
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
  const [
    box,
    redBox,
    scroll,
    itembox,
    nums,
    numsBlue,
    numsCyan,
    slash,
    cursorGrid,
    cursorDown,
    cursorUp,
    cursorUpRed,
  ] = await Promise.all([
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
    itemIcons: {
      'i:herb': await fetchBitmap(
        '/packages/reforge/src/engine-chrome/assets/ui/battle/icon-attack.png',
      ),
    },
    redBox,
    magicPlayerBox: await fetchBitmap(
      '/packages/reforge/src/engine-chrome/assets/ui/magic/playerbox.png',
    ),
    cursorGrid,
    cursorUp,
    cursorUpRed,
    cursorDown,
    settleArrow: await fetchBitmap(
      '/packages/reforge/src/engine-chrome/assets/ui/cursor/settle-arrow.png',
    ),
    battleIcons: [],
  }
  const bdf = await fetch('/data/raw/unifont-cn.bdf')
  if (!bdf.ok) throw new Error(`unifont HTTP ${bdf.status}`)
  const glyphs: GlyphTable = parseBdfGlyphs(await bdf.text(), 'unifont-cn.bdf(RV3/4)')

  const canvas = document.getElementById('stage') as HTMLCanvasElement
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#333'
  ctx.fillRect(0, 0, 1920, 1200)

  // ── RV3：固定合法战斗绘制快照（四面板 320×200×3，逐面板 clip 防跨板绘制）──
  const battlePanel = (px: number, py: number, name: string, draw: () => void): void => {
    try {
      ctx.save()
      ctx.beginPath()
      ctx.rect(px, py, 960, 600) // 面板裁剪（设备像素 3×逻辑 320×200）：绘制不得越板
      ctx.clip()
      ctx.scale(3, 3)
      ctx.translate(px / 3, py / 3)
      draw()
    } catch (err) {
      errors.push(`${name}: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      ctx.restore()
    }
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
  battlePanel(0, 0, 'P1', () => drawBattleGrid(ctx, menu, glyphs, rowsEnabled, 1, 0, MAGIC_GRID))
  battlePanel(960, 0, 'P2', () => drawBattleGrid(ctx, menu, glyphs, rowsDisabled, 0, 0, MAGIC_GRID))
  battlePanel(0, 600, 'P3', () => {
    drawMpBox(ctx, menu, 23, 8)
    drawItemDetailBox(ctx, menu, menu.itemIcons['i:herb'])
  })
  battlePanel(960, 600, 'P4', () => {
    drawCurrentFinger(ctx, menu, 160, 120, 0)
    drawPlayerTargetArrow(ctx, menu, 240, 150, 0)
  })

  // ── 页面内像素断言（取样一律 = 面板原点 + 面板内逻辑坐标）──
  const litIn = (
    panelX: number,
    panelY: number,
    x: number,
    y: number,
    w: number,
    h: number,
  ): number => {
    const data = ctx.getImageData(panelX + x * 3, panelY + y * 3, w * 3, h * 3).data
    let n = 0
    for (let i = 0; i < data.length; i += 4)
      if (Math.abs(data[i]! - 51) + Math.abs(data[i + 1]! - 51) + Math.abs(data[i + 2]! - 51) > 45)
        n++
    return n
  }
  // P1 (0,0)：'仙术' 选中行 (122,54) 与其光标 (147,64)；同偏移的 P2 区域应无光标
  const p1Selected = litIn(0, 0, 122, 54, 40, 14)
  const p1Cursor = litIn(0, 0, 140, 60, 24, 16)
  const p2Selected = litIn(960, 0, 122, 54, 40, 14)
  const p2Cursor = litIn(960, 0, 55, 60, 24, 16)
  // P2 (320,0)：禁用 '物理' 行 (35,54) 有字；相邻面板左缘 (0..6) 无邻板渗入 → 证明逐面板 clip
  const p2Disabled = litIn(960, 0, 35, 54, 40, 14)
  const p2LeftMargin = litIn(960, 0, 0, 0, 6, 200)
  const p4LeftMargin = litIn(960, 600, 0, 0, 6, 200)
  // P3 (0,200)：MP 哨兵数字 23/8 (0,8,60,12) + 物品详情图标 (8,147,48,40)
  const mpDigits = litIn(0, 200, 0, 8, 60, 12)
  const detailIcon = litIn(0, 200, 8, 147, 48, 40)
  // P4 (320,200)：头指 (152,46,20,14)、箭头 (232,83,20,14)
  const finger = litIn(960, 600, 152, 46, 20, 14)
  const arrow = litIn(960, 600, 232, 83, 20, 14)
  const results = [
    `P1 选中行 lit=${p1Selected} 光标 lit=${p1Cursor}`,
    `P2 选中行 lit=${p2Selected} 光标 lit=${p2Cursor}`,
    `P2 禁用行 lit=${p2Disabled}`,
    `P2/P4 左缘渗入 lit=${p2LeftMargin}/${p4LeftMargin}（应 0/0 → 无跨板绘制）`,
    `MP 哨兵 lit=${mpDigits} 详情图标 lit=${detailIcon}`,
    `P4 头指 lit=${finger} 箭头 lit=${arrow}`,
  ]
  let ok =
    p1Selected > 50 &&
    p1Cursor > 20 &&
    p2Selected > 50 &&
    p2Cursor > 20 &&
    p2Disabled > 50 &&
    p2LeftMargin === 0 &&
    p4LeftMargin === 0 &&
    mpDigits > 30 &&
    detailIcon > 100 &&
    finger > 20 &&
    arrow > 20 &&
    errors.length === 0
  document.getElementById('result')!.textContent =
    `${results.join(' ； ')} ； console/page errors: ${errors.length} ${errors.join('|')} → ${ok ? 'ASSERT PASS' : 'ASSERT FAIL'}`

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
        before: {
          level: 9,
          hp: 300,
          maxHP: 300,
          mp: 50,
          maxMP: 50,
          attack: 90,
          magicAttack: 60,
          defense: 80,
          speed: 70,
          luck: 65,
        },
        after: {
          level: 10,
          hp: 330,
          maxHP: 330,
          mp: 55,
          maxMP: 55,
          attack: 95,
          magicAttack: 63,
          defense: 83,
          speed: 73,
          luck: 66,
        },
      },
    ],
    [{ characterId: 'zhao-linger', stat: 'luck', delta: 2 }],
    (id) => (id === 'li-xiaoyao' ? '李逍遥' : '赵灵儿'),
    (id) => (id === '296' ? '气疗术' : id),
  )
  const strip = document.getElementById('settle') as HTMLCanvasElement
  const sctx = strip.getContext('2d', { willReadFrequently: true })!
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
  sctx.fillText(
    `空报告屏数 = ${
      buildSettlementScreens(
        0,
        0,
        [],
        [],
        (i) => i,
        (i) => i,
      ).length
    }（对照：0 屏 → 无绘制）`,
    8,
    116,
  )

  // RV4 结算条像素断言（1.6× 缩放条带取样）并入总判定
  const settleLit = (() => {
    const data = sctx.getImageData(0, 0, 960, 100).data
    let n = 0
    for (let i = 0; i < data.length; i += 4)
      if (Math.abs(data[i]! - 51) + Math.abs(data[i + 1]! - 51) + Math.abs(data[i + 2]! - 51) > 45)
        n++
    return n
  })()
  results.push(`RV4 结算条 lit=${settleLit}`)
  if (settleLit <= 500) errors.push('RV4 settle strip too empty')
  ok = ok && settleLit > 500 && errors.length === 0
  document.getElementById('result')!.textContent =
    `${results.join(' ； ')} ； console/page errors: ${errors.length} ${errors.join('|')} → ${ok ? 'ASSERT PASS' : 'ASSERT FAIL'}`
}

main().catch((err: unknown) => {
  document.getElementById('result')!.textContent =
    `HOST ERROR: ${err instanceof Error ? err.message : String(err)}`
})
