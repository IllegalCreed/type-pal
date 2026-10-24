# 浏览器实测操作手册

Status: current
Validity: current
Owner: Codex（操作指南；每次实测由对应任务Owner负责）
Last reviewed: 2026-10-24
Template: guide-runbook-v1 / 1.0.0

## 目的

让浏览器执行者正确区分Reforge游戏键盘输入、编辑器DOM交互和调试观察，并交出能复核具体场景的证据。此页适用于任何获派执行者；旧“Kimi手册”保留在原文区，不恢复固定席位或旧任务授权。

## 前置条件

- 先读[任务卡与当前分工](../board.md)、[实测启动命令](dev-servers.md)。涉及Reforge时执行[READ-FIRST](../../phase2/READ-FIRST.md)；剧情/E2E遵守[现行合同](../../testing/e2e/contract.md)，预览起点还须核当前NPC状态方案。
- 固定本次候选、engine、project、URL/origin、实际入口和预期结束状态；使用任务允许的当前canonical工程和同引擎检查点。场景直达、调试授物或碎片恢复必须如实标注，不能当作从正常入口完整跑过。
- 确认当前工具确实支持截图和键盘输入。没有可用浏览器/键盘/截图能力时记录该项blocked，保留已完成的静态证据，不编造实际画面或按键结果。

## 步骤

### 1. 选择对应入口

| 目标 | 入口 | 输入方式与边界 |
|---|---|---|
| Reforge PAL运行时 | `pnpm --filter @type-pal/reforge run dev:pal`，6051 | 游戏行动使用键盘；旧`?skill=`/`?battle-trial=`启动参数已在boot入口拒绝 |
| 编辑器 | `pnpm --filter @type-pal/editor run dev`，6010 | 编辑界面使用DOM/鼠标；游戏试玩与编辑表单分开判断 |
| 编辑器同源试玩 | 编辑器“引擎试玩”打开的play页 | 仍是游戏键盘输入；本地工程句柄要求同源，不擅自改到独立6051代替 |
| E2E碎片 | 当前合同允许的`?e2e-load=<save URL>`及场景参数 | 恢复检查点不能证明之前的路线/onEnter已执行；确认实际加载成功后才继续 |

### 2. 发键并确认当前输入层

使用当前浏览器工具的键盘接口或真实按键。移动采用明确的按下/释放，避免把持续held和一次pressed混为一谈；普通点击画布不触发世界互动。

| 键 | 源码支持的用途 | 执行时需核 |
|---|---|---|
| 方向键 | 移动或当前UI选择 | 确认框/商店/结算/菜单/对白按当前层消费，不能假定按键穿透到底层 |
| Space / Enter | 当前层确认、对白推进或探索互动 | 输入路由只交给当前层；脚本/遇敌准备期可占用探索输入 |
| Escape | 取消或探索菜单 | 打开的debug面板会优先消费Esc并关闭面板，不应再判游戏菜单响应 |
| F5 / F9 | 探索输入层的快速保存/读取 | 菜单、对白、脚本等上层占用时，不把无存读动作当成热键失效 |

debug表单获得焦点时会隔离游戏按键。需要验证游戏操作时先退出表单/面板；不要把在命令输入框打字算作向游戏发键。

### 3. 分开视频启动与跳过

当前`video-player.ts`在autoplay被拒时提供“点击屏幕开始”overlay，该点击用于重试播放。默认跳过键为Space/Enter/Escape；旧原稿“点击跳过overlay”的说法不作为当前操作依据。音频也监听pointerdown/keydown尝试解锁，这不等于画布点击具有游戏行动语义。

### 4. 读取观察点并保留现场

- DEV模式下可读`canvas.dataset.rfScene`、`rfRender`、`rfSceneEntry`；先确认字段存在，再记录当前场景、脚本/对白状态、位置和演出层信息。
- `window.__reforge`是现代码暴露的活动态调试对象，`__rfBattle`在相应DEV战斗会话创建；它们用于观察，不代替正常caller，也不据其存在认定战斗或整段路线通过。
- DEV的`window.__tpE2e.dumpSave()`经保存队列取得快照，须等待其结果再写检查点。不要把尚未兑现的Promise当作SavePayload。
- 对同一段保留起点、实际动作、结束状态、必要NPC信息、console/network异常和截图，写回本次任务证据。完整演出比较按E2E合同核，而非只比较时长或一张终态图。

## 失败处理

- “点击画布不动”先检查当前目标是否为游戏、键盘焦点及当前输入层；编辑器按钮无响应则核DOM目标，不混用两套交互判断。
- `e2e-load`失败会记录警告并落回当前入口新局；页面还能运行不能证明碎片已恢复。发现该警告、project/version不符或结束状态不符时停止相关E2E结论。
- DEV观察点缺失先核构建模式和初始化；浏览器能力缺失、未知来源存档、未授权产品取舍或真实视觉冲突交对应Owner处理。保留失败，不改断言/数据来制造通过。

## 完成定义

本次执行有固定候选和输入、可重现动作、实际可见结果与机读状态、完整异常及未跑项，并写回对应task/evidence；独立验收与用户观感按任务范围继续。只核本页源码、模板和链接不能算runtime/E2E/视觉/coverage通过。

## 历史范围

下方保留`f4c664a8cf0dd564f68857b393861f553e35c73f`时点的旧Kimi操作手册。R35泛化封套与“phase2/lore archive”误标签不再作为当前操作正文；它们的旧字节和信用撤回由Git与既有review保留。

## 原始结论

原稿区分游戏键盘、编辑器鼠标、debug混合输入，并列旧端口、快捷键和观察点。原稿的点击跳过说法已按当前视频实现限缩，不能连同旧工具方法整体升格为本次实测结果。

