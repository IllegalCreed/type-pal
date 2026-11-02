# CODE-QUALITY-81 picker 生命周期证据

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-81（Dev Panel 场景 picker 资源生命周期）证据目录的索引页。本批只收第一阶段 game Dev Panel 场景 picker 的资源生命周期,不把 dev-panel.ts 复合文件宣称为整文件已审,也不修改 DevPanelDeps.renderSceneThumbnail 公共签名;任务卡 docs/ops/tasks/CODE-QUALITY-81-dev-panel-picker-lifecycle.md 现为 done。证据原件即下方逐字节保全的固定main源(3769B,SHA 8fab5daf5a98)。

## 来源与输入

来源为固定Git载体,非本次运行;原1个链接处置见作者review的linkDisposition。当前存活入口:[README.md](../QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。真实内容:

- 生产 caller: bootstrap.ts:958-966 只在启动时装配 setupDevPanel;bootstrap.ts:725-770 的 renderSceneThumbnail 已捕获资源失败并返回 null。
- 实现边界: dev-panel.ts:857-877 创建 picker owner cleanup;:1195-1217 处理 generation、缓存与 Promise rejection;:1227-1260 重建/消费 observer;:2072-2081 关闭时释放 owner cleanup。
- 测试 caller/oracle: dev-panel-picker-lifecycle.test.ts 经公开 setupDevPanel、真实 scene-jumps.json(scene 1/2/3/4/5/6/9)、hydrated runtime、typed fake IntersectionObserver 与 deferred/resolved/null/rejecting renderer 验证 close/cache reopen、filter 迟到结果、null placeholder、无 IO 兜底与外部 callback rejection。
- 命令回执: 定向 1 file/5 tests exit0(gate-targeted.txt);game typecheck exit0;biome 三文件无诊断。
- 失败基线: HEAD 原实现重放 exit1、3 failed/2 passed 并出现1个未处理 rejection,失败落在 close disconnect、过滤后迟到 observer 回调与 rejection placeholder(baseline-original.txt)。
- mutation-runner.json: omit-close-disconnect 与 reuse-generation-on-filter 两突变各 exit1、1 failed/4 passed、无未处理错误(失败断言分别在 :174 disconnectCalls 与 :236 render 调用次数),finally 恢复后 5/5 通过。
- 质量门: pnpm check exit0(game 314/3548;lint 4008 files 0/0/0);coverage:ratchet exit0(fast baseline 只纳入新增5测试,覆盖率只升不降);pnpm check:fast(历史误标为 protected fast,2026-10-20撤回该身份,仅普通 check:fast)exit0;ledger 3269 tracked/339 closed/10 review/2920 pending。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。本轮核读 mutation-runner.json 确认两突变失败身份与计数;README 数字(5 tests/314 files/4008 files/3269 ledger)与其门日志记载一致,exit0 不外推为零诊断或产品通过。2026-10-20复审:page 全局监听的生产 Owner 由 main.ts 互斥启动分支→bootstrap 单次装配证明;没有宿主重复装卸 caller,不以公开 disposer 扩张 API;picker 旧反控按相同执行代码/测试身份复用,详情见五卡复审(存活链接如上)。旧门原始输出不改写,新的真实 protected 门在五卡收尾独立记录。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把实现边界、失败基线、两突变身份与门状态写回可见正文,不重开任务、不重跑执行。不产生新执行结果。

## 限制与复核

边界: 成功缩略图仍写模块级共享缓存;未新增 AbortSignal、全局 listener disposer 或 bootstrap teardown(需真实宿主重复装配/卸载证据,继续 pending);功能性 DOM 生命周期最小验证完成,剧情视觉未跑 E2E;CODE80 浏览器视觉验证单独 pending。未重跑原命令;历史结论保持原时点;候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3769B / SHA-256 8fab5daf5a989846ac4ec37f27c7086ed88bb3b560948142119becccee5bac11；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
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
- `pnpm check:fast`（历史误标为 protected fast；2026-10-20撤回该身份，仅普通check:fast）：exit 0；workspace typecheck、全包测试与 lint-zero 全通过，详见 `gate-protected-fast.txt`。
- ledger 当前机器计数：3,269 tracked；339 closed / 10 review / 2,920 pending。

## 边界

- 成功缩略图仍写入既有模块级共享缓存，避免跨 picker 重复渲染。
- 没有新增 AbortSignal、全局 listener disposer 或 bootstrap teardown；这些需要真实宿主重复装配/卸载证据，继续留 pending。
- 功能性 DOM 生命周期已完成最小验证；剧情视觉按仓库规则不在本批运行 E2E。CODE80 的浏览器视觉验证仍单独 pending。


2026-10-20复审：page全局监听的生产Owner由 main.ts 互斥启动分支→bootstrap单次装配证明；没有宿主重复装卸caller，不以公开disposer扩张API。picker旧反控按相同执行代码/测试身份复用，详情见[五卡复审](../QUALITY-PRE94-RETROSPECTIVE-1/five-cards/README.md)。旧门原始输出不改写，新的真实protected门在五卡收尾独立记录。
```
<!-- incremental-original-source:end -->
