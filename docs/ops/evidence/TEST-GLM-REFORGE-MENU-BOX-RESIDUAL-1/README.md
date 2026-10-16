# TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: evidence-receipt-v1 / 1.0.0

本页把 ops evidence/review 接入 evidence-receipt-v1，并追加 archive-record 历史边界。原任务状态、合同、测试数字、失败、counter、consumer、机器证据和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 证据身份

- TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据 的原始 receipt/review 身份、候选 SHA 和状态保留于 quote；本次迁移 source SHA 为 10673f6718ce01ebbf32094a1596c78137861aa9136a9e62651859ee8d7b8448。

## 来源与输入

- caller/source refs、合法输入、版本和执行环境以原始证据与对应 task card 为准；本次只做静态迁移，不重跑。

## 断言与业务 oracle

- 原始业务 oracle、逐合同/逐针排重和失败边界保持原时点语义；历史“通过”不升级为当前 verified。

## 结果

- 原始结果、退出码、产物、warnings、counter 和未决项由 quote 保留；本页不补造执行结论。

## 限制与复核

- 本批未执行 runtime、E2E、视觉或 coverage。若重新启用，需当前 task card、合法输入、真实 caller/oracle、fresh receipt 和独立验收。

## 历史范围

- 源 revision 9e72e90307af540a28efaed4c235d3aef8672e6a；本轮 R68。历史 ops evidence 只作时点回执，不授权当前操作。

## 原始结论

- TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据：原始正文完整保留于下方 quote。

## 当时证据

- 原始命令、测试、机器字段、SHA、counter 和链接保留于 quote。

## 当前有效性

historical。do not promote historical evidence receipt to current runtime/E2E/visual/coverage acceptance
- 当前事实由对应 task card、consumer、catalog 和 fresh receipt 决定。

## 继任文档

- 当前 canonical 文档：对应 task card、current consumer、paired machine evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、业务 oracle、独立 review 和静态零诊断。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `10673f6718ce01ebbf32094a1596c78137861aa9136a9e62651859ee8d7b8448`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据
>
> MenuBox（`packages/reforge/src/menu/menu-box.ts`，源冻结 `9aa3bed892728f17c70d2f86d1fe07db10a718b8`）
> 未证明公开绘制合同的排重审计与 5 残余合同交付。逐合同账（source:line / 公开 caller /
> 合法输入 / 旧 fullName / oracle / 裁决）见[任务卡](../../archive/tasks/done/TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1.md)。
>
> ## 交付物
>
> - `packages/reforge/src/menu/menu-box.residual.glm.test.ts`（5 合同；typed MenuAssets/content
>   fixture + renderSpans 调用记录 / drawImage 位图身份过滤 oracle，measureSpans 保持真实）。
>
> ## 反控（counterproof.json，sha256 `82d66154798e5833…`）
>
> - `lib-isolated-tree.mjs`：隔离树（/tmp、node_modules 软链、冻结源逐文件 sha 校验）+ 双
>   reporter（native JSON + default 同进程联判）+ 唯一判据（进程层/执行集逐字锁定/suite
>   message 拒收/unhandled 拒收/红态跨文件恰一指定业务 AssertionError）+ 20 例合成反例
>   judgeSelfTest。判据移植自 TEST-REFORGE-CURRENT-SAVE-TEST-PRECISION-1 r2 定稿库，未放宽。
> - `run-counterproof.mjs`：绿基线（五文件执行集 25 行锁定）→ 每针独立新树变异红 → 删树
>   （清理证明落回执）→ 新净树还原绿（执行集与基线逐字一致 + 树内 menu-box.ts 还原 sha =
>   冻结源）→ 工作树产品零残留。5/5 VALID。
> - `mutation-logs/`：全部 native raw/JSON（trimEof 定稿、sha 按落盘字节、JSON 过 biome
>   format）。
>
> ## 门禁原始输出
>
> - `directed.raw`：工作树定向 5/5（EXIT=0）。
> - `menu-suite.raw`：src/menu/ 全目录 106/106（EXIT=0）。
> - `reforge-full.raw`：reforge 全包 359 文件 8963/8963（EXIT=0）。
> - `typecheck.raw`：reforge tsc --noEmit EXIT=0。
> - 根 `pnpm lint`（零诊断硬门）与 `pnpm check:docs` 见任务卡质量门节。
>
> ## 判例
>
> - vitest json reporter `fullName` = describe 与 test 名空格连接；五文件执行集以
>   `file :: fullName` 排序后三态逐字比对。
> - 多次 `box.render` 断言间必须 `textCalls.mockClear()`——renderSpans 记录累加，`find`
>   会命中上一相位的陈旧记录造成假红。
> - 反控脚本被 biome format 后必须整体重跑（本目录证据为 format 后脚本的完整重放）。
>
<!-- original-source-quote:end -->
