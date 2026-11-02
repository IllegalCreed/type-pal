# CODE-QUALITY-82 — DATA.MKF 独立诊断脚本

Status: done
Owner: GLM(治理候选作者;原文作者/状态见保全块)
Last reviewed: 2026-10-30
Template: task-card-v1 / 1.0.0

## 目标

原卡目标:核验并修复只读诊断脚本 `packages/pal-extract/audit-data-mkf.mjs` 两个候选问题:（1）固定绝对路径 `/Users/zhangxu/illegal/type-pal/data/raw/DATA.MKF` 使隔离 worktree 误读主树;（2）非法 offset 静默截成合法 chunk 大小。修复后保持 `node packages/pal-extract/audit-data-mkf.mjs` 入口与输出格式:路径改为相对 `import.meta.url`,损坏结构在打印 census 前拒绝。

## 范围

白名单仅该脚本与新增 `audit-data-mkf.test.ts`;不修改 extractor CLI、shared codec、资产管线、raw/extracted 数据或公共 API。开批 HEAD `571fbeb18683c6f36d5b54a213c9a6159f28d4aa`,0 behind / 54 ahead,基线 `origin/main=646c8097`。

## 前提与证据

caller 搜索未发现 package script/import/生产运行链,该文件自身就是手工 CLI 入口,无 export。primary:`palcommon.c:855-1013` LE32 偏移表与相邻 offset 相减、`global.c:292-308,427-429`。最强替代解释"绝对路径用于有意集中读取同一资产"因违反隔离 checkout 与可迁移仓库路径被拒。保留 standalone parser 的理由:真实入口是 node 执行 .mjs,而 shared codec 是未构建的 TS workspace export。

## 验收

失败反例:HEAD 原实现隔离临时树回放 exit1、8/8 新增合同失败,证明串读与不 fail-closed（原件 baseline-original.txt）。修复后:audit+shared MKF 11/11、tables parser 90/90、pal-extract 全包 71 files/431 tests、typecheck/Biome 通过;真实 DATA.MKF 从 /tmp cwd 读取 15 chunks/63978 bytes,HEAD 原脚本与候选输出逐字节一致;全仓 check、ratchet（731/19855）、check:fast、docs/content、ledger 通过。推进记录如实登记:初次候选在建卡/反例前误落盘,已完整撤回为 HEAD 后重建失败反例,不冒称首轮先红。

## 状态与交接

done 保持原语义:本批不触碰 schema/save/migration/资产管线/公共 API/生成物;standalone parser duplication 作为执行方式边界保留登记。无下一位 Agent 提示词。

## 历史范围

原卡属固定 main 时点;原始记录在保全块内逐字保留。

## 原始结论

原卡结论按 Status(done) 原样:两个候选问题以失败反例证实并修复,真实输出等价。治理不撤销/不恢复旧信用。

## 当时证据

当时回执（baseline-original、定向/全包计数、ratchet）属原时点证据;本页不重跑、不复授。

## 当前有效性

仅历史任务归属有效;不凭旧基点认定当前脚本状态。

## 继任文档

CODE-QUALITY-2（共享 MKF 边界）为历史相关卡;当前任务导航以看板为准。

## 原文保全

固定 Git 原文如下；代码块仅保全原时点内容，不授当前执行信用。原源 5236B / SHA-256 76f60a6392d8d68ec8371fe93d049726444c4dfdb481ea8d2a06062c6da3e700；原字节不 trim、不替换、不解码。

