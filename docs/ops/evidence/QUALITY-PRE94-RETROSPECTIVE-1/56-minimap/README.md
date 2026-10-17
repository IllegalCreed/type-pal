# CODE56 minimap 当前复审切片

基点：`f6c440eab`；分支：`codex/code-quality-3y`。本片重新核验历史 CODE-QUALITY-56 的小地图加载 ownership；不触碰 CODE-QUALITY-57 的 bootstrap seam repair、地图 schema、碰撞、存档或 `MinimapController` 公共接口。当前卡复审为 `partial`。

## 读取与事实边界

完整读取 `packages/game/src/tools/minimap.ts`、`minimap.test.ts`、`minimap.glm-phase1-leaves.test.ts`；读取真实 caller/lifecycle：`bootstrap.ts` 的 `renderMapThumbnail`/`setupToolsPanel` 注入、`tools-panel.ts` 小地图面板、`dev-panel.ts` 场景缩略图 picker、`scene-system.ts` current map、`draw-tilemap.ts` 两层地图绘制；对照 `docs/phase1/engineering-notes.md`、`CLAUDE.md` 的相机/缩略图边界。SDLPal 没有同形态 minimap UI，本片只以当前 bootstrap/draw-tilemap 的 32×16 tile、camera(-16,-16)、两层绘制和 caller ownership 为 primary。

`setupMinimap.getBase` 按 map 缓存成功图片、按 map 记录失败、在 `getMapThumbnail` promise resolve 后创建 `Image`，直到 `onload`/`onerror` 才释放 `baseLoading`；这与场景 tab/widget 的 rAF 复用和 map 切换生命周期一致。`renderMapThumbnail` 自身按 map/outW dedup、并发上限 2，绘制完成后只保留 dataURL，不污染 gameplay tile cache。

## 判别力与反控

- 直接 2 files / 20 tests passed：world→thumbnail 变换、zoom clamp、触发脚本分类、NPC/物品/传送门过滤、canvas 像素/toggle/localStorage、非法持久值、图片 decode failure。
- 相邻 tools/dev 4 files / 51 tests passed，另 `dev-panel-picker-lifecycle.test.ts` 5 tests passed；验证真实 `getMapThumbnail` 转发与 picker 关闭/重开/筛选时的异步 DOM ownership。
- 独立变异验证：临时在 `Image` 构造后提前 `baseLoading.delete(mapNum)`，运行 `minimap.glm-phase1-leaves.test.ts` 得到 `1 failed / 5 passed`；失败断言为 URL 已 resolve、Image 尚未 onload 时 `getMapThumbnail` 被调用 2 次而非 1 次。变异文件已立即恢复，工作树没有 minimap 未提交修改。

## 验证与未关闭风险

- `pnpm --filter @type-pal/game typecheck`：passed
- `pnpm lint`：上一批已通过 5002 files、0 errors / 0 warnings / 0 infos；本片没有生产文件变更
- coverage/ratchet/protected/full check：沿用已收口的 [`53-wave-gates`](../53-wave-gates/README.md)，本片不重复运行昂贵 coverage
- 未关闭：bootstrap thumbnail 不调用 `repairTilemapSeams` 的视觉差异属于 CODE-QUALITY-57，未在本片扩张；小地图输入的异常外部 canvas/view 形态也未改变公共 API。CODE56 当前 `partial`，不是整卡 `accept/done`。
