# DOCS-RECORD-INTEGRITY-1 — R 波记录可信度撤回与补救

Status: build
Phase: ops
Capability: documentation evidence integrity
Coding Owner: Codex
Contributor: Codex
Reviewer: 待非作者复核；本卡自验不称独立审
Branch: codex/docs-audit-rework
Last reviewed: 2026-10-18
Template: task-card-v1 / 1.0.0

## 目标

按用户提交的 GLM 审计撤回 R39–R93 的过度信用，修复生成文本损坏与证据链缺口，保存真实重跑输出。修复记录可信度不等于重授全量语义验收。

## 范围

- 文档、治理 registry/review/catalog、进度与文档质量工具；不改产品源码、旧产品测试、coverage 或 Biome 规则。
- 原回执和历史结论保留；勘误单独记录，不能修改旧 stdout 或伪造当时重跑。
- 本卡是流程回退与修复卡，不追认 a1ac53bbe 的放宽，不代替 1838 逐篇重审。

## 前提真值门

### 一句话行为 / 工程前提

字节保真、章节形状、SHA 和结构校验无法证明逐篇语义深审或非作者身份；已撤回的完成数必须从当前账本与进度移除。

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| primary source | 183ec0bf0 只修改 R65 summary 中 8080→7970；a1ac53bbe 引入 artifact-only 完成捷径 | 两笔 Git diff；本卡配套 integrity-audit.json |
| 第一阶段 | 原文 quote 与最新机制注记必须保护；只修生成封套损坏 | CLAUDE.md；docs/phase1/game-mechanics.md |
| 当前二阶段 | 不把历史设计重授当前实施权 | docs/phase2/READ-FIRST.md；docs/ops/guides/documentation-model.md |
| 本任务目标 | 状态降档、真实重跑、可追溯勘误；不由自验授独立接受 | 用户 2026-10-18 审计及六项返工要求 |

### 反证与替代解释

- 命令可能当时另有重跑，但当前修改提交未保存原始输出，不能凭假设确认；原 accept 信用撤回。
- 处理速度不是唯一判据；具体结论缺乏逐篇来源、反证与审查身份支撑，足以要求降档。后续真实重审可逐篇重授。
- Git 不保存历史 mtime；以 commit/blob 差异扫描 machine receipt，当前 mtime 不作历史真实性证据。
- 仅修当前生成封套；若 quote 原字节变化立即停止该修复。

### 用户可见偏离

- before → after：全量 done/深审全通过 → rework/partial-review-unknown，机械保真单列。
- 用户授权：2026-10-18 明确要求上述降档、补救与重跑；不需要逐批申请。

## 上下文锚点

- AGENTS.md；docs/ops/guides/documentation-model.md；docs/ops/agent-workflow.md。
- scripts/docs/check-content-review.mjs；report-governance-progress.mjs；document-model.mjs。
- docs/ops/tasks/DOCS-FULL-TEMPLATE-1.md；R22/R24/R26/R27/R65/R66 历史回执。
- 不得重新引入：手改命令输出、wrapper=语义、artifactOnly=完成、同主体自验=独立审、未实跑=PASS。

## 验收条件

- R39–R93 与后续收口的受影响路径逐篇列出，registry 与 review 同步降档，1838 cohort 与增量单列；未重读不重授。
- R65 旧记录被明确撤回；Git receipt mutation 全量筛查给出候选和限制；R65/R66 新命令结果完整落盘，包括失败。
- 分号损坏全树扫描/修复；原 quote 字节保持；增加真实回归拦截同类生成损坏。
- R24 虚报 hash/悬空文字、R22 接收链、R38 未使用编号与 R27 原字节/标记解码口径都有明确勘误。
- 静态门零诊断；语义 strict/require-complete 在降档后必须真实失败，不能改工具放行。这是未完成状态，不是通过豁免。
- 非作者复核尚未发生时，本卡及全量卡不 done。

## 当前模式推进记录

- Codex build allowed：用户明确授权纠错；单一 Owner、隔离 worktree、限定上述白名单。
- 设计：回退 artifactOnly 的完成捷径；新增证据根只作纠错控制，不承载自授内容信用。
- 本轮自验：只陈述工具实际执行结果；独立验收 pending。
- done 准入：blocked；待语义逐篇重审和非作者复核，不把补救阶段绿灯当作全量完成。

## Draft: 设计与风险

- 原始 receipt byte-stable，当前勘误入口优先于其历史 verdict。当前 ledger 加 superseded claim 定位和 rework，不删除历史。
- 降档由所属 review 批次精确映射；不是假称重新读过全部对象。完整清单见配套 correction-scope.json。
- 113 份生成文本的诊断范围须与修复记录一致；R26/R27 用户报告的 44 与实际路径数差异单列，不凑数。
- 最大风险是为让 check:docs 绿而恢复 content-reviewed；本卡禁止这种做法。

## Build: 实现与自测

进行中。命令和完整输出见 evidence 目录；未执行步骤不写通过。进度投影为继承的剩余信用，不是本卡新认证。

## Review: 审查与返工

- 自验与来源核查由 Codex 进行；本轮没有非作者独立验收。
- 仍待：受影响正文的真实语义重审、artifact 格式合同及真实 consumer 审核。

## 用户验收

用户审计已否决原全量收口；本卡不得覆盖该 counter。

## 交接日志

- 2026-10-18 Codex：保全 main@28fd9013e，核 Git 原始 diff，建立隔离纠错分支。下一步完成降档、损坏修复、证据扫描与真实重跑。

## 下一位 Agent 提示词

无新委派。后续复核须读取本卡和 correction-scope、原 receipt 与 raw 重跑输出；不得把 Codex 本轮自验改写为独立接受。

## 工作区异常与证据保全

2026-10-18：未提交的 managed worktree 在命令执行中消失；未发现可恢复的新 Git snapshot，主树未变。构造脚本从本 chat 工具记录恢复后在新的隔离目录重新执行；消失目录内的 raw capture 不作为留存证据。新的 command receipt 只代表新执行，不补造旧输出。本卡先提交本地检查点，后追加真实执行证据。
