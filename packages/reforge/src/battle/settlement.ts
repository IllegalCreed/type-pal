/**
 * 战斗胜利结算屏(B7b)—— 忠实 port 一阶段 draw-battle-settlement(sdlpal PAL_BattleWon
 * battle.c:991-1373)。原版**无「战斗胜利!」字样**,直接放 box 序列:
 *   Phase A 经验金钱 → Phase B 每个升级角色的 8 属性 old→cur → Phase D 每条练成技能。
 * 逐屏空格推进(会话在 over 阶段驱动)。坐标/字串取一阶段考证真值。
 *
 * 渲染复用 D17 menu-box 基建(drawScroll 单行框 / drawSlicedBox 红框 / drawNumber);
 * 320 逻辑坐标,调用方已 ctx.scale。
 */
import type { LevelUpReport } from '@type-pal/content'
import { drawNumberLeft, drawScroll, drawSlicedBox, type MenuAssets } from '../menu/menu-box.js'
import type { GlyphTable } from '../text/glyph.js'
import { measureSpans, renderSpans } from '../text/text-render.js'

const COLOR_LABEL = [199, 186, 174] as const // 米白(一阶段 renderText 色 0)
const COLOR_LEVELUP_LABEL = [214, 198, 140] as const // 0xBB 升级标签
const COLOR_MAGIC = [140, 180, 235] as const // 0x1B 练成技能名

/** 8 升级标签(顺序 = battle.c:1141-1148)。 */
const LEVELUP_LABELS = ['修行', '体力', '真气', '武术', '灵力', '防御', '身法', '吉运'] as const

/** 结算一屏(判别联合)。 */
export type SettlementScreen =
  | { kind: 'exp-cash'; exp: number; cash: number }
  | { kind: 'level-up'; name: string; report: LevelUpReport }
  | { kind: 'learn-magic'; name: string; magicName: string }

/** RewardReport + 名字/技能名解析 → 屏序列(经验金钱 → 各升级 → 各练成)。 */
export function buildSettlementScreens(
  exp: number,
  cash: number,
  levelUps: LevelUpReport[],
  nameOf: (characterId: string) => string,
  skillNameOf: (skillId: string) => string,
): SettlementScreen[] {
  const screens: SettlementScreen[] = []
  if (exp > 0) screens.push({ kind: 'exp-cash', exp, cash })
  for (const lu of levelUps) {
    screens.push({ kind: 'level-up', name: nameOf(lu.characterId), report: lu })
    for (const sid of lu.learned) {
      screens.push({
        kind: 'learn-magic',
        name: nameOf(lu.characterId),
        magicName: skillNameOf(sid),
      })
    }
  }
  return screens
}

/** 画结算当前一屏(box + 文字 + 数字)。缺 UI 资产 → 跳过(单测)。 */
export function drawSettlementScreen(
  ctx: CanvasRenderingContext2D,
  screen: SettlementScreen,
  menu: MenuAssets,
  glyphs: GlyphTable,
): void {
  switch (screen.kind) {
    case 'exp-cash':
      drawExpCash(ctx, screen.exp, screen.cash, menu, glyphs)
      break
    case 'level-up':
      drawLevelUp(ctx, screen.name, screen.report, menu, glyphs)
      break
    case 'learn-magic':
      drawLearnMagic(ctx, screen.name, screen.magicName, menu, glyphs)
      break
  }
}

function label(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  glyphs: GlyphTable,
  color: readonly [number, number, number] = COLOR_LABEL,
): void {
  renderSpans(ctx, [{ text }], x, y, { glyphs, shadow: true, forceRgba: color })
}

const GLYPH_H = 16 // CJK 字模高
const DIGIT_H = 8 // 数字 sprite 高

/** 数字精灵串宽(逐位 sprite 宽求和)。 */
function numWidth(n: number, nums: (ImageBitmap | undefined)[]): number {
  let w = 0
  for (const ch of String(Math.max(0, Math.floor(n)))) w += nums[Number(ch)]?.width ?? 6
  return w
}

/** 卷轴框自然高(上边框 + 中段 + 下边框)。 */
function scrollBoxH(menu: MenuAssets): number {
  const t = menu.scroll.tiles
  return (t[1]?.height ?? 4) + (t[4]?.height ?? 18) + (t[7]?.height ?? 4)
}

/** 行片段:文字 or 数字(黄)。 */
type LinePart = { text: string; color?: readonly [number, number, number] } | { num: number }

