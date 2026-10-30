# QUALITY-DOCS-GIT-PATH-ENUMERATION-1 — Git路径枚举缓冲区边界

Status: review
Owner: Codex
Phase: cross-phase engineering tooling
Capability: docs / quality / Git inventory
Coding Owner: Codex
Reviewer: Codex（自身源码/测试核证，不冒充第三方）
Visual Verification Timing: N/A（CLI工具）
Branch: codex/code-quality-3y

## 目标

修复真实仓库路径清单超过默认1MiB后，任务索引生成及代码库存枚举的ENOBUFS。必须完整消费原NUL路径清单，不裁范围、不忽略文件、不放宽文档/ledger诊断。

## 范围

只改scripts/docs/check.mjs、scripts/quality/code-quality-inventory.mjs及现有code-quality-inventory.test.mjs的真实Git CLI反例；相关任务/账本/看板/索引和证据。当前3u/3w十个自有未提交文件和两处自有新文档/证据已按SHA保存到临时目录，工具批完成后接回；主树及他Owner未触碰。

## 前提真值门

| 维度 | 已核事实 |
|---|---|
| primary | Node child_process.execFileSync默认maxBuffer约1MiB；实际Node22.23.2，真实check --print-task-index抛spawnSync git ENOBUFS，子命令为git ls-files --cached --others --exclude-standard -z。 |
| 当前工具 | check.mjs:327–333和code-quality-inventory.mjs:18–22均未给Git枚举指定maxBuffer；ledger有32MiB外层缓冲，不能修复inventory内部1MiB。 |
| 两阶段 | CLI工程元数据路径清单，不改第一阶段机制、第二阶段canonical或schema/save/资产/产品公共接口。 |
| 目标 | 为这两个完整枚举指定有限16MiB缓冲，与既有docs Git读取容量一致；终态namespace的4MiB固定安全门原样保留。 |

### 反证与替代解释

缓存/输出文件本身坏掉不能由抛错推出：实际ENOBUFS发生在Git路径响应、还没读文档payload；给真实临时Git造>1MiB路径，尾部合法task/source必须仍可见，非法尾部task仍须拒绝。不能通过filter、ignore、删除证据或把trace吞掉来过门。

## 上下文锚点

- [父卡](QUALITY-PRE94-RETROSPECTIVE-1.md)与[本工具证据](../evidence/QUALITY-DOCS-GIT-PATH-ENUMERATION-1/README.md)。
- 实际caller：package.json check:docs、--print-task-index生成路径、code-quality-ledger.mjs:121–134及inventory CLI测试。
- docs/terminal-git.mjs固定4MiB、terminal-codec overflow回归与普通Git完整枚举是不同边界，不改前者。

## 验收条件

- 两真实CLI在>1MiB NUL清单下先业务断言红，再完整成功；尾部task/source/生产caller精确oracle，非法尾部状态仍拒绝。
- 原测试保留，真实Git/子进程/临时树finally清理，无核心mock或弱化断言。
- 文档/quality工具相邻、check:docs、lint-zero、ledger与diff检查；完整全仓check/coverage/protected留大任务收尾，不合main。

## 当前模式推进记录

Codex premise verified/design agree/build allowed：三代码文件全文、真实CLI/caller与Node容量边界已核；单Agent/同3y树，只准修枚举IO容量和必要失败回归，不改检查策略、用户数据或格式。纯工具修复与战斗测试分提交。

## Draft: 设计与风险

两个小型execFileSync选项明确有限上限；不为复用一个数引入跨docs/quality生产依赖。测试共同的真实Git夹具放在既有inventory测试内复用，分别核两消费者。16MiB仍可能被更大的合法仓库触发，届时继续明确失败，不能截断成通过。

## Build: 实现与自测

先红1绿/2指定AssertionError，修后3绿；两枚必要性反控旧1绿→新2绿/1指定红且恢复。三路径仅review，必要静态门见本卡证据gates；全仓/coverage/protected未跑。

## Review: 审查与返工

未验收，不以修复计划或历史全绿收口。

## 用户验收

N/A，纯CLI修复且不改变产品行为；无新的产品取舍。

## 交接日志

- 2026-10-18 Codex：从3u/3w索引生成失败定位到真实Git枚举，完整保存当前自有WIP，独立开工具前置批；不删证据躲容量，先写真实Git反例。

## 下一位Agent提示词

无下一位Agent提示词，Codex完成后恢复保存的3u/3w WIP及其精确SHA，再继续原全部83卡目标。

本片回执：quality40、docs工具125/实际五消费者与lint-zero5365零诊断、ledger3316/259closed/92review/2965pending；0新关闭，2旧工具重开review/1原pending测试转review，原pre94队列53/30/0不变。MJS实际Node解析通过，package typecheck N/A。fresh fetch0behind，完整check/coverage/protected未跑、不合main；同3y提交推送后恢复十文件WIP并按新HEAD重基文档计数，不丢工具补证。
