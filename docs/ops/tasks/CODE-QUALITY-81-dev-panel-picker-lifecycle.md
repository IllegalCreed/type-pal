# CODE-QUALITY-81 — game Dev Panel picker 生命周期

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-81 — game Dev Panel picker 生命周期」的任务归属与历史边界。原目标见原文(摘录:> 2026-10-20本次正式验收：本卡既定合同已由Codex接受并收口，见[pre94收口裁定](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/complet);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-81 — game Dev Panel picker 生命周期、2026-10-20 当前验收、范围与停止线、前提真值门、上下文锚点、验收条件],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源8314B(SHA c9d5de685e6f);原卡前提按原时点保留。当前存活入口:[completion.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json)、[README.md](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-81 — game Dev Panel picker 生命周期的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[completion.json](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json)、[README.md](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 8314B / SHA-256 c9d5de685e6fa81046faa25f97f32e9601b6c64fb11b2e9d18120c48633329c0；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-81 — game Dev Panel picker 生命周期

> 2026-10-20本次正式验收：本卡既定合同已由Codex接受并收口，见[pre94收口裁定](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/completion.json)。当前done只覆盖下述原卡范围，不把共享大文件或其它卡自动关闭；旧pending/review/失败按历史时点保留。

Status: done
Owner: Codex
Phase: phase1 game
Capability: Q3 dev picker resource ownership
Visual Verification Timing: functional-minimal

## 2026-10-20 当前验收

旧picker原件按同执行代码及selector-only变化复用；page单次装配Owner已证，不改voidAPI；旧check:fast伪protected信用已撤，复合Dev模块仍review。

18份本轮文件记录分别列A–H，广域上下文复用原A–H并核版本/适用域；原件、主caller、原始/SDL/TS真值、反控和测试退役映射见[五卡唯一入口](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。量化初筛只指向重点阅读，不作指标验收。此前16个具体文件接受维持；本卡范围/逐项验收和保留边界已据证核定，现正式done。共享复合文件与其它卡按原范围继续review。

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


## 2026-10-20 原卡合同正式收口

picker observer释放、列表代际、迟到异步结果及失败占位。原五项真实setup、受控observer/deferred IO合同和两项精确业务反控与当前执行代码仍匹配；关闭/重建disconnect、旧回调不加载、旧DOM不写回、成功缓存保留、null/reject占位与无悬空拒绝均成立。生产renderer负责IO失败归一，main单次安装；测试自有监听清理完整。当前43项Dev回归与真实全仓门均零诊断。

保留范围：页面级监听按单宿主生命周期保留，不擅增公共卸载API；共享缓存跨picker保留是既有合同。整份Dev文件仍review，本卡仅接收observer/thumbnail功能合同，不引申为剧情或美术全验收。

Owner/Reviewer Codex。本轮核对原卡验收条件、有效八维记录与实际原件，复用仍匹配的审查和测试；当前产品及测试源码相对ea9c3cc02没有变化。文档/索引/账本门本次另实跑，见completion.json.checks。无下一位Agent提示词，Codex继续剩余pre94。
```
<!-- incremental-original-source:end -->
