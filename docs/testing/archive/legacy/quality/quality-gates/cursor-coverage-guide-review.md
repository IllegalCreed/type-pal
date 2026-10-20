# DOC-CURSOR-3 — Codex 独立接收与正式文案裁决

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 DOC-CURSOR-3 的 Codex 独立接收（2026-09-25，Cursor 只读候选 `b5e2ca4a` 对 `a2415868` 仅审计文件）：**accept，审计材料无阻断 counter**；后续正式集成：用户明确要求审查通过后直接接入——`b5e2ca4a` 已以 `0ba9ed14` 原样 cherry-pick 至 main，Codex 两处正式入口修订 `077516bb`，任务卡核定 done。

## Scope

- 对象=cursor-coverage-guide-audit.md 审计材料接收+coverage.md/根 README 正式文案裁决；未重跑覆盖率、full 或 E2E。

## Execution and assertions

- **C01**：根 package.json:6,12-15 与 scripts/coverage/run.mjs:41-58,445-475,485-517；check 只跑覆盖率工具自测而非覆盖率；fast/full 写各自报告；ratchet 可更新 fast 基线；报告命令分类成立
- **C02**：入库 baseline.fast.json（08:55:15Z）与本地 coverage/fast/summary.json（08:59:34Z）；均 8,090 项/641 生产文件、同一四维计数；七包 scopeDigest/测试身份/执行摘要逐一相等；A3-a 的 8,008/639 是正确的日期历史，coverage.md:15 称其「最新」才是错误；开卡旧 8,039/641 快照不存在保留待证不倒填
- **C03/C05**：七包范围及 fast/full 选择、受保护基线与 C10 CI 脚本映射；与现行定义一致；不重复计新缺陷
- **C04**：根 README 原说「当前数字见 coverage.md」；Codex 决定：当前机器真值指向入库基线，coverage.md 展示明确日期的最近批次与历史表；正式改文只涉及两处当前入口；A3-a 及更早各日期数字、命令块、脚本/CI/基线不改

## Results

- 非阻断口径勘误：候选把 a2415868 括注「当前 origin/main」只适用取证时点（接收时 main 已前进）；候选工作树无 coverage/fast/summary.json，本席在主工作树读本地快照与入库基线复算——事实比较成立，不要求 Cursor 重交。
- 候选 check.mjs PASS、diff --check exit0；本席只读现有 JSON/源码不运行覆盖率。

## Evidence

- 证据路径：本回执正文（quote 保全）；旧 8,039 快照来源继续待证。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 独立接收 | 2026-09-25 | C01–C05 核验+文案裁决 | accept→已集成 done | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy quality/quality-gates 的 DOC-CURSOR-3 接收回执；固定来源与 source SHA 见下方保全节。

## 原始结论

accept：命令分类/8,090 基线相等/coverage.md「最新」错误裁决；候选已 cherry-pick 0ba9ed14+正式修订 077516bb。

## 当时证据

C01–C05 逐项与基线时间戳在 quote 保全。

## 当前有效性

historical。覆盖数字按当时快照；当前以官方基线为准。

## 继任文档

当前覆盖真值归入库 baseline.fast.json 与官方 ratchet。

## 原文保全

固定源 revision `b6b32d2ac3c0276357e43eee8658c50da8da695b`，source SHA `aec33e95bc91503adbf1fb35f7d385491dda39e16477f6e22ea124bfa17eabbf`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # DOC-CURSOR-3 — Codex 独立接收与正式文案裁决
>
> ## 后续正式集成（2026-09-25）
>
> 用户明确要求审查通过后直接接入：Cursor 回执 `b5e2ca4a` 已以 `0ba9ed14` 原样 cherry-pick 至 main；Codex 的两处正式入口修订见此前 `077516bb`。任务卡核定 done，旧段落中的“候选不合 main、不标 done”仅是接收时历史状态。未重跑覆盖率、full 或 E2E，旧 8039 快照来源继续待证。
>
> 2026-09-25。Cursor 只读候选 `b5e2ca4a0da0d70a948b24773f3f5b865fe6d00f`（对 `a2415868` 仅 `docs/testing/archive/legacy/quality/quality-gates/cursor-coverage-guide-audit.md`）：**accept，审计材料无阻断 counter**。候选报告不合 main、不标任务 done；下述正式文案由 Codex 独立修订，不把 Cursor 的未执行检查写成已执行。
>
> - C01：根 `package.json:6,12-15` 与 `scripts/coverage/run.mjs:41-58,445-475,485-517` 证实 `check` 只跑覆盖率工具自测而非覆盖率，fast/full 写各自报告，ratchet 可更新 fast 基线；报告所列命令分类成立。
> - C02：入库 `baseline.fast.json`（`08:55:15Z`）与本地 `coverage/fast/summary.json`（`08:59:34Z`）均为 8090 项 / 641 生产文件、同一四维计数；七包 `scopeDigest`、测试身份及执行摘要逐一相等。A3-a 的 8008/639 是正确的日期历史，`coverage.md:15` 仍称它“最新”才是错误。开卡旧 8039/641 快照已不存在，保留待证，不倒填。此处未重跑覆盖率或核远端 CI/full/E2E。
> - C03/C05：七包范围及 fast/full 选择、受保护基线与已有 C10 的 CI 脚本映射均与现行定义一致，不重复计新缺陷。
> - C04：根 README 原说“当前数字见 coverage.md”，会把读者引向上述旧快照；本席决定让当前机器真值指向入库基线，让 `coverage.md` 展示明确日期的最近批次与历史表。
> - 非阻断口径勘误：候选报告把 `a2415868` 括注为“当前 origin/main”只适用于其取证时点；本席接收时 main 已前进。候选工作树没有 `coverage/fast/summary.json`，本席是在主工作树读取本地快照并与入库基线复算。事实比较成立，不要求 Cursor 为两处时点措辞重交。
>
> 候选 `node scripts/docs/check.mjs` PASS、`git diff --check a2415868..b5e2ca4a` exit0；本席只读取现有 JSON/源码，不运行覆盖率。Codex 正式改文只涉及根 README 与 `docs/testing/archive/legacy/quality/quality-gates/coverage.md` 的当前入口，A3-a 及更早各日期数字、命令块、脚本/CI/基线不改。当前委派模式下 Cursor 是材料贡献者，正式修改与验收由 Codex 承担；本卡按用户本轮要求保持 draft，候选不合 main、不标 done。
>
<!-- original-source-quote:end -->
