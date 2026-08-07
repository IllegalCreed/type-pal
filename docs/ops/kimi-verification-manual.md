# Kimi 浏览器实测操作手册

> 给 Kimi（视觉验收 / 浏览器实测）的操作手册。**最重要的提醒：reforge 游戏本体是纯键盘
> 操作，鼠标点击游戏画布没有任何输入作用**——实测游戏请用键盘事件（CDP 注入 / 真实按键），
> 不要用鼠标点画布。编辑器（6010）才是鼠标 UI。

## 1. 环境与入口

| 目标 | 命令 / URL | 说明 |
|---|---|---|
| 游戏 dev | `pnpm --filter @type-pal/reforge dev:pal` → `http://localhost:6051` | 可加参数：`?debug`（调试面板）、`?scene=s001`、`?pos=col,row`、`?battle=0`、`?give=144`、`?skill=…` |
| 编辑器 | 另起 `pnpm --filter @type-pal/editor dev`（6010） | **鼠标 UI**；浏览/编辑工程用这个 |
| 编辑器试玩页 | `play.html?project=pal`（6010 同源） | 从编辑器「引擎试玩」打开，**游戏本体，键盘操作** |
| 分段 e2e | `?e2e-load=<save.json url>&e2e-load-scene=<id>` | 秒进碎片起点（跳过 onEnter），D28 最终验证路径 |

## 2. 游戏键位速查（reforge 运行时）

| 键 | 作用 |
|---|---|
| `↑ ↓ ← →` | 移动 / 菜单选择 / 存档浏览光标 |
| `Space` / `Enter` | 互动、确认、对话推进（打字中按 = 整行瞬显；翻完 = 下一页 / 关闭） |
| `Escape` | 菜单 / 取消 / 返回（对话、商店、菜单通用） |
| `F5` | 快速存档 |
| `F9` | 快速读档（快速槽） |

**鼠标在游戏画布上无输入作用。** 例外仅三处：① autoplay 解锁（pointerdown 监听，任意点击）；
② 视频播放的「点击跳过」overlay；③ `?debug` 面板（DOM UI，表单可用鼠标）。

## 3. 浏览器实测手法（给 Kimi）

- **键盘事件注入**：用 CDP `Input.dispatchKeyEvent`（或真实按键）模拟键位，不要 `click` 画布。
- **机读观察点**：
  - `canvas.dataset.rfScene` / `rfRender` / `rfSceneEntry` —— 当前场景 / 演出态机读。
  - `window.__reforge` —— 活动态暴露（battle 有 `__rfBattle`）。
  - `window.__tpE2e.dumpSave()` —— 取当前世界 SavePayload，落 e2e-checkpoints。
- **验证分镜/演出**：按 D28 走分段 e2e（`?e2e-load` 秒进 + 键盘流程 + dumpSave 断言）；
  视觉抽验 = 键盘走完整段 + 截图，不逐帧并排。
- **对话 / 菜单流程**：Space/Enter 推进、Escape 返回；多页对话 Space 翻页。

## 4. 调试面板 `?debug`（D13-1）

- 打开：URL 加 `?debug`（裸参即可，`params.has('debug')`）。
- **面板是 DOM UI，鼠标可用**（命令输入、战斗构建器表单、图层开关）。
- 面板打开后游戏本体仍键盘操作；表单字段获得焦点时吞游戏键；`Esc` 只关面板（不触游戏菜单）。
- 常用：`battle <team>` 直开战斗、`give <itemId> [n]` 塞道具、`scene <id>` 跳场景、
  `run-script <id>` / `run-trigger <entityId>` 触发脚本、`step` 帧步进。

## 5. 常见键盘流程样例

- **开场**：新游戏 → 开场视频（可点击跳过）→ 对话 Space 推进 → 房间可操控（方向键走）。
- **遇敌**：走向明雷实体（hostile）触发战斗；战斗内方向键选指令、Space/Enter 确认。
- **对话翻页**：连按 Space 到底，最后一页关闭；`~NN` 尾停顿不可加速（等待自动推进）。
- **战斗胜利结算**：结算屏自动播放，Space 可跳过等待。

## 6. 关键纪律

- 游戏 = 键盘；编辑器 = 鼠标；`?debug` 面板 = 鼠标 + 键盘混合。
- 别用鼠标点画布找交互（没有）；别把「点击无反应」当 bug。
- 演出段验证走分段 e2e；视觉抽验截图存 `output/` 并写卡。
