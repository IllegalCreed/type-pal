# TEST-CODEX-ENEMY-HOOKS-1 — 当前敌人钩子翻译六组边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（翻译与结构合同；不证明战斗演出观感）

## 准入

2026-09-26，基点 `a73c0ffc`，Codex premise verified / build allowed；属于
[持续+5pp队列](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)。测试单一Owner，产品零改。
不等三席；不改Cursor editor命令、GLM content守卫和另一Codex架构的所有权文件。

四向依据：原盘/一阶段N/A于新玩法裁决（本卡只核现行迁移边界，不改机制）；当前生产调用链
`migrate-content.ts:1753` → `migrate-enemies.ts:96` 默认translator →
`translate-enemy-scripts.ts:88` → `translate-enemy-hook-flow.ts:149`；正式产物守卫
`content/src/enemy-script.ts:248`。目标为有效输入产出完整canonical hook、来源地址可追溯、
拒绝缺口带准确上下文、实际源输入不污染。解码语义参考当前 `legacy-dialog.ts` 与 `source-facts.ts`。

最强替代解释是旧测试已覆盖或缺口为不可达防御臂。本席读完原 `translate-enemy-scripts.test.ts`，
不重复其 plain/advance/reset-root、chance 1/100/101、随机四选、基本角色分支与单stage奖励。
公开入口可构造的畸形source单列防御合同，不把它称为真实资产；不构造私有状态以追求100%。
若合法结果过不了正式guard则先诊断，不降guard或改错预期。本卡不写实际迁移工程。

## 范围与验收

六份新测试 `packages/migrate/src/translate-enemy-hook-flow.{cfg,dialog,media,effects,growth,errors}.test.ts`，
专属 `src/__tests__/enemy-hook-fixtures.ts`、[报告与反控](../../../../testing/codex-enemy-hooks/README.md)。
源码/旧测试/资产/配置不变；仅整批官方门通过后ratchet生成baseline。
每组完整输出或精确错误；所有成功走真实wrapper+guard；实际source在消费前后深比较。
六针代表业务AssertionError、唯一加载与源hash不变；定向/相邻/TC/Biome后串行
check→ratchet→保护基点的单次strict-fast。计数以新鲜JSON/官方结果为准。

无下一位Agent提示词；本席连续实施、自验、集成，不冒充独立第三方。

## 完成核定

2026-09-26 Codex accept / done。六组48新增、相邻共74、TC/Biome、六对照/六针通过；
完整check9188 → ratchet → 受保护单次strict8696串行exit0。产品/旧测试/官方范围零改，
其它六包基线对象不变。全仓44891/63178=71.05%，本批+112B/+77L/+88S/+2F。
首跑两处本席资源ID预期错误及正式来源纠正见报告；无产品缺陷被改成绿预期。
母目标仍build，差1686B；Cursor新交付尚无新SHA，不借本卡放行。
