# TEST-CODEX-TRANSLATE-EVENTS-1 — 当前脚本翻译六组边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯迁移中间表示测试，不证明演出观感）

## 准入与前提

2026-09-26 Codex 核定 build allowed，基点 `9fe9ea11`；属于
[持续+5pp队列](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)。只新增测试，不改迁移产品或生成工程。
当前模式不等待固定席位。GLM content 守卫、Cursor editor 命令、另一 Codex 架构文件不在本卡范围。

一手依据：`migrate-content.ts:2543-2592,2782-2824,2963,3064` 的真实 ScriptRegistry / translateStages /
foldStages / build 消费链；`translate-events.ts` 的现行公开入口。输入显式使用 current-r13-6b + stable-id。
原版/一阶段仅为来源数据背景，N/A 于本次产品政策裁决；当前二阶段仍先产生迁移中间 Command/ScriptStage，
后续正式投影另有入口，本卡不把中间表示称为 canonical runtime/schema。
目标：同样输入得到完整、稳定的当前中间表示、引用和审计，源输入不污染。

最强替代解释：缺口来自失效入口或已有测试。本席已排除没有当前生产调用方的 translateActivationBlock；
不为覆盖率补它，也不在测试卡删除产品代码。旧 profile / inline fallback 的历史专属路径不扩测。
若发现预期与实际行为冲突，先回到源语义与调用方，不改预期掩盖问题；不以数字授权产品修复。

## 六组与白名单

- 六份新测试 `packages/migrate/src/translate-events.{motion,state,branches,bindings,registry,folds}.test.ts`。
- 专属 typed fixture `packages/migrate/src/__tests__/translation-fixtures.ts`，复用已有只读输入见证。
- [专属报告](../../../../testing/codex-translate-events/README.md)及同目录代表反控工具。
- 文档、统一门通过后官方生成 baseline；产品/旧测试/官方配置/资产零改。

| 组 | 合同 | 去重边界 |
|---|---|---|
| motion | 实体绝对/相对/步进/速度/骑乘、镜头、缺属主拒绝 | 不重做 0x15/0x65/0x6E 已有回归 |
| state | 队伍恢复、装备、场景地图、实体状态/触发、时间与屏幕效果 | 不重做 followers/palette/dither 的旧矩阵 |
| branches | 金钱、物品、空间条件到真实注册跳转与有序副作用 | 不重做 0x79 六角色映射或历史内联截断 |
| bindings | call/install 的属主、清空、失效引用和阶段推进 | 不重做上一批完整场景绑定；钉局部输出与目标体 |
| registry | 当前注册根/别名/跨分片依赖、缓存身份、审计快照与错误收尾 | 不为历史未消费入口造调用方 |
| folds | 真实 loadScene 产出、门过渡折叠与审计元数据保留 | 不重做已覆盖战场默认值传播 |

## 验收

定向/相邻/TC/Biome；每组代表变异必须由自己的业务 AssertionError 检出，产品 hash 不变。
整批后串行完整 check → 官方 ratchet → 保护基点的单次 strict-fast；成功后记录真实增量并提交推送。
不逐几个用例统计。无下一位 Agent 提示词，本席连续实施并自验，不冒充第三方。

## 完成核定

2026-09-26 Codex accept / done：59新增、相邻190、TC、六对照/六针、完整check9140全过。
首轮覆盖调度误并行导致ratchet输出被清，已按报告记录，不计验收；收口采用严格串行
ratchet→strict，两步exit0。官方8648/701，全仓44,779/63,178=70.88%，本批+338B/+185L/+8F。
产品/旧测试/范围零改，其余六包baseline对象全等。详情见专属报告与机账；母卡目标仍未达成。
