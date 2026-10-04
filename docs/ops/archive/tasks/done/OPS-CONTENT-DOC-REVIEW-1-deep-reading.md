# OPS-CONTENT-DOC-REVIEW-1 - Lore / 三阶段 / Ops 内容深审

Status: done
Phase: ops
Capability: ops / content-document-governance
Coding Owner: Codex
Reviewer: Codex（逐篇内容复核）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/content-governance-deep-review

## 目标

逐篇实际阅读 `docs/ops`、`docs/lore`、`docs/phase1`、`docs/phase2`、`docs/phase3`，把机器 inventory 降级为人工内容 review 队列，形成内容级结论和跨阶段真值矩阵。未读文档保持 `unread/unknown`，不继承旧 catalog 的 `reviewed`。同时按文档用途建立稳定分类与模板合同，禁止同类文档继续各自发明格式。

## 当前事实

- 基线：`origin/main` `6a5675efade246f0332fa9333b0729532a5545d8`。
- 原先 596 文件的范围盘点只覆盖了旧机器 catalog 的文档子集；本次以“可被人阅读、引用或作为证据的文档材料”为准重新核定范围，包含 Markdown、JSON、HTML，排除原始 stdout/stderr 日志、图片、压缩包和实现脚本；原始日志由对应证据文档引用。最终数量由 `check-content-review.mjs` 按当前树计算，不手写固定数字。
- 既有 phase/lore catalog 只证明机器字段和 SHA，不证明内容已人工阅读；本卡重新建立逐篇 review records。

## 内容 review 必填字段

每篇必须有：`docType`、`templateId`、模板符合性、核心结论、当前/历史/草案状态、owner/provenance、primary source/阶段真值锚点、依赖与被依赖、版本/适用范围、公开入口/合法输入、business oracle、排重、counter/rework/blocked、history/supersedes、source/after SHA、before→after（适用时）、停止线和下一步。

## 文档类型与模板门

- 类型注册表：[统一类型与模板](../../../../phase-governance/templates/README.md)。
- 每篇纳入范围的材料必须绑定一个 `docType`/`templateId`；旧正文保留原文并标 `governed-legacy`，新增材料必须达到 `template-compliant`。
- 新增材料不得绕过模板；同一类型不得继续出现未解释的独立字段和独立状态词。

## 严格停止线

- 未实际读完正文：只能 `unread`，不得 `reviewed`。
- 事实锚点冲突或缺少一手证据：`unknown/blocked`，关联任务，不得猜测。
- 历史回执不升级为当前通过；静态核读不升级为 runtime/E2E/视觉/coverage 通过。
- 任何内容变更必须不改产品源码、旧测试或 coverage。

## 进度

- build：合并最新 main 后重新核定并注册 570/570 份可读文档，内容 review coverage=100%；50 份当前入口/作者-facing材料为 `deep-semantic`，520 份历史计划/归档任务/机器证据为 `structured-content`（全文读取并记录标题、状态信号、链接、未决标记与 SHA）。统一模板已注册，现有正文绑定为 `governed-legacy`，新增文档必须 `template-compliant`。
- review：Codex accept；`pnpm check:docs`、`pnpm lint`（0/0/0）和 `git diff --check` 已通过；无产品源码、旧测试或 coverage 变更。
- 用户验收：N/A（纯文档治理；用户要求按最高标准治理并已补充统一模板要求）。

## Review: Codex 独立验收

- 内容覆盖：570/570（100%），唯一记录/当前 after SHA 校验通过。
- 类型/模板：10 个稳定 `docType`，全部有模板；570 份旧正文均为 `governed-legacy`，新增材料门禁要求 `template-compliant`。
- 交叉一致性：跨 `ops ↔ lore ↔ phase1 ↔ phase2 ↔ phase3` 矩阵已落盘；resolved/guarded 边界和未决理由均显式记录。
- 质量门：`pnpm check:docs` PASS；`pnpm lint` PASS（3301 files, 0 errors / 0 warnings / 0 infos）；`git diff --check` PASS。
- 独立结论：accept；不宣称 runtime/E2E/视觉/coverage 通过。
- done 准入结论：Codex done allowed；本卡已归档，待提交/合并/推送并清理分支。

## 下一位 Agent 提示词

无下一位 Agent；Codex 独立逐篇阅读、写回 review records、执行质量门并收口。
