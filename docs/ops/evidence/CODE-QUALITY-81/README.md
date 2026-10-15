# CODE-QUALITY-81 picker 生命周期证据

本批只收第一阶段 game Dev Panel 场景 picker 的资源生命周期，不把 `dev-panel.ts` 复合文件宣称为整文件已审，也不修改 `DevPanelDeps.renderSceneThumbnail` 公共签名。当前任务为 `review`：新增生命周期测试文件已关闭，复合生产文件与既有 GLM 测试仍待核。

## 直接证据

- 生产 caller：`packages/game/src/shell/bootstrap.ts:958-966` 只在启动时装配 `setupDevPanel`；`bootstrap.ts:725-770` 的 `renderSceneThumbnail` 已捕获资源失败并返回 `null`。
- 实现边界：`packages/game/src/dev/dev-panel.ts:857-877` 创建 picker owner cleanup；`:1195-1217` 处理 generation、缓存和 Promise rejection；`:1227-1260` 重建/消费 observer；`:2072-2081` 关闭时释放 owner cleanup。
- 测试 caller/oracle：`packages/game/src/dev/dev-panel-picker-lifecycle.test.ts` 通过公开 `setupDevPanel`、真实 `scene-jumps.json`（scene 1/2/3/4/5/6/9）、hydrated player-role runtime、typed fake `IntersectionObserver`、deferred/resolved/null/rejecting renderer 验证 close/cache reopen、filter late result、null placeholder、无 IO 兜底和外部 callback rejection。

## 实际命令

- `pnpm --filter @type-pal/game exec vitest run src/dev/dev-panel-picker-lifecycle.test.ts --reporter=dot`：exit 0，1 file / 5 tests passed；原始输出见 `gate-targeted.txt`。
- `pnpm --filter @type-pal/game typecheck`：exit 0；见 `gate-game-typecheck.txt`。
- `pnpm exec biome check packages/game/src/dev/dev-panel.ts packages/game/src/dev/dev-panel.glm-next-wave.test.ts packages/game/src/dev/dev-panel-picker-lifecycle.test.ts`：exit 0，3 files，无诊断；见 `gate-biome.txt`。

## 失败基线与反控

HEAD 原实现用当前 5 个测试重放为 exit 1、`3 failed / 2 passed`，并出现 1 个未处理 rejection；失败分别落在 close disconnect、过滤后的迟到 observer 回调和 rejection placeholder，详见 `baseline-original.txt`。

mutation runner 只针对本卡拥有的实现文件执行两个精确突变：`omit-close-disconnect` 与 `reuse-generation-on-filter` 均 exit 1、各 `1 failed / 4 passed`、无未处理错误；记录源 SHA、原始输出、退出码和 `finally` 恢复结果见 `mutation-runner.json`。正式候选恢复后 5/5 通过。

## 质量门状态

- `pnpm check`：exit 0，packages/game 314 files / 3,548 tests 等全仓分包结果已保存于 `gate-check.txt`；lint 4,008 files，error/warning/info 均为 0。
- `pnpm coverage:ratchet`：exit 0；fast baseline 只纳入新增 5 个测试，覆盖率只升不降，详见 `gate-ratchet.txt`。
- `pnpm check:fast`（protected fast）：exit 0；workspace typecheck、全包测试与 lint-zero 全通过，详见 `gate-protected-fast.txt`。
- ledger 当前机器计数：3,269 tracked；339 closed / 10 review / 2,920 pending。

## 边界

- 成功缩略图仍写入既有模块级共享缓存，避免跨 picker 重复渲染。
- 没有新增 AbortSignal、全局 listener disposer 或 bootstrap teardown；这些需要真实宿主重复装配/卸载证据，继续留 pending。
- 功能性 DOM 生命周期已完成最小验证；剧情视觉按仓库规则不在本批运行 E2E。CODE80 的浏览器视觉验证仍单独 pending。
