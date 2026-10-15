# GAME-SAVE-IDB-COMMIT-1 — 第一阶段存档事务提交与失败传播

Status: draft
Phase: phase1
Capability: save transaction correctness
Coding Owner: Unassigned
Reviewer: Codex
Visual Verification Timing: N/A（IO层；本轮无实现）

## 目标与范围

存档只有写事务 complete 后才能报告成功，request success 后的 abort 必须传播到 Save 调用者。
候选 `1f8bcd468`。白名单候选为 `packages/game/src/core/save/indexed-db.ts` 及独立事务回归；
api/quick-save/bootstrap 只作 caller 证据。未授权改 schema、DB版本、清档、兼容策略或公共接口。

## 前提真值门

| 维度 | 事实与直接证据 |
|---|---|
| Primary | [W3C transaction lifecycle](https://w3c.github.io/IndexedDB/#transaction-lifecycle)：请求成功后仍可 abort，提交成功才 complete。 |
| 第一阶段 | indexed-db.ts:49-66/84-86 只等请求；api.ts:61-62 委派驱动；quick-save.ts:47-48 await 后成功 toast；bootstrap.ts:1108-1118 接线。 |
| 第二阶段 | N/A；reforge 存档实现独立，不在本卡。 |
| 目标 | 先核最窄方案、合法失败 oracle、Owner/独占白名单，再由 Codex 核 build 准入。 |

反证见 [Codex R2](../evidence/CODE-QUALITY-94/codex-r2-review.md) C4 及同目录
`codex-r2-idb-counter.mts/.txt`：真实完整 GameState→Save→IndexedDbSave；正控槽1读回321，
槽2 put success 后合法 abort，API 已 resolve，但槽2为空。退出0表示反证成立，不是产品测试通过。
复用已安装 fake-indexeddb 6.2.5，无依赖/生产修改；不宣称自然磁盘满实测。

最强替代解释为模拟器与浏览器自然故障不同；本反证只要求规范允许的 request success→abort 时序。
若真实 API 在 complete 前不可能 resolve，或 abort 后已 reject，则推翻当前判断。
runtime 层直接执行，W3C 与 SDL 同步 IO 分开，无数据/提取/迁移根因证据；正控排除完全不能写。

用户可见 before→after 目标：可能误报保存成功→事务失败可靠返回失败。目标不主动偏离成功保存合同；
当前仅登记事实，无实现。若需改变产品失败策略、公共接口或清档策略，先交用户裁决。

## 上下文与验收

先读 AGENTS/CLAUDE/agent-workflow、engineering-notes 的真实函数反证纪律及 CODE101/R2。
要求成功/abort/失败传播与旧槽内容保留的真驱动反例；open错误缓存/close重置另核，不顺手扩范围。
行为修复先失败反例，再实现，再相邻回归；纯重构分提交；完整模块窗口执行全部质量门与零诊断检查。

## 当前推进与交接

2026-10-15 Codex：反证已核，最终设计、Owner、白名单 pending；**build 准入 blocked**。
没有实现，未来实现须独立验收；done blocked，相关账本保持 review，未合 main。

下一位 Agent 提示词：先重核本卡与 R2/C4、W3C 和真实 caller，提交最窄方案、失败 oracle、独占白名单
供 Codex 核定。当前 draft，**不得开始实现、不得标 done，不改版本/清档/schema/接口**。
