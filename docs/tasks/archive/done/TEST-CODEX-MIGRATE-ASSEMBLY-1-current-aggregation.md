# TEST-CODEX-MIGRATE-ASSEMBLY-1 — 当前迁移汇总六组回归

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯数据汇总，无生成工程写盘）
Production Base: `f81d365f`
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列第二个 Codex 批的纯测试历史记录（2026-09-26，Production Base f81d365f）：对 migrateAll 汇总调用（migrate-content.ts:1492-1880 的汇总/诊断/敌技能闭包）补六组接线/优先级/诊断身份/输入保真回归。

## 目标

验证现行管线中间结果 migrateAll 的六组合同：records/equipment/use/throw/enemies/diagnostics——真实输入深快照、返回值/诊断/非空哨兵、适用输出过正式 guard。

## 范围

- 范围内：六新测试 migrate-all.{records,equipment,use,throw,enemies,diagnostics}.test.ts、新 fixture migration-assembly-fixtures.ts（复用上批 typed 源工厂）、证据目录 codex-migrate-assembly/。
- 范围外：产品/旧测试/全局配置/资产；migrateAll 是中间结果、throw 在 overlay 前尚无 target——不伪称其产物已 canonical、不借测试保留旧版本入口；原盘 full-only golden 保留不重复。

## 前提与证据

一手锚点 MigrateSources（migrate-content.ts:1425，地址=实际数组下标）与 pal-migration.ts:390-429（唯一当前生成核调用 migrateAll 再过 overlay）；测试只用 current-r13-6b/stable-id，不用冻结历史 authority。产品策略争议另登记，不以覆盖率任务授权修产品。
- 当前状态：done（历史终态）

## 验收

原卡记录：六文件 49 项、相邻 14 文件 150 项；六代表单点反控各一正一红共 12 跑（精确 fullName/file/exit1/AssertionError、模块 hash 不变）；初次 TC 测试指令缺 messageIndex 字段与反控地址守卫命中两处被唯一性判据拒绝，均按真实源码修正、未计有效反控；完整 check9028、官方 ratchet、保护 f81d365f 单次 strict8536/701 exit0；全仓 44114/63178=69.82…%，净增 169B/134L/148S/21F。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex 核定 accept/done、不需其它 AI 补签；无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-26 准入、实施与收口同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：migrateAll 六组汇总回归按纯测试批收口。原卡全文与失败修正记录在下方 quote 保全。

## 当时证据

四向裁定表、三次日志（含失败与修正）、批回执。本页治理未新增执行。

## 当前有效性

historical。汇总链现行行为以当前代码为准；69.82% 为时点数字。

## 继任文档

队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；同系列 codex-migrate-scenes/codex-migrate-pure 批回执。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `85448083dba0b5038cedbf55c4857bb8e1596e18a964c4e4f561160c44af6fd0`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-MIGRATE-ASSEMBLY-1 — 当前迁移汇总六组回归
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（纯数据汇总，无生成工程写盘）
> Production Base: `f81d365f`
>
> ## 准入与前提
>
> [持续目标](TEST-COVERAGE-PLUS5-1-continuous-batches.md)第二个本席批。2026-09-26 Codex核定
> build allowed：只新增真实`migrateAll`汇总调用测试，不改产品、旧测试、全局配置或资产。
>
> | 方向 | 一手锚点 | 裁定 |
> |---|---|---|
> | primary输入 | `packages/migrate/src/migrate-content.ts:1425` MigrateSources | 独立typed提取表；地址对应实际数组下标 |
> | 第一阶段/原盘 | `src/migrate-content.test.ts:97/621/685/1189` 原盘golden | 既有full-only证明保留，不宣称本批是新机制发现 |
> | 当前二阶段 | `src/pal-migration.ts:390-429` 唯一当前生成核调用migrateAll再过overlay | 测试只用current-r13-6b/stable-id；不用冻结历史authority |
> | 本批目标 | `src/migrate-content.ts:1492-1880` 汇总、诊断、敌技能闭包 | 验证接线/优先级/诊断身份/输入保真，适用输出过正式guard |
>
> 关键边界：migrateAll是现行管线的中间结果，throw在overlay前尚无target；不伪称其整个产物已经
> canonical，不借测试保留/新增旧版本入口。最强替代解释是原盘已有覆盖而fast未执行；逐组分列
> 旧证据与新增接线/反例。若发现产品策略争议，另登记，不以覆盖率任务授权修产品或重迁。
>
> ## 白名单和验收
>
> - 六新测试：`packages/migrate/src/migrate-all.{records,equipment,use,throw,enemies,diagnostics}.test.ts`。
> - 新fixture：`src/__tests__/migration-assembly-fixtures.ts`；复用上一批typed源工厂，不改旧测试。
> - 专属证据`docs/testing/archive/legacy/batches/codex-migrate-assembly/`，本席维护导航/看板及最终官方基线。
> - 同一实际输入深快照；返回值/诊断/非空哨兵；六代表单点反控（仅内存变异）。
> - 定向+相邻/TC/Biome后统一串行完整check→ratchet→受保护单次strict-fast。
> - 与GLM content guard、Cursor editor命令及其它Codex架构写入面隔离。
>
> ## 日志
>
> - 2026-09-26：已直读生产caller、migrateAll及旧golden，六组实施开始。done未开放。
> - 2026-09-26：六文件49项、相邻14文件150项通过；TC/改动Biome/docs通过。
>   六代表单点反控各一正一红共12跑，精确fullName/file/exit1/AssertionError且模块hash不变。
>   初次TC为测试指令类型未声明messageIndex，已在新fixture补同型字段；初次反控地址守卫
>   命中两处，被唯一性判据拒绝，后收窄到migrateAll具体行。均未改产品、未计作有效反控。
>   当前review，开始统一质量门；不提前声明覆盖增量。
> - 2026-09-26：完整check9,028、官方ratchet、保护f81d365f的单次strict8,536/701均exit0；
>   生产分母不变，其它六包baseline对象不变；全仓净增169B/134L/148S/21F。
>   实际全仓44,114/63,178=69.82493906106556%。[回执](../../../../testing/archive/legacy/batches/codex-migrate-assembly/README.md)
>   已列失败历史、六针业务红、完整质量门与范围。本席核定 **accept / done**，不需其它AI补签。
>
> 无下一位Agent提示词；本席连续实施与验证。
<!-- original-source-quote:end -->
