# OPS-CURSOR-TEMP-CLEANUP-1 - Cursor 反控临时工作树去重清理

Status: done
Owner: Codex（文档治理；不代签原执行）
Last reviewed: 2026-10-17
Template: task-card-v1 / 1.0.0

本页把已关闭 ops 任务卡接入 `task-card-v1`，并追加 `archive-record-v1` 历史边界。原始状态、日期、证据、counter、链接和未决项在 quote 中保全；历史 done 不自动授权当前 build、runtime、E2E、视觉或 coverage。

## 目标
- 保留原任务的目标、完成边界、历史结论和用户可见适用范围。

## 范围
- 当前包含：原卡声明的实现/测试/证据范围及其历史限制。
- 明确不包含：本次迁移不修改产品源码、旧测试、真实数据或历史结论。

## 前提与证据
- primary source：固定 source revision `cddbd73c682e3264e5d981ba84affab894986be4` 与原卡全文。
- 合法输入、caller、证据和 counter：按原文 quote 解释；本次不重跑原执行。
- 事实权：当前 task card、代码、consumer 和新 receipt；历史卡不单独证明当前行为。

## 验收
- 原卡历史验收、失败、blocked、rework 和未执行边界保持原样。
- 本次迁移验收：source/after SHA、quote inverse、模板章节、链接和历史 overlay 通过。
- runtime/E2E/视觉/coverage：本次均未执行，信用为 0。

## 状态与交接
- `status`: done（历史快照）；当前工作不得从 quote 中自动获得 build 授权。
- Owner/provenance：原卡保留于 quote；当前文档治理 owner 为 Codex。
- 下一步：若需重新启用，创建当前 task card，重新核 primary source、合法输入、business oracle 和独立验收。

## 历史范围
- 原始日期、版本、阶段：源文档固定于 `cddbd73c682e3264e5d981ba84affab894986be4`；本轮为 2026-10-17 R43。
- 归档原因：已关闭任务记录只作为时点事实保留，避免历史状态冒充当前事实。

## 原始结论
- `Status: done`；原始任务语义完整保留于下方 quote。

## 当时证据
- 原始命令、产物、SHA、签字、counter、链接和状态保留于 quote。

## 当前有效性
historical。do not promote historical task card to current runtime/E2E/visual/coverage acceptance
- 历史冲突/未决：需由当前 task card、consumer 和新证据重新复核。

## 继任文档
- 当前 canonical 文档：当前任务卡、当前代码/consumer 和 fresh receipt。
- supersedes / superseded-by：替代 governed-legacy 的未分层呈现；原卡内容不删除。
- 若重新启用的复核条件：合法输入重跑、业务 oracle 可证伪、独立 review 和全量静态门通过。

