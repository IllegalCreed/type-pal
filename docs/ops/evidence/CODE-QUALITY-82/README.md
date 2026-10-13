# CODE-QUALITY-82 evidence — DATA.MKF 只读诊断

本批只处理 `packages/pal-extract/audit-data-mkf.mjs`，不修改 extractor CLI、shared codec、raw/extracted 生成物或公共接口。

- 原实现复现：`baseline-original.txt`；把原脚本复制到隔离临时 checkout 后运行新增测试，退出码 1，8/8 合同失败。原脚本固定读取主工作树绝对路径，且不拒绝非法 offset。
- 修复后定向：`gate-targeted.txt`，audit + shared MKF 测试 11/11 通过。
- 相邻 parser：`gate-adjacent-tables.txt`，tables parser 90/90 通过；其中一条既有负控按设计输出 `console.warn`，不属于 lint/typecheck 诊断。
- typecheck：`gate-pal-extract-typecheck.txt`，exit 0。
- 真实资源：`real-data.txt`，从 `/tmp` cwd 读取 checkout 所属 `DATA.MKF`，15 chunks、63978 bytes；`real-output-equivalence.txt` 证明 HEAD 原脚本与候选对真实资源输出逐字节一致。
- `source-sha256.txt` 固定当前实现与测试源哈希。

候选改动只把路径解析为 `import.meta.url` 相对路径，并在独立诊断入口补齐 MKF header/offset/chunk 边界失败；保留 standalone `.mjs`，不把 shared TS loader 引入手工 Node 命令。新增 8 个测试使用真实 Node 子进程、临时 checkout、合法/损坏输入和 cwd 隔离；测试后清理临时树。

当前状态：实现、定向/相邻验证、全仓 check、ratchet、protected fast、lint-zero、docs/content-review、ledger 均通过；任务进入 review。全仓治理仍未完成，其他 pending/review 文件不得随本批关闭。
