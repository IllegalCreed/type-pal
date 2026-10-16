# TEST-GLM-REFORGE-BATTLE-FLOW-1 — public battle flow contracts

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

- TEST-GLM-REFORGE-BATTLE-FLOW-1 — public battle flow contracts：原始顶部状态为 done；完整原始语义保留于下方 quote。

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

固定 source revision `b3c24c04ddb534b9e8195a074590bea8a233fc93`，source SHA `f6472ae55a85329a4690188f529eae54a8b6bee9f70107b55171c3b0cb956734`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-BATTLE-FLOW-1 — public battle flow contracts
>
> Status: done
> Owner: GLM
> Reviewer: Codex（独立验收）
> Phase: phase2
> Capability: reforge / battle public flow
> Branch: `codex/glm-reforge-battle-flow-r1`
> Visual Verification Timing: mixed
>
> ## 目标
>
> 对 Reforge 的公开战斗流程做一轮大范围质量补测，覆盖命令选择、目标锁定、行动提交、状态效果、胜负/逃跑、终局演出和写回恢复；避开已完成的 host lifecycle/runtime-session 卡，也不因私有表现层状态制造伪合同。
>
> ## 独占范围
>
> 只允许写 `packages/reforge/src/battle/` 本卡测试、合法 typed fixture 和证据。重点包括：
>
> - `battle-command-selection.ts`：菜单阶段、输入锁、目标选择、合法/非法 Confirm；
> - `battle-core.ts`：攻击/魔法/物品/状态效果/偷窃/逃跑的业务结果；
> - `battle-session.ts`：公开 `done`、opts 回调、cancel、enemy/player action 交接和清理；
> - `battle-result.ts`、`battle-settlement-presentation.ts`、`battle-finalization.ts`：胜负、奖励、逃跑和终局回执；
> - `battle-turn-readiness.ts`、`battle-action-presentation-scheduler.ts`：行动准备与演出完成后继续流程；
> - `battle-host.ts`、公开 launch/preparation caller：缺失输入、拒绝和恢复路径。
>
> 先对照所有 `battle/*.test.ts`、`*.residual.test.ts`、`*.glm-next-wave.test.ts`、已归档 Reforge host/runtime 卡和全量 fullName 做排重；`battle-session` private `state/visual` 不得反射，表现层只收有公开业务 oracle 的合同。
>
> ## 质量与安全约束
>
> - 每条合同必须有 source:line、公开 caller、合法 typed 输入、可观察业务 oracle、唯一 fullName 和最近旧测差异。
> - 不改产品、旧测、配置、baseline、真实 PAL 数据；禁止私有反射、业务核心 mock、强转、skip、ignore、扩大 timeout。
> - 断言业务状态、事件、队列、奖励、清理或公开结果；调用次数只能作为辅助断言。
> - 反控提供原始绿→指定业务红→恢复绿、唯一 AssertionError、执行集、raw/JSON/exit、四态 hash、clean-tree/mkdtemp 清理证明。
>
> ## 验证与交付
>
> 交付 identity/family ledger、existing-proof/blocked 账、反控证据、定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check。覆盖率只记录为整体 main 数据，不是本卡门槛。
>
> ## GLM 交付回执（r1，2026-10-05，待 Codex 独立验收）
>
> - **家族对账**：卡面 `battle-finalization.ts` 不存在——终局真源 = `battle-world-result.ts`
>   （settleBattleVictory / finishBattleWorldState，全仓零直接测试）；battle-command-selection /
>   turn-readiness / action-presentation-scheduler / settlement-presentation / result 五文件旧测饱和
>   不新增；battle-core/session 主干饱和仅补两条组合流；battle-host 补三条终局分配流。
>   全量对账与不设针登记见 [证据 dedup-ledger.md](../../../evidence/TEST-GLM-REFORGE-BATTLE-FLOW-1/dedup-ledger.md)。
> - **交付 12 合同 / 3 测试文件**（产品零 diff）：
>   - `battle-finalization.world-result.test.ts`(7)：BF-01 胜利奖励入账链（exp 门/首屏/半恢复）、
>     BF-02 零经验门、BF-03 升级+习得+结算屏 wiring（升级回满在 writeBackHp 之后的顺序 oracle）、
>     BF-04 victory finish 恢复组合（库存清项/毒 severe 清 incurable 留/不重写 HP）、
>     BF-05 defeat finish（HP 0/零结算/毒照清）、BF-06 偷得金钱逃跑保留、BF-07 收妖值并入。
>   - `battle-host.finalization.test.ts`(3)：BF-08 战败终局分配（无结算/无战后脚本/不还原音乐）、
>     BF-09 胜利曲经验门+boss 旗（含 exp=0 对照臂）、BF-10 逃跑终局分配。
>   - `battle-session.flow-residual.test.ts`(2)：BF-11 敌毒回合末致死→victory+计奖、
>     BF-12 逃跑失败→续战→胜利。
> - **反控**：12/12 针 VALID（world-result×7 / host×3 / core×2；每针红相位恰 1 指定业务
>   AssertionError，还原绿，四态 hash + clean-tree 无残留）；证据
>   [counterproof.json](../../../evidence/TEST-GLM-REFORGE-BATTLE-FLOW-1/counterproof.json)。
> - **门**：定向 12/12、相邻 56 文件 510/510、reforge 全量 343 文件 8760/8760、typecheck 0 错、
>   全仓 lint 0/0/0（3365 文件）。
> - **U-1 产品发现（待裁决，本卡未改产品）**：零活敌 target 相位输入死区
>   （battle-command-selection.ts:353 零活敌在 Escape 之前整体 no-op）——毒杀全灭后玩家确认攻击
>   即软锁；BF-11 以防御直提绕开。修复需 before→after 裁决并连带更新 G02 既有断言。
> - 覆盖率/例数未作完成条件；不标 done。
>
> ## 下一位 Agent 提示词
>
> ```text
> 你是 TEST-GLM-REFORGE-BATTLE-FLOW-1 的 Coding Owner（GLM）。先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md、本卡和已归档 Reforge host/runtime 卡；只在 codex/glm-reforge-battle-flow-r1 工作。
> 先对 battle-command-selection、battle-core、battle-session、battle-result、battle-settlement-presentation、battle-finalization、battle-turn-readiness、battle-action-presentation-scheduler、battle-host 的旧 fullName/caller/input/oracle 排重，再补公开战斗流程合同。
> 不得改产品、旧测、配置、baseline、真实数据、私有 state/visual、__rf*、强转、skip、ignore、扩大 timeout 或业务核心 mock。每条合同必须有业务 oracle；反控必须三态绿红绿、四态 hash、执行集和清理证明。
> 交付定向/相邻测试、typecheck、lint 0/0/0、docs、git diff --check 和完整 SHA。不得把覆盖率或测试数量当完成条件，不得标 done。
> ```
>
> ## Codex 独立验收与收口（2026-10-05）
>
> - 独立复跑：定向 12/12；反控 12/12 VALID，指定业务红、恢复绿、四态哈希与清理证明一致。
> - 独立质量门：Reforge typecheck 通过；全仓 lint 3379 files、0/0/0；docs check 0 issues；git diff --check 通过。
> - U-1 零活敌 target 相位死区保持为产品发现，未夹带修复；结论：本卡测试合同质量满足门禁，合入 main，任务归档为 done。
>
<!-- original-source-quote:end -->
