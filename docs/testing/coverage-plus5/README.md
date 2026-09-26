# 全仓分支覆盖率 +5pp 持续队列

[总卡](../../ops/tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md) / [测试入口](../README.md)

2026-09-26冻结main8add8c66：43,418/63,178分支，68.72328975276204%。
目标73.72328975276204%，当前分母需46,577分支，净增3,159。8404 fast /701生产文件。
不以删除代码、排除文件、降低门槛或无业务意义的重复测试达成目标；架构分母变动独立披露。

| 批次 | Owner | 当前状态 | 已验收新增分支 |
|---|---|---|---:|
| [content八组同步守卫](../../ops/tasks/TEST-GLM-CONTENT-GUARDS-3-script-and-records.md) | GLM | [R1–R3窄返工](../guard-wave3-review.md)，同型正控/拒绝输入保真 | 0（未验收） |
| [editor八组命令](../../ops/tasks/TEST-CURSOR-COMMAND-BOUNDARIES-3-editor-residuals.md) | Cursor | 独立复核R1–R3窄返工 | 0（未验收） |
| [migrate纯转换链](../codex-migrate-pure/README.md) | Codex | done，83项/六针/统一门通过 | +527 |
| [migrate当前汇总链](../codex-migrate-assembly/README.md) | Codex | done，49项/六针/统一门通过 | +169 |
| [migrate当前场景链](../codex-migrate-scenes/README.md) | Codex | done，53项/六针/统一门通过 | +327 |

统计以官方整批并集为准，不相加贡献者局部数字。实现期间只定向/相邻/TC；整批串行check→ratchet→
受保护单次strict-fast，通过后更新本表并推送。用户无需回来逐次批准继续；需要新的产品裁决时才问。

## 已验收进度

2026-09-26第一批：43,945/63,178 = **69.55744088131945%**，相对起点+0.8341511285574086pp；
还差至少2,632分支。check8,979/ratchet/单次受保护strict8,487均通过，生产701文件与分母不变。
此结果未包含待返工Cursor或未交付GLM；不存在把贡献者局部增量相加的问题。目标仍在执行。

2026-09-26第二批：44,114/63,178 = **69.82493906106556%**；累计+696分支/+132测试，
相对起点约+1.10pp，距离目标还差2,463分支。check9,028/ratchet/单次受保护strict8,536通过，
701生产文件与各分母不变。其它六包完整baseline对象未变；仍不含未接收贡献者包。
下一批优先场景迁移入口/状态/绑定/会话的真实调用边界，不为小批反复跑全仓覆盖。

2026-09-26第三批：44,441/63,178 = **70.3425242964323%**；累计+1,023分支/+185测试，
相对起点+1.619234543670265pp，距离目标还差2,136分支。check9,081/ratchet/保护20544351的
单次strict8,589/701通过；生产清单与各分母不变，六个其它包baseline对象不变。
已检查远端：Cursor仍为被counter的b6bcc9b4；GLM新候选a00f12c2进入下一批独立接收，不提前计入。
