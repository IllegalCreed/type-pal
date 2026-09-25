# Cursor 五包文档纠偏与纯边界回归

任务：[CURSOR-WAVE-2-1](../../ops/tasks/CURSOR-WAVE-2-1-docs-and-pure-regressions.md)。
贡献者：Cursor；候选分支 `codex/cursor-wave2-r1`，worktree `type-pal-cursor-wave2`。
开工 base：`089734341e02d63d1e1a0c78fa6f7bffb71ff593`（`origin/main`，开卡提交）。
Codex 独立验收与集成；本回执不是接收证明，也不标 done。

## W1 作者指南七处已证误导

白名单：`docs/phase2/guides/battlefield-authoring.md`、`shared-script-author-guide.md`、`debug-tools.md`。

| 点 | 窄修 |
|---|---|
| B1-3 悬空战场 | 「缺数据」改为选择器可见文案「战场 #N（缺失）」；保存门仍经内容引用校验拒绝 |
| C1-1 创建字段 | 创建对话框只填显示名和稳定 id；说明/`self` 在右侧元数据；默认 `self` 为「不使用」 |
| C1-2 无复制 | 删除不存在的「复制」步骤，改为另建新脚本 |
| C1-3 抽屉页签 | 「进场脚本 / 传送出口」，选中实体时另有「交互脚本 / 自动行为」 |
| C2-2 引用列表 | 右侧引用列表自动列出调用方；按钮是「打开共享脚本」，没有「扫描调用位置」 |
| C2-4 调用环 | 保留「应禁止成环」设计约束；写明当前保存门不对 canonical `callScript` 做 DFS；`self: required` 缺实体保存/发布标待证 |
| D1-1 试玩 debug | 引擎试玩按钮不自动加 `debug`；带参 URL 仅作手工示例 |

验证：`node scripts/docs/check.mjs` → `docs: PASS (0 issues)`。

## W2 根工程指令过时命令

白名单仅 `CLAUDE.md`。删除已不存在的 `pnpm --filter @type-pal/game run e2e`，去掉 6001 e2e 实例；写明 `E2E=1` 只跳过 `basicSsl()` 的 HTTP 开发入口，不是 Playwright，也不是真 Service Worker。一阶段机制、阶段铁律与历史经验未改。

## W3 编辑器纯边界

只读生产：`binary-signature.ts`、`project-read-lock.ts`、`play-url.ts`。
可改：`packages/editor/src/core/*.test.ts`。

| 轴 | 状态 | 证据 |
|---|---|---|
| 偏移视图散列 / 输入不变 / 同长异文 | 新增 | `packages/editor/src/core/binary-signature.test.ts`：`same-length payloads with different bytes cannot share a digest or snapshot id`；`an offset view hashes only its window and does not mutate the source`。后者是单点反控：改窗口首字节后与隔离副本散列分叉 |
| 读锁回调失败后释放 | 新增 | `project-read-admission.test.ts`：`读锁：回调失败后 discovery 与 workspace 锁都释放` |
| 绑定换代拒绝 | existing-proof | 同文件 `读锁：获锁后重查绑定，消失时在任何内容读取前拒绝`；`读锁：读取中 %s 绑定漂移不得返回结果` |
| URL 重复/歧义拒绝 | existing-proof | `play-url.test.ts`：`rejects invalid or ambiguous identity before loading`（含重复 `project`/`workspace`/`save-workspace` 与双工作区）；`a missing/invalid editor identity cannot become a bare HTTP URL` |

定向：`pnpm --filter @type-pal/editor exec vitest run src/core/binary-signature.test.ts src/core/project-read-admission.test.ts src/core/play-url.test.ts` → 3 files / 48 tests，exit 0。未改产品代码。

## W4 一阶段工具边界

只读生产：`fps-overlay.ts`、`display-scale.ts`、`toast.ts`。

| 轴 | 状态 | 证据 |
|---|---|---|
| 持久开关 / 未启用 no-op / 关闭清理 | existing-proof | `fps-overlay.test.ts` 既有 6 例：`isFpsEnabled / setFpsEnabled 持久化 localStorage`；`未启用 → tickFps 纯 no-op`；`setFpsEnabled(false) → 立即隐藏 overlay`；`启用中途关闭…自清 overlay`；120fps/25fps 采样窗 |
| 50 FPS 色阈 | 新增 | `采样满窗后 ≥50 为绿、<50 为红；49 不得误标绿`（49 为负控） |
| 连续启停不沿用脏计数 | 新增 | `连续启停丢弃未满窗的脏帧计数，下一窗按新节奏采样` |
| 缩放默认/夹限/持久 | existing-proof | `display-scale.test.ts` 既有四例 |
| 损坏存储回落 | 新增 | `损坏或非正存储 %s 回落到 100%，不得沿用脏值`（`foo`/`0`/`-12`/`NaN`） |
| toast 挂出/类型/到时移除 | existing-proof | `toast.test.ts` 既有三例 |
| 未到点不得移除 | 新增 | `未到 duration 不得移除，负控证明计时器不是一挂就清` |

定向：`pnpm --filter @type-pal/game exec vitest run src/tools/fps-overlay.test.ts src/tools/display-scale.test.ts src/tools/toast.test.ts` → 3 files / 20 tests，exit 0。受控时间戳与假时钟，无真实 sleep。未改 UX。

## W5 文档工具安全边界

只读生产：`markdown.mjs`、`check.mjs`、`relocate.mjs`。
新增：`scripts/docs/cursor-security-boundary.test.mjs`（`mkdtemp` 隔离树，不写仓库根）。

| 轴 | 状态 | 证据 |
|---|---|---|
| 围栏/注释/转义伪链 | existing-proof | `check.test.mjs` `fenced, quoted-fenced…`；`cursor-markdown.test.mjs` 中文多行围栏 |
| 任务状态只读顶部 | existing-proof | `check.test.mjs` `task status comes only from the top…` |
| `../`、重复目标、规划后改写 | existing-proof | `relocate.test.mjs` `unsafe, colliding and overlapping paths fail before writes` |
| 绝对路径 / 反斜杠 / 空段 / `.git` | 新增 | `absolute, backslash, empty, and .git path segments fail before any write` |
| 目标已存在 / 循环对调 | 新增 | `existing destination and overlapping swaps fail on an isolated tree with zero writes` |
| 协议目标不进本地检查 | 新增 | `scheme and protocol-relative destinations stay out of local file checks` |
| 围栏假链 vs 正文真链 | 新增负控 | `a live link still fails when a fenced twin would have been a false positive` |

定向：`node --test scripts/docs/cursor-security-boundary.test.mjs scripts/docs/check.test.mjs scripts/docs/relocate.test.mjs scripts/docs/cursor-markdown.test.mjs` → 25 pass / 0 fail。整批末另跑 `pnpm test:docs-tools` 与 `pnpm check:docs`。未改生产脚本。

## 整批门禁

见同批末命令输出。不跑迁移、提取、E2E、ratchet 或 `baseline.fast.json`。全仓 check / 统一 ratchet / 受保护 strict-fast 留给 Codex 接收后串行一次。
