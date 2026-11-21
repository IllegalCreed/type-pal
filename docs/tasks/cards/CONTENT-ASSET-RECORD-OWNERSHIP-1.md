# CONTENT-ASSET-RECORD-OWNERSHIP-1 — 资源引用诊断识别实际登记项

Status: review
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-21
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

以真实目录记录区分资源缺失和类型不匹配，使内容校验与 Editor 作者诊断使用同一存在性合同。

## 范围

实际影响 `packages/content/src/asset.ts` 的目录查询与 `packages/editor/src/core/asset-diagnostics.ts` 的诊断投影。资产格式、资源文件和保存格式依各自现行合同。第一阶段无相关调用。本卡沿用真实资源缺失诊断，保持合法同名 ID 与原有拒绝级别。

## 前提与证据

合法作者场景引用一个尚未登记的 AssetId 为负例。真实 Content 读取和 Editor 诊断将一个继承成员当成目录结果，报告 `kind-mismatch` 和未知类型，仍产生拒绝级问题。结构相同的合法明文登记正控无诊断。现行合同依据 [工程资产身份](../../phase2/specs/content-schema.md) 与 [工程代码质量](../../engineering/guides/code-quality.md#a-正确性与边界)。

最强替代解释是“同名实际已经登记但类型错误”。读取真实空目录、确认没有自有记录，随后改为实际登记与正确 kind，分别得到上述两种结果。若当前候选已按自有记录查找，应收到缺失诊断，不能继续沿用现有代码位置裁定。

## 验收

[资产任务执行原件](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 内有 `editor-diagnostic-own-record-observation` 的命令、日志及合法场景与目录输入。准入后通过正式入口先写一处稳定红例，分别验证缺记录、已登记同名项，以及真正 kind 不符。保存和 Loader 相邻运行按受影响范围验证。

## 状态与交接

2026-11-19 已复现，准入未开启。Content 资产源在活跃 E2E 分支有两项业务修改。合入后对照最新版本核全部实际调用、错误传播和单一 Coding Owner。用户可感知的诊断合同按真实缺失表述，保持现有拒绝层级。

2026-11-19 用户裁定在 E2E 合入后接续。活跃 E2E 工作树的 Content 资源模块仍有音效角色和命令引用修改。合入后重新核单一 Owner 和来源绑定，先复用现有区分缺失与类型错误的反例，再做实际登记查询的修复。本轮该 Editor 文件保留 review。

2026-11-21 Codex build allowed。Q2 [#74](https://github.com/IllegalCreed/type-pal/pull/74) 合入 `10378100a33013d8c2030ca266e125b913e9c6a7`，在治理树接回写入。复核 E2E 工作树的未提交切片，未占用本卡 Content 与 Editor 入口。用户此前批准按实际登记查询，此处继续既有资源格式和校验规则。

`39e092257` 把存在性判断归 Content 的 `findAssetRecord`，角色装配、文件引用闭合和 Editor 诊断均使用此合同。完整核对资产与诊断实现。真实生产调用是项目发布校验、Editor 作者页、保存/发布检查。原因按预期种类、实际种类与文本分层，既有同一 where 多个引用的归属顺序保留。

- 正确性与边界、注释。引用的所有权来自实际目录键。缺项与错种类仍走各自拒绝分支，未使用项的 warning 来源为实际键。新短注释说明为什么需要实际登记。
- 内聚、复用与表达。Content 负责存在性，Editor 继续负责文字投影；新函数只有查询职责，无第二种查表规则或配置开关。删除显示层重复的同义类型断言。
- 测试与可测性。实际 Actor 引用和 Manifest 角色均先传入合法同名登记，再核缺失原型同名项。真正 kind 不符与重复 where 的相邻断言继续保留。两个文件各单红，修改后分别进入本轮 Content 124 项、Editor 32 项的定向绿组。
- 多余部分。保留角色和普通引用各自的消息合同，不抽象合并两条验证流程；现有发布和诊断入口无冗余参数。本卡无资源文件写入、运行态迁移或异步资源。

[本轮执行归档](../evidence/QUALITY-POST-GAME-ACCEPTANCE-AUDIT-1.tar.gz) 的 `after-q2/` 保存两份失败与修复后执行，源身份和命令来自 `runs.json`。三个受影响包的 typecheck、定向静态门和账本已核。现行账本的 Editor 诊断关闭；本任务等待大窗口集成门。
