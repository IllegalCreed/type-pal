# 当前作者命令表单引用与草稿合同证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1（当前作者命令表单引用与草稿合同，E1–E12 有限轴）的交付证据：GLM 作者 r1 自验历史 + Codex 2026-10-07 独立 accept（本地集成门通过、done；产品 7 冻结源与卡面逐字节一致）。按卡保存逐合同账、身份/断言映射、真实门禁及严格反控。

## 证据身份

- 交付物：contract-ledger.tsv（E1–E12 全轴裁决）；新测试白名单内仅两文件+专属 fixture——CommandForm.author-control-contracts.test.tsx（E4/E6 三合同）、CommandForm.author-world-contracts.test.tsx（E9 两合同）、author-command-form-fixture.ts。
- 结论摘要：5 个新合同（E4 空店铺数值降级臂、E6 playSound/playMusic 叶子清空守卫、E9 portrait 选择/清空两臂），其余 E1-E3/E5/E7/E8/E10-E12 分流为 existing-proof 或 unreachable/不伪造。

## 来源与输入

- 真实 caller：CanonicalScriptBodyEditor 行双击→aggregate 编辑弹窗→author bridge→共享 CommandForm；真 React 控件、完整 typed fixture（允许合法空店铺表与 portrait 目录增补）；无核心 mock、无私有 draft 读写、无 act/console 过滤、无 timeout 扩大。

## 断言与业务 oracle

- 五针三态（绿→恰一业务 AssertionError→恢复绿→重放）ALL-VALID：E4-openShop-degraded-mode-pollution（空店铺 Num 臂提交重置 mode）、E6-playSound/playMusic-clear-guard-removed（移除 if (asset) 与 typeof asset 为 string 清空守卫）、E9-portrait-select-erases-battlesprite（选立绘抹除 battleSprite）、E9-portrait-clear-swallowed（if (portrait) 吞清空）。
- 判据复用 TEST-GAME-MEDIA-LIFECYCLE-1 已验收库（双 reporter 联判、进程层、执行身份多重集合、suite.message、pending/todo/unhandled 拒收），复用前重新自证（judgeSelfTest 19 例+真实 afterAll hook/异步 uncaught 探针 3 例）。

## 结果

- 验证记录：定向 17 文件 127/127（新两文件 0 stderr/0 act 警告/0 console.error；34 条 act 警告全属未改动旧文件 App.glm-next-wave.test.tsx 基点既有）；反控 ALL-VALID+整树清理 removed=true+产品字节前后一致等于冻结 SHA；全包 4906/4906；typecheck exit0；lint 3563 文件 0/0/0；check:docs PASS；diff clean。
- 事故：首次全包曾红 1 例（编辑器禁词门 boundary.test.ts:2228「工程」须作「项目」），改 fixture 注释用词后复跑全绿（白名单内）。
- Codex 独立审核（2026-10-07，codex-review-r1.md）：五合同及 E1–E12 分类接受，串行集成门全过（Editor 全包 4906/4906、lint 3607 文件 0/0/0、并集分支 50113/60209=83.23%），本卡 done；不宣称 GitHub CI 已通过。

## 限制与复核

- 不补当前作者不可达的旧 runtime/实体臂；不复制 NamedIdPicker/WorldVariablePicker/音频生命周期任务既有 oracle；产品/旧测试/共享 fixture/基准只读。重跑回执 hash a1638f82…7046、原候选回执 hash dd8ac291…3474；GitHub 新 CI 按具体运行另核。

## 历史范围

- TEST-EDITOR-AUTHOR-COMMAND-FORM-CONTRACTS-1 r1 交付+2026-10-07 Codex accept；固定源 revision 6855e6945bb0…。

## 原始结论

- 5 新合同（E4/E6×2/E9×2）+5 针三态 ALL-VALID；E1-E12 全轴裁决完毕本卡 done。

## 当时证据

- 验证记录表、五针表与 Codex 审核链接在 quote 保全。

## 当前有效性

historical。done 时点结论；GitHub CI 另核不冒称已过。

## 继任文档

当前结论归任务卡与 codex-review-r1.md。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `d773f29610f177a19c77ea40439d82a37337c1c90fd1b32d92b1241d72e2a74a`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
