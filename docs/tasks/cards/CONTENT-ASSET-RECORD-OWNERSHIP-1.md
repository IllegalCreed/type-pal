# CONTENT-ASSET-RECORD-OWNERSHIP-1 — 资源引用诊断识别实际登记项

Status: blocked
Phase: phase2
Owner: Codex
Reviewer: Codex
Last reviewed: 2026-11-19
Template: task-card-v1 / 1.0.0
Visual Verification Timing: N/A

## 目标

以真实目录记录区分资源缺失和类型不匹配，使内容校验与 Editor 作者诊断使用同一存在性合同。

## 范围

实际影响 `packages/content/src/asset.ts` 的目录查询与 `packages/editor/src/core/asset-diagnostics.ts` 的诊断投影。资产格式、资源文件和保存格式依各自现行合同。本卡只读取证，代码准入待活跃 E2E 对资产源的写入完成后按最新主线重新裁定。

## 前提与证据

合法作者场景引用一个尚未登记的 AssetId 为负例。真实 Content 读取和 Editor 诊断将一个继承成员当成目录结果，报告 `kind-mismatch` 和未知类型，仍产生拒绝级问题。结构相同的合法明文登记正控无诊断。现行合同依据 [工程资产身份](../../phase2/specs/content-schema.md) 与 [工程代码质量](../../engineering/guides/code-quality.md#a-正确性与边界)。

最强替代解释是“同名实际已经登记但类型错误”。读取真实空目录、确认没有自有记录，随后改为实际登记与正确 kind，分别得到上述两种结果。若当前候选已按自有记录查找，应收到缺失诊断，不能继续沿用现有代码位置裁定。

## 验收

[资产任务执行原件](../evidence/QUALITY-CONTENT-ASSET-CONTRACTS-1.tar.gz) 内有 `editor-diagnostic-own-record-observation` 的命令、日志及合法场景与目录输入。准入后通过正式入口先写一处稳定红例，分别验证缺记录、已登记同名项，以及真正 kind 不符。保存和 Loader 相邻运行按受影响范围验证。

## 状态与交接

2026-11-19 已复现，准入未开启。Content 资产源在活跃 E2E 分支有两项业务修改。合入后对照最新版本核全部实际调用、错误传播和单一 Coding Owner。用户可感知的诊断合同按真实缺失表述，保持现有拒绝层级。

2026-11-19 用户裁定在 E2E 合入后接续。活跃 E2E 工作树的 Content 资源模块仍有音效角色和命令引用修改。合入后重新核单一 Owner 和来源绑定，先复用现有区分缺失与类型错误的反例，再做实际登记查询的修复。本轮该 Editor 文件保留 review。
