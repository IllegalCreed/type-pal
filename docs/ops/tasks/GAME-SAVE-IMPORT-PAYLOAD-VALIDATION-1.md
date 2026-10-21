# GAME-SAVE-IMPORT-PAYLOAD-VALIDATION-1 — 第一阶段导入内容合法性

Status: done
Phase: phase1
Capability: save import input boundary
Coding Owner: Codex
Reviewer: Codex
Visual Verification Timing: dev-functional（完整模块收尾仍须验证真实FileReader入口；本片先证明真实内存Save前拒绝）
Branch: `codex/code-quality-3y`

## 目标

按用户批准完成第一阶段V1声明数据结构/已知历史缺失与原生容器的校验，坏内容写槽前拒绝、正常旧值保留。CODE59/60当前accept；新9文件和快存主测共10文件明确闭合，广域Save/IDB/面板不附带关闭。

## 范围

内容校验候选为tools/save-io.ts及直接测试；真实调用链为tools-panel的FileReader→parseImportedSave→saveSlot→bootstrap读档。用户另已批准core/save/data.ts、Save/IDB存读接口、serializeSave及ToolsPanelDeps的纯类型分离；其执行正文与bootstrap仍不在本类型片行为修改范围。除下述已批准的现金必要守卫与后续明确批准的内部类型分离外，不修改实现、导出格式、Save API运行语义、用户slot数据或二阶段codec；不恢复旧upgrader/fallback。

## 前提真值门

- 基点779163109637a92876d02700bf517ac2f979775f，治理树，Codex单Owner。工具格式为第一阶段type-pal-save/version1，与二阶段SAVE12分开。
- SDLPal没有本项目JSON导入入口；项目当前类型、工具导入计划和真实TS调用链是依据，不借原版名义补政策。
- parseImportedSave只核format/version/partyMembers数组/wNumScene数值，随后将其强转成GameState。
- tools-panel实际把解析结果交saveSlot；Save API只按已合法GameState提取meta并克隆写入。窗口依赖在bootstrap注入，非测试自造消费者。
- 合法对照是createInitialGameState→serializeSave；反例只把其gs.dwCash从number改成string。真实parse→Save.saveSlot→loadSlot/listSlots均接受，loadedCash与meta.cash均为string。
- 观察在新Node进程的内存Save路径完成，indexedDB明确不存在；临时槽最后删除，未访问用户浏览器存档。它不是实际IndexedDB/UI烟测，也不是正式先红后绿单测。

## 证据与停止线

[父卡analytics窗口回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/analytics-closeout.json)的完整原件包中，save-import-observation.mts、对应execution/stdout/stderr保存实际调用和结果。该观察是下一候选的停止依据，不计入analytics十二文件接受或30定向例数。源码以本卡固定Git基点回查，未修改五个save/tools文件。

存档输入边界属于用户指定高风险。原最小已证问题是非法现金类型被写入；当前有限现金守卫已修，其他字段/值域的canonical范围仍须明确，不能只补这一字段便冒称完整GameState已验证。before→after候选：损坏内容被当作合法存入，变为在写入前报错并保持槽位原值；本工具正常导出的合法V1存档应保持可用。不改变格式、不迁移存量、不扩展二阶段。

## 先前现金有限准入（历史，后续扩展见本卡类型裁决与当前实现）

- 2026-10-21现金必要条件切片 build allowed，Codex单Owner：`dwCash`为有限number，0合法；不新增上限、整数/非负政策或任何默认值。依据为GameState声明、初始值、真实Save metadata消费者与当前V1数值序列化，不声称核完其它字段。
- 本切片仅准入save-io现金守卫及直接正式反例；真实parse→Save内存路径须在拒绝后保留原槽位。完整内容合同、原生容器与其它字段仍review；不使用已有cast冒称完整GameState已验证。
- 用户裁决approved：原话“批准先核定合法内容合同，再补红例修复”。不重复申请本范围授权。
- 其余内容先核定合法输入/兼容范围，再进入对应有限build与真实文件入口不覆盖验证；不能用强转或默认值填补伪装合法。现金切片不继承完整schema信用；analytics已启动门继续绑定其冻结快照。

## 验收条件

有独立的合法导出/损坏输入oracle；真实caller证明拒绝发生在saveSlot之前，原槽位保持；字段/type/domain的核定范围写清。必要反例先红后绿、相邻回归及逐文件八维配对，统一门留完整模块收尾。未知项不强关CODE59。

## 合同核读进度

