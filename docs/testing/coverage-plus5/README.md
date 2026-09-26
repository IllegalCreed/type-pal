# 全仓分支覆盖率 +5pp 持续队列

[总卡](../../ops/tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md) / [测试入口](../README.md)

2026-09-26冻结main8add8c66：43,418/63,178分支，68.72328975276204%。
目标73.72328975276204%，当前分母需46,577分支，净增3,159。8404 fast /701生产文件。
不以删除代码、排除文件、降低门槛或无业务意义的重复测试达成目标；架构分母变动独立披露。

| 批次 | Owner | 当前状态 | 已验收新增分支 |
|---|---|---|---:|
| [content八组同步守卫](../../ops/tasks/TEST-GLM-CONTENT-GUARDS-3-script-and-records.md) | GLM | build allowed，待执行 | 0（未交付） |
| [editor八组命令](../../ops/tasks/TEST-CURSOR-COMMAND-BOUNDARIES-3-editor-residuals.md) | Cursor | 原卡继续 | 0（未验收） |
| migrate纯转换链 | Codex | 正在核入口、旧断言与缺口 | 0（未执行） |

统计以官方整批并集为准，不相加贡献者局部数字。实现期间只定向/相邻/TC；整批串行check→ratchet→
受保护单次strict-fast，通过后更新本表并推送。用户无需回来逐次批准继续；需要新的产品裁决时才问。
