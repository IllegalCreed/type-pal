# Kimi 当前恢复地址与作者步骤组织中包（TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1）

- 任务卡：`docs/ops/tasks/TEST-KIMI-CURRENT-CONTINUATION-MEDIUM-1.md`；共同协议/冻结：[../README.md](../README.md)、[../targets.json](../targets.json)。
- BASE `f5c7f904a3f623e3ca5b413ab43f78029d99fe11`（sourceBase `554b8a0552db30294a9050b4466659c4a14549f8`，content21/SAVE10）；分支 `codex/kimi-current-continuation-medium-r1`。
- 主合同源（只读）：`packages/reforge/src/script-continuation.ts`、`packages/content/src/author-flow-stages.ts`。

## 交付导航

- [contracts.json](contracts.json)：逐条件账（源锚点/生产 caller/合法输入/旧 blob+fullName+matcher/新 oracle 完整 expected/分类）。
- [directed-vitest.json](directed-vitest.json)：两新测文件真实定向 JSON（file×fullName×status）。
- [reforge-full-vitest/](reforge-full-vitest/)：Reforge 全包原始 JSON（超 1 MiB 格式门，按协议无损拆 3 片 + [index.json](reforge-full-vitest/index.json) 汇总/红文件清单，拼接即还原；含 5 条环境资产红，见下）。
- [counters/](counters/)：4 针反控——[mutants.mjs](counters/mutants.mjs)（r2 严格单一 judge + 拒收自测，可重跑）与 [evidence/](counters/evidence/)（各针 control/variant/restored 三态原 JSON 与原字节 `.raw.txt`、summary.json 产品与测试三态 SHA）。

## r1 窄返工（KIMI-R1-01/02，2026-10-02）

- **K6 末例合法化**：原"第二 stage entry"子轴经公开 `checkBaseScriptFlow` 真实拒收（`只允许 onEnter initial state`）；已去 entry，保留合法的第二 stage nested branch 臂 + body 隔离方向，四个作者 fixture 与 organized 产物全部补公开合法性断言；旧完整 oracle 已重排重（旧证仅 stage[0] body/entry/onNo，不覆盖第二态 branch 臂，非换名计新）。
- **严格单一 judge**：每针声明同一非零 file×fullName 多重执行范围（67/67/67/50 叶），control/variant/restored 三相共用；范围多重集合恒等（一红叠 pending 重复叶、缺叶、多叶、错身份、多红、非 AssertionError、内嵌运行时错、pending/todo、collection/suite 消息、未处理异常、signal、错误 exit 全部拒收），judge 由 runner 与 16 条拒收自测共用（2 accepted / 16 rejected）。
- **原 raw 入库**：12 份原字节 `.raw.txt`（绕开 `*.log` ignore，不改 ignore）+ 12 份原 JSON 全部进固定提交；逐针产品与测试文件三态 SHA 实采落 summary.json（恢复态与正控逐文件相等）。

## 执行账

- **新执行 32 / 净新 32**：`script-continuation.kimi-mid-1.test.ts` 28 例（K1 恢复地址域 4、K2 父子控制帧 13、K3 shared self 7、K4 取消与只读 4）+ `author-stage-organization.kimi-mid-1.test.ts` 4 例（K5 组织边界 1、K6 深拷贝与尾部 3）。容量 24–32，硬上限 36；实交 32。
- **旧证明 22 条**（contracts.json `existingProof`）：digest/index/控制类型/confirm 结果四态/叶子帧/嵌套 then-loop-callScript/128 深度/形状 17 变体/cadence/缺 initial/悬空 advance/stages 保持/排程五形/restart/complete 边/可达序/首次复读/命名 strip/stage[0] 隔离/编辑器集成，全部带旧 blob+fullName+matcher 行，不重复计新。
- **不可构造 1 条**：`script-continuation.ts:44-45` 缺根帧——形状守卫（`author-script-core.ts:1250` frames 1..256）必经在先，合法输入不可达。
- **让位 9 条**（`deferredBudget`）：同 throw 行/同族让位预算，逐条锚点在账，不自称覆盖。
- **阻塞 0**。

## 反控（4 针，不同新 oracle 目标；3 针含旧绿仅新红同场）

| 针 | 产品源最小变异 | 目标新例 | 同场旧绿 |
|---|---|---|---|
| machine-id-cursor | `script-continuation.ts:38` 去掉 machine id 比对 | K1 外机 machine 游标拒收 | runtime-auto-checkpoint 全绿（67 executed） |
| battle-none-arm | `:116` 允许 arm=none 下钻 | K2 战斗无结果臂拒收 | runtime-auto-checkpoint 全绿（67 executed） |
| none-explicit-self | `:137` none 禁显式 self 失效 | K3 none+显式 self 拒收 | —（范围同 67 叶；同场旧绿计数于另 3 针） |
| unreachable-tail | `author-flow-stages.ts:40` 尾部不再追加 | K6 restart 环+尾部稳定 ID | author-flow-stages 全绿（50 executed） |

每针：正控声明范围全绿（exit 0）→ 变异范围内恰一 AssertionError（exit 1）→ 恢复后同范围重跑全绿（exit 0）；产品源与测试三态 SHA 逐针实采见 evidence/summary.json；临时 mkdtemp 副本跑后即清，仓库全程 hash-pin 零漂移。

## 门

- 定向 32/32 绿；相邻（runtime-auto-checkpoint/author-flow-stages/script-runner-core）82/82 绿；reforge+content typecheck 0/0。
- content 全包 1255/1255 绿。
- Reforge 全包 2252/2257：**5 红全部在 `pal-meal-shell.test.ts`，环境资产红**——`projects/pal/assets/migrated/faces/*.png` 为本机生成资产（gitignore 未跟踪、本树 0 个在盘），`AssetResolver` ENOENT；与本批 diff 无关（BASE 产品树逐字节相同），原始报告保留于 reforge-full-vitest/ 分片，不填假绿、不抄真实资产进树。
- 根 lint 完整 0/0/0、docs 检查 0 issues、`git diff --check` 零、verify.mjs 通过（结果见 receipt.json）。

## 未完账

- deferredBudget 9 条真实但让位的条件（contracts.json 逐条）；是否放行由 Codex 裁决，不自动续派。
- pal-meal-shell 5 条环境红：需本机生成资产方可复绿，属环境前提，非本卡产品发现。
- 覆盖率未测（按卡不重复全仓测量；85% 并集归 Codex）。
