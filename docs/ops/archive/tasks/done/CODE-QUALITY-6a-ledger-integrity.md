# CODE-QUALITY-6a - 逐文件账本唯一性与清单对账门

Status: done
Phase: ops tooling
Capability: ops / code-quality
Coding Owner: Codex
Reviewer: Codex（复核并执行质量门；不冒充第三方）
Branch: codex/code-quality-governance
Last reviewed: 2026-10-16
Governance Owner: Codex（文档治理；非作者独立复核后根接收）
Template: task-card-v1 / 1.0.0

## 目标

保留10-05逐文件ledger唯一性与真实inventory对账工具收口：机器防重复/漂移/漏记，明确semantic review still required；本卡done不是全仓源码审计完成。

## 范围

原新增code-quality-ledger.mjs/专属测试与治理记录修正，只读校验与恢复Q3s误替行；不改游戏机制/schema/save/产品/UI/coverage规则，也不自动标已验证或删未知候选。

## 前提与证据

原Q3u/Q3w重复与Q3t误替Q3s由路径对账检出，重复可能只是相邻证据，须合到一主记录。直接读固定源真实consumer142行及根test:quality-tools字段，确认导入纯函数不启动CLI、CLI读inventory/ledger且输出语义审查仍必需；本轮不执行quality旧测试或给工具新独立accept。

## 验收

原验收包括重复/未知路径、非法状态/缺证据、汇总/inventory增删、fenced文本、失败无写入与真实仓库调用；37工具项/其中9专属反例、2966/226closed/5review/2735pending及全仓门按原轮保留。不因文档门通过在H修改源22ee的3290对账差额或parser规则。

## 状态与交接

原done、Coding Owner Codex、Reviewer“复核质量门不冒充第三方”保留，10-05原两条交接不重开。作者只贡献H历史文档；G已独立接收当前共享ledger的记录对账修正，机器PASS仍不授代码语义信用。 2026-10-16文档迁移经非作者history_cards_c_tail复核、根Codex接收；不增加产品或动态验收。

以下同名标题保留原GFM入口，仅导航到本次具体归纳或完整历史原文。旧prompt、命令、分支和签字均按原日期读取，不恢复执行授权。

### 前提、范围与准入

