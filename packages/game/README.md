# @type-pal/game — 第一阶段浏览器运行时（已冻结）

第一阶段的忠实还原引擎：sdlpal 对齐的字节码解释器、战斗公式、场景/菜单/存档与 320×200
索引色 framebuffer。**v1.0.0 已上线并冻结**——只修阻断性缺陷，不再做架构演进；第二阶段
的现代化引擎在 `@type-pal/reforge`，两者严禁混用（见根 `CLAUDE.md` 阶段边界）。

常用命令：

```bash
pnpm --filter @type-pal/game dev      # dev server（端口 6005）
pnpm --filter @type-pal/game e2e      # Playwright e2e（端口 6001）
pnpm --filter @type-pal/game test
```

参考：`reference/sdlpal/`（C 源码参考规格）、`data/raw/`（大宇原始数据 = 最终真值）。
