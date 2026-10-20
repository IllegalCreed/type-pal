# ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 迁出候选

Status: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-20
Template: test-run-report-v1 / 1.0.0

本页是 ARCH-F2-DS-OVERFLOW-1 Grok 迁出候选回执（2026-09-25，分支 codex/grok-arch-ds-overflow-r1，基点 origin/main 66bb3edc）：只把 DsOverflowText 从 controls.tsx 搬到 overflow-text.tsx——controls 继续 re-export、index 仍 export * from controls、新文件只 import DsFloatingLayer 不回引、classes 原样局部实现；CSS/DsTooltip/DsHelpTip 未改。未合 main 未标 done（Codex 后续已独立核源码/反控/隔离 Design Lab 实际画面并完成全仓门禁，见独立接收 grok-arch-ds-overflow-review.md）。

## Scope

- 拆前六个测试名保留并新增出口身份检查；同一输入服务端字符串搬前搬后一致；三个出口是同一函数；text-overflow-adoption.json 的 .ds-overflow-text producer 改指 overflow-text.tsx/DsOverflowText（类名与策略不变）。

## Execution and assertions

- **验证**：overflow-text.test.tsx 7/7、text-overflow-adoption.test.ts 9/9、controls+boundary 102/102、editor typecheck exit0；隔离反控：绿对照 7/7 exit0；只去掉 clientWidth + 1 容差后 exit1 恰失败容差用例（AssertionError: expected '0' to be null）；源文件 SHA 32af1ddf…577e4 前后相同；本机未另开浏览器、6010 未动，视觉由 Codex 接收时补
- **既有诊断**：controls.tsx 原有两处 void；boolean Biome warning 仍在未改签名

## Results

- 反控工具与 JSON 链接及本候选回执全文（quote 保全）。

## Evidence

- 证据路径：unresolved-tools/grok-arch-ds-overflow-mutant.mjs 与 editor/testing-records 下 JSON。

## Revision history

| revision | date | change | result | supersedes |
|---|---|---|---|---|
| 迁出候选 | 2026-09-25 | 组件搬移+7/9/102 验证+单针 | 后续由 Codex 接收集成 | 无 |
| 模板接入 | 2026-10-20 | S17 治理封套（quote 保全） | 不改变原结论 | 无 |

## 历史范围

legacy ops/testing-records 的 DsOverflowText 迁出候选回执；固定来源与 source SHA 见下方保全节。

## 原始结论

纯迁出：出口/DOM/adoption 登记三重等价+单针容差变异真实红；基点与卡面冻结关系已注明。

## 当时证据

六测试名、DOM 表、反控细节在 quote 保全。

## 当前有效性

historical。候选时点未合 main；后续集成见独立接收。

## 继任文档

当前结论归独立接收记录与现行 design-system。

## 原文保全

固定源 revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `63a731244f4376770de59c1e0ca11f44b6cb46260fb6573ba3b18368c1f87d34`；下方 quote 逆回读规则：剥引用后仅排除 end 标记前恰一个未引用分隔 LF，再与原源逐字节相等（不 trim、不替换）。
<!-- original-source-quote:start -->
> # ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 迁出候选
>
> 2026-09-25。Grok 在 `codex/grok-arch-ds-overflow-r1` 上只把 `DsOverflowText` 从 `controls.tsx` 搬到 `overflow-text.tsx`。提交基点是当时最新 `origin/main` `66bb3edc33d69c6960fdeefb64728b4e0865173a`（开工时的 `1bef4ee1` 之后还有 3 个纯文档提交，不碰本迁出文件）。卡面冻结 `620a29dd` 是它的祖先。没有合 main，没有标 done。
>
> `controls.tsx` 继续 `export { DsOverflowText }` 和 `export type { DsOverflowTextProps }`。`design-system/index.ts` 仍是 `export * from './controls.js'`，没有新的对外路径。新文件只 import `DsFloatingLayer`，不回引 `controls`。`classes` 在新文件里按原样局部实现。CSS、`DsTooltip`、`DsHelpTip` 和其它控件没有改。
>
> ## 拆前测试名
>
> `overflow-text.test.tsx`：
>
> - `uses a zero-width guard and one-pixel tolerance before adding a Tab stop`
> - `remeasures changed text without rebuilding its observer and disconnects on unmount`
> - `reveals the same selectable DOM value on hover or focus and Escape keeps focus`
> - `portals a clipped value tooltip into its nearest open dialog`
> - `remeasures after fonts change and removes the font listener on unmount`
> - `does not read layout while rendering on the server`
>
> `controls.test.tsx` 没有 `DsOverflowText` 用例。拆后这些标题都还在，并多了一条出口身份检查：`keeps the controls and design-system exports on the moved implementation`。
>
> ## DOM 与出口
>
> 同一输入的服务端字符串，搬前和搬后一致：
>
> | 输入 | HTML |
> |---|---|
> | `<DsOverflowText className="extra" translate="no">server-value</DsOverflowText>` | `<span translate="no" class="ds-overflow-text extra">server-value</span>` |
> | `<DsOverflowText as="code">id</DsOverflowText>` | `<code class="ds-overflow-text">id</code>` |
>
> 未截断时没有 `tabindex`、`aria-describedby` 和浮层。`./controls.js`、`./overflow-text.js`、`./index.js` 三个 `DsOverflowText` 是同一个函数。
>
> `text-overflow-adoption.json` 里 `.ds-overflow-text` 的 producer 从 `controls.tsx` / `DsPressable` 改到 `overflow-text.tsx` / `DsOverflowText`。类名和策略没变，只让登记指向现在拥有这个 class 的函数。
>
> ## 验证
>
> - `overflow-text.test.tsx` 7/7，exit 0。
> - `text-overflow-adoption.test.ts` 9/9，exit 0。
> - `controls.test.tsx` 与 `boundary.test.ts` 合计 102/102，exit 0。
> - `pnpm --filter @type-pal/editor typecheck` exit 0。
> - 隔离反控 [grok-arch-ds-overflow-mutant.mjs](../../unresolved-tools/arch-ds-overflow-mutant.mjs)，结果 [grok-arch-ds-overflow-mutant.json](../../editor/testing-records/grok-arch-ds-overflow-mutant.json)。绿对照 7/7 exit 0；只去掉 `clientWidth + 1` 容差后 exit 1，恰失败 `uses a zero-width guard and one-pixel tolerance before adding a Tab stop`，`AssertionError: expected '0' to be null`。源文件 SHA-256 `32af1ddfa349930766b71a140ae27afa0a0c2464c07d2260dbc22173baa057e4` 前后相同。
> - 本机没有另开浏览器。编辑器 6010 没有动。视觉由 Codex 接收时补。
>
> Biome 检查迁出文件时，`controls.tsx` 原有两处 `void | boolean` warning 仍在，这次没有改那些签名。
>
> ## Codex 后续接收（不改 Grok 原回执）
>
> Grok 提交时“未合 main、未作视觉”的文字为其交付时点事实。Codex 后续已独立核源码、反控与隔离 Design Lab 实际画面，合入并完成全仓门禁；结论与诊断脚本安全收口见[独立接收](grok-arch-ds-overflow-review.md)。
>
<!-- original-source-quote:end -->
