# OPS-CONTENT-DOC-REVIEW-1 - Lore / 三阶段 / Ops 内容深审

Status: build
Phase: ops
Capability: ops / content-document-governance
Coding Owner: Codex
Reviewer: Codex（逐篇内容复核）
Visual Verification Owner: N/A
Contributor: Codex
Branch: codex/content-governance-deep-review

## 目标

逐篇实际阅读 `docs/ops`、`docs/lore`、`docs/phase1`、`docs/phase2`、`docs/phase3`，把机器 inventory 降级为人工内容 review 队列，形成内容级结论和跨阶段真值矩阵。未读文档保持 `unread/unknown`，不继承旧 catalog 的 `reviewed`。

## 当前事实

- 基线：`origin/main` `6a5675efade246f0332fa9333b0729532a5545d8`。
- 范围：ops 412、lore 14、phase1 60、phase2 105、phase3 5，共 596 个文件。
- 既有 phase/lore catalog 只证明机器字段和 SHA，不证明内容已人工阅读；本卡重新建立逐篇 review records。

## 内容 review 必填字段

每篇必须有：核心结论、当前/历史/草案状态、owner/provenance、primary source/阶段真值锚点、依赖与被依赖、版本/适用范围、公开入口/合法输入、business oracle、排重、counter/rework/blocked、history/supersedes、source/after SHA、before→after（适用时）、停止线和下一步。

## 严格停止线

- 未实际读完正文：只能 `unread`，不得 `reviewed`。
- 事实锚点冲突或缺少一手证据：`unknown/blocked`，关联任务，不得猜测。
- 历史回执不升级为当前通过；静态核读不升级为 runtime/E2E/视觉/coverage 通过。
- 任何内容变更必须不改产品源码、旧测试或 coverage。

## 进度

- build：已建立 596 文件范围盘点；内容 review records 待按批次落盘。
- review：pending。
- 用户验收：pending。

## 下一位 Agent 提示词

无下一位 Agent；Codex 独立逐篇阅读、写回 review records、执行质量门并收口。
