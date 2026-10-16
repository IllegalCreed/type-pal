# CURSOR-WAVE-2-1 · Codex 首轮独立接收

Status: historical
Owner: Codex（文档治理；原任务 Owner/贡献者保留于原文）
Last reviewed: 2026-10-17
Template: archive-record-v1 / 1.0.0

本页把 testing archive 材料接入 archive-record-v1。原任务日期、状态、合同、测试数字、失败、counter、机器字段、链接和未执行项在 quote 中保全；本次不授 runtime/E2E/视觉/coverage 信用。

## 历史范围

- 源 revision e0ddc80b28ab45394aa560855d51de65ecd568e1；本轮 R80。此文件属于 testing archive 历史层，不能单独授权当前测试或发布。

## 原始结论

- CURSOR-WAVE-2-1 · Codex 首轮独立接收：原始正文完整保留于下方 quote；本轮只改变文档封套，不改变原始结论。

## 当时证据

- 原始命令、输入、caller/oracle、结果、机器字段、SHA、counter、链接和未执行项保留于 quote。

## 当前有效性

historical。历史测试结论必须带日期和 source revision，并由当前 catalog、contract、fresh receipt 重新核定。

## 继任文档

- 当前入口：对应 testing catalog/domain report、contract、paired evidence 和 fresh receipt。
- 若重新启用：补齐合法输入、真实 caller/oracle、排重、独立 review 和静态零诊断。

## 停止线

- 本页不证明 runtime、E2E、视觉、coverage 或当前产品行为；不得以 archive wrapper 替代执行回执。

## 原文保全

固定 source revision `e0ddc80b28ab45394aa560855d51de65ecd568e1`，source SHA `6c0272c9a00fb62f762ee3c530d4310e4765308c270bf7af551d8e21710c05a9`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # CURSOR-WAVE-2-1 · Codex 首轮独立接收
>
> 2026-09-25；Cursor 候选 `7b4ec8fc1e791a2226660e9c80add5357f83212e`，基点 `08973434`。**W2 accept 并已选择性接入 main 为 `cbac3ca0`；W1/W3/W4/W5 窄 counter，整卡转 rework。** 候选自验不是独立证明，其余四包不合 main、不计官方覆盖率。候选工作树还有未跟踪的根及七包 `node_modules` 软链接（目标指向主仓依赖）；并非产品改动，但交付前须由贡献者核清并恢复干净工作树。候选落后主线，返工前同步最新 main，保留本席结论和其它 Agent 改动。
>
> ## 独立复跑与范围
>
> - 相对候选基点的已提交 diff 为三份作者指南、`CLAUDE.md`、六份 editor/game 测试、文档工具测试及专属回执/索引；`packages/`、`scripts/` 只有测试文件，生产代码、配置、资产、覆盖基线零 diff。
> - editor 定向 3 文件 48/48；game 定向 3 文件 20/20；文档定向 25/25、全 `pnpm test:docs-tools` 38/38。editor/game typecheck、`pnpm check:docs`、`git diff --check` 均通过。上述是候选行为可运行证据，**不是**负控制和五包最终接收证明。
> - W2 核对 `packages/game/package.json` 与 `docs/ops/guides/dev-servers.md:30-48`：`run e2e` 与 6001 已退役，`E2E=1` 仅 HTTP dev。`CLAUDE.md` 修订范围准确；单独 cherry-pick 到 main 后文档门 PASS。
>
> ## 逐包裁决
>
> | 包 | 决定 | 直接反证与最小返工 |
> |---|---|---|
> | W1 作者指南 | **counter** | `shared-script-author-guide.md:35` 新句“另建新脚本并粘贴正文”暗示有整段正文粘贴能力；当前 `SharedScriptTab.tsx`/`ScriptEditor.tsx` 找不到此操作链。改成不承诺粘贴控件的手动重建说明，或给真实可达入口。其它六处已证文字方向不重开。 |
> | W2 根指令 | **accept，已接入** | `CLAUDE.md` 两处窄修符合现行 package/dev-server；无需返工，不在候选返工时重复提交。 |
> | W3 editor 纯测试 | **counter，仅缺鉴别力交付** | `binary-signature.test.ts:22-31` 改测试输入的首字节，是合法不同输入对照，却不是任务卡要求的“隔离单点移除生产防护后业务红”。现有偏移视图/同长异文/读锁释放断言可保留；用临时加载或隔离副本将 `sha256Hex` 的视图复制改成直接取 `bytes.buffer`，证明新增偏移视图测试以 AssertionError 红，生产源 SHA 不变。测试本身若不需改，不要为数字加例。 |
> | W4 game 工具测试 | **counter，负控与断言精度** | `fps-overlay.test.ts:80,87,98` 用 `textContent.toContain('50'/'49')`，可能误收 `150/149` 等显示，且回执把普通 49 FPS 输入称为“单点反控”。收窄为实际 `.v` 文本精确值，隔离把阈值 `fps >= 50` 改成 `fps >= 49` 或 `fps > 50`，证明 49/50 合同由新增测试业务红钉住；不改入仓生产。既有计时/存储用例不重做。 |
> | W5 文档工具 | **counter，去重与临时目录** | `cursor-security-boundary.test.mjs:17-52` 的 `mkdtemp` 在执行结束后未清理，违反卡面临时 IO 合同；用 `try/finally` 只清理自己创建的目录。`:60-63` 标题说“live link fails”，实际只调 `markdownLinks` 返回链接；它与既有 `check.test.mjs` 围栏真/假链接断言重叠。删除并登记 existing-proof，或真正调用 `auditDocuments` 钉检查失败及无围栏误报。保留确有增量的路径安全例。 |
>
> 整批仍需在最新主线上核白名单与改动文件 Biome；全仓 check、官方 ratchet、单次严格 fast 暂不跑，待四包收敛后由 Codex 串行执行。不得把通过的 W2 回退，也不得改产品实现、旧测试预期或他席材料。
>
<!-- original-source-quote:end -->
