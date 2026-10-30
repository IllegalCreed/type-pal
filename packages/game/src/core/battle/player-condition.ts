/** 濒死的 TS 输入合同：存活且低于 min(100, floor(maxHP/5))；死亡单独判定。
 * 阈值来自 SDLPal PAL_IsPlayerDying；不把 TS 的 hp>0 扩展冒称为 C 原式。 */
export function isPlayerDying(role: { hp: number; maxHP: number }): boolean {
  return role.hp > 0 && role.hp < Math.min(100, Math.floor(role.maxHP / 5))
}

/** 菜单可用性与合击参与者共用：存活、非濒死，且五项阻断状态均未生效。
 * SDLPal PAL_IsPlayerHealthy 的业务门槛；保留 TS 缺省计数与显式死亡判断。 */
export function isPlayerHealthy(
  role: { hp: number; maxHP: number },
  status: {
    sleep?: number
    confused?: number
    silence?: number
    paralyzed?: number
    puppet?: number
  },
): boolean {
  if (role.hp <= 0 || isPlayerDying(role)) return false
  return (
    (status.sleep ?? 0) === 0 &&
    (status.confused ?? 0) === 0 &&
    (status.silence ?? 0) === 0 &&
    (status.paralyzed ?? 0) === 0 &&
    (status.puppet ?? 0) === 0
  )
}
