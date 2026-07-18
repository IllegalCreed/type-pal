# 三贤人系统任务卡

“三贤人系统”是本项目的多 Agent 协作机制。任务卡是这套机制的持久交接记录。

不可逆/高风险任务在本目录下放一张完整任务卡。中等任务可用轻量任务卡。小改可以不建卡,但提交说明或最终回复必须写清验证结果。

新建任务时:

1. 不可逆/高风险任务复制 [`TASK-template.md`](TASK-template.md)。
2. 中等任务复制 [`TASK-lite-template.md`](TASK-lite-template.md)。
3. 如任务正在进行或阻塞,在 [`../board.md`](../board.md) 增加一行。
4. 填写推进签字。非小改/已开卡任务必须集齐 Codex、Kimi、GLM 三方签字后才能进入 `build`;进入 `done` 前也必须集齐三方审查签字。
5. 跨 Agent 交接时,当前 Agent 必须在任务卡和最终回复中给出“下一位 Agent 提示词”,方便用户直接复制给下一位。
6. 按 `draft -> build -> review -> done` 推进,必要时记录 `blocked` 或 `rework`。签字不齐时不得只靠 `Status` 推进。

任务卡命名建议:

```txt
<领域>-<编号或能力格>-简短标题.md
```

例子:

- `W7C-map-paint.md`
- `A4-asset-import.md`
- `OPS-0001-agent-workflow-bootstrap.md`

任务卡是持久交接日志。聊天总结可以辅助,但下一个 Agent 应该能只靠任务卡和链接文件继续工作。
