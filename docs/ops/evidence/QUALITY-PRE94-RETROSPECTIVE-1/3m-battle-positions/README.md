# CODE3m battle positions 只读复审切片

基点：`1ad2451d4`；分支：`codex/code-quality-3y`，相对 `origin/main` 为 `0 behind / 197 ahead`。本片是高风险 CODE-QUALITY-3m 的只读坐标小切片，不改战斗行为、公式、存档或公共接口。

完整读取 `battle-positions.ts`，核真实 caller：`battle-state.ts` 初始 fighter pos、`battle-opcodes.ts` 动态阵型、`draw-battle-sprites.ts`/`draw-battle-ui.ts` anchor 和 `present-battle.ts` 数字/精灵定位；读取 `battle-state.test.ts` 的位置/EnemyPos fixture 与 SDL `battle.c:27,903-939`、`global.h:401-404` primary。1/2/3 人队伍坐标逐项对齐；4/5 人是代码明确记录的 fallback 扩展，不冒充 SDL 原表；EnemyPos 缺失、enemyCount/index 越界均返回 fallback/undefined，未发现直接缺陷。

验证：按位置/EnemyPos 关键词定向执行 `battle-state.test.ts`，`1 passed / 13 skipped`（其余测试与坐标无关），结果无 stderr；game typecheck 未见诊断。coverage、official ratchet、protected fast、全仓 `pnpm check` 按用户成本规则留到大模块收口。3m 其它公式、magic damage、status、queue、RNG 文件仍 pending，整卡不关闭。

