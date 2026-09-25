# Cursor 五包文档纠偏与纯边界回归

任务：[CURSOR-WAVE-2-1](../../ops/tasks/CURSOR-WAVE-2-1-docs-and-pure-regressions.md)。
贡献者：Cursor；候选分支 `codex/cursor-wave2-r1`，worktree `type-pal-cursor-wave2`。
首轮候选 `7b4ec8fc`；本回执为窄返工后的最终树。
返工基点：最新 `origin/main`（含 W2 `cbac3ca0` 与 [Codex 首轮复核](../cursor-wave2-review.md)）。
Codex 独立验收与集成；本回执不是接收证明，也不标 done。

> Codex 二轮接收界限：W1/W2/W5 已选择性接入 main，W3/W4 仍是隔离候选；以下 W3/W4 的自验数字与“变异”表述不构成独立接收证明。详见[二轮复核](../cursor-wave2-r2-review.md)。

## W1 作者指南七处已证误导

白名单：`docs/phase2/guides/battlefield-authoring.md`、`shared-script-author-guide.md`、`debug-tools.md`。

| 点 | 窄修 |
|---|---|
| B1-3 悬空战场 | 「缺数据」改为选择器可见文案「战场 #N（缺失）」；保存门仍经内容引用校验拒绝 |
| C1-1 创建字段 | 创建对话框只填显示名和稳定 id；说明/`self` 在右侧元数据；默认 `self` 为「不使用」 |
| C1-2 无复制 | 删除不存在的「复制」步骤。返工撤回「粘贴正文」：另建新脚本后在统一指令树重写正文，不承诺粘贴控件 |
| C1-3 抽屉页签 | 「进场脚本 / 传送出口」，选中实体时另有「交互脚本 / 自动行为」 |
| C2-2 引用列表 | 右侧引用列表自动列出调用方；按钮是「打开共享脚本」，没有「扫描调用位置」 |
| C2-4 调用环 | 保留「应禁止成环」设计约束；写明当前保存门不对 canonical `callScript` 做 DFS；`self: required` 缺实体保存/发布标待证 |
| D1-1 试玩 debug | 引擎试玩按钮不自动加 `debug`；带参 URL 仅作手工示例 |

验证：`node scripts/docs/check.mjs` 见整批门禁。其它六处文字方向不重开。

## W2 根工程指令过时命令

**accept，已在 main `cbac3ca0`。** 返工未改 `CLAUDE.md`，相对 `origin/main` 该文件 diff 为空。

## W3 编辑器纯边界

只读生产：`binary-signature.ts`、`project-read-lock.ts`、`play-url.ts`。
可改：`packages/editor/src/core/*.test.ts`。

| 轴 | 状态 | 证据 |
|---|---|---|
| 偏移视图散列 / 输入不变 / 同长异文 | 新增（保留） | `binary-signature.test.ts`：`same-length payloads…`；`an offset view hashes only its window and does not mutate the source` |
| 隔离实现负控 | 返工新增 | `dropping the view copy makes the offset-view contract fail with AssertionError`：隔离副本把 `Uint8Array.from(bytes).buffer` 改成 `bytes.buffer` 后，同一偏移视图对 `isolated` 的相等断言以 AssertionError 红；生产源 SHA 测试前后不变 |
| 读锁回调失败后释放 | 新增（保留） | `project-read-admission.test.ts`：`读锁：回调失败后 discovery 与 workspace 锁都释放` |
| 绑定换代拒绝 | existing-proof | 同文件 `读锁：获锁后重查绑定…`；`读锁：读取中 %s 绑定漂移不得返回结果` |
| URL 重复/歧义拒绝 | existing-proof | `play-url.test.ts`：`rejects invalid or ambiguous identity before loading`；`a missing/invalid editor identity cannot become a bare HTTP URL` |

定向：`pnpm --filter @type-pal/editor exec vitest run src/core/binary-signature.test.ts src/core/project-read-admission.test.ts src/core/play-url.test.ts` → 3 files / 49 tests，exit 0。未改产品代码。

## W4 一阶段工具边界

