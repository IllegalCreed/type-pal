# @type-pal/content — 内容数据模型（schema + 纯逻辑）

第二阶段的内容真源层：定义场景 / 实体 / 脚本 / 物品 / 商店 / 敌人 / 战斗数据 / 资源目录等
全部 canonical 类型、typed leaf walker（引用收集）、`validateReferences` 与 content/save
版本常量（`character.ts` 的 `CONTENT_VERSION` / `CURRENT_PROJECT_MINIMUM_SAVE_VERSION`，
当前 content20 / SAVE8）。编辑器、运行时、迁移器都只消费本包类型，不各自定义 schema。

常用命令：

```bash
pnpm --filter @type-pal/content test
pnpm --filter @type-pal/content typecheck
```

边界：不含运行时循环（归 `reforge`）、不含编辑器 UI（归 `editor`）、不做离线迁移（归
`migrate`）。格式契约见 [content-schema](../../docs/phase2/specs/content-schema.md)。
