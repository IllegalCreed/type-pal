# TEST-CODEX-DEBUG-TOOLS-1 — 调试面板公开动作六组

Status: done
Owner: Codex
Phase: phase2
Visual Verification Timing: N/A（真实DOM事件/参数合同，不改UI、不声明像素验收）

## 准入与边界

2026-09-26 Codex build allowed，起点cd1baa6c；属于[+5pp队列](../../../tasks/TEST-COVERAGE-PLUS5-1-continuous-batches.md)。
当前消费者main.ts:5958-6015经DEV动态import调用installDebugTools；目标debug-tools.ts，
既有debug-tools.test.ts七项偏安装/生命周期/样式，未覆盖控制台主体、触发实际runtime、battle参数构造。
原版/第一阶段N/A：本批是Reforge私有调试DOM适配器，不裁决玩法或变更交互。
最强替代解释是无消费者或重复已有测试；已核main真实入口及全仓测试import，新增仅未证合同。

## 六组与白名单

新增packages/reforge/src/debug-tools.{commands,failures,triggers,battle,inspect,navigation}.test.ts，
专属src/__tests__/debug-tools-fixtures.ts、docs/testing/codex-debug-tools/**。
只调用installDebugTools与真实DOM事件；工程经正式loader；脚本经真实ScriptProjectRuntime，
宿主副作用端口仅作调用/失败/取消见证，不称真实战斗、Canvas或磁盘保存已验证。
预设使用生产buildWorld，检查实际传参和world/工程输入深保真。不得私有反射/核心mock/放宽fixture守卫。
与Cursor命令、GLM内容guard、另一Codex架构实现无文件重叠；产品/旧测试/配置/资产不改。

一次整批定向/相邻/TC/Biome、六代表负控；再串行check→ratchet→保护起点单次strict-fast。
真实缺陷另登记，不改预期凑绿、不跑逐组覆盖；新统计以全套并集为准。

## 实施与收口

2026-09-26 Codex accept：61新增/相邻17，定向78/78、Reforge TC、新文件Biome通过；
六正控+六单点反控全部有精确业务AssertionError且产品hash不变，详见[回执](../../../../testing/codex-debug-tools/README.md)。
串行check9387→ratchet→保护cd1baa6c的单次strict8895全部exit0；全仓45304/63178，
净增173B。生产701文件、各分母与其它六包baseline对象不变。当前模式由Codex实施/自验，
不冒称独立他席；本批纯测试/文档无产品选择，done准入满足，母卡未完成。
无下一位Agent提示词，Codex提交推送并继续后续整批。
