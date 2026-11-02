# Git完整路径枚举容量修复

Status: recorded
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是「Git完整路径枚举容量修复」证据族的治理候选页;原件按固定main源逐字节保全(3741B,SHA d5e39ec35784)。任务 id QUALITY-DOCS-GIT-PATH-ENUMERATION-1、schemaVersion 1、status recorded,由 3u/3w 索引生成的真实 ENOBUFS 准入;战斗自有 WIP 十文件与证据已按 SHA 暂存,未清理 main 或他 Owner。

## 来源与输入

三代码文件与真实 CLI/ledger caller 的全文读取边界见 [read-boundaries.json](read-boundaries.json)。一手依据为 Node22 官方文档:execFileSync 默认最大输出约 1MiB,超限截断并失败;实测错误发生在 git ls-files --cached --others --exclude-standard -z 的路径响应、文档 payload 解析之前。修复面是 scripts/docs/check.mjs 与 scripts/quality/code-quality-inventory.mjs 两处原始 Git 枚举各加有限 16MiB(与既有 docs Git blob 读取容量一致),保留原参数、NUL 分割、过滤与错误传播;终态 namespace 固定 4MiB 及其 overflow 测试原字节不动。当前存活入口:[QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md](../../tasks/QUALITY-DOCS-GIT-PATH-ENUMERATION-1.md) [controls.json](controls.json) [gates.json](gates.json) [green.json](green.json) [read-boundaries.json](read-boundaries.json) [red.json](red.json)。

## 断言与业务 oracle

新反例共用真实 Git 夹具:5000 个 index-only 合法路径使 NUL 输出超过 1MiB,末尾保留真实 task 与带空格/中文的物理存在源码;不创建数千文件、不 fake Git/核心。[red.json](red.json) 见原 3 例 1 绿、新 2 例指定业务 AssertionError(两个子 CLI 真实 ENOBUFS);修后 [green.json](green.json) 全 3 绿:任务索引含尾部 task、非法尾部状态仍精确拒绝,库存精确两个源码路径/出口/依赖/生产caller,不以'输出包含某串'替代完整集合。[controls.json](controls.json) 每次只撤回一个入口的 16MiB 选项:完整旧 spec 绿,新 spec 2 绿+1 指定 AssertionError,另一入口继续通过,源码/测试 finally 逐字节恢复。无缩清单、删证据、ignore、强转、降诊断级别或吞异常。

## 结果

账本 3316 tracked / 259 closed / 92 review / 2965 pending:两个原 closed 工具重开 review、一个原未列 pending 测试转 review、0 新增关闭;83 卡 53partial/30pending/0accept 不变,本片只是治理工具前置,不借工具绿关闭任何产品。必要门:quality 工具 40、docs 工具 125 与五个实际消费者全过(含原固定 4MiB 溢出拒绝)、lint-zero 5365 文件 0/0/0、ledger 与 diff 通过、fresh fetch 后 0 behind / 254 ahead(工具提交前),见 [gates.json](gates.json)。typecheck N/A:仅 MJS 工具变更,实际 Node 解析/CLI 与 lint 已验证语法。观察到的四个失败 CLI 临时树均已删除(成功夹具名不打印),按 t.after 原生范围记录。

## 限制与复核

未跑全仓完整 check、official coverage ratchet、protected fast、产品 runtime/E2E/视觉,按用户成本规则留大任务收尾,不合 main。剩余风险:普通全路径超过 16MiB 时仍会明确失败(不截断成通过);未证明任意规模或其它历史 CLI 容量已治理。完成本片提交推送后恢复 3u/3w 十文件 WIP 并按新 HEAD 重基文档计数。本治理候选仅覆盖文档角色与保全语义补写;候选待 Owner 接收。

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
