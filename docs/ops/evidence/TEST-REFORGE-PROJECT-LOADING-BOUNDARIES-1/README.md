# TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 证据目录

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 证据目录 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 1ef170e1cdb941a50a0a3124df874e5c643f74e594ce1115a14565a7680c0905。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 381cab90f8d6cc26171bd4bc8c2b025c15bc6f36；本轮 R70。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 证据目录：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `381cab90f8d6cc26171bd4bc8c2b025c15bc6f36`，source SHA `1ef170e1cdb941a50a0a3124df874e5c643f74e594ce1115a14565a7680c0905`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-REFORGE-PROJECT-LOADING-BOUNDARIES-1 证据目录
>
> > 这是 2026-10-08 的贡献候选及原始回执，未经修正的例数、合同和反控不代表当前验收。最终裁决和当前重放入口见[Codex独立验收](../TEST-CONTRACT-BATCH-20261008/codex-review.md)。旧 JSON/raw 不改写。
>
> 当前工程加载与跨表引用边界（C1–C10 有限清单）。产品冻结 `797a46a097640206a12b8f61dc014c8db277e457`，派发 `91aac75c5`，分支 `codex/glm-reforge-project-loading-r1`，GLM 新对话C 唯一测试写入者。共同协议见 [../TEST-CONTRACT-BATCH-20261008/README.md](../TEST-CONTRACT-BATCH-20261008/README.md)。
>
> ## 清单终态（逐轴裁决，锚点见 [contract-ledger.json](contract-ledger.json)）
>
> | 轴 | 裁决 | 一句话 |
> |---|---|---|
> | C1 入口层划分 | existing-proof | assemble 纯组装/load 真实 IO 分层由旧测双向证明；版本门/读取锁/indexed path/initialMagic 只登记 |
> | C2 场景 mapId | new-contract | 入口装配与惰性 scene 都在地图索引精确拒绝；`不在地图索引` 全仓测试零命中（本卡前） |
> | C3 入口场景条件 | new-contract | 缺 actor/缺毒分臂（毒臂用有 battler 的 actor 避免抢先 masking），合法链正对照 |
> | C4 items 条件 | new-contract | itemPrivateScript 合法宿主；loader 裸下标 where 与 content 局部 `items[i](id)` 的 caller 差异在案 |
> | C5 enemies 条件 | unreachable | typed 作者面无合法条件命令宿主（三联合类型逐个举证）；enemies root 校验只对 schema 逃逸输入生效（探针实证，未入库） |
> | C6 sharedScripts 条件 | new-contract | actor/poison 两臂 + 正对照；与 dialog 身份/initialMagic 旧合同分轴 |
> | C7 装备战斗精灵 | new-contract | 前置门全绿后组装后置接线拒收；同输入补登记即绿 |
> | C8 入口 IO 上下文 | new-contract（非 Error 臂）+ existing-proof（Error/缺文件） | entry id + indexed path + String detail 保留、整批拒绝；不另设文案矩阵 |
> | C9 地图公开入口 | new-contract | 未登记零 IO / 已登记真实加载 / 乱序稳定 id 归位 + 单 IO 整批拒绝（时序用外部 IO 闸门控制） |
> | C10 optional 表 | new-contract（保真）+ product-counter ×2 | 缺席→空默认、非空逐表保真；ambiences 裸 cast 与 enemy 顶层多余键 schema 洞只交 product-counter，不固化绿测 |
>
> ## 新测试与 fixture
>
> - `packages/reforge/src/project-loader.reference-boundaries.test.ts`（C2/C3/C4/C6/C7，5 测）
> - `packages/reforge/src/project-loader.io-boundaries.test.ts`（C8/C9/C10，4 测）
> - `packages/reforge/src/__tests__/project-loading-boundaries/fixture.ts`（隔离合成工程工厂；全部数据合成，不读真实 PAL/migrate）
>
> 红断言统一 phase+message 双锚（`expect(value, marker)`），变异下落成 marker 起头的 AssertionError。
>
> ## 反控
>
> [run-counterproof.mjs](run-counterproof.mjs) + [lib-isolated-tree.mjs](lib-isolated-tree.mjs)（判据移植自 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1，仅换冻结源/测试文件常量；judgment 逻辑未放宽）。四相位：判据自证（20 合成反例 + 3 真实 Vitest 探针）→ 原始绿（9 行执行集快照）→ 逐针红（10 针 × 独立 mkdtemp 树、冻结源逐树核验、恰一锚替换、恰一指定业务 AssertionError）→ 还原绿（全新原始树、执行集逐字一致）→ 末次重放（首针重建再现红）。
>
> - 回执：[counter-receipt.json](counter-receipt.json)，各态 raw/json 在 [counters/](counters/)。
> - 10/10 VALID：N-C2 map 校验、N-C3 场景条件接线、N-C4 items root、N-C6 sharedScripts root、N-C7 equip 后置接线、N-C8 非 Error detail、N-C9a/b/c（未登记门/真实加载/稳定 id 归位）、N-C10 poisons 返回保真。
> - 每针记录 frozen/mutant sha256、失败全文摘录与整树删除证明；贡献者工作树产品零改动（git diff 为空）。
>
> ## 门结果（[gates.json](gates.json)）
>
> - 定向（卡面 8 文件）：65/65，双 reporter 同进程，raw/json 落盘。
> - 本包全包：354 文件 8807/8807；typecheck 0 错。
> - 根 lint：3715 文件 0 error / 0 warning / 0 info；check:docs 全过。
> - 托管基点 CI：派发文档既列的第一阶段 Game 旧测超时，白名单外，未处理。
>
> ## 停止点
>
> 有限清单 C1–C10 全部裁定并落锚，反控与门完整。不追例数/覆盖率，官方 ratchet 与覆盖率结算归 Codex。产品、旧测、配置、共享文档、真实数据零改动；不合 main、不改 Status、不 done，待 Codex 独立验收。
>
<!-- original-source-quote:end -->
