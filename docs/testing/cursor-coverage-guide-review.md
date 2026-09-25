# DOC-CURSOR-3 — Codex 独立接收与正式文案裁决

## 后续正式集成（2026-09-25）

用户明确要求审查通过后直接接入：Cursor 回执 `b5e2ca4a` 已以 `0ba9ed14` 原样 cherry-pick 至 main；Codex 的两处正式入口修订见此前 `077516bb`。任务卡核定 done，旧段落中的“候选不合 main、不标 done”仅是接收时历史状态。未重跑覆盖率、full 或 E2E，旧 8039 快照来源继续待证。

2026-09-25。Cursor 只读候选 `b5e2ca4a0da0d70a948b24773f3f5b865fe6d00f`（对 `a2415868` 仅 `docs/testing/cursor-coverage-guide-audit.md`）：**accept，审计材料无阻断 counter**。候选报告不合 main、不标任务 done；下述正式文案由 Codex 独立修订，不把 Cursor 的未执行检查写成已执行。

- C01：根 `package.json:6,12-15` 与 `scripts/coverage/run.mjs:41-58,445-475,485-517` 证实 `check` 只跑覆盖率工具自测而非覆盖率，fast/full 写各自报告，ratchet 可更新 fast 基线；报告所列命令分类成立。
- C02：入库 `baseline.fast.json`（`08:55:15Z`）与本地 `coverage/fast/summary.json`（`08:59:34Z`）均为 8090 项 / 641 生产文件、同一四维计数；七包 `scopeDigest`、测试身份及执行摘要逐一相等。A3-a 的 8008/639 是正确的日期历史，`coverage.md:15` 仍称它“最新”才是错误。开卡旧 8039/641 快照已不存在，保留待证，不倒填。此处未重跑覆盖率或核远端 CI/full/E2E。
- C03/C05：七包范围及 fast/full 选择、受保护基线与已有 C10 的 CI 脚本映射均与现行定义一致，不重复计新缺陷。
- C04：根 README 原说“当前数字见 coverage.md”，会把读者引向上述旧快照；本席决定让当前机器真值指向入库基线，让 `coverage.md` 展示明确日期的最近批次与历史表。
- 非阻断口径勘误：候选报告把 `a2415868` 括注为“当前 origin/main”只适用于其取证时点；本席接收时 main 已前进。候选工作树没有 `coverage/fast/summary.json`，本席是在主工作树读取本地快照并与入库基线复算。事实比较成立，不要求 Cursor 为两处时点措辞重交。

候选 `node scripts/docs/check.mjs` PASS、`git diff --check a2415868..b5e2ca4a` exit0；本席只读取现有 JSON/源码，不运行覆盖率。Codex 正式改文只涉及根 README 与 `docs/testing/coverage.md` 的当前入口，A3-a 及更早各日期数字、命令块、脚本/CI/基线不改。当前委派模式下 Cursor 是材料贡献者，正式修改与验收由 Codex 承担；本卡按用户本轮要求保持 draft，候选不合 main、不标 done。
