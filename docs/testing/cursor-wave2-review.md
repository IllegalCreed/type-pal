# CURSOR-WAVE-2-1 · Codex 首轮独立接收

2026-09-25；Cursor 候选 `7b4ec8fc1e791a2226660e9c80add5357f83212e`，基点 `08973434`。**W2 accept 并已选择性接入 main 为 `cbac3ca0`；W1/W3/W4/W5 窄 counter，整卡转 rework。** 候选自验不是独立证明，其余四包不合 main、不计官方覆盖率。候选工作树还有未跟踪的根及七包 `node_modules` 软链接（目标指向主仓依赖）；并非产品改动，但交付前须由贡献者核清并恢复干净工作树。候选落后主线，返工前同步最新 main，保留本席结论和其它 Agent 改动。

## 独立复跑与范围

- 相对候选基点的已提交 diff 为三份作者指南、`CLAUDE.md`、六份 editor/game 测试、文档工具测试及专属回执/索引；`packages/`、`scripts/` 只有测试文件，生产代码、配置、资产、覆盖基线零 diff。
- editor 定向 3 文件 48/48；game 定向 3 文件 20/20；文档定向 25/25、全 `pnpm test:docs-tools` 38/38。editor/game typecheck、`pnpm check:docs`、`git diff --check` 均通过。上述是候选行为可运行证据，**不是**负控制和五包最终接收证明。
- W2 核对 `packages/game/package.json` 与 `docs/ops/guides/dev-servers.md:30-48`：`run e2e` 与 6001 已退役，`E2E=1` 仅 HTTP dev。`CLAUDE.md` 修订范围准确；单独 cherry-pick 到 main 后文档门 PASS。

## 逐包裁决

| 包 | 决定 | 直接反证与最小返工 |
|---|---|---|
| W1 作者指南 | **counter** | `shared-script-author-guide.md:35` 新句“另建新脚本并粘贴正文”暗示有整段正文粘贴能力；当前 `SharedScriptTab.tsx`/`ScriptEditor.tsx` 找不到此操作链。改成不承诺粘贴控件的手动重建说明，或给真实可达入口。其它六处已证文字方向不重开。 |
| W2 根指令 | **accept，已接入** | `CLAUDE.md` 两处窄修符合现行 package/dev-server；无需返工，不在候选返工时重复提交。 |
| W3 editor 纯测试 | **counter，仅缺鉴别力交付** | `binary-signature.test.ts:22-31` 改测试输入的首字节，是合法不同输入对照，却不是任务卡要求的“隔离单点移除生产防护后业务红”。现有偏移视图/同长异文/读锁释放断言可保留；用临时加载或隔离副本将 `sha256Hex` 的视图复制改成直接取 `bytes.buffer`，证明新增偏移视图测试以 AssertionError 红，生产源 SHA 不变。测试本身若不需改，不要为数字加例。 |
| W4 game 工具测试 | **counter，负控与断言精度** | `fps-overlay.test.ts:80,87,98` 用 `textContent.toContain('50'/'49')`，可能误收 `150/149` 等显示，且回执把普通 49 FPS 输入称为“单点反控”。收窄为实际 `.v` 文本精确值，隔离把阈值 `fps >= 50` 改成 `fps >= 49` 或 `fps > 50`，证明 49/50 合同由新增测试业务红钉住；不改入仓生产。既有计时/存储用例不重做。 |
| W5 文档工具 | **counter，去重与临时目录** | `cursor-security-boundary.test.mjs:17-52` 的 `mkdtemp` 在执行结束后未清理，违反卡面临时 IO 合同；用 `try/finally` 只清理自己创建的目录。`:60-63` 标题说“live link fails”，实际只调 `markdownLinks` 返回链接；它与既有 `check.test.mjs` 围栏真/假链接断言重叠。删除并登记 existing-proof，或真正调用 `auditDocuments` 钉检查失败及无围栏误报。保留确有增量的路径安全例。 |

整批仍需在最新主线上核白名单与改动文件 Biome；全仓 check、官方 ratchet、单次严格 fast 暂不跑，待四包收敛后由 Codex 串行执行。不得把通过的 W2 回退，也不得改产品实现、旧测试预期或他席材料。
