# 本包共用工具

见[工作包](../README.md)。共用严判据/自测与四批隔离负控入口：

```bash
env -u NODE_COMPILE_CACHE node docs/testing/glm-state-commands/tools/state-commands-mutants.mjs <a|b|c|d>
```

- `state-commands-mutants.mjs`：四批共用单点业务负控（同 item-logic 已接收判据）——恰 exit
  （对照 0/变异 1）、恰一红、失败记录绝对文件+Vitest 实际 fullName 逐字匹配、AssertionError-only、
  逐条拒混错/timeout/unhandled、无 pending/todo/fullName 重复、numTotalTests 等于登记的定向范围、
  load 实际命中写 entered.json 见证、生产源 sha256 每轮复验不变；判据自测（10 反例含
  混错/timeout/多红/错名/异文件/exit2/exitnull/零执行/对照样本）与实跑走同一 judge 函数。
- 已登记批：`b`（对照 27 项 + 3 针：skill-first-capture-overwrite、poison-patch-alias、
  enemy-team-old-overwrite）、`c`（对照 33 项 + 3 针：sprite-share-undo-overdelete、
  tileset-remove-shared-cascade、actor-detach-first-capture）、`d`（对照 22 项 + 3 针：
  shop-update-first-capture、ambience-undo-occupied-silent、battlefield-undefined-delete-drop）。
  `a` 批交付时在脚本 `batches` 表登记各自范围与针。
- 输出合同：stdout 逐行 `control: green` / `<针id>: business red`，末行给临时目录（summary.json：
  hashes/selfTest/evidence）。不得修改仓库原探针或生产源。
