# 搜索注释与测试边界；队列/毒列表原C反证

Status: review
Owner: Codex（单Agent；自身核证/修复，不冒充第三方）
Date: 2026-10-18
Base: `78f8e3c79be8a89412e19986a1a1c54d645f2005`
Branch: `codex/code-quality-3y`

## 证据身份

- id: QUALITY-PRE94-RETROSPECTIVE-1 / core-comment-audit；schemaVersion:1；status:recorded。
- [父卡](../../../tasks/QUALITY-PRE94-RETROSPECTIVE-1.md)、[队列窄修卡](../../../tasks/GAME-ACTION-QUEUE-TIE-ORDER-1.md)、[毒列表只读卡](../../../tasks/GAME-PLAYER-POISON-SLOT-COMPACTION-1.md)。
- 完整/部分阅读、SHA、原C与caller范围见[read-boundaries.json](read-boundaries.json)，非grep即全文声明。

## 来源与输入

Search的primary是play.c PAL_GetSearchTriggerRange/PAL_Search，真实caller为scene-system Confirm→helper→视觉姿态/event装载。模式阈值为最大索引：1留0..2、2留0..8、3留全部13；旧头注与inline反向解释、3o“反直觉”定性撤回。没有改变helper运行逻辑/公开接口，编译去注释后的执行代码另核；没有新增规则豁免、schema/save或资源改动。

测试使用完整typed NpcState工厂和正式helper；阈值场景party=(160,160),facing=right，13点(col,row,h)各异，避免NPC被其它低索引点碰巧命中。完整13点down序列为按原C四排手算的静态oracle，未调用被测函数生成期望。旧mode2标题实用mode1、far只放脚下、normal所谓cells10实际命中cells1、near拒绝点不在13点范围、first-hit没有专属oracle，均不能作为原信用。

## 断言与判别力

只10→12：原例改为near i2正/i3反、normal i8正/i9新增反、far i12正；补1例NPC数组倒置但较前检查点优先。保留触碰mode5/装饰0/隐藏0与方向几何原合同，标题不再声称单个mode5覆盖4..8全集。六指定变异均完整旧10绿、完整新12中恰1个业务AssertionError，0pending/skip/runtime error：near上界放宽、normal收窄/放宽、far截断、第二排单点坐标、误按NPC数组优先。详细命令/file×fullName/spec/mutant/restored SHA及完整raw/json见search-controls.json；finally恢复字节。

## 新停止线的直接证据

[primary-counters.json](primary-counters.json)含原生clang -Wall -Wextra -Werror编译的两段**原C body**与真实TS公开叶函数的完整stdout/stderr、输入、源SHA/行界、编译程序gzip和清理记录。这是最小typed上下文片段重放，不能冒充完整SDLPal、原盘资产或浏览器。

- 队列：敌0/1同速30，玩家0速度100，原C13槽得到玩家0→敌1→敌0；TS稳定sort为玩家0→敌0→敌1。实际排序完整尾括号在1585，旧1584引用未含其尾。用户本轮已批准SDL对齐，当前搜索提交不改队列，下一独立行为批先正式失败测试。
- 毒列表：同一party[2]成员列表0为level99、列表1为普通毒，C清理前移普通毒到0，TS留在1；ID/script相同，中毒者身份不变。合成正ID1/2不是原盘身份，毒tick/save等完整因果仍pending，未授权实现。

[初次编译失败原件](initial-compile/README.md)因提取1574–1584漏最外括号，C根本未执行；完整raw/代码保留且不计counter信用。根目录后补1585后的两程序才是有效对照。

## 结果与限制

实际门与完整原件以gates.json为准。相邻只筛选scene-system.test的三条真实Confirm链，另外107条未执行，不写成整文件/包绿。左朝向专测、隐藏负状态、同点双NPC顺序、全scene/event测试及已有诊断仍不据本片接受。

5旧closed转review（搜索源/测、队列源/测、毒实现），0新closed；83卡仍50partial/33pending/0accept。搜索注释项已修，其余9注释、formulas算式风险和两UI差异待续；progression本轮虽全文读过，但锚纠正留下一有限批，不重签。全仓check、官方coverage ratchet、protected fast仍按用户要求大任务收尾；未合main，不宣布专项完成。

后续[用户批准的队列修复](queue-approved-fix/README.md)在独立行为提交中先红后绿；本页上述“未改队列”只适用于c3d943dde搜索批候选，原C对照和历史原件保持。毒列表压缩未实现。
