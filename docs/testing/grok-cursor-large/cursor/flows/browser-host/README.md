# Cursor flows 隔离浏览器宿主

合成小工程（`?flow=FLOW-*`），直挂真实 editor 组件 + `EditSession` / loader / 命令。
**不占用 6010**；由 `run-flows.mjs` 在 **6013+** 起本目录 vite（`CURSOR_FLOWS_PORT` 可覆盖）。

## 手动启动

```bash
CURSOR_FLOWS_PORT=6013 node ../../../../../../node_modules/vite/bin/vite.js \
  --config docs/testing/grok-cursor-large/cursor/flows/browser-host/vite.config.mts \
  --host 127.0.0.1 --strictPort
```

浏览器打开 `http://127.0.0.1:6013/?flow=FLOW-MENU` 查看 12 条路由。

## 文件

| 文件 | 用途 |
|---|---|
| [vite.config.mts](./vite.config.mts) | 别名指 `@type-pal/reforge` / `@type-pal/content` 与 editor 的 react |
| [main.tsx](./main.tsx) | 12 条 flow 面 + `window.__cursorFlow` 快照桥 |
| [flow-bridge.ts](./flow-bridge.ts) | before/after oracle 与 Canvas2D 探针 |
