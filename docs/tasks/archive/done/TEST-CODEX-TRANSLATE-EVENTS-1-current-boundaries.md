# TEST-CODEX-TRANSLATE-EVENTS-1 — 当前脚本翻译六组边界

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（纯迁移中间表示测试，不证明演出观感）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列对脚本翻译中间表示的六组纯测试历史记录（2026-09-26，基点 9fe9ea11）：motion/state/branches/bindings/registry/folds——同样输入得到完整稳定的当前中间表示、引用和审计，源输入不污染。

## 目标

为 migrate-content.ts:2543-2592,2782-2824,2963,3064 的真实 ScriptRegistry/translateStages/foldStages/build 消费链补六组边界合同；输入显式 current-r13-6b+stable-id。

## 范围

- 范围内：六份新测试 translate-events.{motion,state,branches,bindings,registry,folds}.test.ts、typed fixture translation-fixtures.ts、[专属报告](../../../testing/archive/legacy/batches/codex-translate-events/README.md)。
- 范围外：产品/迁移工程；没有当前生产调用方的 translateActivationBlock（已排除、不为覆盖率补测、不在测试卡删产品代码）；旧 profile/inline fallback 历史专属路径；六组去重表列明的旧回归域（0x15/0x65/0x6E、followers/palette/dither、0x79 六角色、上批场景绑定、战场默认值传播）。

## 前提与证据

中间表示不称 canonical runtime/schema（后续正式投影另有入口）；预期与实际冲突时回到源语义与调用方，不改预期掩盖。
- 当前状态：done（历史终态）

## 验收

原卡记录：59 新增、相邻 190、TC、六对照/六针、完整 check9140 全过；首轮覆盖调度误并行致 ratchet 输出被清（按报告记录、不计验收），收口采用严格串行 ratchet→strict 两步 exit0，官方 8648/701，全仓 44779/63178=70.88%，+338B/+185L/+8F。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡 Codex accept/done；母卡目标仍未达成。无下一位 Agent 提示词。本页治理不重授。

## 历史范围

2026-09-26 准入与收口同日；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：六组脚本翻译边界按纯测试批收口；并行调度事故如实记录后串行重跑。原卡全文在下方 quote 保全。

## 当时证据

六组去重表、基点 9fe9ea11、批回执（含 ratchet 清空事故）。本页治理未新增执行。

## 当前有效性

historical。翻译链现行行为以当前代码为准。

## 继任文档

队列母卡[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；同系列 codex-migrate-* 批回执。

## 原文保全

固定源 revision `bb7b1d24e9e517e09730282b104ce51b4204cb0b`，source SHA `e0f02916a7fb20794603909bdac7e364cf3236d397199a5f0abd901957ac4bbb`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # TEST-CODEX-TRANSLATE-EVENTS-1 — 当前脚本翻译六组边界
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（纯迁移中间表示测试，不证明演出观感）
>
> ## 准入与前提
>
> 2026-09-26 Codex 核定 build allowed，基点 `9fe9ea11`；属于
> [持续+5pp队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。只新增测试，不改迁移产品或生成工程。
> 当前模式不等待固定席位。GLM content 守卫、Cursor editor 命令、另一 Codex 架构文件不在本卡范围。
>
> 一手依据：`migrate-content.ts:2543-2592,2782-2824,2963,3064` 的真实 ScriptRegistry / translateStages /
> foldStages / build 消费链；`translate-events.ts` 的现行公开入口。输入显式使用 current-r13-6b + stable-id。
> 原版/一阶段仅为来源数据背景，N/A 于本次产品政策裁决；当前二阶段仍先产生迁移中间 Command/ScriptStage，
> 后续正式投影另有入口，本卡不把中间表示称为 canonical runtime/schema。
> 目标：同样输入得到完整、稳定的当前中间表示、引用和审计，源输入不污染。
>
> 最强替代解释：缺口来自失效入口或已有测试。本席已排除没有当前生产调用方的 translateActivationBlock；
> 不为覆盖率补它，也不在测试卡删除产品代码。旧 profile / inline fallback 的历史专属路径不扩测。
> 若发现预期与实际行为冲突，先回到源语义与调用方，不改预期掩盖问题；不以数字授权产品修复。
>
> ## 六组与白名单
>
> - 六份新测试 `packages/migrate/src/translate-events.{motion,state,branches,bindings,registry,folds}.test.ts`。
> - 专属 typed fixture `packages/migrate/src/__tests__/translation-fixtures.ts`，复用已有只读输入见证。
> - [专属报告](../../../../testing/archive/legacy/batches/codex-translate-events/README.md)及同目录代表反控工具。
> - 文档、统一门通过后官方生成 baseline；产品/旧测试/官方配置/资产零改。
>
> | 组 | 合同 | 去重边界 |
> |---|---|---|
> | motion | 实体绝对/相对/步进/速度/骑乘、镜头、缺属主拒绝 | 不重做 0x15/0x65/0x6E 已有回归 |
> | state | 队伍恢复、装备、场景地图、实体状态/触发、时间与屏幕效果 | 不重做 followers/palette/dither 的旧矩阵 |
> | branches | 金钱、物品、空间条件到真实注册跳转与有序副作用 | 不重做 0x79 六角色映射或历史内联截断 |
> | bindings | call/install 的属主、清空、失效引用和阶段推进 | 不重做上一批完整场景绑定；钉局部输出与目标体 |
> | registry | 当前注册根/别名/跨分片依赖、缓存身份、审计快照与错误收尾 | 不为历史未消费入口造调用方 |
> | folds | 真实 loadScene 产出、门过渡折叠与审计元数据保留 | 不重做已覆盖战场默认值传播 |
>
> ## 验收
>
> 定向/相邻/TC/Biome；每组代表变异必须由自己的业务 AssertionError 检出，产品 hash 不变。
> 整批后串行完整 check → 官方 ratchet → 保护基点的单次 strict-fast；成功后记录真实增量并提交推送。
> 不逐几个用例统计。无下一位 Agent 提示词，本席连续实施并自验，不冒充第三方。
>
> ## 完成核定
>
> 2026-09-26 Codex accept / done：59新增、相邻190、TC、六对照/六针、完整check9140全过。
> 首轮覆盖调度误并行导致ratchet输出被清，已按报告记录，不计验收；收口采用严格串行
> ratchet→strict，两步exit0。官方8648/701，全仓44,779/63,178=70.88%，本批+338B/+185L/+8F。
> 产品/旧测试/范围零改，其余六包baseline对象全等。详情见专属报告与机账；母卡目标仍未达成。
<!-- original-source-quote:end -->
