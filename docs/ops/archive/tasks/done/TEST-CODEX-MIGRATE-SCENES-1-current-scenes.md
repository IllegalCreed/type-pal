# TEST-CODEX-MIGRATE-SCENES-1 — 当前场景迁移六组回归

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
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `c83ac12c38a8a3e860bda6a718b146045e7df04c67f7f63d16bac93ac1800f85`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CODEX-MIGRATE-SCENES-1 — 当前场景迁移六组回归
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（内存数据转换，无剧情观感或生成工程写盘）
> Production Base: `20544351`
>
> ## 准入与前提
>
> [持续目标](TEST-COVERAGE-PLUS5-1-continuous-batches.md)第三批。2026-09-26 Codex核定 build allowed，
> 只新增真实内存入口回归，不改产品/旧测试/配置/资产；GLM content与Cursor editor白名单不重叠。
>
> | 方向 | 一手证据 | 本批边界 |
> |---|---|---|
> | 提取输入 | `packages/migrate/src/source-facts.ts:12-20/66-73` | typed SourceCmd；0x46像素/菱形换算不变 |
> | 原版/第一阶段 | `docs/phase2/reference/phase1-knowledge-harvest.md` W；`migrate-content.test.ts:975-1259` | 已有原盘golden保留；不重新裁定玩法或资源真值 |
> | 当前二阶段 | `migrate-content.ts:2078-3313`、`pal-migration.ts:390` | 现行current-r13-6b/stable-id，真实注册表/翻译器 |
> | 目标 | 入口/实体/遇敌/脚本同步/会话/战场传播六组 | 验证真实产物、同一输入保真与可证伪反控 |
>
> 最强替代解释：一些臂已有full-only原盘证明。新增矩阵补独立优先级、拒绝边界、完整输出与
> 隔离性，不把fast执行增加包装成新机制发现。产品策略争议另记，不借本卡修行为或主树重迁。
>
> ## 白名单与验收
>
> - 六新测试 `packages/migrate/src/migrate-scenes.{entries,entities,encounters,bindings,sessions,defaults}.test.ts`。
> - typed fixture `src/__tests__/scene-migration-fixtures.ts`；证据 `docs/testing/archive/legacy/batches/codex-migrate-scenes/`。
> - 主输出先过当前正式结构守卫；中间态单列，不强造canonical合同。
> - 定向、相邻、TC/Biome、六代表单点内存反控；整批统一串行check→ratchet→受保护单次strict-fast。
> - 本席维护卡/导航/看板与最终基线；不重复每个小组跑覆盖率。
>
> ## 日志
>
> - 2026-09-26：已直读现行调用链与旧测试，开始实施。done未开放。
> - 2026-09-26：六文件53项、相邻13文件165项、TC/Biome/docs通过；六单点反控12跑业务鉴别通过，
>   产品hash不变。初次14测试红与TC误用字段已按真实源码修正，失败记录见[回执](../../../../testing/archive/legacy/batches/codex-migrate-scenes/README.md)。
> - 2026-09-26：完整check9,081、官方ratchet、保护20544351的单次strict8,589/701均通过；
>   六个其它包baseline完整对象与所有生产分母不变。本批+327B/+250L/+297S/+39F，
>   全仓44,441/63,178=70.3425242964323%。Codex核定 **accept / done**，已满足纯测试包收口条件。
>   无产品变更、无视觉/full/Q1-Q2扩张；总目标继续执行。
>
> 无下一位Agent提示词；本席连续实施与验证。
<!-- original-source-quote:end -->
