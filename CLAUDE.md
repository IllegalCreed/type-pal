# 工作约定

**用户跟 Claude 之间的硬约定 — 违反就是 bug。**

## 测试 / 验证

- **图是给用户看的,不是 Claude 测试过不过的标准。** Claude 不识别截图。
- **Claude 用数据 / log 测试**:gs 状态 dump、log line 对比、字节级 diff。
- 数据不够 → 加 log,不要靠截图。
- "vitest 全过" 不等于 "功能对" — 单元测试只测单 opcode 字段写入,**不**测 sdlpal 真值视觉行为。不要拿"测试通过"当"修好"的证据。

## sdlpal 真值

- **所有 sdlpal 改动只通过 patch**,不能改 `reference/sdlpal/` 树。否则基准就失了。
- 任何 cutscene / dialog / scene-transition 等修改前,**先 grep sdlpal source 真值**(`reference/sdlpal/*.c`),再写实现。不要凭推理修。
- 用户的需求都是对照 sdlpal 真版本发现的,**不是瞎编的**。先信用户。

## Commit 节奏

- **每完成一个功能 commit 一次**,不堆改动。一次 git checkout 把未提交工作 wipe 是真实存在的事故。
- commit message 写 sdlpal 真值出处(`script.c:行号` / `scene.c:行号` 等),便于回溯。
