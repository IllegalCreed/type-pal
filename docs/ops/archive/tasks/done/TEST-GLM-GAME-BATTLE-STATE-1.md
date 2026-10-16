# TEST-GLM-GAME-BATTLE-STATE-1 — battle action, AI and settlement contracts

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

- TEST-GLM-GAME-BATTLE-STATE-1 — battle action, AI and settlement contracts：原始顶部状态为 done；完整原始语义保留于下方 quote。

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

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `60aa100a7f109832d59ec16dec2a6cf42cf49f3419c3ba1af63fc1a98d92b351`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-BATTLE-STATE-1 — battle action, AI and settlement contracts
>
> Status: done
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase1
> Capability: game / battle state machine
> Branch: `codex/glm-game-battle-state-r1`
> Visual Verification Timing: e2e-deferred
>
> ## 目标
>
> 对 Game 战斗状态机做一轮大范围但可审计的合同补测，覆盖行动选择、敌方 AI、状态结算、动画/行动队列、胜负/逃跑和奖励恢复的真实公开路径。每条合同必须是独立业务轴；不通过堆重复场景或换数字扩大数量。
>
> ## 独占范围
>
> 只允许写 `packages/game/src/core/battle/` 下本卡专属测试、合法 typed fixture 和证据。重点包括：
>
> - `battle-system.ts`：主菜单/目标选择/输入锁/阶段拒绝/行动提交；
> - `battle-state.ts`、`battle-runtime-context.ts`：阶段、角色/敌人存活、队伍目标和恢复状态；
> - `battle/actions/*.ts`：attack、magic、item、throw-item、defend、flee 的合法/拒绝/完成路径；
> - `enemy-ai.ts`、`turn-queue.ts`：行动排序、无合法目标、状态影响和延迟回合；
> - `battle-settlement.ts`、`battle-finalization.ts`、`battle-progression.ts`：奖励、经验、逃跑、失败和终局只结算一次；
> - `battle-anim-driver.ts` / `anim-timeline.ts`：公开行动完成回调与队列恢复，不断言纯渲染调用序列。
>
> 先读取并排重 `battle-system.test.ts`、`battle-system.glm-next-wave.test.ts`、`battle-opcodes*.test.ts`、`actions.test.ts`、`enemy-ai.test.ts`、`turn-queue.test.ts`、`battle-finalization.test.ts`、`battle-settlement*.test.ts` 以及已归档 Game 卡。已有同 caller/同状态 oracle 的合同只登记。
>
> ## 质量与安全约束
>
> - 每条合同记录 source:line、公开 caller、合法 typed 输入、业务 oracle、唯一 fullName、最近旧测差异。
> - 不改产品、旧测、共享配置、baseline、真实 PAL 数据；不调用私有函数/私有 world state，不使用业务核心 mock、强转、skip、ignore 或扩大 timeout。
> - 状态合同必须断言业务状态、事件、奖励、队列或恢复结果；单纯 `toHaveBeenCalled`、渲染存在、任意 count 不算。
> - 反控必须原始绿→指定业务红→恢复绿，唯一业务 AssertionError、执行集、raw/JSON/exit、三态 hash、清理证明齐全；CLI/fixture 用 mkdtemp 隔离。
>
> ## 验证与交付
>
> 交付 fresh identity、逐合同排重账、source hash、existing-proof/blocked 账、反控证据、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只作为整体 main 的观察数据，不作为本卡完成条件。
>
> ## 下一位 Agent 提示词
>
> ```text
> 你是 TEST-GLM-GAME-BATTLE-STATE-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Game 测试卡；只在 codex/glm-game-battle-state-r1 工作。
> 先逐合同排重 battle-system、battle-state、battle-runtime-context、battle/actions、enemy-ai、turn-queue、battle-settlement、battle-finalization、battle-progression、battle-anim-driver 的旧 fullName/caller/input/oracle，再实现未证明的行动、AI、状态、结算和恢复合同。
> 不得改产品、旧测、配置、baseline、真实数据或其它卡；禁止私有 state、业务核心 mock、强转、skip、ignore、扩大 timeout。每条合同写 source/caller/input/oracle/fullName 差异账；反控必须三态绿红绿和完整证据。
> 交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done，等待 Codex 独立验收。
> ```
>
> ---
>
> ## GLM r1 交付回执（2026-10-05，分支 codex/glm-game-battle-state-r1，base 5dcb4569b）
>
> **结论：排重后 10 条未证明 battle 状态机合同全绿（1 个新测试文件），反控 10/10 VALID
> （每针红相位 failed-total 恰 1 且命中目标合同），全门通过；不请求 done，等待 Codex 独立验收。**
> 逐合同排重账见 [evidence/TEST-GLM-GAME-BATTLE-STATE-1/dedup-ledger.md](../../../evidence/TEST-GLM-GAME-BATTLE-STATE-1/dedup-ledger.md)。
>
> ### 交付物（全部本卡白名单新增，零产品/旧测/配置/baseline/真实 PAL 数据改动）
>
> `packages/game/src/core/battle/battle-state-machine.glm-battle.test.ts`（10 it，公开 caller：
> tickBattle / startBattle 真流 + pendingActions、actionQueue 直填注入 + decideEnemyAction /
> buildBattleWonSettlement / tickBattleSettlement / battleWonLevelUp 公开导出直调）：
>
> | 组 | it | 主要合同轴（源锚 / oracle） |
> |---|---|---|
> | 行动选择与队列 wiring | 2 | haste 状态 ×3 进队列接线（battle-system.ts:748-751，actionQueue 全序）；DH3 未学法术降级 known 臂（:2634-2644，攻击系→普攻 MP 不扣 / 辅助系→防御） |
> | 敌方 AI | 1 | DL7 被沉默敌仍消费一次魔法掷骰（enemy-ai.ts:119-121，掷骰计数 silenced===control===1） |
> | scriptOnReady re-arm | 1 | 0x01 advance end → scriptOnReady 回写 end+1 show-once（battle-system.ts:2526；turnStart 侧旧测已证，ready 侧未证） |
> | E04 隐藏经验臂 | 2 | defend → rgDefenseExp +2（:2818）；玩家施法 → rgMagicExp +=R(2,3) + rgMagicPowerExp +1（:2855-2861，mp 30→25 证真施法） |
> | 胜利结算 | 2 | expGained=0 → 无 exp-cash 屏但 cash 无条件入账（battle-settlement.ts:119-127）；Phase E defeated 槽照跑 scriptOnBattleEnd 且返回值不回写（:168-189，advance-end 返回 3 不回写） |
> | 升级学法术与快照 | 2 | rgwMagic 32 槽全满不学（battle-progression.ts:299-303 槽满臂）；升级快照有效值含装备加成（:241，old=base20+装备7=27） |
>
> ### 反控三态（mutation-results.json 10/10 VALID；60 份规整日志 = 每针 3 相位 × stdout/stderr）
>
> 每针源码单点变异（find 恰命中 1 次，跨 battle-system/enemy-ai/battle-settlement/battle-progression
> 4 个目标文件）→ 全文件跑：红相位 exit=1 + 目标合同业务 AssertionError + **failed-total 恰 1
> （只杀目标）**；恢复 sha 与原始一致（4 文件字节级恢复 allFilesRestored=true），恢复绿 10/10；
> 每相位 identitySha 落盘，绿前/绿后零漂移。变异点/首条业务断言/identitySha 逐针落
> [evidence/TEST-GLM-GAME-BATTLE-STATE-1/](../../../evidence/TEST-GLM-GAME-BATTLE-STATE-1/)
> （mutation-logs 受 .gitignore `*.log` 约束，已 `git add -f`）。
>
> ### 排重登记要点（REG，不新增包装测试）
>
> - turn-queue / battle-state / battle-runtime-context 全臂旧测覆盖（turn-boundaries 卡同判），零新增。
> - 旧测已证不重复包装：flee ×0.5 / item ×3 / 濒死 ÷2 倍率、毒 tick、DL3/DL1、隐身门
>   （turn-boundaries 15 it）；DH3 silence/MP/数量臂（battle-system.test.ts:3956-4036）；
>   E04 攻击经验/敌方 0 掷骰（:262/:616）；结算屏超时/屏序/翻页/半血（settlement glm-next-wave）。
> - 登记未证但不写：iBlow 每行动 reset（headless 无独立业务 oracle，消费在 anim-timeline 视觉层）；
>   scriptOnReady 0x00 plain-end 重跑臂（回写值与原值相同，无独立判别点，机制由 turnStart 0x00
>   两轮重显 + 本卡 C4 回写接线共同钉住）；shouldCheckPlayerCasualties 敌方法术臂（同 gate 换形态）；
>   applyHiddenExpGrowth WORD 截断（需非自然大数输入）；slow wiring（PAL_CLASSIC 不实现）。
>
> ### 质量门
>
> - 定向 10/10；相邻 battle 全目录 36 文件 **916/916**；反控批与测试串行（判例）。
> - typecheck 0 error；`pnpm lint` 全仓 **0/0/0**（3364 files）；`pnpm check:docs` PASS
>   （board/evidence-README/tasks-index 三 pin 按 8494b465c 判例外科刷新 + history 头插）；
>   `git diff --check` 0。diff 仅新增：1 测试文件 + evidence 目录 + 1 行 evidence README 索引
>   + 本卡回执 + 三 pin 刷新。
>
> ## 下一位 Agent 提示词（Codex 独立验收）
>
> ```text
> 你是 Codex，负责独立验收 TEST-GLM-GAME-BATTLE-STATE-1 的 r1 交付（分支
> codex/glm-game-battle-state-r1，回执在本卡上方）。
> 先读本卡、AGENTS.md、docs/ops/agent-workflow.md 测试质量验收节、
> docs/ops/evidence/TEST-GLM-GAME-BATTLE-STATE-1/（README/dedup-ledger/identity/
> mutation-points/mutation-runner/mutation-results/mutation-logs），再核：
> 1) battle-state-machine.glm-battle.test.ts 10 合同的原子性、合法 typed 输入、真实公开 caller、
>    oracle 判别力与 fullName 排重（对照 dedup-ledger 的 REG 锚点是否属实，尤其 haste 接线/
>    未学降级/DL7 掷骰计数/ready 回写/两处 E04 累积/0 经验屏/Phase E 死敌槽/槽满/装备快照）；
> 2) 反控 10 针三态证据（每针 failed-total 恰 1 的精确命中、跨 4 文件的字节级恢复、
>    identitySha/清理证明）与「格式化后重出证据」纪律是否落实；
> 3) 门禁复算（定向 10/10、相邻 battle 36 文件 916/916、typecheck、lint 0-0-0、
>    check:docs 三 pin 刷新、git diff --check）。
> 输出 accept（r1 范围收口）或 counter（逐项返工）；不得由本回执直接推 done。
> ```
>
> **r1 工作提交 SHA**：`d8707b85fc2a6fdc215aa5d845dd3008c12d340e`（单一 commit 含 10 合同测试 +
> 证据目录 + 回执 + review JSON 三条目外科刷新；本行为 SHA 登记追加笔，base `5dcb4569b`）。
>
> ## Codex 独立验收与收口（2026-10-05）
>
> - 独立复跑：定向 10/10；反控 10/10 VALID，恢复哈希与产品文件 clean 证明一致。
> - 独立质量门：Game typecheck 通过；全仓 lint 3379 files、0/0/0；docs check 0 issues；git diff --check 通过。
> - 结论：合同原子性、真实 caller/oracle、排重账与反控判别力满足测试质量门；合入 main，任务归档为 done。
>
<!-- original-source-quote:end -->
