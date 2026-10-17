# CODE42 dialog-box 当前复审切片

基点：`d6bd5caad`；分支：`codex/code-quality-3y`。本片重新复审历史 42 的对话框实现与两份直接测试，不把历史 done、旧测试数量或旧全仓门当作当前整卡验收。42 当前复审提升为 `partial`，未标 accept/done。

完整读取 `packages/game/src/present/dialog-box.ts`（958 行）、`dialog-box.test.ts`（761 行）和 `dialog-box.glm-next-wave.test.ts`（84 行）；核对 event-system/dialog/menu/present caller、framebuffer/font/draw-box 资源入口，以及 SDLPal `reference/sdlpal/text.c:1208-1815`、`uigame.c:878-930`。核对轴包括控制符消费/颜色与速度状态、title/portrait/layout、分页/结束/Confirm/userSkip、墙钟打字、`~NN`、key icon、narration/item-box 绘制、opaque mask、缺资源降级和状态清理所有权。

本片发现并修复一个直接行为偏差：SDLPal `TEXT_DisplayText(..., isDialog=TRUE)` 的 narration/center-window 路径跳过 `~NN` 尾暂停，TS 原先无条件把尾暂停加入 `doneAt`。先加入失败反例（旧实现 `A~40` 为 481ms，期望 24ms），再将尾暂停限定为 `!isDialog`；普通 bottom 对话的 `~NN` 等待合同保留。没有改变公共接口、脚本格式、存档、UI 形态或生成物。

验证：定向 `dialog-box.test.ts` + `dialog-box.glm-next-wave.test.ts` 为 2 files / 83 tests passed；game typecheck 通过。相邻 event-dialogue/present 回归为 4 files / 97 tests passed；`dialog-box-pixels.grok-r1.test.ts` 另有 1 条因当前 Vitest 无 `document` 环境失败（`ReferenceError: document is not defined`），保留诊断，不改环境配置、不静音。coverage ratchet、protected fast、全仓 `pnpm check` 和官方 coverage 按用户成本边界未运行。

高风险边界：对话框是第一阶段用户可见呈现层；本片只修有 SDLPal 直接证据的 narration timing，不扩大脚本语义、UI 形态、save/schema、资产管线或公共接口。下一批继续选择不与活跃任务重叠的 pre-94 pending 文件。
