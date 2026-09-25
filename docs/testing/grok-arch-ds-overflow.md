# ARCH-F2-DS-OVERFLOW-1 — DsOverflowText 迁出候选

2026-09-25。Grok 在 `codex/grok-arch-ds-overflow-r1` 上只把 `DsOverflowText` 从 `controls.tsx` 搬到 `overflow-text.tsx`。提交基点是当时最新 `origin/main` `66bb3edc33d69c6960fdeefb64728b4e0865173a`（开工时的 `1bef4ee1` 之后还有 3 个纯文档提交，不碰本迁出文件）。卡面冻结 `620a29dd` 是它的祖先。没有合 main，没有标 done。

`controls.tsx` 继续 `export { DsOverflowText }` 和 `export type { DsOverflowTextProps }`。`design-system/index.ts` 仍是 `export * from './controls.js'`，没有新的对外路径。新文件只 import `DsFloatingLayer`，不回引 `controls`。`classes` 在新文件里按原样局部实现。CSS、`DsTooltip`、`DsHelpTip` 和其它控件没有改。

## 拆前测试名

`overflow-text.test.tsx`：

- `uses a zero-width guard and one-pixel tolerance before adding a Tab stop`
- `remeasures changed text without rebuilding its observer and disconnects on unmount`
- `reveals the same selectable DOM value on hover or focus and Escape keeps focus`
- `portals a clipped value tooltip into its nearest open dialog`
- `remeasures after fonts change and removes the font listener on unmount`
- `does not read layout while rendering on the server`

`controls.test.tsx` 没有 `DsOverflowText` 用例。拆后这些标题都还在，并多了一条出口身份检查：`keeps the controls and design-system exports on the moved implementation`。

## DOM 与出口

同一输入的服务端字符串，搬前和搬后一致：

| 输入 | HTML |
|---|---|
| `<DsOverflowText className="extra" translate="no">server-value</DsOverflowText>` | `<span translate="no" class="ds-overflow-text extra">server-value</span>` |
| `<DsOverflowText as="code">id</DsOverflowText>` | `<code class="ds-overflow-text">id</code>` |

未截断时没有 `tabindex`、`aria-describedby` 和浮层。`./controls.js`、`./overflow-text.js`、`./index.js` 三个 `DsOverflowText` 是同一个函数。

`text-overflow-adoption.json` 里 `.ds-overflow-text` 的 producer 从 `controls.tsx` / `DsPressable` 改到 `overflow-text.tsx` / `DsOverflowText`。类名和策略没变，只让登记指向现在拥有这个 class 的函数。

## 验证

- `overflow-text.test.tsx` 7/7，exit 0。
- `text-overflow-adoption.test.ts` 9/9，exit 0。
- `controls.test.tsx` 与 `boundary.test.ts` 合计 102/102，exit 0。
- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 隔离反控 [grok-arch-ds-overflow-mutant.mjs](grok-arch-ds-overflow-mutant.mjs)，结果 [grok-arch-ds-overflow-mutant.json](grok-arch-ds-overflow-mutant.json)。绿对照 7/7 exit 0；只去掉 `clientWidth + 1` 容差后 exit 1，恰失败 `uses a zero-width guard and one-pixel tolerance before adding a Tab stop`，`AssertionError: expected '0' to be null`。源文件 SHA-256 `32af1ddfa349930766b71a140ae27afa0a0c2464c07d2260dbc22173baa057e4` 前后相同。
- 本机没有另开浏览器。编辑器 6010 没有动。视觉由 Codex 接收时补。

Biome 检查迁出文件时，`controls.tsx` 原有两处 `void | boolean` warning 仍在，这次没有改那些签名。

## Codex 后续接收（不改 Grok 原回执）

Grok 提交时“未合 main、未作视觉”的文字为其交付时点事实。Codex 后续已独立核源码、反控与隔离 Design Lab 实际画面，合入并完成全仓门禁；结论与诊断脚本安全收口见[独立接收](grok-arch-ds-overflow-review.md)。
