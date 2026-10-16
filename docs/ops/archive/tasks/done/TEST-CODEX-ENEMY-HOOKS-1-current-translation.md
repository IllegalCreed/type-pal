# TEST-CODEX-ENEMY-HOOKS-1 — 当前敌人钩子翻译六组边界

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
固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `88af1ceaffbf308c91d076a21657fa1c12c9db3d5795372c4e795d0dca896d39`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CODEX-ENEMY-HOOKS-1 — 当前敌人钩子翻译六组边界
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（翻译与结构合同；不证明战斗演出观感）
>
> ## 准入
>
> 2026-09-26，基点 `a73c0ffc`，Codex premise verified / build allowed；属于
> [持续+5pp队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。测试单一Owner，产品零改。
> 不等三席；不改Cursor editor命令、GLM content守卫和另一Codex架构的所有权文件。
>
> 四向依据：原盘/一阶段N/A于新玩法裁决（本卡只核现行迁移边界，不改机制）；当前生产调用链
> `migrate-content.ts:1753` → `migrate-enemies.ts:96` 默认translator →
> `translate-enemy-scripts.ts:88` → `translate-enemy-hook-flow.ts:149`；正式产物守卫
> `content/src/enemy-script.ts:248`。目标为有效输入产出完整canonical hook、来源地址可追溯、
> 拒绝缺口带准确上下文、实际源输入不污染。解码语义参考当前 `legacy-dialog.ts` 与 `source-facts.ts`。
>
> 最强替代解释是旧测试已覆盖或缺口为不可达防御臂。本席读完原 `translate-enemy-scripts.test.ts`，
> 不重复其 plain/advance/reset-root、chance 1/100/101、随机四选、基本角色分支与单stage奖励。
> 公开入口可构造的畸形source单列防御合同，不把它称为真实资产；不构造私有状态以追求100%。
> 若合法结果过不了正式guard则先诊断，不降guard或改错预期。本卡不写实际迁移工程。
>
> ## 范围与验收
>
> 六份新测试 `packages/migrate/src/translate-enemy-hook-flow.{cfg,dialog,media,effects,growth,errors}.test.ts`，
> 专属 `src/__tests__/enemy-hook-fixtures.ts`、[报告与反控](../../../../testing/archive/legacy/batches/codex-enemy-hooks/README.md)。
> 源码/旧测试/资产/配置不变；仅整批官方门通过后ratchet生成baseline。
> 每组完整输出或精确错误；所有成功走真实wrapper+guard；实际source在消费前后深比较。
> 六针代表业务AssertionError、唯一加载与源hash不变；定向/相邻/TC/Biome后串行
> check→ratchet→保护基点的单次strict-fast。计数以新鲜JSON/官方结果为准。
>
> 无下一位Agent提示词；本席连续实施、自验、集成，不冒充独立第三方。
>
> ## 完成核定
>
> 2026-09-26 Codex accept / done。六组48新增、相邻共74、TC/Biome、六对照/六针通过；
> 完整check9188 → ratchet → 受保护单次strict8696串行exit0。产品/旧测试/官方范围零改，
> 其它六包基线对象不变。全仓44891/63178=71.05%，本批+112B/+77L/+88S/+2F。
> 首跑两处本席资源ID预期错误及正式来源纠正见报告；无产品缺陷被改成绿预期。
> 母目标仍build，差1686B；Cursor新交付尚无新SHA，不借本卡放行。
<!-- original-source-quote:end -->
