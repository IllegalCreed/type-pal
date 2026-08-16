/**
 * BattleFieldDef.id 的持久引用分类真值。
 *
 * 场景默认与 hostile 是结构字段；startBattle 可以出现在任意 canonical command 根和递归臂。
 * 内容校验、编辑器删除门禁和引用面板必须复用这里的 kind/叶扫描器，禁止各自猜一份命令清单。
 */

export const DEFAULT_BATTLE_FIELD_ID = 24

export type BattleFieldReferenceKind =
  | 'project-default'
  | 'scene-default'
  | 'hostile'
  | 'start-battle'

export interface BattleFieldTaggedReference {
  fieldId: number
  kind: Extract<BattleFieldReferenceKind, 'start-battle'>
  where: string
}

/**
 * canonical command 树里的 startBattle.fieldId 叶扫描器。
 *
 * 递归按 JSON 形状遍历，因而同时覆盖 stages/machine state、entry.prepare、branch、loop、confirm、
 * startBattle result arm 与 teleportOut.onFail；只识别明确 `kind=startBattle`，不会把普通 fieldId 猜成战场。
 */
export function collectBattleFieldTaggedReferences(
  value: unknown,
  where: string,
): BattleFieldTaggedReference[] {
  const references: BattleFieldTaggedReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => visit(entry, `${path}[${index}]`))
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (record.kind === 'startBattle' && typeof record.fieldId === 'number')
      references.push({
        fieldId: record.fieldId,
        kind: 'start-battle',
        where: `${path}.fieldId`,
      })
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return references
}
