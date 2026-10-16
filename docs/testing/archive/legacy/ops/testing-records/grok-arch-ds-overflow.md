# ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 迁出候选

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision e0ddc80b28ab45394aa560855d51de65ecd568e1；本轮 R80。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 迁出候选：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `63a731244f4376770de59c1e0ca11f44b6cb46260fb6573ba3b18368c1f87d34`；下方 quote 可逆回原始 UTF-8 字节。
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
