# TEST-KIMI-EDITOR-WORKFLOWS-1 最小浏览器宿主（隔离视觉/交互取证）

**性质：直接组件宿主，不是完整 App 入口。** 挂载的是真实产品组件（BattleSpriteLibrary /
TilesetTab 等）+ 真实 EditSession/EditorAssetReader/命令链 + 真实 writeProject 保存；
磁盘是内存 FSA 端口替身（`memoryAuthorDirectory`，与核心保存测试同款），项目由
`buildBlankProject` 真实构造。不占用户 6010/6005/6050，不碰主树项目与资产。

## 运行

从仓库根运行（`pnpm --filter ... exec` 会切到 `packages/editor`）：

```sh
KIMI_HOST_PORT=6062 pnpm --filter @type-pal/editor exec vite --config ../../docs/testing/kimi-editor-workflows/browser-host/vite.config.mts ../../docs/testing/kimi-editor-workflows/browser-host
# 场景：http://localhost:6062/?component=battle-sprite-library | tileset | sound
```

页面内 `window.__kimiHost` 暴露 `{ session, save(), reload(), catalogIds() }` 供 Playwright
驱动与断言；保存/重读走真实 `serializeProjectWithMapCopies` + `writeProject` +
`loadCurrentProjectFrom`。截图与日志落 `/tmp/type-pal-kimi-editor-workflows/`。