## 当时证据

原稿没有本轮浏览器回执。本次仅全文阅读该页与固定原源，定向核`input.ts`、`runtime-input-router.ts`、视频/debug/启动与观察代码；未启动服务、未操作浏览器、未运行产品测试。

## 当前有效性

current指本文操作路由与已静态核实的输入边界。具体功能、视觉和E2E是否通过仍由指定候选的实际证据决定；后续caller/快捷键/启动协议变化须同步本文。

## 继任文档

本页取代R35泛化正文；任务授权取[AGENTS](../../../AGENTS.md)与[工作流](../agent-workflow.md)，实测结果回到[证据目录](../evidence/README.md)，E2E事实取阶段报告与配对机器证据。

## 原文保全

固定source revision `f4c664a8cf0dd564f68857b393861f553e35c73f`、SHA `d5479df81b63ac30b36e0ed5f2541b6eca9895adb7bd3442299988629dde4a8a`。下方marker到文件末尾沿用本次基点的原始字节；历史结论不被改写。

<!-- original-source-quote:start -->
> # Kimi 浏览器实测操作手册
>
> > 给 Kimi（视觉验收 / 浏览器实测）的操作手册。**最重要的提醒：reforge 游戏本体是纯键盘
> > 操作，鼠标点击游戏画布没有任何输入作用**——实测游戏请用键盘事件（CDP 注入 / 真实按键），
> > 不要用鼠标点画布。编辑器（6010）才是鼠标 UI。
>
> ## 1. 环境与入口
>
> | 目标 | 命令 / URL | 说明 |
> |---|---|---|
> | 游戏 dev | `pnpm --filter @type-pal/reforge dev:pal` → `http://localhost:6051` | 可加参数：`?debug`（调试面板）、`?scene=s001`、`?pos=col,row`、`?battle=0`、`?give=144`。旧 `?skill=` 启动已被拒绝，请从 `?debug` 面板的 `skill` 命令或编辑器战斗模拟器授技 |
> | 编辑器 | 另起 `pnpm --filter @type-pal/editor dev`（6010） | **鼠标 UI**；浏览/编辑工程用这个 |
> | 编辑器试玩页 | `play.html?project=pal`（6010 同源） | 从编辑器「引擎试玩」打开，**游戏本体，键盘操作** |
> | 分段 e2e | `?e2e-load=<save.json url>&e2e-load-scene=<id>` | 秒进碎片起点（跳过 onEnter），D28 最终验证路径 |
>
> ## 2. 游戏键位速查（reforge 运行时）
>
> | 键 | 作用 |
> |---|---|
> | `↑ ↓ ← →` | 移动 / 菜单选择 / 存档浏览光标 |
> | `Space` / `Enter` | 互动、确认、对话推进（打字中按 = 整行瞬显；翻完 = 下一页 / 关闭） |
> | `Escape` | 菜单 / 取消 / 返回（对话、商店、菜单通用） |
> | `F5` | 快速存档 |
> | `F9` | 快速读档（快速槽） |
>
> **鼠标在游戏画布上无输入作用。** 例外仅三处：① autoplay 解锁（pointerdown 监听，任意点击）；
> ② 视频播放的「点击跳过」overlay；③ `?debug` 面板（DOM UI，表单可用鼠标）。
>
> ## 3. 浏览器实测手法（给 Kimi）
>
> - **键盘事件注入**：用 CDP `Input.dispatchKeyEvent`（或真实按键）模拟键位，不要 `click` 画布。
> - **机读观察点**：
>   - `canvas.dataset.rfScene` / `rfRender` / `rfSceneEntry` —— 当前场景 / 演出态机读。
>   - `window.__reforge` —— 活动态暴露（battle 有 `__rfBattle`）。
>   - `window.__tpE2e.dumpSave()` —— 取当前世界 SavePayload，落 e2e-checkpoints。
> - **验证分镜/演出**：按 D28 走分段 e2e（`?e2e-load` 秒进 + 键盘流程 + dumpSave 断言）；
>   视觉抽验 = 键盘走完整段 + 截图，不逐帧并排。
> - **对话 / 菜单流程**：Space/Enter 推进、Escape 返回；多页对话 Space 翻页。
>
> ## 4. 调试面板 `?debug`（D13-1）
>
> - 打开：URL 加 `?debug`（裸参即可，`params.has('debug')`）。
> - **面板是 DOM UI，鼠标可用**（命令输入、战斗构建器表单、图层开关）。
> - 面板打开后游戏本体仍键盘操作；表单字段获得焦点时吞游戏键；`Esc` 只关面板（不触游戏菜单）。
> - 常用：`battle <team>` 直开战斗、`give <itemId> [n]` 塞道具、`scene <id>` 跳场景、
>   `run-script <id>` / `run-trigger <entityId>` 触发脚本、`step` 帧步进。
>
> ## 5. 常见键盘流程样例
>
> - **开场**：新游戏 → 开场视频（可点击跳过）→ 对话 Space 推进 → 房间可操控（方向键走）。
> - **遇敌**：走向明雷实体（hostile）触发战斗；战斗内方向键选指令、Space/Enter 确认。
> - **对话翻页**：连按 Space 到底，最后一页关闭；`~NN` 尾停顿不可加速（等待自动推进）。
> - **战斗胜利结算**：结算屏自动播放，Space 可跳过等待。
>
> ## 6. 关键纪律
>
> - 游戏 = 键盘；编辑器 = 鼠标；`?debug` 面板 = 鼠标 + 键盘混合。
> - 别用鼠标点画布找交互（没有）；别把「点击无反应」当 bug。
> - 演出段验证走分段 e2e；视觉抽验截图存 `output/` 并写卡。

<!-- original-source-quote:end -->
