# 可选45°方向控制回归

Status: verified
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: governance-index-v1 / 1.0.0

## 目的

路由第一阶段虚拟方向键/标准手柄左摇杆的可选顺时针45°设置、输入合同和已有原件：单一默认关闭、可记忆的开关共同作用于虚拟盘与左摇杆，四斜向输入映射Up/Right/Down/Left，移动仍消费原方向语义。

## 范围

本页仅导航。键盘、硬件十字键、引擎步进与游戏存档均不在本设置的修改范围内；实物触屏/手柄与自然全剧情E2E未测。

## 当前状态

稳定出版身份 game-input-rotation，catalog/report/evidence为 verified：用户已接受，统一门、受保护CI与实际部署完成（PR#28合并、第一阶段v1.1.0发布）。本页 current 只指导航有效。

## 入口与责任

- 正式域报告：[report.md](report.md)
- 配对机器evidence：[evidence.json](evidence.json)
- 实施任务卡：[GAME-INPUT-ROTATION-1.md](../../../../tasks/cards/GAME-INPUT-ROTATION-1.md)
- 根独立接收与原件索引：[review.json](../../../../tasks/evidence/GAME-INPUT-ROTATION-1/review.json)
- 发布回执：[release.json](../../../../tasks/evidence/GAME-NANZHAO-ROOM-EXIT-1/release.json)

## 证据与下一步

复用60项（51保留/9新增/0退役）、正式单红反控（恰1指定AssertionError+9过，恢复60绿）和两viewport真实浏览器pointer证据（NE按住1312,288→1328,280朝up）；不重复授予运行次数或coverage信用。按报告列出的caller/oracle/失效条件复验；真机手柄/触屏、完整剧情和离线激活未测；发布事实与原件见发布回执。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1199B / SHA-256 e096a21aa4feb234d3786cb486f68cb7901c5dd34cc042633bdd7abdc4ea765b；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# 可选45°方向控制回归

Status: current
Owner: Codex
Last reviewed: 2026-10-27
Template: governance-index-v1 / 1.0.0

## 目的

路由第一阶段虚拟方向键/标准手柄左摇杆的可选顺时针45°设置、输入合同和已有原件。

## 范围

本页仅导航。键盘、硬件十字键、引擎步进与游戏存档均不在本设置的修改范围内。

## 当前状态

稳定出版身份 `game-input-rotation`，catalog/report/evidence为 verified：用户已接受，统一门、受保护CI与实际部署完成。本页 current 只指导航有效。

## 入口与责任

- [正式域报告](report.md)
- [配对机器evidence](evidence.json)
- [实施任务卡](../../../../ops/tasks/GAME-INPUT-ROTATION-1.md)
- [根独立接收与原件索引](../../../../ops/evidence/GAME-INPUT-ROTATION-1/review.json)

## 证据与下一步

复用60项、正式单红反控和两viewport真实浏览器pointer证据；不重复授予运行次数或coverage信用。按报告列出的caller/oracle/失效条件复验；真机手柄/触屏、完整剧情和离线激活未测；发布事实与原件见[发布回执](../../../../ops/evidence/GAME-NANZHAO-ROOM-EXIT-1/release.json)。
```
<!-- incremental-original-source:end -->
