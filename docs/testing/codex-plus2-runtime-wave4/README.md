# Codex 自有覆盖率第五批 · Reforge 战斗选择与结算

本批仅新增两份 Reforge 测试与两针隔离负控；产品、旧测试、资产、
testSelection/exclude 配置均零改。技能/物品定义先过当前
`validateSkills`/`validateItems`，输入为 1–3 人队伍、现行菜单与奖励报告。
所有业务选择经真实 `BattleCommandSelection.advance` 与公开 port，
不读写私有栈。结算序列走真实 `buildSettlementScreens`；绘制测试仅隔离
下层 menu/text 绘图原语并核画框、数字、标签派发，**不宣称像素视觉验收**。

| 文件 | 项数 | 新证业务合同 |
|---|---:|---|
| `battle-command-selection.residual.test.ts` | 6 | 杂项二级使用/投掷往返零提交；全体/单体投掷与取消重选；己方单体技能取消；真气和金钱双成本；R 已用尽物品回退/F 无活敌防御；单体合击仅确认后消费队友 |
| `battle-settlement.residual.test.ts` | 3 | 经验→逐角色升级/隐藏成长/新技能→未升级者隐藏成长的顺序；无经验不造空屏；四种当前结算屏的标签、数字与画框调用合同 |

`node docs/testing/codex-plus2-runtime-wave4/mutants.mjs`：
`throw-shortcut` / `hidden-owner` 各绿对照 exit0、目标新例自身
业务 `AssertionError` 红 exit1，精确 fullName、唯一虚拟替换命中、源 SHA-256
前后不变。定向/相邻 5文件33项、Reforge typecheck与四个改动代码文件
Biome零诊断。

串行完整 `pnpm check` exit0：全仓10,026项、严格 lint扫描2340文件零
error/warning/info；`pnpm coverage:ratchet` exit0，再以
`TYPE_PAL_COVERAGE_BASE_REF=afd93a79 pnpm coverage:fast` 受保护单次
exit0。两份 fast 都是9,565项/730源码文件，分支**46,903/63,323=74.07%**。
相对接收前46,821/63,323，本批 Codex 自有测试净增**82已覆盖臂**，
分母不变；Reforge 包由7,842/11,458升至7,924/11,458。

用户本轮 +2pp 从46,201/63,315=72.9701%起算；目前约+1.0994pp，
按现分母达74.9701%需47,474/63,323，尚差**571**臂。
GLM 的 UI 候选未独立接收，不计入本批或当前正式基线。
