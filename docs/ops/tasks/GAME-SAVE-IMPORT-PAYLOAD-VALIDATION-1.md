# GAME-SAVE-IMPORT-PAYLOAD-VALIDATION-1 — 第一阶段导入内容合法性

Status: draft
Phase: phase1
Capability: save import input boundary
Coding Owner: Codex
Reviewer: Codex
Visual Verification Timing: dev-functional（获准修复后，验证真实文件入口拒绝且不覆盖槽位）
Branch: `codex/code-quality-3y`

## 目标

按用户2026-10-21批准，先核定第一阶段V1合法内容合同，再以正式红例修复损坏内容入槽。CODE59保持partial；当前仍只读复现/合同阶段，不因原版本门或测试全绿接受整个文件。

## 范围

候选为tools/save-io.ts及直接测试；tools-panel的FileReader→parseImportedSave→saveSlot、core/save/api与bootstrap读档是只读caller。未经裁决不修改实现、导出格式、Save API、slot数据或二阶段codec；不恢复旧upgrader/fallback。

## 前提真值门

- 基点779163109637a92876d02700bf517ac2f979775f，治理树，Codex单Owner。工具格式为第一阶段type-pal-save/version1，与二阶段SAVE12分开。
- SDLPal没有本项目JSON导入入口；项目当前类型、工具导入计划和真实TS调用链是依据，不借原版名义补政策。
- parseImportedSave只核format/version/partyMembers数组/wNumScene数值，随后将其强转成GameState。
- tools-panel实际把解析结果交saveSlot；Save API只按已合法GameState提取meta并克隆写入。窗口依赖在bootstrap注入，非测试自造消费者。
- 合法对照是createInitialGameState→serializeSave；反例只把其gs.dwCash从number改成string。真实parse→Save.saveSlot→loadSlot/listSlots均接受，loadedCash与meta.cash均为string。
- 观察在新Node进程的内存Save路径完成，indexedDB明确不存在；临时槽最后删除，未访问用户浏览器存档。它不是实际IndexedDB/UI烟测，也不是正式先红后绿单测。

## 证据与停止线

[父卡analytics窗口回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)的完整原件包中，save-import-observation.mts、对应execution/stdout/stderr保存实际调用和结果。该观察是下一候选的停止依据，不计入analytics十二文件接受或30定向例数。源码以本卡固定Git基点回查，未修改五个save/tools文件。

存档输入边界属于用户指定高风险。当前最小已证问题是非法现金类型被写入；其它字段/值域校验的canonical范围尚须明确，不能只补这一字段便冒称完整GameState已验证。before→after候选：损坏内容被当作合法存入，变为在写入前报错并保持槽位原值；本工具正常导出的合法V1存档应保持可用。不改变格式、不迁移存量、不扩展二阶段。

## 当前准入

- 只读风险核验及证据登记allowed，产品build未准入。
- 用户裁决approved：原话“批准先核定合法内容合同，再补红例修复”。不重复申请本范围授权。
- 当前先核定完整合法输入/兼容范围，补正式失败反例，再有限实现与真实文件入口不覆盖验证；不能用强转或默认值填补伪装合法。合同未核定前不进入产品build；analytics已启动门继续绑定其冻结快照。

## 验收条件

有独立的合法导出/损坏输入oracle；真实caller证明拒绝发生在saveSlot之前，原槽位保持；字段/type/domain的核定范围写清。必要反例先红后绿、相邻回归及逐文件八维配对，统一门留完整模块收尾。未知项不强关CODE59。

## 合同核读进度

2026-10-21增量：[存档工具中间回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-tools-local.json)及其完整原件包保存96字段声明清单与逐项已核读档处理。该清单是定位后续核读的机器事实，不是96项语义验证。实际导出caller读取已有槽位；普通菜单保存与F5是槽位生产入口。已固定显式复位、场景重建、runtime现有归一和未核嵌套域，下一步据此核内容，不重新遍历已成立的caller证据。

仍待闭合：嵌套持久字段的值域/行列长度、哪些暂态/原生容器可到达正常存档、以及在保持当前V1和Save接口下如何诚实表达wire校验。不能从字段名猜现金上限，也不能把Map复活消费者已有行为再报成新缺陷。文件时间归属的注释已改正，产品执行正文未变；已证非法现金写入尚未修复，合同阶段继续，不授完整GameState或产品build信用。

GameState当前有96个运行时字段，并含可选Map、Uint8Array及场景/演出暂态。JSON导出形态与完整运行时类型不完全相同，不能拿初始对象作递归样板，也不能只检查cash后再强转整份GameState。下一步逐项区分需要持久恢复、由loadGameFromSlot/loadScene重建、以及可选暂态的实际读写域；据真实V1导出与当前读档消费者核合同，不擅自新增版本、旧档升级或默认值补洞。当前尚未完成这张映射，不授产品build/完整字段验收。已读loadGameFromSlot完整替换/归一流程和loadSceneCommon读档分支，96字段暂按原样保留与显式重建归类；该分类只是合同规划，尚未核完所有嵌套内容/值域。prevBattleActions的JSON对象已有生产reviveNumberKeyedMap消费者，不能重复报告已处理的Map塌缩错误，也不新增fallback。

## 交接日志

2026-10-21 Codex：在analytics集中门期间只读预核59/60，实际内存Save路径复现非法值持久化；零产品改动，CODE59继续partial。用户随后批准先核合同、再正式红例与修复；记录授权，先收口冻结的analytics窗口。60的重复测试/定时器隔离另待核，不借此关闭。

## 下一位 Agent 提示词

无下一位Agent。Codex继续核合法合同并按既有批准推进；未核完整输入/写入边界前不得将探针当正式红绿或擅自扩大格式/迁移范围。