/**
 * 内容自适应卷轴行(卷轴动态宽 = 按内容收窄,不留原版固定 len 的死空间;作者拍板)。
 * 框**水平居中**于屏、内容**水平+垂直双居中**于框;片段横排(文字/数字),片段间 GAP。
 */
function drawScrollLine(
  ctx: CanvasRenderingContext2D,
  menu: MenuAssets,
  glyphs: GlyphTable,
  y: number,
  parts: LinePart[],
): void {
  const GAP = 4
  const PAD = 6 // 内容距左右帽内边距
  const t = menu.scroll.tiles
  const leftW = t[3]?.width ?? 8
  const midW = t[4]?.width ?? 16
  const rightW = t[5]?.width ?? 8
  const boxH = scrollBoxH(menu)
  const partW = (p: LinePart): number =>
    'num' in p ? numWidth(p.num, menu.nums) : measureSpans([{ text: p.text }], glyphs)
  const contentW = parts.reduce((w, p) => w + partW(p), 0) + GAP * (parts.length - 1)
  const nLen = Math.max(1, Math.ceil((contentW + PAD * 2) / midW))
  const boxW = leftW + midW * nLen + rightW
  const x = Math.round((320 - boxW) / 2) // 框水平居中
  drawScroll(ctx, menu.scroll, x, y, nLen)
  // 内容水平居中于框中段;垂直居中(文字/数字各自按高度居中,底对齐一致)
  const textY = y + Math.round((boxH - GLYPH_H) / 2)
  const numY = textY + Math.round((GLYPH_H - DIGIT_H) / 2) // 数字与文字**垂直居中**对齐(非底对齐)
  let px = Math.round(x + leftW + (midW * nLen - contentW) / 2)
  for (const p of parts) {
    if ('num' in p) {
      drawNumberLeft(ctx, p.num, px, numY, menu.nums)
    } else {
      renderSpans(ctx, [{ text: p.text }], px, textY, {
        glyphs,
        shadow: true,
        forceRgba: p.color ?? COLOR_LABEL,
      })
    }
    px += partW(p) + GAP
  }
}

// ── Phase A:获得经验值 {N} / 打败敌人得 {N} 文钱(battle.c:1037-1045;两卷轴垂直居中 + 间距)──
function drawExpCash(
  ctx: CanvasRenderingContext2D,
  exp: number,
  cash: number,
  menu: MenuAssets,
  glyphs: GlyphTable,
): void {
  const h = scrollBoxH(menu)
  const GAPV = 12 // 两卷轴间距
  const y0 = Math.round((200 - (2 * h + GAPV)) / 2) // 整组垂直居中
  drawScrollLine(ctx, menu, glyphs, y0, [{ text: '获得经验值' }, { num: exp }])
  drawScrollLine(ctx, menu, glyphs, y0 + h + GAPV, [
    { text: '打败敌人得' },
    { num: cash },
    { text: '文钱' },
  ])
}

/** 升级屏一行:标签 + old(右对齐)+ 箭头 + cur;体力/真气带 cur/max 分数(max 蓝小字 + 斜杠)。 */
interface StatRow {
  lab: string
  old: number
  cur: number
  oldMax?: number
  curMax?: number
}

/** 画属性值:cur(黄)**右对齐到 curRightX**(原版绿线);max(蓝)挂 cur 右侧 + 斜杠、略低。 */
function drawStatValue(
  ctx: CanvasRenderingContext2D,
  curRightX: number,
  y: number,
  menu: MenuAssets,
  cur: number,
  max: number | undefined,
): void {
  drawNumberLeft(ctx, cur, curRightX - numWidth(cur, menu.nums), y, menu.nums) // cur 右对齐
  if (max === undefined) return
  let px = curRightX + 1
  if (menu.slash) {
    ctx.drawImage(menu.slash, px, y)
    px += menu.slash.width + 1
  }
  drawNumberLeft(ctx, max, px, y + 3, menu.numsBlue) // max 蓝、挂右侧略低(原版分数样式)
}

