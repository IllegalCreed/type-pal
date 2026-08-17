/** EnemyTeamDef.id 的持久引用分类真值。 */
export type EnemyTeamReferenceKind = 'hostile' | 'start-battle'

export interface EnemyTeamTaggedReference {
  enemyTeamId: string
  kind: Extract<EnemyTeamReferenceKind, 'start-battle'>
  where: string
}

/**
 * canonical command 树里的 startBattle.enemyTeamId 叶扫描器。
 *
 * 递归按 JSON 形状遍历，覆盖所有 command 容器；只识别明确的 startBattle tag，
 * 不把其他同名业务字段误判成敌队引用。
 */
export function collectEnemyTeamTaggedReferences(
  value: unknown,
  where: string,
): EnemyTeamTaggedReference[] {
  const references: EnemyTeamTaggedReference[] = []
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      for (const [index, entry] of node.entries()) visit(entry, `${path}[${index}]`)
      return
    }
    if (!node || typeof node !== 'object') return
    const record = node as Record<string, unknown>
    if (
      record.kind === 'startBattle' &&
      typeof record.enemyTeamId === 'string' &&
      record.enemyTeamId.length > 0
    )
      references.push({
        enemyTeamId: record.enemyTeamId,
        kind: 'start-battle',
        where: `${path}.enemyTeamId`,
      })
    for (const [key, child] of Object.entries(record)) visit(child, `${path}.${key}`)
  }
  visit(value, where)
  return references
}
