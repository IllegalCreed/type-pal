# TEST-GLM-GAME-TURN-BOUNDARIES-1 — battle turn and finalization contracts

Status: rework
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把当前 ops task card 接入 `task-card-v1`。原目标、范围、前提真值、owner、状态、证据、counter、返工和交接内容在 quote 中保全；本次只改变文档结构与可追溯边界，不改变产品、测试、E2E 或用户裁决。

## 目标

- 补齐战斗回合队列、行动倍率、毒结算、终局分类和恢复边界的真实业务合同，所有新增测试必须有合法输入、公开 caller、oracle、排重和三态反控证据。
- 当前状态：`Status: rework`；状态由本卡顶部和任务看板共同解释，本次迁移不推进状态。

## 范围

- 当前包含：原卡声明的实现/测试/E2E/视觉/文档范围及其一手锚点。
- 明确不包含：本次不扩大产品范围、不补造执行证据、不改历史任务状态、不把静态文档迁移当 runtime/E2E/视觉/coverage 验收。

## 前提与证据

- 行为/工程前提：补齐战斗回合队列、行动倍率、毒结算、终局分类和恢复边界的真实业务合同，所有新增测试必须有合法输入、公开 caller、oracle、排重和三态反控证据。
- 一手证据：docs/ops/tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md:1；docs/ops/tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md:11；docs/ops/tasks/TEST-GLM-GAME-TURN-BOUNDARIES-1.md:44；对应代码、内容、E2E 或测试 consumer 由 quote 与原卡链接保留。
- 最强替代解释与可证伪观察：若当前 consumer、合法输入或最新源码推翻上述边界，必须回到本卡重新核前提；不能用旧回执数字补齐缺口。
- 当前状态：rework。本页治理检查口径要求 contentVersion=22 / SAVE12；源卡中较早版本标记只属于其日期范围，未被本次迁移重新认证。

## 验收

- 功能/文档：按原卡验收条件、source:line、caller、合法输入和 business oracle 执行；本次迁移只验 source/after SHA、模板章节、链接和 quote 可逆性。
- 测试与证据：packages/game/src/core/battle/turn-queue.ts；packages/game/src/core/battle/battle-finalization.ts；packages/game/src/core/battle/battle-system.ts；docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/dedup-ledger.md；历史回执、数量、覆盖率和旧 accept 不能单独证明当前通过。
- 视觉或 E2E（如适用）：遵守原卡的 deferred/functional 约束；未在本批重新执行的 runtime、E2E、视觉、coverage 信用均为 0。

## 状态与交接

- 当前 Owner：按原卡 Owner/贡献者与当前看板；文档治理 Owner 为 Codex。
- 阻塞/决策：当前 rework：原始 mutation raw/JSON、合法物品输入、同回合前序可达性和完整执行身份仍缺；既有全绿、15 针计数和历史 accept 已撤回，不能标 done。
- 下一步：当前 rework：原始 mutation raw/JSON、合法物品输入、同回合前序可达性和完整执行身份仍缺；既有全绿、15 针计数和历史 accept 已撤回，不能标 done。 由当前 task card、fresh evidence 和独立验收闭合后再推进状态。

## 当前有效性

rework。当前 rework：原始 mutation raw/JSON、合法物品输入、同回合前序可达性和完整执行身份仍缺；既有全绿、15 针计数和历史 accept 已撤回，不能标 done。
- 文档治理只证明结构、来源和状态边界；不授产品实现、runtime、E2E、视觉或 coverage 信用。

## 原文保全