只读生产：`fps-overlay.ts`、`display-scale.ts`、`toast.ts`。

| 轴 | 状态 | 证据 |
|---|---|---|
| 持久开关 / 未启用 no-op / 关闭清理 | existing-proof | `fps-overlay.test.ts` 既有 6 例 |
| 50 FPS 色阈 | 返工收窄 | `采样满窗后 ≥50 为绿、<50 为红；49 不得误标绿`：`.v` 的 `textContent` 精确为 `50` / `49`，不再用子串 |
| 阈值单点变异 | 返工新增 | `relaxing fps >= 50 to fps >= 49 makes the 49-red contract AssertionError-red`：源码替换 `fps >= 50` → `fps >= 49` 后 49 不再是 `.v.lo`；生产源 SHA 不变 |
| 连续启停不沿用脏计数 | 新增（保留） | `连续启停丢弃未满窗的脏帧计数，下一窗按新节奏采样`（显示值改为精确 `50`） |
| 缩放默认/夹限/持久 | existing-proof | `display-scale.test.ts` 既有四例 |
| 损坏存储回落 | 新增（保留） | `损坏或非正存储 %s 回落到 100%，不得沿用脏值` |
| toast 挂出/类型/到时移除 | existing-proof | `toast.test.ts` 既有三例 |
| 未到点不得移除 | 新增（保留） | `未到 duration 不得移除，负控证明计时器不是一挂就清` |

定向：`pnpm --filter @type-pal/game exec vitest run src/tools/fps-overlay.test.ts src/tools/display-scale.test.ts src/tools/toast.test.ts` → 3 files / 21 tests，exit 0。受控时间戳与假时钟，无真实 sleep。未改 UX。

## W5 文档工具安全边界

只读生产：`markdown.mjs`、`check.mjs`、`relocate.mjs`。
新增：`scripts/docs/cursor-security-boundary.test.mjs`（`mkdtemp` 隔离树，`finally` 里 `rmSync` 自己的目录）。

| 轴 | 状态 | 证据 |
|---|---|---|
| 围栏/注释/转义伪链 | existing-proof | `check.test.mjs` `fenced, quoted-fenced…`；`cursor-markdown.test.mjs` 中文多行围栏。首轮弱例 `a live link still fails…` 已删，不再只调 `markdownLinks` |
| 任务状态只读顶部 | existing-proof | `check.test.mjs` `task status comes only from the top…` |
| `../`、重复目标、规划后改写 | existing-proof | `relocate.test.mjs` `unsafe, colliding and overlapping paths fail before writes` |
| 绝对路径 / 反斜杠 / 空段 / `.git` | 新增（保留） | `absolute, backslash, empty, and .git path segments fail before any write` |
| 目标已存在 / 循环对调 | 新增（保留） | `existing destination and overlapping swaps fail on an isolated tree with zero writes`；`finally` 删除临时树并断言目录不在 |
| 协议目标不进本地检查 | 新增（保留） | `scheme and protocol-relative destinations stay out of local file checks` |

定向：`node --test scripts/docs/cursor-security-boundary.test.mjs scripts/docs/check.test.mjs scripts/docs/relocate.test.mjs scripts/docs/cursor-markdown.test.mjs` → 24 pass / 0 fail。整批末另跑 `pnpm test:docs-tools` 与 `pnpm check:docs`。未改生产脚本。

## 整批门禁

| 检查 | 结果 |
|---|---|
| editor typecheck | exit 0 |
| game typecheck | exit 0 |
| editor 定向 | 3 files / 49 tests |
| game 定向 | 3 files / 21 tests |
| 文档定向 | 24 pass |
| `pnpm test:docs-tools` | 37 pass / 0 fail |
| 改动文件 Biome | 通过 |
| `pnpm check:docs` / `node scripts/docs/check.mjs` | `584 Markdown / 3122 local links / 193 tasks`，PASS |
| `git diff --check` | 通过 |

不跑迁移、提取、E2E、ratchet 或 `baseline.fast.json`。全仓 check / 统一 ratchet / 受保护 strict-fast 留给 Codex 接收后串行一次。工作树自建 `node_modules` 软链接已删除。
