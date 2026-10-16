# TEST-GLM-GAME-MENU-SAVE-IO-1 证据索引（GLM r1）

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-GAME-MENU-SAVE-IO-1 证据索引（GLM r1） 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 dc31aa880e7f08320d83b1ec1267e7d2e94abd3da1a288b3cd87915c03c5b51d。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 7d609719e2347f6367712a54f2f81ccf3830b657；本轮 R65。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-GAME-MENU-SAVE-IO-1 证据索引（GLM r1）：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `7d609719e2347f6367712a54f2f81ccf3830b657`，source SHA `dc31aa880e7f08320d83b1ec1267e7d2e94abd3da1a288b3cd87915c03c5b51d`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-GAME-MENU-SAVE-IO-1 证据索引（GLM r1）
>
> - 交付物（3 个测试文件，8 合同）：
>   - `packages/game/src/shell/menu-input-lock.glm-msio.test.ts`（A1/A2 菜单 modal 输入锁与释放）
>   - `packages/game/src/core/menu/menu-save-chain.glm-msio.test.ts`（A3 同帧取消优先、C1 save-slot dispatcher 跨槽 max+1 真链）
>   - `packages/game/src/tools/save-import-quicksave.glm-msio.test.ts`（D1 坏导入 wNumScene 臂、E1 F5/F9 拦截、E2/E3 快存/快读反馈）
> - 排重账：[dedup-ledger.md](dedup-ledger.md)（8 新增 + REG 全量登记 + U-1/U-2 开放发现 + B-1..B-5 受阻账 + 3 判例）
> - 旧测清单：[inventory-vitest-list.txt](inventory-vitest-list.txt)（`vitest list` 348 条 fullName，排重输入）
> - 身份集：[identity.json](identity.json)（file×fullName×status，8/8 passed）
> - 反控：[mutation-results.json](mutation-results.json) 8/8 VALID；逐相位 raw
>   JSON+log 见 [mutation-logs/](mutation-logs/)（`SHARED-original.*` 共享原始绿 +
>   每针 `-red.*`/`-restored.*`；`*.log` 受 .gitignore `*.log` 约束，须 `git add -f`）
>
> ## 反控口径
>
> 每针 = 源码单点变异（find 恰命中 1 次才有效）→ 定向文件全量跑：红相位 exit≠0 且
> failed-total 恰 1（只杀目标合同）且首条失败为业务 AssertionError；恢复后源文件
> sha256 与原始一致（sourceRestoredByteIdentical=true），定向文件复跑全绿。
> identitySet 逐相位落盘，hash 记入 mutation-results.json。
>
> | 针 | 源行 | 变异（节选） | 目标合同 |
> |---|---|---|---|
> | MUT-01 | menu-stack.ts:26 | openMenu 删 `gs.mode='menu'` | A1 modal 锁（mode 留 explore → 走路放行） |
> | MUT-02 | menu-stack.ts:19 | resume else-臂 `'explore'`→`'event'` | A2 锁释放（event 无 cursor 回 explore 晚 1 tick，2 步变 1 步） |
> | MUT-03 | menu-driver.ts:461-464 | dispatchInGameMenu Menu 分支删 `return` | A3 同帧取消优先（Confirm fall-through 开状态屏 → 栈长 1） |
> | MUT-04 | menu-driver.ts:1012 | `maxSaved + 1`→`maxSaved` | C1 跨槽 counter（8 变 7） |
> | MUT-05 | save-io.ts:21 | `typeof gs.wNumScene !== 'number'`→`false` | D1 wNumScene 守卫臂（坏导入被放行） |
> | MUT-06 | quick-save.ts:27 | F5 分支删 `e.preventDefault()` | E1 拦浏览器刷新 |
> | MUT-07 | quick-save.ts:48 | 失败 toast 文案 `存档失败:`→`存档失败X:` | E2 失败反馈 |
> | MUT-08 | quick-save.ts:55 | 成功 toast 文案插 `X` | E3 结果反馈 |
>
> （完整 argv/find/replace/sha/首条业务 AssertionError 见 mutation-results.json）
>
> ## 质量门（见任务卡回执）
>
> 定向 8/8；相邻（core/menu + shell + core/save + tools 全目录）；game typecheck；全仓
> lint 0/0/0；docs check；`git diff --check` —— 数值见任务卡 r1 交付回执。
>
<!-- original-source-quote:end -->
