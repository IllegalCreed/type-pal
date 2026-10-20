# TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 交付证据

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-20
Template: evidence-receipt-v1 / 1.0.0

本页是 TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 的交付证据：MenuBox（packages/reforge/src/menu/menu-box.ts，源冻结 `9aa3bed89`）未证明公开绘制合同的排重审计与 5 残余合同交付；逐合同账见任务卡。

## 证据身份

- 交付物：menu-box.residual.glm.test.ts（5 合同；typed MenuAssets/content fixture+renderSpans 调用记录/drawImage 位图身份过滤 oracle，measureSpans 保持真实）。
- 反控 counterproof.json（sha256 82d66154…）：lib-isolated-tree.mjs（隔离树+双 reporter+唯一判据+20 例合成反例 judgeSelfTest，判据移植自 save-precision r2 定稿库未放宽）；run-counterproof.mjs（绿基线五文件 25 行锁定→每针独立新树变异红→删树→新净树还原绿+menu-box.ts 还原 sha=冻结源→工作树零残留）5/5 VALID；mutation-logs（native raw/JSON，trimEof 定稿、JSON 过 biome format）。

## 来源与输入

- 门禁原始输出：directed.raw 5/5、menu-suite.raw 106/106、reforge-full.raw 359 文件 8963/8963、typecheck.raw EXIT=0；根 lint 与 check:docs 见任务卡质量门节。

## 断言与业务 oracle

- 五残余合同（资源/状态轴之外的公开布局/派发合同；逐合同账在任务卡）。

## 结果

- 5/5 合同+5/5 针全绿。

## 限制与复核

- 判例：vitest json fullName=describe 与 test 名空格连接（五文件执行集 file::fullName 排序三态逐字比对）；多次 box.render 断言间须 textCalls.mockClear（renderSpans 记录累加假红）；反控脚本被 biome format 后必须整体重跑。memory 补充：r1 已推 5f11dcb0a 待 Codex 验收。

## 历史范围

- TEST-GLM-REFORGE-MENU-BOX-RESIDUAL-1 r1 交付（5 合同+5 针）；固定源 revision 9e72e90307af…。

## 原始结论

- 五残余公开绘制合同闭合；三判例留档。

## 当时证据

- 门禁与判例在 quote 保全。

## 当前有效性

historical。r1 时点待验收。

## 继任文档

当前结论归任务卡与 Codex 接收记录。

## 原文保全

固定 source revision `9e72e90307af540a28efaed4c235d3aef8672e6a`，source SHA `10673f6718ce01ebbf32094a1596c78137861aa9136a9e62651859ee8d7b8448`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与固定原源逐字节相等（不 trim、不替换）。
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
