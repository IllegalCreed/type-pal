# @type-pal/game — 第一阶段浏览器运行时（已冻结）

第一阶段的忠实还原引擎：sdlpal 对齐的字节码解释器、战斗公式、场景/菜单/存档与 320×200
索引色 framebuffer。**v1.0.0 已上线并冻结为已发布产品与 UX 参考**——玩法与可见表现仍按忠实还原约束；允许在行为不漂移前提下做架构治理（见根 `CLAUDE.md` 协作规范）。现代化引擎在 `@type-pal/reforge`，两阶段世界观严禁混用。

常用命令：

```bash
pnpm --filter @type-pal/game dev      # dev server（端口 6005）
E2E=1 pnpm --filter @type-pal/game dev  # HTTP 开发入口（不挂 basicSsl；不是 Playwright / 真 SW）
pnpm --filter @type-pal/game test
```

参考：`reference/sdlpal/`（C 源码参考规格）、`data/raw/`（大宇原始数据 = 最终真值）。
