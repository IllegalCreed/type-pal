# ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 迁出候选

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-F2-DS-LABELS-1 Cursor 迁出候选回执（2026-09-26，分支 codex/cursor-arch-ds-labels-r1，基点 origin/main 56ebed43…2b9）：只把 DsTagTone/DsTag/DsReadonlyValue 从 controls.tsx 搬到 status-values.tsx——controls 继续 re-export、index 仍 export * from controls、新文件只 import HTMLAttributes 不回引、classes 原样局部实现。未合 main 未标 done（Codex 后续已核真实变异与隔离 UI、对 text-overflow adoption 两条旧 owner 登记做最小集成修复并完成全仓与官方门禁，见独立接收记录）。

## Scope

- 拆前测试名全保留（controls Tag 正控/recipes hero 用例/boundary EnemyAnimPreview 静态门）+新增三用例；六组输入服务端字符串搬前搬后一致；三出口同一函数。

## Execution and assertions

- **验证**：controls/recipes/boundary 3 文件 138 tests exit0（main 同三文件 135，+3 为本卡新增）；editor typecheck exit0；改动文件 Biome 无 error（既有 warning 保留未改）；隔离反控：Vite transform 只内存把 tone = 'accent' 换 'neutral'，同一正式用例控制树 exit0、变异树 exit1（AssertionError: expected 'ds-tag ds-tag--neutral' to be 'ds-tag ds-tag--accent'，controls.test.tsx:863）；磁盘 status-values.tsx SHA fef08ab2…2104 前后同；临时配置/JSON 已清理；本机未另开浏览器、6010 未动，视觉由 Codex 接收时补

## Results

- Cursor 自验不是独立证明，Codex 独立复核与集成。

## Evidence

- 证据路径：本候选回执正文（quote 保全）。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 迁出候选 | 2026-09-26 | 组件搬移+138 验证+单针 | 后续由 Codex 接收集成 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 DsTag/DsReadonlyValue 迁出候选回执；固定来源与 source SHA 见下方保全节。

## 原始结论

纯迁出：出口/DOM/静态门三重等价+tone 变异单针真实红；adoption 两条旧 owner 登记留集成修复。

## 当时证据

测试名清单、DOM 表、反控细节在 quote 保全。

## 当前有效性

historical。候选时点未合 main；后续集成见独立接收。

## 继任文档

当前结论归独立接收记录与现行 design-system。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `3963adf5ccc270db23a06924308a10fdf9f12ee3c0ad020c5573772b4a52e1f7`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 迁出候选
>
> 2026-09-26。Cursor 在 `codex/cursor-arch-ds-labels-r1` 上只把 `DsTagTone`、`DsTag`、`DsReadonlyValue` 从 `controls.tsx` 搬到 `status-values.tsx`。提交基点是当时最新 `origin/main` `56ebed43dd3b4898cc9be348122e43b33edec2b9`。卡面冻结 `95af9ed5` 是它的祖先。没有合 main，没有标 done。
>
> `controls.tsx` 继续 `export type { DsTagTone }` 和 `export { DsReadonlyValue, DsTag }`。`design-system/index.ts` 仍是 `export * from './controls.js'`，没有新的对外路径。新文件只 import `HTMLAttributes`，不回引 `controls`。`classes` 在新文件里按原样局部实现。CSS、其它控件和产品业务组件没有改。
>
> ## 拆前测试名
>
> `controls.test.tsx` 既有 Tag 正控：
>
> - `buttons and action links share geometry while preserving native semantics`
>
> `recipes.test.tsx` 既有使用者：
>
> - `keeps hero domain differences in slots while retaining one heading contract`
>
> `boundary.test.ts` 既有静态门：`EnemyAnimPreview.tsx` 仍要求 `/<DsTag\b/`。
>
> 拆后这些标题都还在。新增：
>
> - `keeps tag tones, readonly elements and the moved export identity`
> - `keeps status-value SSR markup for default tone and element contracts`
> - `keeps status values on the extracted module without a controls cycle`
>
> hero 用例补了 `SPAN` + `ds-tag ds-tag--neutral` 与 controls/index/status-values 同一函数。
>
> ## DOM 与出口
>
> 同一输入的服务端字符串，搬前和搬后一致：
>
> | 输入 | HTML |
> |---|---|
> | `<DsTag>使用</DsTag>` | `<span class="ds-tag ds-tag--accent">使用</span>` |
> | `<DsTag tone="neutral">引用 8</DsTag>` | `<span class="ds-tag ds-tag--neutral">引用 8</span>` |
> | `<DsTag tone="warning" monospace>ID</DsTag>` | `<span class="ds-tag ds-tag--warning ds-tag--monospace">ID</span>` |
> | `<DsTag tone="danger" data-kind="x">危</DsTag>` | `<span data-kind="x" class="ds-tag ds-tag--danger">危</span>` |
> | `<DsReadonlyValue>值</DsReadonlyValue>` | `<span class="ds-readonly-value">值</span>` |
> | `<DsReadonlyValue as="div" monospace className="extra" data-id="row">id</DsReadonlyValue>` | `<div data-id="row" class="ds-readonly-value ds-readonly-value--monospace extra">id</div>` |
>
> `./controls.js`、`./status-values.js`、`./index.js` 三个 `DsTag` / `DsReadonlyValue` 是同一个函数。
>
> ## 验证
>
> - `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 3 files / 138 tests，exit 0（main 同三文件 135；+3 为本卡新增）。
> - `pnpm --filter @type-pal/editor typecheck` exit 0。
> - 改动文件 Biome：`status-values.tsx` / `controls.test.tsx` / `recipes.test.tsx` 无 error。`controls.tsx` 原有两处 `void | boolean` warning 仍在，这次没有改那些签名。`boundary.test.ts` 原有 template-curly / unused `adoption` warning 仍在。
> - 隔离反控：Vite `transform` 只把内存中的 `tone = 'accent'` 换成 `tone = 'neutral'`，跑同一正式用例 `keeps tag tones, readonly elements and the moved export identity`。控制树 1/1 exit 0；变异树 exit 1，`AssertionError: expected 'ds-tag ds-tag--neutral' to be 'ds-tag ds-tag--accent'`（`controls.test.tsx:863`）。磁盘 `status-values.tsx` SHA-256 `fef08ab290a004613eed62cb23b0cbdf91e38485af8f72dcfef36724dac72104` 前后相同。临时配置/JSON 已清理，不落仓。
> - 本机没有另开浏览器。编辑器 6010 没有动。视觉由 Codex 接收时补。
>
> Cursor 自验不是独立证明。Codex 独立复核与集成。
>
> ## Codex 后续接收（不改 Cursor 原回执）
>
> 上述“未合 main、未标 done”为 Cursor 交付时点。Codex 已另核真实变异与隔离 UI，对 text-overflow adoption 两条旧 owner 登记做最小集成修复，完成全仓与官方覆盖率门禁；见[独立接收记录](cursor-arch-ds-labels-review.md)。
>
<!-- original-source-quote:end -->
