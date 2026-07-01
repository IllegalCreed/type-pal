/**
 * 画布命中测试(D-B1 布置模式 · 逻辑层 L4)。
 *
 * 格坐标 → 该格上的实体。UI(画布点击)先经 content 的 pixelToGrid 把像素翻成 {col,row},
 * 再调本函数查实体。本层只做格命中,不做像素变换(那在 content/渲染层)。
 *
 * 多个实体同格时取**首个**(MVP;「最上层」语义待后续渲染顺序定)。见 editor-b1-logic-plan L4。
 */
import type { EntityDef } from '@type-pal/content'

/** 返回落在 cell(col,row)上的实体;无则 null。 */
export function entityAtCell(
  entities: readonly EntityDef[],
  cell: { col: number; row: number },
): EntityDef | null {
  return (
    entities.find((e) => e.pos.col === cell.col && e.pos.row === cell.row) ?? null
  )
}