<!-- incremental-original-source:start -->
```markdown
# CODE-QUALITY-82 — DATA.MKF 独立诊断脚本

Status: done
Owner: Codex
Phase: phase1 pal-extract / Q6 diagnostic
Capability: read-only MKF census
Visual Verification Timing: N/A（命令行只读诊断）

## 范围与前提

白名单仅 `packages/pal-extract/audit-data-mkf.mjs` 与新增 `packages/pal-extract/src/audit-data-mkf.test.ts`。单一 Coding Owner 为 Codex；不修改 extractor CLI、shared codec、资产管线、raw/extracted 数据或公共 API。最新基线 `origin/main=646c8097034e4bd30a3ebde86cd61d46a2382e8a`，隔离分支 `codex/code-quality-3y`，开批 HEAD `571fbeb18683c6f36d5b54a213c9a6159f28d4aa`，0 behind / 54 ahead。

一句话前提：手工运行的只读诊断必须读取脚本所属 checkout 的 DATA.MKF，且不能把损坏偏移表静默截成合法 chunk 大小。

| 方向 | 直接证据与判断 |
|---|---|
| primary source | `reference/sdlpal/palcommon.c:855-1013` 定义 LE32 偏移表与相邻 offset 相减；`global.c:292-308,427-429`、`global.h:252-444` 定义表/块布局；只证明结构，不推断玩法 |
| 第一阶段 | 原脚本 68 行全文读取；固定 `/Users/zhangxu/illegal/type-pal/data/raw/DATA.MKF`，隔离 worktree 也误读主树；无 offset 单调/末端边界验证。`shared/src/mkf.ts` 已有校验，extractor CLI 通过 re-export 使用它 |
| 第二阶段 | N/A；该 standalone 文件未被 migrate/reforge/editor 调用，不更改 canonical 工程或产物 |
| 目标 | 保持 `node packages/pal-extract/audit-data-mkf.mjs` 和输出格式；路径改为相对 import.meta.url；损坏结构在打印 census 前拒绝；仍以记录非整除告警报告内容差异 |

caller 搜索未发现 package script、import 或生产运行链；该文件自身就是手工 CLI 入口。没有 export。同步读取不拥有常驻句柄、timer、异步或取消状态；失败由 Node 非零退出传播。`readChunk` 仅消费从 0 到 chunkCount-1 的内部整数，因此不添加无 caller 的 index 防御。

最强替代解释：绝对路径用于有意集中读取同一资产；但这违反隔离 checkout 和可迁移仓库路径，且 CLI 真源通过自身路径读取资源。临时仓库提供独立 fixture、cwd 另指空目录：若脚本输出属于临时输入的 census，才推翻串读问题。边界 oracle 是独立构造偏移表的非零退出与无成功输出。

## 上下文与验收

- 已读 AGENTS/CLAUDE/workflow/governance/ledger；历史 CODE-QUALITY-2 的共享 MKF 边界与本文件 review 记录；当前 CODE53/57/79/80/81 不占用本白名单。
- 已完整读取本脚本、shared MKF、extractor MKF re-export/test、shared barrel/package、extractor README/package/tsconfig；读取 extractor CLI 数据表生产段与 SDLPal 结构、常量、读块实现。
- 两个候选问题：错误 checkout 路径、非法 offset 静默截断。只读诊断不是资产生产链，未触发 schema/save/migration/生成物改写。
- 先写进程级失败反例，再修复；真实 DATA.MKF 合法输出须与修复前逐字节一致。测试临时树在 finally 清理，子进程有超时，失败不得写真实资产。
- 定向、相邻 shared/pal-extract、typecheck、全仓 check、官方 ratchet、protected fast、lint-zero、ledger 必须通过后才收口；不能把全绿替代逐文件证据。

## 验证结果

- HEAD 原实现隔离临时树回放：exit 1，8/8 新增合同失败，证明固定绝对路径会串读主工作树且边界输入不 fail-closed；证据见 `docs/ops/evidence/CODE-QUALITY-82/baseline-original.txt`。
- 候选定向：audit + shared MKF 11/11；tables parser 90/90；pal-extract 全包 71 files / 431 tests；pal-extract typecheck exit 0；Biome 两文件 exit 0。
- 真实 `DATA.MKF` 从 `/tmp` cwd 读取 15 chunks / 63978 bytes；HEAD 原脚本与候选输出逐字节一致。
- 全仓 `pnpm check`：content 149/1498、shared 16/131、game 314/3550、pal-extract 71/431、reforge 359/8964、editor 631/4951、migrate 96/739；lint 4010 files，0 error/warning/info。
- `pnpm coverage:ratchet` exit 0：731 source files / 19855 fast tests；total statements 89.93%、branches 83.65%、functions 89.50%、lines 91.81%；仅新增本测试文件进入 pal-extract fast scope，未降低阈值或扩大排除。
- `pnpm check:fast` exit 0，全部 workspace typecheck/test 与 lint-zero 通过；docs/content-review/ledger 通过。

## 推进记录

Codex：premise verified / build allowed；范围只读诊断、零 API 变动。初次候选在建卡/反例前误落盘，已完整撤回为 HEAD，随后重建失败反例；该历史不冒称首轮先红。修复保留 standalone parser，因为真实入口是 `node` 执行 `.mjs`，而 shared codec 是未构建的 TS workspace export；实际路径/cwd 与输出等价反例已验证。

## 剩余与交接

本批不触碰 schema/save/migration/asset pipeline、公共 API、raw/extracted 生成物或用户可见行为；standalone parser duplication 作为执行方式边界保留并登记。全仓未完成；本批不得关闭未读的 Q3 文件。无下一位 Agent 提示词，继续由 Codex 单 Agent 执行。下一批选择未被活动卡占用的 Q3 pending 或 Q6 非 E2E 工具。
```
<!-- incremental-original-source:end -->
