# CODE-QUALITY-73 — game input lifecycle

Status: done
Owner: Codex
Reviewer: Codex（独立验收）
Phase: phase1 game
Capability: Q3 game/shell
Visual Verification Timing: N/A（键盘输入状态机）

## 范围

- `packages/game/src/shell/input.ts`
- `packages/game/src/shell/input.test.ts`
- `packages/game/src/shell/input.boundaries.test.ts`
- `packages/game/src/shell/input-replay.grok-r1.test.ts`

## 验证

完整读取实现、主/边界/宿主回放测试和 main-loop/input caller；定向 31 tests 全绿，覆盖 SDLPal key mapping、held/pressed edge、repeat order、clear/fade suppression、detach、snapshot alias isolation、Replay cursor 与 Recording ownership。最近 game 全包、`pnpm check`、ratchet、protected fast、lint-zero、docs/content review、ledger 已通过；无实现改动，未发现直接缺陷。

## 交接

2026-10-13 Codex：accept/done；账本收口为 `3266 / 326 closed / 8 review / 2932 pending`。

## 下一位 Agent 提示词

```text
接手任务：CODE-QUALITY-73 game input lifecycle
任务卡：docs/ops/archive/tasks/done/CODE-QUALITY-73-game-input-lifecycle.md
当前状态：done，已归档；当前结论 accept/done，无实现改动
```

## 2026-10-21 方向恢复差异（批准前记录）

从固定SDLPal原函数和真实TS模块分别复现双方向键跨scene-fade后的恢复差异；不是类型或假Window夹具问题。当前仍partial，input实现未动，[裁决卡](../../../tasks/GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1.md)待用户答复；原有有效键表/快照/record-replay证据保留。

## 2026-10-21 输入音频模块收口

原四文件A–H接受。用户批准方向恢复；三个真实业务红先行后修，原17case与键表/Replay/Recording保全。三原C函数与实际浏览器main-loop→scene消费支持方向ownership；无全输入模型等价或完整剧情E2E外推。

[逐文件八维、授权/合同映射与完整原件](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json)及只读verify-input-audio为当前入口。统一check/官方ratchet/protected与静态零诊断按实际回执；旧原始结果不改写。
