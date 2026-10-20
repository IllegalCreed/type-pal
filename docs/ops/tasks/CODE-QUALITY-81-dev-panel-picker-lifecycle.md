# CODE-QUALITY-81 — game Dev Panel picker 生命周期

> 2026-10-20当前：本卡五卡复审/必要返工已完成源码与证据审查，统一门结果以五卡唯一回执为准；以本页当前节和[五卡回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)为准。旧时点的build/停止线/门失败保留，不作今天的阻塞或通过声明。

Status: review
Owner: Codex
Phase: phase1 game
Capability: Q3 dev picker resource ownership
Visual Verification Timing: functional-minimal

## 2026-10-20 当前复审

旧picker原件按同执行代码及selector-only变化复用；page单次装配Owner已证，不改voidAPI；旧check:fast伪protected信用已撤，复合Dev模块仍review。

18份本轮文件记录分别列A–H，广域上下文复用原A–H并核版本/适用域；原件、主caller、原始/SDL/TS真值、反控和测试退役映射见[五卡唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。量化初筛只指向重点阅读，不作指标验收。本轮已明确接受16个文件，见唯一回执closedFiles逐项清单；本卡复合/视觉/设计边界仍review，不把整卡升accept/done。

同一3y，唯一Owner Codex；未写主树/GLM原树，94–102不扩展。当前无新产品选择待答；既有用户runtime0/party-slot/战中禁换队/第一阶段999装备边界沿用。本批门以回执integration状态和完整原件为准；不复用历史全仓绿，覆盖率仅大批收尾。

## 范围与停止线

只处理 `packages/game/src/dev/dev-panel.ts` 中场景 picker 的 observer 释放、过滤/关闭后的异步缩略图写回和失败兜底；配套测试只验证这些生命周期合同。保留模块级缩略图缓存与 `DevPanelDeps.renderSceneThumbnail` 现有公共签名，不引入 AbortSignal、不改变场景跳转或 UI 形态，也不接管 CODE53/CODE80 的队伍行为。

## 前提真值门

- 一句话前提：picker 关闭或列表代际替换后，旧 observer 与旧异步结果不得继续操作已失效 DOM；成功结果仍可进入既有共享缓存。
- primary/caller：`packages/game/src/dev/dev-panel.ts:857-877,1153-1278,2044-2050`；唯一生产 caller 是 `packages/game/src/shell/bootstrap.ts:958-966`，其 renderer 在 `bootstrap.ts:725-770` 内部捕获资源失败并返回 `null`。
- 一阶段：Dev Panel 是 DEV-only DOM 调试工具；`IntersectionObserver` 只服务当前 scene list，关闭 picker 后不再有用户可见目标。
- 二阶段：N/A。
- 目标：增加 picker-owned cleanup 与 generation guard，observer 在关闭/重建时断开，旧 promise 不更新旧 DOM；生产 renderer 已将资源失败归一为 `null`，对可注入 callback 的 rejection 也以占位文案收束。

最强替代解释是浏览器移除根节点后会自动释放 observer/回调；可证伪观察是 fake observer 在关闭后仍收到 queued entry，或 deferred renderer 在关闭后仍改变旧图片节点。测试直接控制这两种观察，故不依赖 GC 推断。

## 上下文锚点

- `CLAUDE.md`：第一阶段忠实还原、资源失败与生命周期需直接 caller 证据。
- `docs/ops/agent-workflow.md`：测试必须有真实 caller/oracle、合法输入、隔离与排重；全绿不单独代表 accept。
- `docs/ops/audits/code-quality-governance.md`：P0 资源/异步清理需失败反例，不因短文件或包级绿关闭。
- CODE80：`docs/ops/tasks/CODE-QUALITY-80-dev-party-edit-lifecycle.md` 已登记 listener/observer/thumbnail 风险，本卡只接 observer/thumbnail 子切片。

## 验收条件

1. 每次 picker close 和 scene list rebuild 都 disconnect 当前 observer；关闭后的 queued entry 不启动 thumbnail load。
2. 旧 generation 的 thumbnail 结果不写旧 DOM；成功 URL 可保留在共享 cache，失败/拒绝显示既有 map/scene 占位文本且无悬空 rejection。
3. 当前候选先以 HEAD 原实现重放失败，再在实现后通过；不删除现有业务反例、不降低规则。
4. game typecheck、定向相邻测试、全仓质量门、ratchet、protected fast、lint-zero 和 ledger 均通过后才进入 review。

## 推进记录

Codex：前提已用生产 caller 与 fake observer/deferred renderer 反例核实，build allowed。当前为单一 Coding Owner；不等待历史三签门禁。

## 当前实现/验证

- 修改 `packages/game/src/dev/dev-panel.ts`：picker 保存 owner cleanup；关闭和列表重建断开 observer；以 `sceneGeneration`/`pickerClosed` 阻止旧 queued entry 与旧 Promise 写回 DOM；成功 URL 仍写入既有模块缓存；renderer fulfillment 为 `null` 或 rejection 都回到原占位文案。
- 修改 `packages/game/src/dev/dev-panel.glm-next-wave.test.ts`：afterEach 通过 Close owner handler 收口，不再直接 remove DOM 绕过 cleanup。
- 新增 `packages/game/src/dev/dev-panel-picker-lifecycle.test.ts`：真实 `setupDevPanel` caller、真实 scene-jumps 夹具（scene 1/2/3/4/5/6/9）、hydrated player-role runtime、typed fake `IntersectionObserver` 与 deferred/resolved/null/rejecting thumbnail oracle；5 tests 覆盖 close/cache reopen、filter generation、null placeholder、无 IO 兜底和外部 callback rejection；与 CODE80 队伍业务合同排重。
- HEAD 原实现重放：exit 1，`3 failed / 2 passed`，并出现 1 个未处理 rejection；失败锚点分别是 close disconnect、过滤后的迟到 observer 回调和 rejection placeholder。正式候选恢复后 5/5 通过。
- 反控由隔离 mutation runner 执行并写入 `mutation-runner.json`：`omit-close-disconnect` 与 `reuse-generation-on-filter` 均 exit 1、各 `1 failed / 4 passed`、无未处理错误；每次只改一个精确源片段，记录源 SHA、原始输出、退出码并在 `finally` 恢复源。
- 当前定向验证：5 tests 通过；game typecheck exit 0；Biome 对 3 文件 exit 0。功能性 DOM 生命周期已以 fake observer oracle 验证；不需要剧情 E2E。`pnpm check`、`pnpm coverage:ratchet`、`pnpm check:fast`、lint-zero 和 ledger 均以 exit 0 通过；ratchet 只把新增 5 个测试纳入 fast baseline，未降低阈值或扩大排除。

### 剩余风险与停止线

- `setupDevPanel` 的全局 `window.keydown` listener 仍没有生产 disposer；唯一生产 caller 是 bootstrap 启动一次，是否需要宿主 teardown 尚未有直接重复挂载/卸载 caller 证据，继续保持 pending，不改变 `void` 公共 API。
- 不新增 `AbortSignal` 或修改 bootstrap renderer 公共签名；生产 renderer 已在 bootstrap 内捕获资源失败。共享 thumbnail cache 的跨 picker 保留是既有合同；成功结果在 picker 已关闭时仍缓存，但不再写旧 DOM。
- `packages/game/src/dev/dev-panel.ts` 是 2k+ 行复合 Dev Panel，不能因为本生命周期切片通过就标记整文件已验证；本卡仅收 observer/thumbnail 子合同。既有 `dev-panel.glm-next-wave.test.ts` 仍因历史用例合同尚未逐文件收口而保持待核。

## 下一位 Agent 提示词

无下一位 Agent 提示词；本批可由 Codex 独立验收，新增生命周期测试文件已具备关闭证据，复合生产文件与既有 GLM 测试不得随本卡一并关闭。