2026-10-21现金有限build：[当前两文件八维、正式红绿与完整原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-cash-local.json)。文本现金的真实内存Save路径与数值溢出两条正式反例先失败；三行守卫后当前29定向/相邻、game typecheck零诊断。原槽位scene4/cash55与预览metadata保持不变；零值保留。仅约束有限number，不新增金额上限/整数或非负政策，不改格式/API/迁移。实际FileReader/IndexedDB及其它字段仍未验收。

2026-10-21前置纯测试片（冻结于4e5e964874fac1cff244b146640274b4ada92995）：[存档工具中间回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-tools-local.json)及其完整原件包保存96字段声明清单与逐项已核读档处理。该清单是定位后续核读的机器事实，不是96项语义验证。实际导出caller读取已有槽位；普通菜单保存与F5是槽位生产入口。已固定显式复位、场景重建、runtime现有归一和未核嵌套域，下一步据此核内容，不重新遍历已成立的caller证据。

仍待闭合：嵌套持久字段的值域/行列长度、哪些暂态/原生容器可到达正常存档、以及在保持当前V1和Save接口下如何诚实表达wire校验。不能从字段名猜现金上限，也不能把Map复活消费者已有行为再报成新缺陷。前置纯测试片只改时间归属注释、产品执行正文未变；其后的现金必要守卫现已先红后绿；其余合同阶段继续，不授完整GameState或其它产品build信用。

GameState当前有96个运行时字段，并含可选Map、Uint8Array及场景/演出暂态。JSON导出形态与完整运行时类型不完全相同，不能拿初始对象作递归样板，也不能只检查cash后再强转整份GameState。下一步逐项区分需要持久恢复、由loadGameFromSlot/loadScene重建、以及可选暂态的实际读写域；据真实V1导出与当前读档消费者核合同，不擅自新增版本、旧档升级或默认值补洞。当前尚未完成这张映射，除已准入现金必要切片外，不授产品build/完整字段验收。已读loadGameFromSlot完整替换/归一流程和loadSceneCommon读档分支，96字段暂按原样保留与显式重建归类；该分类只是合同规划，尚未核完所有嵌套内容/值域。prevBattleActions的JSON对象已有生产reviveNumberKeyedMap消费者，不能重复报告已处理的Map塌缩错误，也不新增fallback。

## 交接日志

2026-10-21 Codex：在analytics集中门期间只读预核59/60，实际内存Save路径复现非法值持久化；零产品改动，CODE59继续partial。用户随后批准先核合同、再正式红例与修复；记录授权，先收口冻结的analytics窗口。60的重复测试/定时器隔离另待核，不借此关闭。

## 下一位 Agent 提示词

无下一位Agent。Codex继续核合法合同并按既有批准推进；未核完整输入/写入边界前不得将探针当正式红绿或擅自扩大格式/迁移范围。

## 类型接口裁决与纯类型实施

[固定源码/实际编码观察与原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-wire-contract.json)：首版V1提交20234ea31615260e07ab0c75fdca88f2fde34eb4的GameState为91字段，当前9c3d168914a4d2e7b1dba1144429a3cdff6794bf为96字段；唯一新增required是nowMs。直接执行首版构造器/序列化器产出的V1样本，当前parser仍接受，但nowMs实际缺失。该样本只证明构造/编码合同，不冒充完整剧情存档；类型与编码观察不授全文件语义接受。

当前Map经真实serialize/parse后是无get方法的JSON对象，现行battle revive消费者已处理它，不再冒称新战斗崩溃。两项都说明：完整JSON内容校验不能继续把结果标作已hydrate的GameState，也不能通过补默认值伪造完整运行态。

候选接口改动：parseImportedSave返回经过校验的V1存档数据；serializeSave接收运行态或存档数据；Save.saveSlot/loadSlot及IndexedDbSave的gs、ToolsPanelDeps存读参数/返回类型跟随明确的存档数据定义。方法名、slot参数、Promise形状、JSON格式/版本、数据库版本、数据值及游戏行为不变；不新增upgrader或fallback，逐字段校验仍须完成。Loader的运行态恢复责任另按真实消费者核，不借类型更正宣称已修复所有恢复问题。

用户2026-10-21已回复“允许分离存档类型（推荐）”，该类型调整build allowed，Codex单Owner。现已接通SaveSnapshot/SaveDataV1、Save/IDB与工具面板及序列化输入；四个既有产品模块编译后正文与9c3d168逐字节一致，新模块只输出空export。19定向/相邻与game typecheck、scoped Biome零诊断。parseImportedSave的旧强转将在完整字段守卫阶段移除，本片不冒称完成校验。见[五文件A–H/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-types-local.json)。JSON/数据库/存档值未改，无新默认或迁移；真实FileReader与完整字段仍待核。


