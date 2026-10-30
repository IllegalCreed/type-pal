# 用户批准：第一阶段同速队列SDLPal对齐

Status: review
Owner: Codex（单Agent；作者修复/反控，不冒充第三方验收）
Date: 2026-10-18
Base: `c3d943ddeba9c05d01a752c0c22f8d3e78d724a8`
Branch: `codex/code-quality-3y`

## 证据身份

- id: GAME-ACTION-QUEUE-TIE-ORDER-1 / approved-fix；schemaVersion:1；status:recorded。
- [原任务卡](../../../../tasks/GAME-ACTION-QUEUE-TIE-ORDER-1.md)、[父复审卡](../../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)。用户本轮已回复“批准对齐 SDLPal（推荐）”，不重复请求该批准。
- [实际完整/部分阅读和SHA](read-boundaries.json)，源码/caller/类型/生命周期与原C分开记录。

## 来源与输入

primary是PAL_BattleStartFrame填充/严格SHORT比较交换和wDexterity==0xffff结束；原代码不是稳定sort。`native-oracles-current.json`与原生C程序gzip保存实际C排序body和终止条件的最小上下文重放，非完整SDLPal、原盘资产或浏览器。六静态向量逐项匹配C输出；oracle-verification只验证fixture/源片段/hash对位，不赋予额外机制信用。

合法输入边界使用敌方WORD速度，所有队员速度均在caller倍率/上限内。满13条时没有空槽，负SHORT动作仍可在后部；未满槽时空槽速度-1可能先于负值并结束本轮。因此既不能先去掉空槽排序，也不能无条件删除全部负速度。0xffff判速度，不是索引；occupied-sentinel是公开helper的终止协议防御域，不计真实怪物属性可达性的证明。高WORD队员初版已撤回此类caller信用。

真实caller例用公开GameState工厂、hydrate、startBattle及按键快照；两敌level1/dex9，玩家dex100，原PRNG seed5三抽31/31/94，最终P0→E1→E0、state1199730148。没有mock核心/选靶/排序/RNG，finally释放本场runtime context。该断言不声称SDLPal的LCG与本项目mulberry32同seed一致。

## 实现与原子oracle

改动只在queue helper：保留原填充/dualMove标记，补13槽、按SHORT比较双循环交换，返回速度0xffff前可执行前缀供现有tick按长度消费。没有改变公开签名、caller RNG、schema/save或资源。注释纠正非稳定性及fIsSecond不保证最终排在另一条之后；旧9例断言保留，只纠正2个过强标题，[映射](test-title-mapping.json)明确未接官方身份门。H fixture仅修“专属H01–H06”旧头注，复用三个真实typed工厂，其他recordingRng合同不据此验收。

新7例：敌敌同速置换、敌/玩家同速置换、dualMove同速标记、SHORT边界加空槽、真实速度0xffff终止、满13槽负速度、真实按键/RNG caller。不是换数字重复案例，各有不同C控制轴。六变异各恰一个指定业务AssertionError、0runtime error suite，六未选例不计执行信用；源码finally恢复SHA一致。

## 红绿原件与更正

最初生产修改前的red.json为7个业务红，初次原件未覆盖。初版3条高WORD边界放在队员侧，不能给其真实TS caller信用；spec-initial-primitive-word保留该原始spec。后改敌方WORD域，重新原生C核对全部6静态输出；最终精确spec仅替回c3旧queue源重放仍7红，red-current/red-replay记录恢复SHA，不能称整旧checkout测试。

当前原有9例与新增7例共16绿；38文件942相邻绿零stderr使用同一最终生产实现。之后仅改3条数值fixture，重跑变化的7例及game typecheck，不重复不变935条。中间与最终spec/报告/raw分别保存，当前信用以gates.json引用为准，不能混同不同spec hash。

## 结果与限制

完整门原件、command/cwd/exit/signal、raw/hash见gates.json；JSON只汇总当前观察，不是零诊断豁免。原两个queue文件仍review，新parity与H fixture只review，0新增closed；83卡仍50partial/33pending/0accept。

非法/非有限/超容量输入、缺省dex2既有近似、上游极端SHORT结果/浮点→WORD转换、全部动作动画与浏览器视觉仍pending。本helper的合法WORD排序对齐不能自动认证caller其它数值域或整battle。两旧test fullName更正未改baseline/退役payload；官方identity/coverage/protected待大任务窗口实测。按用户要求，本片不运行全仓check、官方coverage ratchet、protected fast；统一诊断未清、不合main。

后续回到pre94剩余8组注释和两UI差异，毒列表压缩继续只读；没有新增103+治理范围。

本片完整check:docs的125工具用例及docs/model/testing/phase-lore/content消费者均零issue；全仓lint5151文件为0error/0warning/0info，game typecheck零诊断。最终账本3315 tracked /278 closed /63 review /2974 pending，0新增closed。定向/相邻raw无stderr块、React act/环境或unhandled诊断；完整raw字节与hash配对。统一check/coverage/protected仍未运行，不申报统一门通过。

提交前元数据复核曾因battle-state阅读区间尾945超过实际EOF918而失败（final-inspection.json）；已更正为730–918并保留原read-boundaries-initial.json.gz，源码SHA未变。两个早期临时查询分别因复合receipt没有顶层raw、native行没有rawBytes而退出，未取得任何验证信用；正式检查按实际字段核对，当前结果见final-inspection-current.json。该元数据校准不增加产品/测试信用。
