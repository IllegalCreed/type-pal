# GAME-SAVE-IDB-COMMIT-1 — 第一阶段存档事务提交与失败传播

Status: review
Phase: phase1
Capability: save transaction correctness
Coding Owner: Codex
Reviewer: Codex
Visual Verification Timing: N/A（IO层；已实施，真实Save→IDB回归完成）

## 2026-10-15 最终模块窗口（当前）

两项获批修复已分别提交并推送，定向125、完整game3564与七包typecheck通过。
完整check/ratchet/protected数值通过但真实诊断未清零，本卡仍review，不标done、不关闭文件。
本轮为Codex作者实施/自验；冻结的独立三验与后续修复分开。
最终原件/诊断计数/官方基线及剩余边界见[完整窗口](../evidence/CODE-QUALITY-94/codex-final-window.md)。
以下前提表固定修复前候选，用于追溯失败反例，当前实施以本节与用户批准段为准。

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

## 2026-10-15 用户批准与最小方案

实现与定向自验证：commitWrite只在transaction complete后resolve，默认请求错误经abort传播，手动abort无原始错误时返回AbortError。
没有改DB_VERSION/store/schema/清档/readonly/public API。显式game测试依赖fake-indexeddb6.2.5，lock仅新增3行importer引用；
离线安装造成的无关transitive刷新已撤回，frozen/offline安装通过，未升级音频或其它依赖。
真实Save→IDB的put success后abort反例先恰一业务断言失败；修后三条测试证明complete时机、正常存读元数据/删除、
覆盖与删除abort均reject且旧槽cash100保留。每例独立IDBFactory，结束关闭真实连接、复位句柄/spy/global。
与相邻菜单/Save/快存共11files/125tests、game typecheck通过；原件见CODE94/codex-takeover-idb-red与approved-fixes-green/typecheck。
本次为Codex作者自验，完整模块质量门仍待最终窗口，不标done、不关闭账本文件。

用户本轮明确批准前两项，其中本项为①；Codex依据真实Save→IDB合法abort反例、W3C事务生命周期、
quick-save等待Save后反馈的caller核定premise verified / design agree，**build allowed**。
单一写入Owner=Codex，白名单indexed-db.ts、独立indexed-db事务测试、game/package.json与pnpm-lock.yaml
（仅显式测试依赖fake-indexeddb 6.2.5）；不改DB版本、store、schema、清档或公共接口。
先保留失败业务断言再实现；旧交接的draft/no-build仅为历史，不覆盖此次用户批准。

真实反证已在候选5477af1e4复跑，见CODE94/codex-r3-review.md。用户已授权Codex接手低风险返工；
此项改变当前第一阶段行为，按用户原治理约束，已在会话集中请求三项最小修复裁决，现已明确批准本项。
最小方案：仅写事务put/delete等待transaction complete再resolve；request success不当提交成功，error/abort向上reject。readonly读取、DB_VERSION/store/schema/清档/连接缓存策略不改。测试使用独立IDBFactory隔离，先写成功正控，再在request success后abort，证明保存拒绝且原槽未被覆盖；删除abort同样拒绝且旧槽保留。拟白名单indexed-db.ts、独立事务测试；若使用fake-indexeddb，作为game直接测试依赖明确接线并同步lock，不跨包偷借生产依赖。先保存失败反例再实现，不顺手改NaN输入或hot-reload策略。
Coding Owner=Codex；按上述build白名单实施，完整验收前不标done。

## 先前交接记录（历史）

2026-10-15 Codex：反证已核，最终设计、Owner、白名单 pending；**build 准入 blocked**。
没有实现，未来实现须独立验收；done blocked，相关账本保持 review，未合 main。

下一位 Agent 提示词：先重核本卡与 R2/C4、W3C 和真实 caller，提交最窄方案、失败 oracle、独占白名单
供 Codex 核定。当前 draft，**不得开始实现、不得标 done，不改版本/清档/schema/接口**。
