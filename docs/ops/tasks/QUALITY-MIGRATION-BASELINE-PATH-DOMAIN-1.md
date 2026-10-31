# QUALITY-MIGRATION-BASELINE-PATH-DOMAIN-1 — 基线清单路径输入域

Status: review
Owner: Codex
Coding Owner: Codex
Reviewer: Codex（单 Agent）
Phase: phase2
Capability: A7
Visual Verification Timing: N/A（离线JSON读取）
Branch: codex/code-quality-94-102

## 目标与范围

核定迁移基线 `_state.json` 的 managedFiles 只能指向基线根内的规范相对文件；错误/损坏清单不得沿上级路径读入别处JSON。用户2026-10-29已批准拒绝越界基线路径；仅补既有读取/投影边界的路径校验，不改真实基线或生成物。

## 前提真值门

| 维度 | 当前证据与范围 |
|---|---|
| primary | migrate README明确baseline是进入Git的上次current发布，禁止手工拼接；`baselineWrites`只把托管内容投影到固定baseline根。当前发布CLI只加载该root，没有外部baseline导入功能。 |
| 第一阶段 | N/A：不涉及原盘解码、战斗、显示或游戏存档；基线state版本1是独立离线格式轴。 |
| 当前实现 | `loadPalBaseline`对managedFiles逐条resolve(root,path)，只检查对应hash字符串，未限制绝对/上级/非规范路径；已在自有repo/outside.json通过真实入口复现。 |
| 目标 | 如用户批准，先正式红例，再只拒绝越界/非规范清单路径；保持当前合法baseline内容、格式和原盘只读链接行为。 |

最强替代解释：正常生成器不会写这些路径，baseline是可信Git文件，未证明普通发布会遇到。故本卡仅证明损坏/手改清单的输入域缺口，不声称真实作者文件被泄漏、覆盖或普通发布已经失败。若真实入口在读取外部正文前拒绝，或当前合同明确允许baseline跨根引用，则推翻修复前提。

## 上下文与取证

[父窗口](QUALITY-PENDING-100-3.md)、[八维质量](../code-quality.md)、[二阶段规则](../../phase2/READ-FIRST.md)。当前WIP只有已准入的纯重构：loader原函数体与e940基点完全相同，改为直接public实现，故本观察不是新重构引入的行为。

正常 `content/value.json` 对照成功；`../../../../../outside.json`清单在版本1、正确SHA和真实文件条件下返回outside-owned sentinel。独立contract因“应拒绝越界清单”出现AssertionError。probe全程仅用自有mkdtemp，目标字节未改变，finally清理；完整raw/producer见[窗口证据](../evidence/QUALITY-PENDING-100-3/README.md)。未运行真实迁移CLI。

## 验收与停止线

正式测试走原生磁盘清单和真实loader；路径拒绝/正常生成与读取分开验证，保留第一业务红例。同步核snapshot→baselineState/baselineWrites和TOCTOU复核的同一输入域，不能仅补加载端却让生产端输出不能再读的路径。共享语义、失败传播、只读性与合法caller证据逐项核；不扩大版本兼容，不改变原盘资源链接，不写生成物。

## 当前模式与交接

2026-10-29 用户裁决：“批准拒绝越界基线路径（推荐）”。Codex build allowed：单Owner、同一治理树/分支，仅 migration-baseline.ts 的路径输入校验与正式专测；同步加载、baseline输出、TOCTOU的同一合同。正常合法数据字节、磁盘版本、公共接口和原盘只读链接保持；统一门和整源关闭尚待验收。

2026-10-29 局部代码接受：路径在加载读取前、baseline投影与TOCTOU共用校验，拒绝绝对、上级、点段、空段、反斜线、盘符及非字符串；不归一化坏值、不增兼容或链接政策。当前同字节10例在纯重构检查点10个业务AssertionError，修后10绿，source精确恢复；相邻21文件170绿、migrate typecheck 0。真实537项基线只读加载与复核通过、state字节不变，未执行迁移/发布。部分词法输入原已native报错，新校验只是提前领域拒绝，不能称10项新漏洞。

纯重构与行为修复分别冻结前后指纹；所有红绿、修订前绝对路径用例和改为自有outside文件的重放原件见父窗口附件。该边界只保证清单路径拼写，未声称OS沙箱或跨进程链接安全。统一门/提交/推送/合并留父窗口，当前review。

## 下一位 Agent 提示词

无下一位Agent提示词；Codex单Agent继续父窗口，复用本卡红绿，不重复运行未变候选。统一门与发布仍等父窗口。