固定 source revision `fb83030c29ad9599c4135950d552d7c75ab3009f`，source SHA `ff3eb7a171435855a6ffc593500195332d54e0dd3b172692c55de29f23776a7c`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-TURN-BOUNDARIES-1 — battle turn and finalization contracts
>
> Status: rework
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase1
> Capability: game / battle turn boundaries
> Branch: `codex/glm-game-turn-boundaries-r1`
> Visual Verification Timing: e2e-deferred
>
> ## 当前裁决（2026-10-12）
>
> Codex 与 state_plan_review 直接核对原件后签 `counter`：下文 2026-10-11 的 accept/done 撤回，
> 本卡保留活动状态与候选分支。实现已在 main、定向测试全绿不能替代合法输入和有效反控证据。
>
> - 原件缺口：`mutation-logs/` 的 62 份 stdout/stderr 只有报告路径或空串；31 次原生 Vitest JSON
>   没有入库。`SHARED-original.json` 是汇总包装，`mutation-results.json` 只存目标失败摘要、
>   恢复计数和 identity hash，不能复核每相位完整 file×fullName×status 集与额外错误。
>   直接反例：`mutation-logs/MUT-01-red.stdout.log:1` 指向已不在交付物中的 `/tmp/turn-mutations/MUT-01-red.json`。
> - 合法输入缺口：`battle-turn-boundaries.glm-turn.test.ts:128` 的引导数据为 `items=[]`，
>   `:224` 却直接提交 `item actionId=1`。须改为真实可选库存及合法物品，不能以 typed 对象代替可达输入。
> - 可达性待核：同文件`:447–452` / `:468–473` 在单队员、队列索引0时注入
>   `fThisTurnCoop` / `prevPlayerAutoAtk`，但声称已有同回合前序动作；须给出真实前序 caller 证据或修正夹具。
> - 返工边界：仍限本卡测试与证据；不改产品或覆盖率规则。本次文档纠错不删除未知测试，
>   不将历史汇总中的15针升级为已验证，也不重复批准已撤回的done。
>
> 原始交付和先前验收记录保留为历史。后续须补齐合法 caller、原始绿→精确业务红→恢复绿的
> 原生报告/执行身份/源码三态hash/清理证据，再由 Codex 独立验收。无新的产品或E2E结论。
>
> ## 目标
>
> 补齐战斗回合队列与结算边界的真实业务合同，重点核验等待、拒绝、终局和恢复语义；不以覆盖率或新增例数作为本卡指标。
>
> ## 独占范围
>
> 只允许新增 `packages/game/src/core/battle/` 本卡测试、合法 typed fixture 和本卡证据：
>
> - `turn-queue.ts`：空队列、同速排序、死亡/逃跑成员移除、阻塞动作完成后继续取队列；
> - `battle-finalization.ts`：胜负/逃跑/全员阵亡结算、奖励与脚本恢复只发生一次；
> - `battle-system.ts` / `battle-state.ts` 的公开回合 caller：输入锁、阶段拒绝、目标选择结束后的唯一提交。
>
> 先逐项对照 `turn-queue.test.ts`、`battle-finalization.test.ts`、`battle-system.test.ts`、已归档 Game 合同卡和全量 fullName 排重；已有同 caller/同状态 oracle 的测试只登记，不包装重复。
>
> ## 硬约束与交付
>
> - 每条合同写 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName。
> - 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止私有函数/world state、业务核心 mock、强转、skip、ignore、扩大 timeout。
> - 反控必须原始绿→指定业务红→恢复绿，保留唯一业务 AssertionError、执行集、raw/JSON、exit、三态 hash、清理证明。
> - 交付 fresh identity/排重账、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check；覆盖率只记录到整体 main。
>
> ## 当前模式推进记录
>
> - Codex 范围/前提核验: verified
> - Coding Owner / 隔离分支: GLM / `codex/glm-game-turn-boundaries-r1`
> - build 准入: Codex build allowed
> - Codex 独立验收: counter（2026-10-12；先前 accept 撤回，见当前裁决）
> - done 准入: blocked（原始反控报告、合法输入及阶段可达性待补）
>
> ## 下一位 Agent 提示词
>
> ```text
> 你是 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 Coding Owner（GLM）。
> 先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡，及已归档 GLM Game 卡。
> 在 codex/glm-game-turn-boundaries-r1 隔离工作树中，先对 turn-queue.ts、battle-finalization.ts、battle-system.ts、battle-state.ts 的旧 fullName、caller、输入和 oracle 排重，再实现尚未证明的回合/结算合同。
> 不得改产品、旧测、配置、baseline、真实 PAL 数据或其它任务；不得用私有 state、业务核心 mock、强转、skip、ignore、扩大 timeout。
> 每条测试必须有 source/caller/input/oracle/fullName 账；反控必须原始绿→指定业务红→恢复绿并保存完整证据。
> 交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。
> 覆盖率和测试数量只做整体记录，不是本卡完成条件；不得标 done，等待 Codex 独立验收。
> ```
>
> ---
>
> ## GLM r1 交付回执（2026-10-04，分支 codex/glm-game-turn-boundaries-r1，base a2857c123）
>
> **结论：15 条未证明回合/结算边界合同全绿（1 个新测试文件），反控 15/15 VALID（每针红相位
> 仅目标合同失败），全门通过；不请求 done，等待 Codex 独立验收。** 逐合同排重账见
> [evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/dedup-ledger.md](../evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/dedup-ledger.md)。
>
> ### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）
>
> `packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts`（15 it，公开 caller：
> tickBattle / startBattle 真流 + 既有测试认可的 pendingActions 直填注入）：
>
> | 组 | it | 主要合同轴（源锚 / oracle） |
> |---|---|---|
> | finalizeBattle 归类（battle-finalization.ts:14-34） | 2 | lost → resume lostIp + HP/MP 回写 runtime（战败不伪复活）；forced 看门狗（非终态 phase）→ 归类 won 接回 wonIp |
> | 行动倍率/濒死（battle-system.ts:598-624,755-758） | 3 | flee ×0.5 floor 奇数 dex（L10）；item ×3；濒死 ÷2 —— 三臂均以 actionQueue 全序为 oracle，jitter 钉 1.0 |
> | 队列消费边界 | 2 | 死亡敌人行动项跳过（诈尸变异可判别）；flee 成功即中止剩余队列（逃跑音 45 恰一次，多人队） |
> | 逃跑/敌逃动画 | 2 | fleeAnim 逐步位移只挪活队员；enemyEscapeAnim 死敌槽不位移 |
> | 回合末毒结算（battle-system.ts:3010-3128） | 3 | 玩家毒 tick（0x1B 负 delta 扣血）+ wPoisonScript 返回值回写推进毒链；毒改 HP → roundEndDelayTicks=8（DM12 置 8 臂）；已分胜负回合跳过毒结算 |
> | 执行期吞并/粘滞（DL3/DL1） | 2 | fThisTurnCoop 后续玩家动作吞为 pass（rgAttackExp 0）；prevPlayerAutoAtk 粘性把手动防御强改普攻（rgDefenseExp 0/rgAttackExp 1） |
> | turnStart 边界 | 1 | 隐身期（iHidingTime>0）敌整轮跳过含 turnStart 脚本（嘲讽对话不入队） |
>
> ### 反控三态（mutation-results.json 15/15 VALID；63 份规整日志 = 共享原始绿 3 + 每针红/恢复 4）
>
> 每针源码单点变异（find 恰命中 1 次）→ 全文件跑：红相位 exit≠0 + 目标合同业务 AssertionError
> + **failed-total 恰 1（只杀目标）**；恢复 sha 与原始一致（cleanupRestored 全 true），恢复绿
> 15/15。变异点/首条业务断言/identitySha 逐针落
> [evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/](../evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/)（mutation-logs
> 受 .gitignore `*.log` 约束，已 `git add -f`）。
>
> **判例（空转绿陷阱）**：flee 队列中止合同初版夹具中，50 级先手敌的等级伤害项一击打死
> 拟作首个掷骰者的 p0（hp 200），那声 45 实出自幸存 p1 —— 原始/变异双绿恒真。以副作用计数为
> oracle 时必须先确认计数来源是预期主体；修法见 dedup-ledger 判例节。
>
> ### 排重登记要点（REG，不新增包装测试）
>
> - turn-queue.ts 9 例旧测全覆盖（空队/同 dex/dualMove 二抽两臂/回退）—— 零新增。
> - battle-state.ts createBattleState 全臂（>3 抛错/roleId/快照/D14 seed/DH1 空槽/fAutoBattle）—— 零新增。
> - actionDexMultiplier 的 support-magic ×3 / coop ×10 与已测臂同 caller 同 oracle 形态，登记不包装。
> - 输入锁：对话键不漏（battle-system.test.ts:3022）/延迟期不起菜单（cov85:215）/菜单延后（:884）
>   已证；battle-finalization.ts:20 队列清行无可观察 oracle（state 随即销毁），不写空转测试。
> - 胜负奖励只发生一次：settlement 不重入（cov85:254）/scriptOnBattleEnd 一次（settlement glm-next-wave:201）已证。
>
> ### 质量门
>
> - 定向 15/15；相邻 battle 全目录 35 文件 906/906；game 全量 300 文件 **3454/3454**
>   （worktree 补 data/raw MKF 软链后 sprite-blob 快照 5 例转绿，属环境缺失非代码失败）。
> - typecheck 0 error；`pnpm lint` 全仓 0/0/0（3272 files）；`pnpm check:docs` PASS；
>   `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录 + 1 行 evidence README 索引。
>
> ### 环境备注
>
> 隔离 worktree 缺 gitignored data/extracted、data/raw 原始 MKF 与 node_modules，均以软链/安装
> 修复；不改任何 tracked 文件。此为 worktree 环境处置，非仓库改动。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 Codex，负责独立验收 TEST-GLM-GAME-TURN-BOUNDARIES-1 的 r1 交付（分支
> codex/glm-game-turn-boundaries-r1，回执在本卡上方）。
> 先读本卡、AGENTS.md、CLAUDE.md 测试质量验收节、
> docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/（README/dedup-ledger/mutation-results/
> mutation-logs），再核：
> 1) battle-turn-boundaries.glm-turn.test.ts 15 合同的原子性、合法 typed 输入、真实公开 caller、
>    oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点是否属实，尤其 turn-queue/
>    battle-state 零新增的判断与 support-magic ×3 / coop ×10 的同形登记）；
> 2) 反控 15 针三态证据（每针 failed-total 恰 1 的精确命中、identitySet/hash/清理）与
>    MUT-15 空转绿返工判例（pendingSounds 计数主体核对）；
> 3) 门禁复算（定向/相邻/game 全量/typecheck/lint 0-0-0/docs/diff --check；worktree 需
>    data/raw MKF 软链才能全绿）。
> 输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
> ```
>
>
> ## Codex 独立验收与收口（2026-10-11，历史裁决，2026-10-12撤回）
>
> - 合入证明：实现与证据提交 `b75d6d792` 已在当前 `main`/`HEAD 9aa3bed89` 祖先链中；候选分支的工作树已退役。
> - 定向复核：`pnpm vitest run packages/game/src/core/battle/battle-turn-boundaries.glm-turn.test.ts` → 1 file / 15 tests passed。
> - 交付证据复核：15 个合同、15 针反控、排重账和既有全量质量门记录均在本卡上方及 `docs/ops/evidence/TEST-GLM-GAME-TURN-BOUNDARIES-1/`；不重复重采同一 SHA 的历史门。
> - 范围裁决：仅接收本卡白名单测试与证据；未修改产品、旧测试、配置、baseline 或 PAL 数据；不新增覆盖率配额。
> - 旧版本兼容审查：pass；本提交未引入旧 schema/upgrader/compat 产品路径。
> - 收口结论：`accept`，任务状态更新为 `done`，已从活动看板移除，并在任务索引的“已完成”区登记；任务卡路径暂保留，避免改动当前未提交的 phase-governance 注册/审阅文档。
>
> ## 下一位 Agent 提示词（2026-10-12返工）
>
> 先读 AGENTS.md、CLAUDE.md、本卡“当前裁决”和 `docs/ops/agent-workflow.md` 的测试质量验收。
> 仅修本卡测试与证据：补真实合法物品输入及C13/C14前序可达性，保留全部相位原生Vitest JSON、
> file×fullName×status、exit/signal/spawn和源码三态hash；每针必须恰一目标业务失败且恢复真绿。
> 不改产品、旧测试、配置、baseline或PAL数据；不恢复已撤回accept，不标done。交Codex独立复核。
>
<!-- original-source-quote:end -->
