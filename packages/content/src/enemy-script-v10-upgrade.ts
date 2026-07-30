import type { CurrentManifest, LegacyManifestV9 } from './character.js'
import type { EnemyDef } from './enemy.js'
import { checkBattleChoreographyV10, checkEnemyOnDefeatedCommandsV10 } from './enemy-script-v10.js'
import { validateEnemies } from './validate.js'

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function record(value: unknown, path: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw new Error(`${path}: 期望对象`)
  return value as Record<string, unknown>
}

/**
 * contentVersion 9 -> 10 的敌人定义纯升级。
 *
 * v10 支持的旧叶原样保留；任何宽泛 Command[] 中不属于 battle/onDefeated context 的命令
 * 都在返回前带精确路径失败。已写成完整 v10 形状、manifest 尚未提交的半状态可安全重试。
 */
export function upgradeEnemiesV9ToV10(value: unknown): EnemyDef[] {
  const upgraded = clone(value)
  if (!Array.isArray(upgraded)) throw new Error('enemies: contentVersion 9 期望数组')
  upgraded.forEach((rawEnemy, index) => {
    const enemyPath = `enemies[${index}]`
    const enemy = record(rawEnemy, enemyPath)
    if (enemy.choreography !== undefined)
      checkBattleChoreographyV10(enemy.choreography, `${enemyPath}.choreography`)
    if (enemy.onDefeated !== undefined)
      checkEnemyOnDefeatedCommandsV10(enemy.onDefeated, `${enemyPath}.onDefeated`)
  })
  return validateEnemies(upgraded)
}

/**
 * 递归扫描 scene/shared/item-private 等 canonical command tree 内的 startBattle choreography。
 * 函数只做纯 clone + context 收窄，不猜 owner 的具体内容域。
 */
export function upgradeEmbeddedBattleChoreographyV9ToV10<T>(value: T, owner: string): T {
  const upgraded = clone(value)
  const visit = (node: unknown, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((entry, index) => {
        visit(entry, `${path}[${index}]`)
      })
      return
    }
    if (!node || typeof node !== 'object') return
    const entry = node as Record<string, unknown>
    if (entry.kind === 'startBattle' && entry.choreography !== undefined)
      checkBattleChoreographyV10(entry.choreography, `${path}.choreography`)
    for (const [key, child] of Object.entries(entry)) visit(child, `${path}.${key}`)
  }
  visit(upgraded, owner)
  return upgraded
}

export function upgradeManifestV9ToV10(value: unknown): CurrentManifest {
  const manifest = record(value, 'manifest')
  if (manifest.contentVersion !== 9) throw new Error('manifest: 期望 contentVersion 9')
  if (manifest.minimumSaveVersion !== 8)
    throw new Error(
      `manifest.minimumSaveVersion: contentVersion 9 期望 8，收到 ${String(
        manifest.minimumSaveVersion,
      )}`,
    )
  return {
    ...(clone(manifest) as unknown as LegacyManifestV9),
    contentVersion: 10,
    minimumSaveVersion: 8,
  }
}