// ── Phase B:升级屏。标题卷轴 **与主红框等宽 + 同 x + 垂直堆叠不重叠**(作者拍板)。
//    体力/真气 = cur/max 分数(原版 192/326 → 339/339;max 蓝色小字 + 斜杠);数字右对齐成列。
function drawLevelUp(
  ctx: CanvasRenderingContext2D,
  name: string,
  rep: LevelUpReport,
  menu: MenuAssets,
  glyphs: GlyphTable,
): void {
  const t = menu.scroll.tiles
  const leftW = t[3]?.width ?? 8
  const midW = t[4]?.width ?? 16
  const rightW = t[5]?.width ?? 8
  const titleH = scrollBoxH(menu)
  const NLEN = 10 // 标题/框宽 = leftW + midW*10 + rightW = 176(原版 ≈ 屏 53% ≈ 171,前版 192 过宽)
  const BOX_W = leftW + midW * NLEN + rightW
  const BOX_X = Math.round((320 - BOX_W) / 2) // 整体水平居中
  const ROW_H = 18
  const BOX_H = 8 * ROW_H + 10
  const titleY = Math.round((200 - (titleH + 2 + BOX_H)) / 2) // 整组(标题+框)垂直居中
  const BOX_Y = titleY + titleH + 2 // 标题底 + 2px 间距(不重叠)

  // 标题卷轴(等宽)+ 文字框内居中
  drawScroll(ctx, menu.scroll, BOX_X, titleY, NLEN)
  const titleText = `${name}修行提升`
  const tw = measureSpans([{ text: titleText }], glyphs)
  renderSpans(
    ctx,
    [{ text: titleText }],
    BOX_X + Math.round((BOX_W - tw) / 2),
    titleY + Math.round((titleH - GLYPH_H) / 2),
    {
      glyphs,
      shadow: true,
      forceRgba: COLOR_LABEL,
    },
  )
  // 主表红框(同 x/宽)
  drawSlicedBox(ctx, menu.redBox, BOX_X, BOX_Y, BOX_W, BOX_H)

  const b = rep.before
  const a = rep.after
  const rows: StatRow[] = [
    { lab: LEVELUP_LABELS[0]!, old: b.level, cur: a.level },
    { lab: LEVELUP_LABELS[1]!, old: b.hp, cur: a.hp, oldMax: b.maxHP, curMax: a.maxHP },
    { lab: LEVELUP_LABELS[2]!, old: b.mp, cur: a.mp, oldMax: b.maxMP, curMax: a.maxMP },
    { lab: LEVELUP_LABELS[3]!, old: b.attack, cur: a.attack },
    { lab: LEVELUP_LABELS[4]!, old: b.magicAttack, cur: a.magicAttack },
    { lab: LEVELUP_LABELS[5]!, old: b.defense, cur: a.defense },
    { lab: LEVELUP_LABELS[6]!, old: b.speed, cur: a.speed },
    { lab: LEVELUP_LABELS[7]!, old: b.luck, cur: a.luck },
  ]
  // 列(相对框,原版标注真值):标签 + **间距**(黄区)+ 旧 cur **右对齐到绿线** + max 右挂;
  //   箭头固定列;新 cur 右对齐到第二绿线 + max 右挂。cur 右对齐 → 各行 cur 右缘成列。
  const LABEL_X = BOX_X + 16
  const OLD_CUR_RIGHT = BOX_X + 78 // 旧 cur 右缘(绿线 1;与标签间留黄区间距)
  const ARROW_X = BOX_X + 108
  const CUR_CUR_RIGHT = BOX_X + 142 // 新 cur 右缘(绿线 2)
  rows.forEach((r, j) => {
    const ly = BOX_Y + 8 + ROW_H * j
    const ny = ly + 2
    label(ctx, r.lab, LABEL_X, ly, glyphs, COLOR_LEVELUP_LABEL)
    drawStatValue(ctx, OLD_CUR_RIGHT, ny, menu, r.old, r.oldMax)
    if (menu.settleArrow) ctx.drawImage(menu.settleArrow, ARROW_X, ly + 4)
    drawStatValue(ctx, CUR_CUR_RIGHT, ny, menu, r.cur, r.curMax)
  })
}

// ── Phase D:{name} 练成 {magicName}(battle.c:1312-1321;卷轴居中)──
function drawLearnMagic(
  ctx: CanvasRenderingContext2D,
  name: string,
  magicName: string,
  menu: MenuAssets,
  glyphs: GlyphTable,
): void {
  const y = Math.round((200 - scrollBoxH(menu)) / 2)
  drawScrollLine(ctx, menu, glyphs, y, [
    { text: name },
    { text: '练成' },
    { text: magicName, color: COLOR_MAGIC },
  ])
}
