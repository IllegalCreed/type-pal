# TEST-CODEX-DEBUG-TOOLS-1 — 调试面板公开动作六组

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
- primary source：固定 source revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229` 与原卡全文。
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
- 原始日期、版本、阶段：源文档固定于 `b9901f97a3a09359cbeaed9dde126e6f44b7f229`；本轮为 2026-10-17 R41。
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
固定源 revision `b9901f97a3a09359cbeaed9dde126e6f44b7f229`，source SHA `baf69349bd48a3abd9a96eb1c55f10255d334f624a8e87f9ed79b7f0c7bc9bd9`；下方 quote 可逆回原始 UTF-8 字节。
<!-- original-source-quote:start -->
> # TEST-CODEX-DEBUG-TOOLS-1 — 调试面板公开动作六组
>
> Status: done
> Owner: Codex
> Phase: phase2
> Visual Verification Timing: N/A（真实DOM事件/参数合同，不改UI、不声明像素验收）
>
> ## 准入与边界
>
> 2026-09-26 Codex build allowed，起点cd1baa6c；属于[+5pp队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
> 当前消费者main.ts:5958-6015经DEV动态import调用installDebugTools；目标debug-tools.ts，
> 既有debug-tools.test.ts七项偏安装/生命周期/样式，未覆盖控制台主体、触发实际runtime、battle参数构造。
> 原版/第一阶段N/A：本批是Reforge私有调试DOM适配器，不裁决玩法或变更交互。
> 最强替代解释是无消费者或重复已有测试；已核main真实入口及全仓测试import，新增仅未证合同。
>
> ## 六组与白名单
>
> 新增packages/reforge/src/debug-tools.{commands,failures,triggers,battle,inspect,navigation}.test.ts，
> 专属src/__tests__/debug-tools-fixtures.ts、docs/testing/archive/legacy/batches/codex-debug-tools/**。
> 只调用installDebugTools与真实DOM事件；工程经正式loader；脚本经真实ScriptProjectRuntime，
> 宿主副作用端口仅作调用/失败/取消见证，不称真实战斗、Canvas或磁盘保存已验证。
> 预设使用生产buildWorld，检查实际传参和world/工程输入深保真。不得私有反射/核心mock/放宽fixture守卫。
> 与Cursor命令、GLM内容guard、另一Codex架构实现无文件重叠；产品/旧测试/配置/资产不改。
>
> 一次整批定向/相邻/TC/Biome、六代表负控；再串行check→ratchet→保护起点单次strict-fast。
> 真实缺陷另登记，不改预期凑绿、不跑逐组覆盖；新统计以全套并集为准。
>
> ## 实施与收口
>
> 2026-09-26 Codex accept：61新增/相邻17，定向78/78、Reforge TC、新文件Biome通过；
> 六正控+六单点反控全部有精确业务AssertionError且产品hash不变，详见[回执](../../../../testing/archive/legacy/batches/codex-debug-tools/README.md)。
> 串行check9387→ratchet→保护cd1baa6c的单次strict8895全部exit0；全仓45304/63178，
> 净增173B。生产701文件、各分母与其它六包baseline对象不变。当前模式由Codex实施/自验，
> 不冒称独立他席；本批纯测试/文档无产品选择，done准入满足，母卡未完成。
> 无下一位Agent提示词，Codex提交推送并继续后续整批。
<!-- original-source-quote:end -->
