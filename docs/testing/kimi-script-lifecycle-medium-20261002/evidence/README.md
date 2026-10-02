# Kimi 作者证据（TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2）

- 任务卡：[TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2](../../../ops/tasks/TEST-KIMI-SCRIPT-LIFECYCLE-MEDIUM-2.md)；协议/16候选：[../README.md](../README.md)；冻结/白名单：[../targets.json](../targets.json)；Codex 公开输入小样：[../preflight.json](../preflight.json)（非作者用例/accept）。
- 分支 `codex/kimi-script-lifecycle-medium-r1`，BASE `5805749d6c2954628cf912904bdd903a327d68c4`，sourceBase `8990f0cde3edfe6feb908234aeafcc937daaec52`（content21/SAVE10）。
- 主源（只读）：`packages/reforge/src/script-confirm-modal.ts`、`packages/reforge/src/script-activity-lineage.ts`。

## 交付导航

- [contracts.json](contracts.json)：16 候选逐条件账（源锚点/生产 caller/合法输入/旧 blob+fullName+matcher/完整 expected/分类/旧证明限制）。
- [directed-vitest.json](directed-vitest.json)：两新测 + 两旧同域文件真实定向 JSON（file×fullName×status，38 项）。
- [receipt.json](receipt.json)：门禁/环境红/未完账回执。
- [gates/](gates/)：原始门日志（`.raw.txt` 原字节）。

## 执行账

- **新执行 16 / 净新 16**：`script-confirm-lifecycle.kimi-mid-2.test.ts` 8 例（M01 拒绝激活零 capture、M02 view 包装隔离、M03 false 答案锁定、M04 两帧未提交仍 pending、M05 中项取消 FIFO、M06 真实监听清理、M07 迟到旧 abort、M08 登记窗口取消）+ `script-lineage-lifecycle.kimi-mid-2.test.ts` 8 例（L01 外借 lease 异常不越权关闭、L02 反向出栈回落、L03 闭 latest 回落 predecessor、L04 coordinator 域隔离、L05 signal 域局部清理、L06 async 持有与释放、L07 abort reason 身份、L08 失败后合法重入）。16 候选每 ID 一主例，预计 12–18，硬上限 24，实交 16。
- **旧证明 22 条**（contracts.json `existingProof`）：main 四例 + lineage 全例 + Q 十二例逐条 blob/fullName/matcher 登记；O/P/Grok/Cursor 两旧文件 blob 与 main 相同或仅一行无例差；Kimi-medium-1 异域；不更名换数字算新。
- **不可构造 0 / 阻塞 0**：captureFrame 抛错恢复策略与 mock beginActivity 造登记失败按协议不追加（非缺陷，登记于 notes）。

## 反控职责

作者不写/运行反控工具、不重采旧针；4 代表变异与至少两枚旧绿新红由 Codex 按最终候选采样。

## 门（详见 receipt.json）

- 定向新 16/16 绿；同域旧（script-confirm-modal + script-activity-lineage + Q 对照）22/22 绿；reforge typecheck 0。
- Reforge 全包：首轮 26 红 = render-occlusion 21（本树 canvas 原生未构建，`pnpm rebuild canvas` 修复后 21/21 绿，与 diff 无关）+ pal-meal-shell 5（faces 资产 gitignore 未在盘，环境红留原报告，不假绿、不抄资产）；修复后全包重跑结果见 receipt。
- 根 lint 完整 0/0/0、docs、`git diff --check`、verify.mjs 实跑见 receipt。

## 未完账

- pal-meal-shell 5 条环境资产红：需本机生成资产，非本卡产品发现。
- 覆盖率未测（按协议不重复全仓；85% 并集归 Codex）。
- 16 候选全部处置完毕，无 deferred；正式接入与共享导航归 Codex。