原时点内容见[前提与证据](#前提与证据)；不得从导航标题推定当前准入或实跑。

### 验收

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 收口证据

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

### 交接

原时点内容见[原始结论](#原始结论)；不得从导航标题推定当前准入或实跑。

## 历史范围

2026-10-05 ops tooling；原2966与226/5/2735是该完整性工具接入时点，后续Q3x增加3已闭合另有卡。历史全仓19285/726与记录数量不是同一分母。

## 当时证据

原卡10–44保存真实runner、9反例/37工具项、原静态/coverage结果；本轮另直接全文读scripts/quality/code-quality-ledger.mjs142行与package.json test:quality-tools字段，未读其测试全文、inventory全文件或重跑旧门。总纲198–232/ledger124–134仅窄读，不为所有ledger记录发语义信用。

## 当前有效性

historical。工具PASS只能证明该输入下记录结构/集合与汇总，不能证明人读过生产或所有业务oracle有效；原被重复数和误替行须保留历史，当前inventory更新不能让新路径自动变已验证。

## 继任文档

[质量总纲](../../../audits/code-quality-governance.md)/[真实ledger](../../../audits/code-quality-file-ledger.md)维护当前清单，[Q3x](CODE-QUALITY-3x-game-battle-progression.md)记录后继3文件审计；当前质量门按[现行流程](../../../agent-workflow.md)，不执行本历史卡作为新授权。

## 原始结论

保留10-05逐文件ledger唯一性与真实inventory对账工具收口：机器防重复/漂移/漏记，明确semantic review still required；本卡done不是全仓源码审计完成。

当轮验收范围：原验收包括重复/未知路径、非法状态/缺证据、汇总/inventory增删、fenced文本、失败无写入与真实仓库调用；37工具项/其中9专属反例、2966/226closed/5review/2735pending及全仓门按原轮保留。不因文档门通过在H修改源22ee的3290对账差额或parser规则。

完整原卡来自Git blob `24fc9f53362b30560e21fa29738a3c63919ccc47`，source revision `22eead43a6c825e1345feb92441e09d340d22c18`；预审 `83750d8425709257a609c1b9f62b8c6686d53987` 对应blob完全相同。以下非空行仅增加 `> `、空行仅增加 `>`，原UTF-8字节可严格逆回读。所有历史产品决定、日期、失败、非零诊断、数字、用户裁决与prompt完整保留；引用不是今天产品执行、测试质量或独立签收。

<!-- original-source-quote:start -->

> # CODE-QUALITY-6a - 逐文件账本唯一性与清单对账门
>
> Status: done
> Phase: ops tooling
> Capability: ops / code-quality
> Coding Owner: Codex
> Reviewer: Codex（复核并执行质量门；不冒充第三方）
> Branch: codex/code-quality-governance
>
> ## 前提、范围与准入
>
> 用户要求逐文件治理，不能以包绿、重复行数或手填计数替代完成证据。此前 Q3u/Q3w 重复计数已由直接
> 路径对账检出；Q3t 还误替换 Q3s 的 battle-system 生产文件行。现有 `scripts/quality/code-quality-inventory.mjs`
> 只输出待核清单，`code-quality-inventory.test.mjs` 只验清单字段，不校验 Markdown 账本；
> `docs/ops/audits/code-quality-file-ledger.md` 当前头部为 226/5/2735，tracked inventory 为 2966。
>
> - primary/第一阶段/二阶段：N/A；本包只校验治理记录，不改变游戏机制、schema/save、生成物、UI或覆盖率规则。
> - 直接 caller：根 `test:quality-tools` 的 `node --test scripts/quality/*.test.mjs`；新测试必须调用真实校验器。
> - 最强替代解释：重复文件可能是相邻复核，不是新增完成；保留一条主记录，把相邻证据合并，不重复计数。
> - 可证伪观察：重复路径、错计数、清单中新增/删除路径、非法状态或空证据仍可通过，即校验器失效。
> - 白名单：新增 `scripts/quality/code-quality-ledger.mjs` 与专属测试；修正 ledger/总纲/本卡/board/index。
> - 不做：不判断人是否真正读过源码，不自动标已验证，不自动删候选，不降低 lint/coverage 门。
> - Codex：`premise verified`、`design agree`、`build allowed`。只允许只读校验和治理文档修正。
>
> ## 验收
>
> - 同一路径只计一次；重复/未知路径、非法状态、缺证据、清单总数/状态汇总漂移均 fail-closed。
> - 以真实 inventory 输出做对账；失败不得写文件，导入纯校验函数不得启动 CLI。
> - 定向测试包括独立反例和实际仓库调用；补充根质量工具、docs、lint零诊断。
> - 恢复 Q3s 被误替换的原账本行；历史测试/coverage 数值原样保留，不追溯伪造零诊断。
>
> ## 收口证据
>
> - 机器 CLI：`node scripts/quality/code-quality-ledger.mjs` PASS — 2966 files; 226 closed / 5 review / 2735 pending；明确输出 semantic review still required。
> - 质量工具：`node --test scripts/quality/*.test.mjs` 37/37 全绿；新增 ledger 专属测试 9 个，覆盖重复/未知路径、状态计数漂移、inventory 增删、表形状/状态/证据缺失、fenced 文本与真实仓库调用。
> - 全仓 `pnpm check`：docs 914 Markdown / 4709 links / 313 tasks；content 149/1490；shared 16/131；game 298/3403；pal-extract 69/421；reforge 325/8682；editor 606/4845；migrate 95/723；Biome 3200 files，0 errors / 0 warnings / 0 infos。
> - `pnpm coverage:ratchet` 与 `TYPE_PAL_COVERAGE_BASE_REF=origin/main pnpm coverage:fast`：726 files / 19,285 tests，statements 88.89%、branches 82.67%、functions 88.59%、lines 90.80%，基线不变、无回退、0 improvements。
> - 文档/静态：`node scripts/docs/check.mjs --json` 0 issues，`git diff --check` 通过。
> - 结论：记录完整性门已纳入正式 quality-tools runner；它只防重复/漂移/漏记，不替代逐文件源码语义审查；goal 仍未完成。
>
> ## 交接
>
> 2026-10-05 Codex：先完成账本事实核验，再实现机器门。Q3x 继续只读，禁止因为工具过门而宣布全仓已审。
> 2026-10-05 Codex：账本门、反例测试、全仓 check、ratchet、protected fast 和零诊断全部通过；卡转 done 后归档。
>
> 无下一位 Agent 提示词；本卡只完成治理记录完整性，不代表全仓源码治理完成。
