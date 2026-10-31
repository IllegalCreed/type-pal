# CODE-QUALITY-73 — game input lifecycle

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

保留原卡「CODE-QUALITY-73 — game input lifecycle」的任务归属与历史边界。原目标见原文(摘录:Reviewer: Codex（独立验收） Capability: Q3 game/shell Visual Verification Timing: N/A（键盘输入状态机）);本页治理不重开已终态任务。

## 范围

原卡含章节[CODE-QUALITY-73 — game input lifecycle、范围、验证、交接、下一位 Agent 提示词、2026-10-21 方向恢复差异（批准前记录）],共2个原文链接。治理范围仅限文档角色、保全与链接处置,不改产品/测试/coverage。

## 前提与证据

固定main源2162B(SHA 6cc335e92018);原卡前提按原时点保留。当前存活入口:[input-audio-closeout.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) [GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1.md](../../../tasks/GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1.md)。

## 验收

本页治理验收=模板符合+原文逐字节保全+链接处置如实;原卡验收结论保持原时点(原Status:done),治理不改写。

## 状态与交接

done保持原语义;本治理候选为作者稿(partial/needs),交Owner非作者接收;无新执行授权。

## 历史范围

原卡属固定main时点;CODE-QUALITY-73 — game input lifecycle的原始范围与日期在保全块内逐字保留。

## 原始结论

原卡结论按其Status(done)原样;治理不撤销/不恢复旧信用。

## 当时证据

原文2个链接与当时回执属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前实现或授权新产品取舍。

## 继任文档

接替/关联入口见原文链接;当前任务导航以看板为准。 关联:[input-audio-closeout.json](../../../evidence/QUALITY-PRE94-RETROSPECTIVE-1/input-audio-closeout.json) [GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1.md](../../../tasks/GAME-INPUT-FADE-DIRECTION-OWNERSHIP-1.md)。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 2162B / SHA-256 6cc335e92018f4d47c30588bf1d25cc89d512e2a28eb1b41035de9e0c620d24e；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
````markdown
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
````
<!-- incremental-original-source:end -->
