# Kimi 浏览器实测操作手册

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: guide-runbook-v1 / 1.0.0

本页把历史材料接入 `guide-runbook-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目的

- 读者和完成后得到的结果：按当前 ops guide/runbook 完成 Current ops guide/runbook; preserve purpose, prerequisites, steps, failure handling, stop line and completion evidence.。

## 前置条件

- 权限、输入、版本和安全边界：以当前 AGENTS、ops workflow、任务卡和仓库入口为准。
- 当前执行前必须确认：工具、版本、数据路径、Owner 和用户授权。

## 步骤

1. 先读取当前入口、前置条件和本页适用范围。
2. 按步骤执行并把结果写回当前 task/evidence 入口。
3. 对失败、边界和人工接管保留可复核证据。

## 失败处理

- 可预期失败：- （无新增；历史边界保持开放）
- 停止线：follow current repository routes and ownership; do not use historical instructions as current authorization
- 回滚/人工接管：停止当前操作，保留日志并交当前 Owner 裁决。

## 完成定义

- 可观察的完成条件：步骤结果、证据路径、Owner 和下一步均已写回。
- 证据路径与复核人：本页、当前 task card、evidence receipt 和 Codex 独立复核。

## 历史范围

- phase2/lore archive；日期：undated；固定来源 `f4c664a8cf0dd564f68857b393861f553e35c73f`；source SHA `d5479df81b63ac30b36e0ed5f2541b6eca9895adb7bd3442299988629dde4a8a。

## 原始结论

- Kimi 浏览器实测操作手册：这是 guide-runbook，当前文档状态为 current。全文 60 行、7 个标题；摘要/首段为「> 给 Kimi（视觉验收 / 浏览器实测）的操作手册。**最重要的提醒：reforge 游戏本体是纯键盘」。属于现行文档范围，使用时受本记录的证据与未决项约束。

## 当时证据

- 原始标题/章节/HTML artifact 在 quote 或 artifact envelope 中保全。

## 当前有效性

historical。follow current repository routes and ownership; do not use historical instructions as current authorization
- 历史冲突/未决：
- （无新增；历史边界保持开放）

## 继任文档

- Current AGENTS/ops workflow, task cards and current project evidence.。
- 当前事实由继任规范、代码、测试和新的 review 决定。

## 原文保全

固定源 SHA `d5479df81b63ac30b36e0ed5f2541b6eca9895adb7bd3442299988629dde4a8a`；下方 quote 可逆回原始 UTF-8 字节。
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
