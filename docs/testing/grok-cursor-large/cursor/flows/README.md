# TEST-CURSOR-ASSET-UI-LARGE-1 — 12 条功能视觉流程

Playwright + 自有 [browser-host](./browser-host/README.md)（vite **6013+**，不占用 editor **6010**）。
每条 flow 独立目录：`before.json` / `after.json` / `evidence.json`（含截图 SHA256 与 console 分类）。

## 运行

```bash
node docs/testing/grok-cursor-large/cursor/flows/run-flows.mjs
```

汇总索引：[flow-index.json](./flow-index.json)（Playwright 驱动；`CURSOR_FLOW_ONLY=FLOW-*` 可只跑子集；末次全量 **12/12 pass**）。

每目录典型产物：`before.json`、`after.json`、`evidence.json`（含 `shots[].sha256` 与 `console` 分类）、`*.png`。

## 流程清单（12）

| ID | 类别 | 合同类型 | 目录 |
|---|---|---|---|
| FLOW-R01 | resource | dom-filter-oracle | [FLOW-R01](./FLOW-R01/) |
| FLOW-R02 | resource | select-purpose-oracle | [FLOW-R02](./FLOW-R02/) |
| FLOW-R03 | resource | focus-object-oracle | [FLOW-R03](./FLOW-R03/) |
| FLOW-R04 | resource | canvas2d-pixel-oracle | [FLOW-R04](./FLOW-R04/) |
| FLOW-R05 | resource | tileset-selection-oracle | [FLOW-R05](./FLOW-R05/) |
| FLOW-R06 | resource | missing-asset-warning-oracle | [FLOW-R06](./FLOW-R06/) |
| FLOW-DS01 | design-system | reorder-order-oracle | [FLOW-DS01](./FLOW-DS01/) |
| FLOW-DS02 | design-system | select-value-oracle | [FLOW-DS02](./FLOW-DS02/) |
| FLOW-DS03 | design-system | number-escape-draft-oracle | [FLOW-DS03](./FLOW-DS03/) |
| FLOW-DS04 | design-system | virtual-scroll-oracle | [FLOW-DS04](./FLOW-DS04/) |
| FLOW-AR01 | async-fail-recover | upload-invalid-then-recover | [FLOW-AR01](./FLOW-AR01/) |
| FLOW-AR02 | async-fail-recover | decode-fail-then-switch-asset | [FLOW-AR02](./FLOW-AR02/) |

计数：**resource 6** · **design-system 4** · **async fail/recover 2**。

## Canvas2D

`FLOW-R04` 在浏览器内探针真实 `Canvas2D`；不可用时 `evidence.json` 标 **`status:blocked`**，不伪造像素 oracle。

## Console 分类

[lib/console-classify.mjs](./lib/console-classify.mjs)：`error` / `warning` / `pageerror` + 可归因 404（save-state 探测）；
`consoleAttested:false` 当存在不可归因 error 或失败请求。
