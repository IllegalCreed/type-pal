# TEST-GLM-GAME-DIALOGUE-PAGINATION-1 — dialogue pagination contracts

Status: done
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops archive task card 接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始目标、范围、状态、owner、证据、counter、日期、链接和交接在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标

- 保留原卡目标、用户可见范围、实现/测试边界和关闭时点结论；当前是否需要重新启用由 successor task card 与 fresh evidence 决定。

## 范围

- 当前包含：原卡声明的实现、测试、证据、owner、状态和历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据、机器证据或历史状态。

## 前提与证据

- 行为/工程前提：原卡的 source:line、primary source、合法输入、caller、oracle 与 counter 由 quote 保留。
- 一手证据：固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`、原卡全文和原卡链接；本次不重跑原执行。
- 最强替代解释与可证伪观察：若需要重新启用，必须用当前代码/数据、合法输入、业务 oracle、反例和独立 review 重新核验；不能以历史 done 或数量补齐。
- 当前状态：done（历史快照）；本页治理检查口径要求 contentVersion=22 / SAVE12，源卡中的较早版本只属于其日期范围。

## 验收

- 功能/文档：原卡的历史验收、失败、blocked、rework、未执行边界和交接保持原样。
- 测试与证据：本次验收只包括 source/after SHA、模板章节、链接、history overlay 和 quote inverse。
- 视觉或 E2E（如适用）：本次未执行 runtime、E2E、视觉或 coverage，信用为 0。

## 状态与交接

- 当前 Owner：原任务 Owner/贡献者与历史 reviewer 保留于 quote；当前文档治理 owner 为 Codex。
- 阻塞/决策：历史卡不可单独授权当前工作；重新启用必须创建/更新当前 task card。
- 下一步：由对应 successor、当前 consumer 和 fresh receipt 重新核验；本次不推进状态。

## 历史范围

- 原始日期、版本、阶段：源文档固定于 `b3c24c04ddb534b9e8195a074590bea8a233fc93`；本轮为 R59。
- 归档原因：已关闭任务只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论

- TEST-GLM-GAME-DIALOGUE-PAGINATION-1 — dialogue pagination contracts：原始顶部状态为 done；完整原始语义保留于下方 quote。

## 当时证据

- 原始命令、产物、SHA、签字、counter、链接和未决项保留于 quote。

## 当前有效性

historical。do not promote historical task card to current build/runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：当前 task card、代码/consumer 和 fresh receipt 是事实权。

## 继任文档

- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `4e4c6d647b63dfc68036f2f72e56057831ad97247ab4a21cfb8b7a5c9899048c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-DIALOGUE-PAGINATION-1 — dialogue pagination contracts
>
> Status: done
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase1
> Capability: game / dialogue pagination
> Branch: `codex/glm-game-dialogue-pagination-r1`
> Visual Verification Timing: e2e-deferred
>
> ## 目标与范围
>
> 补齐 Game 对话分页、等待输入和边界文本的真实合同；不以覆盖率或例数作为本卡指标。
> 只允许新增 `packages/game/src/core/` 测试、合法 typed fixture 和证据，重点核验
> `event-dialogue-pagination.ts`、`event-system.ts` 的公开分页/推进 caller，以及长文本、空页、末页、取消/继续。
> 先对照 `event-dialogue-pagination.test.ts`、旧 event-system 测试、已归档 Game 卡和 fullName 排重。
>
> ## 硬约束与交付
>
> 每条合同记录 source:line、公开 caller、合法输入、业务 oracle、唯一 fullName；不得改产品/旧测/配置/baseline/真实数据，不得私有 state、强转、skip、ignore、扩大 timeout 或业务核心 mock。反控须原始绿→指定业务红→恢复绿，保存 raw/JSON/exit/执行集/三态 hash/清理证明。交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。
>
> ## 当前模式推进记录
>
> - Codex 范围/前提核验: verified（开卡即 `Status: build`）
> - Coding Owner / 隔离分支: GLM / `codex/glm-game-dialogue-pagination-r1`
> - build 准入: Codex build allowed（开卡派工）
> - Codex 独立验收: pending
> - done 准入: blocked（不请求 done）
>
> ## 下一位 Agent 提示词
>
> ```text
> 你是 TEST-GLM-GAME-DIALOGUE-PAGINATION-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Game 卡；只在 codex/glm-game-dialogue-pagination-r1 工作。先对 event-dialogue-pagination.ts、event-system.ts 的旧 fullName/caller/input/oracle 排重，再补未证明的分页、空页、末页、等待输入和恢复合同。只写本卡测试/fixture/证据，禁止产品、旧测、配置、baseline、真实数据、私有 state、强转、skip、ignore、扩大 timeout、业务核心 mock。反控必须三态绿红绿并保存完整证据。交付定向/相邻测试、typecheck、lint 0/0/0、docs、diff 和完整 SHA；不得把覆盖率或例数当完成条件，不得标 done。
> ```
>
> ---
>
> ## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-dialogue-pagination-r1，base f83ed41e9）
>
> **结论：6 条未证明对话分页/等待输入/边界合同全绿（1 个新测试文件），反控 6/6 VALID
> （每针红相位 failed-total 恰 1，只杀目标合同），全门通过；不请求 done，等待 Codex 独立验收。**
> 逐合同排重账见
> [evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/dedup-ledger.md](../../../evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/dedup-ledger.md)。
>
> ### 范围澄清
>
> 卡面 `event-dialogue-pagination.ts` 在仓库中不存在——它是本测试家族名（同 AssetInspectorTabs
> 判例）：分页逻辑实体在 `event-system.ts`（公开推进 caller = tickEventSystem 的 dialogBox
> 相位机）+ `present/dialog-box.ts`（状态机函数）。本卡测试全部经 `tickEventSystem` 公开
> caller 驱动，未直调私有实现。
>
> ### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实数据改动）
>
> `packages/game/src/core/event-dialogue-pagination.glm-contracts.test.ts`（6 it，公开 caller：
> tickEventSystem + 真 createCommandBus；合法 typed Command fixture，无 mock/强转/skip）：
>
> | # | 合同轴 | 源锚 | oracle 摘要 |
> |---|---|---|---|
> | C1 | 翻页等键吞任意键（等待输入/继续） | event-system.ts:1708-1715 | Cancel/Down 同 Confirm 翻页：第 5 行独占新页、ip 保留重入 |
> | C2 | 末页边界二分（末页） | event-system.ts:1879-1890 | 恰 4 行后遇 end 只等段末键（非翻页键）；残页 3 行；Confirm 关闭回 explore；历史全量 |
> | C3 | typing 中 Cancel/Up 不跳字（取消） | event-system.ts:1712-1714 | 相位/charsRevealed/userSkip/ip 全不动 |
> | C4 | typing 中 Menu ≡ Confirm 跳字（继续） | event-system.ts:1712-1714 | 瞬显 + fUserSkip + 同 tick 连锁 ip 到 end |
> | C5 | 空行占页位（空页） | event-system.ts:2017-2040 | 段中 `$00` 占一页行位、翻页边界提前到第 4 真行；空行不入 dialogHistory |
> | C6 | 跳字连锁停在翻页边界 + 新页复位（长文本） | event-system.ts:2053-2058 / dialog-box.ts:594-595 | 连锁停 page-key（ip 未消费、userSkip true）；翻页后 userSkip=false、新页从 0 重新逐字并真实推进 |
>
> ### 反控三态（mutation-results.json 6/6 VALID；26 份规整日志 = 共享原始绿 2 + 每针红/恢复各 2）
>
> 每针源码单点变异（find 恰命中 1 次；1714 跳字门与 1605 wait-key 门同串，以 `? ` 三元前缀锚
> 消歧）→ 定向文件全量跑：红相位 exit≠0 + 目标合同业务 AssertionError + **failed-total 恰 1**；
> 恢复 sha 与原始一致（cleanupRestored 全 true），恢复绿 6/6。变异批与全量测试串行。
> 变异点/首条业务断言/identitySha 逐针落
> [evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/](../../../evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/)
> （mutation-logs 受 .gitignore `*.log` 约束，已 `git add -f`）。
>
> ### 排重登记要点（REG，不新增包装测试）
>
> - Confirm 释放段末键本体（event-system.test.ts:366/Bug2:508）、`~` 全程不等键（:386）、
>   pendingStyle/0x05/立绘解耦（:577-655/:2894）、跨页续行/三样式连续翻页/边界接续副作用
>   （家族 event-dialogue-pagination.test.ts 三组）、narration 任意键（:3653）、0x84 wait-key
>   键集（:1566-1596）、DM20/21 首行 `$00`（:1281）、cov85:577 end 二分（手搭 box）——
>   均已证，本卡零重复包装。
> - 单元层 dialog-box.test.ts（confirmDialog 四态/shouldWaitPageKey/userSkip 复位）为直调
>   caller，tick 层旅程合同不与之互斥。
>
> ### 观察登记（不测、不判、不改产品）
>
> 连续 ≥4 个空行 + 第 5 真行的极端链：`shouldWaitPageKey` 不计 typing 相位的空行 current，
> 第 5 真行不翻页；sdlpal（text.c:1649-1658 `nCurrentDialogLine > 3`）会翻页。真实提取数据
> （死亡脚本 41078/41081）`$00` 均为段首单行，该形状不可达。按前提真值纪律不把分歧行为钉成
> 合同，留待产品侧裁决。详见 dedup-ledger「观察登记」节。
>
> ### 质量门
>
> - 定向 6/6；相邻 core 全目录 116 文件 2095/2095；game 全量 301 文件 **3460/3460**。
> - typecheck 0 error；`pnpm lint` 全仓 0/0/0（3324 files）；`pnpm check:docs` 全链 PASS；
>   `git diff --check` 0。
> - **docs 治理账本处置（向 Codex 披露）**：evidence 目录必须进 `docs/ops/evidence/README.md`
>   导航（check.mjs 强制），而该 README 受 content-review ledger SHA pin——两门互锁，唯一通路是
>   8494b465c 同款 `content-review-sha-refresh`。据此补 1 行索引 + 对
>   `20261004-semantic-current-batch.json` 做**外科式** pin 刷新（+30/-9，保留紧凑数组风格；
>   未用仓库 refresh 脚本——其输出会重排 13 文件 ±8k 行）。其中 board.md / tasks/index.md
>   两处 drift 系 base f83ed41e9 开卡提交改 board/index 后未 refresh 的**存量**（pinned
>   f85ad147…/682f1744… ≠ base 字节 7d083c21…/13acca6d…，铁证见回执历史），本卡一并机械重钉，
>   三条 history 均登记 `content-review-sha-refresh`；若 Codex 判定存量重钉不应随本卡走，
>   可拆出重做。
> - diff 范围：1 测试文件 + evidence 目录（含 -f 日志）+ evidence README 索引 1 行 +
>   治理账本 1 文件外科刷新 + 本卡回执/推进记录。
>
> ### 环境备注
>
> 隔离 worktree 缺 gitignored data/extracted、data/raw 原始 MKF 与 node_modules，以软链/安装
> 修复（软链仅限 gitignored 数据文件；误链 tracked README/bdf 已即时 git checkout 还原）。
> 此为 worktree 环境处置，非仓库改动。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 Codex，负责独立验收 TEST-GLM-GAME-DIALOGUE-PAGINATION-1 的 r1 交付（分支
> codex/glm-game-dialogue-pagination-r1，回执在本卡上方）。
> 先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
> docs/ops/evidence/TEST-GLM-GAME-DIALOGUE-PAGINATION-1/（README/dedup-ledger/
> mutation-results/mutation-logs/identity），再核：
> 1) event-dialogue-pagination.glm-contracts.test.ts 6 合同的原子性、合法 typed 输入、
>    真实公开 caller（tickEventSystem）、oracle 判别力与 fullName 排重（对照 dedup-ledger
>    的 REG 锚点与「范围澄清」——卡面 event-dialogue-pagination.ts 不存在、实体在
>    event-system.ts + present/dialog-box.ts 的判断是否属实）；
> 2) 反控 6 针三态证据（每针 failed-total 恰 1、find 唯一命中含 1714/1605 同串消歧、
>    identitySha/清理证明）与「观察登记」空行计数分歧的处置是否符合前提真值纪律；
> 3) 门禁复算（定向/相邻 core/game 全量/typecheck/lint 0-0-0/docs/diff --check）与 docs 治理账本
>    外科 refresh 处置（导航↔SHA pin 互锁、board/index 存量重钉披露是否随本卡走）。
> 输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
> ```
>
> ---
>
> ## Codex quality closure (2026-10-05)
>
> 候选 `3feddccf7587a24cfc099406543d528127208bcf` 已独立验收：6/6 合同、typecheck、lint 0/0/0、docs、phase/lore、content review、diff 全通过。本卡已集成 main，原候选分支进入退休清理。
>
<!-- original-source-quote:end -->
