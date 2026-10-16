# TEST-CODEX-MIGRATE-ASSEMBLY-1 — 当前迁移汇总六组回归

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `bb7b1d24e9e517e09730282b104ce51b4204cb0b`；本轮为 2026-10-17 R42。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `85448083dba0b5038cedbf55c4857bb8e1596e18a964c4e4f561160c44af6fd0`；下方 quote 可逆回原始 UTF-8 字节。
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
