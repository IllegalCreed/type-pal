# TEST-CODEX-ENEMY-HOOKS-1 — 当前敌人钩子翻译六组边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（翻译与结构合同；不证明战斗演出观感）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列对现行敌人钩子翻译链的纯测试批次历史记录（2026-09-26，基点 a73c0ffc）：migrate-content.ts:1753 → migrate-enemies.ts:96 → translate-enemy-scripts.ts:88 → translate-enemy-hook-flow.ts:149 生产链与 content/src/enemy-script.ts:248 产物守卫的六组合同测试；产品零改。

## 目标

为公开入口的可构造输入补齐 canonical hook 翻译的六组边界测试：完整输出或精确错误、来源地址可追溯、实际源输入不被污染。

## 范围

- 范围内：六份新测试 translate-enemy-hook-flow.{cfg,dialog,media,effects,growth,errors}.test.ts、专属 enemy-hook-fixtures.ts 与[报告与反控](../../../testing/archive/legacy/batches/codex-enemy-hooks/README.md)。
- 范围外：产品/旧测试/资产/配置；旧 translate-enemy-scripts.test.ts 已证的 plain/advance/reset-root、chance 1/100/101、随机四选、基本角色分支与单 stage 奖励（不重复）；不构造私有状态追求 100%。

## 前提与证据

四向依据中以当前生产调用链为一手锚点；解码语义参考现行 legacy-dialog.ts 与 source-facts.ts。最强替代解释（旧测试已覆盖/缺口为不可达防御臂）经读旧测试排除重复后收窄为畸形 source 防御合同单列。若合法结果过不了正式 guard 先诊断，不降 guard。
- 当前状态：done（历史终态）

## 验收

原卡记录：六组 48 新增、相邻共 74、TC/Biome、六对照/六针通过；完整 check9188 → ratchet → 保护基点单次 strict8696 串行 exit0；全仓 44891/63178=71.05%，本批 +112B/+77L/+88S/+2F；首跑两处资源 ID 预期错误及正式来源纠正见报告，无产品缺陷被改成绿预期。以上为原卡时点结果，本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡明确无下一位 Agent 提示词，Codex 连续实施自验集成、不冒充独立第三方；母目标仍 build、差 1686B。本页治理不重授测试信用。

## 历史范围

2026-09-26 准入与同日 accept/done；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b（S15 批次源快照）。2026-10-17 R42 泛化封套，2026-10-18 S15 逐篇改写。

## 原始结论

`Status: done`：六组边界合同按纯测试批收口。原卡全文在下方 quote 保全。

## 当时证据

生产链锚点与 enemy-script.ts:248 守卫；批回执含首跑错误与纠正记录。本页治理未新增执行。

## 当前有效性

historical。翻译链现行行为以当前代码与测试为准；71.05% 等覆盖数字为 2026-09-26 时点。

## 继任文档

队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；同批系列见 codex-enemy-hooks 回执目录。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `88af1ceaffbf308c91d076a21657fa1c12c9db3d5795372c4e795d0dca896d39`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
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
