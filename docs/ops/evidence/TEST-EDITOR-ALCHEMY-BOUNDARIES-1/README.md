# TEST-EDITOR-ALCHEMY-BOUNDARIES-1 证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-EDITOR-ALCHEMY-BOUNDARIES-1 证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 85fdc975aa9f06100fd3fd89d856ae9941f845ea308cd2056d365c9fd7339b6f。

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

- TEST-EDITOR-ALCHEMY-BOUNDARIES-1 证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `6855e6945bb015df4674dc64ad7410f56702ceee`，source SHA `85fdc975aa9f06100fd3fd89d856ae9941f845ea308cd2056d365c9fd7339b6f`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-EDITOR-ALCHEMY-BOUNDARIES-1 证据
>
> > 这是 2026-10-08 的贡献候选及原始回执，未经修正的例数、合同和反控不代表当前验收。最终裁决和当前重放入口见[Codex独立验收](../TEST-CONTRACT-BATCH-20261008/codex-review.md)。旧 JSON/raw 不改写。
>
> 炼蛊与灵葫机制编辑边界（B1–B10 有限清单）。派发 `91aac75c5`，产品冻结
> `797a46a09`，分支 `codex/glm-editor-alchemy-boundaries-r1`，工作树
> `/private/tmp/type-pal-editor-alchemy-boundaries.v3szHH/type-pal`。贡献者 GLM 新对话B；
> Codex 独立验收 pending。
>
> ## 清单终态
>
> | 轴 | 裁决 | 承载 |
> |---|---|---|
> | B1 排重与可表达边界 | existing-proof | contract-ledger.json（逐条旧断言锚点） |
> | B2 深链目标删除 | new-contract | ItemAlchemyTab.boundary-contracts.test.tsx::B2 |
> | B3 引用状态降级 | existing-proof | ItemAlchemyTab.test.tsx:117-174（current 缺 index→failed 等） |
> | B4 材料/产物缺引用 | new-contract | ::B4 |
> | B5 最新会话权威及错误传播 | new-contract | ::B5 |
> | B6 材料不足提示草稿 | new-contract | ::B6 |
> | B7 消耗者唯一材料限制 | new-contract | ::B7 |
> | B8 灵葫上限边界 | new-contract | ::B8 |
> | B9 引用/对象重渲染 | new-contract | ::B9 |
> | B10 承载跳转及拒绝收尾 | new-contract + unreachable（catch-all 分支） | ::B10；unreachable 证明见 contract-ledger.json |
>
> 未创建 `ItemAlchemyEditors.boundary-contracts.test.tsx`：B4 的可反证 oracle（Inspector
> Set 去重）与全部观察点都在 Tab 层；editors 层共享逻辑（itemOptions 警告项）的变异会同时
> 打红旧测 ItemAlchemyTab.test.tsx:731（跨文件恰一不可得），按『真实无缺口不建空文件』零新增。
>
> ## 新增承载
>
> - `packages/editor/src/ui/ItemAlchemyTab.boundary-contracts.test.tsx`（8 合同）。
> - `packages/editor/src/ui/__tests__/item-alchemy-boundaries/kit.ts`（专属夹具：合法项目
>   播种经真实 loader + 保存门自证、订阅/静态双形态 Surface、草稿输入驱动；共享底座只读复用
>   glm-ui-wave-kit 装载器与 glm-leaf-workflows Node 桥）。
>
> 产品、全部旧测、共享 fixture、配置、baseline、真实数据零改动（git diff --check 见
> gates.json）。
>
> ## 反控
>
> - 判据库 `lib-alchemy-tree.mjs`：只读移植 save-precision r2 定稿判据（四态同判据：进程层/
>   执行身份多重集/suite 健康/双 reporter unhandled 联判/红态恰一），仅替换包路径、冻结源与
>   执行集常量；未放宽任何判据。
> - `run-counterproof.mjs`：judgeSelfTest 合成反例自证 → 真实 Vitest 探针（纯业务红接受、
>   目标红+afterAll 同步抛错拒收、目标红+异步 uncaught 拒收）→ 原始绿（6 文件 31 行执行集）
>   → 8 针逐针红（每针独立 mkdtemp 树、冻结源逐文件核验、恰一文本替换、**全定向集**恰一指定
>   业务 AssertionError——跨文件无附带红）→ 还原绿（全新树执行集逐字一致 + 针目标文件字节回
>   工作树）→ 末次重放（首针重建再现同一红）。任何一步非空即整体失败退出。
> - 回执 `counterproof.json` + `counterproof-runs/`（每相位 native JSON + raw、命令/cwd/env/
>   exit/signal/pid、源/变异/恢复 hash、mkdtemp 清理证明）。
>
> ## 门结果
>
> 见 `gates.json`（定向/相邻、本包全包 test/typecheck、根 lint 完整 0/0/0、docs 门、
> git diff --check）。基点已知失败（第一阶段 Game 旧测 p12-overlays 超时，CI
> Coverage 37744699839）独立列，不在本卡处理范围。
>
> ## 停止点
>
> 有限清单逐轴裁决完毕即停：不追例数/针数/覆盖率；零 UI 视觉验收声明（代码/DOM 合同）。
> 不合 main、不改 Status、不 done，交 Codex 独立验收。
>
<!-- original-source-quote:end -->
