# CODE-QUALITY-82 evidence — DATA.MKF 只读诊断

Status: historical
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: evidence-receipt-v1 / 1.0.0

## 证据身份

本页是 CODE-QUALITY-82（DATA.MKF 只读诊断）证据目录的索引页,对应归档任务卡 docs/ops/archive/tasks/done/CODE-QUALITY-82-data-mkf-diagnostic.md（done）。本批只处理 packages/pal-extract/audit-data-mkf.mjs,不修改 extractor CLI、shared codec、raw/extracted 生成物或公共接口。证据原件即下方逐字节保全的固定main源(1600B,SHA a8860a9fbc41)。

## 来源与输入

来源为固定Git载体,非本次运行;本页正文无 markdown 链接(原0个链接,处置见作者review的linkDisposition)。真实内容:

- 原实现复现(baseline-original.txt): 原脚本复制到隔离临时 checkout 后运行新增测试 exit1,8/8 合同失败——原脚本固定读取主工作树绝对路径且不拒绝非法 offset。
- 修复后定向(gate-targeted.txt): audit + shared MKF 测试 11/11 通过。
- 相邻 parser(gate-adjacent-tables.txt): tables parser 90/90;其中一条既有负控按设计输出 console.warn,不属于 lint/typecheck 诊断。
- typecheck exit0(gate-pal-extract-typecheck.txt)。
- 真实资源(real-data.txt): 从 /tmp cwd 读取 checkout 所属 DATA.MKF,15 chunks、63978 bytes;real-output-equivalence.txt 证明 HEAD 原脚本与候选对真实资源输出逐字节一致。
- source-sha256.txt 固定当前实现与测试源哈希。

候选改动只把路径解析为 import.meta.url 相对路径,并在独立诊断入口补齐 MKF header/offset/chunk 边界失败;保留 standalone .mjs,不把 shared TS loader 引入手工 Node 命令。新增8个测试使用真实 Node 子进程、临时 checkout、合法/损坏输入与 cwd 隔离,测试后清理临时树。

## 断言与业务 oracle

文档事实核对(currentExecution=false):各记录按其自身字段成立。关键身份: 基线 8/8 失败的根因是绝对路径依赖与无 offset 校验;真实资源 15 chunks/63978 bytes 与输出逐字节一致证明修复不改变提取语义,只改路径解析与边界诊断。exit0 不外推为零诊断或产品通过(一条按设计 warn 除外)。

## 结果

原文保全完整、模板符合、链接处置如实即本页治理结果;本轮语义整改把基线失败根因、定向/相邻/真实资源结果写回可见正文,不重开任务、不重跑执行。不产生新执行结果。实现、定向/相邻验证、全仓 check、ratchet、protected fast、lint-zero、docs/content-review、ledger 均通过;任务已归档为 done,全仓治理仍未完成,其他 pending/review 文件不随本批关闭。

## 限制与复核

未重跑原命令;历史结论保持原时点。各 *.txt 日志不在本轮1916候选集合内,数字按原文见证。不改变归档终态。候选待Owner非作者接收。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 1600B / SHA-256 a8860a9fbc413b0bdbf79282ad87bba03f683d8889be38ffc733c45f6b08efa1；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-82 evidence — DATA.MKF 只读诊断

本批只处理 `packages/pal-extract/audit-data-mkf.mjs`，不修改 extractor CLI、shared codec、raw/extracted 生成物或公共接口。

- 原实现复现：`baseline-original.txt`；把原脚本复制到隔离临时 checkout 后运行新增测试，退出码 1，8/8 合同失败。原脚本固定读取主工作树绝对路径，且不拒绝非法 offset。
- 修复后定向：`gate-targeted.txt`，audit + shared MKF 测试 11/11 通过。
- 相邻 parser：`gate-adjacent-tables.txt`，tables parser 90/90 通过；其中一条既有负控按设计输出 `console.warn`，不属于 lint/typecheck 诊断。
- typecheck：`gate-pal-extract-typecheck.txt`，exit 0。
- 真实资源：`real-data.txt`，从 `/tmp` cwd 读取 checkout 所属 `DATA.MKF`，15 chunks、63978 bytes；`real-output-equivalence.txt` 证明 HEAD 原脚本与候选对真实资源输出逐字节一致。
- `source-sha256.txt` 固定当前实现与测试源哈希。

候选改动只把路径解析为 `import.meta.url` 相对路径，并在独立诊断入口补齐 MKF header/offset/chunk 边界失败；保留 standalone `.mjs`，不把 shared TS loader 引入手工 Node 命令。新增 8 个测试使用真实 Node 子进程、临时 checkout、合法/损坏输入和 cwd 隔离；测试后清理临时树。

当前状态：实现、定向/相邻验证、全仓 check、ratchet、protected fast、lint-zero、docs/content-review、ledger 均通过；任务已归档为 done。全仓治理仍未完成，其他 pending/review 文件不得随本批关闭。
```
<!-- incremental-original-source:end -->
