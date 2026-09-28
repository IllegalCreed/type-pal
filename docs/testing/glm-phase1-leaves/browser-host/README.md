# LV1–LV4 隔离短视觉宿主（TEST-GLM-PHASE1-LEAVES-3）

- [证据表（截图 SHA256/尺寸/步骤/预期/实际）](evidence.md)
- `host.html` + `main.mjs`：只导实际生产 draw/setup 的隔离宿主页（真实调色板/字形/SPRITEUI）。
- `vite.config.mjs`：repo 根 root、strictPort 6082、`/extracted` 只读中间件指向主仓已提取数据。

启动（从 `packages/game`）：`./node_modules/.bin/vite --config ../../docs/testing/glm-phase1-leaves/browser-host/vite.config.mjs --port 6082 --strictPort`。
不碰用户 6005/6010/6050、Kimi 6062–6065、GLM① 6066–6069、GLM② 6072–6075 与 E2E 服务；
不走剧情、不接真实存档/SW/遥测。
