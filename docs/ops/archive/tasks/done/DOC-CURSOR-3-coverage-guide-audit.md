# DOC-CURSOR-3 — 覆盖率说明与现行命令定点核对

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `eca41a1fb049f7ae04584c3e4c635dea3937975c19a0c1ad37e7acab995db362`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # DOC-CURSOR-3 — 覆盖率说明与现行命令定点核对
>
> Status: done
> Owner: Codex（接收与正式修订）
> Contribution Owner: Cursor（只读核对回执）
> Reviewer: Codex
> Phase: ops
> Capability: 文档事实准备；不改变覆盖率统计或能力格
> Visual Verification Timing: N/A
> Branch: `codex/cursor-coverage-guide-r1`（独立 worktree）
>
> ## 目标与边界
>
> Cursor 核对当前覆盖率说明中哪些文字仍能代表现行命令、统计范围和最近一次本地实测，交给 Codex 一份可采用的窄修订建议。**本卡只授权 draft 只读取证**：不修改 `docs/testing/archive/legacy/quality/quality-gates/coverage.md`、README、脚本、CI、基线或产品，不运行覆盖率任务。Codex 接收后单独决定正式修订与合入；五份[现行指南修订卡](DOC-GUIDE-REVISION-1-current-entrypoints.md)已先行完成，本包仍不得扩大五文件白名单。
>
> 2026-09-25 开卡基点 `817be7df`。当前本地 `coverage/fast/summary.json` 自报生成时间 `2026-09-25T05:37:55.300Z`、8039 测试/641 生产文件；`docs/testing/archive/legacy/quality/quality-gates/coverage.md:14-17` 的“最新本地实测”仍写 A3 首段 8008/639。两者不同是**核查线索**，不预判哪个是已发布或受保护 CI 真值，也不把历史批次表当错误。
>
> ## 前提真值门
>
> N/A（只核文档与现有脚本/报告是否同口径，不改变算法、源文件、产品行为、存档、schema 或用户可见功能）。工程前提：覆盖率的 `fast/full/ratchet` 命令由根 `package.json:6-15` 和 `scripts/coverage/run.mjs:25-42` 定义；报告自报 `generatedAt/testCount/sourceFileCount`，基线另由 `scripts/coverage/baseline.fast.json` 保存。最强替代解释是“文档那节本来是带日期的历史快照”或“本地报告并非当前提交的有效结果”；核对标题语义、报告 scope/test digest 与对应提交后才能提出确定修订。能推翻建议的观察：报告范围/身份与现行源码不一致，或文字已经明确标为历史而非当前入口。此时记待核，不把数字覆盖到文档。
>
> ## 上下文锚点
>
> - 必读 `AGENTS.md`、`CLAUDE.md`、`docs/ops/guides/documentation.md`、[覆盖率说明](../../../../testing/archive/legacy/quality/quality-gates/coverage.md)、[前批 Cursor C10 审计](../../../../testing/archive/legacy/runtime/testing-records/cursor-docs-wave2.md)及[Codex 接收](../../../../testing/archive/legacy/runtime/testing-records/cursor-docs-wave2-review.md)。前批 CI 触发/脚本映射已有证据，不重复作为新发现。
> - `package.json:6-15`、`scripts/coverage/run.mjs:25-42`、`scripts/coverage/config.mjs` 的 `testSelection`/production scope、`scripts/coverage/protected-baseline.mjs`、`.github/workflows/coverage.yml` 是现行静态定义；不是运行成功的证据。
> - `coverage/fast/summary.json`、`coverage/fast/*/coverage-summary.json` 是本地报告；先核生成时间、scopeDigest/testExecutionDigest 与基线或现行定义的可比性。未核实不得称“远端 CI 已通过”或“最新官方百分比”。
> - 历史测试回执和日期段落按其发生时点保留，不把过去的 8008/639 改写成 8039/641；只审“最新/当前”的入口句及命令用法。完整 E2E、Q1/Q2、full 与 fast 不互相替代。
>
> ## 五组定点核对
>
> | 组 | 检查内容 | 排除项 |
> |---|---|---|
> | C01 命令 | `coverage:fast/full/ratchet`、`check`、`check:docs` 与 `run.mjs` flags/拒绝条件；给准确 cwd 和是否写报告/基线 | 不执行这些命令，不调阈值/超时 |
> | C02 快照 | `coverage.md` 当前标题/数字/文件数/时间与本地 fast summary、baseline 逐字段对照；标清本地/CI/历史 | 不直接把本地数宣布为远端 CI 或用户发布结果 |
> | C03 范围 | 七包 testSelection、生产 include/exclude、fast/full 差异及严格/ratchet语义；只核文档明确声称的内容 | 不重算覆盖率，不改 include/exclude |
> | C04 入口 | `docs/testing/README.md` 与根 README 指向覆盖率说明的文字是否会把历史段当当前结果 | 不扩成全仓链接审计，断链已有文档检查 |
> | C05 既有证据 | 对前批 Cursor C10 CI 核对与新发现去重；若看见冲突给直接源码/报告锚点 | 不把 C10 旧事实换名计新发现 |
>
> ## 交付与验收
>
> 唯一交付 `docs/testing/archive/legacy/quality/quality-gates/cursor-coverage-guide-audit.md`：按 C01–C05 列短表，逐条稳定 ID、原文 file:line、现行定义/报告字段、分类（`确定不符` / `日期历史仍正确` / `待证` / `已有证据`）、可直接使用的替换句或不修改理由。脚本存在不等于运行成功；没有全量源码身份校验时把报告数标“本地快照”，不要提高确定性。不存在的问题不凑数。
>
> 只允许读取文件、`rg`、`git show`、`node -e` 解析现成 JSON、`shasum`、`node scripts/docs/check.mjs`、`git diff --check`；不运行覆盖率、测试、ratchet、迁移、提取、部署或浏览器，不安装依赖。候选相对基点的 diff **只能是上述一份回执**。报告经 Codex 独立接收前不合 main、不标 done；接收后由 Codex 负责需要的正式修订、合并推送和废弃 worktree/分支清理。
>
> ## 正式集成与 done 准入（2026-09-25）
>
> - Cursor 只读回执 `b5e2ca4a` 经 Codex 独立 accept 后以 `0ba9ed14` 原样接入 main；并非将旧候选分支整体 merge。Codex 独立修订 `README.md` 与 `docs/testing/archive/legacy/quality/quality-gates/coverage.md` 的当前入口已先行于 `077516bb` 推送，历史 8008/639 表、脚本、CI、基线及产品均未改。
> - 本轮落地 `node scripts/docs/check.mjs` PASS、`git diff --check` PASS；未跑 coverage/full/E2E，也未把本地 8090/641 说成远端 CI。当前委派模式下由 Codex 核定本卡 done；开卡旧 8039 快照来源仍待证，但不会影响“旧最新标题已纠正”这一窄修订。原候选 `b5e2ca4a` 已留远端 `archive/cursor-coverage-guide-r1` 标签，干净 worktree 与本地/远端工作分支均已清理。以下 draft/不合 main 的记载为当轮历史门禁。无下一位 Agent 提示词，本卡已收口。
>
> ## 当前模式推进记录与交接
>
> - Codex：仅批准上述 draft 只读核对；依据 `coverage.md:14-17` 与本地 summary 元数据确定值得核对的差异，**未验收候选，也未授权修改覆盖率正文**。本包依当前“Codex 分派、Cursor 执行、Codex 验收”模式推进，不等待固定三贤人签字。
> - 交接：Cursor 从含本卡的 main 创建隔离 worktree，完成一文件回执后交 Codex；Codex 独立复核后决定是否修订当前指南。
>
> ### Codex 接收（2026-09-25，候选 `b5e2ca4a`）
>
> - **accept，仅材料接收；任务仍 draft，候选不合 main、不标 done。** [独立复核](../../../../testing/archive/legacy/quality/quality-gates/cursor-coverage-guide-review.md)确认 C01–C05 的 2 项确定不符、6 项日期历史、1 项待证、1 项既有证据及白名单/文档门。开卡旧 8039 快照仍待证，未跑覆盖率或远端 CI。
> - Codex 依据已核入库基线与本地快照，单独修正根 README 的“当前数字”入口及 `coverage.md` 的“最新”标题，保留 8008/639 的 A3-a 历史表，不改统计脚本、CI、基线、测试或产品。此正式文案改动不是把 Cursor 隔离回执合入 main；当前模式不需再请用户逐次批准无产品行为变化的文字纠错。
>
> ## 下一位 Agent 提示词
>
> ```text
> 在 /Users/zhangxu/illegal/type-pal 接手 DOC-CURSOR-3，卡 docs/ops/tasks/DOC-CURSOR-3-coverage-guide-audit.md，状态 draft。你是 Cursor 只读核对贡献者，不是审查签字席。先读 AGENTS.md、CLAUDE.md、本卡、docs/testing/archive/legacy/quality/quality-gates/coverage.md、前批 C10 回执与 Codex 接收；同步 main、核干净工作树后，从含本卡的 main 新建独立 worktree /Users/zhangxu/illegal/type-pal-cursor-coverage，分支 codex/cursor-coverage-guide-r1。
> 连续完成 C01–C05：核根 package scripts、coverage run/config/protected-baseline 定义与现成本地 summary/baseline 的可比性；区分“当前入口、带日期历史、本地快照、远端CI”，对前批 C10 去重。唯一写入 docs/testing/archive/legacy/quality/quality-gates/cursor-coverage-guide-audit.md，给稳定 ID、原文/一手锚点、分类和可直接采用的替换句；无法证实时写待证，不凑发现数。
> 不要修改 coverage.md/README/脚本/CI/基线/产品或其它任务卡；不跑覆盖率/ratchet/full/全仓测试/E2E/迁移/部署，不自行合 main 或标 done。只跑 docs 检查和 diff 检查。整包提交推送后交正文 SHA、分支 tip、命令退出码及待证清单；Codex 独立接收并负责后续正式修改与合并清理。
> ```
<!-- original-source-quote:end -->
