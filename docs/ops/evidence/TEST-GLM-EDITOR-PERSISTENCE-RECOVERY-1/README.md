# TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · r1 饱和档案

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · r1 饱和档案 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 6b401c227e710c704e8773ba4cf411775c66aae017f498b36f30d3fa47bb17b9。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 4ce17faa06c6ce05f4a4868de380e25d4854e575；本轮 R64。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · r1 饱和档案：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `4ce17faa06c6ce05f4a4868de380e25d4854e575`，source SHA `6b401c227e710c704e8773ba4cf411775c66aae017f498b36f30d3fa47bb17b9`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1 · r1 饱和档案
>
> Owner: GLM · Base: `origin/main` = `53bf97e01` · Branch: `codex/glm-editor-persistence-recovery-r1`
> （fresh worktree `/private/tmp/type-pal-persist-rec`）
>
> ## 结论（一句话）
>
> 卡面五族（admission/serialization、receipt/prefix/recovery/lock、partial write/foreign drift、
> history paired atomicity/redo branch、copy/export zero-write/zero-download）经 fullName×caller×input×oracle
> 逐条排重 + v8 分支覆盖率三口径核验 + 疑似缺口逐个解剖，**全部已有真实证明**；按本卡 Draft
> 「若一族已饱和，只写 existing-proof，不新增包装测试」与 AGENTS.md（2026-10-03）测试少而精纪律，
> 本轮交付饱和档案，**零新增测试、零产品改动**，不标 done，等待 Codex 独立验收。
>
> ## 文件清单
>
> | 文件 | 内容 |
> | --- | --- |
> | [dedup-ledger.md](dedup-ledger.md) | 五族×卡面轴 existing-proof 矩阵、四个代表场景证明、两个候选缺口解剖、0 计数臂分类 |
> | [directed-fresh.json](directed-fresh.json) | 定向+相邻 52 文件 823 测试 fresh 执行集（file×fullName×status，全绿） |
> | [coverage-family.json](coverage-family.json) | 仅家族测试（46 文件）对 19 个范围源文件的 v8 分支覆盖 summary |
> | [branch-inventory.json](branch-inventory.json) | 家族口径下全部 0 计数臂（行号/类型/计数），供 Codex 复核指认 |
> | [coverage-fullsuite.json](coverage-fullsuite.json) | 全仓测试套口径的同一清单（附录，全绿差异=跨文件已证臂） |
> | [run-evidence.mjs](run-evidence.mjs) | 复现脚本：重跑 directed fresh + family coverage 并重写上述三个 JSON |
>
> 复现：仓库根执行 `node docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/run-evidence.mjs`
> （全仓口径复跑见 ledger 附录说明；约 13 分钟）。
>
> ## 方法与证据链
>
> 1. **轴级排重**：只读探索代理对 42 个家族测试文件逐条清出 fullName/caller/input/oracle
>    （约 900+ 用例），再按卡面轴归并 —— 每轴都有多条带精确 oracle 的既有合同（见 ledger 第一节）。
> 2. **分支级核验**：19 个范围源文件（卡面族名对应的全部真实源码）在「仅家族测试」下分支覆盖
>    69–100%（vitest 官方 summary；最低 `edit-session.ts` 69.2%，其缺口主要靠 UI 侧 harness 触达，
>    全仓口径回升至 87%+）；对每个真实 0 计数臂回查全测试语料与既有裁定。
> 3. **候选解剖**：两个最有希望的疑似缺口（首存 0 字节 save-state 占位恢复、世界精灵资源 ZIP 导出）
>    均被解剖为「已有证明」（ledger 第三节，含证据推理），据此不新增换包装测试。
>
> ## 反控（三态）申报
>
> 本轮零新增断言，**无反控注入点**。饱和结论的证据即排重账 + 三口径覆盖率 + 候选解剖；
> 若 Codex 复核指认出任一真实未证合同，返工指令将按缺口补合同并补齐
> 绿→指定业务红→恢复绿、恰一业务 AssertionError、执行集/三态 hash/清理证明的完整反控。
>
> ## 未闭合风险 / 移交 Codex
>
> 1. `branch-inventory.json` 中未在 ledger 第三节逐条具名分类的 0 计数臂：抽查代表项均为
>    「跨文件已证 / v8 子表达式伪影 / 防御层（按 kimi 波与 cov85 卡既有裁定不为触达伪造非法状态）」，
>    但未逐臂写独立证明；Codex 可按行号指认，任何被判真实缺口的臂按上节返工流程补合同。
> 2. 产品观察（非缺陷登记，不夹带修复）：`export-zip.ts` 的 `validateProjectZipEntries` 对
>    `kind:'sprite'` 只做通用 bytes/sha256 校验（tileset/effect-sprite 额外查 gzip 魔数、battle-sprite
>    额外整体解码），而保存侧 `preflightProjectWriteSet` 会整体解码 sprite。导出=忠实快照、保存=写入门，
>    深度不对称存在合理解释；如需统一深度请 Codex/用户裁决，本卡不动产品。
> 3. `pnpm lint`/docs 门的全仓既有存量（`docs/ops/evidence/README.md`、`docs/ops/tasks/index.md` 的
>    after-SHA drift 为 main 既有，见 data-battle 卡同款登记）不在本卡修复范围。
>
> ## 清理证明
>
> - worktree `/private/tmp/type-pal-persist-rec` 仅新增 `docs/ops/evidence/TEST-GLM-EDITOR-PERSISTENCE-RECOVERY-1/`
>   与卡面回执改动；`git status` 干净度与 `git diff --check` 见卡面回执。
> - 产品文件、旧测试、共享配置、baseline、真实 `projects/pal`、`data/raw` 零改动
>   （`data/raw`、`data/extracted`、`data/baked` 为 worktree 本地软链，不入库）。
>
<!-- original-source-quote:end -->