## 原文保全
固定源 revision `cddbd73c682e3264e5d981ba84affab894986be4`，source SHA `e841a7379c95c49712792a424f44ec73ea5c237ed6cc468ea152186005b7a98b`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # OPS-CURSOR-TEMP-CLEANUP-1 - Cursor 反控临时工作树去重清理
>
> Status: done
> Owner: Codex
> Reviewer: Codex（独立于原 Cursor 测试产物）
> Phase: ops
> Capability: ops
> Visual Verification Timing: N/A（磁盘与 Git 运维，不启动游戏或录屏）
>
> ## 目标与授权
>
> 2026-10-02 用户要求 Codex 判断残留测试副本，保留并提交有用代码、删除重复内容，
> 并提供可直接转发给 Cursor 的防复发提示词。本卡仅处理此前核实的 180 个
> `cursor-counter-*` 临时 worktree，不扩大到其它 Agent 的工作树、分支或活动对话。
>
> ## 前提与上下文锚点
>
> - 180 个 `.git` 指针全部归属本仓库，HEAD 均为 `0704d3de6d3d2a2099475a42f601b654bba08579`。
> - 只看 Git dirty 不足以判定独有开发成果；这些目录涉及 68 个反控编号，部分重复四次。
> - Cursor 候选 `fefab931c4174f0755e0d7766a8757490194a067` 中
>   `docs/testing/archive/legacy/batches/grok-cursor-large/cursor/counter.mjs:230` 创建隔离树，
>   `:235` 复制未提交测试，`:236` 复制依赖，`:280` 写入故意变异。
> - 修复提交 `2e1f7228d` 的父版本通过 `die()/process.exit(2)` 退出，跳过 finally；
>   该提交已改为 throw/catch/finally。历史残留不会被此修复自动删除。
> - 已有只读清单：本机
>   `/Users/zhangxu/workspace/worktree-cleanup-records/disk-cleanup-20261002.K3SqcG/worktree-audit.json`。
> - 最强替代解释：某些目录可能含人工修改、独有测试或未备份文件。
>   任何无法与反控规则、已提交 blob 或独立恢复备份对应的文件，均阻止该目录删除。
> - 原版/第一阶段/二阶段玩法真值：N/A，本任务不改产品、测试语义或资产供应链。
>
> ## 范围与验收
>
> 1. 逐树重新检查 HEAD、tracked/untracked/ignored 文件及占用情况。
> 2. 逐字节区分已提交代码、声明的故意变异和独有内容；独有内容先保存并验证恢复副本。
> 3. 不把故意变异合入产品；不因清理提前接收 Cursor 的完整候选测试包。
> 4. 仅按固定清单删除已审计目录及其 worktree 注册项，不使用全局 prune 或范围通配删除。
> 5. 核验正式 Cursor 候选和 main 未受影响、全部删除目标消失，记录磁盘前后值及提交证据。
> 6. 本任务不启动录屏，也不修改其它 Owner 的源码、任务状态或已有未提交文件。
>
> ## 当前模式推进记录
>
> - Codex 前提核验：verified；证据如上，文件级保留/去重结论待完成。
> - build 准入：Codex build allowed，仅限清单审计、可恢复保存、精确清理及运维文档。
> - 内容审计：180 树各一处 tracked 修改；166 处逐字节匹配已提交反控 manifest，
>   另 14 处为独立逐补丁确认的实验性变异，不包含待合入产品修复。
> - 测试/fixture：共 90 份不同内容，24 份与候选逐字节相同；66 份是已有新版对应的旧稿，
>   不在原 reachable Git blob 集中。全部保留，不以旧稿覆盖候选或自动接入官方覆盖率。
> - 可恢复保存：158 个去重 blob（1,165,858 字节）、180 份 diff、完整路径/模式/类型映射，
>   保存于上述本机清理目录的 `preserved/` 独立 Git 仓库。
>   恢复提交 `870cc6244c9a52ea7ac0f42059e216d240e76ca1`；逐 blob 回读 hash 和 `git fsck --strict` 通过。
> - 正式 Cursor 候选 `fefab931c4174f0755e0d7766a8757490194a067` 及其分支/工作树保留。
> - 独立验收：内容分类及恢复仓库 accept；180 个精确路径全部删除且注册项消失。
>   删除前再次核 HEAD、状态、ignored 清单、每个文件 hash/mode/type 和进程占用。
>   正式候选仍为 fefab931c、工作树干净；main 产品源码无 diff，既有 `.zcodeignore` 未触碰。
>   全仓 lint 2760 文件 0/0/0；37 个文档工具测试通过；最终任务索引同步后复核文档检查。
> - 完成结果：180/180 个临时目录及其 Git 注册项均移除，未扩大到其它工作树；
>   此批此前分配占用约 80.6 GiB。目录删除可由保留的基线与去重内容重建，依赖需重新安装。
> - 额外保留基线与候选引用：`refs/archive/ops-cursor-temp-cleanup-20261002/base` 和
>   `refs/archive/ops-cursor-temp-cleanup-20261002/cursor-candidate`，避免后续普通分支退役导致对象被回收。
> - done 准入：Codex done allowed；内容审计、恢复提交完整性、精确删除、正式候选保真、
>   lint 零诊断、文档工具 37 项及文档检查 0 issues 均已验证。
>   本任务无产品源码变更，未重跑产品单测或录像，不声称完整产品集成验收。
>
> ## 交接
>
> - 2026-10-02 Codex：按用户新授权启动内容级审计，不再将所有 dirty 测试树一概视为待提交产品代码。
> - 2026-10-02 Codex：158 个独有 blob 已在本机恢复仓库提交为 `870cc624`；
>   180 树全部移除，原正式候选保留。本机执行明细为清理目录下 `removed-worktrees.jsonl`、
>   `cleanup-result.json`，跨项目只读盘点为 `other-projects.json`。
>   同轮用户另行批准的 Skyfire 旧迁移备份与 SlideStack 旧依赖清理不改变本卡的 type-pal 范围。
>
> ## 下一位 Agent 提示词
>
> 以下提示词由用户按需转发给 Cursor；本会话未自动向其它 Agent 发送消息。
>
> ```text
> 你在 type-pal 反控测试中遗留了 180 个 cursor-counter-* 工作副本，共约 80.6 GiB。
> 旧脚本用 process.exit 跳过 finally，并为每个测试复制完整依赖；重跑继续放大占用。
> 这属于必须纠正的资源管理缺陷，不能再把清理留给用户。
>
> 先读 AGENTS.md、CLAUDE.md、docs/phase2/READ-FIRST.md 和
> docs/ops/archive/tasks/done/OPS-CURSOR-TEMP-CLEANUP-1.md，
> 再在你当前独立候选工作树中检查 docs/testing/archive/legacy/batches/grok-cursor-large/cursor/counter.mjs 及批量调用方。
> 已有退出路径修复不要盲目重做；补齐尚未满足的防复发约束：
> 1. 所有可捕获的失败、异常、超时、SIGINT/SIGTERM 都必须结束子进程并清理本次创建的树；
>    清理之前不得 process.exit。不可捕获终止须留下精确登记，供下一次启动核验后恢复清理。
> 2. 不得逐用例无界复制完整仓库和 node_modules；合理复用隔离环境与只读依赖，
>    设置明确的并发、临时树数量、磁盘空间上限，超限停止创建并报告。
> 3. 清理只允许精确到本次拥有的路径，核实真实路径和所属 Git；不得全局 prune、
>    通配强删、删除其它 Owner 的树，也不得为清理提交故意变异到产品代码。
> 4. 正常、失败、中断三类最小复现后，都提交目录及 Git 注册项零残留的实测证据，
>    并报告创建数、清理数、峰值占用、测试结果与零诊断静态门。
> 5. 本轮不要录制宣传视频或 pal 剧情录像，不重建已删除的历史测试树。
>
> 只提交你负责的脚本修正、相关测试和证据，保持原候选隔离；不要合 main，
> 不要把历史临时树中的旧测试覆盖新版，不自行标记原测试包 done。交由 Codex 独立验收。
> ```
<!-- original-source-quote:end -->
