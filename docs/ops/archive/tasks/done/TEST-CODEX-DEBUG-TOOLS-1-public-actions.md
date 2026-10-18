# TEST-CODEX-DEBUG-TOOLS-1 — 调试面板公开动作六组

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（真实DOM事件/参数合同，不改UI、不声明像素验收）
Last reviewed: 2026-10-18
Governance Owner: Codex（历史卡文档治理；不代签原执行）
Template: task-card-v1 / 1.0.0

本卡是 +5pp 队列中对 Reforge 调试面板（installDebugTools）公开动作的纯测试批次历史记录；下述数字与门禁均为原卡时点陈述，本次文档治理未重跑。

## 目标

为调试面板控制台主体补六组公开动作合同测试（commands/failures/triggers/battle/inspect/navigation）：真实 DOM 事件、真实 ScriptProjectRuntime、生产 buildWorld 预设下检查实际传参与 world/工程输入深保真。

## 范围

- 范围内：新增 packages/reforge/src/debug-tools.{commands,failures,triggers,battle,inspect,navigation}.test.ts 六文件、专属 src/__tests__/debug-tools-fixtures.ts 与 docs/testing/archive/legacy/batches/codex-debug-tools/** 证据；起点 cd1baa6c，属[+5pp 队列](TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
- 范围外：私有反射、核心 mock、放宽 fixture 守卫；产品/旧测试/配置/资产；与 Cursor 命令、GLM 内容 guard、另一 Codex 架构实现的文件重叠；真实战斗、Canvas 或磁盘保存的验证声明（宿主副作用端口仅作调用/失败/取消见证）。

## 前提与证据

唯一消费者 main.ts:5958-6015 经 DEV 动态 import 调用 installDebugTools；既有 debug-tools.test.ts 七项偏安装/生命周期/样式，未覆盖控制台主体、触发实际 runtime、battle 参数构造。原版/第一阶段 N/A（Reforge 私有调试 DOM 适配器）。可证伪反例：无消费者或重复已有测试——已核 main 真实入口及全仓测试 import，新增仅未证合同。
- 当前状态：done（历史终态）

## 验收

原卡记录：61 新增/相邻 17、定向 78/78、Reforge TC、新文件 Biome 通过；六正控+六单点反控全部有精确业务 AssertionError 且产品 hash 不变，详见[回执](../../../../testing/archive/legacy/batches/codex-debug-tools/README.md)；串行 check 9387→ratchet→保护 cd1baa6c 单次 strict 8895 全 exit 0；全仓 45304/63178 净增 173B；生产 701 文件与其它六包 baseline 不变。以上均为原卡时点结果，本页未复跑。本页迁移验收：source/after SHA、quote 逆回读、模板与历史 overlay 章节、链接通过。

## 状态与交接

原卡明确无下一位 Agent 提示词：Codex 提交推送并继续后续整批；当前模式由 Codex 实施/自验，不冒称独立他席；本批纯测试/文档无产品选择，done 准入满足、母卡未完成。S14 本页治理只改写泛化封套。

## 历史范围

2026-09-26 Codex build allowed 并同日实施 accept；起点 cd1baa6c。2026-10-17 R41 泛化封套，2026-10-18 S14 逐篇改写。

## 原始结论

`Status: done`：六组公开动作合同按纯测试批收口；真实缺陷另登记、不改预期凑绿。原卡全文在下方 quote 保全。

## 当时证据

[回执](../../../../testing/archive/legacy/batches/codex-debug-tools/README.md)；正控/反控与产品 hash 不变陈述为原卡记录。本页治理未新增任何执行。

## 当前有效性

historical。不把历史 78/78 或 strict 8895 当作当前 main 结论；调试面板现行行为以当前测试与 catalog 为准。

## 继任文档

队列母卡见[TEST-COVERAGE-PLUS5-1](TEST-COVERAGE-PLUS5-1-continuous-batches.md)；相邻批次见[TEST-CODEX-COMMAND-FORMS-1](TEST-CODEX-COMMAND-FORMS-1-current-dialogs.md)。

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
