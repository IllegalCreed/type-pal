# 一阶段有效属性与战斗状态投影补测 — Codex 接收与集成

2026-09-25。贡献者 Gemini 隔离候选 `64dd4cf9`；用户明确 Gemini 额度耗尽后，由 Codex 接手修订候选 `1443d407` 并独立验收，正式测试提交 `cca91809`。Gemini 是测试贡献者，其 26 项自验不作为独立第三方证明；本席重新读取核心合同、复跑候选/相邻/反控，修正后才移入 `packages/game/src/core/__tests__/stats/`。

## 接收边界

- E1–E6、I1–I2 八族共 **26 项**正式测试；六 getter 的 Extra 格/角色隔离/毒抗边界、装备效果写入清理、属性行、装备脚本跳转与上限、全员效果重建、战内 live HP/MP 保真、队伍 slot/roleId、敌方与战场只读投影。
- Codex 修订：E2 拒绝路径比整个效果层前像；E4/E5 `afterEach` 清理全局事件，E4 钉 256 tick 警告；I1 五隐藏经验池给独立非零值并完整比较；I2 改用正式 `createBattleState` 和 seeded RNG，不再用 `as any` 拼不完整战斗态，也不为 `maxHealth` 缺席的旧 fixture fallback 新增保活测试。
- 正式集成只增加上述 9 个测试/fixture 文件和覆盖率基线；`packages/game/src/core/equip-effect.ts`、`inspect/battle-inspect.ts` 等生产文件、旧测试、官方 include/exclude、超时、版本/资源格式均零改。隔离分支的 README、config、mutants 仍作来源证据，不整包复制到正式 runner。没有从这些用例发现新产品缺陷。

## 独立验证

| 门 | 结果 |
|---|---|
| Gemini 原候选独立复跑 | 26/26；旧相邻 `equip-effect` 与 `battle-inspect` 41/41；候选 tsc/Biome 通过 |
| 隔离负控 | E4 部位偏移、E6 有效攻/战内 HP 保真、I1 slot/roleId 四针：各原树绿、单点候选业务 `AssertionError` 红，产品源 SHA 前后不变；Codex 修订后再跑仍通过 |
| 正式目录定向 | 26/26；`@type-pal/game` typecheck、正式九文件 Biome 通过 |
| 完整 `pnpm check` | exit 0；game 2401/2401，migrate 534/534、reforge 1610/1610、editor 2754/2754，剩余包及文档/工具门亦通过；lint 只有既有 warning/info，无新增 error |
| 官方 `coverage:ratchet` | `TYPE_PAL_COVERAGE_BASE_REF=origin/main` 受保护执行 exit 0；无源码范围/旧测试身份删除，八个新测试文件恰 +26 项 |
| 单次严格 `coverage:fast` | 同一受保护基准 exit 0；**8065 项 / 641 生产文件**，七包分母不变，基线未下降 |

前后均为同一生产集合和分母：全仓语句 **60675→60734/80617（+59）**、分支 **42859→42910/63176（+51）**、函数 **11318→11323/15034（+5）**、行 **54656→54707/70570（+51）**。game 分支 **7523→7574/11281**；其它六包基线对象无回退。当前全仓行 **77.52%**、语句 **75.34%**、函数 **75.32%**、分支 **67.92%**。这是正式 fast 实测，不是隔离候选数的直接相加。

未跑 full/PAL 原始资源、浏览器视觉、剧情 E2E 或 Q1/Q2；本包也不把长期覆盖目标设成 E2E 新门槛。后续如有第一阶段公式争议仍按一手证据和用户裁决，不因测试全绿推定现有实现绝无 bug。
