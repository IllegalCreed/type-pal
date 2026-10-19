# DOC-CURSOR-5 — 包说明三文件确定错误窄修

Status: done
Phase: ops documentation
Capability: 修正式说明；不改变产品/脚本/资源行为
Contribution Owner: Cursor（三份 Markdown 白名单）
Review/Integration Owner: Codex
Branch: `codex/cursor-confirmed-doc-fixes-r1`（独立 worktree）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 Cursor 承接的四处包说明文字窄修历史卡（2026-09-25）：DOC-CURSOR-2 只读报告的 W2-C03-1/W2-C07-1/W2-C11-1 三处确定不符加 game README 遗留的旧 e2e 命令；同一事实不算四个新产品缺陷，只改描述不刷新历史数字。

## 目标

把三份 README 的四处确定文字错误对齐现行事实：game README 的架构治理政策句与已退役 e2e/6001 命令、migrate README:61 把 PAL 发布入口与 engine-chrome bake 拆准、data/raw README:43 补 README/unifont-cn.bdf 两个 Git 跟踪例外。

## 范围

- 范围内：packages/game/README.md、packages/migrate/README.md、data/raw/README.md 三份白名单；每处给原句→最终句与一手 file:line。
- 范围外：CLAUDE.md、已完成指南、DOC-CURSOR-2 回执、其它包说明、产品、测试、脚本、锁文件、资产、基线；NB1/NB2 回执精度观察与 W2-C05-1 待证项不变成确定修订；不运行 extract/migrate/bake/deploy/E2E/覆盖率。

## 前提与证据

Codex 独立读现行一手定义后准许（build allowed）：CLAUDE.md:20-23 已授权一阶段架构治理、package.json 已无 e2e 脚本、dev-servers.md:30-48 已删 6001、E2E=1 仅供 HTTP dev；content-publication.md 只列 PAL 导入/发布入口、bake 说明在 dev-servers.md:24-26；.gitignore:14-17 排除原版输入但 README 与 OFL 字体 bdf 是跟踪例外。最强替代解释（旧版历史说明）被三处均处现行操作段、无日期历史标记排除。
- 当前状态：done（历史终态）

## 验收

原卡记录：候选 76fdab78 相对 b95f218a 只改三份白名单 README；Codex 对照 CLAUDE.md:22、package.json、vite.config.ts:9,85、dev-servers.md:24-47、.gitignore:14-17 与已跟踪 BDF 许可证头确认一致；check.mjs PASS、git diff --check b95f218a..HEAD PASS；两提交选择性接入 main 为 69053296/f7d6475f。本页未复跑。本页治理验收：quote 字节保全与模板合同。

## 状态与交接

原卡无待返工、无下一位 Agent 提示词（卡内 Cursor 提示词为历史交接）。本页治理不重开。

## 历史范围

2026-09-25 准入、实施与 Codex 接收；Evidence freeze 4594f0a5；固定源 bb7b1d24e9e517e09730282b104ce51b4204cb0b。2026-10-17 R42 泛化封套，2026-10-18 S15 改写。

## 原始结论

`Status: done`：四处文字窄修经 Codex 独立核对现行事实后接入。原卡全文在下方 quote 保全。

## 当时证据

三文件锚点表、cursor-docs-wave2 报告、接入提交对。本页治理未新增执行。

## 当前有效性

historical。三份 README 现行内容以当前树为准。

## 继任文档

后续批次见[DOC-CURSOR-6](DOC-CURSOR-6-author-guide-fact-batch.md)；dev-servers.md 为现行维护说明入口。

## 原文保全

