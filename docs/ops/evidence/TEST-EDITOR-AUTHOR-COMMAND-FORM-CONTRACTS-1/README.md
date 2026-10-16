# 当前作者命令表单引用与草稿合同证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- 当前作者命令表单引用与草稿合同证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 d773f29610f177a19c77ea40439d82a37337c1c90fd1b32d92b1241d72e2a74a。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 6855e6945bb015df4674dc64ad7410f56702ceee；本轮 R63。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- 当前作者命令表单引用与草稿合同证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `d773f29610f177a19c77ea40439d82a37337c1c90fd1b32d92b1241d72e2a74a`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # 当前作者命令表单引用与草稿合同证据
>
> - 任务卡：[TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1](../../archive/tasks/done/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1.md)。
> - 当前：Codex独立accept、本地集成门通过，done；产品7冻结源与卡面逐字节一致。下方GLM记录保留为作者r1自验历史。
> - 按卡保存逐合同账、身份/断言映射、真实门禁及严格反控，诊断红与正常绿分列；不以数量或私有覆盖率验收。
>
> ## 交付物
>
> - 逐合同排重账（E1–E12 全轴裁决）：[contract-ledger.tsv](contract-ledger.tsv)
> - 新测试（白名单内仅两文件 + 专属 fixture）：
>   - `packages/editor/src/ui/CommandForm.author-control-contracts.test.tsx`（E4/E6，3 合同）
>   - `packages/editor/src/ui/CommandForm.author-world-contracts.test.tsx`（E9，2 合同）
>   - `packages/editor/src/ui/__tests__/author-command-contracts/author-command-form-fixture.ts`
>     （与 `command-form-current-fixture` 同一真实调用链：`CanonicalScriptBodyEditor` 行双击 →
>     aggregate 编辑弹窗 → author bridge → 共享 `CommandForm`；允许合法空店铺表与 portrait 目录增补）
> - 严格三态最小反控：[counterproof-receipt.json](counterproof-receipt.json)、
>   判据/驱动 [lib-isolated-tree.mjs](lib-isolated-tree.mjs)、[run-counterproof.mjs](run-counterproof.mjs)、
>   全部 run 的 raw/JSON 原件 [counterproof/](counterproof)
>
> ## 结论摘要
>
> - 有限轴全部裁决完毕：**5 个新合同**（E4 空店铺数值降级臂、E6 playSound/playMusic 叶子清空守卫、
>   E9 portrait 选择/清空两臂），其余 E2/E3/E5/E7/E8/E10/E11/E12 及 E1 分流为 existing-proof 或
>   unreachable/不伪造，逐条锚点见 ledger。允许零新增前提下只补真实缺口，不追例数。
> - 所有新合同走真实 caller（aggregate 弹窗完成/取消入口），真 React 控件、完整 typed fixture，
>   无核心 mock、无私有 draft 读写、无 act/console 过滤、无 timeout 扩大。
>
> ## 验证记录（工作树执行）
>
> | 门 | 命令 | 结果 |
> |---|---|---|
> | 定向（新两文件+关联旧 15 文件） | `pnpm exec vitest run <17 files>`（packages/editor） | 127/127、exit 0；新两文件 0 stderr/0 act 警告/0 console.error（34 条 act 警告全部属于未改动的旧文件 `App.glm-next-wave.test.tsx`，基点既有） |
> | 反控 | `node docs/ops/evidence/TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1/run-counterproof.mjs` | `ALL-VALID`：判据自测 19/19、真实 hook/uncaught 探针 3/3、5 针四态（绿→恰一业务 AssertionError→恢复绿→重放）全零问题、整树清理 `removed=true`、贡献者树产品字节前后一致且等于卡面冻结 SHA |
> | 全包 | `pnpm exec vitest run --passWithNoTests --maxWorkers=1`（packages/editor） | 4906/4906、exit 0 |
> | typecheck | `pnpm typecheck`（packages/editor） | exit 0 |
> | lint | 根 `pnpm lint` | PASS 3563 文件 0 error/0 warning/0 info |
> | docs | 根 `pnpm check:docs` | PASS（0 issues；testing docs、phase/lore、content review 全过） |
> | diff | `git diff --check` | clean（含 evidence 生成物 EOF） |
>
> 注：首次全包跑曾红 1 例——编辑器禁词门 `boundary.test.ts:2228`（编辑器源内「工程」须作「项目」），
> 改 fixture 注释用词后复跑全绿；该修复在白名单内（专属 fixture）。
>
> ## 反控针一览（receipt 内含完整 hash/原件）
>
> | 针 | 变异（隔离树内，恢复后字节一致） | 唯一红测试 | marker |
> |---|---|---|---|
> | E4-openShop-degraded-mode-pollution | 空店铺 Num 臂提交时重置 mode='buy' | E4 合法空店铺工程… | mode |
> | E6-playSound-clear-guard-removed | 移除 `if (asset)` 清空守卫 | E6 空音效目录… | to contain 'sound-bell' |
> | E6-playMusic-clear-guard-removed | 移除 `typeof asset === 'string'` 守卫 | E6 空音乐目录… | to contain 'music-theme' |
> | E9-portrait-select-erases-battlesprite | 选立绘时抹除 battleSprite | 选择真实 portrait… | starter-fighter |
> | E9-portrait-clear-swallowed | `if (portrait)` 吞掉清空 | 用 (无) 清空 portrait… | Number of calls: 0 |
>
> 判据复用 TEST-GAME-MEDIA-LIFECYCLE-1 已验收库（双 reporter 联判、进程层、执行身份多重集合、
> suite.message、计数/明细一致、pending/todo/unhandled 拒收），复用前在本树重新自证（judgeSelfTest
> 19 例 + 真实 afterAll hook/异步 uncaught 探针 3 例），未放宽任何判据；隔离树内额外生成的
> `vitest.isolated.config.ts` 仅放行 vite `server.fs.allow`（node_modules 软链回真实仓库路径的已知坑），
> 产品 `vite.config.ts` 零字节改动。
>
> ## 明确不做（卡面边界）
>
> - 不补当前作者不可达的旧 runtime/实体臂（E1 账列 unreachable，不造非法输入）。
> - 不复制 NamedIdPicker/WorldVariablePicker/音频生命周期任务的既有 oracle。
> - 产品、旧测试、共享 fixture/配置/基准只读；未合 main、未标 done、未改共享导航/看板。
>
> ## Codex独立审核（2026-10-07）
>
> 见[独立审核记录](codex-review-r1.md)。合同accept、全仓check/official ratchet/受保护fast全过；GitHub新CI按具体运行另核，不冒称已通过。
>
<!-- original-source-quote:end -->
