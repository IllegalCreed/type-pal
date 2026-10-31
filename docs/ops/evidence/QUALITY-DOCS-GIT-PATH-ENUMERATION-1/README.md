# Git完整路径枚举容量修复

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「Git完整路径枚举容量修复」的治理候选页;证据原件即下方逐字节保全的固定main源(3741B,SHA d5e39ec35784)。

## 来源与输入

来源为固定Git载体,非本次运行;原7个链接处置见作者review的linkDisposition。当前存活入口:[QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md](../../tasks/QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md) [controls.json](controls.json) [gates.json](gates.json) [green.json](green.json) [read-boundaries.json](read-boundaries.json) [red.json](red.json)。

## 断言与业务 oracle

文档事实核对(currentExecution=false):原记录按其自身字段成立;空数组/exit0/成功字样不外推为零诊断或产品通过。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;不产生新执行结果。

## 限制与复核

未重跑原命令/浏览器/测试;历史结论保持原时点;候选待Owner非作者接收。


## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 3741B / SHA-256 d5e39ec3578499b4bb7b7f22acb4ed0084b332ed378e56c6ef13f7a00a6a9f2d；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# Git完整路径枚举容量修复

Status: recorded
Owner: Codex（单Agent，自身源码/测试核证，不冒充第三方）
Date: 2026-10-18
Base: `6fde6d86cf9754e441de948c82ac99ebc1f480c8`
Branch: `codex/code-quality-3y`

## 前提与范围

id: QUALITY-DOCS-GIT-PATH-ENUMERATION-1；schemaVersion:1；status:recorded。[任务](../../tasks/QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md)因3u/3w索引生成的真实ENOBUFS准入。三代码文件和真实CLI/ledger caller全文见[读取边界](read-boundaries.json)。当前战斗自有WIP十文件及证据/草稿已完整保存，路径与SHA清单另存；没有清理main/他Owner，没有新分支或恢复旧stash。战斗源码/测试不混入本提交。

## 根因与修复

Node22.23.2实际执行；[Node22官方文档](https://nodejs.org/download/release/v22.23.3/docs/api/child_process.html)说明execFileSync默认最大输出1MiB，超限会截断并失败。实测错误发生在Git完整路径响应、文档解析前；ledger虽给外层inventory JSON32MiB，也不能修内部Git默认1MiB。

两个入口分别给原始Git枚举指定有限16MiB，保留全部原参数、NUL分割、物理存在性/代码范围过滤与错误传播；容量选择与现有docs Git blob读取一致。没有缩清单、删证据、排除、ignore、强转、改诊断级别或吞异常。终态namespace固定4MiB不是普通工作树全路径容量，其实现与overflow测试原字节保留。

## 失败反例与判别力

原inventory测试全文保留，新2例共用真实Git夹具：5000个index-only合法路径令NUL输出>1MiB，末尾真实task与带空格/中文的源码物理存在；不创建数千文件、不fake Git/核心。复制实际消费者与依赖，独立临时Git/HEAD、隔离继承Git环境，t.after精确删除自有树。

[先红](red.json)：完整3例原1绿、新2个指定业务AssertionError，0skip/cancel/todo，两个子CLI真实ENOBUFS。修复后[全3绿](green.json)：任务索引包含尾task，改成非法状态仍精确拒绝/零stdout；库存精确两个源码路径、出口、直接依赖与生产caller，不以“输出包含某串”替代完整集合。

[必要性反控](controls.json)：每次只撤回一个入口的选项，完整旧1绿→完整新2绿1指定AssertionError；另一入口继续执行通过，源码/测试finally逐字节恢复。完整Node TAP/raw、命令/cwd/时间/exit/signal/spawn、源/测SHA均保存。未删除原例或改baseline/catalog。

## 账本与门

两个原closed工具重开review、原未列pending测试转review，0新增关闭。实际3316/259closed/92review/2965pending，以[门回执](gates.json)实际ledger为准；83卡53partial/30pending/0accept不变，本片只是治理工具前置，不借工具绿关闭任何产品。

必要门为质量工具相邻、文档工具与实际消费者、lint-zero/ledger/diff；全仓check、official coverage ratchet、protected fast按用户成本规则留大任务收尾，不合main。剩余风险是普通全路径超过16MiB时仍会明确失败；未证明任意规模或其它历史CLI容量已治理。完成本片提交推送后恢复3u/3w，校对保存SHA并重基其共享元数据；原全部83卡及94–102/editor目标继续。

最终局部门：quality40、docs工具125及五消费者全通过，包含原固定4MiB溢出拒绝；lint-zero5365文件0error/0warning/0info，ledger3316/259/92/2965。fresh fetch后0behind/254ahead（本工具提交前），未合main。仅MJS工具，无必要package typecheck；实际Node解析/CLI与lint已执行。观察得到的四个失败CLI临时树均已删除，成功夹具名未打印，按实际t.after和原生无hook失败范围记录，不伪造目录清单。
```
<!-- incremental-original-source:end -->
