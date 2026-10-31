# CODE3r event-system 当前复审切片

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE3r 事件解释器与脚本生命周期的当前复审切片（基点 8dfffb1b880429b6d4caf55aaa36020f49ec4ddf，分支 codex/code-quality-3y）：重新复审不把历史 done、旧测试数量或旧全仓门当作当前整卡验收；3r 当前复审提升为 partial，未标 accept/done。证据原件为下方逐字节保全的固定main源；读域明细见同目录 read-boundaries.json（11 全文 + 8 区间）。

## 来源与输入

完整读取 event-system.ts（5,117 行）与 event-system.test.ts（5,974 行），并完整读取 K01/K02/K03、control-flow、state-opcodes、dialogue-pagination 相邻合同、cross-module-boundaries.test.ts、mode.test.ts、scene-system-search.test.ts。按职责段核对 mode.ts、scene-system.ts、bootstrap.ts、menu-driver.ts 的真实调用与 ownership；scene-system.ts 与其主测试的完整文件证据沿用 3q 当前复审，不把其历史 done 当作本片新验收。primary source 核对 reference/sdlpal/script.c 的移动、解释、raw opcode、trigger/autoScript、dialog/wait、scene/battle 入口区间，play.c:56-238 的进入场景/触发/autoscript/追逐调度，scene.c:779-930 的队伍/NPC 步进与帧推进，以及 global.h:75-121,512-531 的对象、场景和全局 ownership。来源为固定Git载体,非本次运行;原0个链接处置见作者review的linkDisposition。当前存活入口:无当前仓库内存活链接。

## 断言与业务 oracle

核对轴包括 global ip 与 label fallback、call/end/resume、waiting 与同帧推进、dialog/fade/modal 收尾、sceneLoading/reload failure、battle/menu handler 注入、raw opcode 的 self/pCurrent/1-based object 域、移动/镜头/trail、item/poison 状态辅助与异步清理。结论：未发现能由 primary source + 真实 caller 证实的新 direct defect；没有修改 event-system.ts、测试实现、脚本格式、schema/save、公共接口、生成物或用户可见行为。保留的未知/风险：剧情视觉与 E2E、全仓既有运行时诊断归因、battle-opcodes 全文件和 save/schema 仍由其它范围或后续稳定窗口处理；历史注释中的「旧全仓全绿」不作为本轮门禁。文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

验证：pnpm --filter @type-pal/game test 命令实际覆盖 321 files / 3,619 tests passed，无失败/跳过/CLI stderr；pnpm --filter @type-pal/game typecheck 通过。为遵守小批成本边界，本片未运行 coverage ratchet、protected fast、全仓 pnpm check 或官方 coverage；因此不声称统一质量门通过。后续文档/lint/ledger 门只验证治理记录完整性与静态规则，不替代整仓 runtime/E2E/coverage 收口。

## 限制与复核

高风险边界：本片触及第一阶段事件解释器、脚本控制流、场景/战斗/menu 接回和异步等待所有权；没有越界实现或改写机制。下一批候选为仍 pending 的独立 game core 文件，继续避开活跃 CODE53/79/80/81/90、94–102/editor 与任何同实现文件 Coding Owner。未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2746B / SHA-256 1c1bac8f896ddc84175ab5e289a2797cf1a55ad23fe32df8ce6568e73a345dbe；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE3r event-system 当前复审切片

基点：`8dfffb1b880429b6d4caf55aaa36020f49ec4ddf`；分支：`codex/code-quality-3y`。本片重新复审 event-system 解释器与脚本生命周期，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。3r 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/core/event-system.ts`（5,117 行）与 `event-system.test.ts`（5,974 行），并完整读取 K01/K02/K03、control-flow、state-opcodes、dialogue-pagination 相邻合同、`cross-module-boundaries.test.ts`、`mode.test.ts`、`scene-system-search.test.ts`。按职责段核对 `mode.ts`、`scene-system.ts`、`bootstrap.ts`、`menu-driver.ts` 的真实调用与 ownership；读取 `scene-system.ts` 与 `scene-system.test.ts` 的完整文件证据沿用 3q 当前复审，不把其历史 done 当作本片新验收。

primary source 核对 `reference/sdlpal/script.c` 的移动、解释、raw opcode、trigger/autoScript、dialog/wait、scene/battle 入口区间，`play.c:56-238` 的进入场景/触发/autoscript/追逐调度，`scene.c:779-930` 的队伍/NPC步进与帧推进，以及 `global.h:75-121,512-531` 的对象、场景和全局 ownership。核对轴包括 global ip 与 label fallback、call/end/resume、waiting 与同帧推进、dialog/fade/modal 收尾、sceneLoading/reload failure、battle/menu handler 注入、raw opcode 的 self/pCurrent/1-based object 域、移动/镜头/trail、item/poison 状态辅助与异步清理。

未发现能由 primary source + 真实 caller 证实的新 direct defect；没有修改 `event-system.ts`、测试实现、脚本格式、schema/save、公共接口、生成物或用户可见行为。保留的未知/风险：剧情视觉与 E2E、全仓既有运行时诊断归因、battle-opcodes 全文件和 save/schema 仍由其它范围或后续稳定窗口处理；历史注释中的“旧全仓全绿”不作为本轮门禁。

验证：`pnpm --filter @type-pal/game test`（命令实际覆盖 `321 files / 3,619 tests passed`，无失败/跳过/CLI stderr）；`pnpm --filter @type-pal/game typecheck` 通过。为遵守小批成本边界，本片未运行 coverage ratchet、protected fast、全仓 `pnpm check` 或官方 coverage；因此不声称统一质量门通过。后续文档/lint/ledger 门只验证治理记录完整性与静态规则，不替代整仓 runtime/E2E/coverage 收口。

高风险边界：本片触及第一阶段事件解释器、脚本控制流、场景/战斗/menu 接回和异步等待所有权；没有越界实现或改写机制。下一批候选为仍 pending 的独立 game core 文件，继续避开活跃 CODE53/79/80/81/90、94–102/editor 与任何同实现文件 Coding Owner。
```
<!-- incremental-original-source:end -->
