# ARCH-F2-DS-LABELS-1 — DsTag / DsReadonlyValue 迁出候选

2026-09-26。Cursor 在 `codex/cursor-arch-ds-labels-r1` 上只把 `DsTagTone`、`DsTag`、`DsReadonlyValue` 从 `controls.tsx` 搬到 `status-values.tsx`。提交基点是当时最新 `origin/main` `56ebed43dd3b4898cc9be348122e43b33edec2b9`。卡面冻结 `95af9ed5` 是它的祖先。没有合 main，没有标 done。

`controls.tsx` 继续 `export type { DsTagTone }` 和 `export { DsReadonlyValue, DsTag }`。`design-system/index.ts` 仍是 `export * from './controls.js'`，没有新的对外路径。新文件只 import `HTMLAttributes`，不回引 `controls`。`classes` 在新文件里按原样局部实现。CSS、其它控件和产品业务组件没有改。

## 拆前测试名

`controls.test.tsx` 既有 Tag 正控：

- `buttons and action links share geometry while preserving native semantics`

`recipes.test.tsx` 既有使用者：

- `keeps hero domain differences in slots while retaining one heading contract`

`boundary.test.ts` 既有静态门：`EnemyAnimPreview.tsx` 仍要求 `/<DsTag\b/`。

拆后这些标题都还在。新增：

- `keeps tag tones, readonly elements and the moved export identity`
- `keeps status-value SSR markup for default tone and element contracts`
- `keeps status values on the extracted module without a controls cycle`

hero 用例补了 `SPAN` + `ds-tag ds-tag--neutral` 与 controls/index/status-values 同一函数。

## DOM 与出口

同一输入的服务端字符串，搬前和搬后一致：

| 输入 | HTML |
|---|---|
| `<DsTag>使用</DsTag>` | `<span class="ds-tag ds-tag--accent">使用</span>` |
| `<DsTag tone="neutral">引用 8</DsTag>` | `<span class="ds-tag ds-tag--neutral">引用 8</span>` |
| `<DsTag tone="warning" monospace>ID</DsTag>` | `<span class="ds-tag ds-tag--warning ds-tag--monospace">ID</span>` |
| `<DsTag tone="danger" data-kind="x">危</DsTag>` | `<span data-kind="x" class="ds-tag ds-tag--danger">危</span>` |
| `<DsReadonlyValue>值</DsReadonlyValue>` | `<span class="ds-readonly-value">值</span>` |
| `<DsReadonlyValue as="div" monospace className="extra" data-id="row">id</DsReadonlyValue>` | `<div data-id="row" class="ds-readonly-value ds-readonly-value--monospace extra">id</div>` |

`./controls.js`、`./status-values.js`、`./index.js` 三个 `DsTag` / `DsReadonlyValue` 是同一个函数。

## 验证

- `controls.test.tsx`、`recipes.test.tsx`、`boundary.test.ts` 3 files / 138 tests，exit 0（main 同三文件 135；+3 为本卡新增）。
- `pnpm --filter @type-pal/editor typecheck` exit 0。
- 改动文件 Biome：`status-values.tsx` / `controls.test.tsx` / `recipes.test.tsx` 无 error。`controls.tsx` 原有两处 `void | boolean` warning 仍在，这次没有改那些签名。`boundary.test.ts` 原有 template-curly / unused `adoption` warning 仍在。
- 隔离反控：Vite `transform` 只把内存中的 `tone = 'accent'` 换成 `tone = 'neutral'`，跑同一正式用例 `keeps tag tones, readonly elements and the moved export identity`。控制树 1/1 exit 0；变异树 exit 1，`AssertionError: expected 'ds-tag ds-tag--neutral' to be 'ds-tag ds-tag--accent'`（`controls.test.tsx:863`）。磁盘 `status-values.tsx` SHA-256 `fef08ab290a004613eed62cb23b0cbdf91e38485af8f72dcfef36724dac72104` 前后相同。临时配置/JSON 已清理，不落仓。
- 本机没有另开浏览器。编辑器 6010 没有动。视觉由 Codex 接收时补。

Cursor 自验不是独立证明。Codex 独立复核与集成。

## Codex 后续接收（不改 Cursor 原回执）

上述“未合 main、未标 done”为 Cursor 交付时点。Codex 已另核真实变异与隔离 UI，对 text-overflow adoption 两条旧 owner 登记做最小集成修复，完成全仓与官方覆盖率门禁；见[独立接收记录](cursor-arch-ds-labels-review.md)。