2026-10-21类型兼容补核：现有V1导出读取已有slot，store-v2最早记录早于JSON writer。6b58f9e84完整构造器经当前真实V1编码可缺12个后加required根字段、5个runtime行与3个装备行；明确这些字段在SaveDataV1中可缺失，已有行仍保留原值，未改任何loader或默认逻辑。源码声明差异、构造/编码样本与当前类型擦除证明见上述合同证据storeV2ExportCompatibility。它不是剧情/IDB/UI复验，也不授完整内容校验信用。当前新结构反例已先运行：9绿/10条业务断言红，parser尚未接入新守卫；行为实现与测试另提交。


## 当前实现与模块收尾候选

[八文件A–H、实际合同/红绿/原件](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)：获准内容校验切片为save-io及直接测试/历史fixture和core/save/v1*纯守卫，单一Owner Codex。96根字段/声明嵌套形状按编译合同全覆盖，已知store-v2缺失明确保持缺失；删除旧Partial/GameState强转，返回SaveDataV1。它验证声明数据结构/有限数值/原生容器与已知固定布局，不冒称已hydrate或验证资源存在/跨世界业务一致性，不新增cash上限/整数/负数政策、默认值、迁移或二阶段编码。

10条原parser业务断言先失败，接入后45定向/相邻零stderr；另去掉嵌套finite守卫时恰1个HP业务反例红，按SHA原样恢复。原生FileReader接真实面板和Save/独立IndexedDB：坏cash/坏HP保持原slot与metadata；合法旧V1提交成功且nowMs继续缺失。起初DB为空，按marker核所有权后清理，最终DB列表为空；File为DataTransfer注入并发change事件，不是OS选文件或剧情E2E。原始AX/fixture/截图已保存。当前check/official ratchet/protected尚未运行，0新文件关闭，模块门齐后再裁定59/60。


## 非空历史数据反证（3d276b324类型检查点历史）

全仓check第一候选20379例/零诊断完成后，继续核非空旧数据得到具体反证：完整6b58f9e84构造/角色hydrate/对话或战斗工厂→原真实内存JSON fallback Save→当前V1编码。对话无后加dialogLineCount，战斗无后加4个菜单字段，部分状态是原布尔数据；两条正式not.toThrow业务断言红（原20例仍绿）。快照/完整源码与资源输入指纹及原始观察已追加上述wire合同。先修SaveDataV1声明，使其如实承载这些旧值/缺失；当前GameState/BattleStatus运行态仍为现行数值机制，数据不补值、不转换。该纯类型步擦除后仍为空export，game typecheck通过；守卫行为随后另提交。旧候选门不授修复后信用，official coverage/protected尚未跑，59/60继续partial。

## 当前冻结候选（取代上述未修检查点）

非空旧对话/战斗守卫现已修正，未改变运行态GameState/BattleStatus；旧数据的缺失/布尔值原样保留。固定六角色索引的根party与battle/settlement四处接线已核，-1/小数/6拒绝，合法5保留；先4业务红再绿。当前九文件A–H与52定向/相邻、game typecheck及局部Biome零诊断配对。新增历史nested fixture由完整真实旧生产者产生，逐值对冻结原件相等，不是手写schema oracle。

原生入口共5场景：坏cash/HP保留原槽及metadata；旧base/dialog/battle文件提交成功，缺失字段不补、布尔状态不转换。两独立origin均初始无DB，核marker后清理为空；FileReader为原生、Save使用实际IndexedDB。仅DataTransfer注入File及change，不是OS文件选择器或剧情E2E；窗口错误/拒绝为0，浏览器console告警未单独采集。角色域新增后未重复浏览器，原场景role0与新guard不冲突、最终测试另覆盖边界。

最终完整check/official ratchet/protected尚待集中运行；此前20379例check绑定旧快照，不授当前最终信用。CODE59/60仍partial、0新关闭。新九文件与快存测试的明确逐文件结论不扩展Save API、IDB、tools-panel或bootstrap整文件验收。

## 最终验收（取代上述候选/待门状态）

Codex单Owner完成获准整改，九文件八维及quick-save主测有效既有八维/反控成立。52定向/相邻、game typecheck、20386全仓check（含lint5733文件0/0/0）、19988 official ratchet/protected全部零诊断，stderr0；正常stdout另逐类核读。基线正常提升8项/4范围变化，无新增降低授权/配置或规则变化。5次原生FileReader/实际IDB及两测试DB清理完整留证；边界限制见同一[回执](../evidence/QUALITY-PRE94-RETROSPECTIVE-1/save-v1-local.json)。固定83卡51accept/32partial，账本3333/339/126/2868，最终静态消费者复核后提交推送同步主线。
