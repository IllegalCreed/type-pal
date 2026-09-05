# @type-pal/reforge — 第二阶段现代引擎

全新重写的运行时：消费 `@type-pal/content` 的 canonical 工程格式，按场景懒加载、定位权威
（E6 authority/mount/follow）、脚本运行时、战斗、菜单与存档（SAVE8）。架构原则见
[READ-FIRST](../../docs/phase2/READ-FIRST.md)——不对齐旧引擎，旧引擎只作内容参考。

常用命令：

```bash
pnpm --filter @type-pal/reforge dev        # dev server（端口 6050 起）
pnpm --filter @type-pal/reforge test
pnpm --filter @type-pal/reforge typecheck
```

边界：不做编辑器 UI（归 `editor`，但编辑器复用本包渲染做预览/试玩）；不读第一阶段提取
数据（归 `migrate` 桥接）。
