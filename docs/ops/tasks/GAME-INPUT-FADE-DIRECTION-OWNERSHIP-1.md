# GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算」的任务归属与历史边界。原目标见原文(摘录:Capability: keyboard input lifecycle Generation Owner: N/A Reviewer: Codex);本页治理不重开已终态任务。

## 范围

原卡含章节[GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算、目标与用户裁决、范围与准入、前提真值门、Build: 实现与自测、Review: 审查与剩余项],共0个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源3603B(SHA 108721ccb724);原卡前提按原时点保留。当前存活入口:无当前仓库内存活链接。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文0个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3603B / SHA-256 108721ccb724e75028553a905d26f92cb1f1d3a3dbe53cf9daca85221c6481c3；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算

Status: done
Phase: phase1
Capability: keyboard input lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: `codex/code-quality-3y`

## 目标与用户裁决

用户2026-10-21明确批准“按 SDLPal 修复（推荐）”：scene-fade结束后，有效方向键事件恢复其它仍按住的方向。CODE73只在逐文件八维、当前实现与相应门通过后接收。

## 范围与准入

Codex build allowed；同一隔离3y树，唯一Coding Owner为Codex。实现白名单为`input.ts`和直接测试；只读`main-loop.ts`、`scene-system.ts`及SDLPal input/palette。键位、Replay/Recording接口、fade调用时序和非方向键消费模型不扩展。

## 前提真值门

| 维度 | 真值与边界 |
|---|---|
| primary | `reference/sdlpal/input.c`的`PAL_GetCurrDirection/PAL_KeyDown/PAL_KeyUp`（163–288）保留按键顺序；非repeat方向keydown及方向keyup重算dir。`palette.c`的`PAL_SceneFade`清dir/pressed，不清物理顺序。 |
| 第一阶段 before→after | before把每个方向键分别压入抑制集，松右仍不能恢复左；after用当前方向的抑制标志，下一有效方向事件恢复仍按住的方向及其顺序。 |
| 第二阶段 | N/A；本卡不改变Reforge。 |

抽取三个原C函数编译运行支持五个边界；仅证明该函数合同及fade清dir赋值，不冒充整个SDL runtime或TS pressed完全等价。原首次TS探针依赖失败无反例信用；修正路径的观察另存。

## Build: 实现与自测

先新增三例，原实现17通过/3个指定业务断言失败；再窄修方向抑制ownership，三输入文件34/34。保留原17例及键表、clear、detach、快照隔离和record/replay合同。repeat、非方向、未知事件不解除抑制；未按住方向的keyup仍依C重算。

相邻主循环/场景/menu锁/AVI七文件157/157；game typecheck及局部Biome均零诊断。真实浏览器使用当前input/main-loop/scene-system和受控KeyboardEvent，松右后held=Left、pressed为空，下一世界tick从(320,240)走到(304,232)。首次隔离页误用(5,5)世界坐标，真实边界正确拒绝走步；原件保留，修正为合法坐标后通过。不是完整剧情E2E。

## Review: 审查与剩余项

复用GLM全文八维与既有真实caller/oracle；Codex补当前差异、方向状态Owner及三红→绿。统一check/ratchet/protected在输入/音频模块窗口通过，原七文件A–H逐项接受；最终静态门与发布事实由当前父卡回执核。不把旧包绿当文件关闭。

## 用户验收

用户已批准产品取舍，无需重复裁决。dev-functional观察已完成；完整模块门与Git发布结果由父卡当前回执承载。

## 交接日志

- 2026-10-21只读发现：固定C原函数与真实TS双方向事件产生差异，先登记，未擅改。
- 2026-10-21批准后：正式三红先行，修复和34直接/157相邻通过；浏览器实际模块接线成立。原生输出/原始失败/坐标夹具勘误随父卡输入音频回执封存。

## 下一位 Agent 提示词

Codex继续同一3y模块收尾；不新增分支，不扩94–102，不把其它partial改accept。

## 2026-10-21 输入音频模块收口

本卡获批范围整改与CODE73四文件八维收口；完整原始失败/绿结果、命令/诊断、精确baseline和只读快检见父卡input-audio-closeout.json。Git发布另核实际ancestry，不由本段推定。
```
<!-- incremental-original-source:end -->
