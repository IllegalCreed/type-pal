# GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1 — 场景渐变后的方向重算

Status: draft
Phase: phase1
Capability: keyboard input lifecycle
Coding Owner: Codex
Generation Owner: N/A
Reviewer: Codex
Visual Verification Owner: Codex
Visual Verification Timing: dev-functional
Contributor: Codex
Branch: `codex/code-quality-3y`

## 目标

裁定第一阶段scene-fade结束后，方向键事件是否应按SDLPal恢复仍按住的其它方向。当前实现未改，不用既有注释中的“已知近似”代替用户裁决。

## 范围

- 候选：`packages/game/src/shell/input.ts`、对应直接测试。
- 只读：`main-loop.ts`的scene-fade调用、SDLPal `input.c`与`palette.c`。
- 不改键位、渐变时序、存档、回放接口、公共类型或非方向键消费模型。

## 前提真值门

| 维度 | 当前真值 | 直接证据 |
|---|---|---|
| 原版/primary | `PAL_KeyUp`对方向键移除order并重算dir；非repeat方向keydown同样重算 | `reference/sdlpal/input.c`的`PAL_GetCurrDirection/PAL_KeyDown/PAL_KeyUp`，163–288行 |
| 第一阶段 | fade将held方向放入suppressedHeld；此后只解除被keyup的那个键 | `input.ts`的`handleUp/suppressHeldForFade`；`main-loop.ts`的scene-fade入口 |
| 第二阶段 | N/A；本卡仅处理第一阶段键盘源，不移植到Reforge |
| 本任务目标 | 待用户裁决；候选为有效方向事件后重算当前方向，repeat/非方向键保持现行边界 |

最强替代解释是C也会保留本键以外的抑制，或TS的真实事件顺序并无差异。已从固定`input.c`抽取三个原函数编译运行：左、右按下→fade清dir→松右，C恢复左；真实TS模块加原生jsdom KeyboardEvent返回空held。初次TS探针因依赖解析失败不授反例信用；修正路径后的观察stderr为空、exit1。这里只是复现观察，不冒充正式先红后绿测试。

用户可见before→after候选：渐变后仍需把左键也松开重按，变为松开右键后可继续沿仍按住的左方向走。用户裁决pending，未授权实现。

## 上下文锚点

- [pre94父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)、CODE73及73–78 shell逐文件索引。
- `CLAUDE.md`的第一阶段保真边界、`docs/phase1/engineering-notes.md`输入/渐变约束。
- 复现原件暂存本轮shell证据工作目录，收口前随父卡证据包封存。
- 不恢复WASD方向键，不把重复keydown或非方向事件当方向重算触发。

## 验收条件

用户若批准，先正式失败反例，再窄修；方向keydown/keyup及repeat、非方向边界须有独立oracle，沿用既有合法KeyboardEvent与finally detach。逐文件八维/迁移/版本、定向与相邻原件配对；大门并入父卡模块窗口，未跑不记通过。

## 当前模式推进记录

- 前提：已证真实差异，C片段与TS模块观察一致支持候选。
- Owner：Codex；同一3y隔离树。
- build：尚未准入；仅只读复现与任务登记。
- 用户裁决：pending。CODE73继续partial，其余独立卡继续。

## Draft: 设计与风险

只考虑方向事件的抑制集ownership，不重写整个输入源。正式测试还须核多键顺序、repeat与非方向事件；不能从一个观察推广成全输入模型等价。

## Build: 实现与自测

无实现改动。原生C片段exit0；当前TS观察exit1。正式测试/邻包/统一门未为本卡运行。

## Review: 审查与返工

反例前提成立；产品裁决与正式失败测试尚缺，不接受CODE73或本卡完成。

## 用户验收

待裁决，仅影响本卡候选，不阻塞其余pre94范围。

## 交接日志

- 2026-10-21 Codex：核固定C原函数与真实TS事件，登记候选，保留首次探针环境失败。Next：裁决后再准入有限实现。

## 下一位 Agent 提示词

无下一位Agent；Codex继续父卡独立范围。不得在用户答复前修改本卡行为。
