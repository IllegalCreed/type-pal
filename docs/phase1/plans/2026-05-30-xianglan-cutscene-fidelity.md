# 丁香兰报信 cutscene 演出保真 — workflow 深查结论(2026-05-30)

Status: historical
Validity: historical
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: plan-status-v1 / 1.0.0

本页把 phase1 历史计划/审计接入 `plan-status-v1`，并追加 `archive-record-v1` 历史边界。原始日期、阶段词、数字、冲突、未知和链接在 quote 中保全；本页不授当前实现、runtime、E2E、视觉或 coverage 信用。

## 目标与时间范围

- 历史目标：Xianglan cutscene fidelity investigation: symptom, workflow/code path comparison, runtime diagnostic evidence, failed fixes, cautious architecture-level repair direction, and user-confirmed resolution record.
- 日期：2026-05-30；source revision `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `06ec22dea6d79a298b59f4c3711f7dcc66ac7aa543a2a924b10a8eb9c6e2f606`。

## 里程碑

- 原始章节：核心结论(workflow wu18hkqzg,5 路逐行核对 sdlpal vs ts)；瞬移真因(高 confidence,架构层)；一口气无顿(高 confidence)；下一步(systematic-debugging:先取运行期证据)；关键 file:line；注；运行期证据 + 真根因(2026-05-30 晚,diag log 实测)；失败的修法(勿重蹈)。
- Task、checkbox、命令和 self-review 只保留为历史证据。

## 当前状态

- historical；丁香兰报信 cutscene 演出保真 — workflow 深查结论(2026-05-30)：这是 plan-status，当前文档状态为 historical。全文 72 行、11 个标题；摘要/首段为「症状(余杭镇 wNumScene5 enter=903 cutscene):香兰**瞬移到玩家面前**(应从远处走来);**一口气说完无顿**(说完该顿)。」。属于历史/归档材料，不能单独证明当前实现。

## 阻塞与决策

- 正文信号 58:## 正确修法方向(待做,架构层,需谨慎)
- 停止线：do not promote historical claims to current truth without a current source or user decision

## 下一步

- 后继入口：Current runtime diagnostics and cutscene implementation/tests; any repair needs a fresh primary-source/runtime review.。
- 若重新执行须新 task card、当前 source/oracle 和独立验收。

## 历史范围

- phase1 archive plan/audit；日期：2026-05-30；固定来源 `45d890e4ce3862aeac9c54eef2d7d18a32032cee`；source SHA `06ec22dea6d79a298b59f4c3711f7dcc66ac7aa543a2a924b10a8eb9c6e2f606`。

## 原始结论

- 丁香兰报信 cutscene 演出保真 — workflow 深查结论(2026-05-30)：这是 plan-status，当前文档状态为 historical。全文 72 行、11 个标题；摘要/首段为「症状(余杭镇 wNumScene5 enter=903 cutscene):香兰**瞬移到玩家面前**(应从远处走来);**一口气说完无顿**(说完该顿)。」。属于历史/归档材料，不能单独证明当前实现。

## 当时证据

- 标题锚点：1:丁香兰报信 cutscene 演出保真 — workflow 深查结论(2026-05-30); 5:核心结论(workflow wu18hkqzg,5 路逐行核对 sdlpal vs ts); 9:瞬移真因(高 confidence,架构层); 16:一口气无顿(高 confidence); 20:下一步(systematic-debugging:先取运行期证据); 31:关键 file:line; 40:注; 46:运行期证据 + 真根因(2026-05-30 晚,diag log 实测)；原始正文、代码、表格、状态词在 quote 保全。

## 当前有效性

historical。do not promote historical claims to current truth without a current source or user decision
- 历史冲突/未决：
- 正文信号 58:## 正确修法方向(待做,架构层,需谨慎)

## 继任文档

- Current runtime diagnostics and cutscene implementation/tests; any repair needs a fresh primary-source/runtime review.。
- 当前事实由继任规范、代码和新的 review 决定。

## 原文保全

固定源 SHA `06ec22dea6d79a298b59f4c3711f7dcc66ac7aa543a2a924b10a8eb9c6e2f606`；quote 中用 `␠` 表示原始行尾空格、`⇥` 表示原始行尾 tab；逆向解码后必须得到相同 UTF-8 字节。
<!-- original-source-quote:start -->
> # 丁香兰报信 cutscene 演出保真 — workflow 深查结论(2026-05-30)
>
> 症状(余杭镇 wNumScene5 enter=903 cutscene):香兰**瞬移到玩家面前**(应从远处走来);**一口气说完无顿**(说完该顿)。
>
> ## 核心结论(workflow wu18hkqzg,5 路逐行核对 sdlpal vs ts)
>
> **走入机制 / 0x12 摆位 / 0x05 等键顿 / autoScript 调度 —— ts 全部 1:1 对齐 sdlpal,无代码 divergence。** 真因在上游:
>
> ### 瞬移真因(高 confidence,架构层)
> - 0x12 setObjectPosRelParty 把香兰摆到 `(party.x-128, party.y+56)`(event-system.ts:2474,对齐 sdlpal script.c:710-713,公式对)。
> - autoScript 886 = `0x10 NPCWalkTo` 到**绝对 tile (54,86)=px(1728,1376)**。
> - snap 条件是 **OR**:`|dx|<speed*2(=6) || |dy|<6`(sdlpal script.c:81,ts event-system.ts:3629 一致)。
> - → 只要进场时 **party.y∈[1315,1325] 或 party.x∈[1851,1861]**,第 1 步就整体 snap 到目标 = 瞬移。即便不 snap,12 帧 wait 最多走 ~72px(2 tile),起点错就观感"凭空冒出"。
> - **party 进入 scene5 的世界坐标是错的**:ts 无世界地图边界过场重定位(grep boundary/edge 0 命中);scene5 enter 链(903+886)无 setPartyPos;dev scene-jump scene-5 无 partyStart(scene-jumps.json + dev-panel.ts:759-766,注释自承"走 wScriptOnEnter 设位置"但 903 不设)。party 停在上个场景残留坐标。
>
> ### 一口气无顿(高 confidence)
> - 0x05 等键"顿"**逻辑已对齐 sdlpal 且实证生效**(逐 tick 模拟:913 处 waiting='dialog' 无限等 Confirm;event-system.ts:1571-1577 ↔ sdlpal text.c:1770 PAL_ClearDialog(TRUE)→PAL_DialogWaitForKey 永久等)。910/911/912 三正文行自动连播(<4 行不翻页)= sdlpal 真值。
> - → "无顿"几乎肯定是**瞬移的副产物**或**输入侧 held 键在 913 那 tick 误 page-advance**(event-system.ts:1145 只认 'Confirm';查 shell input 物理键映射 + 去抖)。非 0x05 handler 错。
>
> ## 下一步(systematic-debugging:先取运行期证据)
> 1. **加临时 log** 确认进场 party.x/y 是否落 snap 窗口 + 913 那 tick input.pressed:
>    - event-system.ts:2459 OP_SET_OBJECT_POS_REL_PARTY:加打 `party.x/y`。
>    - event-system.ts:~958 autoScript walk 分支(gate npc.id===83):打 target/current/dx/dy/arrived。
>    - event-system.ts:1145 0x05 等键:打 `[...input.pressed]`。
> 2. 用户新游戏复跑 cutscene,贴 log。
> 3. 按 log 定位修:
>    - **#1 根因**:scene5 进场 party 坐标。A(治本)实现世界地图边界过场重定位(大 task,架构优先);B(立即验)scene-jumps.json scene-5 补 partyStart(查 sdlpal 余杭镇拓扑/walkthrough 真入口 tile)。
>    - **#2 防御**:0x12 toInt16 → 完整 16-bit SHORT 截断(本 scene party.x<65000 不触发,非根因,可选)。
>    - **#3 若 log 证实输入误触发**:收紧 0x05 输入门(shell input 映射)。
>
> ## 关键 file:line
> - snap OR:sdlpal script.c:81-85;ts event-system.ts:3629
> - 0x12 摆位:sdlpal script.c:710-713;ts event-system.ts:2474-2475
> - 0x10 walk speed3 步进 ±6/±3:sdlpal scene.c:887-888;ts event-system.ts:939-966 / 3636-3639
> - wScriptOnEnter 同步跑 + 0x09 内 autoScript:sdlpal play.c:56-76 / 172-192 / script.c:3354-3368
> - 0x05 等键:sdlpal script.c:3267-3297 + text.c:1770/1408-1437;ts event-system.ts:1571-1577 / 1145-1186;page 阈值 dialog-box.ts:24/45
> - 进场无重定位:scene-jumps.json(scene-5 无 partyStart)+ dev-panel.ts:759-766 + bootstrap.ts:538-548
> - 0x6D 设 903:all.json commands[1450]
>
> ## 注
> - workflow 有 1 维度(对话打字节奏)没产出结构化结果,但 0x05 维度已覆盖对话节奏结论。
> - 香兰=object 84(dump id,resolveTargetNpc 取 operand0-1=83 数组下标),sprite 4,scene/4.json sState=2。
>
> ---
>
> ## 运行期证据 + 真根因(2026-05-30 晚,diag log 实测)
>
> 实测 log:
> - `0x12 party=(1744,1368) placement=(1616,1424)` —— 摆位公式正确(party−128,+56)。
> - `walk id=83 (1616,1424)→...12 步 +6/−3...→(1688,1388) arrived=false` —— **香兰真走了 12 步,不是瞬移**。
> - `0x05 input.pressed=[]` —— **0x05 真在等键(空输入),"顿"逻辑生效**。
>
> → 走入 + 顿的代码都对。**真根因**:scene-entry 自动淡入(paletteFadeState)期间,main-loop `tickIntervalMs` 返回 `FRAME_MS_FADE`(~16ms/60fps,为淡入平滑),而 frame-wait 计数 + autoScript 走步 + 对话打字**全都跟着 tick 跑** → 全程被加速 ~6×。12 步走入在 ~192ms 内跑完(且前半被黑屏淡入遮)→ 瞬移观感;对话也在淡入加速期一闪 → 一口气(虽 0x05 仍等键)。sdlpal `PAL_FadeIn` 是**阻塞**的,淡入期 NPC/脚本冻结、淡完正常速率,无此加速。
>
> ## 失败的修法(勿重蹈)
> 试过"淡入期冻 frame-wait + autoScript"(mode.ts blockingFade + tickEventSystem `if(paletteFadeState) return`)→ **死锁**:游标冻在 frame-wait 等 paletteFadeState 清,但该 event-mode cutscene 路径下 paletteFadeState 没清掉(present 清逻辑在此路径疑似没跑到 / 需查 present.ts:122 stepPaletteFade 清条件)。已回退。
>
> ## 正确修法方向(待做,架构层,需谨慎)
> **解耦"淡入渲染高 FPS"与"游戏逻辑 tick 速率"**:淡入仍 60fps 平滑渲染,但 frame-wait/autoScript/对话打字按**固定逻辑速率**(~100ms)推进,不被 FRAME_MS_FADE 加速。
> - 选项 A:游戏逻辑改 time-based(walk/typing/frame-wait 用 wall-clock dt,而非每 tick 1 步)。最忠实但改动大。
> - 选项 B:main-loop 拆两个累加器 —— 渲染 tick(含 paletteFade step)跑 16ms,逻辑 tick(tickByMode 的脚本/walk/dialog 部分)跑 100ms。
> - 选项 C(最小):淡入期不 bump 逻辑 tick,只在 present 内多采样 paletteFade(present 已能按 wall-clock step)。即 tickIntervalMs 别因 paletteFadeState 提速,改让 present 每帧按 performance.now() 平滑 step fade。← **优先评估这个**,改面最小。
>
> ---
>
> ## ✅ 已解决(2026-05-30,用户 in-game 确认"终于好了")
> 采用上面**选项 C 的稳妥版**:main-loop 渲染/逻辑解耦。
> - `logicIntervalMs`(原 tickIntervalMs):去掉 fade 提速,逻辑恒 100ms(explore)/40ms(battle)。
> - raf loop:逻辑 tick 时必 present;此外 dither/palette fade 进行中**每 raf 帧**都 present(present.ts 内按 wall-clock 平滑步进 fade)。非 fade 且无 tick 跳过 present。
> → fade 仍平滑,走步/打字/frame-wait 不再被 fade 提速 6×。香兰正常走入 + 对话有顿。
> diag log 已删。改动文件:packages/game/src/shell/main-loop.ts。
<!-- original-source-quote:end -->