固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `40d8d5e4f22ac3a383de298225aa7f4d7d75158999e24901106ad7f0c2ea94cd`；下方 quote 逆回读规则：直接逐字节相等（逐行剥 "> " 或空行裸 ">"，零额外变换）。
<!-- original-source-quote:start -->
> # DOC-CURSOR-5 — 包说明三文件确定错误窄修
>
> Status: done
> Phase: ops documentation
> Capability: 修正式说明；不改变产品/脚本/资源行为
> Contribution Owner: Cursor（三份 Markdown 白名单）
> Review/Integration Owner: Codex
> Branch: `codex/cursor-confirmed-doc-fixes-r1`（独立 worktree）
> Evidence freeze: `4594f0a5`（开卡前 main；实施起点以含本卡的提交为准）
>
> ## 前提与准入
>
> DOC-CURSOR-2 的[已接收只读报告](../../../../testing/archive/legacy/runtime/testing-records/cursor-docs-wave2.md)有三处确定不符
> （W2-C03-1、W2-C07-1、W2-C11-1），另有前批已修其它指南、但在 game README
> 保留的旧 e2e 命令关联 H1。Codex 已独立读现行一手定义，准许 Cursor 在本卡白名单做
> **四处文字窄修**：同一事实不算四个新产品缺陷。修订只改描述，既有时点数字和历史记录不刷新。
>
> | 文件与锚点 | 当前事实/最小修订界限 |
> |---|---|
> | `packages/game/README.md:1-12` | `CLAUDE.md:20-23` 已授权一阶段行为不漂移的架构治理，旧“只修阻断、不再架构演进”不成立；`packages/game/package.json` 已无 e2e 脚本、`docs/ops/guides/dev-servers.md:30-48` 已删 6001，`E2E=1` 仅供 HTTP dev，不是真 SW/Playwright。改政策句和无效命令，不改产品。 |
> | `packages/migrate/README.md:61` | 当前 `content-publication.md` 只列 PAL 导入/发布入口，**没有** engine-chrome 烘焙细节；现行维护者 bake 说明在 `docs/ops/guides/dev-servers.md:24-26`。把错误 `asset-pipeline.md` 标签与“细节见此”承诺拆准，不新写一套发布流程。 |
> | `data/raw/README.md:43` | 根 `.gitignore:14-17` 排除原版输入，但 `README.md` 与 OFL 字体构建资产 `unifont-cn.bdf` 是明确跟踪例外；不能继续说整个目录都不进 Git。只改例外说明，不扩大版权/授权结论。 |
>
> 最强替代解释：这些文字是旧版历史说明；但三个目标都处于现行包/输入 README 的操作段，
> 无日期历史标记。若实施时源码已变，先报告新一手反证，不硬改文档迁就过期审计。
>
> ## 实施纪律与验收
>
> - 仅能修改上述三份 README；不碰 `CLAUDE.md`、已完成指南、DOC-CURSOR-2 回执、其它包说明、
>   产品、测试、脚本、锁文件、资产或基线。NB1/NB2 是回执文字精度观察，不在本卡范围；
>   W2-C05-1 仍待证，不把它变成确定修订。
> - 每份提交前给原句→最终句和一手 `file:line`，命令须可从仓库根复制。禁止运行 `extract`、
>   `migrate`、`bake`、deploy、E2E 或覆盖率；只运行 `node scripts/docs/check.mjs` 与 `git diff --check`。
> - 先改 game+migrate 两份，提交一次，再改 data/raw 并提交；整批一次交 Codex 独立审查。
>   Codex 通过即直接选择性接入、推送并清理隔离分支，不再请用户重复批准。
> - 当前模式不需 Kimi/GLM 固定签字。Codex 已核源与白名单：**build allowed**；
>   Cursor 不自行合 main、不标 done，产品功能/版权边界不借文档卡验收。
>
> ## Codex 独立接收与收口（2026-09-25）
>
> - **accept**：候选 `76fdab78` 相对 `b95f218a` 只改三份白名单 README。Codex 对照 `CLAUDE.md:22`、`packages/game/package.json`、`packages/game/vite.config.ts:9,85`、`docs/ops/guides/dev-servers.md:24-47`、`.gitignore:14-17`、已跟踪 BDF 的许可证头，确认四处文字修订与现行事实一致。
> - 候选独立复跑 `node scripts/docs/check.mjs` PASS、`git diff --check b95f218a..HEAD` PASS。两提交选择性接入 main 为 `69053296`、`f7d6475f`；不涉及产品、测试或资源字节。
> - 原候选的构建说明与 Cursor 提示词仅是历史交接；本卡无待返工。无下一位 Agent 提示词。
>
> ## 下一位 Cursor 提示词
>
> ```text
> 从包含 DOC-CURSOR-5 卡的 origin/main 创建独立 worktree
> /Users/zhangxu/illegal/type-pal-cursor-confirmed-docs，分支 codex/cursor-confirmed-doc-fixes-r1。
> 先读 AGENTS.md、CLAUDE.md、本卡和 docs/testing/archive/legacy/runtime/testing-records/cursor-docs-wave2-review.md 的最终 accept/NB1-NB2。
> 仅修 packages/game/README.md（架构治理政策与已退役 e2e/6001 命令）、
> packages/migrate/README.md:61（PAL 发布入口和 engine-chrome bake 不混称“资产烘焙细节”）、
> data/raw/README.md:43（保留 README/unifont-cn.bdf 两个 Git 例外）。
> 改前核现行 package.json、.gitignore、dev-servers 和目标链接；不改产品/旧回执/其它指南。
> 不执行 extract/migrate/bake/E2E/覆盖率；只跑 node scripts/docs/check.mjs 和 git diff --check。
> 交三份原句→新句、精确SHA、白名单diff及检查退出码，提交推送，不合main、不标done。
> Codex审核通过即直接接入推送；无须等 Kimi/GLM。
> ```
<!-- original-source-quote:end -->
